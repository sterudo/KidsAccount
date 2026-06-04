<template>
  <div v-if="isLoading" class="wait-scrim-overlay">
    <div class="scrim-spinner-box">
      <div class="scrim-spinner"></div>
      <p>Refreshing...</p>
    </div>
  </div>

  <h1 class="app-title"> 
    <button style="float:left;" v-if="currentScreen !== 'dashboard'" @click="backToDashboard"  class="btn btn-back-nav">⬅ Back</button> 
    Kids Accounts  <span style="font-size:12px">v1.12</span>
  </h1>

  <div id="app">
    <div v-if="isDeviceUnauthorized" class="card auth-warning-card">
      <h4>🔒 Authorizing this device ... please wait</h4>
      <p>If this message persists, please add this device's fingerprint ID to your <code>authorized_devices</code> spreadsheet tab:</p>
      <div class="fingerprint-badge">
        <code>{{ deviceFingerprint }}</code>
      </div>
    </div>

    <div v-else>
      <!-- GLOBAL TOP NAV BAR -->
      <header class="app-header">
    
        <div class="nav-and-back-group">
          <button @click="currentScreen = 'addChildSettings'" class="dbb btn" :class="currentScreen === 'addChildSettings' ? 'btn-primary' : 'btn-secondary'">+ Add Child</button>
          <button @click="currentScreen = 'addUserSettings'" class="dbb btn" :class="currentScreen === 'addUserSettings' ? 'btn-primary' : 'btn-secondary'">+ Add User</button>
        </div>
      
        <div class="user-selector-and-refresh-group">

          <button type="button" @click="fetchSyncDatabase" class="btn btn-refresh-sync" :disabled="isLoading">
            {{ isLoading ? '⏳ Loading' : '🔄 Refresh' }}
          </button>
  

          <div class="user-selector">
            <label for="global-user">User:</label>
            <select id="global-user" v-model="currentUser" @change="saveUserPreference" style="padding:3px !important;color:silver;">
              <option v-for="user in users" :key="user" :value="user">{{ user }}</option>
            </select>
          </div>
        </div>

        <div  v-if="currentScreen === 'ledger' && selectedChild"  class="ledger-header">
            <div class="child-summary">
                <img :src="(selectedChild.name == 'Eve') ? 'eve250.png' : 'jason250.png'" width="60" height="60" class="rowimg"/>
                <div 
                  :style="(selectedChild.name == 'Eve') ? ' border-bottom: 2px solid #ff4ca5 !important;' : 'border-bottom: 2px solid #01a4ad !important;'"
                    class="balance-badge" :class="calculateBalance(selectedChild.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">
                  
                  <span class="childsName"  :class="(selectedChild.name == 'Eve') ? 'girl': 'boy-dark'">{{ selectedChild.name }}</span>           
                  <span class="balancelabel">Balance</span>
                  <span class="currency" style="font-size:32px;  "> £</span>              
                  <strong style="font-size:32px;text-shadow: white -1px -1px 1px, black 1px 1px 2px;">{{ calculateBalance(selectedChild.id).toFixed(2) }}</strong>
                </div>    
            </div>  
        </div>

       </header>

      <main class="app-container">

        <div v-if="isLoading" class="loading-overlay-indicator">
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
        <section v-if="currentScreen === 'dashboard'" class="screen" style="margin-top: 20px;">
          <div class="card list-card">
            <h2>Children's Accounts</h2>
            <p v-if="children.length === 0" class="empty-state">No accounts created yet. Use the "+ Add Child" tab above.</p>
            
            <div v-else class="dashboard-rows-container">
              <div v-for="child in children" :key="child.id" class="child-row-layout">
                <div class="child-row-click-area" @click="navigateToLedger(child.id)">
                 
                  <img :src="(child.name == 'Eve') ? 'eve250.png' : 'jason250.png'" class="child-avatar" width="60" height="60" style="flex-basis:1;margin-right:10px;" />
                  <div class="child-row-info" style="flex-basis: 100%;  text-align: left;">                    
                    <h3 :class="(child.name == 'Eve') ? 'girl': 'boy'">{{ child.name }} </h3>
                    <span class="allowance-label" style="text-align:left;"><span style="font-size: 12px;" class="allowance-label-text">Allowance:</span> {{ formatCurrency(child.weeklyAllowance) }}/wk</span>
                  </div>
                  <div class="child-row-balance" :class="calculateBalance(child.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">
                    {{ formatCurrency(calculateBalance(child.id)) }}
                  </div>
                </div>
                <div class="child-row-actions" v-if="currentUser === 'Dad'">
                  <button 
                    v-if="isChildDeletable(child.id)" 
                    @click="handleDeleteChild(child.id)" 
                    class="btn-delete-row" 
                    title="Delete Child Account">Delete</button>
                </div>
              </div>
            </div>
          </div>
           <div class="voice-modal-card" @click.stop>
  
    <div class="voice-blueprint-box">
      <p class="blueprint-title">🗣️ Spoken Sentence Guide:</p>
      <code class="blueprint-syntax">
        <b style="color:red">Remove</b> <b style="color:white">X.Y</b> from <b style="color:yellow">child</b><br class="xbreak"> 
        for a <b style="color:cyan">what</b> from <b  style="color:orange">place</b>        
        <button  style="display: inline-block; margin-left: 8px;font-size: 10px;border:1px solid silver;border-radius:3px"  type="button" @click="toggleExamples">{{ showExamples ? 'Hide Examples' : 'Show Examples' }}</button>
      </code>
      <p class="blueprint-example" v-if="showExamples">
        <p style="margin-bottom: 12px"><b style="color:lime">Add</b> <b style="color:white">X.Y</b> to <b style="color:yellow">child</b> for a <b style="color:cyan">what</b></p>
        <em style="font-size:0.9em">"<b style="color:#f66">Remove</b> <b style="color:white">20 point 99</b> from <b style="color:yellow">Jason</b> for a <b style="color:cyan">Plushie</b> from <b style="color:orange">Sainsburys</b>"</em><br>
        <em style="font-size:0.9em">"<b style="color:lime">Add</b> <b style="color:white">10 Pounds</b> to <b style="color:yellow">Evie</b> as a <b style="color:cyan">Gift</b>"</em>
      </p>
    </div>

    <div class="voice-status-container">
      <div v-if="isListening" class="pulse-ring"></div>
      <p class="action-hint-text">
  {{ isListening ? 'Tap once to STOP' : 'Tap once,' }}
  <p style="font-weight: normal;">
  {{ isListening ? '' : ' speak clearly, ' }}
  </p>
    <p style="font-weight: bold;">
  {{ isListening ? '' : 'then tap stop' }}
   
  </p>
</p>

      <button 
      type="button"
      @click="toggleVoiceCapture" 
      class="btn-mic-action"
      :class="{ 'recording': isListening }"
    >
      {{ isListening ? '🛑' : '🎤' }}
    </button>


     
    </div>

    <div v-if="voiceTranscript" class="voice-transcript-review">
      <strong>Heard Text:</strong> "{{ voiceTranscript }}"
    </div>
  </div>
        </section>

        <!-- VIEW 4: LEDGER / STATEMENT DETAILED VIEW -->
        <section v-if="currentScreen === 'ledger' && selectedChild" class="screen">
       
          <!-- Transaction Input Form -->
          <div class="card form-card">
            <h3>Log New Transaction</h3>
            <form @submit.prevent="handleCreateTransaction" class="inline-form">
              <div class="form-group">
                <label for="tx-date">Date</label>
                <input id="tx-date" v-model="txForm.date" type="date" required style="width: 120px"/>
              </div>

              <div class="form-group">
                <label for="tx-type">Type</label>
                <select id="tx-type" v-model="txForm.type" style="max-width:150px;">
                  <option value="withdrawal">Withdrawal (-)</option>
                  <option value="deposit">Deposit (+)</option>
                </select>
              </div>
                        
              <div class="form-group relative-position" style="grid-column: 1 / 3">
                <label for="tx-what">What (Description)</label>
                <div class="input-with-btn-layout">
                  <input 
                    v-model="txForm.what" 
                    type="text" 
                    placeholder="e.g. Ice cream" 
                    required 
                    @focus="activeHelper = 'what'"
                    @blur="closeHelperDeferred"   />
                  <button type="button" @click.prevent.stop="activeHelper = 'what'" class="btn btn-assist" title="Show past descriptions">✨</button>
                </div>
                <div v-if="activeHelper === 'what' && dynamicSuggestionsWhat.length > 0" class="helper-dropdown">
                  <ul>
                    <li v-for="item in dynamicSuggestionsWhat" :key="item" @mousedown.prevent="selectHelper('what', item)">{{ item }}</li>
                  </ul>
                </div>
              </div>

              <div class="form-group relative-position" style="grid-column: 1 / 3">
                <label for="tx-where">Where (Optional)</label>
                <div class="input-with-btn-layout">
                  <input 
                    id="tx-where"
                    v-model="txForm.where" 
                    type="text" 
                    placeholder="e.g. Corner Shop" 
                    @focus="activeHelper = 'where'"
                    @blur="closeHelperDeferred"  />
                  <button type="button" @click.prevent.stop="activeHelper = 'where'" class="btn btn-assist" title="Show past locations">✨</button>
                </div>
                <div v-if="activeHelper === 'where' && dynamicSuggestionsWhere.length > 0" class="helper-dropdown">
                  <ul>
                    <li v-for="item in dynamicSuggestionsWhere" :key="item" @mousedown.prevent="selectHelper('where', item)">{{ item }}</li>
                  </ul>
                </div>
              </div>

         
              <div class="form-group">
                <label for="tx-amount">Amount (£)</label>
                <input id="tx-amount" v-model.number="txForm.amount" style="font-size:32px;height:55px;box-sizing: border-box;" type="number" step="0.01" min="0.01" required />
              </div>
              <button type="submit " class="btn btn-primary log-submit-btn  " :class="{ 'Deposit': txForm.type === 'deposit', 'Withdraw': txForm.type === 'withdrawal' }"
              style="font-size:24px;height:55px;box-sizing: border-box;display: flex !important;  place-content: center;  text-shadow: 1px 1px 3px black;" >{{ txForm.type === 'deposit' ? 'Deposit'  : 'Withdraw' }}</button>
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
                  <label for="filter-text">Text Search</label>
                  <input id="filter-text" v-model="filterText" type="text" placeholder="Search..." />
                </div>
                <div class="form-group">
                  <label for="filter-start-date">Start Date</label>
                  <input id="filter-start-date" v-model="filterStartDate" type="date" />
                </div>
                <div class="form-group">
                  <label for="filter-end-date">End Date</label>
                  <input id="filter-end-date" v-model="filterEndDate" type="date" />
                </div>
                <div class="form-group">
                  <label for="filter-type">Type</label>
                  <select id="filter-type" v-model="filterType">
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
                <div  class="text-left">Date</div>
                <div class="text-left">Description</div>
                <div class="text-left where">Where</div>
                <div class="text-right">Amount</div>
                <template v-if="showMetaFields">
                  <div class="text-left">Recorded By</div>
                  <div class="text-left">Fingerprint</div>
                  <div class="text-left">Timestamp</div>
                </template>
              </div>

              <div class="desktop-grid-body">
                <div v-if="editingTxId" class="desktop-inline-edit-actions">
                  <span>⚠️ Review numbers.</span>
                  <div class="action-buttons-group">
                    <button @click="saveInlineEdit(editingTxId)" class="btn-save-inline"  style="padding:4px 10px; font-size:0.85rem;border: 2px solid green;">Save</button>
                    <button @click="cancelInlineEdit" class="btn-cancel-inline"  style="padding:4px 10px; font-size:0.85rem;border: 2px solid gray;">Cancel</button>
                    <button @click="handleDeleteLastTransaction(editingTxId)" class="btn-delete-row" style="padding:4px 10px; font-size:0.85rem;">Delete Entirely</button>
                  </div>
                </div>
           
              <!-- Inline transaction list -->
                <div 
                  v-for="tx in filteredTransactions" 
                  :key="tx.id" 
                  class="desktop-grid-row"
                  :class="{ 
                    'editing-row': editingTxId === tx.id, 
                    'clickable-last-row': isLastTransaction(tx.id) 
                  }"
                  :style="showMetaFields ? 'grid-template-columns:100px 1fr 1fr 90px 130px 120px 120px' : 'grid-template-columns: 100px 1fr 1fr 90px'"
                  @click="handleRowClick(tx)" >
                  <!-- Pinned Save Action Bar for desktop rows editing state controls -->
            
                  <!-- Row display logic / Form fields toggle during row selections -->
                  <template v-if="editingTxId !== tx.id">
                    <div class="text-left">{{ formatDate(tx.date) }}</div>
                    <div class="text-left">{{ tx.what }}</div>
                    <div class="text-left where">{{ tx.where || '-' }}</div>
                    <div class="text-right" :class="tx.type === 'deposit' ? 'pos-dark-text' : 'neg-text'">
                      {{ tx.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                    </div>
                    <template v-if="showMetaFields">
                      <div class="meta-cell text-left ">{{ tx.recordedBy }}</div>
                      <div class="meta-cell mono text-left">{{ tx.deviceFingerprint }}</div>
                      <div class="meta-cell mono text-left">{{ formatTimestamp(tx.utcTimestamp) }}</div>
                    </template>
                  </template>

                  <template v-else>
                    <label>Date</label>
                    <label>Desciption</label>
                    <label>Where</label>
                    <label>Amount (£)</label>
                    <div @click.stop><input v-model="editForm.date" type="date" class="table-input" /></div>
                    <div @click.stop><input v-model="editForm.what" type="text" class="table-input" /></div>
                    <div @click.stop ><input v-model="editForm.where" type="text" class="table-input" /></div>
                    <div @click.stop class="table-amount-edit-wrap" style="justify-content: flex-start;">
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

              <!-- Pin Starting Balance cleanly to the absolute bottom of the list -->
              <div 
                class="desktop-grid-row initial-balance-row"
                :style="showMetaFields ? 'grid-template-columns:100px 1fr 1fr 90px 130px 120px 120px' : 'grid-template-columns: 100px 1fr 1fr 90px'" >
                <div>-</div>
                <div><strong>Starting Balance</strong></div>
                <div class="where">-</div>
                <div class="text-right pos-dark-text">{{ formatCurrency(selectedChild.startAmount) }}</div>
                <template v-if="showMetaFields">
                  <div>-</div><div>-</div><div>-</div>
                </template>
              </div>
            </div>
            </div>

          </div>
        </section>
      </main>

    </div>
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
const lastSyncTime = ref(0); 
// Voice State Controls
const isVoiceModalOpen = ref(false);
const isListening = ref(false);
const voiceTranscript = ref('');
const showExamples = ref((window.localStorage.getItem('showExamples') ?  ((window.localStorage.getItem('showExamples') === 'show') ? true : false) : true) );
const cloudGeminiApiKey = ref('');
let recognition = null;

function toggleVoiceCapture() {
  if (!recognition) {
    alert("Speech recognition is not natively supported on this device profile.");
    return;
  }

  if (isListening.value) {
    // 🛑 STOP CAPTURING: Gently tells iOS to finish compiling the audio
    isListening.value = false;
    try {
      recognition.stop(); 
      console.log("iOS Safety: Manually finalized audio capture.");
    } catch (err) {
      console.error("Failed closing session gracefully:", err);
    }
  } else {
    // 🎤 START CAPTURING
    voiceTranscript.value = '';
    isListening.value = true;
    
    try {
      recognition.start();
      console.log("iOS Safety: Audio capture stream opened successfully.");
    } catch (e) {
      console.error("iOS Recognition startup fault:", e);
      // Safety release: clears any zombie instances hung up by previous hold-lifts
      recognition.abort();
      setTimeout(() => { recognition.start(); }, 250);
    }
  }
}

function toggleExamples() {
  showExamples.value = !showExamples.value;
  window.localStorage.setItem('showExamples', (showExamples.value ? 'show' : 'hide'));
} 

function closeVoiceModal() {
  if (isListening.value && recognition) recognition.stop();
  isVoiceModalOpen.value = false;
  voiceTranscript.value = '';
}

// Instantiate Native Browser Web Speech Engine
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-GB'; // Tuned specifically for UK phrasing (Pounds/Pence)

 recognition.onresult = async (event) => {
    // Pulls the text block natively recorded by WebKit
    const transcript = event.results[0][0].transcript;
    console.log("Speech captured successfully:", transcript);
    
    if (transcript.trim().length > 0) {
      // Send it off to gemini-2.5-flash
      await parseStructuralTranscriptWithAI(transcript);
    } else {
      alert("No speech text detected. Please speak closer to your microphone phone node.");
    }
  };

  // Prevent iOS Safari from prematurely timing out while you pause between words
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onerror = (err) => {
    console.error("Speech Engine Error:", err);
    isListening.value = false;
  };

  recognition.onend = () => {
    isListening.value = false;
  };
}


// 🧠 THE STRUCTURED AI PARSING PIPELINE
async function parseStructuralTranscriptWithAI(text) {
  // Check if the key has been synchronized yet
  if (!cloudGeminiApiKey.value) {
    alert("Voice Engine Error: Gemini API key has not synchronized from the spreadsheet config yet.");
    return;
  }
  isLoading.value = true; // Engage your app's global cloud loading scrimmage overlay
  
  // Replace this placeholder string with your real Google Gemini API Key
// 🌟 DYNAMIC TRANSITION: Read directly from the secure memory state
  const GEMINI_API_KEY = cloudGeminiApiKey.value;   
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Map known children dynamically so the model matches explicit internal IDs instantly
  const childMappingContext = children.value.map(c => `name: "${c.name}", id: "${c.id}"`).join(' | ');

  const strictPrompt = `
    You are a precise data parsing microservice for a family pocket money app.
    The user is dictating a transaction following this structural syntax:
    "[remove/add] x point y [from /to] [child] for a [what] from [place]"

    Analyze this raw input text captured from speech-to-text: "${text}"

    Your task is to extract the details into a valid JSON object matching these exact keys:
    1. "actionType": Must be exactly "withdrawal" (if text says "remove") or "deposit" (if text says "add" or "at").
    2. "amount": A strict floating-point calculated number matching the combined "x point y" structure. For example, if input is "20 point 99", output must be 20.99.
    2.a it is also acceptable if the user just says a simple decimal number like "20.99" without the "point" keyword, in which case you should parse it directly as a float.
    2.b or say "20 pounds 99 pence" and you should also parse that correctly as 20.99.
    3. "targetChildId": Match the mentioned [child] to one of these valid registered records: [ ${childMappingContext} ]. "Evie" is Eve. Output the exact string ID. If no match is found, use an empty string "".
    4. "what": The description corresponding to the "for a [what]" segment. Clean up capitalization.
    5. "where": The location or store corresponding to the "from [place]" segment. Clean up capitalization.

    CRITICAL RULES:
    - Respond with ONLY the raw JSON string block. No markdown markers (\`\`\`json), no wrap code accents, no conversational text.
    - If speech errors cause small word modifications (e.g., "Sainsbury's" heard as "Sainsburys" or "Sanbries"), use contextual logic to fix the spelling of the location or what item cleanly.
  `;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: strictPrompt }] }]
      })
    });

    const responseData = await response.json();    
    const cleanJsonString = responseData.candidates[0].content.parts[0].text.trim();
    
    // Process extracted payload values safely
    const result = JSON.parse(cleanJsonString);
    
    // 🌟 SYNC PARSED DATA TO NATIVE VUE FORM FORMULAS
    if (result.targetChildId) {
      selectedChildId.value = result.targetChildId;
      
      // Auto-populate the specific log form object parameters
      txForm.value.type = result.actionType || 'withdrawal';
      txForm.value.amount = result.amount || 0;
      txForm.value.what = result.what || '';
      txForm.value.where = result.where || '';
      
      // Navigate cleanly straight into the ledger form view so the user can review it
      currentScreen.value = 'ledger';
      isVoiceModalOpen.value = false; // Hide modal on complete parsing success
    } else {
      alert("AI was unable to distinctly identify which child this transaction belonged to. Please adjust manually.");
    }

  } catch (error) {
    console.error("AI Dictation Parser Failure:", error);
    alert("Parsing Error: Could not cleanly break down spoken template values. Please enter manually.");
  } finally {
    isLoading.value = false; // Clear loading scrim indicator
  }
}

async function fetchSyncDatabase() {
  if(isListening.value) return;
  isLoading.value = true;
  try {
    const response = await fetch(`${SHEET_API_URL}?action=getInitialData`);
    const data = await response.json();
    
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
        recordedBy: String(tx.recordedby || tx.recordedBy || 'System'),
        // 🌟 MATCHING THE HTML TARGET VARIABLES EXPLICITLY:
        deviceFingerprint: String(tx.device || tx.devicefingerprint || '-'),
        utcTimestamp: String(tx.timestamp || tx.utctimestamp || '-')
      };
    });
    
    // 3. Normalize Authorized Devices
    authorizedDevices.value = (data.authorizedDevices || []).map(d => String(d).toLowerCase().trim());

    
    
    console.log("Normalized Database Clean Sync:", children.value, transactions.value);
    // 🌟 NEW: Capture the API key passed down securely from your Sheet configuration
    if (data.geminiApiKey) {
      cloudGeminiApiKey.value = data.geminiApiKey;
    }

    lastSyncTime.value = Date.now();
  } catch (err) {
    console.error("Failed to sync database:", err);
  } finally {
    isLoading.value = false;
  }
}

// Add a reactive array to store the authorized fingerprints coming from the server
const authorizedDevices = ref([]);

function backToDashboard() {
  selectedChildId.value = null;
  currentScreen.value = 'dashboard';
  window.scrollTo(0,0);
}

function formatTimestamp(tsStr) {
  if (!tsStr || tsStr === '-') return '-';
  // Formats '2026-06-02T19:45:00.000Z' to '02/06 19:45'
  try {
    const dateObj = new Date(tsStr);
    if (isNaN(dateObj.getTime())) return tsStr; // Fallback if string is different
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  } catch (e) {
    return tsStr;
  }
}

// Check if this device fingerprint is missing from the authorized list
const isDeviceUnauthorized = computed(() => {
  return !authorizedDevices.value.includes(deviceFingerprint.value.toLowerCase().trim());
});


const deviceFingerprint = ref('fp-unknown');

// --- 1. USER PERSISTENCE LIFECYCLES ---
function saveUserPreference() {
  localStorage.setItem('pocket_money_active_user', currentUser.value);
}

onMounted(() => {
  // Device fingerprint verification logic
  let fp = localStorage.getItem('pocket_money_fingerprint');
  if (!fp) {
    fp = `fp-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('pocket_money_fingerprint', fp);
  }
  deviceFingerprint.value = fp;
  console.log("Your Device Authorization Fingerprint is:", fp);
  
  // 🌟 ENHANCEMENT 1: Recall saved user preference from localstorage
  const savedUser = localStorage.getItem('pocket_money_active_user');
  if (savedUser && users.value.includes(savedUser)) {
    currentUser.value = savedUser;
  } else {
    currentUser.value = 'Dad'; // Default fallback
  }

  // Initial cloud synchronization
  fetchSyncDatabase();
// Helper function to check if 1 minute (60,000ms) has passed since the last sync
  function triggerThrottledRefresh() {
    const fiveMinutes = 5 * 60 * 1000;
    const timeSinceLastSync = Date.now() - lastSyncTime.value;

    if (timeSinceLastSync >= fiveMinutes) {
      console.log(`Throttled sync allowed: ${Math.round(timeSinceLastSync / 1000)}s since last update.`);
      fetchSyncDatabase();
    } else {
      console.log(`Throttled sync blocked: Only ${Math.round(timeSinceLastSync / 1000)}s ago. Must wait 5 minutes.`);
    }
  }
  // 🌟 ENHANCEMENT 2 & 3: Automatic updates when app is opened or brought to foreground
  // Captures when a user clicks the desktop icon or returns to the browser tab/app instance
  // 🌟 ENHANCEMENT: Automated updates only when throttle threshold passes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerThrottledRefresh();
    }
  });

  window.addEventListener('focus', () => {
    triggerThrottledRefresh();
  });
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
// 🌟 FIX: Access transactions.value directly inside the computed wrapper to force Vue dependency tracking
const dynamicSuggestionsWhat = computed(() => {
  if (!transactions.value || transactions.value.length === 0) return [];
  return generateUniqueList('what', txForm.value.what);
});

const dynamicSuggestionsWhere = computed(() => {
  if (!transactions.value || transactions.value.length === 0) return [];
  return generateUniqueList('where', txForm.value.where);
});

function generateUniqueList(field, currentInput) {
  const primaryKey = String(field).trim(); // e.g., 'what' or 'where'
  
  // 1. Reference array directly inside execution block 
  const currentHistory = transactions.value || [];
  if (currentHistory.length === 0) return [];

  // 2. Map history values safely by looking up both camelCase and lowercase variants
  const historyItems = currentHistory
    .map(t => {
      const val = t[primaryKey] !== undefined ? t[primaryKey] : t[primaryKey.toLowerCase()];
      return String(val || '').trim();
    })
    .filter(val => val && val !== '-');

  if (historyItems.length === 0) return [];

  // 3. Build explicit frequency and recency calculation maps
  const frequencyMap = {};
  const latestIndexMap = {}; 

  historyItems.forEach((item, index) => {
    frequencyMap[item] = (frequencyMap[item] || 0) + 1;
    if (latestIndexMap[item] === undefined) {
      latestIndexMap[item] = index;
    }
  });

  // 4. De-duplicate unique history suggestions
  let uniqueItems = [...new Set(historyItems)];
  
  // 5. Narrow down the list based on what the user is currently typing
  if (currentInput) {
    const search = String(currentInput).toLowerCase().trim();
    uniqueItems = uniqueItems.filter(item => item.toLowerCase().includes(search));
  }

  // 6. Apply multi-tier sorting parameters (Frequency -> Recency -> Alphabetical)
  uniqueItems.sort((a, b) => {
    if (frequencyMap[b] !== frequencyMap[a]) {
      return frequencyMap[b] - frequencyMap[a]; // Most frequently used items win
    }
    if (latestIndexMap[a] !== latestIndexMap[b]) {
      return latestIndexMap[a] - latestIndexMap[b]; // Most recently logged items win
    }
    return a.localeCompare(b);
  });

  // 7. Return top 5 optimized candidates
  return uniqueItems.slice(0, 5);
}

function childHasTransactions(childId) {
  // Safe array evaluation checking the lowercase key
  return transactions.value.some(tx => String(tx.childid).trim() === String(childId).trim());
}

function isChildDeletable(childId) {
  return !childHasTransactions(childId);
}

function isUserDeletable(userName) {
  return !transactions?.value?.some(t => t.recordedBy === userName) && users?.value?.length > 1;
}

function isLastTransaction(txId) {
  const childTx = baseFilteredTransactions.value;
  return childTx.length > 0 && childTx[0].id === txId;
}

function handleRowClick(tx) {
  if (isLastTransaction(tx.id)) {
    if (editingTxId.value === tx.id) return;
    
    // 🌟 CLEANUP DATE TIMESTAMP: Strip any time segment so HTML5 <input type="date"> works perfectly
    let cleanDate = String(tx.date || '').trim();
    if (cleanDate.includes('T')) cleanDate = cleanDate.split('T')[0];
    if (cleanDate.includes(' ')) cleanDate = cleanDate.split(' ')[0];
    
    editingTxId.value = tx.id;
    
    // Hydrate the form tracking state explicitly
    editForm.value = { 
      ...tx,
      date: cleanDate,
      childid: String(tx.childid || tx.childId || '').trim()
    };
  } else {
    alert("🔒 Audit Control Lock: adjustments are limited exclusively to the absolute newest ledger event.");
  }
}

async function saveInlineEdit(txId) {
  if (!editForm.value.what.trim()) {
    alert("Description cannot be empty.");
    return;
  }

  // 🌟 DEFENSIVE PAYLOAD: Ensure EVERY field is explicitly compiled and string-cast
  const payload = {
    action: "editTransaction",
    fingerprint: deviceFingerprint.value, 
    id: String(txId).trim(),
    childId: String(editForm.value.childid || editForm.value.childId || selectedChildId.value).trim(),
    date: editForm.value.date,
    what: editForm.value.what.trim(),
    where: editForm.value.where ? editForm.value.where.trim() : '-',
    type: String(editForm.value.type).toLowerCase().trim(),
    amount: Number(editForm.value.amount),
    recordedBy: currentUser.value
  };
  
  isLoading.value = true;
  editingTxId.value = null;
  
  try {
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Bypass CORS preflight issues smoothly
      body: JSON.stringify(payload)
    });
    
    const statusCheck = await res.json();
    if (statusCheck.status === 'denied') {
      alert(statusCheck.message);
    }
  } catch (err) {
    console.error("Failed to update transaction:", err);
    alert("Network Error: Could not save your modification to Google Sheets.");
  } finally {
    // Refresh to get accurate re-calculated totals
    await fetchSyncDatabase();
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

async function handleDeleteLastTransaction(txId) {
  if (confirm("Delete the last logged transaction entirely from history?")) {
    isLoading.value = true;
    editingTxId.value = null;
    
    try {
      const res = await fetch(SHEET_API_URL, {
        method: "POST",
        body: JSON.stringify({ 
          action: "deleteTransaction", 
          id: String(txId),                    // Maps to params.id in Apps Script
          fingerprint: deviceFingerprint.value // Passes the safety gate check
        })
      });
      
      const statusCheck = await res.json();
      if (statusCheck.status === 'denied') alert(statusCheck.message);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
    
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
  window.scrollTo(0,0);
}

function selectHelper(field, val) { 
  txForm.value[field] = val; 
  // Force active helper state to close completely on click selection
  activeHelper.value = null; 
}

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
  --primary: navy;
  --secondary: #e2e8f0;
  --success-dark:#25f578;;
  --danger-dark: #e44242;
  --border-color: #cbd5e1;
}
:root {
  --bg-color: #0f172a;       /* Deep slate background */
  --card-bg: #1e293b;        /* Lighter slate for cards to pop against the background */
  --text-main: #f8fafc;      /* Crisp, off-white for primary text readable on dark rows */
  --text-muted: #94a3b8;     /* Soft grey-blue for secondary text or helper labels */
  --primary: #38bdf8;        /* Swapped dark 'navy' for a vibrant electric sky blue */
  --secondary: #334155;      /* Dark slate wrapper for subtle buttons/background tabs */
   --success-dark:#048838;
  --danger-dark: #e44242;
  --border-color: #334155;   /* Subtle divider lines that split elements without being harsh */
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  padding: 0px;
}

h1 {
  font-size: 40px;
  letter-spacing: -1.68px;
  margin: 0px;
    margin-top: 0px;
  color: white;
  margin-top: 0px;
  background: #002754;
  padding: 19px;
  position: sticky;
  top: 0px;
  z-index: 1000;
  margin-bottom: -7px;
}

h2 {
  font-size: 24px;
  line-height: 118%;
  letter-spacing: -0.24px;
  margin: 0 0 8px;
  color: #c0d7f1;
  font-weight: bold;
}

h3 {
  color: #c0d7f1;
  margin-top: 0px;
  margin-bottom: 10px;
  text-align: left;
}

label {
  text-align: left;
  margin-left: 8px;
  font-size: 0.8em;
}

input, select {
  font-family: arial, sans-serif;
  padding: 6px !important;
  background: #131216;
  color: white !important;
}

/* Screen-Blocking Wait Scrim */
.wait-scrim-overlay {
  position: fixed;
  cursor: wait;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.75); /* Dims the dark mode app smoothly */
  backdrop-filter: blur(4px);        /* Softly blurs background elements */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;                     /* Ensures it sits safely on top of fixed title blocks */
  pointer-events: all;               /* Captures and blocks all accidental glass taps */
}

/* Centralized Status Dialog Box */
.scrim-spinner-box {
  background: var(--card-bg);
  padding: 24px 40px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  cursor: wait;
}

.scrim-spinner-box p {
  margin: 0;
  font-weight: 600;
  color: var(--text-main);
  font-size: 1.1rem;
  letter-spacing: -0.01em;
}

/* CSS Rotation Animation Spinner */
.scrim-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--secondary);
  border-top-color: var(--primary); /* Vibrant electric sky-blue lead color */
  border-radius: 50%;
  animation: spinScrim 0.8s linear infinite;
}

@keyframes spinScrim {
  to {
    transform: rotate(360deg);
  }
}

.currency {
  font-weight: normal !important;
}

.childsName {
  text-align: left;
margin-right: 32px;
  color: var(--primary);
  font-size: 24px;
}

#app { width:100%; max-width: 1200px; margin: 0 auto; min-height:calc(100svh - 40px); }


/* THE HEADER BAR CONTAINER */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0px;
  margin-bottom: 0px;
  gap: 12px;
  position: sticky;
  top: 60px;
  background: #17192d;
  z-index: 1000;
  flex-wrap: wrap;
}


.ledger-header {
  flex-basis: 100%;
}

.nav-and-back-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-back-nav {
  background: var(--secondary);
  border: 0px solid #17202d !important;
  color: var(--primary) !important;
  transition: all 0.2s ease;
  padding: 4px !important;
  font-size: 12px !important;
  font-weight: normal !important;
}
.btn-back-nav:hover {
  background:var(--secondary);
}

.user-selector { display: flex; align-items: center; gap: 8px; font-weight: bold; }

.card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

/*

.loading-overlay-indicator {
  background:#373210; 
  color:white;
  padding:8px; font-weight:bold; text-align:center; border-radius:6px; margin-bottom:12px;
}

*/

/* SINGLE CARDS ROW PER CHILD */
.dashboard-rows-container { display: flex; flex-direction: column; gap: 12px; }
.child-row-layout { display: flex; background: #3d3d3d; border: 2px solid var(--border-color); border-radius: 12px; align-items: center; overflow: hidden; }
.child-row-click-area { display: flex; flex: 1; justify-content: space-between; align-items: center; padding: 20px; cursor: pointer; }
.child-row-click-area:hover { background: #756f6f; }
.child-row-info h3 { margin: 0 0 4px 0; font-size: 1.5rem; color: rgb(223, 227, 236); }
.allowance-label { font-size: 0.9rem; color: var(--text-muted); }
.child-row-balance { font-size: 2rem; font-weight: 900; padding: 8px; border-radius: 6px; white-space: nowrap;}   
.child-row-actions { padding-right: 0px; }

/* SHARED SYSTEM CONTROLS */
.btn { padding: 10px 16px; border: 1px solid transparent; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.95rem;margin: 2px;white-space: nowrap; }
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

.inline-form { display: grid;
  gap: 12px;
  align-items: flex-end;
  grid-template-columns: 1fr 1fr; }
.form-group { display: flex; flex-direction: column; flex: 1; min-width: 140px; }
.log-submit-btn { padding: 12px 24px; min-width: 100px; }
input, select { padding: 6px !important; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem;color: white !important; }

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
  grid-template-columns:100px 1fr 1fr 90px;
  background: #101011;
  padding: 12px;
  font-weight: bold;
  font-size: 0.95rem;
  border-bottom: 2px solid var(--border-color);
}
.desktop-grid-header.with-meta {
  grid-template-columns: 100px 1fr 1fr 90px 130px 120px 120px;
}
.desktop-grid-row {
  display: grid;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  font-size: 0.95rem;
}
.desktop-grid-row:nth-child(even) { background: #505051; }

/* Interactive feedback on the primary editable action row */
.clickable-last-row {
  cursor: pointer;
  position: relative;
}
.clickable-last-row:hover {
  background-color: #423308 !important;
}
.editing-row {
background: #362a06 !important;
  border: 2px solid #eab308 !important;
  align-content: center;
  grid-template-columns: 100px 1fr 1fr 124px !important;
  gap: 0px 8px;
  align-items: first baseline;
}

.desktop-inline-edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #6a6228;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  font-size: 0.9rem;
}
.action-buttons-group { display: flex; gap: 6px; }

.table-input {padding: 2px !important;
  font-size: 12px;border: 1px solid #eab308; border-radius: 4px; width: 100%; box-sizing: border-box; }
.table-select { padding: 2px !important;
  font-size: 12px; border: 1px solid #eab308; border-radius: 4px; }
.table-amount-edit-wrap { display: flex; gap: 4px; justify-content: flex-end; }
.amount-input-box { width: 45px; }

.initial-balance-row { background: #040f06 !important; font-style: italic; color: var(--text-muted); }

.search-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-top: 12px; }
.filter-header-row { display: flex; justify-content: space-between; align-items: center; }
.btn-tiny { padding: 6px 12px; font-size: 0.8rem; background: #e2e8f0; color: #334155; }

.meta-cell { font-size: 0.8rem; color: #64748b; word-break: break-all; }
.mono { font-family: monospace; }
.text-right { text-align: right;;padding-right: 4px }
.text-left { text-align: left;padding-left: 4px; }

.pos-dark { color: var(--success-dark); background-color: #d1e7dd; font-weight: bold; }
.neg { color: var(--danger-dark); background-color: #f8d7da; font-weight: bold; }
.pos-dark-dark { color: #71ffaa;  background-color: #184732;font-weight: bold; }
.neg-dark-dark { color: #650000; background-color: #f8d7da; font-weight: bold; }
.pos-dark-text { color: #71ffaa; font-weight: bold; }
.neg-text { color: #ff4646; font-weight: bold; }

.relative-position { position: relative; }
.helper-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: black; border: 1px solid var(--border-color); border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; }
.helper-dropdown ul { list-style: none; padding: 0; margin: 0; }
.helper-dropdown li { padding: 10px; cursor: pointer; border-bottom: 1px solid #151515; font-size: 0.9rem;color:white; }
.helper-dropdown li:hover { background: #151515; }

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
  background: #304a63;
  border: 1px solid var(--border-color);
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s ease;
}
.btn-assist:hover {
  background: #517494;
}

.desktop-grid-row {
  background: #373738;
}
.desktop-grid-row:nth-child(2n) {
  background: #212121;
}

.girl {
  color: #ff4ca5 !important;
  position: static;
}

.boy {
  color:#6bf8ff !important;
  position: static;
}
.boy-dark {
  color:#01a4ad !important ;
  position: static;
}

button.Deposit {
  background: var(--success-dark);

}

button.Withdraw {
  background: var(--danger-dark) !important;
 
}

.form-card input, .form-card select {
  box-shadow: 0px 0px 4px white;
}
  
/* --- TWO-ROW-PER-TRANSACTION MOBILE LAYOUT RULES --- */
@media (max-width: 600px) {
  .dbb {
    display: none;
  }

  h1 {    
  padding: 4px;
  font-size: 28px;
  }

  h3 {
    margin-bottom: 4px;
    font-size: 1em;
  }

  .card.form-card{
    position: relative;
  }

  .balance-badge {
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    margin-bottom: 2px;
    padding:8px;
    border-top: 2px solid black;
    display: grid;
    grid-template-columns: 1fr min-content min-content min-content; 
    gap: 8px; 
    padding-bottom: 5px !important;
  }

.filter-header-row {
  position: relative;
}

  .hide-on-mobile { display: none !important; }
  .show-only-on-mobile { display: flex !important; }
  div.show-only-on-mobile { display: flex !important; }

  /* Collapse Navigation Header into a robust block row stack */
  .app-header { flex-direction: column; align-items: stretch; gap:0px 8px; border-bottom: none; margin-bottom:0px;top:40px; }
  .nav-and-back-group { flex-direction: column; width: 100%; gap: 6px; display: grid;
    grid-template-columns: 1fr 1fr;}
  .nav-and-back-group .btn { width: 100%; padding: 4px; font-size: 1rem; text-align: center; }
  
  .user-selector { 
    width: 100%; 
    box-sizing: border-box; 
    justify-content: space-between; 
    padding-bottom: 2px;
    border: 0px solid var(--border-color); 
    border-radius: 0px; 
  }
  .user-selector select { width: 65%;padding: 4px; }

  .child-row-layout { flex-direction: column; align-items: stretch; }
  .child-row-actions { padding: 0px; }
  .btn-delete-row { width: 100%; text-align: center; padding: 10px; }

  .inline-form { display: grid;
    gap: 0px 16px;
    align-items: flex-end;
    grid-template-columns: 150px 1fr; }
  .form-group { width: 100%; }
  .log-submit-btn { width: 100%; }

  .form-group label {
    position: relative;
    top: 2px !important;
    color: silver;
  }

  /* Mobile Stack List */
  .mobile-ledger-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  .mobile-tx-card {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card { 
    padding:8px;
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
  .desktop-grid-row {
  background: #373738;
}
.desktop-grid-row:nth-child(2n) {
  background: #212121;
}
.search-filter-grid,.filter-header-row  .btn-tiny, .where { display: none; }

}

/* Header alignment adjustments for user selector + refresh button layout combo */
.user-selector-and-refresh-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-refresh-sync {
  background: var(--secondary);
  border: 1px solid var(--border-color);
  padding: 4px;
  font-size: 1rem;
  font-weight: normal;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  border: 0px solid #17202d !important;
  color: var(--primary);
  font-size: 12px !important;
}

.btn-refresh-sync:hover:not(:disabled) {
  background: #334155;
}

.btn-refresh-sync:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

::placeholder {
  font-style: italic;
  font-size:12px;
  color:gray;
}
.rowimg {
     position: absolute;
    top: 47px;
    left: 110px; 
}

.voice-card {
  background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
  border: 1px solid #4338ca;
}

.voice-transcript-preview {
  margin-top: 12px;
  background: #1e293b;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  border-left: 3px solid #6366f1;
  color: #cbd5e1;
  font-style: italic;
}

.pulse-indicator {
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: bold;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

/* Voice Trigger Navigation Button */
.btn-mic-trigger {
  background: #312e81;
  color: #e0e7ff;
  border: 1px solid #4338ca !important;
  padding: 6px 10px;
  font-size: 12px !important;
  border-radius: 6px;
  cursor: pointer;
}

/* Modal Overlay Background Blur Dimmer */
.voice-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

/* Modal Window Content Container */
.voice-modal-card {
    background: #17192d;
    border: 1px solid var(--border-color);
    width: 100%;
    max-width: 100%;
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    box-sizing: border-box;
}

.voice-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.voice-modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-main);
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

/* Structural Instruction Grammar Box */
.voice-blueprint-box {
  text-align: left;
}

.blueprint-title {
  margin: 0 0 6px 0;
  font-size: 1rem;
  font-weight: bold;
  color: #818cf8;
}

.blueprint-syntax {
  background: transparent !important;
  padding: 0px;
  display: block;
  font-family: arial;
  font-size: 0.9rem;
  color: #cbd5e1;
  word-break: break-word;
  line-height: 1.4;
   text-align: left;
}

.blueprint-example {
  margin: 8px 0 0 0;
  font-size: 1rem;
  color: var(--text-muted);
  filter: saturate(0.3);
}

/* Recording Action Interaction Center */
.voice-status-container {
display: grid;
  grid-template-columns: 130px 1fr;
  align-items: center;
  justify-content: space-evenly;
  position: relative;
  margin: 0px 0px 20px;
  gap: 16px;
  justify-items: center;
}

.btn-mic-action {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #4338ca;
  border: none;
  font-size: 2rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all 0.2s ease;
  box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
  margin:8px;
}

.btn-mic-action.recording {
  background: #ef4444;
  transform: scale(0.95);
}

.action-hint-text {
    font-size: 1rem;
    color: white;
    margin-top: 14px;
    text-align: center;
    font-weight: bold;
}

/* Audio Wave Pulse Animation Ring */
.pulse-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.4);
  animation: wavePulse 1.8s infinite ease-out;
  z-index: 1;
}

@keyframes wavePulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* Heard Transcript Summary Box */
.voice-transcript-review {
  background: #1e293b;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  border-left: 3px solid #818cf8;
  color: #cbd5e1;
  margin-top: 16px;
}
.xbreak {
  display: none;
}

/* Ensure mobile stacking rules do not distort header utilities button configurations */
@media (max-width: 600px) {

  .blueprint-syntax {
    font-size: 1.4em;
  }

.xbreak {
  display: inline;
}
  .blueprint-title {
    display: none;
  }

  .desktop-grid-header, .desktop-grid-row{
    grid-template-columns: 100px 1fr 90px !important;
  }

  .desktop-grid-row.editing-row {

  grid-template-columns: 100px 1fr 1fr 124px !important;
  }

  .desktop-grid-row * {
    font-size: 12px !important;
  }
  .allowance-label-text {
    display: none;
  }
.rowimg {
     position: absolute;
    top: 6px;
    left: 100px; 
}
  .nav-and-back-group {
    display:none;
  }
  .user-selector-and-refresh-group {
    width: 100%;
    justify-content: space-between;
    padding-top: 4px;
    border-top: 1px solid var(--border-color);
  }
  .user-selector {
    width: auto;
    flex: 1;
    justify-content: flex-end;
  }
  .user-selector select {
    width: 110px;
  }
}
</style>