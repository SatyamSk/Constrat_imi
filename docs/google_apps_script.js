// Google Apps Script — paste this at script.google.com
// This runs under YOUR college account and serves live timetable data

function doGet() {
  var SHEET_ID = "1e3UMC2TIHujnTBZLbfAJl4pxz3IRWiQ8";
  var GID = 619368696;
  
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets().filter(function(s) { return s.getSheetId() == GID; })[0];
    
    if (!sheet) {
      sheet = ss.getSheets()[0]; // fallback to first sheet
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h) { return h.toString().trim().toLowerCase(); });
    
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j] ? data[i][j].toString().trim() : "";
      }
      rows.push(row);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, rows: rows, headers: headers, count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
