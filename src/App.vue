<template>
  <div v-if="isLoading" class="wait-scrim-overlay">
    <div class="scrim-spinner-box">
      <div class="scrim-spinner"></div>
      <p>Refreshing...</p>
    </div>
  </div>

  <h1 class="app-title"  :class="{ 'offline': !isOnline }"> 
    <button v-if="currentScreen !== 'dashboard'" @click="backToDashboard"  class="btn btn-back-nav">⬅ Back</button> 
    <span class="h1s">Kids Accounts  <span class="versionno">v{{ appVersion }}</span></span>      

      <div class="user-selector-and-refresh-group"> 

        <div class="user-selector">
          <label for="global-user" id="global-user-label">User:</label>
          <select id="global-user" v-model="currentUserId" @change="onUserChange">
            <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
          </select>
        </div>
      </div>

      <div>
     

        <ActionMenu 
        :debug-mode="isDebugEnabled"
        :show-help="isSpeechHelpVisible"
        :isOnline="isOnline"
        :currentUser="currentUser"
        @navigate="(screen) => currentScreen = screen"
        @refresh="fetchSyncDatabase"
        @request-add-child="openProfileEditorForNewChild"
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
        >{{ isOnline ? '🤑' : '😢' }}</button>  
      </div>
  </h1>

  <div id="app">
    <div v-if="isDeviceUnauthorized" class="card auth-warning-card">
      <h4>🔒 Authorizing this device ... please wait</h4>
      <p>This is your devive fingerprint: <div class="fingerprint-badge" style="display:inline-block">
        <code>{{ deviceFingerprint }}</code>
      </div></p>
      <div>
        <button @click="requestAuth" class="btn btn-primary request-auth-btn" v-if="!requestSent">
            Request Authorisation
        </button>
        <p v-if="requestSent">Request sent! An administrator must now approve this device in the Device Manager.</p>

        <button @click="refreshAuthStatus" class="btn btn-primary refresh-auth-btn" :disabled="isChecking">
        {{ isChecking ? 'Verifying...' : 'Refresh' }}
        </button>
      </div>
      
    </div>

    <div v-else>
      <!-- GLOBAL TOP NAV BAR -->
      <header class="app-header">
               
        <div  v-if="currentScreen === 'ledger' && selectedChild"  class="ledger-header">
          <div class="child-summary">
             <img :src="resolveAndCacheAvatar(selectedChild)"
              width="60" height="60" class="rowimg" @click.stop="openProfileEditor(selectedChild)" />

              <div  :style="`border-bottom: 2px solid ${selectedChild.accentcolor} !important;`"                
                  class="balance-badge" :class="calculateBalance(selectedChild.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">
                
                <span class="childsName" :style="{ color: selectedChild.accentcolor }">{{ selectedChild.name }}</span>           
                <span class="balancelabel">Balance</span>
                <span class="currency"> £</span>              
                <strong class="currency-balance">
                  {{ calculateBalance(selectedChild.id).toFixed(2) }}</strong>
              </div>    
            </div>  
        </div>

        <div v-else class="offlinebanner">
          <div v-if="!isOnline" class="offlinebanner">

            <div class="offline-banner">
              <span class="offline-icon">⚠️</span> <b>Offline Mode</b><br>
              Data might not be up-to-date. AI features are suspended (Dictation, Camera, Location). 
              <p>Transaction can be logged and will automatically by synced when back online.</p>

            </div>
          </div>
        </div>

      </header>

      <main class="app-container">

        <div v-if="isLoading" class="loading-overlay-indicator">
        🔄 Processing & Syncing Spreadsheet Cloud Database Engine...
        </div>
      
        <div v-if="isPasswordModalOpen" class="modal-overlay">
        <div class="card" style="background: #450b0b;">
          <h3>Enter Password for <em style="color:cyan">{{ resolveUserName(pendingUserId) }}</em></h3>
          <div style="display: flex; gap: 8px;"> 
          <input type="password" v-model="passwordInput" placeholder="Password" autofocus />
          <button @click="verifyPassword" class="btn btn-primary"  style="padding:4px;">Unlock</button>
          <button @click="isPasswordModalOpen = false" class="btn btn-secondary"  style="padding:4px;">Cancel</button>
          </div>
          <p v-if="passwordError" class="error-message">{{ passwordError }}</p>
        </div>
      </div>

        <AddChildSettings 
          v-if="currentScreen === 'addChildSettings'"
          v-model="childForm"
          @submit="handleCreateChild"
        />
      
        <AddUserSettings 
          v-if="currentScreen === 'addUserSettings'"
          v-model="newUserFormObject"
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

        <DeviceAuthManager 
          v-if="currentScreen === 'deviceAuth'"
          :api-url="SHEET_API_URL"
          :fingerprint="deviceFingerprint"
          :is-online="isOnline"
          @trigger-refresh="fetchSyncDatabase(true)"
        />

        <!-- VIEW 3: DASHBOARD (One Kid Per Row Layout) -->
        <section v-if="currentScreen === 'dashboard'" class="screen dashboardscreen">
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

          <div class="card list-card" :style="(showExamples || isSpeechHelpVisible) ? 'padding-bottom: 360px;' : 'padding-bottom: 120px;'">            
            <div v-if="dashError" class="dashboard-error-banner" @click="dashError = ''">
              <p>{{ dashError }}</p>
            </div>
            <p v-if="children.length === 0" class="empty-state">No accounts created yet. Use the "+ Add Child" tab above.</p>
            
            <div v-else class="dashboard-rows-container">
              <div v-for="child in children" :key="child.id" class="child-row-layout">
                <div class="child-row-click-area" @click="navigateToLedger(child.id)">
                  <img :src="resolveAndCacheAvatar(child)" class="child-avatar child-avatardash" width="60" height="60"/>
                 
                  <div class="child-row-info">                    
                    <h3 :style="`color:${child.accentcolor};`">{{ child.name }} </h3>
                    <span class="allowance-label"><span class="allowance-label-text">Allowance:</span>
                      {{ formatCurrency(child.allowanceamount) }}/{{ child?.allowanceinterval === "weekly" ? "wk" : "mo" }}</span>
                    <button  v-if="currentUser.role == 'admin' || currentUser.role == 'super'"
                      type="button" 
                      @click.stop="openProfileEditor(child)" 
                      class="btn-settings-gear-accent">⚙️</button>
                  </div>
                  <div class="child-row-balance" :class="calculateBalance(child.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">          
                    <span>{{ formatCurrency(calculateBalance(child.id)).split('.')[0] }}</span>
                    <span class="currency-decimal">.{{ formatCurrency(calculateBalance(child.id)).split('.')[1] }}</span>
                  </div>
                </div>
               </div>
            </div>

            <button 
              type="button" id="add-child-btn"
              @click="openProfileEditorForNewChild" 
              v-if="currentUser.role == 'admin' || currentUser.role == 'super'" class="btn btn-submit-tx addc">  ➕ Add New Child Account</button>
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
              ><span>
                {{ isListening ? '🛑' : '🎤' }}
              </span>
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
               <select v-model="txForm.type" class="form-input" style="width:min-content;">
                <option value="withdrawal">Withdrawal (-)</option>
                <option value="deposit">Deposit (+)</option>
                <option value="transfer">Send to child (>)</option>
              </select>
              </div>

              <div v-if="txForm.type === 'transfer'" class="form-group dynamic-recipient-wrapper" style="grid-column: 1 / 3">
                <label>Recipient Child</label>
                <select v-model="txForm.recipientChildId" class="form-input">
                  <option value="" disabled>-- Select Recipient --</option>
                  <option  v-for="child in children.filter(c => String(c.id) !== String(selectedChildId))" 
                    :key="child.id" 
                    :value="child.id">
                    {{ child.name }} (£{{ calculateBalance(child.id).toFixed(2) }})
                  </option>
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
                  ref="hiddenCameraInput" 
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

              <button type="button"          
                 @click="handleCreateTransaction" class="btn btn-primary log-submit-btn  " 
                 :class="{ 'Deposit': txForm.type === 'deposit', 'Withdraw': txForm.type === 'withdrawal', 'Transfer': txForm.type === 'transfer' }">
                  {{ txForm.type === 'transfer' ? 'Send' : (txForm.type === 'deposit' ? 'Deposit'  : 'Withdraw') }}
                </button>
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
                    <option value="send">Send</option>
                    <option value="receive">Receive</option>
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
                  <div class="text-left">By</div>
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
                    'clickable-last-row': isLastTransaction(tx.id),
                    'image-preview': (isOnline && tx.fileurl && tx.fileurl.startsWith('http'))
                  }"
                  :title="(isOnline && tx.fileurl && tx.fileurl.startsWith('http')) ? 'Click to view receipt image' : 
                  (isLastTransaction(tx.id) ? 'Click to edit transaction': '')"
                  :style="showMetaFields ? 'grid-template-columns:80px 1fr 1fr 90px 110px  80px 140px 90px' : 'grid-template-columns: 80px 1fr 1fr 90px 110px'"
                  @click="handleRowClick(tx)" >
                  <!-- Pinned Save Action Bar for desktop rows editing state controls -->
            
                  <!-- Row display logic / Form fields toggle during row selections -->
                  <template v-if="editingTxId !== tx.id">
                    <div class="text-left">{{ formatDate(tx.date, true) }}</div>
                    <div class="text-left"><b v-if="!(isOnline && tx.fileurl && tx.fileurl.startsWith('http'))">🛒</b>
                      <b class="camera" v-if="isOnline && tx.fileurl && tx.fileurl.startsWith('http')">📸</b>
                       {{ tx.what }}                      
                      <p class="onlyMobile locationP"><b v-if="tx.where.trim() != '-' &&  tx.where.trim() != ''">🏪</b> {{ (tx.where.trim() == "-") ? '' : tx.where  }}</p>
                    </div>
                    <div class="text-left where">{{ (tx.where.trim() == "-") ? '' : tx.where }}</div>
                    <div class="text-left where">{{ tx.type  }}</div>
                    <div style="font-size: 16px !important;" class="text-right" :class="(tx.type === 'deposit' || tx.type === 'receive')? 'pos-dark-text' : 'neg-text'">
                      {{ ((tx.type === 'deposit' || tx.type === 'receive') ? '+' : '-') }}{{ formatCurrency(tx.amount) }}
                    </div>
                    <template v-if="showMetaFields">
                      <div class="meta-cell text-left ">{{ resolveUserName(tx.recordedby) }}</div>
                      <div class="meta-cell text-left">{{ tx.device }}</div>
                      <div class="meta-cell text-left">{{ formatTimestamp(tx.timestamp) }}</div>
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
                :style="showMetaFields ? 'grid-template-columns:80px 1fr 1fr 90px 110px  80px 140px 90px' : 'grid-template-columns: 80px 1fr 1fr 90px 110px'" >
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

  <ChildProfileModal
    :is-open="isChildEditorOpen"
    :initial-child-data="selectedEditChild"
    :avatars-list="avatars"
    :has-transactions="checkChildHasTransactions(selectedEditChild?.id)"
    @close="isChildEditorOpen = false"
    @save="handleSaveChildProfile"
    @delete="handleDeleteChildProfileFromServer"
    @upload-avatar="handleAvatarDirectUpload"
  />

   
   <SystemConfirm ref="confirmDialog" />
   <DialogModal ref="dialogModal" />
</template>

<script setup>

//#region IMPORTS & INITIALIZATION

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

import DialogModal from '@/components/DialogModal.vue';
import ImageLightbox from '@/components/ImageLightbox.vue';
import AddChildSettings from '@/components/AddChildSettings.vue';
import AddUserSettings from '@/components/AddUserSettings.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import BackupSettings from '@/components/BackupSettings.vue';
import ChildProfileModal from '@/components/ChildProfileModal.vue';
import SystemConfirm from '@/components/SystemConfirm.vue';
import DeviceAuthManager from '@/components/DeviceAuthManager.vue';

import { 
  formatCurrency, 
  formatTimestamp,
  formatDate, 
  formatDateMobile,
  generateDeviceFingerprint, 
  appendScreenLog,
  filterAndSortTransactions,
  getRawImageUrl,
  applyTransactionFilters,
  generateUniqueList,
  getTodayString
} from './utils/helpers';
import { triggerSystemAlert, closeDialog } from './utils/dialogState.js';
import ActionMenu from '@/components/ActionMenu.vue';
const appVersion = __APP_VERSION__;
// Assure you have matching flags linked to control toggles:
const isDebugEnabled = ref(false); // Controls local screen log views
const debugMode = ref(false);
const isSpeechHelpVisible = ref(false); // Controls collapsed help view block
const confirmDialog = ref(null);
// Reactive toggle controlling the visibility layout frame
const isAboutOpen = ref(false);
// paste your Google App Script deployed endpoint web app URL here
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzg05Y22_KksejVZzQBeq0coDyFn4LvMAbKnsijv8x9LJqaUyCAL-AuK4kPOorm6S0P/exec';


const currentScreen = ref('dashboard');
const selectedChildId = ref(null);
const showMetaFields = ref(false);
const activeHelper = ref(null);

const users = ref([ { id : "Dad", name: "Stephan", role: "super"}, {id: "Mum", name: "Matina", role: "admin"}]);
const currentUserId = ref('Dad');
const currentUser = ref({ id: "Dad", name: "Stephan", role: "super"});

const children = ref([]);
const transactions = ref([]);

const editingTxId = ref(null);
const editForm = ref({ date: '', what: '', where: '', type: 'withdrawal', amount: 0 });

const newUserFormObject = ref({ name: '', role: 'user', pass: '' });
const txForm = ref({
  date: new Date().toISOString().split('T')[0],
  what: '',
  where: '',
  type: 'withdrawal',
  amount: null,
  recipientChildId: '',
  receiptImageBase64: '' // Cleaner match
});

const AVATAR_CACHE_KEY = "vault_avatar_cache";

const avatarBase64Cache = ref(JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || "{}"));
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
const requestSent = ref(false);
const voiceTranscript = ref('');
const showIfProblem = ref(false); // Flag to show transcript review only when needed
const voiceLogs = ref([]); // 🌟 NEW: Array to hold on-screen telemetry logs
const systemLogs  = ref([]);
const showExamples = ref((window.localStorage.getItem('showExamples') ?  ((window.localStorage.getItem('showExamples') === 'show') ? true : false) : true) );
const cloudGeminiApiKey = ref('');
const dashError = ref('');
let recognition = null;
const pendingUserId = ref(null);
const passwordInput = ref('');
const isPasswordModalOpen = ref(false);

const systemConfig = ref({});
const isLoading = ref(false);
const isAuthenticated = ref(false);
const deviceFingerprint = ref("");
const passwordError = ref("");

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

// --- 🌟 ADVANCED CHILDREN MANAGEMENT STATES ---
const isChildEditorOpen = ref(false);
const selectedEditChild = ref(null);
const avatars = ref([]);
const childForm = ref({
  id: '',
  name: '',
  aliases: '',
  status: 'active',
  interestRate: 0.005,
  allowanceAmount: 0,
  allowanceInterval: 'weekly',
  allowanceNextDate: '',
  comment: '',
  avatarFileId: '',
  accentColor: '#38bdf8'
});

// Image Crop Workspace Reference Handles
const imageFileInput = ref(null);
const cropCanvas = ref(null);
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const hiddenCameraInput = ref(null);
const authorizedDevices = ref([]);
let rawImageElement = null; // Memory allocation handle for image files
let activeRecognitionInstance = null;
const isChecking = ref(false);



onMounted(() => {
  // 1. Device fingerprint verification logic
  let fp = localStorage.getItem('pocket_money_fingerprint');
  if (!fp) {
    fp = `fp-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('pocket_money_fingerprint', fp);
  }
  deviceFingerprint.value = fp;
  console.log("Your Device Authorization Fingerprint is:", fp);
  
  // 2. Recall saved user preference from localstorage
  const savedUser = localStorage.getItem('pocket_money_active_user');
  if (savedUser && users.value && users.value.find(u => u.id === savedUser)) {
    currentUser.value = users.value.find(u => u.id === savedUser);
    currentUserId.value = savedUser;
  } else {
    currentUserId.value = 'Dad'; // Default fallback
    currentUser.value = users.value.find(u => u.id === 'Dad');
  }

  // 3. Instantly pull and mount whatever dataset resides in local storage
  initializeAppCache();
  initializeOfflineQueue();
  
  // 4. Initial active network state ping check
  checkNetworkConnectivity();

  // 5. Bind native browser visibility and connectivity triggers
  window.addEventListener('online', checkNetworkConnectivity);
  window.addEventListener('offline', handleDeviceOfflineEvent);

  // 6. Polling interval to ensure connectivity state stays synchronized (Check every 15s)
  const networkCheckInterval = setInterval(checkNetworkConnectivity, 15000);

  // 7. Background synchronization when browser app regains viewport focus
  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', triggerBackgroundRefresh);

  // 8. Establish a baseline layout state and bind navigation listeners
  window.history.replaceState({ screen: 'dashboard' }, '');
  window.addEventListener('popstate', handleHardwareBackButton);

  // 9. Initial live data fetch (fills background if authed, prompts foreground validation if cold) 
  loadFromLocalStorage();
  if (navigator.onLine) {
    fetchSyncDatabase(isAuthenticated.value);
  }
  
  window.triggerSystemConfirm = (msg, title) => {
    if (confirmDialog.value) {
      return confirmDialog.value.triggerSystemConfirm(msg, title);
    } else {
      console.warn("SystemConfirm component is not mounted yet.");
      return Promise.resolve(false); // Return false if not ready
    }
  };

  // 🛡️ Watcher: Keeps the Next Scheduled Payment locked to your rules automatically
  /**
   * Watcher for allowance interval updates.
   * Automatically recalculates the next milestone date when the interval changes.
   */
  watch(() => childForm.value?.allowanceInterval, (newInterval) => {
    // Only auto-calculate if the editor is active and the interval has a valid value
    if (isChildEditorOpen.value && newInterval) {
      
      // Safety: Only overwrite the date if it's currently empty, 
      // or if the user hasn't explicitly set a custom date yet.
      // If you always want to force-recalculate, remove the !childForm.value.allowanceNextDate check.
      if (!childForm.value.allowanceNextDate) {
        childForm.value.allowanceNextDate = calculateTargetMilestone(newInterval);
        logToScreen(`📅 Milestone updated to ${childForm.value.allowanceNextDate} based on ${newInterval} interval.`);
      }
    }
  });

  // 🔄 BROWSER & ANDROID BACK BUTTON INTERCEPT ROUTER
  watch(currentScreen, (newScreen) => {
    // If the target view is the root dashboard panel...
    if (newScreen === 'dashboard') {
      // Check if the current browser history point thinks we are still on a sub-screen
      if (window.history.state?.screen && window.history.state.screen !== 'dashboard') {
        // 🌟 FIX: Instead of pushing a fresh state, we gracefully synchronize our history track back to baseline
        console.log("🔄 Synchronizing state baseline: browser history normalized to dashboard.");
      }
      return;
    }

    // 🌟 SECURITY CHECK: Only push a fresh state marker if it isn't already present at the top of the browser stack.
    // This completely eliminates the infinite back-button navigation loop bug.
    if (window.history.state?.screen !== newScreen) {
      window.history.pushState({ screen: newScreen }, '');
      appendScreenLog(`History state pushed for screen: ${newScreen}`, systemLogs);         
    }
  });

  // =========================================================================
  // 🌟 CLEANUP SEGMENT: Executed safely when the component unmounts
  // =========================================================================
  onUnmounted(() => {
    clearInterval(networkCheckInterval);
    
    window.removeEventListener('online', checkNetworkConnectivity);
    window.removeEventListener('offline', handleDeviceOfflineEvent);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', triggerBackgroundRefresh);
    window.removeEventListener('popstate', handleHardwareBackButton);
  });
});

function fixParsedUsers(parsedUsers) {
  if (parsedUsers && Array.isArray(parsedUsers) && parsedUsers.length > 0) {
    return parsedUsers.map(u => {
      if (typeof u === "string") {
        return { id: u, name: u, role: (u === "Dad") ? "super" : ((u === "Mum") ? "admin" : "user") };
      }
      return u;
    });
  }
  return [ { id : "Dad", name: "Stephan", role: "super"}, {id: "Mum", name: "Matina", role: "admin"}]; // Default fallback
}

function loadFromLocalStorage() {
  const cachedData = localStorage.getItem("vault_cached_dataset");

  let parsedUsers = []
  if(cachedData) {    
      const parsed = JSON.parse(cachedData);  
      parsedUsers = fixParsedUsers(parsed?.users);
      
      children.value = parsed?.children || [];        
      transactions.value = parsed?.transactions || [];          
      users.value = parsedUsers;     
      avatars.value = parsed?.avatars  || [];          
      systemConfig.value = parsed?.config || {};                       
      cloudGeminiApiKey.value = systemConfig?.value?.geminiApiKey || "";         
  }
}

function initializeAppCache() {
  console.log("initializeAppCache executing...");

  const cachedData = localStorage.getItem("vault_cached_dataset");
  
  if (!cachedData) {
    console.log("ℹ️ No local cache dataset found. Ready for first network pull.");
    // Initialize clean baseline types so templates don't crash rendering empty frames
    children.value = [];
    transactions.value = [];
    users.value = [ { id : "Dad", name: "Stephan", role: "super"}, {id: "Mum", name: "Matina", role: "admin"}]; // Default fallback personas
    systemConfig.value = {};
    avatars.value = [];
    isAuthenticated.value = false;
    return;
  }

  try {
    loadFromLocalStorage();
    
    // Mark application as initialized with local data
    isAuthenticated.value = true;
    logToScreen("💾 Local Storage dataset loaded. Screen available instantly.");
  

  } catch (e) {
    console.error("❌ Cache read failure:", e);  
    logToScreen("⚠️ Corrupted cache layout encountered. Resetting state files.");
      
    // Trigger security purge to prevent broken state execution loops
  
    purgeLocalStorageAuth();
    isAuthenticated.value = false;
    
  }
}

function initializeOfflineQueue() {
  const savedQueue = localStorage.getItem(OUTBOX_STORAGE_KEY);
  
  if (!savedQueue) {
    // Explicitly guarantee an empty array structure if storage is empty
    pendingQueue.value = [];
    return;
  }

  try {
    const parsedData = JSON.parse(savedQueue);
    
   if (Array.isArray(parsedData)) {
      pendingQueue.value = parsedData;
    } else {
      console.warn("⚠️ Corrupted outbox queue layout: Data was not an array. Resetting.");
      pendingQueue.value = [];
    }
  } catch (e) {
    console.error("❌ Failed to parse offline outbox queue:", e);
    pendingQueue.value = [];
  }
}

// Handler that triggers when a user hits the browser back or Android physical back button
function handleHardwareBackButton(event) {
 
  const currentViewState = currentScreen.value;

  if (currentViewState !== 'dashboard') {
    // Check if the history stack naturally dropped us back to the dashboard state marker
    if (event.state && event.state.screen === 'dashboard') {
      console.log("🎯 History naturally returned to dashboard profile layer. Updating layout state.");
      
      // Update your screen variable directly without adding an extra history layer
      currentScreen.value = 'dashboard';
      if (typeof selectedChildId !== 'undefined') selectedChildId.value = null;
      if (typeof showTranscript !== 'undefined') showTranscript.value = false;
    } else {    
      backToDashboard();
      
    }
  } else {
    // 2. Edge Case: If the user is ALREADY on the root dashboard screen, and they hit a physical back loop... 
  }
}

//#endregion

//#region NETWORK CONNECTIVITY & OFFLINE QUEUE MANAGEMENT

function handleDeviceOfflineEvent() {
  isOnline.value = false;
  logToScreen("📉 Device transitioned offline. Restricted read/write safety rules applied.");  
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && typeof triggerBackgroundRefresh === 'function') {
    triggerBackgroundRefresh();
  }
}

let offlineRetries = 0;
async function checkNetworkConnectivity() {
  // If the browser hardware engine says we are physically disconnected, abort immediately
  if (!navigator.onLine) {
    isOnline.value = false;
    return;
  }
  
  try {
   
    const pingUrl = `${SHEET_API_URL}?action=getDatabase&fingerprint=${encodeURIComponent(deviceFingerprint.value || '')}`;
    
    // We fetch using a small request timeout trick to catch hanging captive portal setups
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second max timeout threshold

    const response = await fetch("https://jsonplaceholder.typicode.com", { 
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // If the network request resolves, but the server drops a bad code, consider us offline
   
    if (!response.ok && offlineRetries > 2) {
      isOnline.value = false;
      return;
    }

    if(!response.ok) {
      offlineRetries++;     
    } else {
      offlineRetries = 0; // Reset retry counter on successful ping
    }

    // If we were previously offline, transition cleanly back to live mode
    if (!isOnline.value) {
      isOnline.value = true;
      logToScreen("🌐 Internet access restored! Initiating outbox queue flush...");
      
      syncPendingTransactions();
    }
  } catch (err) {
    // Catches total network deadzones, failed fetches, or timeout abort errors
    isOnline.value = false;
  }
}

//#endregion

//#region CORE SYNCHRONIZATION & SECURITY LAYER

/**
 * Core synchronization pipeline with optional background capability
 */
const lastSyncTimestamp = ref(0);
const SYNC_COOLDOWN_MS = 30000; // 30 seconds protection window

async function fetchSyncDatabase(isBackground = false) {
  const now = Date.now();
  
  // 1. 🌟 PROTECTION LAYER: Prevent rapid-fire bursts ifCalled too frequently
  if (isBackground && (now - lastSyncTimestamp.value < SYNC_COOLDOWN_MS)) {
    console.log("📶 Background sync skipped: Cooldown active to prevent Google 429 throttling.");
    return; 
  }

  // Track if this specific execution thread owns the loading indicator overlay
  let ownsLoadingState = false;
  if (!isBackground) {
    isLoading.value = true;
    ownsLoadingState = true;
  }

  try {    
    const syncUrl = `${SHEET_API_URL}?action=getDatabase&t=${Date.now()}&fingerprint=${encodeURIComponent(deviceFingerprint.value || '')}`;
    
    // Set a baseline fetch abort timeout of 10 seconds to avoid hanging promises
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(syncUrl, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Update timestamp on network attempt resolution to avoid loop hammering on errors
    lastSyncTimestamp.value = Date.now();
    
    if (!response.ok) {
      if (response.status === 403) {
        isDeviceUnauthorized.value = true;
        return;
      } 
      throw new Error(`Server returned HTTP bad response status code: ${response.status}`);
    }

    const data = await response.json();

    console.log("data:", data);
    // Handle structural authorization purges immediately
    if (data.status === 403 || data.error === "Unauthorized") {  
       purgeLocalStorageAuth();      
      return;
    }

    // 2. 🌟 Process and map server response payload down to reactive states safely
    children.value = Array.isArray(data.children) ? data.children : children.value;
    transactions.value = Array.isArray(data.transactions) ? data.transactions : transactions.value;
    users.value = fixParsedUsers(Array.isArray(data.users) ? data.users : users.value);
    systemConfig.value = (data.config && typeof data.config === 'object') ? data.config : systemConfig.value;
    avatars.value = Array.isArray(data.avatars) ? data.avatars : avatars.value; 
    
    // Map Gemini keys seamlessly into operational endpoints
    cloudGeminiApiKey.value = systemConfig.value.geminiApiKey || systemConfig.value.gemini_api_key || '';
    
    // Track localized completion timestamps for throttled tracking logic downstream
    if (typeof lastSyncTime !== 'undefined') {
      lastSyncTime.value = Date.now();
    }

    // 3. 🌟 Update local disk storage blocks to guarantee asset resilience offline
    localStorage.setItem("vault_cached_dataset", JSON.stringify({
      children: children.value,
      transactions: transactions.value,
      users: users.value,
      config: systemConfig.value,
      avatars: avatars.value
    }));
    isAuthenticated.value = true;
    console.log("💾 Ledger synchronization finalized successfully. Local storage updated.");
  } catch (err) {
    if (!navigator.onLine) {
      loadFromLocalStorage(); // Fallback to cache
    }
    console.error("❌ Network sync exception encountered:", err);
    // Enforce error cooling-off window backoff to protect browser execution threads
    lastSyncTimestamp.value = Date.now() - (SYNC_COOLDOWN_MS / 2); 
    
    logToScreen(`⚠️ Synchronization bypassed: ${err.message || 'Server unreachable'}. Using cached local view.`);
    
  } finally {
    // 🌟 FIX: Only release the loading state spinner if this execution thread originally set it
    if (ownsLoadingState) {
      isLoading.value = false;
    }
  }
}

/**
 * Wipe authentication cache and lock the dashboard layout
 */
function purgeLocalStorageAuth() {
  console.warn("🚨 Purge Security Triggered: Wiping local ledger authority profiles.");

  // 1. 🌟 FIX: Comprehensively wipe all sensitive application tracks from local storage
  localStorage.removeItem("vault_cached_dataset"); // Storage Key matching baseline records
  
  if (typeof OUTBOX_STORAGE_KEY !== 'undefined') {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } else {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  }

  localStorage.removeItem(AVATAR_CACHE_KEY);
  localStorage.removeItem("vault_geo_location_cache");

  // 2. Clear out all active client operational memory states cleanly
  children.value = [];
  transactions.value = [];
  users.value = [ { id : "Dad", name: "Stephan", role: "super"}, {id: "Mum", name: "Matina", role: "admin"}]; // Revert to safe, default fallback personas
  avatars.value = [];
  
  if (typeof pendingQueue !== 'undefined') {
    pendingQueue.value = [];
  }
  
  if (typeof aiWhatSuggestions !== 'undefined') {
    aiWhatSuggestions.value = [];
  }
  
  if (typeof nearbyShopSuggestions !== 'undefined') {
    nearbyShopSuggestions.value = [];
  }

  // 3. 🌟 FIX: Revert configuration back to an object literal to match its structural schema
  systemConfig.value = {}; 
  cloudGeminiApiKey.value = '';

  // 4. Revoke access status flag and flip screen state safely back to root
  isAuthenticated.value = false;
  
  if (typeof currentScreen !== 'undefined') {
    currentScreen.value = 'dashboard';
  }
  
  if (typeof selectedChildId !== 'undefined') {
    selectedChildId.value = null;
  }

  // 5. Fire modal warning window notification alert to the physical operator
  /*
  triggerSystemAlert(
    "This device is not authorized to view this ledger data.", 
    "🔒 Security Alert"
  );
  */
}


function triggerBackgroundRefresh() {

  if (!isAuthenticated.value) {
    return;
  }

  const referenceTimestamp = typeof lastSyncTimestamp !== 'undefined' ? lastSyncTimestamp.value : 0;  
  const timeSinceLastSync = Date.now() - referenceTimestamp;

  if (timeSinceLastSync >= FIVE_MINUTES_MS) {
    const elapsedSeconds = Math.round(timeSinceLastSync / 1000);
    console.log(`📶 Throttled sync allowed: ${elapsedSeconds}s elapsed since last update. Fetching background data...`);
     
    fetchSyncDatabase(true); // Run silently in the background without UI blocking screens
    
  } else {
    const remainingSeconds = Math.round((FIVE_MINUTES_MS - timeSinceLastSync) / 1000);
    console.log(`📶 Throttled sync blocked: Only ${Math.round(timeSinceLastSync / 1000)}s since last successful sync. Must wait ${remainingSeconds}s.`);
  }
}


async function refreshAuthStatus() {
  isChecking.value = true;
  
  // 1. Re-initialize/Sync again
  // Assuming fetchSyncDatabase(false) triggers the main data load
  await fetchSyncDatabase(false);
  
  isChecking.value = false;
}

/**
 * Triggers an authorization request for the current device.
 * Sends the fingerprint to the server to be added to the pending queue.
 */
async function requestAuth() {

  try {
    logToScreen("Sending authorization request to administrator...");
     requestSent.value = true;
    let response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "requestAuth",
        fingerprint: "request",
        timestamp: new Date().toISOString(),
        requestFingerprint:  deviceFingerprint.value
      })
    });

    let result = await response.json();
    if (result.status === "success") {      
      logToScreen("✅ Authorization request sent successfully. Please ask the administrator to approve this device.");
    } else {
      requestSent.value = false;
      triggerSystemAlert("Failed to submit request.");
    }
  } catch (err) {
    requestSent.value = false;
    console.error("Auth request error:", err);
    triggerSystemAlert(`Request failed: ${err.message}`, "❌ Request Failed");
  } finally {
    // isRequesting.value = false;
  }
}

//#endregion

//#region HELP CARD CONTROLLERS

function toggleHelpState(targetView) {
  if (targetView === 'dashboard') {
    hideHelpDashboard.value = !hideHelpDashboard.value;
    localStorage.setItem('hide_help_dashboard', String(hideHelpDashboard.value));                 
  } else if (targetView === 'detail') {   
    hideHelpDetail.value = !hideHelpDetail.value;    
    localStorage.setItem('hide_help_detail', String(hideHelpDetail.value));     
  }
}

function toggleExamples() {
  showExamples.value = !showExamples.value;
  window.localStorage.setItem('showExamples', (showExamples.value ? 'show' : 'hide'));
} 

function openImagePreviewModal(url) {
  if (!url) return;
  activePreviewUrl.value = "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
  let streamableUrl = url;
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.split('/file/d/')[1].split('/')[0];    
    fetchAvatarProxy(fileId).then(proxyUrl => {
      streamableUrl = proxyUrl;
      activePreviewUrl.value =  streamableUrl;
    }).catch(err => {
      console.error("Avatar proxy fetch failed:", err);      
    });

    // streamableUrl = `https://docs.google.com/uc?export=view&id=${fileId}`;
  }

//  activePreviewUrl.value =  streamableUrl;
  isPreviewModalOpen.value = true;  
}

function closeImagePreviewModal() {
  isPreviewModalOpen.value = false;
  activePreviewUrl.value = '';
}
//#endregion

//#region  Camera Vision Engine (What Scanner) 

function triggerCameraCapture() {
  // 🌟 FIX: Uses native Vue refs instead of probing the global window document layout
  if (hiddenCameraInput.value) {
    hiddenCameraInput.value.click();
  } else {
    console.warn("⚠️ Camera input reference is not yet mounted to the active DOM element.");
  }
}

function handleCameraCapture(event) {
  console.log("handleCameraCapture triggered with event:", event);
  const file = event.target.files[0];
  if (!file) return;

  isLoading.value = true;
  aiWhatSuggestions.value = []; 
  logToScreen(`Camera captured: ${file.name}. Commencing 400px downscaling pass...`);

  // 🌟 FIX 1: Safely clear target value immediately so inputs are clear for subsequent captures
  event.target.value = '';

  const reader = new FileReader();

  // 🌟 FIX 2: Handle FileReader errors to prevent the UI from locking up if file reads fail
  reader.onerror = () => {
    logToScreen("❌ Error reading the camera file asset.");
    isLoading.value = false;
  };

  reader.onload = (e) => {
    const img = new Image();

    // 🌟 FIX 3: Handle Image initialization errors to release the UI loading lock
    img.onerror = () => {
      logToScreen("❌ Error decoding captured image canvas stream.");
      isLoading.value = false;
    };

    img.onload = async () => {
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

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // 🌟 FIX 4: Safety check the 2D context signature to avoid crash injections
      if (!ctx) {
        logToScreen("❌ Unable to initialize off-screen rendering canvas contexts.");
        isLoading.value = false;
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64DataString = canvas.toDataURL("image/jpeg", 0.85);
      const pureBase64Data = compressedBase64DataString.split(",")[1];

      logToScreen(`Resize sequence optimized: Final resolution is ${width}x${height}px.`);
      txForm.value.receiptImageBase64 = pureBase64Data;

      try {
        logToScreen("Sending optimized frame to Gemini Vision parser...");
        await parseImageWithGeminiVision(pureBase64Data, "image/jpeg");
        logToScreen(`Gemini parsing completed. Found ${aiWhatSuggestions.value.length} recommendations.`);
      } catch (geminiError) {
        console.error("⚠️ Gemini receipt analysis failed:", geminiError);
        logToScreen(`AI Parsing Error: ${geminiError.message}`);
      } finally {
        isLoading.value = false;
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function parseImageWithGeminiVision(base64Data, mimeType) {
  console.log("parseImageWithGeminiVision executing with MIME type:", mimeType);
  if (!cloudGeminiApiKey.value) {
    triggerSystemAlert("AI configuration data missing. Please refresh to sync credentials.", "⚠️ Configuration Missing");
    isLoading.value = false;
    return;
  }

  logToScreen("Multimodal Pipeline: Analyzing image text, barcodes, and price data...");
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cloudGeminiApiKey.value}`;

  const structuralPrompt = `
    Analyze this image. Perform these extractions:
    1. Descriptions: Come up with 3 short, clean alternative product description options.
    2. Price: Extract cost as a raw floating-point number (e.g. 2.99). Return null if not found.
    3. Barcode: Extract digits as a pure string of numbers. Return null if not found.

    Output ONLY a raw, valid JSON object with EXACTLY these keys:
    {
      "descriptions": ["Option One", "Option Two", "Option Three"],
      "detectedPrice": 1.99,
      "barcode": "5012616291647"
    }

    CRITICAL RULE: Return ONLY the raw JSON block without markdown, fences, or extra text.
  `;

  const payload = {
    contents: [{
      parts: [
        { text: structuralPrompt },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]
    }]
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    
    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
      throw new Error(`Safety Guardrail Triggered: ${candidate.finishReason}`);
    }

    let rawJsonText = candidate?.content?.parts?.[0]?.text;
    logToScreen("Raw response received from Gemini Vision:" +rawJsonText);
    if (!rawJsonText) throw new Error("Empty response from AI.");

    // CLEANING: Strip everything that isn't the raw JSON object
    rawJsonText = rawJsonText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedResult = JSON.parse(rawJsonText);
    
    if (parsedResult.descriptions && Array.isArray(parsedResult.descriptions)) {
      aiWhatSuggestions.value = parsedResult.descriptions;
    }

    if (parsedResult.barcode) {
      detectedBarcodeNumber.value = String(parsedResult.barcode).trim();
      logToScreen(`🏷️ Barcode detected: ${detectedBarcodeNumber.value}`);
    } else {
      detectedBarcodeNumber.value = '';
    }

    if (parsedResult.detectedPrice && (!txForm.value.amount || Number(txForm.value.amount) === 0)) {
      txForm.value.amount = Number(parsedResult.detectedPrice);
      logToScreen(`💰 Price automatically populated: £${txForm.value.amount}`);
    }

    logToScreen(`Vision success!`);

  } catch (err) {
    console.error("Gemini Vision Parsing Exception:", err);
    logToScreen(`❌ Vision Engine failed: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

//#endregion


//#region Helpers
function logToScreen(msg, consolelog = true) {
  if (consolelog) {
    console.log(`[System]: ${msg}`);
  }

  if (typeof debugMode === 'undefined' || !debugMode.value) {
    return;
  }

  const targetLogs = typeof voiceLogs !== 'undefined' ? voiceLogs : null;
  appendScreenLog(msg, targetLogs);
 
}

/**
 * Updates a transaction form field based on a suggestion helper.
 * Closes the helper menu immediately to improve interface responsiveness.
 */
function selectHelper(field, val) { 
  if (txForm.value.hasOwnProperty(field)) {
    txForm.value[field] = val;      
    logToScreen(`✨ Helper selected: ${field} set to "${val}"`);
    activeHelper.value = null;
  } else {
    console.warn(`Attempted to set non-existent field: ${field}`);
  }
}

/**
 * Toggles the visibility of the suggestion helper menu for a given field.
 * Ensures only one helper menu is open at a time.
 */
function toggleHelper(field) {
  // Prevent interaction if the system is currently processing a request
  if (isLoading.value) return;

  if (activeHelper.value === field) {    
    activeHelper.value = null;
    logToScreen(`📂 Closed ${field} assistant.`);
  } else {   
    activeHelper.value = field;
    logToScreen(`✨ Opened ${field} assistant.`);
  }
}

function closeHelperDeferred() { 
  setTimeout(() => { 
    // Only close if we aren't currently waiting on a network request 
    // that might require the helper menu to remain visible for feedback.
    if (!isLoading.value) {
      activeHelper.value = null; 
    }
  }, 300); 
}

/**
 * Calculates the total current balance for a child.
 * Incorporates the initial starting amount and reconciles all ledger movements.
 */
function calculateBalance(childId) {
  const targetId = String(childId || '').trim();
  
  // 1. Identify the target child with a strict type check
  const targetChild = children.value.find(c => String(c.id || '') === targetId);
  if (!targetChild) return 0;

  // 2. Extract initial balance using flexible key mapping (startamount vs startAmount)
  const initialAmount = Number(targetChild.startamount ?? targetChild.startAmount ?? 0);
  
  // 3. Reconcile transactions
  const netLedger = transactions.value.reduce((total, tx) => {
    // Standardize IDs for comparison
    const txChildId = String(tx.childid ?? tx.childId ?? '').trim();
    
    if (txChildId !== targetId) return total;
    
    const type = String(tx.type ?? '').toLowerCase().trim();
    const amount = Number(tx.amount || 0);
    
    // Categorize transaction types for arithmetic
    if (type === 'deposit' || type === 'receive') {
      return total + amount;
    } else if (type === 'withdrawal' || type === 'send') {
      return total - amount;
    }
    
    return total;
  }, 0);

  // Return the rounded balance to prevent floating-point precision issues
  return Math.round((initialAmount + netLedger) * 100) / 100;
}

function resolveUserName(userId) {
  const user = users.value.find(u => String(u.id).toLowerCase() === String(userId).toLowerCase());
  return user ? user.name : userId;
} 
//#endregion

//#region --- 🎙️ VOICE RECOGNITION ENGINE (WHAT YOU SAY IS WHAT YOU GET) ---

/**
 * Cleanly releases event bindings and aborts active hardware recognition processes.
 */
function cleanupInstance() {
  if (typeof isListening !== 'undefined') {
    isListening.value = false;
  }

  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.onstart = null;
      activeRecognitionInstance.onaudiostart = null;
      activeRecognitionInstance.onsoundstart = null;
      activeRecognitionInstance.onspeechstart = null;
      activeRecognitionInstance.onresult = null;
      activeRecognitionInstance.onerror = null;
      activeRecognitionInstance.onend = null;
      
      activeRecognitionInstance.abort();
    } catch (err) {
      logToScreen(`Bypassed exception during silent abort: ${err.message}`);
    }
    activeRecognitionInstance = null;
  }
  logToScreen("🧹 Speech recognition engine safely disposed.");
}

/**
 * 🌟 NEW HELPER: Instantiates and configures a fresh Speech Recognition engine
 * along with its hardware and callback event handlers.
 * @returns {SpeechRecognition|null}
 */
function createSpeechInstance() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    logToScreen("❌ CRITICAL: SpeechRecognition APIs missing from window context.");
    return null;
  }

  try {
    const instance = new SpeechRecognition();
    
    // Continuous is set to true to maintain the audio context pipeline (especially on iOS)
    instance.continuous = true; 
    instance.interimResults = false;
    instance.lang = 'en-GB'; // Tuned specifically for UK phrasing (Pounds/Pence)
    
    logToScreen("📦 Continuous instance built. Wiring event handlers...");

    instance.onstart = () => {
      logToScreen("🔔 EVENT: .onstart - Mic channel is officially OPEN.");
    };

    instance.onaudiostart = () => {
      logToScreen("🔊 EVENT: .onaudiostart - Audio processing engine is reading bytes.");
    };

    instance.onsoundstart = () => {
      logToScreen("🎵 EVENT: .onsoundstart - Sound energy detected.");
    };

    instance.onspeechstart = () => {
      logToScreen("🗣 EVENT: .onspeechstart - Speech cadence identified!");
    };

    instance.onresult = async (event) => {
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
      } else {
        if (typeof dashError !== 'undefined') {
          dashError.value = "No speech text detected. Please speak closer to your microphone.";
        }
      }
    };

    instance.onerror = (err) => {
      logToScreen(`❌ EVENT ERROR: .onerror triggered! Reason: "${err.error}"`);
      // If iOS fires a 'no-speech' timeout error, don't break, just clean up
      if (err.error === 'no-speech') {
        logToScreen("ℹ Notice: No speech detected by system before timeout threshold.");
      }
      cleanupInstance();
    };

    instance.onend = () => {
      logToScreen("⌛ EVENT: .onend - Lifetime sequence finished.");
      cleanupInstance();
    };

    return instance;

  } catch (err) {
    logToScreen(`❌ CRITICAL: Engine allocation failure: ${err.toString()}`);
    return null;
  }
}

/**
 * Active controller toggling audio capture.
 */
function toggleVoiceCapture() {
  if (isListening.value) {
    logToScreen("🛑 Stop button tapped. Wrapping up processing stream gracefully...");
    isListening.value = false;
    
    if (activeRecognitionInstance) {
      try {
        logToScreen("Requesting instance wrap-up via .stop()...");
        activeRecognitionInstance.stop(); 
      } catch (err) {
        logToScreen(`❌ Exception during .stop(): ${err.message}`);
      }
    }
  } else {
    logToScreen("🎤 Start button tapped. Initializing continuous stream module...");
    voiceTranscript.value = '';
    isListening.value = true;

    // Call our newly wrapped instantiation helper
    activeRecognitionInstance = createSpeechInstance();

    if (activeRecognitionInstance) {
      try {
        logToScreen("🚀 Executing activeInstance.start()...");
        activeRecognitionInstance.start();
      } catch (startError) {
        logToScreen(`❌ CRITICAL: Start command rejected: ${startError.toString()}`);
        cleanupInstance();
      }
    } else {
      isListening.value = false;
    }
  }
}

/**
 * Closes the voice input modal and safely cleans up hardware hooks and active capture loops.
 */
function closeVoiceModal() {
  isVoiceModalOpen.value = false;
  cleanupInstance();
  logToScreen("🚪 Voice diagnostic tray collapsed.");
}

/**
 * 🧠 THE STRUCTURED AI PARSING PIPELINE
 * Processes captured dictation, extracting structural fields into valid transaction parameters.
 */
async function parseStructuralTranscriptWithAI(text) {
  if (typeof dashError !== 'undefined') {
    dashError.value = "";
  }
  
  // Check if the key has been synchronized yet
  if (!cloudGeminiApiKey.value) {
    if (typeof dashError !== 'undefined') {
      dashError.value = "Voice Engine Error: Gemini API key has not synchronized from the spreadsheet config yet.";
    }
    return;
  }
  
  isLoading.value = true; // Engage global cloud loading overlay scrim
  
  const GEMINI_API_KEY = cloudGeminiApiKey.value;   
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // 🌟 DYNAMIC MAPPING: Generate strict matching rules for all registered children and their aliases
  const childMatchRules = children.value.map(c => {
    const aliasList = Array.isArray(c.aliases) ? c.aliases : (c.aliases ? [c.aliases] : []);
    const namesToMatch = [c.name, ...aliasList].map(n => `"${n}"`).join(', ');
    return `- To assign ID "${c.id}", match any of these names/nicknames: [${namesToMatch}] or close sounding phonetic variations.`;
  }).join('\n    ');

  // Build dynamic phrasing examples based on the children actually present in the system
  const exampleOneName = children.value[0]?.name || 'Jason';
  const exampleOneId = children.value[0]?.id || 'jason-id';
  const exampleTwoName = children.value[1]?.name || 'Eve';
  const exampleTwoAlias = Array.isArray(children.value[1]?.aliases) ? (children.value[1].aliases[0] || 'Evie') : (children.value[1]?.aliases || 'Evie');
  const exampleTwoId = children.value[1]?.id || 'eve-id';

  // Structured prompt instructing Gemini to parse natural voice patterns
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
    3. "targetChildId": Assign the child ID based on these strict registered matching rules:
    ${childMatchRules}
    If no child match is found or no child is mentioned, return an empty string "".
    4. "what": The description corresponding to the "for a [what]" segment. Clean up capitalization.
    5. "where": The location or store corresponding to the "from [place]" segment. Clean up capitalization.
    
    if actionType is missing or cannot be determined, default to "withdrawal". If amount is missing or cannot be determined, default to 0. If what or where are missing, default to empty strings.
    if actionType is deposit but what is empty, set what to "Extra Allowance" by default. 
    if where is empty but actionType is deposit, set where to "Home" by default.

    A phrasing could also be like or similar to:
    - "${exampleOneName} bought a toy from Tesco for 15 pounds 50 pence." In this case, actionType is "withdrawal" (since money is leaving), amount is 15.50, targetChildId is "${exampleOneId}", what is "toy", and where is "Tesco".
    - "${exampleTwoAlias} earned 10 pounds because she tidied her room." In this case, actionType is "deposit" (since money is entering), amount is 10.00, targetChildId is "${exampleTwoId}", what is "tidy room", and where is "Home".

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
    
    if (response.ok) {    
      const candidate = responseData?.candidates?.[0];
      if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
        throw new Error(`Content generation blocked by Gemini safety guardrails (Reason: ${candidate.finishReason})`);
      }

      let cleanJsonString = candidate?.content?.parts?.[0]?.text;
      if (!cleanJsonString) {
        throw new Error("No suggestion text returned from location processing engine.");
      }

      cleanJsonString = cleanJsonString.trim();
      
      // Clean Markdown fences safely using hex codes for backticks to prevent compiler errors
      if (cleanJsonString.startsWith("\x60\x60\x60")) {
        cleanJsonString = cleanJsonString.replace(/^\x60\x60\x60(?:json)?\n?/, "").replace(/\n?\x60\x60\x60$/, "").trim();
      }
      
      const result = JSON.parse(cleanJsonString);
      
      // SYNC PARSED DATA TO NATIVE VUE FORM FORMULAS
      if (result.targetChildId) {
        selectedChildId.value = result.targetChildId;
        
        txForm.value.type = result.actionType || 'withdrawal';
        txForm.value.amount = result.amount || 0;
        txForm.value.what = result.what || '';
        txForm.value.where = result.where || '';
        
        currentScreen.value = 'ledger';
        isVoiceModalOpen.value = false;
        showTranscript.value = true;
      } else {
        if (typeof dashError !== 'undefined') {
          dashError.value = "AI was unable to distinctly identify which child this transaction belonged to. Please adjust manually or try again.";   
        }
        if (typeof showIfProblem !== 'undefined') {
          showIfProblem.value = true;
        }
      }
    } else {
      console.error("AI Parsing API Error:", responseData); 
      if (typeof showIfProblem !== 'undefined') showIfProblem.value = true;
      if (typeof dashError !== 'undefined') {
        dashError.value = "AI Parsing Error: " + (responseData.error?.message || "Unknown error occurred while parsing spoken input.");
      }
    }

  } catch (error) {
    console.error("AI Dictation Parser Failure:", error);   
    if (typeof dashError !== 'undefined') {
      dashError.value = "Parsing Error: Could not cleanly break down spoken template values. Please enter manually or try again.";   
    }
    if (typeof showIfProblem !== 'undefined') {
      showIfProblem.value = true; 
    }
  } finally {
    isLoading.value = false; // Clear global loading indicator
  }
}
//#endregion

//#region --- NAVIGATION CONTROLLERS ---
function backToDashboard() {
  selectedChildId.value = null;
  txForm.value.receiptImageBase64 = '';
  currentScreen.value = 'dashboard';
  
  if (window.history.state?.screen && window.history.state.screen !== 'dashboard') {
    window.history.replaceState({ screen: 'dashboard' }, '');
  }
  window.scrollTo(0, 0);
}

/**
 * Navigates to the ledger screen for a specific child.
 * Resets form state and screen context to ensure a clean interaction.
 */
function navigateToLedger(childId) {
  // 1. Reset visual indicators and transcripts
  showTranscript.value = false;
  
  // 2. Clear any lingering inline edit state to prevent UI conflicts
  editingTxId.value = null;

  // 3. Set the target child context
  selectedChildId.value = childId;

  // 4. Initialize clean transaction form state
  // Using today's date and clearing descriptive fields to avoid stale data
  txForm.value = { 
    date: getTodayString(), 
    what: '', 
    where: '', 
    type: 'withdrawal', 
    amount: null,
    receiptImageBase64: '' 
  };

  // 5. Update screen context
  currentScreen.value = 'ledger';
  
  // 6. Scroll to top for a consistent entry point
  window.scrollTo(0, 0);

  // Optional: Add a subtle log for debugging flows
  logToScreen(`📖 Navigated to ledger for child ID: ${childId}`);
}

// Check if this device fingerprint is missing from the authorized list
// const isDeviceUnauthorized = computed(() => {  return !isAuthenticated.value;});

const isDeviceUnauthorized = ref(false); // Only set to true if the server explicitly returns 403

const selectedChild = computed(() => children.value.find(c => c.id === selectedChildId.value || String(c.id) === String(selectedChildId.value)));
//#endregion

//#region Persistence



async function handleCreateChild() {
  if (!childForm.value.name.trim()) return;
  isLoading.value = true;
  
  try {
    const uniqueChildId = 'c_' + Date.now();
    const newChild = {
      action: "createChild",
      fingerprint: generateDeviceFingerprint(),
      id: uniqueChildId,
      name: childForm.value.name.trim(),
      startamount: Number(childForm.value.startAmount) || 0,
      weeklyallowance: Number(childForm.value.weeklyAllowance) || 0
    };
    
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(newChild)
    });

    const result = await res.json();
      
    if (result.status === "success") {
      logToScreen("🎉 Child profile written to sheet successfully!");
      
      childForm.value = { name: '', startAmount: 0, weeklyAllowance: 0 };
      currentScreen.value = 'dashboard';
      
      await fetchSyncDatabase();
    } else {
      throw new Error(result.message || "Spreadsheet processing rejected form write.");
    }
  } catch (err) {
    console.error("Child account registration failure:", err);
    triggerSystemAlert(`Could not save child account: ${err.message}`, "❌ Registration Failed");
  } finally {
    isLoading.value = false;
  }
}

async function syncPendingTransactions() {
  // Check if we have anything to do
  if (pendingQueue.value.length === 0) {
    initializeOfflineQueue();
  }

  if (pendingQueue.value.length === 0) 
  
  if (!isOnline.value) {
    logToScreen("⚠️ Sync attempted while offline. Waiting for connection...");
    return;
  }

  logToScreen(`🔄 Synchronizing ${pendingQueue.value.length} pending transactions...`);

  // Process queue one by one to maintain order and handle errors per item
  while (pendingQueue.value.length > 0) {
    const tx = pendingQueue.value[0]; // Peek at the first item

    try {

      const response = await fetch(SHEET_API_URL, {
            method: "POST",
            body: JSON.stringify({
              action: "addTransaction",
              fingerprint: generateDeviceFingerprint(),
              id: tx.id,
              childId: tx.childid,
              date: tx.date,
              what: tx.what,
              where: tx.where,
              type: tx.type,
              amount: tx.amount,
              recordedBy: tx.recordedby,
              utcTimestamp: tx.timestamp,
              receiptImageBase64: "",
              receiptBase64: ""
            })
          });
    
        const result = await response.json();
        if (result.status === "success") {
          // Success: Remove from queue
            pendingQueue.value.shift();
            localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(pendingQueue.value));
            
            // Update the main transaction list to mark it as synced
            const idx = transactions.value.findIndex(t => t.id === tx.id);
            if (idx !== -1) transactions.value[idx].isPendingSync = false;
            
            logToScreen(`✅ Synced: ${tx.what}`);
          
        } else {
          throw new Error(data.message);
        }   
   
    } catch (err) {
      console.error("Sync failed for transaction:", tx.id, err);    
      break; // Stop the loop so we don't spam the server
    }
  }
  await fetchSyncDatabase(true);
}

async function handleCreateTransaction() {
  if (!txForm.value.amount || !selectedChildId.value) return;
  
  const attachedReceiptImage = txForm.value.receiptImageBase64 || "";
  const timestampId = Date.now();
  const txDate = txForm.value.date || new Date().toISOString().split('T')[0];
  const historyRollback = [...transactions.value];

  // =========================================================================
  // 🌟 CASE A: ATOMIC DUAL TRANSFER
  // =========================================================================
  if (txForm.value.type === 'transfer') {
    if (!txForm.value.recipientChildId) {
      triggerSystemAlert("Please select a recipient child profile.", "⚠️ Selection Required");
      return;
    }
    
    const receiverChild = children.value.find(c => String(c.id) === String(txForm.value.recipientChildId));
    const senderChild = children.value.find(c => String(c.id) === String(selectedChildId.value));
    const groupToken = `trsf_${timestampId}`;
    
    const optimisticSenderRow = {
      id: `tx_send_${timestampId}`,
      childid: String(selectedChildId.value),
      date: txDate,
      what: `${txForm.value.what.trim() || 'Pocket Money Share'} to ${receiverChild?.name || 'Sibling'}`,
      where: txForm.value.where.trim() || '-',
      type: 'send',
      amount: Number(txForm.value.amount),
      recordedby: currentUserId.value || 'System',
      timestamp: new Date().toISOString(),
      transfergroup: groupToken,
      receiptImageBase64: attachedReceiptImage,
      isPendingSync: !isOnline.value
    };

    const optimisticReceiverRow = {
      ...optimisticSenderRow,
      id: `tx_recv_${timestampId}`,
      childid: String(txForm.value.recipientChildId),
      what: `${txForm.value.what.trim() || 'Pocket Money Share'} from ${senderChild?.name || 'Sibling'}`,
      type: 'receive'
    };

    transactions.value.unshift(optimisticSenderRow, optimisticReceiverRow);
    txForm.value = { date: txDate, what: '', where: '', type: 'withdrawal', amount: null, recipientChildId: '', receiptImageBase64: '' };
    saveDataCacheToDisk();

    if (!isOnline.value) {
      pendingQueue.value.push(optimisticSenderRow, optimisticReceiverRow);
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(pendingQueue.value));
      return;
    }

    try {
      const response = await fetch(SHEET_API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "addTransfer",
          fingerprint: generateDeviceFingerprint(),
          transferGroup: groupToken,
          utcTimestamp: optimisticSenderRow.timestamp,
          date: txDate,
          amount: optimisticSenderRow.amount,
          where: optimisticSenderRow.where,
          recordedBy: optimisticSenderRow.recordedby,
          senderId: optimisticSenderRow.id,
          senderChildId: optimisticSenderRow.childid,
          senderWhat: optimisticSenderRow.what,
          receiverId: optimisticReceiverRow.id,
          receiverChildId: optimisticReceiverRow.childid,
          receiverWhat: optimisticReceiverRow.what
        })
      });
      const data = await response.json();
      if (data.status !== "success") throw new Error(data.message);
      
      transactions.value.forEach(t => { if(t.id === optimisticSenderRow.id || t.id === optimisticReceiverRow.id) delete t.isPendingSync; });
      saveDataCacheToDisk();
      fetchSyncDatabase(true);
    } catch (err) {
      logToScreen(`⚠️ Transfer failed, rolling back: ${err.message}`);
      transactions.value = historyRollback;
      saveDataCacheToDisk();
    }
    return;
  }
  
  // =========================================================================
  // 🌟 CASE B: STANDARD SINGLE TRANSACTION
  // =========================================================================
  const optimisticTxRow = {
    id: `tx_${timestampId}`,
    childid: String(selectedChildId.value),
    date: txDate,
    what: txForm.value.what.trim() || (txForm.value.type === 'deposit' ? 'Allowance Drop' : 'Cash Out'),
    where: txForm.value.where.trim() || '-',
    type: txForm.value.type,
    amount: Number(txForm.value.amount),
    recordedby: currentUserId.value || 'System',
    timestamp: new Date().toISOString(),
    transfergroup: '',
    receiptImageBase64: attachedReceiptImage,
    isPendingSync: !isOnline.value
  };

  transactions.value.unshift(optimisticTxRow);
  txForm.value = { date: txDate, what: '', where: '', type: 'withdrawal', amount: null, recipientChildId: '', receiptImageBase64: '' };
  saveDataCacheToDisk();

  if (!isOnline.value) {
    pendingQueue.value.push(optimisticTxRow);
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(pendingQueue.value));
    return;
  }

  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addTransaction",
        fingerprint: generateDeviceFingerprint(),
        id: optimisticTxRow.id,
        childId: optimisticTxRow.childid,
        date: optimisticTxRow.date,
        what: optimisticTxRow.what,
        where: optimisticTxRow.where,
        type: optimisticTxRow.type,
        amount: optimisticTxRow.amount,
        recordedBy: optimisticTxRow.recordedby,
        utcTimestamp: optimisticTxRow.timestamp,
        receiptImageBase64: attachedReceiptImage,
        receiptBase64: attachedReceiptImage
      })
    });
    
    const data = await response.json();
    if (data.status === "success") {
      const target = transactions.value.find(t => t.id === optimisticTxRow.id);
      if (target) delete target.isPendingSync;
      saveDataCacheToDisk();
      fetchSyncDatabase(true);
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    console.error("Transaction delivery failed:", err);
    transactions.value = historyRollback;
    saveDataCacheToDisk();
    triggerSystemAlert(`Failed to record transaction online: ${err.message}`, "❌ Sync Error");
  }
}

function saveDataCacheToDisk() {
  try {
    const data = JSON.stringify({
      children: children.value,
      transactions: transactions.value,
      users: users.value,
      config: systemConfig.value
    });
    localStorage.setItem(DATA_STORAGE_KEY, data);
  } catch (err) {
    console.error("Failed to save data cache to local disk (possibly storage full):", err);
    // Optional: Trigger a notification if storage is failing
    if (typeof triggerSystemAlert === 'function') {
      triggerSystemAlert("Local storage is full. Some data may not be cached.", "⚠️ Cache Warning");
    }
  }
}


//#endregion

//#region --- TRANSACTION FILTERING ---
// Ensure childId filtering converts everything to Strings so data types never clash
const baseFilteredTransactions = computed(() => {
  return filterAndSortTransactions(transactions.value, selectedChildId.value);
});


const filteredTransactions = computed(() => {
  return applyTransactionFilters(baseFilteredTransactions.value, {
    type: filterType.value,
    startDate: filterStartDate.value,
    endDate: filterEndDate.value,
    text: filterText.value
  });
});

function isLastTransaction(txId) {
  const childTx = baseFilteredTransactions.value;
  return isOnline.value && (childTx?.length > 0 && childTx[0]?.id === txId);
}

//#endregion

//#region --- DYNAMIC SUGGESTION GENERATION ---
const dynamicSuggestionsWhat = computed(() => {
  if (!transactions.value?.length) return [];
  return generateUniqueList(transactions.value, 'what');
});

const dynamicSuggestionsWhere = computed(() => {
  if (!transactions.value?.length) return [];
  return generateUniqueList(transactions.value, 'where');
});
//#endregion

//#region User Management Logic
function isUserDeletable(userId) {
  const hasTransactions = transactions?.value?.some(t => t.recordedBy === userId) ?? false;
  const moreThanOneUser = (users?.value?.length ?? 0) > 1;
  if(userId === "Dad" || userId === "Mum") return false;
  return !hasTransactions && moreThanOneUser;
}

/**
 * Refactored User Creation Routine
 * Integrates non-blocking UI feedback and robust API error handling.
 */
async function handleCreateUser() {
  const name = newUserFormObject.value.name ? newUserFormObject.value.name.trim() : '';
  if (!name) return;

  let closeit = false;
  new RegExp(/^[A-Za-z]+$/).test(name) || (() => {
    closeit = true;
    triggerSystemAlert("Usernames must be a single word containing only letters (A-Z). Please try again.", "Validation Error");
    
  })();
  if(closeit) return;

  if(name.length > 16) {
    closeit = true;
    triggerSystemAlert("Usernames must be 16 characters or fewer. Please try again.", "Validation Error");
   
  }
  if(closeit) return;
  // 1. Confirm action via custom non-blocking dialog
  const confirmed = await triggerSystemConfirm(
    `Create a new user account for "${name}"?`, 
    "➕ Create User"
  );

  if (!confirmed) return;

  if(users.value.find(u => u.name.toLowerCase() === name.toLowerCase())) {
    // User exists, nothing to do
    return;
  }
  isLoading.value = true;
  const payload = {
        action: "createUser",
        fingerprint: generateDeviceFingerprint(), 
        name: name,
        role: newUserFormObject.value.role ? newUserFormObject.value.role : 'user',
        id: `user-${Date.now()}`,
        pass: newUserFormObject.value.pass ? newUserFormObject.value.pass : "" 

      }
  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();

    if (result.status === "success") {
      users.value.push({ id: payload.id, name: payload.name, role: payload.role });
      newUserFormObject.value = { name: '', role: 'user', pass: '' };
      logToScreen(`✅ User "${payload.name}" created successfully.`);
      await fetchSyncDatabase(true); // Silent update of user list
    } else {
      throw new Error(result.message || "Server rejected user creation.");
    }
  } catch (err) {
    console.error("User creation pipeline error:", err);
    logToScreen(`❌ User registration pipeline error: ${err.message}`);
    triggerSystemAlert(`Failed to create user: ${err.message}`, "❌ Registration Error");
  } finally {
    isLoading.value = false;
  }
}

/**
 * Refactored User Revocation Routine
 * Uses the non-blocking SystemConfirm component and maintains UI sync.
 */
async function handleDeleteUser(userId) {
  const user = users.value.find(u => u.id === userId);
  if (!user) return;

  if(user.id === "Dad" || user.id === "Mum") {  
    return;
  }

  // 1. Confirm action via custom non-blocking dialog
  const confirmed = await triggerSystemConfirm(
    `Are you sure you want to revoke system privileges for ${user.name}? This action cannot be undone.`, 
    "⚠️ Revoke User Access"
  );

  if (!confirmed) return;

  isLoading.value = true;
  
  try {
    // 2. Remote deletion request
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteUser",
        id: user.id,
        fingerprint: generateDeviceFingerprint() // Consistency with existing security patterns
      })
    });

    const result = await response.json();

    if (result.status === "success") {
      users.value.splice(users.value.findIndex(u => u.id === user.id), 1);
      logToScreen(`🗑️ Access revoked for user: ${user.name}.`);
      // 3. Refresh database state
      await fetchSyncDatabase(true); 
    } else {
      throw new Error(result.message || "Server denied the deletion request.");
    }
  } catch (err) {
    console.error("Delete user failure:", err);
    triggerSystemAlert(`Could not revoke privileges: ${err.message}`, "❌ Access Error");
  } finally {
    isLoading.value = false;
  }
}

async function onUserChange(event) {
  const targetId = event.target.value;
  const targetUser = users.value.find(u => u.id === targetId);
  passwordInput.value = "";
  pendingUserId.value = "";
  // Check if role requires password
  if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super')) {
    pendingUserId.value = targetId;
    passwordError.value = '';
    isPasswordModalOpen.value = true; // Open your custom password dialog
    // Reset select box to current user so it doesn't "jump" prematurely
    currentUserId.value = currentUser.value.id; 
  } else {
    // Standard user, no password needed
    isPasswordModalOpen.value = false;
    commitUserChange(targetId);
  }
}

async function verifyPassword() {

  isLoading.value = true;
  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ 
        action: "verifyPassword", 
        fingerprint: generateDeviceFingerprint(),
        userId: pendingUserId.value, 
        password: passwordInput.value 
      })
    });
    
    const result = await response.json();
    isLoading.value = false;
    if (result.status === "success") {
      commitUserChange(pendingUserId.value);  
    } else {
      passwordError.value = 'Incorrect password.';  
    }
  } catch(e) {
    isLoading.value = false;
  }
}

function commitUserChange(id) {
  passwordInput.value = "";
  pendingUserId.value = "";
  isPasswordModalOpen.value = false;
  currentUserId.value = id;
  currentUser.value = users.value.find(u => u.id === id) || { id: 'Dad', name: 'Stephan', role: 'super' };
  localStorage.setItem('pocket_money_active_user', id);
}

//#endregion

//#region --- TRANSACTION EDITING & ADJUSTMENT CONTROLLERS ---

function handleRowClick(tx) {
  if (tx.type === 'send' || tx.type === 'receive' || !isOnline.value) {
    return;
  }

  if (isLastTransaction(tx.id)) {
    if (editingTxId.value === tx.id) return;

    // Normalize date for HTML5 <input type="date">
    // Assuming tx.date is ISO or YYYY-MM-DD
    const cleanDate = (tx.date || '').split('T')[0].split(' ')[0];

    editingTxId.value = tx.id;

    // Hydrate the form tracking state
    editForm.value = {
      ...tx,
      date: cleanDate,
      childid: String(tx.childid ?? tx.childId ?? '').trim()
    };
  } else {
    if(isOnline.value && tx.fileurl && tx.fileurl.startsWith('http')) {
        openImagePreviewModal(getRawImageUrl(tx.fileurl))
    }

  }
}

async function saveInlineEdit(txId) {
  if (!editForm.value.what.trim()) {
    triggerSystemAlert("Description cannot be empty.", "⚠️ Validation Error");
    return;
  }

  // Consistent normalization using the same pattern established in your helpers
  const normalizedChildId = String(editForm.value.childid ?? editForm.value.childId ?? selectedChildId.value).trim();

  const payload = {
    action: "editTransaction",
    fingerprint: deviceFingerprint.value, 
    id: String(txId).trim(),
    childId: normalizedChildId,
    date: editForm.value.date,
    what: editForm.value.what.trim(),
    where: editForm.value.where ? editForm.value.where.trim() : '-',
    type: String(editForm.value.type).toLowerCase().trim(),
    amount: Number(editForm.value.amount),
    recordedBy: currentUserId.value
  };
  
  isLoading.value = true;
  editingTxId.value = null;
  
  try {
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });
    
    const statusCheck = await res.json();
    if (statusCheck.status === 'denied') {
      triggerSystemAlert(statusCheck.message, "🔒 Access Denied");
    }
  } catch (err) {
    console.error("Failed to update transaction:", err);
    triggerSystemAlert("Network Error: Could not save your modification to the server.", "🌐 Connection Issue");
  } finally {
    // Refresh to get accurate re-calculated totals
    await fetchSyncDatabase();
    isLoading.value = false;
  }
}

async function handleDeleteLastTransaction(txId) {
  // Use a non-blocking confirmation or a system dialog if your UI supports it
  // If not, standard confirm is acceptable, but triggerSystemAlert is preferred for PWAs
  if (!window.confirm("Delete the last logged transaction entirely from history?")) {
    return;
  }

  isLoading.value = true;
  editingTxId.value = null;
  
  try {
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ 
        action: "deleteTransaction", 
        id: String(txId).trim(),
        fingerprint: generateDeviceFingerprint() // Using the helper for consistency
      })
    });
    
    const statusCheck = await res.json();
    
    if (statusCheck.status === 'denied') {
      triggerSystemAlert(statusCheck.message, "🔒 Access Denied");
    } else if (statusCheck.status === 'success') {
      logToScreen("🗑️ Transaction deleted successfully.");
    }
    
  } catch (err) {
    console.error("Failed to delete transaction:", err);
    triggerSystemAlert("Network Error: Could not delete transaction from the server.", "🌐 Connection Issue");
  } finally {
    await fetchSyncDatabase();
    isLoading.value = false;
  }
}


/**
 * Resets the inline editing state and clears the transaction form.
 * Ensures that the UI returns to a clean slate.
 */
function cancelInlineEdit() {
  editingTxId.value = null;
  
  // Optionally reset the form fields to ensure no stale data persists 
  // if the user immediately opens another edit or a new transaction form.
  txForm.value = {
    type: 'withdrawal',
    amount: 0,
    what: '',
    where: '',
    receiptImageBase64: ''
  };
  
  logToScreen("✏️ Edit cancelled.");
}

//#endregion

//#region --- CHILD PROFILE MANAGEMENT

/**
 * Opens the child profile editor.
 * Creates a reactive copy of the child object to prevent accidental
 * direct mutation of the source state before saving.
 */
function openProfileEditor(child) {
  if(currentUser.value.role == 'user') {   
    return;
  }

  // 1. Clone the object to decouple form inputs from global state
  selectedEditChild.value = { ...child };
  
  // 2. Open the modal context
  isChildEditorOpen.value = true;
  
  // 3. Log the interaction for flow traceability
  logToScreen(`✏️ Opened profile editor for: ${child.name}`);
}

// 🗓️ Core Calendar Milestone Engine
/**
 * Calculates the next allowance payment date based on the chosen interval.
 * Returns an ISO date string (YYYY-MM-DD).
 */
function calculateTargetMilestone(interval) {
  const now = new Date();
  const targetDate = new Date(now);

  if (interval === 'monthly') {
    // Set to the first day of the next month
    // JavaScript automatically rolls over the year if month > 11
    targetDate.setFullYear(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Reset time components to ensure clean midnight UTC-like comparison
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.toISOString().split('T')[0];
  } else {
    // Default to 'weekly': Calculate the distance to the upcoming Monday
    const currentDayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Days until next Monday: 
    // If today is Sunday (0), next Monday is +1 day.
    // If today is Monday (1), next Monday is +7 days (per requirement).
    let daysToMonday = 1 - currentDayOfWeek;
    if (daysToMonday <= 0) {
      daysToMonday += 7;
    }
    
    targetDate.setDate(now.getDate() + daysToMonday);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.toISOString().split('T')[0];
  }
}


// 🌟 Launcher for creating a completely fresh child account
/**
 * Opens the child profile editor in "Creation Mode".
 * Clears the selected child and resets the form to default values.
 */
function openProfileEditorForNewChild() {

  // 1. Explicitly clear selectedEditChild to signal we are in creation mode
  selectedEditChild.value = null; 
  
  // 2. Initialize a blank form state to ensure no stale data persists
  childForm.value = {
    id: '',
    name: '',
    aliases: [],
    status: 'active',
    interestRate: 0,
    allowanceAmount: 0,
    allowanceInterval: 'weekly',
    allowanceNextDate: calculateTargetMilestone('weekly'),
    comment: '',
    avatarFileId: '',
    accentColor: '#3B82F6', // Default brand blue
    startAmount: 0
  };

  // 3. Open the modal context
  isChildEditorOpen.value = true;
  
  // 4. Log the interaction for flow traceability
  logToScreen("➕ Opened editor for a new child account.");
}

// Utility helper checking transaction boundaries from the parent side
/**
 * Verifies if a specific child account has any associated transaction history.
 * Used for UI logic (e.g., preventing deletion or showing/hiding history toggles).
 */
function checkChildHasTransactions(childId) {
  if (!childId) return false;
  
  const targetId = String(childId).trim();
  
  return transactions.value.some(tx => {
    // Normalizes ID check to handle both 'childid' and 'childId' variations
    const txChildId = String(tx.childid ?? tx.childId ?? '').trim();
    return txChildId === targetId;
  });
}


/**
 * Refactored Child Profile Save Routine
 * Optimistically updates the local UI and syncs with the remote sheet backend.
 */
async function handleSaveChildProfile(formData) {
  // Validate required name field
  if (!formData.name?.trim()) {
    triggerSystemAlert("Please provide a name for this profile.", "⚠️ Input Missing");
    return;
  }

  isLoading.value = true;
  const originalChildrenList = [...children.value];

  const isEditingExisting = formData.id && !formData.id.startsWith('temp_');
  
  // If it's a temp ID, we keep it as the ID. The server will accept this as the child's ID.
  const targetId = isEditingExisting ? formData.id : `child_${Date.now()}`;
  const isNewTempChild = !isEditingExisting && formData.id && formData.id.startsWith('temp_');


  const optimizedChildObject = {
    id: targetId,
    name: formData.name.trim(),
    aliases: formData.aliases,
    status: formData.status,
    interestrate: formData.interestRate,
    allowanceamount: formData.allowanceAmount,
    allowanceinterval: formData.allowanceInterval,
    allowancenextdate: formData.allowanceNextDate,
    comment: formData.comment,
    avatarfileid: formData.avatarFileId,
    accentcolor: formData.accentColor,
    // Maintain baseline startamount if editing existing, default to 0 for new
    startamount: isEditingExisting ? (selectedEditChild.value?.startamount || 0) : 0
  };

  // Optimistic local update
  if (isEditingExisting) {
    children.value = children.value.map(c => String(c.id).trim() === String(targetId).trim() ? optimizedChildObject : c);
  } else {
    children.value.push(optimizedChildObject);
  }
  saveDataCacheToDisk();

  try {
    const payload = {
      action: isEditingExisting ? "updateChildProfile" : "createChildExtended",
      fingerprint: generateDeviceFingerprint(), // Security: Integrated helper
      id: targetId,
      name: optimizedChildObject.name,
      aliases: optimizedChildObject.aliases,
      status: optimizedChildObject.status,
      interestRate: optimizedChildObject.interestrate,
      allowanceAmount: optimizedChildObject.allowanceamount,
      allowanceInterval: optimizedChildObject.allowanceinterval,
      allowanceNextDate: optimizedChildObject.allowancenextdate,
      avatarFileId: optimizedChildObject.avatarfileid,
      comment: optimizedChildObject.comment,
      accentColor: optimizedChildObject.accentcolor,
      startAmount: optimizedChildObject.startamount
    };

    const response = await fetch(SHEET_API_URL, { 
      method: "POST", 
      body: JSON.stringify(payload) 
    });
    
    const data = await response.json();
    
    if (data.status === "success") {

      if (isNewTempChild && formData.avatarFileId) {
        logToScreen("🔗 Finalizing avatar association for new child...");      
        await finalizeChildAvatar(formData.id, targetId, formData.avatarFileId);
      }
      isChildEditorOpen.value = false;
      logToScreen(`✅ Profile ${isEditingExisting ? 'updated' : 'created'} for ${optimizedChildObject.name}.`);
      await fetchSyncDatabase(true); 
    } else {
      throw new Error(data.message || "Server declined the update.");
    }
  } catch (err) {
    console.error("Save profile error:", err);
    children.value = originalChildrenList;
    saveDataCacheToDisk();
    triggerSystemAlert(`Error updating profile: ${err.message}`, "❌ Save Failed");
  } finally { 
    isLoading.value = false; 
  }
}

/**
 * Refactored Server-Side Child Profile Deletion
 * Synchronizes the deletion with the remote backend and manages local state rollbacks.
 */
async function handleDeleteChildProfileFromServer(targetId) {

  if (!targetId) return;

   
  const confirmed = await triggerSystemConfirm(
    "Are you sure you want to completely remove this child account? All associated transaction history will be orphaned.", 
    "⚠️ Delete Child Account"
  );

  if (!confirmed) return;

  isLoading.value = true;
  const originalChildrenList = [...children.value];

  // 1. Optimistic local removal
  children.value = children.value.filter(c => String(c.id).trim() !== String(targetId).trim());
  saveDataCacheToDisk();

  try {
    // 2. Execute remote deletion with secured fingerprinting
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ 
        action: "deleteChildProfile", 
        fingerprint: generateDeviceFingerprint(), // Updated to centralized helper
        id: targetId 
      })
    });

    const data = await response.json();
    
    if (data.status === "success") {
      isChildEditorOpen.value = false;
      logToScreen(`🗑️ Profile successfully removed from server: ${targetId}`);
      await fetchSyncDatabase(true); // Silent background synchronization
    } else {
      throw new Error(data.message || "Server rejected the deletion request.");
    }
    backToDashboard();
  } catch (err) {
    console.error("Delete profile sync failure:", err);
    
    // 3. Rollback local state on failure
    children.value = originalChildrenList;
    saveDataCacheToDisk();
    
    // Non-blocking error feedback
    triggerSystemAlert(`Error deleting child profile: ${err.message}`, "❌ Sync Error");
  } finally { 
    isLoading.value = false; 
  }
}

//#endregion

//#region Avatar Management Logic

async function finalizeChildAvatar(tempId, officialId, fileId) {
  console.log(`Finalizing avatar association for child ID: ${tempId} -> ${officialId}, fileId: ${fileId}`);
  // Call the server to swap the childid in the "avatars" sheet
  let res = await fetch(SHEET_API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "updateAvatarAssociation",
      fingerprint: generateDeviceFingerprint(),
      oldChildId: tempId,
      newChildId: officialId,
      fileId: fileId
    })
  });
  console.log(res)
  // Refresh the local avatar list to reflect the official binding
  await fetchSyncDatabase(true);
}

async function handleAvatarDirectUpload({ tempId, base64Data, childForm }) {
  // Now accepts tempId (or final id) instead of strictly requiring a valid ledger ID
  if (!tempId) {
    triggerSystemAlert("Missing temporary ID." + tempId, "Upload Error");
    return;
  }
  if (!base64Data) {
    triggerSystemAlert("Missing image data.", "Upload Error");
    return;
  }

  isLoading.value = true;
  
  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ 
        action: "uploadAvatarDirect", 
        fingerprint: generateDeviceFingerprint(),
        childId: tempId, 
        base64Data 
      })
    });

    const result = await response.json();

    if (result.status === "success" && result.fileId) {
      // Optimistically store this association in local state
      avatars.value.unshift({ 
        id: `av_opt_${Date.now()}`, 
        childid: tempId, 
        drivefileid: result.fileId, 
        uploadedat: new Date().toISOString() 
      });      
      
      logToScreen(`📸 Avatar uploaded (pending association: ${tempId}) fileId: `+result.fileId);
      childForm.value.avatarFileId = result.fileId; // Update the form's avatarFileId to ensure it gets saved with the child profile
      
      // Return the fileId so the UI knows the upload was successful
      return result.fileId; 
    } else {
      throw new Error(result.message || "Upload mutation rejected.");
    }
  } catch (err) {
    console.error("Avatar mutation failure:", err);
    triggerSystemAlert(`Avatar upload failed: ${err.message}`, "❌ Upload Failed");
  } finally { 
    isLoading.value = false; 
  }
}

// State trackers for the bounding crop selector matrix
const sourceCanvas = ref(null);
const outputCanvas = ref(null);
const workspaceContainer = ref(null);
const isCroppingActive = ref(false);
const lens = ref({ x: 0, y: 0, size: 100 });
const dragMeta = ref({ isActive: false, mode: '', startX: 0, startY: 0, startLensX: 0, startLensY: 0, startLensSize: 0 });

let loadedImageAsset = null;
let scaleRatio = 1; // Tracks ratio mapping original pixels down to screen workspace canvas

/**
 * Processes file selection for avatar uploads.
 * Validates file type and prepares the image for cropping.
 */
function handleFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 1. Guard against non-image file types
  if (!file.type.startsWith('image/')) {
    triggerSystemAlert("Please select a valid image file (JPG, PNG, etc).", "⚠️ Invalid File");
    return;
  }

  logToScreen(`📸 Processing file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  const reader = new FileReader();
  reader.onload = (e) => {
    loadedImageAsset = new Image();
    loadedImageAsset.onload = () => {
      isCroppingActive.value = true;
      logToScreen("🖼️ Image loaded, initializing crop workspace.");
      nextTick(() => initializeCropperWorkspace());
    };
    
    // Set source to start the load sequence
    loadedImageAsset.src = e.target.result;
  };
  
  reader.onerror = () => {
    triggerSystemAlert("Failed to read the selected file.", "❌ Read Error");
  };

  reader.readAsDataURL(file);
}

/**
 * Initializes the cropping workspace workspace dimensions and canvas rendering.
 * Uses requestAnimationFrame to ensure container dimensions are fully computed.
 */
function initializeCropperWorkspace() {
  if (!sourceCanvas.value || !loadedImageAsset || !workspaceContainer.value) return;

  // Use requestAnimationFrame to ensure container layout is fully painted
  requestAnimationFrame(() => {
    const ctx = sourceCanvas.value.getContext('2d');
    
    // Safety check: container might be hidden in some mobile views initially
    const maxWidth = Math.min(workspaceContainer.value.clientWidth || 400, 400);
    scaleRatio = maxWidth / loadedImageAsset.width;
    
    const displayWidth = maxWidth;
    const displayHeight = loadedImageAsset.height * scaleRatio;
    
    // Apply dimensions to canvas
    sourceCanvas.value.width = displayWidth;
    sourceCanvas.value.height = displayHeight;
    
    // Paint background image scaled to the view area
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(loadedImageAsset, 0, 0, displayWidth, displayHeight);
    
    // Initialize lens selector as a balanced default square
    const baseSize = Math.min(displayWidth, displayHeight, 140);
    lens.value = {
      x: (displayWidth - baseSize) / 2,
      y: (displayHeight - baseSize) / 2,
      size: baseSize
    };

    logToScreen(`🖼️ Workspace initialized: ${displayWidth.toFixed(0)}x${displayHeight.toFixed(0)}px`);
  });
}

/**
 * Initiates the drag/resize sequence for the cropping lens.
 * @param {MouseEvent|TouchEvent} event - The interaction event.
 * @param {string} mode - Interaction mode: 'move' or 'resize'.
 */
function startDrag(event, mode) {
  // Prevent default behavior to avoid scrolling or image dragging during crop interaction
  event.preventDefault();
  
  dragMeta.value = {
    isActive: true,
    mode: mode,
    startX: event.touches ? event.touches[0].clientX : event.clientX,
    startY: event.touches ? event.touches[0].clientY : event.clientY,
    startLensX: lens.value.x,
    startLensY: lens.value.y,
    startLensSize: lens.value.size
  };

  logToScreen(`📏 Crop interaction started: ${mode}`);
}

function onDrag(event) {
  if (!dragMeta.value.isActive) return;
  
  const { clientX, clientY } = event.touches ? event.touches[0] : event;
  const deltaX = clientX - dragMeta.value.startX;
  const deltaY = clientY - dragMeta.value.startY;
  
  const { width: canvasW, height: canvasH } = sourceCanvas.value;

  if (dragMeta.value.mode === 'move') {
    const nextX = Math.max(0, Math.min(dragMeta.value.startLensX + deltaX, canvasW - lens.value.size));
    const nextY = Math.max(0, Math.min(dragMeta.value.startLensY + deltaY, canvasH - lens.value.size));
    
    lens.value.x = nextX;
    lens.value.y = nextY;
  } else if (dragMeta.value.mode === 'resize') {
    const maxDelta = Math.max(deltaX, deltaY);
    const constrainedSize = Math.max(40, dragMeta.value.startLensSize + maxDelta);
    
    lens.value.size = Math.min(
      constrainedSize, 
      canvasW - lens.value.x, 
      canvasH - lens.value.y
    );
  }
}

function endDrag() {
  dragMeta.value.isActive = false;
}

// Generates true transparent target frames
function processInteractiveCrop() {
  // Ensure DOM references exist before proceeding
  if (!outputCanvas.value || !sourceCanvas.value || !loadedImageAsset) return;
  
  const outCtx = outputCanvas.value.getContext('2d');
  
  // Calculate source coordinates normalized by scaleRatio
  const sourceCropX = lens.value.x / scaleRatio;
  const sourceCropY = lens.value.y / scaleRatio;
  const sourceCropSize = lens.value.size / scaleRatio;
  
  // Prepare canvas for circular mask
  outCtx.clearRect(0, 0, 100, 100);
  outCtx.save(); // Save state to ensure clip doesn't affect subsequent operations
  
  outCtx.beginPath();
  outCtx.arc(50, 50, 50, 0, Math.PI * 2);
  outCtx.clip();
  
  // Draw the selected region into the target 100x100 area
  outCtx.drawImage(
    loadedImageAsset,
    sourceCropX, sourceCropY, sourceCropSize, sourceCropSize,
    0, 0, 100, 100
  );
  
  outCtx.restore(); // Restore state (removes clip)
  
  // Emit the base64 string using props reference
  const base64Data = outputCanvas.value.toDataURL('image/png');
  emit('upload-avatar', { 
    childId: props.childForm.id, 
    base64Data 
  });
  
  isCroppingActive.value = false;
}

//#endregion

//#region Avatar Caching and Background Syncing for Performance Optimization

// 🌟 2. The Computed Property your Template will bind to directly
const resolvedAvatarSrc = computed(() => {
  const childId = selectedChild.value?.id;
  const fileId = selectedChild.value?.avatarfileid || selectedChild.value?.avatarFileId;

  if (!fileId) return 'https://placehold.co/100x100?text=Face';

  // RULE A: If a cached Base64 copy exists locally, use it instantly!
  if (avatarBase64Cache.value[childId]) {
    // Quietly check and update the cache in the background without freezing the UI
    if (!activeSyncRequests.has(childId)) {
      triggerSilentAvatarSync(childId, fileId);
    }
    return avatarBase64Cache.value[childId];
  }

  // RULE B: Cache miss! Fallback to direct URL but trigger background collection
  if (!activeSyncRequests.has(childId)) {
    triggerSilentAvatarSync(childId, fileId);
  }
  return `https://drive.google.com/thumbnail?sz=w500&id=${fileId}`;
});

// 🔄 3. Background Sync Worker: Downloads and writes images to disk as string blocks
const activeSyncs = new Set();

function triggerSilentAvatarSync(childId, fileId) {
  if (!isOnline.value || !fileId || activeSyncs.has(childId)) return;
  lazyUpdateAvatarCacheInBackground(childId, fileId);
}

const AlastSyncTimestamps = new Map();
const ASYNC_COOLDOWN_MS = 30000; // 30 seconds protection window
async function lazyUpdateAvatarCacheInBackground(childId, fileId) {
  // Guard: Offline status, missing ID, or already in-progress sync
  if (!isOnline.value || !fileId || activeSyncs.has(childId)) return;

  const now = Date.now();
  
  let timeStamp = AlastSyncTimestamps.get(childId) || 0;
  // 1. 🌟 PROTECTION LAYER: Prevent rapid-fire bursts ifCalled too frequently
  if (now - timeStamp < ASYNC_COOLDOWN_MS) {
    console.log("📶 Background sync skipped: Cooldown active to prevent Google 429 throttling.");
    return; 
  }


  activeSyncs.add(childId);

  try {
    //const targetUrl = `https://drive.google.com/thumbnail?sz=w500&id=${fileId}`;

    const base64DataString = await fetchAvatarProxy(fileId);

    // Update reactive cache
    avatarBase64Cache.value[childId] = base64DataString;
    
    // Persist to local storage
    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(avatarBase64Cache.value));
    AlastSyncTimestamps.set(childId, Date.now());
  } catch (err) {
    console.warn(`Silent background avatar cache synchronization bypassed: ${err.message}`);
  } finally {
    // Always remove from active set, regardless of success or failure,
    // to allow for future retries if the network issue resolves
   
    activeSyncs.delete(childId);
  }
}

/**
 * Resolves the avatar URL for a given child, serving from cache if possible
 * while triggering a background sync to ensure data freshness.
 */
function resolveAndCacheAvatar(child) {
  if (!child) return 'https://placehold.co/100x100?text=Face';
  
  const childId = child.id;
  const fileId = child.avatarfileid || child.avatarFileId;

  if (!fileId) return 'https://placehold.co/100x100?text=Face';

  // Path A: Cache Hit! Serve instantly from device memory
  if (avatarBase64Cache.value[childId]) {
    // Quietly sync background tracks to ensure it's up-to-date
    lazyUpdateAvatarCacheInBackground(childId, fileId);
    console.log("🎯 Avatar cache hit for child ID:", childId);
    return avatarBase64Cache.value[childId];
  }

  // Path B: Cache Miss! Direct download fallback stream with background intercept hooks
  lazyUpdateAvatarCacheInBackground(childId, fileId);
  return `https://drive.google.com/thumbnail?sz=w500&id=${fileId}`;
}

/**
 * Gets the avatar source for list views, prioritizing cache and triggering
 * background sync for missing cache entries.
 */
function getListAvatarSrc(child) {
  if (!child) return 'https://placehold.co/100x100?text=Face';
  
  const childId = child.id;
  const fileId = child.avatarfileid || child.avatarFileId;
  
  if (!fileId) return 'https://placehold.co/100x100?text=Face';
  
  // Return the base64 string directly from disk cache if present
  if (avatarBase64Cache.value[childId]) {
    console.log("🎯 Avatar cache hit for child ID:", childId);
    return avatarBase64Cache.value[childId];
  }
  
  // Kick off background cache download for this list item
  lazyUpdateAvatarCacheInBackground(childId, fileId);
  return `https://drive.google.com/thumbnail?sz=w500&id=${fileId}`;
}

async function fetchAvatarProxy(fileId) {
  // Use your existing SHEET_API_URL, just change the action
  const proxyUrl = `${SHEET_API_URL}?action=getAvatarProxy&fileId=${fileId}&fingerprint=${encodeURIComponent(deviceFingerprint.value || '')}`;
  
  try {
    const response = await fetch(proxyUrl);
    const result = await response.json();
    if (result.status === "success") {
      return result.data; // This is the ready-to-use "data:image/..." string
    } else {
      return null;
    }
  } catch (err) {
    console.error("Proxy fetch failed:", err);
    return null;
  }
}

//#endregion

//#region Geo-Location Proximity Caching for AI Suggestions

function fetchSmartLocationList() {
  if (!navigator.geolocation) {
    triggerSystemAlert("Geolocation is completely unsupported by this hardware profile.", "⚠️ Hardware Limitation");
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
      let suggestions = await getAISuggestionsWithGeoCache(lat, lon);

      if(suggestions != null) {
        nearbyShopSuggestions.value = suggestions;
        isLocating.value = false;
        return;
      }

      try {        
        logToScreen("Querying open-source Nominatim reverse geocoder map data...", true);
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        
        const response = await fetch(osmUrl, {
          headers: { 'User-Agent': 'KidsAccountsManagerPWA/1.18' }
        });
        
        const data = await response.json();
        
        const addressBlock = data.address ? JSON.stringify(data.address) : "{}";
        const explicitName = data.name || "";
        const fallbackString = data.display_name || "";

        // Pass lat and lon parameters down to context evaluator
        await processLocationContextWithAI(addressBlock, explicitName, fallbackString, lat, lon);

      } catch (osmErr) {
        logToScreen(`❌ Reverse Geocoding Map request failed: ${osmErr.message}`);
      } finally {
        isLocating.value = false;
      }
    },
    (geoError) => {
      logToScreen(`❌ Core Geolocation Error caught (${geoError.code}): ${geoError.message}`);
      triggerSystemAlert("Unable to fetch location details. Ensure PWA location access permissions are enabled on your phone.", "📍 Location Error");
      isLocating.value = false;
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}

async function processLocationContextWithAI(addressJson, explicitName, completeString, lat, lon, onlyUpdateCache = false) {  
  if (!cloudGeminiApiKey.value) {
    isLocating.value = false;
    return;
  }

  // PROXIMITY SHORT-CIRCUIT: Fast-path for Home location to save API usage and run instantly
  const HOME_LAT = 51.4101982;
  const HOME_LON = -0.0322811;
  const PROXIMITY_RADIUS_M = 50;

  if (typeof lat === 'number' && typeof lon === 'number') {
    // Calculate Haversine distance in meters
    const R = 6371000;
    const dLat = (lat - HOME_LAT) * Math.PI / 180;
    const dLon = (lon - HOME_LON) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(HOME_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance <= PROXIMITY_RADIUS_M) {
      logToScreen(`📍 Home proximity alert triggered! Distance: ${distance.toFixed(1)}m. Instantly mapping suggestions.`);
      if(onlyUpdateCache) {
        geoProximityCache.value.push({
          lat: lat,
          lng: lon,
          suggestions: ["Home", "Amazon", "Online", "Corner Shop", "Sainsbury's", "App Store", "Google Play"],
          timestamp: Date.now()
        });
        localStorage.setItem("vault_geo_location_cache", JSON.stringify(geoProximityCache.value));
        return;
      } else {
        nearbyShopSuggestions.value = ["Home", "Amazon", "Online", "Corner Shop", "Sainsbury's", "App Store", "Google Play"];
      }
      isLocating.value = false;
      return;
    }
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

    Output a strict JSON string array format matching exactly this: 
    ["Store Option A", "Store Option B", "Store Option C", "Store Option D", "Store Option E", "Store Option F", "Store Option G"].
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

    if (!response.ok) {
      throw new Error(`HTTP error responding with status code: ${response.status}`);
    }

    const resData = await response.json();
    
    // Guard deep dot-notation keys
    const candidate = resData?.candidates?.[0];
    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
      throw new Error(`Content generation blocked by safety parameters (Reason: ${candidate.finishReason})`);
    }

    let rawJsonText = candidate?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      throw new Error("No suggestion text returned from location processing engine.");
    }

    rawJsonText = rawJsonText.trim();
    
    // 🌟 NOTICE: Using '```' in the Javascript pattern below to prevent code-block conflicts
    if (rawJsonText.startsWith("```")) {
      rawJsonText = rawJsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const elements = JSON.parse(rawJsonText);
    let suggestions =  Array.isArray(elements) ? elements : [];
    nearbyShopSuggestions.value = suggestions
    logToScreen(`GPS Parsing Complete! Extracted options: ${JSON.stringify(nearbyShopSuggestions.value)}`);

     // Push fresh entry down into local memory cache tracks
      geoProximityCache.value.push({
        lat: lat,
        lng: lon,
        suggestions: suggestions,
        timestamp: Date.now()
      });
      
      // Keep cache lean by keeping only the 20 most recent locations
      if (geoProximityCache.value.length > 20) geoProximityCache.value.shift();
      
      localStorage.setItem("vault_geo_location_cache", JSON.stringify(geoProximityCache.value));
      return data.suggestions;
  } catch (error) {
    logToScreen(`❌ AI Location mapping failed: ${error.message}`);
     if(!onlyUpdateCache) {
      nearbyShopSuggestions.value = [explicitName || "Corner Shop", "Online", "Amazon"];
     }
  } finally {
    isLocating.value = false;
  }
}

// Storage dictionary structure: { "lat_lng_key": { suggestions: [...], lat: X, lng: Y, timestamp: Date } }
const geoProximityCache = ref(JSON.parse(localStorage.getItem("vault_geo_location_cache") || "[]"));

/**
 * Checks for location suggestions in the proximity cache.
 * Serves cached results instantly while triggering a silent background refresh.
 */
async function getAISuggestionsWithGeoCache(currentLatitude, currentLongitude) {
  const coordinateThreshold = 0.0002; // ~25m radius
 
  // Find entry within threshold
  const matchedCacheEntry = geoProximityCache.value.find(entry => 
    Math.abs(entry.lat - currentLatitude) <= coordinateThreshold && 
    Math.abs(entry.lng - currentLongitude) <= coordinateThreshold
  );

  if (matchedCacheEntry) {
    console.log("🎯 Proximity cache match found! Returning instantly.");
    processLocationContextWithAI("{}", "", "", currentLatitude, currentLongitude, true);
    return matchedCacheEntry.suggestions;
  } else {

      return null; 
  }
}

/*
async function fetchLiveLocationSuggestions(lat, lng) {
  try {
    const response = await fetch(`${SHEET_API_URL}?action=getAISuggestions&lat=${lat}&lng=${lng}`);
    const data = await response.json();
    
    if (data.status === "success" && data.suggestions) {
      // Push fresh entry down into local memory cache tracks
      geoProximityCache.value.push({
        lat: lat,
        lng: lng,
        suggestions: data.suggestions,
        timestamp: Date.now()
      });
      
      // Keep cache lean by keeping only the 20 most recent locations
      if (geoProximityCache.value.length > 20) geoProximityCache.value.shift();
      
      localStorage.setItem("vault_geo_location_cache", JSON.stringify(geoProximityCache.value));
      return data.suggestions;
    }
  } catch (err) {
    console.error("Live geocoding lookup failed:", err);
  }
 
  return [];
}
  */

/**
 * Performs a silent background refresh of the geo-location cache.

async function silentRefreshGeoCache(lat, lng) {
  if (!isOnline.value) return;
  // Fire request quietly to keep suggestions up to date over time
  await fetchLiveLocationSuggestions(lat, lng);
  console.log("🔄 Background geo-cache synchronization finalized successfully.");
} */

//#endregion


</script>

<style scoped>

</style>