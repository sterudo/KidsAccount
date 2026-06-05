/**
 * @OnlyCurrentDoc
 * @NotOnlyCurrentDoc
 * Forces the script to request Google Drive access scopes:
 * @gsschema https://www.googleapis.com/auth/drive
 */

function doGet(e) {
  SpreadsheetApp.flush(); 
  
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

  let systemConfig = {};
  if (configSheet) {
    const configData = configSheet.getDataRange().getValues();
    for (let i = 1; i < configData.length; i++) {
      const key = String(configData[i][0]).trim();
      const val = String(configData[i][1]).trim();
      if (key) systemConfig[key] = val;
    }
  }
  
  const action = e && e.parameter ? e.parameter.action : "";
  
  if (action === "getInitialData" || !action) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      children: children,
      transactions: transactions,
      users: usersList,
      config: systemConfig
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", message: "Engine active." 
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
    
    if (!isAuthenticatedDevice(fingerprint)) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 403, error: "Unauthorized", message: "Action rejected. Device unauthorized." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const txSheet = sheet.getSheetByName("transactions");
    const childrenSheet = sheet.getSheetByName("children");
    const action = payload.action;
    
    // --- ACTIONS LAYER 1: APPEND STANDARD TRANSACTION ---
    if (action === "addTransaction" || action === "createTransaction") {
      let fileUrl = "";
      if (payload.receiptImageBase64 && payload.receiptImageBase64.trim().length > 0) {
        try {
          const folderName = "KidsApp_Receipts";
          let folders = DriveApp.getFoldersByName(folderName);
          let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          const decodedBlob = Utilities.newBlob(Utilities.base64Decode(payload.receiptImageBase64), "image/jpeg", "receipt_" + new Date().getTime() + ".jpg");
          const file = folder.createFile(decodedBlob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = file.getUrl(); 
        } catch (driveErr) { fileUrl = "Upload Error: " + driveErr.toString(); }
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
        else if (header === "recordedby") newRow[index] = payload.recordedBy || "System";
        else if (header === "device") newRow[index] = fingerprint;
        else if (header === "timestamp") newRow[index] = payload.utcTimestamp || new Date().toISOString();
        else if (header === "fileurl") newRow[index] = fileUrl;
        else if (header === "transfergroup") newRow[index] = payload.transferGroup || "";
      });

      txSheet.appendRow(newRow);
      result = { status: "success", message: "Transaction written to spreadsheet." };
    }
    
    // --- 🌟 NEW ACTIONS LAYER: ATOMIC DOUBLE-ENTRY DISPATCH TRANSFER ---
    else if (action === "addTransfer") {
      const txHeaders = txSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      const timestamp = payload.utcTimestamp || new Date().toISOString();
      const transferGroupToken = payload.transferGroup || "trsf_" + Date.now();

      // Row A: The Sender Mutation Row
      let senderRow = new Array(txHeaders.length).fill("");
      txHeaders.forEach((header, index) => {
        if (header === "id") senderRow[index] = payload.senderId;
        else if (header === "childid") senderRow[index] = payload.senderChildId;
        else if (header === "date") senderRow[index] = payload.date;
        else if (header === "what") senderRow[index] = payload.senderWhat;
        else if (header === "where") senderRow[index] = payload.where;
        else if (header === "type") senderRow[index] = "send"; // Distinct type logged
        else if (header === "amount") senderRow[index] = Number(payload.amount) || 0;
        else if (header === "recordedby") senderRow[index] = payload.recordedBy || "System";
        else if (header === "device") senderRow[index] = fingerprint;
        else if (header === "timestamp") senderRow[index] = timestamp;
        else if (header === "transfergroup") senderRow[index] = transferGroupToken;
      });

      // Row B: The Recipient Mutation Row
      let receiverRow = new Array(txHeaders.length).fill("");
      txHeaders.forEach((header, index) => {
        if (header === "id") receiverRow[index] = payload.receiverId;
        else if (header === "childid") receiverRow[index] = payload.receiverChildId;
        else if (header === "date") receiverRow[index] = payload.date;
        else if (header === "what") receiverRow[index] = payload.receiverWhat;
        else if (header === "where") receiverRow[index] = payload.where;
        else if (header === "type") receiverRow[index] = "receive"; // Distinct type logged
        else if (header === "amount") receiverRow[index] = Number(payload.amount) || 0;
        else if (header === "recordedby") receiverRow[index] = payload.recordedBy || "System";
        else if (header === "device") receiverRow[index] = fingerprint;
        else if (header === "timestamp") receiverRow[index] = timestamp;
        else if (header === "transfergroup") receiverRow[index] = transferGroupToken;
      });

      txSheet.appendRow(senderRow);
      txSheet.appendRow(receiverRow);
      
      result = { status: "success", message: "Atomic mutual transfer rows successfully injected." };
    }
    
    // --- ACTIONS LAYER 2: UPDATE TRANSACTION (BLOCKED IF TRANSFER) ---
    else if (action === "updateTransaction" || action === "editTransaction") {
      const tx = payload.transaction || payload;
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      const typeIdx = txHeaders.indexOf("type");
      
      let foundRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(tx.id || payload.id).trim()) {
          foundRowIndex = i + 1;
          const currentType = String(data[i][typeIdx]).toLowerCase().trim();
          // 🛡️ SECURITY GUARD: Intercept backend modification requests Targeting transfers
          if (currentType === "send" || currentType === "receive") {
            throw new Error("Immutable Action: Modification of Inter-child Transfer entries is locked.");
          }
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
        else if (header === "recordedby") cell.setValue(tx.recordedBy || "");
      });
      
      result = { status: "success", message: "Transaction entry updated accurately." };
    }
    
    // --- ACTIONS LAYER 3: DELETE TRANSACTION (BLOCKED IF TRANSFER) ---
    else if (action === "deleteTransaction") {
      const targetId = payload.id;
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      const typeIdx = txHeaders.indexOf("type");
      
      let targetRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(targetId).trim()) {
          const currentType = String(data[i][typeIdx]).toLowerCase().trim();
          // 🛡️ SECURITY GUARD: Intercept backend deletion requests Targeting transfers
          if (currentType === "send" || currentType === "receive") {
            throw new Error("Immutable Action: Deletion of Inter-child Transfer entries is locked.");
          }
          targetRowIndex = i + 1;
          break;
        }
      }
      
      if (targetRowIndex !== -1) {
        txSheet.deleteRow(targetRowIndex);
        result = { status: "success", message: "Transaction row eliminated." };
      } else {
        throw new Error("Row target key missing execution bounds.");
      }
    }
    
    else if (action === "createChild") {      
      if (!childrenSheet) throw new Error("The 'children' sheet tab could not be found.");
      childrenSheet.appendRow([payload.id, payload.name, Number(payload.startAmount) || 0, Number(payload.weeklyAllowance) || 0]);
      result = { status: "success", message: "Child account recorded successfully." };
    }
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
    
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

function isAuthenticatedDevice(fingerprint) {
  if (!fingerprint) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const authSheet = ss.getSheetByName("authorized_devices");
  if (!authSheet) return false;
  const data = authSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(fingerprint).trim()) return true;
  }
  return false;
}

// --- 🌟 UPDATED INTEREST GENERATOR SUMMATION MATH TRACKING ---
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
        const type = String(txData[j][txTypeIdx]).toLowerCase().trim();
        const amount = Number(txData[j][txAmountIdx]) || 0;
        
        // Weight mapping balance parameters including new values
        if (type === "deposit" || type === "receive") {
          netTransactions += amount;
        } else if (type === "withdrawal" || type === "send") {
          netTransactions -= amount;
        }
      }
    }
    
    const currentBalance = startAmount + netTransactions;

    if (currentBalance > 0) {
      const interestEarned = Math.floor(currentBalance * MONTHLY_INTEREST_RATE * 100) / 100;
      if (interestEarned > 0) {
        const transactionId = "tx_interest_" + today.getTime() + "_" + childId;
        txSheet.appendRow([
          transactionId, childId, dateString, "Monthly Interest Earned (" + (MONTHLY_INTEREST_RATE * 100) + "%)", "System Automated", "deposit", interestEarned, "System Scheduler", "", ""
        ]);
      }
    }
  }
}

function processWeeklyAllowances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = ss.getSheetByName("children");
  const txSheet = ss.getSheetByName("transactions");
  if (!childrenSheet || !txSheet) return;

  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0];
  const idIdx = childHeaders.indexOf("id");
  const allowanceIdx = childHeaders.indexOf("weeklyAllowance");

  const today = new Date();
  const dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  for (let i = 1; i < childData.length; i++) {
    const childId = childData[i][idIdx];
    const allowanceAmount = Number(childData[i][allowanceIdx]);

    if (allowanceAmount > 0) {
      const transactionId = "tx_auto_" + today.getTime() + "_" + childId;
      txSheet.appendRow([
        transactionId, childId, dateString, "Weekly Allowance", "System Automated", "deposit", allowanceAmount, "System Scheduler", "", ""
      ]);
    }
  }
}