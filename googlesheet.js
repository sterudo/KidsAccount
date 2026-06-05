/**
 * @OnlyCurrentDoc
 * @NotOnlyCurrentDoc
 * Forces the script to request Google Drive access scopes:
 * @gsschema https://www.googleapis.com/auth/drive
 */

function doGet(e) {
  SpreadsheetApp.flush(); 
  
  // 🔒 SECURITY GATEKEEPER: Extract the hardware token parameter from the request
  const fingerprint = e && e.parameter ? String(e.parameter.fingerprint).trim() : "";
  
  if (!isAuthenticatedDevice(fingerprint)) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 403, 
      error: "Unauthorized", 
      message: "Device signature revoked or not whitelisted. Access Denied." 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  const configSheet = sheet.getSheetByName("config");
  const userSheet = sheet.getSheetByName("users");

  function parseSheetRecords(targetSheet) {
    if (!targetSheet) return [];
    const data = targetSheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const records = [];
    
    for (let i = 1; i < data.length; i++) {
      let obj = {};
      headers.forEach((header, index) => {
        let val = data[i][index];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
        obj[header] = val;
      });
      records.push(obj);
    }
    return records;
  }
  
  const children = parseSheetRecords(childrenSheet);
  const transactions = parseSheetRecords(txSheet);
  
  let usersList = ["Dad", "Mum"];
  if (userSheet) {
    const userValues = userSheet.getDataRange().getValues();
    usersList = userValues.slice(1)
                          .map(row => String(row[0]).trim())
                          .filter(name => name.length > 0);
  }

  // 🛡️ CONDITIONAL TRANSITIONS LAYER: Config keys are ONLY extracted & compiled
  // here AFTER passing the main identity gatekeeper. They are never sent to unverified clients.
  let systemConfig = {};
  if (configSheet) {
    const configData = configSheet.getDataRange().getValues();
    for (let i = 1; i < configData.length; i++) {
      const key = String(configData[i][0]).trim();
      const val = String(configData[i][1]).trim();
      if (key) {
        systemConfig[key] = val;
      }
    }
  }
  
  const action = e && e.parameter ? e.parameter.action : "";
  
  // Default data load handles both standard background requests and initialization hooks safely
  if (action === "getInitialData" || !action) {
    const responsePayload = {
      status: "success",
      children: children,
      transactions: transactions,
      users: usersList,
      config: systemConfig // Delivers configuration variables safely
    };
    
    return ContentService.createTextOutput(JSON.stringify(responsePayload))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "Google Apps Script Engine active. Process parameter ignored." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  SpreadsheetApp.flush();
  
  let result = { status: "error", message: "Unknown process fault" };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing structural JSON body payload rules");
    }
    
    const payload = JSON.parse(e.postData.contents);
    const fingerprint = payload.fingerprint || payload.devicefingerprint || "";
    
    // 🔒 SECURITY GATEKEEPER: Validate fingerprint on POST mutations
    if (!isAuthenticatedDevice(fingerprint)) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 403, 
        error: "Unauthorized", 
        message: "Action rejected. Device unauthorized." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const txSheet = sheet.getSheetByName("transactions");
    const childrenSheet = sheet.getSheetByName("children");
    const action = payload.action;
    
    // --- ACTIONS LAYER 1: APPEND NEW TRANSACTION ---
    if (action === "addTransaction" || action === "createTransaction") {
      let fileUrl = "";

      if (payload.receiptImageBase64 && payload.receiptImageBase64.trim().length > 0) {
        try {
          // 🌟 OPTIMIZATION: Use your folder's direct ID instead of searching by text name every time
          // You can find this ID string in your browser URL bar when opening the folder in Drive.
          const TARGET_FOLDER_ID = "YOUR_EXACT_FOLDER_ID_STRING_HERE"; 
          let folder;
          
          try {
            folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
          } catch(folderMissing) {
            // Fallback: create it if it doesn't exist yet
            const folderName = "KidsApp_Receipts";
            let folders = DriveApp.getFoldersByName(folderName);
            folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
            Logger.log("Folder Created. Note down ID for optimization: " + folder.getId());
          }

          const decodedBlob = Utilities.newBlob(
            Utilities.base64Decode(payload.receiptImageBase64), 
            "image/jpeg", 
            "receipt_" + new Date().getTime() + ".jpg"
          );
          
          const file = folder.createFile(decodedBlob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = file.getUrl(); 
          
        } catch (driveErr) {
          fileUrl = "Upload Error: " + driveErr.toString();
        }
      }
      const txHeaders = txSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      let newRow = new Array(txHeaders.length).fill(""); 

      txHeaders.forEach((header, index) => {
        if (header === "id") newRow[index] = payload.id || "tx_" + new Date().getTime();
        else if (header === "childid") newRow[index] = payload.childId;
        else if (header === "date") newRow[index] = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        else if (header === "what") newRow[index] = payload.what;
        else if (header === "where") newRow[index] = payload.where;
        else if (header === "type") newRow[index] = payload.type;
        else if (header === "amount") newRow[index] = Number(payload.amount) || 0;
        else if (header === "recordedby") newRow[index] = payload.recordedBy || payload.recordedby || "System";
        else if (header === "device") newRow[index] = fingerprint; // Keep device tracked internally
        else if (header === "timestamp") newRow[index] = payload.utcTimestamp || payload.utctimestamp || new Date().toISOString();
        else if (header === "fileurl") newRow[index] = fileUrl; 
      });

      txSheet.appendRow(newRow);
      result = { status: "success", message: "Transaction written to spreadsheet." };
    }
    
    // --- ACTIONS LAYER 2: UPDATE EXISTING TRANSACTION ROW ---
    else if (action === "updateTransaction" || action === "editTransaction") {
      const tx = payload.transaction || payload;
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      
      if (idIdx === -1) throw new Error("Could not find required tracking ID header cell.");
      
      const targetId = tx.id || payload.id;
      let foundRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(targetId).trim()) {
          foundRowIndex = i + 1;
          break;
        }
      }
      
      if (foundRowIndex === -1) throw new Error("Target transaction row tracking ID not matched.");
      
      txHeaders.forEach((header, colIndex) => {
        const cell = txSheet.getRange(foundRowIndex, colIndex + 1);
        if (header === "childid") cell.setValue(tx.childId || tx.childid);
        else if (header === "date") cell.setValue(tx.date);
        else if (header === "what") cell.setValue(tx.what);
        else if (header === "where") cell.setValue(tx.where);
        else if (header === "type") cell.setValue(tx.type);
        else if (header === "amount") cell.setValue(Number(tx.amount) || 0);
        else if (header === "recordedby") cell.setValue(tx.recordedBy || tx.recordedby || "");
        else if (header === "devicefingerprint" || header === "device") cell.setValue(fingerprint);
        else if (header === "utctimestamp" || header === "timestamp") cell.setValue(tx.utcTimestamp || tx.utctimestamp || new Date().toISOString());
      });
      
      result = { status: "success", message: "Transaction entry updated accurately." };
    }
    
    // --- ACTIONS LAYER 3: DELETE TRANSACTION ROW ---
    else if (action === "deleteTransaction") {
      const targetId = payload.id;
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      
      let targetRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(targetId).trim()) {
          targetRowIndex = i + 1;
          break;
        }
      }
      
      if (targetRowIndex !== -1) {
        txSheet.deleteRow(targetRowIndex);
        result = { status: "success", message: "Transaction row eliminated." };
      } else {
        throw new Error("Row target key matching sequence missed execution bounds.");
      }
    }
    
    // --- ACTIONS LAYER 4: ADD NEW CHILD ROW PROFILE ---
    else if (action === "createChild") {      
      if (!childrenSheet) throw new Error("The 'children' sheet tab could not be found.");
      childrenSheet.appendRow([payload.id, payload.name, Number(payload.startAmount) || 0, Number(payload.weeklyAllowance) || 0]);
      result = { status: "success", message: "Child account recorded successfully." };
    }

    // --- ACTIONS LAYER 5: CREATE PARENT USER ---
    else if (action === "createUser") {
      const userSheet = sheet.getSheetByName("users");
      const newUserName = String(payload.name).trim();
      if (!newUserName) throw new Error("User registration name cannot be empty.");
      
      const existingUsers = userSheet.getDataRange().getValues().map(r => String(r[0]).trim().toLowerCase());
      if (existingUsers.includes(newUserName.toLowerCase())) {
        result = { status: "success", message: "User already registered." };
      } else {
        userSheet.appendRow([newUserName]);
        result = { status: "success", message: "User written to database sheet successfully." };
      }
    }

    // --- ACTIONS LAYER 6: DELETE PARENT USER ---
    else if (action === "deleteUser") {
      const userSheet = sheet.getSheetByName("users");
      const targetUser = String(payload.name).trim().toLowerCase();
      const data = userSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === targetUser) {
          userSheet.deleteRow(i + 1);
          break;
        }
      }
      result = { status: "success", message: "User profile removed cleanly." };
    }
    
    // --- UTILITY 1: CORE DATABASE EXPORT ENGINE ---
    if (action === "exportBackup") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const allSheets = ss.getSheets();
      const backupPayload = {
        version: "2.5.0",
        timestamp: new Date().toISOString(),
        spreadsheetId: ss.getId(),
        data: {}
      };

      // Extract every single cell row from all existing tabs automatically
      allSheets.forEach(sheet => {
        const sheetName = sheet.getName();
        const range = sheet.getDataRange();
        const values = range.getValues();
        backupPayload.data[sheetName] = values;
      });

      // Scenario A: If requested to save directly to Google Drive as an automated backup file
      if (payload.target === "drive") {
        const folderName = "KidsApp_Backups";
        let folders = DriveApp.getFoldersByName(folderName);
        let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        
        const fileName = "vault_backup_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") + ".json";
        const file = folder.createFile(fileName, JSON.stringify(backupPayload, null, 2), "application/json");
        
        result = { status: "success", message: "Backup successfully compiled and saved to Drive folder: " + fileName };
      } else {
        // Scenario B: Return raw JSON object back to client browser for local disk download
        return ContentService.createTextOutput(JSON.stringify({ status: "success", database: backupPayload }))
                            .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // --- UTILITY 2: CORE STRUCTURAL IMPORT/RESTORE ENGINE ---
    else if (action === "importRestore") {
      const importData = payload.database;
      if (!importData || !importData.data) throw new Error("Invalid or corrupted backup payload signature matrix.");

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      // 🌟 STRICT SCHEMA VALIDATOR: Define baseline expected architecture tracking arrays
      const requiredSchema = {
        "children": ["id", "name", "startamount", "weeklyallowance"],
        "transactions": ["id", "childid", "date", "what", "where", "type", "amount", "recordedby"],
        "users": ["id"],
        "config": [],
        "authorized_devices": []
      };

      // Run Additive verification checks
      Object.keys(requiredSchema).forEach(tabName => {
        // 1. Verify Tab existence
        if (!importData.data[tabName]) {
          throw new Error("Validation Failure: Missing required structural sheet tab: '" + tabName + "'");
        }
        
        // 2. Verify mandatory column headers are still present inside target arrays
        const rows = importData.data[tabName];
        if (rows.length > 0 && requiredSchema[tabName].length > 0) {
          const fileHeaders = rows[0].map(h => String(h).toLowerCase().trim());
          requiredSchema[tabName].forEach(col => {
            if (fileHeaders.indexOf(col) === -1) {
              throw new Error("Compatibility Error: Tab '" + tabName + "' is missing mandatory tracking column: '" + col + "'");
            }
          });
        }
      });

      // Schema verification passed cleanly! Proceed with wiping and overwrite operation.
      Object.keys(importData.data).forEach(tabName => {
        let targetSheet = ss.getSheetByName(tabName);
        if (!targetSheet) {
          targetSheet = ss.insertSheet(tabName);
        }
        
        targetSheet.clear(); // Wipe the current cells cleanly
        const gridRows = importData.data[tabName];
        
        if (gridRows.length > 0) {
          // Re-write matrix safely back onto the target sheet cells layout
          targetSheet.getRange(1, 1, gridRows.length, gridRows[0].length).setValues(gridRows);
        }
      });

      result = { status: "success", message: "Database restore completed. Structural schema verified, synced, and active." };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 🔒 SECURITY ENFORCEMENT ENGINE
 * Inspects the 'authorized_devices' tab to find the current token footprint.
 * Note: Your tab name is matched exactly against 'authorized_devices'.
 */
function isAuthenticatedDevice(fingerprint) {
  if (!fingerprint) return false;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const authSheet = ss.getSheetByName("authorized_devices");
  if (!authSheet) return false;
  
  const data = authSheet.getDataRange().getValues();
  // Read Column 1 (index 0) loop through rows to scan for active whitelist matches
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(fingerprint).trim()) {
      return true;
    }
  }
  return false;
}

function processWeeklyAllowances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = ss.getSheetByName("children");
  const txSheet = ss.getSheetByName("transactions");
  if (!childrenSheet || !txSheet) return;

  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0];
  const idIdx = childHeaders.indexOf("id");
  const nameIdx = childHeaders.indexOf("name");
  const allowanceIdx = childHeaders.indexOf("weeklyAllowance");

  const today = new Date();
  const dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  for (let i = 1; i < childData.length; i++) {
    const childId = childData[i][idIdx];
    const allowanceAmount = Number(childData[i][allowanceIdx]);

    if (allowanceAmount > 0) {
      const transactionId = "tx_auto_" + today.getTime() + "_" + childId;
      txSheet.appendRow([
        transactionId, childId, dateString, "Weekly Allowance", "System Automated", "deposit", allowanceAmount, "System Scheduler"
      ]);
    }
  }
}

function processMonthlyInterest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = ss.getSheetByName("children");
  const txSheet = ss.getSheetByName("transactions");
  if (!childrenSheet || !txSheet) return;

  const MONTHLY_INTEREST_RATE = 0.005; 
  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0];
  const idIdx = childHeaders.indexOf("id");
  const startAmountIdx = childHeaders.indexOf("startAmount");

  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0];
  const txChildIdIdx = txHeaders.indexOf("childId");
  const txTypeIdx = txHeaders.indexOf("type");
  const txAmountIdx = txHeaders.indexOf("amount");

  const today = new Date();
  const dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  for (let i = 1; i < childData.length; i++) {
    const childId = String(childData[i][idIdx]);
    const startAmount = Number(childData[i][startAmountIdx]) || 0;

    let netTransactions = 0;
    for (let j = 1; j < txData.length; j++) {
      if (String(txData[j][txChildIdIdx]) === childId) {
        const type = txData[j][txTypeIdx];
        const amount = Number(txData[j][txAmountIdx]) || 0;
        netTransactions += (type === "deposit" ? amount : -amount);
      }
    }
    
    const currentBalance = startAmount + netTransactions;

    if (currentBalance > 0) {
      const interestEarned = Math.floor(currentBalance * MONTHLY_INTEREST_RATE * 100) / 100;
      if (interestEarned > 0) {
        const transactionId = "tx_interest_" + today.getTime() + "_" + childId;
        txSheet.appendRow([
          transactionId, childId, dateString, "Monthly Interest Earned (" + (MONTHLY_INTEREST_RATE * 100) + "%)", "System Automated", "deposit", interestEarned, "System Scheduler"
        ]);
      }
    }
  }
}