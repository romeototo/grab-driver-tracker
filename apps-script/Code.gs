const SPREADSHEET_ID = '1LvEzLjFCDDXTVTU5MYd0zlr2X6_1MR35MklC0Ow2EDg'
const DAILY_SHEET_NAME = '📋 บันทึกรายวัน'
const EXPENSE_SHEET_NAME = '💸 รายจ่าย'
const DEFAULT_WEBHOOK_TOKEN = '260332'
const APP_TIME_ZONE = 'Asia/Bangkok'

function doGet(event) {
  try {
    const token = event && event.parameter ? event.parameter.token : ''
    const expectedToken = getExpectedToken()

    if (expectedToken && token !== expectedToken) {
      return jsonResponse({
        ok: false,
        error: 'Invalid sync PIN',
      })
    }

    return jsonResponse({
      ok: true,
      logs: getDailyLogs(),
      expenses: getExpenses(),
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

  return sheet
    .getDataRange()
    .getDisplayValues()
    .slice(3)
    .map((row, index) => {
      const date = normalizeDate(row[0])
      if (!date) return null

      const note = String(row[16] || '')
      const proofUrl = extractProofUrl(note)

      return {
        id: index + 4,
        category: 'รายได้ Grab',
        date,
        start: normalizeTime(row[1]),
        end: normalizeTime(row[2]),
        hours: toNumber(row[3]),
        food: toNumber(row[4]),
        mart: toNumber(row[5]),
        grabFood: toNumber(row[4]),
        expressBike: toNumber(row[5]),
        expressShop: toNumber(row[6]),
        distance: toNumber(row[8]),
        income: toNumber(row[9]),
        rating: toNumber(row[14], 4.98),
        acceptance: toNumber(row[15], 96),
        note,
        proofUrl: proofUrl || undefined,
        proofStatus: proofUrl ? 'uploaded' : undefined,
      }
    })
    .filter(function(log) {
      return log && (log.income > 0 || log.hours > 0 || (log.grabFood + log.expressBike + log.expressShop) > 0)
    })
    .reverse()
}

function getExpenses() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EXPENSE_SHEET_NAME)
  if (!sheet) return []

  return sheet
    .getDataRange()
    .getDisplayValues()
    .slice(3)
    .map((row) => {
      const date = normalizeDate(row[0])
      if (!date) return null

      return {
        date,
        fuel: toNumber(row[1]),
        food: toNumber(row[2]),
        drinks: toNumber(row[3]),
        repair: toNumber(row[4]),
        phone: toNumber(row[5]),
        depreciation: toNumber(row[6]),
        insurance: toNumber(row[7]),
        other: toNumber(row[8]),
      }
    })
    .filter(Boolean)
    .reverse()
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

    if ((payload.category || 'รายได้ Grab') === 'รายได้ Grab') {
      appendDailyLog(payload, fileUrl)
    }
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
  const expectedToken = getExpectedToken()

  if (expectedToken && payload.token !== expectedToken) {
    throw new Error('Invalid sync PIN')
  }
}

function getExpectedToken() {
  return PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN') || DEFAULT_WEBHOOK_TOKEN
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
  const food = Number(payload.food || payload.grabFood || 0)
  const mart = Number(payload.mart || payload.expressBike || 0)
  const otherJobs = Number(payload.expressShop || 0)
  const totalJobs = food + mart + otherJobs
  const income = Number(payload.income || 0)
  const incomePerHour = hours > 0 ? income / hours : 0

  sheet.appendRow([
    normalizeDate(payload.date) || Utilities.formatDate(new Date(), APP_TIME_ZONE, 'yyyy-MM-dd'),
    start,
    end,
    hours,
    food,
    mart,
    otherJobs,
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
  const amount = Number(payload.fuel || 0)

  if (!amount) {
    return
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EXPENSE_SHEET_NAME)
  const expense = buildExpenseRow(category, amount)
  const isGrabIncome = category === 'รายได้ Grab'
  const dep = isGrabIncome ? 50 : 0
  const ins = isGrabIncome ? 30 : 0
  const total = expense.fuel + expense.food + expense.drinks + expense.repair + expense.phone + dep + ins + expense.other

  sheet.appendRow([
    normalizeDate(payload.date) || Utilities.formatDate(new Date(), APP_TIME_ZONE, 'yyyy-MM-dd'),
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

function normalizeDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_TIME_ZONE, 'yyyy-MM-dd')
  }

  const text = String(value || '').trim()
  if (!text || text === 'วันที่') return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const thaiDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (thaiDate) {
    return `${thaiDate[3]}-${thaiDate[2].padStart(2, '0')}-${thaiDate[1].padStart(2, '0')}`
  }

  return ''
}

function normalizeTime(value) {
  const text = String(value || '').trim()
  const match = text.match(/(\d{1,2}):(\d{2})/)
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : ''
}

function extractProofUrl(note) {
  const match = String(note || '').match(/หลักฐาน:\s*(https?:\/\/[^\s]+)/)
  return match ? match[1] : ''
}

function toNumber(value, fallback) {
  const parsed = Number(String(value || '').replace(/,/g, ''))
  if (Number.isFinite(parsed)) return parsed
  return fallback || 0
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
