// src/utils/helpers.js

export function formatCurrency(value) {
    let v = 0;
    if (typeof value === "number") {
        v = value;
    }
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
}

/**
 * Formats an ISO-8601 timestamp string into a concise, readable presentation format.
 * Transforms '2026-06-02T19:45:00.000Z' into '02/06 19:45'.
 * * @param {string} tsStr - The ISO timestamp string to format.
 * @returns {string} Formatted timestamp or the original string if parsing fails.
 */
export function formatTimestamp(tsStr) {
    if (!tsStr || tsStr === "-") return "-";

    try {
        const dateObj = new Date(tsStr);

        // Fallback if the string cannot be parsed as a valid date
        if (isNaN(dateObj.getTime())) {
            return tsStr;
        }

        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");

        return `${day}/${month} ${hours}:${minutes}`;
    } catch (e) {
        console.error("Failed to parse date timestamp:", e);
        return tsStr;
    }
}

export function formatDate(dStr, short = false) {
    if (!dStr) return "-";
    // If Google passes an ISO timestamp string, slice just the YYYY-MM-DD portion for clean parsing
    const cleanDateStr = dStr.includes("T") ? dStr.split("T")[0] : dStr;
    const [year, month, day] = cleanDateStr.split("-");
    const monthname = new Date(cleanDateStr).toLocaleString("en-GB", { month: "short" });
    return short ? `${day} ${monthname} ${year.slice(-2)}` : `${day}/${month}/${year}`;
}

export function formatDateMobile(dStr) {
    if (!dStr) return "-";
    const cleanDateStr = dStr.includes("T") ? dStr.split("T")[0] : dStr;
    const [year, month, day] = cleanDateStr.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
}

function generateFingerprintHash() {
    let s = "";
    try {
        const scalingFactor = window.devicePixelRatio ? Math.round(window.devicePixelRatio * 100) / 100 : null;
        const width = screen.width;
        const height = screen.height;
        const colourDepth = screen.colorDepth ? screen.colorDepth : null;
        let s = "width=" + width + "&height=" + height;
        if (scalingFactor != null) {
            s = s + "&scaling-factor=" + scalingFactor;
        }
        if (colourDepth != null) {
            s = s + "&colour-depth=" + colourDepth;
        }
    } catch (noException) {}

    try {
        let ua = navigator.userAgent || "unknown";
        const browserInfo = ua.match(/(firefox|msie|trident|chrome|safari|edg|opr|opera)[\/\s]?([\d\.]+)/i) || [];
        const browserName = browserInfo[1] ? browserInfo[1].toLowerCase() : "unknown";
        s = s + browserName;
    } catch (noException) {}

    const platform = (navigator.userAgentData?.platform || navigator.platform || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "");
    s = s + platform;
    const languages = (navigator.languages || ["unknown"])
        .join()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    s = s + languages;
    s = s + (new Date()).getTime();

    const b64 = btoa(s);
    let hash = 0;
    for (let i = 0; i < b64.length; i++) {
        const char = b64.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to a signed 32-bit integer boundary check
    }
    return `fpx-${platform}-${Math.abs(hash).toString(36)}`;
}

/**
 * Generates a consistent hardware/browser token profile fingerprint hash
 * @returns {string}
 */
export function generateDeviceFingerprint() {
    localStorage.removeItem("new_pocket_money_fingerprint");
    localStorage.removeItem("pocket_money_fingerprint");
    let fp = localStorage.getItem("kidsAccount_fingerprint");
    if ((!fp || fp === "undefined") && typeof window !== "undefined") {
        fp = generateFingerprintHash();
        localStorage.setItem("kidsAccount_fingerprint", fp);
    }
    return fp;
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

// Helper to transform web link to bypass preview limits
export function getRawImageUrl(driveUrl) {
    if (!driveUrl) return "";
    const match = driveUrl.match(/id=([^&]+)|\|\/d\/([^/]+)/);
    const fileId = match ? match[1] || match[2] : null;
    return fileId ? `https://lh3.googleusercontent.com/u/0/d/${fileId}` : driveUrl;
}

/**
 * Filters a raw transaction list by child ID (checking both lower and camelCase keys)
 * and sorts them in descending order by timestamp.
 * @param {Array} transactions - Raw list of transaction objects
 * @param {string|number} childId - Selected child ID to filter by
 * @returns {Array} Filtered and sorted transactions
 */
export function filterAndSortTransactions(transactions, childId) {
    if (!transactions || !childId) return [];
    return transactions
        .filter((t) => {
            const actualChildId = t.childid !== undefined ? t.childid : t.childId;
            return String(actualChildId).trim() === String(childId).trim();
        })
        .sort((a, b) => {
            return String(b.timestamp || "").localeCompare(String(a.timestamp || ""));
        });
}

/**
 * Applies active ledger filters (type, date range, and search text) to a transaction array.
 * @param {Array} transactions - The list to filter.
 * @param {Object} filterConfig - Object containing { type, startDate, endDate, text }.
 * @returns {Array} The filtered list.
 */
export function applyTransactionFilters(transactions, { type, startDate, endDate, text }) {
    let txs = [...transactions];

    if (type && type !== "all") {
        txs = txs.filter((t) => t.type === type);
    }
    if (startDate) {
        txs = txs.filter((t) => t.date >= startDate);
    }
    if (endDate) {
        txs = txs.filter((t) => t.date <= endDate);
    }
    if (text && text.trim()) {
        const search = text.toLowerCase();
        txs = txs.filter((t) => (t.what && t.what.toLowerCase().includes(search)) || (t.where && t.where.toLowerCase().includes(search)));
    }
    return txs;
}

/**
 * Generates an optimized list of unique suggestions based on transaction history.
 * Sorts by Frequency -> Recency -> Alphabetical.
 * @param {Array} transactions - Full transaction history.
 * @param {string} field - The property key to extract (e.g., 'what' or 'where').
 * @returns {Array} Top 5 candidates.
 */
export function generateUniqueList(transactions, field) {
    const primaryKey = String(field).trim();
    const currentHistory = transactions || [];
    if (currentHistory.length === 0) return [];

    const historyItems = currentHistory
        .map((t) => {
            const val = t[primaryKey] !== undefined ? t[primaryKey] : t[primaryKey.toLowerCase()];
            return String(val || "").trim();
        })
        .filter((val) => val && val !== "-");

    if (historyItems.length === 0) return [];

    const frequencyMap = {};
    const latestIndexMap = {};

    historyItems.forEach((item, index) => {
        frequencyMap[item] = (frequencyMap[item] || 0) + 1;
        if (latestIndexMap[item] === undefined) {
            latestIndexMap[item] = index;
        }
    });

    let uniqueItems = [...new Set(historyItems)];

    uniqueItems.sort((a, b) => {
        if (frequencyMap[b] !== frequencyMap[a]) {
            return frequencyMap[b] - frequencyMap[a];
        }
        if (latestIndexMap[a] !== latestIndexMap[b]) {
            return latestIndexMap[a] - latestIndexMap[b];
        }
        return a.localeCompare(b);
    });

    return uniqueItems.slice(0, 5);
}

export function getTodayString() {
    return new Date().toISOString().split("T")[0];
}

export function checkEnterKey(event, id) {
    if (event.key === "Enter") {
        event.preventDefault();
        const targetElement = document.getElementById(id);
        if (targetElement) {
            targetElement.click();
        }
    }
}

export function delayedFocus(id, delay = 300) {
  setTimeout(() => {
    const input = document.getElementById(id);
    if (input) input.focus();
  }, delay);
}
