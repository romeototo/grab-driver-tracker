const SPREADSHEET_ID = '1LvEzLjFCDDXTVTU5MYd0zlr2X6_1MR35MklC0Ow2EDg'
const DAILY_SHEET_NAME = '📋 บันทึกรายวัน'
const EXPENSE_SHEET_NAME = '💸 รายจ่าย'

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents)
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
  const fuel = Number(payload.fuel || 0)

  if (!fuel) {
    return
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EXPENSE_SHEET_NAME)
  sheet.appendRow([
    payload.date || new Date(),
    fuel,
    0,
    0,
    0,
    0,
    50,
    30,
    0,
    fuel + 50 + 30,
    `หลักฐาน: ${fileUrl}`,
  ])
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
