const SPREADSHEET_ID = '1LvEzLjFCDDXTVTU5MYd0zlr2X6_1MR35MklC0Ow2EDg'
const DAILY_SHEET_NAME = '📋 บันทึกรายวัน'
const EXPENSE_SHEET_NAME = '💸 รายจ่าย'

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents)
    verifyToken(payload)

    const folder = getUploadFolder()
    const bytes = Utilities.base64Decode(payload.imageBase64)
    const blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName)
    const file = folder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    const fileUrl = file.getUrl()
    appendDailyLog(payload, fileUrl)
    appendExpense(payload, fileUrl)

    return jsonResponse({
      ok: true,
      fileUrl,
      fileId: file.getId(),
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
    `หลักฐาน: ${fileUrl}`,
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

  sheet.appendRow([
    payload.date || new Date(),
    expense.fuel,
    expense.food,
    expense.drinks,
    expense.repair,
    expense.phone,
    50,
    30,
    expense.other,
    fuel + 50 + 30,
    `${category} | หลักฐาน: ${fileUrl}`,
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
