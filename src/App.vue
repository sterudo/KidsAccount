<template>
  <div v-if="isLoading" class="wait-scrim-overlay">
    <div class="scrim-spinner-box">
      <div class="scrim-spinner"></div>
      <p>Refreshing...</p>
    </div>
  </div>

  <h1 class="app-title"  :class="{ 'offline': !isOnline }"> 
    <button style="float:left;position: absolute; left: 0px;" v-if="currentScreen !== 'dashboard'" @click="backToDashboard"  class="btn btn-back-nav">⬅ Back</button> 
    <span style="white-space: nowrap;" class="h1s">Kids Accounts  <span class="versionno">v{{ appVersion }}</span></span>      

     <div class="user-selector-and-refresh-group"> 

          <div class="user-selector">
            <label for="global-user" style="font-size: 12px;   letter-spacing: 0.5px;">User:</label>
            <select id="global-user" v-model="currentUser" @change="saveUserPreference">
              <option v-for="user in users" :key="user" :value="user">{{ user }}</option>
            </select>
          </div>
        </div>

    <div>
      <ActionMenu 
      :debug-mode="isDebugEnabled"
      :show-help="isSpeechHelpVisible"
      :isOnline="isOnline"
      @navigate="(screen) => currentScreen = screen"
      @refresh="fetchSyncDatabase"
      @toggle-debug="isDebugEnabled = !isDebugEnabled"
      @about="isAboutOpen = true"
      @toggle-help="isSpeechHelpVisible = !isSpeechHelpVisible"
    />
      <button 
        type="button" 
        @click="isAboutOpen = true" 
        class="btn-about-trigger" 
        :class="{ 'device-is-offline': !isOnline }"
        :title="isOnline ? 'Online - Application Info' : 'Offline Mode Active'"
      >
        {{ isOnline ? '🤑' : '😢' }}
      </button>
 
    </div>
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
               
        <div  v-if="currentScreen === 'ledger' && selectedChild"  class="ledger-header">
            <div class="child-summary">
                <img :src="(selectedChild.name == 'Eve') ? 'eve250.png' :((selectedChild.name == 'Jason') ? 'jason250.png' : 'default.png')" width="60" height="60" class="rowimg"/>
                <div 
                  :style="(selectedChild.name == 'Eve') ? ' border-bottom: 2px solid #ff4ca5 !important;' : 'border-bottom: 2px solid #01a4ad !important;'"
                    class="balance-badge" :class="calculateBalance(selectedChild.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">
                  
                  <span class="childsName"  :class="(selectedChild.name == 'Eve') ? 'girl': ((selectedChild.name == 'Jason') ? 'boy-dark': 'tester')">{{ selectedChild.name }}</span>           
                  <span class="balancelabel">Balance</span>
                  <span class="currency" style="font-size:32px;  "> £</span>              
                  <strong style="font-size:32px;text-shadow: white -1px -1px 1px, black 1px 1px 2px;">{{ calculateBalance(selectedChild.id).toFixed(2) }}</strong>
                </div>    
            </div>  
        </div>

        <div v-else style="width:100%">
          <div v-if="!isOnline" style="width:100%">

            <div class="offline-banner">
              <span class="offline-icon">⚠️</span> <b style="    font-size: 1rem;    font-weight: bold;">Offline Mode</b><br>
                 Data might not be up-to-date. AI features are suspended (Dictation, Camera, Location). 
                 <p style="    font-size: 1rem;
    font-weight: bold;">Transaction can be logged and will automatically by synced when back online.</p>

            </div>
          </div>


        </div>

       </header>

      <main class="app-container">

        <div v-if="isLoading" class="loading-overlay-indicator">
        🔄 Processing & Syncing Spreadsheet Cloud Database Engine...
        </div>
      
        <AddChildSettings 
          v-if="currentScreen === 'addChildSettings'"
          v-model="childForm"
          @submit="handleCreateChild"
        />
      
        <AddUserSettings 
          v-if="currentScreen === 'addUserSettings'"
          v-model="newUserFormName"
          :users="users"
          :is-user-deletable="isUserDeletable"
          @submit="handleCreateUser"
          @delete-user="handleDeleteUser"
        />

   
        <BackupSettings 
         v-if="currentScreen === 'backupSettings'"
          :api-url="SHEET_API_URL"
          :fingerprint="deviceFingerprint"
          :is-online="isOnline"
          @trigger-refresh="fetchSyncDatabase(false)" 
        />


        <!-- VIEW 3: DASHBOARD (One Kid Per Row Layout) -->
        <section v-if="currentScreen === 'dashboard'" class="screen" style="margin-top: 20px;">
          <div class="card help-tips-card" v-if="isSpeechHelpVisible">
            <div class="help-card-header">
              <h3>💡 Dashboard Quick Tips</h3>
              <button type="button" class="btn-help-minimize" @click="toggleHelpState('dashboard')">
                {{ hideHelpDashboard ? '➕ Show' : '➖ Hide' }}
              </button>
            </div>
            <div v-if="!hideHelpDashboard" class="help-card-body animate-fade-in">
              <ul>
                <li><strong>🎤 Voice Dictation:</strong> Press the microphone icon to dictate entries effortlessly.<br>
                  Say sequences like <em>"Add 5 Pounds to Evie"</em> for a deposit or<br>
                  <em>"Remove 3.50 from Jason for sweets from an Off-liscence"</em> for a withdrawal.<br>
                   <em>"Jason bought a toy from Tesco for 15 pounds 50"</em><br>
                   <em>"Evie earned 10 pounds because she tidied her room."</em><br><br>
                  At a minimum, ensure to include the <b>action</b> (Add/Remove), <b>amount</b>, and <b>child's name</b>.<br> 
                  Nothing is submitted automatically; you will have the opportunity to review and confirm each transaction before it is recorded.
                  </li>
                <li><strong>⚙️ User Controls:</strong> Make sure that you have selected the correct user (Mom/Dad) before performing any actions.</li>
              </ul>
            </div>
          </div>

          <div class="card list-card">            
            <div v-if="dashError" class="dashboard-error-banner" @click="dashError = ''">
              <p>{{ dashError }}</p>
            </div>
            <p v-if="children.length === 0" class="empty-state">No accounts created yet. Use the "+ Add Child" tab above.</p>
            
            <div v-else class="dashboard-rows-container">
              <div v-for="child in children" :key="child.id" class="child-row-layout">
                <div class="child-row-click-area" @click="navigateToLedger(child.id)">
                 
                  <img :src="(child.name == 'Eve') ? 'eve250.png' : ((child.name == 'Jason') ? 'jason250.png' : 'default.png')" class="child-avatar" width="60" height="60" style="flex-basis:1;margin-right:10px;" />
                  <div class="child-row-info" style="flex-basis: 100%;  text-align: left;">                    
                    <h3 :class="(child.name == 'Eve') ? 'girl': ((child.name == 'Jason') ? 'boy': 'tester')">{{ child.name }} </h3>
                    <span class="allowance-label" style="text-align:left;"><span style="font-size: 12px;" class="allowance-label-text">Allowance:</span> {{ formatCurrency(child.weeklyallowance) }}/wk</span>
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
           <div v-if="isOnline" class="voice-modal-card" @click.stop>
  
              <div class="voice-blueprint-box" v-if="isSpeechHelpVisible">
                <p class="blueprint-title">🗣️ Spoken Sentence Guide:</p>
                <code class="blueprint-syntax">
                  <b style="color:red">Remove</b> <b style="color:white">X.Y</b> from <b style="color:yellow">child</b><br class="xbreak"> 
                  for a <b style="color:cyan">what</b> from <b  style="color:orange">place</b>        
                  <button  class="showExBtn" type="button" @click="toggleExamples">{{ showExamples ? 'Hide Examples' : 'Show Examples' }}</button>
                </code>
                <div class="blueprint-example" v-if="showExamples">
                  <p style="margin-bottom: 12px"><b style="color:lime">Add</b> <b style="color:white">X.Y</b> to <b style="color:yellow">child</b> for a <b style="color:cyan">what</b></p>
                  <em style="font-size:0.9em">"<b style="color:#f66">Remove</b> <b style="color:white">20 point 99</b> from <b style="color:yellow">Jason</b> for a <b style="color:cyan">Plushie</b> from <b style="color:orange">Sainsburys</b>"</em><br>
                  <em style="font-size:0.9em">"<b style="color:lime">Add</b> <b style="color:white">10 Pounds</b> to <b style="color:yellow">Evie</b> as a <b style="color:cyan">Gift</b>"</em>
                </div>
              </div>

              <div class="voice-status-container" >
                <div v-if="isListening" class="pulse-ring"></div>
                <div class="action-hint-text" style="margin-top: 8px;">
                  {{ isListening ? 'Tap once to STOP' : 'Tap once,' }}
                  <span style="font-weight: normal; display: inline;">
                    {{ isListening ? '' : ' speak clearly, ' }}
                  </span>
                  <span style="font-weight: bold; display: inline;">
                    {{ isListening ? '' : 'then tap stop' }}
                  </span>
                </div>

                <button 
                type="button"
                @click="toggleVoiceCapture" 
                class="btn-mic-action"
                :class="{ 'recording': isListening }"
              >
                {{ isListening ? '🛑' : '🎤' }}
              </button>

     
            </div>

            <div v-if="showIfProblem" class="voice-transcript-review">
              <strong>Heard Text:</strong> "{{ voiceTranscript }}"
            </div>

            <div class="voice-debug-console" v-if="isDebugEnabled">
              <div class="debug-console-header">
                <span>📋 System Activity Log:</span>
                <button type="button" @click="voiceLogs = []" class="btn-clear-logs">Clear</button>
              </div>
              <div class="debug-log-rows">
                <div v-for="(log, idx) in voiceLogs" :key="idx" class="debug-log-row">
                  <span class="log-time">[{{ log.time }}]</span> {{ log.msg }}
                </div>
                <div v-if="voiceLogs.length === 0" class="debug-log-empty">No events recorded yet. Tap Start to test...</div>
              </div>
            </div>
           </div>
        </section>

        <!-- VIEW 4: LEDGER / STATEMENT DETAILED VIEW -->
        <section v-if="currentScreen === 'ledger' && selectedChild" class="screen">

          <div v-if="selectedChild && isSpeechHelpVisible" class="card help-tips-card" style="margin-top: 12px;">
            <div class="help-card-header">
              <h3>💡 Ledger & Form Assistant Tips</h3>
              <button type="button" class="btn-help-minimize" @click="toggleHelpState('detail')">
                {{ hideHelpDetail ? '➕ Show' : '➖ Hide' }}
              </button>
            </div>
            <div v-if="!hideHelpDetail" class="help-card-body animate-fade-in">
              <div class="help-tips-grid">
                <div>
                  <h5>⚡ Form AI Accelerators:</h5>
                  <ul>
                    <li><strong>📸 AI Vision Lens:</strong> Take photos of items or receipts to automatically extract alternative names and pick out target transaction prices.</li>
                    <li><strong>📍 GPS Geolocation Match:</strong> Tap the locator pin to look up real-world businesses nearby and auto-fill your storefront name.</li>
                  </ul>
                </div>
                <div>
                  <h5>📚 History Tools:</h5>
                  <ul>
                    <li><strong>✨ Past Match Dropdown:</strong> Tap the sparkle icons to view or toggle previous entries. Pressing it while it's open turns it into an <strong>✕</strong> to close the selection safely.</li>
                    <li><strong>🖼️ In-App Receipt Lightbox:</strong> Click the inline 📸 button in any history row to open and view receipt images natively.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
       
          <!-- Transaction Input Form -->
          <div class="card form-card">
            <h3 style="margin-top: 10px;">Log New Transaction</h3>
            <div v-if="showTranscript" class="voice-transcript-log">
              <strong>🎤</strong> "{{ voiceTranscript }}"
            </div>
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
                    @blur="closeHelperDeferred"   
                  />
                  <button type="button" @click.prevent.stop="triggerCameraCapture" 
                  :disabled="!isOnline"
                  class="btn btn-assist" style="margin-right: 4px;" title="Scan Item with AI Camera">📸</button>
                  
                  <button 
                    type="button" 
                    @click.prevent.stop="activeHelper = activeHelper === 'what' ? '' : 'what'" 
                    class="btn btn-assist" 
                    :style="activeHelper === 'what' ? 'background: #451a1a; border-color: #ef4444;' : ''"
                    :title="activeHelper === 'what' ? 'Close list' : 'Show past descriptions'"
                  >
                    {{ activeHelper === 'what' ? '✕' : '✨' }}
                  </button>
                </div>
                
                <input 
                  type="file" 
                  id="hiddenCameraInput" 
                  accept="image/*" 
                  capture="environment" 
                  style="display: none;" 
                  @change="handleCameraCapture"
                />

                <div v-if="aiWhatSuggestions.length > 0 || detectedBarcodeNumber" class="shop-suggestions-tray" style="margin-top: 6px;">
                  <div v-if="aiWhatSuggestions.length > 0" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; width: 100%;">
                    <span class="suggestion-tray-title">AI Suggestions:</span>
                    <button 
                      type="button" 
                      v-for="item in aiWhatSuggestions" 
                      :key="item"                       
                      @mousedown.prevent="txForm.what = item; aiWhatSuggestions = []"
                      class="badge-shop-suggestion"
                    >
                      ✨ {{ item }}
                    </button>
                  </div>

                  <div v-if="detectedBarcodeNumber" class="barcode-link-container" style="width: 100%; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #223147;">
                    <span class="suggestion-tray-title">Barcode Found: <code>{{ detectedBarcodeNumber }}</code></span>
                    <a 
                      :href="'https://www.barcodelookup.com/' + detectedBarcodeNumber" 
                      target="_blank" 
                      class="badge-barcode-link"
                    >
                      🔍 Open Barcode Lookup ↗
                    </a>
                  </div>

                  <button type="button" @click="aiWhatSuggestions = []; detectedBarcodeNumber = ''" class="badge-shop-clear">✕</button>
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
                    @blur="closeHelperDeferred"  
                  />
                  <button type="button" @click.prevent.stop="fetchSmartLocationList" :disabled="!isOnline || isLocating"
                   class="btn btn-assist" style="margin-right: 4px;" title="Find Nearby Shops via AI GPS">
                    {{ isLocating ? '⏳' : '📍' }}
                  </button>
                  
                  <button 
                    type="button" 
                    @click.prevent.stop="activeHelper = activeHelper === 'where' ? '' : 'where'" 
                    class="btn btn-assist" 
                    :style="activeHelper === 'where' ? 'background: #451a1a; border-color: #ef4444;' : ''"
                    :title="activeHelper === 'where' ? 'Close list' : 'Show past locations'"
                  >
                    {{ activeHelper === 'where' ? '✕' : '✨' }}
                  </button>
                </div>

                <div v-if="nearbyShopSuggestions.length > 0" class="shop-suggestions-tray" style="margin-top: 6px;">
                  <span class="suggestion-tray-title">AI Nearby:</span>
                  <button 
                    type="button" 
                    v-for="shop in nearbyShopSuggestions" 
                    :key="shop" 
                    @mousedown.prevent="txForm.where = shop; nearbyShopSuggestions = []"
                    class="badge-shop-suggestion"
                  >
                    🏪 {{ shop }}
                  </button>
                  <button type="button" @click="nearbyShopSuggestions = []" class="badge-shop-clear">✕</button>
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
                <div class="text-left where">Type</div>
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
                  :style="showMetaFields ? 'grid-template-columns:100px 1fr 1fr 90px 110px 130px 120px 120px' : 'grid-template-columns: 100px 1fr 1fr 90px 110px'"
                  @click="handleRowClick(tx)" >
                  <!-- Pinned Save Action Bar for desktop rows editing state controls -->
            
                  <!-- Row display logic / Form fields toggle during row selections -->
                  <template v-if="editingTxId !== tx.id">
                    <div class="text-left">{{ formatDate(tx.date) }}</div>
                    <div class="text-left"><b>🛒</b> {{ tx.what }}
                      <button 
                        v-if="isOnline && tx.fileurl && tx.fileurl.startsWith('http')" 
                        type="button" 
                        @click.stop="openImagePreviewModal(getRawImageUrl(tx.fileurl))" 
                        class="btn-image-thumbnail-trigger"
                        :title="`View Receipt inside App ${tx.fileurl}`"
                      >
                        📸
                      </button>
                      <p class="onlyMobile locationP"><b v-if="tx.where != '-' &&  tx.where != ''">🏪</b> {{ tx.where }}</p>
                    </div>
                    <div class="text-left where">{{ tx.where || '-' }}</div>
                    <div class="text-left where">{{ tx.type  }}</div>
                    <div style="font-size: 16px !important;" class="text-right" :class="tx.type === 'deposit' ? 'pos-dark-text' : 'neg-text'">
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
                :style="showMetaFields ? 'grid-template-columns:100px 1fr 1fr 90px 110px 130px 120px 120px' : 'grid-template-columns: 100px 1fr 1fr 90px 110px'" >
                <div>-</div>
                <div><strong>Starting Balance</strong></div>
                <div class="where">-</div>
                <div class="text-right" :class="selectedChild.startamount >= 0 ? 'pos-dark-text' : 'neg-text'">{{ formatCurrency(selectedChild.startamount) }}</div>
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

<ImageLightbox 
    :is-open="isPreviewModalOpen"
    :image-url="activePreviewUrl"
    @close="closeImagePreviewModal"
  />


  <AboutDialog :is-open="isAboutOpen" :app-version="appVersion" @close="isAboutOpen = false" />

  
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import ImageLightbox from '@/components/ImageLightbox.vue';
import AddChildSettings from '@/components/AddChildSettings.vue';
import AddUserSettings from '@/components/AddUserSettings.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import BackupSettings from '@/components/BackupSettings.vue';
import { 
  formatCurrency, 
  formatDate, 
  formatDateMobile,
  generateDeviceFingerprint, 
  appendScreenLog,
  getRawImageUrl
} from './utils/helpers';
import ActionMenu from '@/components/ActionMenu.vue';
const appVersion = ref('0.31');
// Assure you have matching flags linked to control toggles:
const isDebugEnabled = ref(false); // Controls local screen log views
const debugMode = ref(false);
const isSpeechHelpVisible = ref(false); // Controls collapsed help view block

// Reactive toggle controlling the visibility layout frame
const isAboutOpen = ref(false);
// paste your Google App Script deployed endpoint web app URL here
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzg05Y22_KksejVZzQBeq0coDyFn4LvMAbKnsijv8x9LJqaUyCAL-AuK4kPOorm6S0P/exec';


const currentScreen = ref('dashboard');
const selectedChildId = ref(null);
const showMetaFields = ref(false);
const activeHelper = ref(null);

const users = ref(['Dad', 'Mum']);
const currentUser = ref('Dad');

const children = ref([]);
const transactions = ref([]);

const editingTxId = ref(null);
const editForm = ref({ date: '', what: '', where: '', type: 'withdrawal', amount: 0 });

const childForm = ref({ name: '', startAmount: 0, weeklyAllowance: 0 });
const newUserFormName = ref('');
const txForm = ref({ date: getTodayString(), what: '', where: '', type: 'withdrawal', amount: null });
txForm.value.receiptImageBase64 = '';

const showTranscript = ref(false);
const filterType = ref('all');
const filterText = ref('');
const filterStartDate = ref('');
const filterEndDate = ref('');
const testOutput = ref(''); // For temporary testing outputs
const detectedBarcodeNumber = ref('');
// --- DATA ACCESS LAYER ---
// Update your fetchSyncDatabase function to store it
const lastSyncTime = ref(0); 
// Voice State Controls
const isVoiceModalOpen = ref(false);
const isListening = ref(false);
const voiceTranscript = ref('');
const showIfProblem = ref(false); // Flag to show transcript review only when needed
const voiceLogs = ref([]); // 🌟 NEW: Array to hold on-screen telemetry logs
const systemLogs  = ref([]);
const showExamples = ref((window.localStorage.getItem('showExamples') ?  ((window.localStorage.getItem('showExamples') === 'show') ? true : false) : true) );
const cloudGeminiApiKey = ref('');
const dashError = ref('');
let recognition = null;


const systemConfig = ref({});
const isLoading = ref(false);
const isAuthenticated = ref(false);
const deviceFingerprint = ref("");

// Setup LocalStorage key strings
const STORAGE_KEY = "vault_cached_dataset";


// 🌟 NEW STATES FOR ADVANCED DYNAMIC SUGGESTIONS
const isLocating = ref(false);
const nearbyShopSuggestions = ref([]);
const aiWhatSuggestions = ref([]);

const isPreviewModalOpen = ref(false);
const activePreviewUrl = ref('');

// 💡 HELP CARD VISIBILITY CONTROLLER STATES
const hideHelpDashboard = ref(localStorage.getItem('hide_help_dashboard') === 'true');
const hideHelpDetail = ref(localStorage.getItem('hide_help_detail') === 'true');

// Inside src/App.vue <script setup>
const isOnline = ref(navigator.onLine);
const pendingQueue = ref([]);

// Setup explicit LocalStorage keys
const OUTBOX_STORAGE_KEY = "vault_pending_outbox";
const DATA_STORAGE_KEY = "vault_cached_dataset";

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

  // 1. Instantly pull and mount whatever dataset resides in local storage
 initializeAppCache();
  initializeOfflineQueue();
  
  // Initial active ping check
  checkNetworkConnectivity();

  // Bind native browser visibility and connectivity triggers
  window.addEventListener('online', checkNetworkConnectivity);
  window.addEventListener('offline', () => {
    isOnline.value = false;
    logToScreen("📉 Device transitioned offline. Restricted read/write safety rules applied.");
  });

  // Recheck internet connection every 15 seconds to catch dropouts early
  const networkCheckInterval = setInterval(checkNetworkConnectivity, 15000);

  // 2. Perform an initial sync. If authenticated, this fills the background. If unauthenticated, it triggers a foreground validation check.
  fetchSyncDatabase(isAuthenticated.value);

  // 3. Bind silent background event hooks
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerBackgroundRefresh();
    }
  });

  window.addEventListener('focus', triggerBackgroundRefresh);

onUnmounted(() => {
  // Clean up global environment triggers to prevent memory leaks
  window.removeEventListener('popstate', handleHardwareBackButton);
    clearInterval(networkCheckInterval);
    window.removeEventListener('online', checkNetworkConnectivity);
    window.removeEventListener('offline', () => isOnline.value = false);
  });

   // Establish a baseline layout state for the dashboard on initial application cold launch
  window.history.replaceState({ screen: 'dashboard' }, '');

  // Bind the global window navigation listener popstate rule
  window.addEventListener('popstate', handleHardwareBackButton);
});


/**
 * Validates actual internet connectivity by making a lightweight HEAD fetch request
 */
async function checkNetworkConnectivity() {
  if (!navigator.onLine) {
    isOnline.value = false;
    return;
  }
  try {
    // 🌟 FIX: Ping a reliable micro-asset that allows global CORS requests (like standard cloud favicons)
    // alternative: fetch(`${SHEET_API_URL}?action=ping`, { method: 'GET', mode: 'cors' })
    const response = await fetch('https://www.google.com/favicon.ico', { 
      method: 'HEAD', 
      mode: 'no-cors', // Prevents cross-origin browser blocking
      cache: 'no-store' 
    });
    
    if (!isOnline.value) {
      isOnline.value = true;
      logToScreen("🌐 Internet access restored! Initiating outbox queue flush...");
      flushPendingQueue();
    }
  } catch (err) {
    // Router connection exists, but actual internet access is dead
    isOnline.value = false;
  }
}
/**
 * Initializes the outbox cache queue on app cold startup
 */
function initializeOfflineQueue() {
  const savedQueue = localStorage.getItem(OUTBOX_STORAGE_KEY);
  if (savedQueue) {
    try {
      pendingQueue.value = JSON.parse(savedQueue);
    } catch (e) {
      pendingQueue.value = [];
    }
  }
}

// 🔄 BROWSER & ANDROID BACK BUTTON INTERCEPT ROUTER
watch(currentScreen, (newScreen) => {
  if (newScreen === 'dashboard') {
    // If we are back on the main dashboard, ensure the history stack doesn't have stray deep views
    if (window.history.state?.screen && window.history.state.screen !== 'dashboard') {
      // Clean baseline state
    }
  } else {
    // 🌟 CRITICAL: When entering ANY sub-screen, push a state marker onto the browser history stack.
    // This tricks the browser/Android into enabling the back button instead of leaving the app.
    window.history.pushState({ screen: newScreen }, '');
    appendScreenLog(`History state pushed for screen: ${newScreen}`, systemLogs);
  }
});


/**
 * Initializes the application state model out of LocalStorage
 */
function initializeAppCache() {
console.log("initializeAppCache");
  // Generate/retrieve the device fingerprint first (kept in memory, never saved to storage)
  deviceFingerprint.value = generateDeviceFingerprint(); 

  const cachedData = localStorage.getItem(STORAGE_KEY);
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      
      // Hydrate local reactive state frameworks instantly from cache
      children.value = parsed.children || [];
      transactions.value = parsed.transactions || [];
      users.value = parsed.users || [];
      systemConfig.value = parsed.config || {};
      
      // If valid data exists in LocalStorage, the device is implicitly authenticated
      isAuthenticated.value = true;
      console.log("isAuthenticated");
      logToScreen("💾 Local Storage dataset loaded. Screen available instantly.");
    } catch (e) {
      logToScreen("⚠️ Corrupted cache layout encountered. Clearing data.");
      purgeLocalStorageAuth();
    }
  }
}

/**
 * Core synchronization pipeline with optional background capability
 */
// Add a tracker ref for the last timestamp inside <script setup>
const lastSyncTimestamp = ref(0);
const SYNC_COOLDOWN_MS = 30000; // 30 seconds protection window

async function fetchSyncDatabase(isBackground = false) {
  // 🌟 PROTECTION LAYER: Prevent rapid-fire 429 bursts if background sync is called too frequently
  const now = Date.now();
  if (isBackground && (now - lastSyncTimestamp.value < SYNC_COOLDOWN_MS)) {
    console.log("📶 Background sync skipped: Cooldown active to prevent Google 429 throttling.");
    return; 
  }

  if (!isBackground) {
    isLoading.value = true;
  }

  try {
    const syncUrl = `${SHEET_API_URL}?fingerprint=${encodeURIComponent(deviceFingerprint.value)}`;
    const response = await fetch(syncUrl);
    const data = await response.json();

    if (data.status === 403 || data.error === "Unauthorized") {
      purgeLocalStorageAuth();
      return;
    }

    if (data.children) children.value = data.children;
    if (data.transactions) transactions.value = data.transactions;
    if (data.users) users.value = data.users;
    if (data.config) systemConfig.value = data.config;

    // Save success timestamp
    lastSyncTimestamp.value = Date.now();

    localStorage.setItem("vault_cached_dataset", JSON.stringify({
      children: children.value,
      transactions: transactions.value,
      users: users.value,
      config: systemConfig.value
    }));

  } catch (err) {
    console.error("Network sync warning:", err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Wipe authentication cache and lock the dashboard layout
 */
function purgeLocalStorageAuth() {
  localStorage.removeItem(STORAGE_KEY);
  children.value = [];
  transactions.value = [];
  users.value = [];
  systemConfig.value = [];
  isAuthenticated.value = false;
  alert("🔒 Security Alert: This device is not authorized to view this ledger data.");
}

// Inside src/App.vue lifecycle blocks

// Handler for silent background polling
function triggerBackgroundRefresh() {
  if (isAuthenticated.value) {

    const fiveMinutes = 5 * 60 * 1000;
    const timeSinceLastSync = Date.now() - lastSyncTime.value;

    if (timeSinceLastSync >= fiveMinutes) {
      console.log(`Throttled sync allowed: ${Math.round(timeSinceLastSync / 1000)}s since last update.`);
       fetchSyncDatabase(true); // 🌟 TRUE = Run silently in background without scrim!
    } else {
      console.log(`Throttled sync blocked: Only ${Math.round(timeSinceLastSync / 1000)}s ago. Must wait 5 minutes.`);
    }

   
  }
}



// Handler that triggers when a user hits the browser back or Android physical back button
function handleHardwareBackButton(event) {
  // If the user was on a sub-screen and pressed back, event.state will become null or change
  if (currentScreen.value !== 'dashboard') {
    // Intercept the navigation event natively!
    event.preventDefault(); 
    
    appendScreenLog(`Hardware Back Button detected. Routing screen from '${currentScreen.value}' to 'dashboard'`, systemLogs);
    
    // Execute your safe dashboard redirect routine
    backToDashboard();
  }
}





function toggleHelpState(targetView) {
  if (targetView === 'dashboard') {
    hideHelpDashboard.value = !hideHelpDashboard.value;
    localStorage.setItem('hide_help_dashboard', hideHelpDashboard.value);
    logToScreen(`Dashboard Help Card toggled. Visible: ${!hideHelpDashboard.value}`);
  } else if (targetView === 'detail') {
    hideHelpDetail.value = !hideHelpDetail.value;
    localStorage.setItem('hide_help_detail', hideHelpDetail.value);
    logToScreen(`Account Detail Help Card toggled. Visible: ${!hideHelpDetail.value}`);
  }
}

function openImagePreviewModal(url) {
  if (!url) return;
  
  // Transform native drive links into raw direct-embed source endpoints if needed
  let streamableUrl = url;
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.split('/file/d/')[1].split('/')[0];
    streamableUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  activePreviewUrl.value = streamableUrl;
  isPreviewModalOpen.value = true;
  logToScreen(`In-app receipt viewport launched for source: ${streamableUrl}`);
}

function closeImagePreviewModal() {
  isPreviewModalOpen.value = false;
  activePreviewUrl.value = '';
}
// --- 📸 CAMERA VISION ENGINE (WHAT SCANNER) ---
function triggerCameraCapture() {
  const fileInput = document.getElementById('hiddenCameraInput');
  if (fileInput) {
    fileInput.click(); // Triggers native iOS or Android camera overlay interface
  }
}


function handleCameraCapture(event) {
  const file = event.target.files[0];
  if (!file) return;

  isLoading.value = true;
  aiWhatSuggestions.value = [];
  logToScreen(`Camera captured: ${file.name}. Commencing 400px downscaling pass...`);

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      // 📐 SCALE LOGIC: Maintain Aspect Ratio with a 400px constraint max
      const MAX_DIMEN = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_DIMEN) {
          height = Math.round((height * MAX_DIMEN) / width);
          width = MAX_DIMEN;
        }
      } else {
        if (height > MAX_DIMEN) {
          width = Math.round((width * MAX_DIMEN) / height);
          height = MAX_DIMEN;
        }
      }

      // Draw onto temporary off-screen Canvas asset
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Convert scaled frame back to Base64 (Using JPEG compression to drop byte weight)
      const compressedBase64DataString = canvas.toDataURL("image/jpeg", 0.85);
      const pureBase64Data = compressedBase64DataString.split(",")[1];

      logToScreen(`Resize sequence optimized: Final resolution is ${width}x${height}px.`);

      // 1. Kick off your existing Gemini parsing logic
      await parseImageWithGeminiVision(pureBase64Data, "image/jpeg");

      // 2. 🌟 NEW: Save this base64 image data into your txForm state so it uploads when saving the transaction!
      txForm.value.receiptImageBase64 = pureBase64Data;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

async function parseImageWithGeminiVision(base64Data, mimeType) {
  if (!cloudGeminiApiKey.value) {
    alert("AI configuration data missing. Please refresh to sync credentials.");
    isLoading.value = false;
    return;
  }

  logToScreen("Multimodal Pipeline: Analyzing image text, barcodes, and price data...");
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cloudGeminiApiKey.value}`;

  const structuralPrompt = `
    Analyze this image. It is either a picture of an item bought by a child, a close-up of a product with a barcode/label, or a store receipt.
    
    Perform these extractions:
    1. Descriptions: Come up with 3 short, clean alternative product description options (max 2-3 words each, e.g., 'Pokemon Cards', 'Chocolate Bar').
    2. Price: Look for a clear price tag, receipt total, or item cost. Extract it as a raw floating-point number (e.g. 2.99). If no price is found, return null.
    3. Barcode: Inspect the image closely for any standard visual linear retail barcode (EAN, UPC, or similar product barcode numbers). Read the explicit digits printed beneath or encoded in the lines and extract them as a pure string of numbers. If no barcode is visible, return null.

    Output your response as a strict, valid JSON object with EXACTLY these keys:
    {
      "descriptions": ["Option One", "Option Two", "Option Three", "Option Four", "Option Five", "Option Six", "Option Seven"],
      "detectedPrice": 1.99,
      "barcode": "5012616291647"
    }

    CRITICAL RULE: Return ONLY the raw JSON block. No markdown formatting markers (\`\`\`json), no backticks, no extra conversational conversational context text.
  `;

  const payload = {
    contents: [{
      parts: [
        { text: structuralPrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ]
    }]
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text.trim();
    
    // Safely parse the structured response
    const parsedResult = JSON.parse(rawJsonText);
    
    // 1. Populate the Description Choices
    if (parsedResult.descriptions && Array.isArray(parsedResult.descriptions)) {
      aiWhatSuggestions.value = parsedResult.descriptions;
    }

    // 2. Populate the Barcode Number State Reference
    if (parsedResult.barcode) {
      detectedBarcodeNumber.value = String(parsedResult.barcode).trim();
      logToScreen(`🏷️ Barcode detected by Vision: ${detectedBarcodeNumber.value}`);
    } else {
      detectedBarcodeNumber.value = '';
    }

    // 3. Populate price amount automatically ONLY if it hasn't been set yet (is 0 or empty)
    if (parsedResult.detectedPrice && (!txForm.value.amount || Number(txForm.value.amount) === 0)) {
      txForm.value.amount = Number(parsedResult.detectedPrice);
      logToScreen(`💰 Price automatically populated: £${txForm.value.amount}`);
    }

    logToScreen(`Vision success! Data extracted: ${rawJsonText}`);

  } catch (err) {
    console.error("Gemini Vision Parsing Exception:", err);
    logToScreen(`❌ Vision Engine broken: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

// --- 📍 GPS SMART LOCATOR ENGINE (WHERE SCANNER) ---
function fetchSmartLocationList() {
  if (!navigator.geolocation) {
    alert("Geolocation is completely unsupported by this hardware profile.");
    return;
  }

  isLocating.value = true;
  nearbyShopSuggestions.value = [];
  logToScreen("GPS Module: Requesting high accuracy location tracking coordinates...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      logToScreen(`Location locked! Latitude: ${lat.toFixed(5)}, Longitude: ${lon.toFixed(5)}`);

      try {
        logToScreen("Querying open-source Nominatim reverse geocoder map data...");
        // Fetch matching map data block from free OpenStreetMap API structure
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const response = await fetch(osmUrl, {
          headers: { 'User-Agent': 'KidsAccountsManagerPWA/1.18' }
        });
        const data = await response.json();
        
        const addressBlock = data.address ? JSON.stringify(data.address) : "{}";
        const explicitName = data.name || "";
        const fallbackString = data.display_name || "";

        await processLocationContextWithAI(addressBlock, explicitName, fallbackString);

      } catch (osmErr) {
        logToScreen(`❌ Reverse Geocoding Map request failed: ${osmErr.message}`);
        isLocating.value = false;
      }
    },
    (geoError) => {
      logToScreen(`❌ Core Geolocation Error caught (${geoError.code}): ${geoError.message}`);
      alert("Unable to fetch location details. Ensure PWA location access permissions are enabled on your phone.");
      isLocating.value = false;
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}

async function processLocationContextWithAI(addressJson, explicitName, completeString) {
  if (!cloudGeminiApiKey.value) {
    isLocating.value = false;
    return;
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cloudGeminiApiKey.value}`;

  const promptText = `
    You are a geographical sorting microservice for a ledger application.
    Analyze this openstreetmap data configuration mapping context:
    - Target Point Name: "${explicitName}"
    - Address Payload Breakdown: ${addressJson}
    - Formatted Location Line: "${completeString}"

    Determine the top 3 most likely clean shop names, supermarket chains, parks, or activity venues located here where a child could spend money. 
    Clean up specific store number branches (e.g. use "Sainsbury's" instead of "Sainsbury's Superstore #5543").
    If the business target name "${explicitName}" is a valid commercial shop brand, ensure it occupies index [0] of your output array.
    If it is a purely residential area, suggest options like "Home", "Corner Shop", or "Online".

    Home is close (50m) to this location: @51.4101982,-0.0322811 then first option is "Home" then "Amazon", then "Online", then anything else.

    Output a strict JSON string array format matching exactly this: 
    [\"Store Option A\", \"Store Option B\", \"Store Option C\", \"Store Option D\", \"Store Option E\", \"Store Option F\", \"Store Option G\"].
    No markdown wrappers (\`\`\`json), no trailing text, no extra characters.
  `;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const resData = await response.json();
    const rawJsonText = resData.candidates[0].content.parts[0].text.trim();
    
    const elements = JSON.parse(rawJsonText);
    nearbyShopSuggestions.value = Array.isArray(elements) ? elements : [];
    logToScreen(`GPS Parsing Complete! Extracted options: ${JSON.stringify(nearbyShopSuggestions.value)}`);

  } catch (error) {
    logToScreen(`❌ AI Location mapping failed: ${error.message}`);
  } finally {
    isLocating.value = false;
  }
}

// 🌟 CHANGE: We do NOT create a permanent global instance here anymore.
// We will instantiate it dynamically on-demand to bypass iOS freezes.
let activeRecognitionInstance = null;
function logToScreen(msg, consolelog = false) {
  if(consolelog) {
    console.log(msg);
  }
  if(!debugMode.value) return; // Skip logging if debug mode is off
  appendScreenLog(msg, voiceLogs);
}

function toggleVoiceCapture() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    logToScreen("❌ CRITICAL: SpeechRecognition APIs missing from window context.");
    return;
  }

  if (isListening.value) {
    logToScreen("🛑 Stop button tapped. Wrapping up processing stream gracefully...");
    isListening.value = false;
    
    if (activeRecognitionInstance) {
      try {
        logToScreen("Requesting instance wrap-up via .stop()...");
        // 🌟 CHANGE: Because continuous is true, stop allows WebKit to finish transcribing 
        // the remaining buffer instead of abandoning it instantly!
        activeRecognitionInstance.stop(); 
      } catch (err) {
        logToScreen(`❌ Exception during .stop(): ${err.message}`);
      }
    }
  } else {
    logToScreen("🎤 Start button tapped. Initializing continuous stream module...");
    voiceTranscript.value = '';
    isListening.value = true;

    try {
      activeRecognitionInstance = new SpeechRecognition();
      
      // 🌟 THE FIX FOR iOS STANDALONE: Continuous true maintains the audio context pipeline
      activeRecognitionInstance.continuous = true; 
      activeRecognitionInstance.interimResults = false;
      activeRecognitionInstance.lang = 'en-GB';
      
      logToScreen("📦 Continuous instance built. Wiring event handlers...");

      activeRecognitionInstance.onstart = () => {
        logToScreen("🔔 EVENT: .onstart - Mic channel is officially OPEN.");
      };

      activeRecognitionInstance.onaudiostart = () => {
        logToScreen("🔊 EVENT: .onaudiostart - Audio processing engine is reading bytes.");
      };

      activeRecognitionInstance.onsoundstart = () => {
        logToScreen("🎵 EVENT: .onsoundstart - Sound energy detected.");
      };

      activeRecognitionInstance.onspeechstart = () => {
        logToScreen("🗣 EVENT: .onspeechstart - Speech cadence identified!");
      };

      activeRecognitionInstance.onresult = async (event) => {
        logToScreen("🎉 EVENT: .onresult fired! Processing payload...");
        
        if (!event.results || event.results.length === 0) {
          logToScreen("⚠ Result package returned blank structures.");
          return;
        }
        
        // Loop through matches to catch continuous segments
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        logToScreen(`💬 Matched text string: "${finalTranscript}"`);
        voiceTranscript.value = finalTranscript;

        if (finalTranscript.trim().length > 0) {
          logToScreen("🧠 Dispatching raw text payload to Gemini-2.5-Flash...");
          await parseStructuralTranscriptWithAI(finalTranscript);
         
          // Auto close modal on successfully completing the transaction assignment loop
          isVoiceModalOpen.value = false;
          cleanupInstance();
        }
      };

      activeRecognitionInstance.onerror = (err) => {
        logToScreen(`❌ EVENT ERROR: .onerror triggered! Reason: "${err.error}"`);
        // If iOS fires a 'no-speech' timeout error, don't break, just clean up
        if (err.error === 'no-speech') {
          logToScreen("ℹ Notice: No speech detected by system before timeout threshold.");
        }
        cleanupInstance();
      };

      activeRecognitionInstance.onend = () => {
        logToScreen("⌛ EVENT: .onend - Lifetime sequence finished.");
        cleanupInstance();
      };

      logToScreen("🚀 Executing activeInstance.start()...");
      activeRecognitionInstance.start();

    } catch (startError) {
      logToScreen(`❌ CRITICAL: Startup allocation broke: ${startError.toString()}`);
      cleanupInstance();
    }
  }
}

function closeVoiceModal() {
  isVoiceModalOpen.value = false;
  cleanupInstance();
  logToScreen("🚪 Voice diagnostic tray collapsed.");
}
// 🌟 CRITICAL: Garbage collection routine ensures iOS releases the microphone resource completely
function cleanupInstance() {
  isListening.value = false;
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.abort();
      logToScreen("🧹 Forced cleanup: .abort() run on instance context.");
    } catch(e) {}
    activeRecognitionInstance = null;
    logToScreen("🗑 Memory Sanitized: activeRecognitionInstance set to null.");
  }
}

function toggleExamples() {
  showExamples.value = !showExamples.value;
  window.localStorage.setItem('showExamples', (showExamples.value ? 'show' : 'hide'));
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
      dashError.value = "No speech text detected. Please speak closer to your microphone phone node.";
    }
  } 

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
} else {
  console.log("Speech recognition is not supported in this browser. Please use a compatible browser or device to access voice features.");
};


// 🧠 THE STRUCTURED AI PARSING PIPELINE
async function parseStructuralTranscriptWithAI(text) {
   dashError.value ="";
  // Check if the key has been synchronized yet
  if (!cloudGeminiApiKey.value) {
    dashError.value = "Voice Engine Error: Gemini API key has not synchronized from the spreadsheet config yet.";
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
    
    if actionType is missing or cannot be determined, default to "withdrawal". If amount is missing or cannot be determined, default to 0. If what or where are missing, default to empty strings.
    if actionType is deposit but what is empty, set what to "Extra Allowance" by default. 
    if where is empty but actionType is deposit, set where to "Home" by default.

    The only two children are Eve and Jason (or Tester), so if the text mentions either name or a close variation, assign the correct child ID. If no child is mentioned, return an empty string for targetChildId.

    A phrasing could also be like or similar to: Jason bought a toy from Tesco for 15 pounds 50 pence. In this case, actionType is withdrawal (because money is leaving the account), amount is 15.50, targetChildId matches Jason's ID, what is "toy", and where is "Tesco".  
    or  Evie earned 10 pounds because she tidied her room. In this case, actionType is deposit (because money is entering the account), amount is 10.00, targetChildId matches Eve's ID, what is "tidy room", and where is "Home" (because it is a deposit with no location specified).

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
    if(response.ok) {    
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
        showTranscript.value = true;
      } else {
        dashError.value = "AI was unable to distinctly identify which child this transaction belonged to. Please adjust manually or try again.";   
        showIfProblem.value = true; // Show the transcript review section to the user in case they need to manually copy it over to the form
      }
    } else {
      console.error("AI Parsing API Error:", responseData); 
       showIfProblem.value = true;
       dashError.value = "AI Parsing Error: " + (responseData.error.message || "Unknown error occurred while parsing the spoken input.");
    }

  } catch (error) {
    console.error("AI Dictation Parser Failure:", error);   
    dashError.value ="Parsing Error: Could not cleanly break down spoken template values. Please enter manually or try again.";   
    showIfProblem.value = true; 
  } finally {
    isLoading.value = false; // Clear loading scrim indicator
  }
}


// Add a reactive array to store the authorized fingerprints coming from the server
const authorizedDevices = ref([]);

function backToDashboard() {
  selectedChildId.value = null;
  txForm.value.receiptImageBase64 = '';
  currentScreen.value = 'dashboard';
  if (window.history.state?.screen && window.history.state.screen !== 'dashboard') {
    window.history.replaceState({ screen: 'dashboard' }, '');
  }
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
  return !isAuthenticated.value;
});


// --- 1. USER PERSISTENCE LIFECYCLES ---
function saveUserPreference() {
  localStorage.setItem('pocket_money_active_user', currentUser.value);
}



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
  /*
  if (currentInput) {
    const search = String(currentInput).toLowerCase().trim();
    uniqueItems = uniqueItems.filter(item => item.toLowerCase().includes(search));
  }
    */

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
  return isOnline.value &&  (childTx.length > 0 && childTx[0].id === txId);
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

async function flushPendingQueue() {
  if (pendingQueue.value.length === 0) return;
  
  logToScreen(`🚀 Flushing ${pendingQueue.value.length} pending transaction(s) to the cloud spreadsheet...`);
  
  // Make a clone of the array to loop through sequentially
  const queueToProcess = [...pendingQueue.value];
  
  for (const tx of queueToProcess) {
    try {
      const networkPayload = {
        action: "addTransaction",
        fingerprint: deviceFingerprint.value,
        id: tx.id,
        childId: tx.childid,
        date: tx.date,
        what: tx.what,
        where: tx.where,
        type: tx.type,
        amount: tx.amount,
        recordedBy: tx.recordedby,
        utcTimestamp: tx.timestamp,
        receiptImageBase64: ""
      };

      const response = await fetch(SHEET_API_URL, {
        method: "POST",
        body: JSON.stringify(networkPayload)
      });
      const result = await response.json();

      if (result.status === "success" || result.status === 200) {
        // Remove item from our active reactive queue array
        pendingQueue.value = pendingQueue.value.filter(item => item.id !== tx.id);
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(pendingQueue.value));
        
        // Remove pending sync flag from active dashboard UI array lists
        const localTx = transactions.value.find(t => t.id === tx.id);
        if (localTx) delete localTx.isPendingSync;
      }
    } catch (err) {
      console.error("Outbox flush stalled:", err);
      logToScreen("⚠️ Outbox flush stalled. Waiting for a more stable connection connection window.");
      return; // Stop processing loop if network drops again mid-flush
    }
  }

  logToScreen("🎉 All offline transactions have been synchronized successfully!");
  saveDataCacheToDisk();
  fetchSyncDatabase(false); // Run full foreground update to refresh calculated ledger stats
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
  if (!childForm.value.name.trim()) return;
  isLoading.value = true;
  
  try {
    const uniqueChildId = 'c_' + Date.now();
    const newChild = {
      action: "createChild",
      fingerprint: deviceFingerprint.value || "unknown-device",
      id: uniqueChildId,
      name: childForm.value.name.trim(),
      
      // If your code.gs matches explicit column keys, make sure these match your sheet header names:
      startamount: Number(childForm.value.startAmount) || 0,
      weeklyallowance: Number(childForm.value.weeklyAllowance) || 0
    };
    
    isLoading.value = true;
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(newChild)
    });

    const result = await response.json();
      
    if (result.status === "success") {
      logToScreen("🎉 Child profile written to sheet successfully!");
      
      // Reset form variables
      childForm.value = { name: '', startAmount: 0, weeklyAllowance: 0 };
      
      // Return back to dashboard grid screen safely
      currentScreen.value = 'dashboard';
      
      // Refresh local view data models from database
      await fetchSyncDatabase();
    } else {
      throw new Error(result.message || "Spreadsheet processing rejected form write.");
    }

  } catch (err) {
    console.error("Child account registration failure:", err);
    alert(`❌ Could not save child account: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateTransaction() {
  if (!txForm.value.amount || !selectedChildId.value) return;

  const transactionId = 'tx_' + Date.now();
  const optimisticTx = {
    id: transactionId,
    childid: String(selectedChildId.value),
    date: txForm.value.date || new Date().toISOString().split('T')[0],
    what: txForm.value.what.trim(),
    where: txForm.value.where?.trim() || '-',
    type: txForm.value.type,
    amount: Number(txForm.value.amount),
    recordedby: currentUser.value || 'System',
    timestamp: new Date().toISOString(),
    fileurl: '',
    // Mark it locally so the UI can stylize or identify it as unsynced
    isPendingSync: !isOnline.value 
  };

  // 1. Instantly update the UI feed and clear inputs
  transactions.value.unshift(optimisticTx);
  txForm.value = { date: txForm.value.date, what: '', where: '', type: 'withdrawal', amount: null, receiptImageBase64: "" };

  // Update master read cache
  saveDataCacheToDisk();

  // 2. SCENARIO A: If device is completely offline, intercept and queue right away
  if (!isOnline.value) {
    pendingQueue.value.push(optimisticTx);
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(pendingQueue.value));
    logToScreen("💾 Saved transaction to offline outbox. Will sync automatically when online.");
    return;
  }

  // 3. SCENARIO B: Online dispatch path with automated fallback if request fails mid-flight
  sendTransactionToCloud(optimisticTx);
}

/**
 * Handles the async network post for a specific transaction
 */
function sendTransactionToCloud(txPayload) {
  const networkPayload = {
    action: "addTransaction",
    fingerprint: deviceFingerprint.value,
    id: txPayload.id,
    childId: txPayload.childid,
    date: txPayload.date,
    what: txPayload.what,
    where: txPayload.where,
    type: txPayload.type,
    amount: txPayload.amount,
    recordedBy: txPayload.recordedby,
    utcTimestamp: txPayload.timestamp,
    receiptImageBase64: "" // Safe exclusion for rapid offline math operations
  };

  fetch(SHEET_API_URL, {
    method: "POST",
    body: JSON.stringify(networkPayload)
    // Removed image data transmission for standard offline baseline mutations
  })
  .then(async (res) => {
    const data = await res.json();
    if (data.status === "success") {
      // Clean up local pending visual state flag
      const target = transactions.value.find(t => t.id === txPayload.id);
      if (target) delete target.isPendingSync;
      saveDataCacheToDisk();
      fetchSyncDatabase(true); // Sync totals in background
    } else if (data.status === 403) {
      purgeLocalStorageAuth();
    }
  })
  .catch((err) => {
    // If the network request fails unexpectedly, transition to offline state and queue the item
    logToScreen(`📶 Connection dropped during transmission. Moving item to outbox queue.`);
    isOnline.value = false;
    
    // Inject the transaction into the pending sync processing loop array
    txPayload.isPendingSync = true;
    pendingQueue.value.push(txPayload);
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(pendingQueue.value));
    saveDataCacheToDisk();
  });
}

function saveDataCacheToDisk() {
  localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify({
    children: children.value,
    transactions: transactions.value,
    users: users.value,
    config: systemConfig.value
  }));
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

// Inside App.vue script logic handlers:
async function handleCreateUser() {
  if (!newUserFormName.value.trim()) return;
  isLoading.value = true;
  
  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createUser",
        name: newUserFormName.value.trim()
      })
    });
    
    // Clear form and sync local UI state references back down from the database
    newUserFormName.value = "";
    await fetchSyncDatabase(); 
  } catch (err) {
    logToScreen(`❌ User registration pipeline error: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteUser(userName) {
  if (!confirm(`Are you sure you want to revoke system privileges for ${userName}?`)) return;
  isLoading.value = true;
  
  try {
    await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteUser",
        name: userName
      })
    });
    await fetchSyncDatabase();
  } catch (err) {
    logToScreen(`❌ Deletion failure: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

function cancelInlineEdit() { editingTxId.value = null; }
function getTodayString() { return new Date().toISOString().split('T')[0]; }
function navigateToLedger(childId) {
  showTranscript.value = false;
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
  
  const startingVal = Number(child.startamount || 0);
  
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


</script>

<style scoped>

</style>