function doGet(e) {
  SpreadsheetApp.flush(); 
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  
  // Read All Children Records
  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0];
  const children = [];
  for (let i = 1; i < childData.length; i++) {
    let obj = {};
    childHeaders.forEach((header, index) => {
      obj[header] = childData[i][index];
    });
    children.push(obj);
  }
  
  // Read All Transaction Records
  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0];
  const transactions = [];
  for (let i = 1; i < txData.length; i++) {
    let obj = {};
    txHeaders.forEach((header, index) => {
      obj[header] = txData[i][index];
    });
    transactions.push(obj);
  }
  
  const payload = JSON.stringify({ children: children, transactions: transactions });
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    if (params.action === "createChild") {
      const target = sheet.getSheetByName("children");
      target.appendRow([params.id, params.name, params.startAmount, params.weeklyAllowance]);
    } 
    else if (params.action === "createTransaction") {
      const target = sheet.getSheetByName("transactions");
      target.appendRow([
        params.id, 
        params.childId, 
        params.date, 
        params.what, 
        params.where, 
        params.type, 
        params.amount, 
        params.recordedBy
      ]);
    }
    else if (params.action === "deleteTransaction") {
      const target = sheet.getSheetByName("transactions");
      const rows = target.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0] === params.id) {
          target.deleteRow(i + 1);
          break;
        }
      }
    }
    else if (params.action === "editTransaction") {
      const target = sheet.getSheetByName("transactions");
      const rows = target.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === params.id) {
          target.getRange(i + 1, 3, 1, 6).setValues([[
            params.date,
            params.what,
            params.where,
            params.type,
            params.amount,
            params.recordedBy
          ]]);
          break;
        }
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
