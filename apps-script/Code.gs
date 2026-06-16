const SPREADSHEET_ID = '1LvEzLjFCDDXTVTU5MYd0zlr2X6_1MR35MklC0Ow2EDg'
const DAILY_SHEET_NAME = '📋 บันทึกรายวัน'
const EXPENSE_SHEET_NAME = '💸 รายจ่าย'

function doGet(event) {
  try {
    const token = event && event.parameter ? event.parameter.token : ''
    const expectedToken = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN')

    if (expectedToken && token !== expectedToken) {
      return jsonResponse({
        ok: false,
        error: 'Invalid sync PIN',
      })
    }

    const logs = getDailyLogs()
    const expenses = getExpenses()

    return jsonResponse({
      ok: true,
      logs,
      expenses,
    })
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
    })
  }
}

function getDailyLogs() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DAILY_SHEET_NAME)
  if (!sheet) return []
  const data = sheet.getDataRange().getValues()
  if (data.length <= 1) return []

  const logs = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row[0]) continue

    let dateStr = ''
    if (row[0] instanceof Date) {
      dateStr = Utilities.formatDate(row[0], Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd')
    } else {
      dateStr = String(row[0]).split('T')[0]
    }

    const noteCol = String(row[16] || '')
    let proofUrl = ''
    if (noteCol.includes('หลักฐาน: http')) {
      const match = noteCol.match(/หลักฐาน:\s*(https?:\/\/[^\s]+)/)
      if (match) {
        proofUrl = match[1]
      }
    }

    logs.push({
      id: i,
      date: dateStr,
      start: String(row[1] || ''),
      end: String(row[2] || ''),
      hours: Number(row[3] || 0),
      grabFood: Number(row[4] || 0),
      expressBike: Number(row[5] || 0),
      expressShop: Number(row[6] || 0),
      income: Number(row[9] || 0),
      rating: Number(row[11] || 4.98),
      acceptance: Number(row[13] || 96),
      note: noteCol,
      proofUrl: proofUrl || undefined,
      proofStatus: proofUrl ? 'uploaded' : undefined,
    })
  }
  return logs.reverse()
}

function getExpenses() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EXPENSE_SHEET_NAME)
  if (!sheet) return []
  const data = sheet.getDataRange().getValues()
  if (data.length <= 1) return []

  const expenses = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row[0]) continue

    let dateStr = ''
    if (row[0] instanceof Date) {
      dateStr = Utilities.formatDate(row[0], Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd')
    } else {
      dateStr = String(row[0]).split('T')[0]
    }

    expenses.push({
      date: dateStr,
      fuel: Number(row[1] || 0),
      food: Number(row[2] || 0),
      drinks: Number(row[3] || 0),
      repair: Number(row[4] || 0),
      phone: Number(row[5] || 0),
      depreciation: Number(row[6] || 0),
      insurance: Number(row[7] || 0),
      other: Number(row[8] || 0),
    })
  }
  return expenses.reverse()
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents)
    verifyToken(payload)

    let fileUrl = ''
    let fileId = ''

    if (payload.imageBase64 && payload.mimeType && payload.fileName) {
      const folder = getUploadFolder()
      const bytes = Utilities.base64Decode(payload.imageBase64)
      const blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName)
      const file = folder.createFile(blob)
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
      fileUrl = file.getUrl()
      fileId = file.getId()
    }

    appendDailyLog(payload, fileUrl)
    appendExpense(payload, fileUrl)

    return jsonResponse({
      ok: true,
      fileUrl: fileUrl || undefined,
      fileId: fileId || undefined,
    })
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
    })
  }
}

function verifyToken(payload) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN')

  if (expectedToken && payload.token !== expectedToken) {
    throw new Error('Invalid sync PIN')
  }
}

function getUploadFolder() {
  const properties = PropertiesService.getScriptProperties()
  const folderId = properties.getProperty('UPLOAD_FOLDER_ID')

  if (folderId) {
    return DriveApp.getFolderById(folderId)
  }

  const folder = DriveApp.createFolder('Grab Driver Tracker Proofs')
  properties.setProperty('UPLOAD_FOLDER_ID', folder.getId())
  return folder
}

function appendDailyLog(payload, fileUrl) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DAILY_SHEET_NAME)
  const start = payload.start || ''
  const end = payload.end || ''
  const hours = computeHours(start, end)
  const grabFood = Number(payload.grabFood || 0)
  const expressBike = Number(payload.expressBike || 0)
  const expressShop = Number(payload.expressShop || 0)
  const totalJobs = grabFood + expressBike + expressShop
  const income = Number(payload.income || 0)
  const incomePerHour = hours > 0 ? income / hours : 0

  sheet.appendRow([
    payload.date || new Date(),
    start,
    end,
    hours,
    grabFood,
    expressBike,
    expressShop,
    totalJobs,
    '',
    income,
    incomePerHour,
    '',
    income,
    '',
    '',
    '',
    fileUrl ? `หลักฐาน: ${fileUrl}` : (payload.note || 'เพิ่มจากเว็บแอป'),
  ])
}

function appendExpense(payload, fileUrl) {
  const category = payload.category || 'ค่าน้ำมัน'
  const fuel = Number(payload.fuel || 0)

  if (!fuel) {
    return
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EXPENSE_SHEET_NAME)
  const expense = buildExpenseRow(category, fuel)

  // Calculate fixed costs only for Grab income entries
  const isGrabIncome = (category === 'รายได้ Grab')
  const dep = isGrabIncome ? 50 : 0
  const ins = isGrabIncome ? 30 : 0
  const total = fuel + dep + ins

  sheet.appendRow([
    payload.date || new Date(),
    expense.fuel,
    expense.food,
    expense.drinks,
    expense.repair,
    expense.phone,
    dep,
    ins,
    expense.other,
    total,
    fileUrl ? `${category} | หลักฐาน: ${fileUrl}` : (payload.note || category),
  ])
}

function buildExpenseRow(category, amount) {
  const row = {
    fuel: 0,
    food: 0,
    drinks: 0,
    repair: 0,
    phone: 0,
    other: 0,
  }

  if (category === 'ค่าอาหาร') {
    row.food = amount
  } else if (category === 'น้ำ/เครื่องดื่ม') {
    row.drinks = amount
  } else if (category === 'ค่าซ่อมรถ') {
    row.repair = amount
  } else if (category === 'ค่าโทร/เน็ต') {
    row.phone = amount
  } else if (category === 'อื่น ๆ') {
    row.other = amount
  } else {
    row.fuel = amount
  }

  return row
}

function computeHours(start, end) {
  if (!start || !end) {
    return 0
  }

  const startParts = start.split(':').map(Number)
  const endParts = end.split(':').map(Number)
  const startHour = startParts[0] + startParts[1] / 60
  let endHour = endParts[0] + endParts[1] / 60

  if (endHour < startHour) {
    endHour += 24
  }

  return Math.round((endHour - startHour) * 10) / 10
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}
