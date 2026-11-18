/**
 * RepairCom — Google Apps Script Backend
 * ເຊື່ອມຕໍ່ໜ້າຕ່າງ RepairCom Web App (Index.html) ກັບ Google Sheets ໂດຍກົງ
 */

var REPAIRCOM_SHEET_NAMES = {
  computers: 'Equipment',
  repairs: 'Repairs',
  parts: 'Parts',
  stock: 'Stock',
  categories: 'Categories',
  config: '_RepairComConfig'
};

var SPREADSHEET_ID_PROP_KEY = 'REPAIRCOM_SPREADSHEET_ID';

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('RepairCom')
      .addItem('ເປີດແອັບ RepairCom', 'openRepairComDialog')
      .addItem('ກະກຽມແທັບຕາຕະລາງ (Setup Tabs)', 'setupRepairComSheets')
      .addToUi();
  } catch (e) {
    // Ignore when not running inside Spreadsheet UI
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RepairCom — ລະບົບບັນທຶກການສ້ອມແປງຄອມພິວເຕີ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function openRepairComDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1280)
    .setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, 'RepairCom');
}

function extractSpreadsheetId_(input) {
  var trimmed = String(input || '').trim();
  if (!trimmed) return '';
  var match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : trimmed;
}

function getOrCreateTargetSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty(SPREADSHEET_ID_PROP_KEY);

  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      // Fallback if saved sheet is inaccessible
    }
  }

  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      props.setProperty(SPREADSHEET_ID_PROP_KEY, active.getId());
      return active;
    }
  } catch (e) {
    // Standalone script
  }

  var created = SpreadsheetApp.create('RepairCom - ຖານຂໍ້ມູນສ້ອມແປງຄອມພິວເຕີ');
  props.setProperty(SPREADSHEET_ID_PROP_KEY, created.getId());
  return created;
}

function ensureSheet_(ss, title, hideSheet) {
  var sheet = ss.getSheetByName(title);
  if (!sheet) {
    sheet = ss.insertSheet(title);
  }
  if (hideSheet && !sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  return sheet;
}

function setupRepairComSheets() {
  var ss = getOrCreateTargetSpreadsheet_();
  ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.computers, false);
  ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.repairs, false);
  ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.parts, false);
  ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.stock, false);
  ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.categories, false);
  ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.config, true);
  return {
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl()
  };
}

function readSheetRows_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

function writeSheetRows_(ss, sheetName, rows) {
  var sheet = ensureSheet_(ss, sheetName, false);
  sheet.clearContents();
  if (!rows || rows.length === 0 || !rows[0] || rows[0].length === 0) {
    return;
  }

  var numRows = rows.length;
  var numCols = rows[0].length;
  var normalized = rows.map(function (r) {
    var out = [];
    for (var i = 0; i < numCols; i++) {
      var val = r[i];
      out.push(val === null || val === undefined ? '' : String(val));
    }
    return out;
  });

  var range = sheet.getRange(1, 1, numRows, numCols);
  // Set plain text format so dates/IDs/tags stay exact strings
  range.setNumberFormat('@');
  range.setValues(normalized);

  sheet.setFrozenRows(1);
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
}

function readCustomLogo_(ss) {
  var sheet = ss.getSheetByName(REPAIRCOM_SHEET_NAMES.config);
  if (!sheet || sheet.getLastRow() < 1) return null;
  var rows = sheet.getRange(1, 1, sheet.getLastRow(), 2).getDisplayValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'customLogo') {
      return rows[i][1] || null;
    }
  }
  return null;
}

function writeCustomLogo_(ss, customLogo) {
  var sheet = ensureSheet_(ss, REPAIRCOM_SHEET_NAMES.config, true);
  sheet.clearContents();
  if (customLogo) {
    // Guard against Google Sheets 50,000 char single-cell limit
    var value = String(customLogo);
    if (value.length <= 49000) {
      sheet.getRange(1, 1, 1, 2).setValues([['customLogo', value]]);
    }
  }
}

function getRepairComState() {
  var ss = getOrCreateTargetSpreadsheet_();
  var computerRows = readSheetRows_(ss, REPAIRCOM_SHEET_NAMES.computers);
  var repairRows = readSheetRows_(ss, REPAIRCOM_SHEET_NAMES.repairs);
  var partRows = readSheetRows_(ss, REPAIRCOM_SHEET_NAMES.parts);
  var stockRows = readSheetRows_(ss, REPAIRCOM_SHEET_NAMES.stock);
  var categoryRows = readSheetRows_(ss, REPAIRCOM_SHEET_NAMES.categories);
  var customLogo = readCustomLogo_(ss);

  var hasSheetData =
    computerRows.length > 1 ||
    repairRows.length > 1 ||
    partRows.length > 1 ||
    stockRows.length > 1 ||
    categoryRows.length > 1;

  return {
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    hasSheetData: hasSheetData,
    computerRows: computerRows,
    repairRows: repairRows,
    partRows: partRows,
    stockRows: stockRows,
    categoryRows: categoryRows,
    customLogo: customLogo
  };
}

function saveRepairComState(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    var ss = getOrCreateTargetSpreadsheet_();

    if (data.computerRows) {
      writeSheetRows_(ss, REPAIRCOM_SHEET_NAMES.computers, data.computerRows);
    }
    if (data.repairRows) {
      writeSheetRows_(ss, REPAIRCOM_SHEET_NAMES.repairs, data.repairRows);
    }
    if (data.partRows) {
      writeSheetRows_(ss, REPAIRCOM_SHEET_NAMES.parts, data.partRows);
    }
    if (data.stockRows) {
      writeSheetRows_(ss, REPAIRCOM_SHEET_NAMES.stock, data.stockRows);
    }
    if (data.categoryRows) {
      writeSheetRows_(ss, REPAIRCOM_SHEET_NAMES.categories, data.categoryRows);
    }
    if (data.hasOwnProperty('customLogo')) {
      writeCustomLogo_(ss, data.customLogo);
    }

    SpreadsheetApp.flush();

    return {
      ok: true,
      savedAt: new Date().toISOString(),
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl()
    };
  } finally {
    lock.releaseLock();
  }
}

function linkSpreadsheetByUrlOrId(urlOrId) {
  var id = extractSpreadsheetId_(urlOrId);
  if (!id) {
    throw new Error('ກະລຸນາໃສ່ URL ຫຼື Spreadsheet ID ໃຫ້ຖືກຕ້ອງ');
  }
  var ss = SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROP_KEY, ss.getId());
  return getRepairComState();
}
