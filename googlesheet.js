/**
 * @OnlyCurrentDoc
 * @NotOnlyCurrentDoc
 * Forces the script to request Google Drive access scopes:
 * @gsschema https://www.googleapis.com/auth/drive
 */

function doGet(e) {
  SpreadsheetApp.flush(); 
  
  const fingerprint = e && e.parameter ? String(e.parameter.fingerprint).trim() : "";
  const action = e && e.parameter ? e.parameter.action : "";
  const isPublicAction = (action === "getAvatarProxy" || action === "getDatabase" || action === "getInitialData" || action === "getPendingAuth" );
    
   if (!isPublicAction || !isAuthenticatedDevice(fingerprint)) {
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
  const avatarSheet = sheet.getSheetByName("avatars");

  function parseSheetRecords(targetSheet, suppressColumn = []) {
    if (!targetSheet) return [];
    const range = targetSheet.getDataRange();
    const data = range.getValues();
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
        if(!suppressColumn.includes(header)) {
          obj[header] = val;
        }
      });
      records.push(obj);
    }
    return records;
  }
  
  const children = parseSheetRecords(childrenSheet);
  const transactions = parseSheetRecords(txSheet);
  const avatarsHistory = parseSheetRecords(avatarSheet);
 
  
  let usersList = parseSheetRecords(userSheet, ["pass"]);
  

  let systemConfig = {};
  if (configSheet) {
    const configData = configSheet.getDataRange().getValues();
    for (let i = 1; i < configData.length; i++) {
      const key = String(configData[i][0]).trim();
      const val = String(configData[i][1]).trim();
      if (key) systemConfig[key] = val;
    }
  }

   if (action === "getPendingAuth") {
    const authSheet = sheet.getSheetByName("authorized_devices");
    const data = authSheet.getDataRange().getValues();
    const pending = [];

    // Skip header row (i=1), look at Column B (index 1)
    for (let i = 1; i < data.length; i++) {
      const fingerprint = String(data[i][1]).trim();
      if (fingerprint.length > 0) {
        pending.push({ fingerprint: fingerprint, timestamp: data[i][2] });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(pending))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getAvatarProxy") {
    const fileId = e.parameter.fileId;
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: `data:${mimeType};base64,${base64}`
    })).setMimeType(ContentService.MimeType.JSON);
  }


  // FIXED: Logic handles 'getDatabase' and 'getInitialData' actions
  if (action === "getDatabase" || action === "getInitialData" || !action) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      children: children,
      transactions: transactions,
      users: usersList,
      config: systemConfig,
      avatars: avatarsHistory
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "Engine active, but action not recognized: " + action 
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
    const action = payload.action;

    if (!isAuthenticatedDevice(fingerprint, action)) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 403, error: "Unauthorized", message: "Action rejected. Device unauthorized. " + fingerprint 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    

    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const txSheet = sheet.getSheetByName("transactions");
    const childrenSheet = sheet.getSheetByName("children");
    const usersSheet = sheet.getSheetByName("users");

    
    // --- ACTIONS LAYER 1: APPEND STANDARD TRANSACTION ---
    if (action === "addTransaction" || action === "createTransaction") {
      let fileUrl = "";
      
      // 🌟 UPGRADED: Fallback check matching both frontend payload variations safely
      var incomingBase64 = payload.receiptImageBase64 || payload.receiptBase64 || "";
      
      if (incomingBase64 && incomingBase64.trim().length > 0) {
        try {
          // Clean out standard Base64 header signatures if present to avoid file corruption
          var rawBase64 = incomingBase64.split(",")[1] || incomingBase64;
          
          const folderName = "KidsApp_Receipts";
          let folders = DriveApp.getFoldersByName(folderName);
          let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          // Decode data stream and create asset inside target directory
          const decodedBlob = Utilities.newBlob(Utilities.base64Decode(rawBase64), "image/jpeg", "receipt_" + new Date().getTime() + ".jpg");
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
        else if (header === "recordedby") newRow[index] = payload.recordedBy || "System";
        else if (header === "device") newRow[index] = fingerprint;
        else if (header === "timestamp") newRow[index] = payload.utcTimestamp || new Date().toISOString();
        else if (header === "fileurl") newRow[index] = fileUrl;
        else if (header === "transfergroup") newRow[index] = payload.transferGroup || "";
      });

      txSheet.appendRow(newRow);
      result = { status: "success", message: "Transaction written to spreadsheet.", fileUrl: fileUrl };
    }
    
    else if(action === "verifyPassword") {
      let userId = payload.userId;
      let password = payload.password;
      const data = usersSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
      const passIdx =  txHeaders.indexOf("pass");
   
      
      let foundRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(userId).trim()        
        && String(data[i][passIdx]).trim() === String(password).trim()) {
          foundRowIndex = i + 1; // 1-based indexing for sheets range rows
          break;
        }
      }
      if(foundRowIndex > -1) {
         result = { status: "success"};
      } else {
          result = { status: "error" };
      }
    }

    // --- ACTIONS LAYER: ATOMIC DUAL TRANSFER WRITER ---
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
        else if (header === "where") senderRow[index] = "send"; // Corrected out of payload leakage
        else if (header === "type") senderRow[index] = "send"; 
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
        else if (header === "where") receiverRow[index] = "receive"; // Corrected out of payload leakage
        else if (header === "type") receiverRow[index] = "receive"; 
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

    // Add this to your Google Apps Script doPost(e)
    else if (action === "updateAvatarAssociation") {
      const avatarSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("avatars");
      const data = avatarSheet.getDataRange().getValues();
      
      let found = false;
      for (let i = 1; i < data.length; i++) {
        // Column 2 is childid
        if (String(data[i][1]).trim() === String(payload.oldChildId).trim()) {
          avatarSheet.getRange(i + 1, 2).setValue(payload.newChildId);
          found = true;
          break;
        }
      }
      result = { status: found ? "success" : "error", message: found ? "Updated" : "Association not found" }
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
    
    // --- ACTIONS LAYER 4: UPDATE / SAVE ENHANCED CHILD PROFILE DATA ---
    else if (action === "updateChildProfile") {
      if (!childrenSheet) throw new Error("Children sheet unavailable.");
      const data = childrenSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toLowerCase().trim());
      
      const idIdx = headers.indexOf("id");
      let matchedRow = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(payload.id).trim()) {
          matchedRow = i + 1;
          break;
        }
      }
      
      if (matchedRow === -1) throw new Error("Child record to update not found.");
      
      // Dynamically map updates into respective columns safely
      headers.forEach((header, idx) => {
        const cell = childrenSheet.getRange(matchedRow, idx + 1);
        if (header === "name") cell.setValue(payload.name);
        else if (header === "aliases") cell.setValue(payload.aliases || "");
        else if (header === "status") cell.setValue(payload.status || "active");
        else if (header === "interestrate") cell.setValue(Number(payload.interestRate) || 0);
        else if (header === "allowanceamount") cell.setValue(Number(payload.allowanceAmount) || 0);
        else if (header === "allowanceinterval") cell.setValue(payload.allowanceInterval || "weekly");
        else if (header === "allowancenextdate") cell.setValue(payload.allowanceNextDate || "");
        else if (header === "avatarfileid") cell.setValue(payload.avatarFileId || "");
        else if (header === "comment") cell.setValue(payload.comment || "");
        else if (header === "accentcolor") cell.setValue(payload.accentColor || "#38bdf8");
      });
      
      result = { status: "success", message: "Child configurations synchronized cleanly." };
    }

    else if(action === "createUser") {
      const headers = usersSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      let newRow = new Array(headers.length).fill("");
      headers.forEach((h, i) => {
          if (h === "id") newRow[i] = payload.id || payload.name;                
          else if (h === "name") newRow[i] = payload.name;
          else if (h === "role") newRow[i] = payload.role || "user";
          else if (h === "pass") newRow[i] = payload.pass || "";
      });
      usersSheet.appendRow(newRow);
      result = { status: "success", message: "User account recorded successfully." };
    }

    else if(action === "updateUser") {
      const tx = payload.user || payload;
      const data = usersSheet.getDataRange().getValues();
      const txHeaders = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = txHeaders.indexOf("id");
   
      
      let foundRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(payload.id).trim()) {
          foundRowIndex = i + 1; // 1-based indexing for sheets range rows
          break;
        }
      }

      if (foundRowIndex !== -1) {
          txHeaders.forEach((header, colIndex) => {
            const cell = data.getRange(foundRowIndex, colIndex + 1);
            if (header === "name") cell.setValue(tx.name);
            else if (header === "role") cell.setValue(tx.role);
            else if (header === "pass" && (tx.pass ||tx.removePass)) cell.setValue(tx.removePass ? "" : tx.pass);           
          });
          result = { status: "success", message: "User profile  has bin updated." };
        } else {
          throw new Error("Specified User profile ID could not be matched for deletion.");
        } 
    }  

  else if(action === "deleteUser") {
    const data = usersSheet.getDataRange().getValues();
    const idIdx = data[0].map(h => String(h).toLowerCase().trim()).indexOf("id");
    
    let targetRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim() === String(payload.id).trim()) {
        targetRowIndex = i + 1; // 1-based indexing for sheets range rows
        break;
      }
    }

    if (targetRowIndex !== -1) {
      usersSheet.deleteRow(targetRowIndex);
      result = { status: "success", message: "User profile permanently removed from directory." };
    } else {
      throw new Error("Specified User profile ID could not be matched for deletion.");
    }  
  }
    
    else if (action === "createChild") {      
      if (!childrenSheet) throw new Error("The 'children' sheet tab could not be found.");
      const headers = childrenSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      let newRow = new Array(headers.length).fill("");
      
      headers.forEach((h, i) => {
        if (h === "id") newRow[i] = payload.id;
        else if (h === "name") newRow[i] = payload.name;
        else if (h === "startamount") newRow[i] = Number(payload.startAmount) || 0;
        else if (h === "status") newRow[i] = "active";
        else if (h === "allowanceamount") newRow[i] = Number(payload.weeklyAllowance) || 0;
        else if (h === "allowanceinterval") newRow[i] = "weekly";
      });
      
      childrenSheet.appendRow(newRow);
      result = { status: "success", message: "Child account recorded successfully." };
    }
    
    else if (action === "createChildExtended") {
      if (!childrenSheet) throw new Error("Children sheet layout tab is missing.");
      
      const headers = childrenSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
      let newRow = new Array(headers.length).fill("");
      
      headers.forEach((header, idx) => {
        if (header === "id") newRow[idx] = payload.id;
        else if (header === "name") newRow[idx] = payload.name;
        else if (header === "startamount") newRow[idx] = Number(payload.startAmount) || 0;
        else if (header === "status") newRow[idx] = payload.status || "active";
        else if (header === "aliases") newRow[idx] = payload.aliases || "";
        else if (header === "interestrate") newRow[idx] = Number(payload.interestRate) || 0;
        else if (header === "allowanceamount") newRow[idx] = Number(payload.allowanceAmount) || 0;
        else if (header === "allowanceinterval") newRow[idx] = payload.allowanceInterval || "weekly";
        else if (header === "allowancenextdate") newRow[idx] = payload.allowanceNextDate || "";
        else if (header === "avatarfileid") newRow[idx] = payload.avatarFileId || "";
        else if (header === "comment") newRow[idx] = payload.comment || "";
        else if (header === "accentcolor") newRow[idx] = payload.accentColor || "#38bdf8";
      });
      
      childrenSheet.appendRow(newRow);
      result = { status: "success", message: "Extended child row structural account added." };
    }

    else if (action === "uploadAvatarDirect") {
      const uploadRes = uploadChildAvatar(payload.childId, payload.base64Data);
      if (uploadRes.success) {
        result = { status: "success", fileId: uploadRes.fileId };
      } else {
        throw new Error(uploadRes.error);
      }
    }

    else if (action === "deleteChildProfile") {
      if (!childrenSheet) throw new Error("Children data sheet layout tab is missing.");
      
      const data = childrenSheet.getDataRange().getValues();
      const idIdx = data[0].map(h => String(h).toLowerCase().trim()).indexOf("id");
      
      let targetRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]).trim() === String(payload.id).trim()) {
          targetRowIndex = i + 1; // 1-based indexing for sheets range rows
          break;
        }
      }
      
      if (targetRowIndex !== -1) {
        childrenSheet.deleteRow(targetRowIndex);
        result = { status: "success", message: "Child profile permanently removed from directory." };
      } else {
        throw new Error("Specified child profile ID could not be matched for deletion.");
      }
    }

    else if (action === "requestAuth") {
      const authSheet = sheet.getSheetByName("authorized_devices");
      const data = authSheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === payload.requestFingerprint) {
          found = true;
        }
      }
      if(!found) {
        // Appends to Column B (Column 2)
        authSheet.appendRow(["", payload.requestFingerprint, new Date().toISOString()]);
      }
      result = { status: "success" };
    }

    else if (action === "approveAuth") {
      const authSheet = sheet.getSheetByName("authorized_devices");
      const data = authSheet.getDataRange().getValues();
      let success = false;
      
      // Find the fingerprint in Column B and move it to Column A
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === payload.approveFingerprint) {
          authSheet.getRange(i + 1, 1).setValue(payload.approveFingerprint); // Move to Column A
          authSheet.getRange(i + 1, 2).clearContent();               // Clear Column B
          result = { status: "success" };
          success = true;
        }
      }
      if(!success) {
         result = { status: "error", message: "Request not found" };
      }
    }
    
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

function isAuthenticatedDevice(fingerprint, action = "") {
  if(String(fingerprint).trim() == "request" && action == "requestAuth") return true;
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

// --- 🌟 DYNAMIC INDIVIDUAL INTER-RATE GENERATOR ---
function processMonthlyInterest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const childrenSheet = ss.getSheetByName("children");
  const txSheet = ss.getSheetByName("transactions");
  if (!childrenSheet || !txSheet) return;

  const DEFAULT_INTEREST_RATE = 0.005; 
  const childData = childrenSheet.getDataRange().getValues();
  const childHeaders = childData[0].map(h => String(h).toLowerCase().trim());
  
  const idIdx = childHeaders.indexOf("id");
  const startAmountIdx = childHeaders.indexOf("startamount");
  const rateIdx = childHeaders.indexOf("interestrate");
  const statusIdx = childHeaders.indexOf("status");

  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0].map(h => String(h).toLowerCase().trim());
  const txChildIdIdx = txHeaders.indexOf("childid");
  const txTypeIdx = txHeaders.indexOf("type");
  const txAmountIdx = txHeaders.indexOf("amount");

  const today = new Date();
  const dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");

  for (let i = 1; i < childData.length; i++) {
    if (statusIdx !== -1 && String(childData[i][statusIdx]).trim() === "deactivated") continue;

    const childId = String(childData[i][idIdx]);
    const startAmount = Number(childData[i][startAmountIdx]) || 0;
    
    // 🌟 Adaptive Rate Selection: individual row value takes precedence over default standard
    let activeChildRate = DEFAULT_INTEREST_RATE;
    if (rateIdx !== -1 && childData[i][rateIdx] !== "") {
      activeChildRate = Number(childData[i][rateIdx]);
    }

    let netTransactions = 0;
    for (let j = 1; j < txData.length; j++) {
      if (String(txData[j][txChildIdIdx]) === childId) {
        const type = String(txData[j][txTypeIdx]).toLowerCase().trim();
        const amount = Number(txData[j][txAmountIdx]) || 0;
        
        if (type === "deposit" || type === "receive") {
          netTransactions += amount;
        } else if (type === "withdrawal" || type === "send") {
          netTransactions -= amount;
        }
      }
    }
    
    const currentBalance = startAmount + netTransactions;

    if (currentBalance > 0) {
      const interestEarned = Math.floor(currentBalance * activeChildRate * 100) / 100;
      if (interestEarned > 0) {
        const transactionId = "tx_interest_" + today.getTime() + "_" + childId;
        txSheet.appendRow([
          transactionId, childId, dateString, "Monthly Interest Earned (" + (activeChildRate * 100) + "%)", "System Automated", "deposit", interestEarned, "System", "System", today.toISOString()
        ]);
      }
    }
  }
}

function processIndividualAllowances() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var childrenSheet = ss.getSheetByName("children");
  var transactionSheet = ss.getSheetByName("transactions");
  
  if (!childrenSheet || !transactionSheet) return;
  
  var data = childrenSheet.getDataRange().getValues();
  var headers = data[0].map(h => String(h).toLowerCase().trim());
  
  var idIdx = headers.indexOf("id");
  var statusIdx = headers.indexOf("status");
  var amtIdx = headers.indexOf("allowanceamount");
  var legacyAmtIdx = headers.indexOf("weeklyallowance"); 
  var intervalIdx = headers.indexOf("allowanceinterval");
  var nextDateIdx = headers.indexOf("allowancenextdate");
  
  var todayStr = new Date().toISOString().split('T')[0];
  var today = new Date(todayStr);
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    if (statusIdx !== -1 && String(row[statusIdx]).trim() === "deactivated") continue;
    
    var childId = row[idIdx];
    var nextDateValue = row[nextDateIdx];
    
    if (!nextDateValue) continue; 
    
    var nextPaymentDate = new Date(nextDateValue);
    
    if (today >= nextPaymentDate) {
      var payoutAmount = Number(amtIdx !== -1 && row[amtIdx] !== "" ? row[amtIdx] : row[legacyAmtIdx]);
      var interval = (intervalIdx !== -1 && row[intervalIdx]) ? String(row[intervalIdx]).toLowerCase().trim() : "weekly";
      
      if (payoutAmount > 0) {
        var txHeaders = transactionSheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
        let newTxRow = new Array(txHeaders.length).fill("");
        
        txHeaders.forEach((h, idx) => {
          if (h === "id") newTxRow[idx] = "tx_auto_" + new Date().getTime() + "_" + childId;
          else if (h === "childid") newTxRow[idx] = childId;
          else if (h === "date") newTxRow[idx] = todayStr;
          else if (h === "what") newTxRow[idx] = "Automated Allowance Payout";
          else if (h === "where") newTxRow[idx] = "System Scheduler";
          else if (h === "type") newTxRow[idx] = "deposit";
          else if (h === "amount") newTxRow[idx] = payoutAmount;
          else if (h === "recordedby") newTxRow[idx] = "System";
          else if (h === "device") newTxRow[idx] = "System";	
          else if (h === "timestamp") newTxRow[idx] =  new Date().toISOString();
        });
        
        transactionSheet.appendRow(newTxRow);
      }
      
      var updatedDate = new Date(nextPaymentDate);
      if (interval === "monthly") {
        updatedDate.setMonth(updatedDate.getMonth() + 1);
      } else {
        updatedDate.setDate(updatedDate.getDate() + 7);
      }
      
      var updatedDateStr = updatedDate.toISOString().split('T')[0];
      childrenSheet.getRange(i + 1, nextDateIdx + 1).setValue(updatedDateStr);
    }
  }
}

function initializeDatabaseSchema() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var avatarSheet = ss.getSheetByName("avatars");
  if (!avatarSheet) {
    avatarSheet = ss.insertSheet("avatars");
    avatarSheet.appendRow(["id", "childid", "drivefileid", "uploadedat"]);
  }
  
  var childrenSheet = ss.getSheetByName("children");
  if (childrenSheet) {
    var headers = childrenSheet.getRange(1, 1, 1, childrenSheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());
    var requiredColumns = [
      "status", "aliases", "interestrate", "allowanceamount", 
      "allowanceinterval", "allowancenextdate", "avatarfileid", "comment"
    ];
    
    requiredColumns.forEach(function(colName) {
      if (headers.indexOf(colName.toLowerCase()) === -1) {
        childrenSheet.getRange(1, childrenSheet.getLastColumn() + 1).setValue(colName);
      }
    });
  }
}

function uploadChildAvatar(childId, base64Data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var avatarSheet = ss.getSheetByName("avatars");
  var childrenSheet = ss.getSheetByName("children");
  
  var rawBase64 = base64Data.split(",")[1] || base64Data;

  var isPng = base64Data.indexOf("image/png") !== -1;
  var mimeType = isPng ? "image/png" : "image/jpeg";
  var ext = isPng ? ".png" : ".jpg";

  var blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), mimeType, "avatar_" + childId + "_" + Date.now() + ext);
  
  var folders = DriveApp.getFoldersByName("KidsAccount_Avatars");
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("KidsAccount_Avatars");
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var driveFileId = file.getId();
  
  var nextAvatarId = "av_" + Date.now();
  avatarSheet.appendRow([nextAvatarId, childId, driveFileId, new Date().toISOString()]);
  
  var childrenData = childrenSheet.getDataRange().getValues();
  var headers = childrenData[0].map(h => String(h).toLowerCase().trim());
  var idColIndex = headers.indexOf("id");
  var avatarColIndex = headers.indexOf("avatarfileid");
  
  for (var i = 1; i < childrenData.length; i++) {
    if (String(childrenData[i][idColIndex]) === String(childId)) {
      childrenSheet.getRange(i + 1, avatarColIndex + 1).setValue(driveFileId);
      break;
    }
  }
  
  return { success: true, fileId: driveFileId };
}