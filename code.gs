/**
 * @OnlyCurrentDoc
 * @NotOnlyCurrentDoc
 * The line below forces the script to request Google Drive access scopes:
 * @gsschema https://www.googleapis.com/auth/drive
 */

function doGet(e) {
  SpreadsheetApp.flush(); 
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = sheet.getSheetByName("children");
  const txSheet = sheet.getSheetByName("transactions");
  const authSheet = sheet.getSheetByName("authorized_devices");
  const configSheet = sheet.getSheetByName("config"); // 🌟 Added configuration tab layer
  const userSheet = sheet.getSheetByName("users")

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

;
  let usersList = ["Dad", "Mum"]; // Hard fallback defaults if sheet is missing

  if (userSheet) {
    const userValues = userSheet.getDataRange().getValues();
    // Read Column 1 (index 0) skipping the header row
    usersList = userValues.slice(1)
                          .map(row => String(row[0]).trim())
                          .filter(name => name.length > 0);
  }
  
  // Handle action parameter parameters
  const action = e && e.parameter ? e.parameter.action : "";
  
  if (action === "getInitialData") {
    const responsePayload = {
      status: "success",
      children: children,
      transactions: transactions,
      users: usersList,
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
    // Inside your code.gs doPost(e) or action handler where appendRow runs:
     if (action === "addTransaction" || action === "createTransaction") {
      let fileUrl = "";

      // Process the resized image upload to Drive if base64 data exists
      if (payload.receiptImageBase64 && payload.receiptImageBase64.trim().length > 0) {
        try {
          const folderName = "KidsApp_Receipts";
          let folders = DriveApp.getFoldersByName(folderName);
          let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

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

      // Fetch dynamic transactional columns to maintain an adaptive array structure
      const txHeaders = txSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      let newRow = new Array(txHeaders.length).fill(""); 

      // Map transaction properties explicitly to their matching column indices
      txHeaders.forEach((header, index) => {
        if (header === "id") newRow[index] = payload.id || "tx_" + new Date().getTime();
        else if (header === "childid") newRow[index] = payload.childId;
        else if (header === "date") newRow[index] = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        else if (header === "what") newRow[index] = payload.what;
        else if (header === "where") newRow[index] = payload.where;
        else if (header === "type") newRow[index] = payload.type;
        else if (header === "amount") newRow[index] = Number(payload.amount) || 0;
        
        // Fallback normalization checks to capture both lowercased and mixed casing variants coming from the app
        else if (header === "recordedby") newRow[index] = payload.recordedBy || payload.recordedby || "System";
        else if (header === "device") newRow[index] = payload.fingerprint || payload.deviceFingerprint || payload.devicefingerprint || "-";
        
        else if (header === "timestamp") newRow[index] = payload.utcTimestamp || payload.utctimestamp || new Date().toISOString();
        else if (header === "fileurl") newRow[index] = fileUrl; 
      });

      // Safe insertion execution
      txSheet.appendRow(newRow);
      result = { status: "success", message: "Transaction written to spreadsheet." };
    }
    
    // --- ACTIONS LAYER 2: UPDATE EXISTING TRANSACTION ROW ---
    else if (action === "updateTransaction" || action === "editTransaction") {
      // 🌟 FIX: Fall back to payload itself if payload.transaction doesn't exist
      const tx = payload.transaction || payload;
      
      const data = txSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      
      if (idIdx === -1) throw new Error("Could not find required tracking ID header cell in ledger sheet.");
      
      // Safely grab the target transaction ID from whichever property casing variant arrived
      const targetId = tx.id || payload.id;
      if (!targetId) throw new Error("No transaction ID property found inside the request payload.");
      
      let foundRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(targetId).trim()) {
          foundRowIndex = i + 1; // Translate to 1-based index numbering schema
          break;
        }
      }
      
      if (foundRowIndex === -1) {
        throw new Error("Target transaction row tracking ID not matched in database matrix.");
      }
      
      txHeaders.forEach((header, colIndex) => {
        const cell = txSheet.getRange(foundRowIndex, colIndex + 1);
        if (header === "childid") cell.setValue(tx.childId || tx.childid);
        else if (header === "date") cell.setValue(tx.date);
        else if (header === "what") cell.setValue(tx.what);
        else if (header === "where") cell.setValue(tx.where);
        else if (header === "type") cell.setValue(tx.type);
        else if (header === "amount") cell.setValue(Number(tx.amount) || 0);
        
        // Add flexible fallbacks for tracking identifiers 
        else if (header === "recordedby") cell.setValue(tx.recordedBy || tx.recordedby || "");
        else if (header === "devicefingerprint") cell.setValue(tx.deviceFingerprint || tx.fingerprint || tx.devicefingerprint || "-");
        else if (header === "utctimestamp") cell.setValue(tx.utcTimestamp || tx.utctimestamp || new Date().toISOString());
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
    else if (payload.action === "createChild") {      
      if (!childrenSheet) throw new Error("The 'children' sheet tab could not be found.");
      
      // Extract from the JSON block variables cleanly
      var id = payload.id;
      var name = payload.name;
      var startAmount = payload.startAmount;       // Ensure these variables match your payload keys
      var weeklyAllowance = payload.weeklyAllowance; // Ensure these variables match your payload keys
      
      // Append to your columns row array layout (e.g., ID, Name, Starting Balance, Allowance)
      childrenSheet.appendRow([id, name, startAmount, weeklyAllowance]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Child account recorded successfully." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (payload.action === "createUser") {
      const userSheet = sheet.getSheetByName("users");
      if (!userSheet) throw new Error("The 'users' sheet tab could not be located.");
      
      const newUserName = String(payload.name).trim();
      if (!newUserName) throw new Error("User registration name cannot be empty.");
      
      // Prevent duplicate user registrations
      const existingUsers = userSheet.getDataRange().getValues().map(r => String(r[0]).trim().toLowerCase());
      if (existingUsers.includes(newUserName.toLowerCase())) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "User already registered." })).setMimeType(ContentService.MimeType.JSON);
      }
      
      userSheet.appendRow([newUserName]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "User written to database sheet successfully." })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (payload.action === "deleteUser") {
      const userSheet = sheet.getSheetByName("users");
      if (!userSheet) throw new Error("The 'users' sheet tab could not be located.");
      
      const targetUser = String(payload.name).trim().toLowerCase();
      const data = userSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === targetUser) {
          userSheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "User profile removed cleanly." })).setMimeType(ContentService.MimeType.JSON);
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