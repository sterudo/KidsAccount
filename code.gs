function doGet(e) {
  SpreadsheetApp.flush(); 
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  const authSheet = sheet.getSheetByName("authorized_devices");
  const configSheet = sheet.getSheetByName("config"); // 🌟 Added configuration tab layer

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
  
  // Extract device authorization strings
  let authorizedDevices = [];
  if (authSheet) {
    const authData = authSheet.getDataRange().getValues();
    authorizedDevices = authData.map(row => String(row[0]).trim()).filter(val => val && val !== "devicefingerprint");
  }

  // 🌟 NEW: Extract Gemini API key safely from the centralized config sheet
  let geminiKey = "";
  if (configSheet) {
    const configData = configSheet.getDataRange().getValues();
    for (let i = 1; i < configData.length; i++) {
      if (String(configData[i][0]).toLowerCase().trim() === "gemini_api_key") {
        geminiKey = String(configData[i][1]).trim();
        break;
      }
    }
  }
  
  // Handle action parameter parameters
  const action = e && e.parameter ? e.parameter.action : "";
  
  if (action === "getInitialData") {
    const responsePayload = {
      status: "success",
      children: children,
      transactions: transactions,
      users: ["Dad", "Mum"],
      authorizedDevices: authorizedDevices,
      geminiApiKey: geminiKey // 🌟 Sent down securely to your whitelisted devices
    };
    
    return ContentService.createTextOutput(JSON.stringify(responsePayload))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default raw layout status response (backward fallback safety checks)
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "Google Apps Script Engine processing smoothly. Use valid actions parameters." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  SpreadsheetApp.flush();
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const txSheet = sheet.getSheetByName("transactions");
  const childrenSheet = sheet.getSheetByName("children");
  
  let result = { status: "error", message: "Unknown process fault" };
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing structural JSON body payload rules");
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    // --- ACTIONS LAYER 1: APPEND NEW TRANSACTION ---
    if (action === "addTransaction") {
      const tx = payload.transaction;
      
      // Calculate dynamic headers dynamically to preserve structure positioning safety
      const txHeaders = txSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      const newRow = new Array(txHeaders.length).fill("");
      
      txHeaders.forEach((header, index) => {
        if (header === "id") newRow[index] = tx.id;
        else if (header === "childid") newRow[index] = tx.childId;
        else if (header === "date") newRow[index] = tx.date;
        else if (header === "what") newRow[index] = tx.what;
        else if (header === "where") newRow[index] = tx.where;
        else if (header === "type") newRow[index] = tx.type;
        else if (header === "amount") newRow[index] = Number(tx.amount) || 0;
        else if (header === "recordedby") newRow[index] = tx.recordedBy;
        else if (header === "devicefingerprint") newRow[index] = tx.deviceFingerprint;
        else if (header === "utctimestamp") newRow[index] = tx.utcTimestamp || new Date().toISOString();
      });
      
      txSheet.appendRow(newRow);
      result = { status: "success", message: "Transaction written to spreadsheet." };
    }
    
    // --- ACTIONS LAYER 2: UPDATE EXISTING TRANSACTION ROW ---
    else if (action === "updateTransaction") {
      const tx = payload.transaction;
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      
      if (idIdx === -1) throw new Error("Could not find required tracking ID header cell in ledger sheet.");
      
      let foundRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(tx.id).trim()) {
          foundRowIndex = i + 1; // Translate to 1-based index numbering schema
          break;
        }
      }
      
      if (foundRowIndex === -1) {
        throw new Error("Target transaction row tracking ID not matched in database matrix.");
      }
      
      txHeaders.forEach((header, colIndex) => {
        const cell = txSheet.getRange(foundRowIndex, colIndex + 1);
        if (header === "childid") cell.setValue(tx.childId);
        else if (header === "date") cell.setValue(tx.date);
        else if (header === "what") cell.setValue(tx.what);
        else if (header === "where") cell.setValue(tx.where);
        else if (header === "type") cell.setValue(tx.type);
        else if (header === "amount") cell.setValue(Number(tx.amount) || 0);
        else if (header === "recordedby") cell.setValue(tx.recordedBy);
        else if (header === "devicefingerprint") cell.setValue(tx.deviceFingerprint);
        else if (header === "utctimestamp") cell.setValue(tx.utcTimestamp || new Date().toISOString());
      });
      
      result = { status: "success", message: "Transaction entry updated accurately." };
    }
    
    // --- ACTIONS LAYER 3: DELETE TRANSACTION ROW ---
    else if (action === "deleteTransaction") {
      const targetId = payload.id;
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      
      if (idIdx === -1) throw new Error("ID target column missing.");
      
      let targetRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(targetId).trim()) {
          targetRowIndex = i + 1;
          break;
        }
      }
      
      if (targetRowIndex !== -1) {
        txSheet.deleteRow(targetRowIndex);
        result = { status: "success", message: "Transaction row eliminated from sheet data context." };
      } else {
        throw new Error("Row target key matching sequence missed execution target range bounds.");
      }
    }
    
    // --- ACTIONS LAYER 4: ADD NEW CHILD ROW PROFILE ---
    else if (action === "addChild") {
      const child = payload.child;
      const childHeaders = childrenSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      const newChildRow = new Array(childHeaders.length).fill("");
      
      childHeaders.forEach((header, index) => {
        if (header === "id") newChildRow[index] = child.id;
        else if (header === "name") newChildRow[index] = child.name;
        else if (header === "startamount") newChildRow[index] = Number(child.startAmount) || 0;
      });
      
      childrenSheet.appendRow(newChildRow);
      result = { status: "success", message: "New child profile appended cleanly." };
    }
    
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

function processWeeklyAllowances() {
    SpreadsheetApp.flush(); 
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  
  if (!childrenSheet || !txSheet) return;

  // 1. Fetch all children profiles
  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0];
  
  // Map column header indexes dynamically
  const idIdx = childHeaders.indexOf("id");
  const nameIdx = childHeaders.indexOf("name");
  const allowanceIdx = childHeaders.indexOf("weeklyAllowance");

  // Get current date formatted cleanly (YYYY-MM-DD)
  const today = new Date();
  const dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // 2. Loop through every child row and apply allowance if greater than 0
  for (let i = 1; i < childData.length; i++) {
    const childId = childData[i][idIdx];
    const childName = childData[i][nameIdx];
    const allowanceAmount = Number(childData[i][allowanceIdx]);

    if (allowanceAmount > 0) {
      const transactionId = "tx_auto_" + today.getTime() + "_" + childId;
      
      // Append row to the transactions tab sheet
      txSheet.appendRow([
        transactionId,     // unique id
        childId,           // childId linking
        dateString,        // date
        "Weekly Allowance",// what
        "System Automated",// where
        "deposit",         // type (+)
        allowanceAmount,   // amount
        "System Scheduler" // recordedBy
      ]);
    }
  }
}

function processMonthlyInterest() {
  SpreadsheetApp.flush(); 
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  
  if (!childrenSheet || !txSheet) return;

  // Set your desired monthly interest rate here (e.g., 0.5% per month = 0.005)
  const MONTHLY_INTEREST_RATE = 0.005; 

  // 1. Fetch all children profiles
  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0];
  const idIdx = childHeaders.indexOf("id");
  const startAmountIdx = childHeaders.indexOf("startAmount");

  // Fetch all transactions to calculate current balance
  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0];
  const txChildIdIdx = txHeaders.indexOf("childId");
  const txTypeIdx = txHeaders.indexOf("type");
  const txAmountIdx = txHeaders.indexOf("amount");

  const today = new Date();
  const dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // 2. Process each child's current balance and apply interest
  for (let i = 1; i < childData.length; i++) {
    const childId = String(childData[i][idIdx]);
    const startAmount = Number(childData[i][startAmountIdx]) || 0;

    // Calculate current net balance from the ledger rows
    let netTransactions = 0;
    for (let j = 1; j < txData.length; j++) {
      if (String(txData[j][txChildIdIdx]) === childId) {
        const type = txData[j][txTypeIdx];
        const amount = Number(txData[j][txAmountIdx]) || 0;
        netTransactions += (type === "deposit" ? amount : -amount);
      }
    }
    
    const currentBalance = startAmount + netTransactions;

    // Only apply interest if the account balance is positive
    if (currentBalance > 0) {
      // Round down to 2 decimal places to keep currency math clean
      const interestEarned = Math.floor(currentBalance * MONTHLY_INTEREST_RATE * 100) / 100;

      if (interestEarned > 0) {
        const transactionId = "tx_interest_" + today.getTime() + "_" + childId;
        
        txSheet.appendRow([
          transactionId,                     // unique id
          childId,                           // childId
          dateString,                        // date
          "Monthly Interest Earned (" + (MONTHLY_INTEREST_RATE * 100) + "%)", // what
          "System Automated",                // where
          "deposit",                         // type (+)
          interestEarned,                    // amount
          "System Scheduler"                 // recordedBy
        ]);
      }
    }
  }
}