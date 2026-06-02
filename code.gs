function doGet(e) {
  SpreadsheetApp.flush(); 
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  const authSheet = sheet.getSheetByName("authorized_devices"); // Add this
  
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
  
  // Extract just the raw strings from the first column of the auth sheet
  let authorizedDevices = [];
  if (authSheet) {
    const authData = authSheet.getDataRange().getValues();
    authorizedDevices = authData.slice(1).map(row => String(row[0]).trim().toLowerCase());
  }
  
  const payload = JSON.stringify({ 
    children: children, 
    transactions: transactions,
    authorizedDevices: authorizedDevices // Add to payload
  });
  
  return ContentService.createTextOutput(payload)
                       .setMimeType(ContentService.MimeType.JSON);
} 

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- PROTECTION LAYER ENGINE ---
    const authSheet = sheet.getSheetByName("authorized_devices");
    if (!authSheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "denied", message: "🔒 Security system missing configuration." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Extract whitelist array from the fingerprint column
    const authData = authSheet.getDataRange().getValues();
    const approvedFingerprints = authData.slice(1).map(row => String(row[0]).trim().toLowerCase());
    
    // Capture incoming structural credentials
    const incomingFingerprint = String(params.fingerprint || "").trim().toLowerCase();
    
    // Block unauthorized incoming traffic immediately
    if (!approvedFingerprints.includes(incomingFingerprint)) {
      return ContentService.createTextOutput(JSON.stringify({ status: "denied", message: "🔒 Unauthorized Device: This hardware profile is not a registered administrator." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    // --- END PROTECTION LAYER ENGINE ---

    // Execute standard mutation commands once verified
    if (params.action === "createChild") {
      const target = sheet.getSheetByName("children");
      target.appendRow([params.id, params.name, params.startAmount, params.weeklyAllowance]);
    } 
    else if (params.action === "createTransaction") {
      const target = sheet.getSheetByName("transactions");
      
      const headers = target.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      const deviceIdx = headers.indexOf("device");
      const timestampIdx = headers.indexOf("timestamp");
      
      const rowData = [
        params.id, 
        params.childId || params.childid, 
        params.date, 
        params.what, 
        params.where, 
        params.type, 
        params.amount, 
        params.recordedBy
      ];
      
      // Inject device fingerprint if column exists
      if (deviceIdx !== -1) {
        rowData[deviceIdx] = incomingFingerprint;
      }
      
      // 🌟 NEW: Inject real-time execution timestamp if column exists
      if (timestampIdx !== -1) {
        rowData[timestampIdx] = new Date().toISOString();
      }
      
      target.appendRow(rowData);
    }
    else if (params.action === "editTransaction") {
      const target = sheet.getSheetByName("transactions");
      const data = target.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toLowerCase().trim());
      
      // Dynamically map exact header column indexes
      const idIdx = headers.indexOf("id");
      const dateIdx = headers.indexOf("date");
      const whatIdx = headers.indexOf("what");
      const whereIdx = headers.indexOf("where");
      const typeIdx = headers.indexOf("type");
      const amountIdx = headers.indexOf("amount");
      const recordedByIdx = headers.indexOf("recordedby");

      if (idIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing tracking ID header row." })).setMimeType(ContentService.MimeType.JSON);
      }

      let rowFound = false;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(params.id).trim()) {
          const rowNum = i + 1;
          
          // Write directly to coordinates determined by the sheet headers dynamically
          if (dateIdx !== -1) target.getRange(rowNum, dateIdx + 1).setValue(params.date);
          if (whatIdx !== -1) target.getRange(rowNum, whatIdx + 1).setValue(params.what);
          if (whereIdx !== -1) target.getRange(rowNum, whereIdx + 1).setValue(params.where);
          if (typeIdx !== -1) target.getRange(rowNum, typeIdx + 1).setValue(params.type);
          if (amountIdx !== -1) target.getRange(rowNum, amountIdx + 1).setValue(params.amount);
          if (recordedByIdx !== -1) target.getRange(rowNum, recordedByIdx + 1).setValue(params.recordedBy);
          
          rowFound = true;
          break;
        }
      }
      
      if (!rowFound) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Transaction row target ID match not found." })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    // 🌟 FIXED: ADDED THE ENTIRE MISSING DELETE ENGINE BLOCK
    else if (params.action === "deleteTransaction") {
      const target = sheet.getSheetByName("transactions");
      const data = target.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = headers.indexOf("id");

      if (idIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing 'id' column header alignment." })).setMimeType(ContentService.MimeType.JSON);
      }

      let rowDeleted = false;
      // Loop backwards from bottom row to preserve indexing integrity when removing items
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][idIdx]).trim() === String(params.id).trim()) {
          target.deleteRow(i + 1);
          rowDeleted = true;
          break;
        }
      }
      
      if (!rowDeleted) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Target row deletion candidate row missing." })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
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