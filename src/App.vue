<template>
  <div id="app">
        <div v-if="isDeviceUnauthorized" class="card auth-warning-card">
    <h4>🔒 Setup Required: Unauthorized Device</h4>
    <p>This phone cannot log entries or modify data yet. To activate administrator controls, add this fingerprint ID to your <code>authorized_devices</code> spreadsheet tab:</p>
    <div class="fingerprint-badge">
      <code>{{ deviceFingerprint }}</code>
    </div>
    </div>
    <div v-else>
    <!-- GLOBAL TOP NAV BAR -->
    <header class="app-header">
      <div class="nav-and-back-group">
        <!-- Back button dynamically placed to the left of Dashboard when on ledger screen -->
        <button 
          v-if="currentScreen === 'ledger'" 
          @click="currentScreen = 'dashboard'" 
          class="btn btn-back-nav"
        >
          ⬅ Back
        </button>
        
        <button @click="currentScreen = 'dashboard'" class="btn" :class="currentScreen === 'dashboard' ? 'btn-primary' : 'btn-secondary'">Dashboard</button>
        <button @click="currentScreen = 'addChildSettings'" class="btn" :class="currentScreen === 'addChildSettings' ? 'btn-primary' : 'btn-secondary'">+ Add Child</button>
        <button @click="currentScreen = 'addUserSettings'" class="btn" :class="currentScreen === 'addUserSettings' ? 'btn-primary' : 'btn-secondary'">+ Add User</button>
      </div>
      
      <div class="user-selector">
        <label for="global-user">User:</label>
        <select id="global-user" v-model="currentUser">
          <option v-for="user in users" :key="user" :value="user">{{ user }}</option>
        </select>
      </div>
    </header>

    <main class="app-container">

      <div v-if="isLoading" class="loading-overlay-indicator" style="background:#fef08a; padding:8px; font-weight:bold; text-align:center; border-radius:6px; margin-bottom:12px;">
      🔄 Processing & Syncing Spreadsheet Cloud Database Engine...
    </div>
      
      <!-- VIEW 1: ADD CHILD SCREEN -->
      <section v-if="currentScreen === 'addChildSettings'" class="screen single-column-screen">
        <div class="card structural-form">
          <h2>Create New Child Account</h2>
          <form @submit.prevent="handleCreateChild">
            <div class="form-vertical-group">
              <label for="new-name">Child's Name</label>
              <input id="new-name" v-model="childForm.name" type="text" placeholder="e.g. Liam" required />
            </div>
            <div class="form-vertical-group">
              <label for="new-start">Starting Balance (£)</label>
              <input id="new-start" v-model.number="childForm.startAmount" type="number" step="0.01" min="0" />
            </div>
            <div class="form-vertical-group">
              <label for="new-allowance">Weekly Allowance Amount (£)</label>
              <input id="new-allowance" v-model.number="childForm.weeklyAllowance" type="number" step="0.01" min="0" />
            </div>
            <button type="submit" class="btn btn-success block-btn">Save Child Account</button>
          </form>
        </div>
      </section>

      <!-- VIEW 2: ADD USER SCREEN -->
      <section v-if="currentScreen === 'addUserSettings'" class="screen single-column-screen">
        <div class="card structural-form">
          <h2>Add Authorized Parent/User</h2>
          <form @submit.prevent="handleCreateUser">
            <div class="form-vertical-group">
              <label for="new-user-name">Parent Name</label>
              <input id="new-user-name" v-model="newUserFormName" type="text" placeholder="e.g. Mum" required />
            </div>
            <button type="submit" class="btn btn-success block-btn">Register User</button>
          </form>
          
          <div class="user-list-display">
            <h3>Registered Users</h3>
            <ul class="deletable-list">
              <li v-for="user in users" :key="user">
                <span>{{ user }}</span>
                <button v-if="isUserDeletable(user)" @click="handleDeleteUser(user)" class="btn-delete-small" title="Delete User">Delete</button>
              </li>
            </ul>
          </div>
        </div>
      </section>



      <!-- VIEW 3: DASHBOARD (One Kid Per Row Layout) -->
      <section v-if="currentScreen === 'dashboard'" class="screen">
        <div class="card list-card">
          <h2>Children's Accounts</h2>
          <p v-if="children.length === 0" class="empty-state">No accounts created yet. Use the "+ Add Child" tab above.</p>
          
          <div v-else class="dashboard-rows-container">
            <div v-for="child in children" :key="child.id" class="child-row-layout">
              <div class="child-row-click-area" @click="navigateToLedger(child.id)">
                <div class="child-row-info">
                  <h3>{{ child.name }}</h3>
                  <span class="allowance-label">Allowance: {{ formatCurrency(child.weeklyAllowance) }}/wk</span>
                </div>
                <div class="child-row-balance" :class="calculateBalance(child.id) >= 0 ? 'pos-dark' : 'neg'">
                  {{ formatCurrency(calculateBalance(child.id)) }}
                </div>
              </div>
              <div class="child-row-actions">
                <button v-if="isChildDeletable(child.id)" @click="handleDeleteChild(child.id)" class="btn-delete-row" title="Delete Child Account">Delete Account</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 4: LEDGER / STATEMENT DETAILED VIEW -->
      <section v-if="currentScreen === 'ledger' && selectedChild" class="screen">
        <div class="ledger-header">
          <div class="child-summary">
            <h2>{{ selectedChild.name }}'s Statement</h2>
            <div class="balance-badge" :class="calculateBalance(selectedChild.id) >= 0 ? 'pos-dark' : 'neg'">
              <span>Balance</span>
              <strong>{{ formatCurrency(calculateBalance(selectedChild.id)) }}</strong>
            </div>
          </div>
        </div>

        <!-- Transaction Input Form -->
        <div class="card form-card">
          <h3>Log New Transaction</h3>
          <form @submit.prevent="handleCreateTransaction" class="inline-form">
            <div class="form-group">
              <label>Date</label>
              <input v-model="txForm.date" type="date" required />
            </div>
            
            <div class="form-group relative-position">
              <label>What (Description)</label>
              <div class="input-with-btn-layout">
                <input v-model="txForm.what" type="text" placeholder="e.g. Ice cream" required @blur="closeHelperDeferred" />
                <button type="button" @click="toggleHelper('what')" class="btn btn-assist" title="Show past descriptions">✨</button>
              </div>
              <div v-if="activeHelper === 'what' && dynamicSuggestionsWhat.length > 0" class="helper-dropdown">
                <ul>
                  <li v-for="item in dynamicSuggestionsWhat" :key="item" @mousedown.prevent="selectHelper('what', item)">{{ item }}</li>
                </ul>
              </div>
            </div>

            <div class="form-group relative-position">
              <label>Where (Optional)</label>
              <div class="input-with-btn-layout">
                <input v-model="txForm.where" type="text" placeholder="e.g. Corner Shop" @blur="closeHelperDeferred" />
                <button type="button" @click="toggleHelper('where')" class="btn btn-assist" title="Show past locations">✨</button>
              </div>
              <div v-if="activeHelper === 'where' && dynamicSuggestionsWhere.length > 0" class="helper-dropdown">
                <ul>
                  <li v-for="item in dynamicSuggestionsWhere" :key="item" @mousedown.prevent="selectHelper('where', item)">{{ item }}</li>
                </ul>
              </div>
            </div>

            <div class="form-group">
              <label>Type</label>
              <select v-model="txForm.type">
                <option value="withdrawal">Withdrawal (-)</option>
                <option value="deposit">Deposit (+)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Amount (£)</label>
              <input v-model.number="txForm.amount" type="number" step="0.01" min="0.01" required />
            </div>
            <button type="submit" class="btn btn-primary log-submit-btn">Log</button>
          </form>
        </div>

        <!-- Filter & History Container -->
        <div class="card list-card">
          
          <!-- DESKTOP FILTER ONLY (Hidden completely on mobile viewports) -->
          <div class="desktop-filter-container hide-on-mobile">
            <div class="filter-header-row">
              <h3>Transaction History</h3>
              <button @click="showMetaFields = !showMetaFields" class="btn btn-tiny">
                {{ showMetaFields ? 'Hide Audit Columns' : 'Expand Audit Columns' }}
              </button>
            </div>
            
            <div class="search-filter-grid">
              <div class="form-group">
                <label>Text Search</label>
                <input v-model="filterText" type="text" placeholder="Search..." />
              </div>
              <div class="form-group">
                <label>Start Date</label>
                <input v-model="filterStartDate" type="date" />
              </div>
              <div class="form-group">
                <label>End Date</label>
                <input v-model="filterEndDate" type="date" />
              </div>
              <div class="form-group">
                <label>Type</label>
                <select v-model="filterType">
                  <option value="all">All</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="deposit">Deposits</option>
                </select>
              </div>
            </div>
          </div>

          <!-- DESKTOP VIEW CONTAINER (Strictly hidden on mobile widths) -->
          <div class="desktop-ledger-view-wrapper hide-on-mobile">
            <div class="desktop-grid-header" :class="{ 'with-meta': showMetaFields }">
              <div>Date</div>
              <div>Description</div>
              <div>Where</div>
              <div class="text-right">Amount</div>
              <template v-if="showMetaFields">
                <div>Recorded By</div>
                <div>Fingerprint</div>
                <div>Timestamp</div>
              </template>
            </div>

            <div class="desktop-grid-body">
              <!-- Inline transaction list -->
              <div 
                v-for="tx in filteredTransactions" 
                :key="tx.id" 
                class="desktop-grid-row"
                :class="{ 
                  'editing-row': editingTxId === tx.id, 
                  'clickable-last-row': isLastTransaction(tx.id) 
                }"
                :style="showMetaFields ? 'grid-template-columns: 1.2fr 2fr 1.5fr 1.2fr 1.2fr 1.2fr 1.5fr' : 'grid-template-columns: 1.2fr 2fr 1.5fr 1.2fr'"
                @click="handleRowClick(tx)"
              >
                <!-- Row display logic / Form fields toggle during row selections -->
                <template v-if="editingTxId !== tx.id">
                  <div>{{ formatDate(tx.date) }}</div>
                  <div>{{ tx.what }}</div>
                  <div>{{ tx.where || '-' }}</div>
                  <div class="text-right" :class="tx.type === 'deposit' ? 'pos-dark-text' : 'neg-text'">
                    {{ tx.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                  </div>
                  <template v-if="showMetaFields">
                    <div class="meta-cell">{{ tx.recordedBy }}</div>
                    <div class="meta-cell mono">{{ tx.deviceFingerprint }}</div>
                    <div class="meta-cell mono">{{ tx.utcTimestamp }}</div>
                  </template>
                </template>

                <template v-else>
                  <div @click.stop><input v-model="editForm.date" type="date" class="table-input" /></div>
                  <div @click.stop><input v-model="editForm.what" type="text" class="table-input" /></div>
                  <div @click.stop><input v-model="editForm.where" type="text" class="table-input" /></div>
                  <div @click.stop class="table-amount-edit-wrap">
                    <select v-model="editForm.type" class="table-select">
                      <option value="withdrawal">(-)</option>
                      <option value="deposit">(+)</option>
                    </select>
                    <input v-model.number="editForm.amount" type="number" step="0.01" class="table-input amount-input-box" />
                  </div>
                  <template v-if="showMetaFields">
                    <div class="meta-cell">-</div><div class="meta-cell">-</div><div class="meta-cell">-</div>
                  </template>
                </template>
              </div>

              <!-- Pinned Save Action Bar for desktop rows editing state controls -->
              <div v-if="editingTxId" class="desktop-inline-edit-actions">
                <span>⚠️ Editing the last entry. Review numbers before updating history.</span>
                <div class="action-buttons-group">
                  <button @click="saveInlineEdit(editingTxId)" class="btn-save-inline">Save Update</button>
                  <button @click="cancelInlineEdit" class="btn-cancel-inline">Cancel</button>
                  <button @click="handleDeleteLastTransaction(editingTxId)" class="btn-delete-row" style="padding:4px 10px; font-size:0.85rem;">Delete Entirely</button>
                </div>
              </div>

              <!-- Pin Starting Balance cleanly to the absolute bottom of the list -->
              <div 
                class="desktop-grid-row initial-balance-row"
                :style="showMetaFields ? 'grid-template-columns: 1.2fr 2fr 1.5fr 1.2fr 1.2fr 1.2fr 1.5fr' : 'grid-template-columns: 1.2fr 2fr 1.5fr 1.2fr'"
              >
                <div>-</div>
                <div><strong>Starting Balance</strong></div>
                <div>-</div>
                <div class="text-right pos-dark-text">{{ formatCurrency(selectedChild.startAmount) }}</div>
                <template v-if="showMetaFields">
                  <div>-</div><div>-</div><div>-</div>
                </template>
              </div>
            </div>
          </div>

          <!-- NEW MOBILE STACKED VIEW (Strictly hidden on desktop widths) -->
          <div class="mobile-ledger-stack show-only-on-mobile">
            <div v-for="tx in baseFilteredTransactions" :key="tx.id" class="mobile-tx-card" :class="{ 'editing-row': editingTxId === tx.id }">
              
              <template v-if="editingTxId !== tx.id">
                <!-- Two Rows Layout Design Pattern Requirements -->
                <div class="mobile-tx-row-one" @click="handleRowClick(tx)">
                  <span class="mobile-tx-date">{{ formatDateMobile(tx.date) }}</span>
                  <span class="mobile-tx-amount" :class="tx.type === 'deposit' ? 'pos-dark-text' : 'neg-text'">
                    {{ tx.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                  </span>
                </div>
                <div class="mobile-tx-row-two" @click="handleRowClick(tx)">
                  <span class="mobile-tx-what">{{ tx.what }}</span>
                  <span v-if="tx.where" class="mobile-tx-where">📍 {{ tx.where }}</span>
                </div>
              </template>

              <!-- Custom Inline form panel if user selected mobile last row element -->
              <template v-else>
                <div class="mobile-edit-form-wrap">
                  <div class="form-vertical-group">
                    <label>Date</label>
                    <input v-model="editForm.date" type="date" class="table-input" />
                  </div>
                  <div class="form-vertical-group">
                    <label>What</label>
                    <input v-model="editForm.what" type="text" class="table-input" />
                  </div>
                  <div class="form-vertical-group">
                    <label>Where</label>
                    <input v-model="editForm.where" type="text" class="table-input" />
                  </div>
                  <div class="form-vertical-group">
                    <label>Type & Amount</label>
                    <div style="display:flex; gap:8px;">
                      <select v-model="editForm.type" class="table-select" style="flex:1;">
                        <option value="withdrawal">Withdrawal (-)</option>
                        <option value="deposit">Deposit (+)</option>
                      </select>
                      <input v-model.number="editForm.amount" type="number" step="0.01" class="table-input" style="flex:2;" />
                    </div>
                  </div>
                  <div class="mobile-edit-btn-actions">
                    <button @click="saveInlineEdit(tx.id)" class="btn-save-inline" style="flex:1; padding: 12px;">Save Changes</button>
                    <button @click="handleDeleteLastTransaction(tx.id)" class="btn-delete-inline-mobile" style="flex:1; padding:12px;">Delete Entry</button>
                    <button @click="cancelInlineEdit" class="btn-cancel-inline" style="padding: 12px;">X</button>
                  </div>
                </div>
              </template>
            </div>

            <!-- Mobile Pinned Baseline Balance Card -->
            <div class="mobile-tx-card initial-balance-row">
              <div class="mobile-tx-row-one">
                <span class="mobile-tx-date">Opening Account Milestone</span>
                <span class="mobile-tx-amount pos-dark-text">{{ formatCurrency(selectedChild.startAmount) }}</span>
              </div>
              <div class="mobile-tx-row-two">
                <span class="mobile-tx-what">🌱 Starting Balance</span>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  ></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// paste your Google App Script deployed endpoint web app URL here
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzg05Y22_KksejVZzQBeq0coDyFn4LvMAbKnsijv8x9LJqaUyCAL-AuK4kPOorm6S0P/exec';

const currentScreen = ref('dashboard');
const selectedChildId = ref(null);
const showMetaFields = ref(false);
const activeHelper = ref(null);
const isLoading = ref(true);

const users = ref(['Dad', 'Mum']);
const currentUser = ref('Dad');

const children = ref([]);
const transactions = ref([]);

const editingTxId = ref(null);
const editForm = ref({ date: '', what: '', where: '', type: 'withdrawal', amount: 0 });

const childForm = ref({ name: '', startAmount: 0, weeklyAllowance: 0 });
const newUserFormName = ref('');
const txForm = ref({ date: getTodayString(), what: '', where: '', type: 'withdrawal', amount: null });

const filterType = ref('all');
const filterText = ref('');
const filterStartDate = ref('');
const filterEndDate = ref('');

// --- DATA ACCESS LAYER ---
// Update your fetchSyncDatabase function to store it
async function fetchSyncDatabase() {
  isLoading.value = true;
  try {
    const cacheBusterUrl = `${SHEET_API_URL}?_cb=${Date.now()}`;
    const res = await fetch(cacheBusterUrl);
    const data = await res.json();
    
    // 1. Normalize Children Data to prevent NaN
    children.value = (data.children || []).map(child => {
      // Safely fall back to lowercase keys if Google changed the headers
      const startAmt = child.startAmount !== undefined ? child.startAmount : child.startamount;
      const allowance = child.weeklyAllowance !== undefined ? child.weeklyAllowance : child.weeklyallowance;
      
      return {
        id: String(child.id || ''),
        name: String(child.name || 'Unknown'),
        // Ensure strings are forced to clean floating numbers
        startAmount: isNaN(parseFloat(startAmt)) ? 0 : parseFloat(startAmt),
        weeklyAllowance: isNaN(parseFloat(allowance)) ? 0 : parseFloat(allowance)
      };
    });

    // 2. Normalize Transactions Data
    transactions.value = (data.transactions || []).map(tx => {
      const amt = tx.amount !== undefined ? tx.amount : tx.amount;
      return {
        id: String(tx.id || ''),
        childid: tx.childid !== undefined ? String(tx.childid) : String(tx.childId || ''),
        date: String(tx.date || ''),
        what: String(tx.what || ''),
        where: String(tx.where || ''),
        type: String(tx.type || 'withdrawal'),
        amount: isNaN(parseFloat(amt)) ? 0 : parseFloat(amt),
        recordedBy: String(tx.recordedby || tx.recordedBy || 'System')
      };
    });
    
    // 3. Normalize Authorized Devices
    authorizedDevices.value = (data.authorizedDevices || []).map(d => String(d).toLowerCase().trim());
    
    console.log("Normalized Database Clean Sync:", children.value, transactions.value);
  } catch (err) {
    console.error("Database initialization fault:", err);
  } finally {
    isLoading.value = false;
  }
}

// Add a reactive array to store the authorized fingerprints coming from the server
const authorizedDevices = ref([]);



// Check if this device fingerprint is missing from the authorized list
const isDeviceUnauthorized = computed(() => {
  return !authorizedDevices.value.includes(deviceFingerprint.value.toLowerCase().trim());
});


const deviceFingerprint = ref('fp-unknown');

onMounted(() => {
  let fp = localStorage.getItem('pocket_money_fingerprint');
  if (!fp) {
    fp = `fp-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('pocket_money_fingerprint', fp);
  }
  deviceFingerprint.value = fp;
  console.log("Your Device Authorization Fingerprint is:", fp); // Look here in your console to copy it!
  fetchSyncDatabase();
});

const selectedChild = computed(() => children.value.find(c => c.id === selectedChildId.value || String(c.id) === String(selectedChildId.value)));

// Ensure childId filtering converts everything to Strings so data types never clash
const baseFilteredTransactions = computed(() => {
  if (!selectedChildId.value) return [];
  return transactions.value
    .filter(t => {
      // Look for lowercase childid first, fallback to camelCase childId
      const actualChildId = t.childid !== undefined ? t.childid : t.childId;
      return String(actualChildId).trim() === String(selectedChildId.value).trim();
    })
    .sort((a, b) => {
      // Safe timestamp conversion fallback for sorting
      const timeA = a.id ? String(a.id).replace('tx_', '') : 0;
      const timeB = b.id ? String(b.id).replace('tx_', '') : 0;
      return String(timeB).localeCompare(String(timeA));
    });
});


const filteredTransactions = computed(() => {
  let txs = [...baseFilteredTransactions.value];
  if (filterType.value !== 'all') txs = txs.filter(t => t.type === filterType.value);
  if (filterStartDate.value) txs = txs.filter(t => t.date >= filterStartDate.value);
  if (filterEndDate.value) txs = txs.filter(t => t.date <= filterEndDate.value);
  
  if (filterText.value.trim()) {
    const search = filterText.value.toLowerCase();
    txs = txs.filter(t => t.what.toLowerCase().includes(search) || (t.where && t.where.toLowerCase().includes(search)));
  }
  return txs;
});

const dynamicSuggestionsWhat = computed(() => generateUniqueList('what', txForm.value.what));
const dynamicSuggestionsWhere = computed(() => generateUniqueList('where', txForm.value.where));

function generateUniqueList(field, currentInput) {
  const searchKey = String(field).toLowerCase().trim();
  
  // 1. Extract all raw values matching the field from history
  const historyItems = transactions.value
    .map(t => String(t[searchKey] || t[field] || '').trim())
    .filter(val => val && val !== '-');

  if (historyItems.length === 0) return [];

  // 2. Build metadata maps for tracking Frequency and Latest appearance
  const frequencyMap = {};
  const latestIndexMap = {}; // Since transactions are sorted, index tells us recency

  historyItems.forEach((item, index) => {
    // Frequency tracking
    frequencyMap[item] = (frequencyMap[item] || 0) + 1;
    
    // Recency tracking (first time we see it in the array is the most recent)
    if (latestIndexMap[item] === undefined) {
      latestIndexMap[item] = index;
    }
  });

  // 3. Get unique items and filter them by what the user is currently typing
  let uniqueItems = [...new Set(historyItems)];
  
  if (currentInput) {
    const search = currentInput.toLowerCase();
    uniqueItems = uniqueItems.filter(item => item.toLowerCase().includes(search));
  }

  // 4. Apply multi-tier sorting rules:
  //    Rule A: Most Used (Highest frequency count wins)
  //    Rule B: Latest Logged (Lowest index wins if counts tie)
  //    Rule C: Alphabetical (Standard fallback character comparison)
  uniqueItems.sort((a, b) => {
    // Sort Tier 1: Frequency (Most Used)
    if (frequencyMap[b] !== frequencyMap[a]) {
      return frequencyMap[b] - frequencyMap[a];
    }
    
    // Sort Tier 2: Recency (Latest)
    if (latestIndexMap[a] !== latestIndexMap[b]) {
      return latestIndexMap[a] - latestIndexMap[b]; 
    }
    
    // Sort Tier 3: Alphabetical Fallback
    return a.localeCompare(b);
  });

  // 5. Return the top 5 most optimal suggestions to keep the UI clean
  return uniqueItems.slice(0, 5);
}

function isChildDeletable(childId) {
  return !transactions.value.some(t => String(t.childId) === String(childId));
}

function isUserDeletable(userName) {
  return !transactions.value.some(t => t.recordedBy === userName) && users.value.length > 1;
}

function isLastTransaction(txId) {
  const childTx = baseFilteredTransactions.value;
  return childTx.length > 0 && childTx[0].id === txId;
}

function handleRowClick(tx) {
  if (isLastTransaction(tx.id)) {
    if (editingTxId.value === tx.id) return;
    editingTxId.value = tx.id;
    editForm.value = { ...tx };
  } else {
    alert("🔒 Audit Control Lock: adjustments are limited exclusively to the absolute newest ledger event.");
  }
}

// --- INJECT INTO CHILD CREATION ---
async function handleCreateChild() {
  const newChild = {
    action: "createChild",
    fingerprint: deviceFingerprint.value, // Pass validation tag
    id: 'c_' + Date.now(),
    name: childForm.value.name,
    startAmount: Number(childForm.value.startAmount) || 0,
    weeklyAllowance: Number(childForm.value.weeklyAllowance) || 0
  };
  
  isLoading.value = true;
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    body: JSON.stringify(newChild)
  });
  
  const statusCheck = await res.json();
  if (statusCheck.status === 'denied') {
    alert(statusCheck.message);
  } else {
    childForm.value = { name: '', startAmount: 0, weeklyAllowance: 0 };
  }
  
  await fetchSyncDatabase();
  currentScreen.value = 'dashboard';
}
async function handleCreateTransaction() {
  if (txForm.value.type === 'withdrawal' && txForm.value.amount > 200) {
    alert("Transaction Aborted: Expenditures cannot exceed £200.00.");
    return;
  }
  
  const newTx = {
    action: "createTransaction",
    fingerprint: deviceFingerprint.value, // Pass validation tag
    id: 'tx_' + Date.now(),
    childId: String(selectedChildId.value),
    date: txForm.value.date,
    what: txForm.value.what,
    where: txForm.value.where || '-',
    type: txForm.value.type,
    amount: Number(txForm.value.amount),
    recordedBy: currentUser.value
  };
  
  isLoading.value = true;
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    body: JSON.stringify(newTx)
  });
  
  const statusCheck = await res.json();
  if (statusCheck.status === 'denied') {
    alert(statusCheck.message);
  }
  
  txForm.value = { date: txForm.value.date, what: '', where: '', type: 'withdrawal', amount: null };
  await fetchSyncDatabase();
}

async function saveInlineEdit(txId) {
  const payload = {
    action: "editTransaction",
    fingerprint: deviceFingerprint.value, // Pass validation tag
    id: txId,
    date: editForm.value.date,
    what: editForm.value.what,
    where: editForm.value.where,
    type: editForm.value.type,
    amount: Number(editForm.value.amount),
    recordedBy: currentUser.value
  };
  
  isLoading.value = true;
  editingTxId.value = null;
  
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  
  const statusCheck = await res.json();
  if (statusCheck.status === 'denied') alert(statusCheck.message);
  
  await fetchSyncDatabase();
}

async function handleDeleteLastTransaction(txId) {
  if (confirm("Delete the last logged transaction?")) {
    isLoading.value = true;
    editingTxId.value = null;
    
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ 
        action: "deleteTransaction", 
        id: txId,
        fingerprint: deviceFingerprint.value // Pass validation tag
      })
    });
    
    const statusCheck = await res.json();
    if (statusCheck.status === 'denied') alert(statusCheck.message);
    
    await fetchSyncDatabase();
  }
}
function handleDeleteChild(id) {
  if (confirm("Are you sure you want to completely remove this child account?")) {
    children.value = children.value.filter(c => c.id !== id);
  }
}

function handleDeleteUser(userName) {
  users.value = users.value.filter(u => u !== userName);
  if (currentUser.value === userName) currentUser.value = users.value[0];
}

function handleCreateUser() {
  const nameClean = newUserFormName.value.trim();
  if (nameClean && !users.value.includes(nameClean)) users.value.push(nameClean);
  newUserFormName.value = '';
}

function cancelInlineEdit() { editingTxId.value = null; }
function getTodayString() { return new Date().toISOString().split('T')[0]; }
function navigateToLedger(childId) {
  selectedChildId.value = childId;
  txForm.value = { date: getTodayString(), what: '', where: '', type: 'withdrawal', amount: null };
  currentScreen.value = 'ledger';
}
function selectHelper(field, val) { txForm.value[field] = val; activeHelper.value = null; }

function toggleHelper(field) {
  if (activeHelper.value === field) {
    activeHelper.value = null; // Close if clicked again
  } else {
    activeHelper.value = field; // Open target assistant
  }
}

// Modify the old blur closer to look like this so it doesn't accidentally trigger early
function closeHelperDeferred() { 
  setTimeout(() => { activeHelper.value = null; }, 300); 
}

function calculateBalance(childId) {
  const child = children.value.find(c => String(c.id).trim() === String(childId).trim());
  if (!child) return 0;
  
  const startingVal = Number(child.startAmount || child.startamount || 0);
  
  const net = transactions.value
    .filter(t => {
      const actualChildId = t.childid !== undefined ? t.childid : t.childId;
      return String(actualChildId).trim() === String(childId).trim();
    })
    .reduce((sum, t) => {
      const amt = Number(t.amount || 0);
      return String(t.type).toLowerCase().trim() === 'deposit' ? sum + amt : sum - amt;
    }, 0);
    
  return startingVal + net;
}

function formatCurrency(v) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v); }
function formatDate(dStr) {
  if (!dStr) return '-';
  // If Google passes an ISO timestamp string, slice just the YYYY-MM-DD portion for clean parsing
  const cleanDateStr = dStr.includes('T') ? dStr.split('T')[0] : dStr;
  const [year, month, day] = cleanDateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateMobile(dStr) {
  if (!dStr) return '-';
  const cleanDateStr = dStr.includes('T') ? dStr.split('T')[0] : dStr;
  const [year, month, day] = cleanDateStr.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}
</script>

<style>
:root {
  --bg-color: #f8fafc;
  --card-bg: #ffffff;
  --text-main: #0f172a;
  --text-muted: #475569;
  --primary: #1e293b;
  --secondary: #e2e8f0;
  --success-dark: #1b4332;
  --danger-dark: #7a1c1c;
  --border-color: #cbd5e1;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  padding: 16px;
}

#app { max-width: 1200px; margin: 0 auto; }

/* THE HEADER BAR CONTAINER */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 20px;
  gap: 12px;
}

.nav-and-back-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-back-nav {
  background: #f1f5f9;
  border: 2px solid #94a3b8 !important;
  color: #334155 !important;
  transition: all 0.2s ease;
}
.btn-back-nav:hover {
  background: #cbd5e1;
}

.user-selector { display: flex; align-items: center; gap: 8px; font-weight: bold; }

.card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

/* SINGLE CARDS ROW PER CHILD */
.dashboard-rows-container { display: flex; flex-direction: column; gap: 12px; }
.child-row-layout { display: flex; background: white; border: 2px solid var(--border-color); border-radius: 12px; align-items: center; overflow: hidden; }
.child-row-click-area { display: flex; flex: 1; justify-content: space-between; align-items: center; padding: 20px; cursor: pointer; }
.child-row-click-area:hover { background: #f1f5f9; }
.child-row-info h3 { margin: 0 0 4px 0; font-size: 1.5rem; color: var(--text-main); }
.allowance-label { font-size: 0.9rem; color: var(--text-muted); }
.child-row-balance { font-size: 2.2rem; font-weight: 900; padding: 4px 12px; border-radius: 6px; }
.child-row-actions { padding-right: 20px; }

/* SHARED SYSTEM CONTROLS */
.btn { padding: 10px 16px; border: 1px solid transparent; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.95rem;}
.btn-primary { background: var(--primary); color: white; }
.btn-secondary { background: var(--secondary); color: var(--primary); }
.btn-success { background: var(--success-dark); color: white; }
.btn-delete-row { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; cursor: pointer; font-weight: 600;}
.btn-delete-small { padding: 2px 6px; font-size: 0.75rem; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 4px; cursor: pointer; }

.single-column-screen { max-width: 450px; margin: 0 auto; }
.form-vertical-group { display: flex; flex-direction: column; margin-bottom: 16px; }
.form-vertical-group label { margin-bottom: 6px; font-weight: bold; }
.form-vertical-group input { padding: 12px; font-size: 1rem; border: 1px solid var(--border-color); border-radius: 6px; }
.block-btn { width: 100%; padding: 12px; }
.deletable-list { list-style: none; padding: 0; }
.deletable-list li { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--secondary); align-items: center; }

.inline-form { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; flex: 1; min-width: 140px; }
.log-submit-btn { padding: 12px 24px; min-width: 100px; }
input, select { padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem; }

/* ROBUST CSS GRID DIRECT REPLACEMENT FOR TRADITIONAL HTML TABLES */
.desktop-ledger-view-wrapper {
  margin-top: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: white;
}
.desktop-grid-header {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1.5fr 1.2fr;
  background: #f1f5f9;
  padding: 12px;
  font-weight: bold;
  font-size: 0.95rem;
  border-bottom: 2px solid var(--border-color);
}
.desktop-grid-header.with-meta {
  grid-template-columns: 1.2fr 2fr 1.5fr 1.2fr 1.2fr 1.2fr 1.5fr;
}
.desktop-grid-row {
  display: grid;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  font-size: 0.95rem;
}
.desktop-grid-row:nth-child(even) { background: #f8fafc; }

/* Interactive feedback on the primary editable action row */
.clickable-last-row {
  cursor: pointer;
  position: relative;
}
.clickable-last-row:hover {
  background-color: #eff6ff !important;
}
.editing-row {
  background-color: #fffde7 !important;
  border: 2px solid #eab308 !important;
}

.desktop-inline-edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fef08a;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  font-size: 0.9rem;
}
.action-buttons-group { display: flex; gap: 6px; }

.table-input { padding: 6px; font-size: 0.9rem; border: 1px solid #eab308; border-radius: 4px; width: 100%; box-sizing: border-box; }
.table-select { padding: 6px; font-size: 0.9rem; border: 1px solid #eab308; border-radius: 4px; }
.table-amount-edit-wrap { display: flex; gap: 4px; justify-content: flex-end; }
.amount-input-box { width: 80px; }

.initial-balance-row { background: #fefcf0 !important; font-style: italic; color: var(--text-muted); }

.search-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px; }
.filter-header-row { display: flex; justify-content: space-between; align-items: center; }
.btn-tiny { padding: 6px 12px; font-size: 0.8rem; background: #e2e8f0; color: #334155; }

.meta-cell { font-size: 0.8rem; color: #64748b; word-break: break-all; }
.mono { font-family: monospace; }
.text-right { text-align: right; }

.pos-dark { color: var(--success-dark); background-color: #d1e7dd; font-weight: bold; }
.neg { color: var(--danger-dark); background-color: #f8d7da; font-weight: bold; }
.pos-dark-text { color: var(--success-dark); font-weight: bold; }
.neg-text { color: #b91c1c; font-weight: bold; }

.relative-position { position: relative; }
.helper-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border-color); border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; }
.helper-dropdown ul { list-style: none; padding: 0; margin: 0; }
.helper-dropdown li { padding: 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
.helper-dropdown li:hover { background: #f1f5f9; }

.empty-state { text-align: center; padding: 40px; color: var(--text-muted); }

/* CRISP DISPLAY ENGINE RULES */
.show-only-on-mobile { display: none !important; }
.hide-on-mobile { display: block !important; }
div.hide-on-mobile { display: block !important; }
.desktop-filter-container.hide-on-mobile { display: block !important; }


.auth-warning-card {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.auth-warning-card h4 {
  color: #c2410c;
  margin: 0 0 8px 0;
}
.auth-warning-card p {
  color: #7c2d12;
  font-size: 0.9rem;
  margin: 0 0 12px 0;
}
.fingerprint-badge {
  display: inline-block;
  background: #ffedd5;
  border: 1px solid #fdba74;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  color: #9a3412;
}

  .input-with-btn-layout {
  display: flex;
  align-items: center;
  gap: 4px;
}
.input-with-btn-layout input {
  flex: 1;
  min-width: 0; /* Prevents input blowout in small flex cells */
}
.btn-assist {
  background: #f1f5f9;
  border: 1px solid var(--border-color);
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s ease;
}
.btn-assist:hover {
  background: #e2e8f0;
}
/* --- TWO-ROW-PER-TRANSACTION MOBILE LAYOUT RULES --- */
@media (max-width: 600px) {
  .hide-on-mobile { display: none !important; }
  .show-only-on-mobile { display: flex !important; }
  div.show-only-on-mobile { display: flex !important; }

  /* Collapse Navigation Header into a robust block row stack */
  .app-header { flex-direction: column; align-items: stretch; gap: 8px; border-bottom: none; margin-bottom: 10px; }
  .nav-and-back-group { flex-direction: column; width: 100%; gap: 6px; }
  .nav-and-back-group .btn { width: 100%; padding: 12px; font-size: 1rem; text-align: center; }
  
  .user-selector { 
    width: 100%; 
    box-sizing: border-box; 
    justify-content: space-between; 
    padding: 10px; 
    background: white; 
    border: 1px solid var(--border-color); 
    border-radius: 6px; 
  }
  .user-selector select { width: 65%; }

  .child-row-layout { flex-direction: column; align-items: stretch; }
  .child-row-actions { padding: 0 16px 16px 16px; }
  .btn-delete-row { width: 100%; text-align: center; padding: 10px; }

  .inline-form { flex-direction: column; align-items: stretch; gap: 8px; }
  .form-group { width: 100%; }
  .log-submit-btn { width: 100%; }

  /* Mobile Stack List */
  .mobile-ledger-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  .mobile-tx-card {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mobile-tx-row-one {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .mobile-tx-date { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
  .mobile-tx-amount { font-size: 1.2rem; font-weight: 800; }

  .mobile-tx-row-two {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .mobile-tx-what { font-size: 1rem; font-weight: 600; color: var(--text-main); }
  .mobile-tx-where { font-size: 0.8rem; color: var(--text-muted); background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }

  .mobile-edit-form-wrap { display: flex; flex-direction: column; gap: 8px; }
  .mobile-edit-btn-actions { display: flex; gap: 6px; margin-top: 4px; }
  .btn-delete-inline-mobile { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; font-weight: bold; cursor: pointer; }
  .btn-save-inline { border-radius: 6px; }
  .btn-cancel-inline { border-radius: 6px; }

}
</style>