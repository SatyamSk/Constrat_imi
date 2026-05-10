// Google Apps Script — Alternative for restricted Google Workspace domains
// This version outputs to a publicly accessible Google Sheet that YOU own
//
// STEPS:
// 1. Create a NEW Google Sheet in your personal/college Google Drive (YOU will own this one)
// 2. Make that sheet "Anyone with the link can view"
// 3. Put that Sheet's ID below in OUTPUT_SHEET_ID
// 4. Run copyTimetable() manually or set a daily trigger
// 5. In Constrat, use the direct CSV export URL of your OUTPUT sheet

var SOURCE_SHEET_ID = "1e3UMC2TIHujnTBZLbfAJl4pxz3IRWiQ8";
var SOURCE_GID = 619368696;

// REPLACE THIS with your new sheet's ID
var OUTPUT_SHEET_ID = "YOUR_NEW_SHEET_ID_HERE";

function copyTimetable() {
  try {
    var source = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sourceSheets = source.getSheets();
    var sourceSheet = null;

    for (var i = 0; i < sourceSheets.length; i++) {
      if (sourceSheets[i].getSheetId() == SOURCE_GID) {
        sourceSheet = sourceSheets[i];
        break;
      }
    }
    if (!sourceSheet) sourceSheet = sourceSheets[0];

    var data = sourceSheet.getDataRange().getValues();

    var output = SpreadsheetApp.openById(OUTPUT_SHEET_ID);
    var outSheet = output.getSheets()[0];
    outSheet.clear();
    outSheet.getRange(1, 1, data.length, data[0].length).setValues(data);

    Logger.log("Copied " + data.length + " rows successfully");
  } catch (e) {
    Logger.log("Error: " + e.toString());
  }
}

// Set this to run daily via Triggers > Add Trigger > copyTimetable > Time-driven > Day timer
