// src/utils/helpers.js

export function formatCurrency(value) { 
  let v = 0;
  if(typeof value === 'number') {
    v = value;
  }
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v); 
}


export function formatDate(dStr) {
  if (!dStr) return '-';
  // If Google passes an ISO timestamp string, slice just the YYYY-MM-DD portion for clean parsing
  const cleanDateStr = dStr.includes('T') ? dStr.split('T')[0] : dStr;
  const [year, month, day] = cleanDateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateMobile(dStr) {
  if (!dStr) return '-';
  const cleanDateStr = dStr.includes('T') ? dStr.split('T')[0] : dStr;
  const [year, month, day] = cleanDateStr.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

/**
 * Generates a consistent hardware/browser token profile fingerprint hash
 * @returns {string}
 */
export function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("KidsAccountsPWA_v1", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("KidsAccountsPWA_v1", 4, 17);
  }
  
  const b64 = canvas.toDataURL().replace("data:image/png;base64,", "");
  let hash = 0;
  for (let i = 0; i < b64.length; i++) {
    const char = b64.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to a signed 32-bit integer boundary check
  }
  
  const platform = (navigator.userAgentData?.platform || navigator.platform || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
    
  return `fp-${platform}-${Math.abs(hash).toString(36)}`;
}

/**
 * Standardized local logging output console relay wrapper
 * @param {string} msg 
 * @param {Ref<Array>} systemLogRef - Option to push logs onto your overlay display terminal arrays
 */
export function appendScreenLog(msg, systemLogRef = null) {
  const timestamp = new Date().toLocaleTimeString();
  const formattedLine = `[${timestamp}] ${msg}`;
  console.log(formattedLine);
  
  if (systemLogRef && systemLogRef.value) {
    systemLogRef.value.unshift(formattedLine);
    if (systemLogRef.value.length > 100) {
      systemLogRef.value.pop();
    }
  }
}