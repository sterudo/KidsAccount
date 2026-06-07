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
            <label for="global-user" style="font-size: 12px;   letter-spacing: 0.5px;color: silver;">User:</label>
            <select id="global-user" v-model="currentUser" @change="saveUserPreference" style="background: transparent;
  border: none;
    border-bottom-width: medium;
    border-bottom-style: none;
    border-bottom-color: currentcolor;
  box-shadow: none;
  border-bottom: none !important;
  height: 25px;
  font-weight: bold;" >
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
              <img :src="selectedChild.avatarfileid ? `https://drive.google.com/thumbnail?sz=w500&id=${selectedChild.avatarfileid}` : 'https://placehold.co/100x100?text=Face'"
              width="60" height="60" class="rowimg"
                @click.stop="openProfileEditor(selectedChild)"  />
                <!-- img :src="(selectedChild.name == 'Eve') ? 'eve250.png' :((selectedChild.name == 'Jason') ? 'jason250.png' : 'default.png')" 
                width="60" height="60" class="rowimg"
                @click.stop="openProfileEditor(selectedChild)" 
                /-->
                <div 
                 :style="`border-bottom: 2px solid ${selectedChild.accentcolor} !important;`"                
                    class="balance-badge" :class="calculateBalance(selectedChild.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">
                  
                  <span class="childsName" :style="{ color: selectedChild.accentcolor }">{{ selectedChild.name }}</span>           
                  <span class="balancelabel">Balance</span>
                  <span class="currency" style="font-size:32px;  "> £</span>              
                  <strong style="font-size:32px;text-shadow: black -2px -2px 1px, black 2px 2px 2px;">{{ calculateBalance(selectedChild.id).toFixed(2) }}</strong>
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
                    <img :src="child.avatarfileid ? `https://drive.google.com/thumbnail?sz=w500&id=${child.avatarfileid}` : 'https://placehold.co/100x100?text=Face'"
                     class="child-avatar" width="60" height="60" style="flex-basis:1;margin-right:10px;"/>
                  <!-- img :src="(child.name == 'Eve') ? 'eve250.png' : ((child.name == 'Jason') ? 'jason250.png' : 'default.png')" 
                   class="child-avatar" width="60" height="60" style="flex-basis:1;margin-right:10px;" /-->
                  <div class="child-row-info" style="flex-basis: 100%;  text-align: left;">                    
                    <h3 :style="`color:${child.accentcolor};`">{{ child.name }} </h3>
                    <span class="allowance-label" style="text-align:left;"><span style="font-size: 12px;" class="allowance-label-text">Allowance:</span>
                      {{ formatCurrency(child.allowanceamount) }}/{{ child?.allowanceinterval === "weekly" ? "wk" : "mo" }}</span>
                    <button 
                      type="button" 
                      @click.stop="openProfileEditor(child)" 
                      class="btn-settings-gear-accent"
                      style="border:none;background:transparent"
                    >
                      ⚙️
                    </button>
                  </div>
                  <div class="child-row-balance" :class="calculateBalance(child.id) >= 0 ? 'pos-dark-dark' : 'neg-dark-dark'">          
                    <span>{{ formatCurrency(calculateBalance(child.id)).split('.')[0] }}</span>
                    <span style="    font-size: 18px;font-weight: normal;">.{{ formatCurrency(calculateBalance(child.id)).split('.')[1] }}</span>
                  </div>
                </div>
               </div>
            </div>
            <button 
  type="button" id="add-child-btn"
  @click="openProfileEditorForNewChild" 
  class="btn btn-submit-tx"
  style=" background: rgb(14, 18, 71);
  margin: 20px;"
>
  ➕ Add New Child Account
</button>
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
                  <option 
                    v-for="child in children.filter(c => String(c.id) !== String(selectedChildId))" 
                    :key="child.id" 
                    :value="child.id"
                  >
                    {{ child.name }} (Current Bal: ${{ calculateBalance(child.id).toFixed(2) }})
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

              <button type="button"
               style="font-size:24px;height:55px;box-sizing: border-box;display: flex !important;  place-content: center;  text-shadow: 1px 1px 3px black;"
              @click="handleCreateTransaction" class="btn btn-primary log-submit-btn  " :class="{ 'Deposit': txForm.type === 'deposit', 'Withdraw': txForm.type === 'withdrawal', 'Transfer': txForm.type === 'transfer' }">
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
                    <div style="font-size: 16px !important;" class="text-right" :class="(tx.type === 'deposit' || tx.type === 'receive')? 'pos-dark-text' : 'neg-text'">
                      {{ ((tx.type === 'deposit' || tx.type === 'receive') ? '+' : '-') }}{{ formatCurrency(tx.amount) }}
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
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import ImageLightbox from '@/components/ImageLightbox.vue';
import AddChildSettings from '@/components/AddChildSettings.vue';
import AddUserSettings from '@/components/AddUserSettings.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import BackupSettings from '@/components/BackupSettings.vue';
import ChildProfileModal from './components/ChildProfileModal.vue';
import { 
  formatCurrency, 
  formatDate, 
  formatDateMobile,
  generateDeviceFingerprint, 
  appendScreenLog,
  getRawImageUrl
} from './utils/helpers';
import ActionMenu from '@/components/ActionMenu.vue';
const appVersion = ref('0.41::');
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

const newUserFormName = ref('');
const txForm = ref({
  date: new Date().toISOString().split('T')[0],
  what: '',
  where: '',
  type: 'withdrawal',
  amount: null,
  recipientChildId: '',
  receiptImageBase64: '' // Cleaner match
});


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
let rawImageElement = null; // Memory allocation handle for image files

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

const cachedData = localStorage.getItem("vault_cached_dataset");
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      children.value = parsed.children || [];
      transactions.value = parsed.transactions || [];
      users.value = parsed.users || [];
      systemConfig.value = parsed.config || {};
      
      // 🌟 Load avatars timeline on start
      avatars.value = parsed.avatars || []; 
      
      cloudGeminiApiKey.value = systemConfig.value.geminiApiKey || systemConfig.value.gemini_api_key || '';
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

    // 🌟 Process and map server response payload down to reactive states
    if (data.children) children.value = data.children;
    if (data.transactions) transactions.value = data.transactions;
    if (data.users) users.value = data.users;
    if (data.config) systemConfig.value = data.config;
    
    // 📸 Capture new relational historical avatars array tracking index
    if (data.avatars) avatars.value = data.avatars; 
    
    // Map Gemini keys seamlessly into operational endpoints
    cloudGeminiApiKey.value = data.config?.geminiApiKey || data.config?.gemini_api_key || '';
    
    // Save success timestamp
    lastSyncTimestamp.value = Date.now();

    // 🌟 Update local disk storage blocks to guarantee asset resilience offline
    localStorage.setItem("vault_cached_dataset", JSON.stringify({
      children: children.value,
      transactions: transactions.value,
      users: users.value,
      config: systemConfig.value,
      avatars: avatars.value // Ensure avatar records survive client-side cold boots
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
  aiWhatSuggestions.value = []; // Reset old suggestions instantly
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

      // 🌟 STEP 1: Save the base64 image data into state immediately!
      // This guarantees the image data is safely recorded even if the AI network drops.
      txForm.value.receiptImageBase64 = pureBase64Data;

      // 🌟 STEP 2: Safe Execution Wrapper for Gemini Vision API Call
      try {
        logToScreen("Sending optimized frame to Gemini Vision parser...");
        await parseImageWithGeminiVision(pureBase64Data, "image/jpeg");
        logToScreen(`Gemini parsing completed. Found ${aiWhatSuggestions.value.length} recommendations.`);
      } catch (geminiError) {
        console.error("⚠️ Gemini receipt analysis failed:", geminiError);
        logToScreen(`AI Parsing Error: ${geminiError.message}`);
      } finally {
        // Turning loading off inside 'finally' ensures the UI updates and 
        // reveals the suggestions dropdown whether the AI succeeds or fails!
        isLoading.value = false;
      }
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

  // TODO: add the aliases into the mapping context as well to improve recognition of nicknames or misheard names (e.g. "Evie" vs "Eve")
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
      //const timeA = a.id ? String(a.id).replace('tx_', '') : 0;
      //const timeB = b.id ? String(b.id).replace('tx_', '') : 0;
      // return String(timeB).localeCompare(String(timeA));
      return String(b.timestamp).localeCompare(String(a.timestamp));
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
  if(tx.type === 'send' || tx.type === 'receive' || !isOnline.value) {   
    return;
  }
  if (isLastTransaction(tx.id) ) {
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
// Add next to your existing form states inside <script setup>


async function handleCreateTransaction() {
  if (!txForm.value.amount || !selectedChildId.value) return;
  console.log("Initiating transaction creation flow for child ID:", selectedChildId.value);
  
  const senderChild = children.value.find(c => String(c.id) === String(selectedChildId.value));
  
  // Cache the image from the form before doing anything else
  const attachedReceiptImage = txForm.value.receiptImageBase64 || "";
  
  // =========================================================================
  // 🌟 DISPATCH CASE A: ATOMIC DUAL TRANSFER DISPATCH ROUTE
  // =========================================================================
  if (txForm.value.type === 'transfer') {
    if (!txForm.value.recipientChildId) {
      alert("Please select a recipient child profile.");
      return;
    }
    
    const receiverChild = children.value.find(c => String(c.id) === String(txForm.value.recipientChildId));
    const timestampId = Date.now();
    const groupToken = `trsf_${timestampId}`;
    const transferDate = txForm.value.date || new Date().toISOString().split('T')[0];
    const transferAmount = Number(txForm.value.amount);
    const descriptionText = txForm.value.what.trim() || 'Pocket Money Share';
    const whereText = txForm.value.where.trim() || '-';

    const optimisticSenderRow = {
      id: `tx_send_${timestampId}`,
      childid: String(selectedChildId.value),
      date: transferDate,
      what: `${descriptionText} to ${receiverChild?.name || 'Sibling'}`,
      where: whereText,
      type: 'send',
      amount: transferAmount,
      recordedby: currentUser.value || 'System',
      timestamp: new Date().toISOString(),
      transfergroup: groupToken,
      receiptImageBase64: attachedReceiptImage, // Retain offline copy
      isPendingSync: !isOnline.value
    };

    const optimisticReceiverRow = {
      id: `tx_recv_${timestampId}`,
      childid: String(txForm.value.recipientChildId),
      date: transferDate,
      what: `${descriptionText} from ${senderChild?.name || 'Sibling'}`,
      where: whereText,
      type: 'receive',
      amount: transferAmount,
      recordedby: currentUser.value || 'System',
      timestamp: new Date().toISOString(),
      transfergroup: groupToken,
      receiptImageBase64: attachedReceiptImage, // Retain offline copy
      isPendingSync: !isOnline.value
    };

    const historyRollback = [...transactions.value];
    transactions.value.unshift(optimisticSenderRow, optimisticReceiverRow);
    
    txForm.value = { date: transferDate, what: '', where: '', type: 'withdrawal', amount: null, recipientChildId: '', receiptImageBase64: '' };
    saveDataCacheToDisk();

    if (!isOnline.value) {
      pendingQueue.value.push(optimisticSenderRow, optimisticReceiverRow);
      localStorage.setItem("vault_pending_outbox", JSON.stringify(pendingQueue.value));
      return;
    }

    const networkTransferPayload = {
      action: "addTransfer",
      fingerprint: deviceFingerprint.value,
      transferGroup: groupToken,
      utcTimestamp: optimisticSenderRow.timestamp,
      date: transferDate,
      amount: transferAmount,
      where: whereText,
      recordedBy: currentUser.value || 'System',
      senderId: optimisticSenderRow.id,
      senderChildId: optimisticSenderRow.childid,
      senderWhat: optimisticSenderRow.what,
      receiverId: optimisticReceiverRow.id,
      receiverChildId: optimisticReceiverRow.childid,
      receiverWhat: optimisticReceiverRow.what
    };

    fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(networkTransferPayload)
    })
    .then(async (res) => {
      const data = await res.json();
      if (data.status === "success") {
        const sTx = transactions.value.find(t => t.id === optimisticSenderRow.id);
        const rTx = transactions.value.find(t => t.id === optimisticReceiverRow.id);
        if (sTx) delete sTx.isPendingSync;
        if (rTx) delete rTx.isPendingSync;
        
        saveDataCacheToDisk();
        fetchSyncDatabase(true);
      } else { 
        throw new Error(data.message); 
      }
    })
    .catch((err) => {
      if (typeof logToScreen === 'function') {
        logToScreen(`⚠️ Transfer failed mid-flight, rolling back: ${err.message}`);
      }
      transactions.value = historyRollback;
      saveDataCacheToDisk();
    });
    
    return;
  }
  
  // =========================================================================
  // 🌟 DISPATCH CASE B: STANDARD SINGLE TRANSACTION (DEPOSIT / WITHDRAWAL)
  // =========================================================================
  const timestampId = Date.now();
  const txDate = txForm.value.date || new Date().toISOString().split('T')[0];
  const txAmount = Number(txForm.value.amount);
  const descriptionText = txForm.value.what.trim() || (txForm.value.type === 'deposit' ? 'Allowance Drop' : 'Cash Out');
  const whereText = txForm.value.where.trim() || '-';

  // Create local representation object
  const optimisticTxRow = {
    id: `tx_${timestampId}`,
    childid: String(selectedChildId.value),
    date: txDate,
    what: descriptionText,
    where: whereText,
    type: txForm.value.type,
    amount: txAmount,
    recordedby: currentUser.value || 'System',
    timestamp: new Date().toISOString(),
    transfergroup: '',
    receiptImageBase64: attachedReceiptImage, // Store in local cache object
    isPendingSync: !isOnline.value
  };

  const historyRollback = [...transactions.value];

  // Instantly inject row locally for high performance feel
  transactions.value.unshift(optimisticTxRow);
  
  // Form reset strategy: clear receipt input safely
  txForm.value = { date: txDate, what: '', where: '', type: 'withdrawal', amount: null, recipientChildId: '', receiptImageBase64: '' };
  saveDataCacheToDisk();

  // If working without a live connection, append to standard outbox synchronization stack
  if (!isOnline.value) {
    pendingQueue.value.push(optimisticTxRow);
    localStorage.setItem("vault_pending_outbox", JSON.stringify(pendingQueue.value));
    return;
  }

  // Network request payload mapping back to standard script action endpoints
  const networkTxPayload = {
    action: "addTransaction",
    fingerprint: deviceFingerprint.value,
    id: optimisticTxRow.id,
    childId: optimisticTxRow.childid,
    date: optimisticTxRow.date,
    what: optimisticTxRow.what,
    where: optimisticTxRow.where,
    type: optimisticTxRow.type,
    amount: optimisticTxRow.amount,
    recordedBy: optimisticTxRow.recordedby,
    utcTimestamp: optimisticTxRow.timestamp,
    // 🌟 FUTURE PROOFING: Provide both parameter keys so Google Script catches it regardless
    receiptImageBase64: attachedReceiptImage,
    receiptBase64: attachedReceiptImage
  };

  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(networkTxPayload)
    });
    
    const data = await response.json();
    if (data.status === "success") {
      const targetLocalTx = transactions.value.find(t => t.id === optimisticTxRow.id);
      if (targetLocalTx) delete targetLocalTx.isPendingSync;
      
      saveDataCacheToDisk();
      fetchSyncDatabase(true); // Silent clean dataset update
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    console.error("⚠️ Transaction delivery failed, rolling back local cache:", err);
    transactions.value = historyRollback;
    saveDataCacheToDisk();
    alert(`Failed to record transaction online: ${err.message}`);
  }
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
  const targetChild = children.value.find(c => String(c.id) === String(childId));
  if (!targetChild) return 0;

  const initialAmount = Number(targetChild.startamount || targetChild.startAmount) || 0;
  
  // Filter and reduce matching entries
  const netLedger = transactions.value.reduce((total, tx) => {
    if (String(tx.childid || tx.childId) !== String(childId)) return total;
    
    const type = String(tx.type).toLowerCase().trim();
    const amount = Number(tx.amount) || 0;
    
    if (type === 'deposit' || type === 'receive') {
      return total + amount;
    } else if (type === 'withdrawal' || type === 'send') {
      return total - amount;
    }
    return total;
  }, 0);

  return initialAmount + netLedger;
}


// Renders raw source asset on the editing workspace canvas
function drawCropCanvas() {
  const ctx = cropCanvas.value.getContext('2d');
  
  // Force canvas size properties directly
  cropCanvas.value.width = 100;
  cropCanvas.value.height = 100;
  
  // Math bounds computation: Calculate centered square bounding box dimensions
  const minDim = Math.min(rawImageElement.width, rawImageElement.height);
  const sx = (rawImageElement.width - minDim) / 2;
  const sy = (rawImageElement.height - minDim) / 2;
  
  // Clear and downsample square crop sequence directly to 100x100
  ctx.clearRect(0, 0, 100, 100);
  ctx.drawImage(rawImageElement, sx, sy, minDim, minDim, 0, 0, 100, 100);
}

// Compress, isolate, and save processed picture to Google Cloud storage endpoints
async function saveCroppedAvatar() {
  if (!cropCanvas.value || !childForm.value.id) return;
  
  // Convert downsampled framework frame to compressed base64 JPEG data URL
  const base64Data = cropCanvas.value.toDataURL('image/jpeg', 0.85);
  
  isLoading.value = true;
  try {
    const payload = {
      action: "uploadAvatarDirect",
      fingerprint: deviceFingerprint.value,
      childId: childForm.value.id,
      base64Data: base64Data
    };

    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === "success" && result.fileId) {
      childForm.value.avatarFileId = result.fileId;
      isCroppingActive.value = false;
      
      // Optimistically insert image record link directly into historical timeline array indices
      avatars.value.unshift({
        id: `av_opt_${Date.now()}`,
        childid: childForm.value.id,
        drivefileid: result.fileId,
        uploadedat: new Date().toISOString()
      });
      
      if (typeof logToScreen === 'function') logToScreen("📸 Avatar processed and linked successfully.");
    } else {
      throw new Error(result.message || "Upload mutation fault rejected.");
    }
  } catch (err) {
    alert(`Avatar saving fault: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

function openProfileEditor(child) {
  selectedEditChild.value = child;
  isChildEditorOpen.value = true;
}

async function handleUpdateChildProfile() {
  if (!childForm.value.name.trim()) {
    alert("Please enter a profile name.");
    return;
  }

  isLoading.value = true;
  const originalChildrenList = [...children.value];
  const isEditingExisting = !!childForm.value.id;

  // 🆔 Set or assign target tracking keys
  const targetId = isEditingExisting ? childForm.value.id : `child_${Date.now()}`;
  
  const optimizedChildObject = {
    id: targetId,
    name: childForm.value.name.trim(),
    aliases: childForm.value.aliases,
    status: childForm.value.status,
    interestrate: childForm.value.interestRate,
    allowanceamount: childForm.value.allowanceAmount,
    allowanceinterval: childForm.value.allowanceInterval,
    allowancenextdate: childForm.value.allowanceNextDate,
    comment: childForm.value.comment,
    avatarfileid: childForm.value.avatarFileId,
    accentcolor: childForm.value.accentColor,
    // Keep baseline startamount unchanged if editing, otherwise default to 0 for a new child
    startamount: isEditingExisting ? (selectedEditChild.value?.startamount || 0) : 0
  };

  // 🧠 Optimistic Local Screen Rendering Updates
  if (isEditingExisting) {
    children.value = children.value.map(c => String(c.id) === String(targetId) ? optimizedChildObject : c);
  } else {
    children.value.push(optimizedChildObject);
  }

  saveDataCacheToDisk();

  if (!isOnline.value) {
    isChildEditorOpen.value = false;
    isLoading.value = false;
    alert("Profile cached locally! Database will fully synchronize once device returns online.");
    return;
  }

  try {
    // 🛠️ Dynamic action selector payload routing
    const payload = {
      action: isEditingExisting ? "updateChildProfile" : "createChildExtended",
      fingerprint: deviceFingerprint.value,
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
      startAmount: optimizedChildObject.startamount // Included for initial signups
    };

    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (data.status === "success") {
      isChildEditorOpen.value = false;
      fetchSyncDatabase(true); // Silent background synchronization update
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    children.value = originalChildrenList; // Safe rollbacks upon core cloud communication faults
    saveDataCacheToDisk();
    alert(`Failed to save configurations online: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

// 🗓️ Core Calendar Milestone Engine
function calculateTargetMilestone(interval) {
  const now = new Date();
  
  if (interval === 'monthly') {
    // Rule: Move strictly to the 1st day of the upcoming calendar month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  } else {
    // Rule: Calculate the distance to the upcoming Monday
    const resultDate = new Date(now);
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Days until next Monday
    let daysToMonday = 1 - currentDayOfWeek;
    if (daysToMonday <= 0) {
      daysToMonday += 7; // If it's Monday today or later in the week, look at next Monday
    }
    
    resultDate.setDate(now.getDate() + daysToMonday);
    return resultDate.toISOString().split('T')[0];
  }
}

// 🛡️ Watcher: Keeps the Next Scheduled Payment locked to your rules automatically
watch(() => childForm.value.allowanceInterval, (newInterval) => {
  // Only auto-calculate a fresh date if the form is open and we don't have a date set yet
  if (isChildEditorOpen.value) {
    childForm.value.allowanceNextDate = calculateTargetMilestone(newInterval);
  }
});

// 🌟 Launcher for creating a completely fresh child account
function openProfileEditorForNewChild() {
  selectedEditChild.value = null; 
  isChildEditorOpen.value = true;
}

// Utility helper checking transaction boundaries from the parent side
function checkChildHasTransactions(childId) {
  if (!childId) return false;
  return transactions.value.some(tx => String(tx.childid || tx.childId) === String(childId));
}

async function handleDeleteChildProfile() {
  if (!childForm.value.id) return;

  // 🔍 Check transaction ledger history
  const hasHistory = transactions.value.some(tx => String(tx.childid || tx.childId) === String(childForm.value.id));
  
  if (hasHistory) {
    alert("🔒 This account cannot be deleted because it has ledger transactions. You can deactivate it instead using the status dropdown below to hide it from daily use.");
    return;
  }

  if (!confirm(`Are you absolutely sure you want to permanently delete the profile for "${childForm.value.name}"? This action cannot be undone.`)) {
    return;
  }

  isLoading.value = true;
  const originalChildrenList = [...children.value];
  const targetId = childForm.value.id;

  // Optimistically remove from local view instantly
  children.value = children.value.filter(c => String(c.id) !== String(targetId));
  saveDataCacheToDisk();

  if (!isOnline.value) {
    isChildEditorOpen.value = false;
    isLoading.value = false;
    alert("Profile deleted locally! It will be removed from the server once you are online.");
    return;
  }

  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteChildProfile",
        fingerprint: deviceFingerprint.value,
        id: targetId
      })
    });

    const data = await response.json();
    if (data.status === "success") {
      isChildEditorOpen.value = false;
      fetchSyncDatabase(true); // Silent background refresh
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    children.value = originalChildrenList; // Roll back local array on failure
    saveDataCacheToDisk();
    alert(`Failed to delete profile from server: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function handleSaveChildProfile(formData) {
  isLoading.value = true;
  const originalChildrenList = [...children.value];
  const isEditingExisting = !!formData.id;
  const targetId = isEditingExisting ? formData.id : `child_${Date.now()}`;
  
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
    startamount: isEditingExisting ? (selectedEditChild.value?.startamount || 0) : 0
  };

  // Optimistic local screen updates
  if (isEditingExisting) {
    children.value = children.value.map(c => String(c.id) === String(targetId) ? optimizedChildObject : c);
  } else {
    children.value.push(optimizedChildObject);
  }
  saveDataCacheToDisk();

  try {
    const payload = {
      action: isEditingExisting ? "updateChildProfile" : "createChildExtended",
      fingerprint: deviceFingerprint.value,
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

    const response = await fetch(SHEET_API_URL, { method: "POST", body: JSON.stringify(payload) });
    const data = await response.json();
    if (data.status === "success") {
      isChildEditorOpen.value = false;
      fetchSyncDatabase(true);
    } else { throw new Error(data.message); }
  } catch (err) {
    children.value = originalChildrenList;
    saveDataCacheToDisk();
    alert(`Error updating profile: ${err.message}`);
  } finally { isLoading.value = false; }
}

async function handleDeleteChildProfileFromServer(targetId) {
  isLoading.value = true;
  const originalChildrenList = [...children.value];
  children.value = children.value.filter(c => String(c.id) !== String(targetId));
  saveDataCacheToDisk();

  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteChildProfile", fingerprint: deviceFingerprint.value, id: targetId })
    });
    const data = await response.json();
    if (data.status === "success") {
      isChildEditorOpen.value = false;
      fetchSyncDatabase(true);
    } else { throw new Error(data.message); }
  } catch (err) {
    children.value = originalChildrenList;
    saveDataCacheToDisk();
    alert(`Error deleting child profile: ${err.message}`);
  } finally { isLoading.value = false; }
}

// Dynamic direct avatar handling route triggered from component
async function handleAvatarDirectUpload({ childId, base64Data }) {
  isLoading.value = true;
  try {
    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "uploadAvatarDirect", fingerprint: deviceFingerprint.value, childId, base64Data })
    });
    const result = await res.json();
    if (result.status === "success" && result.fileId) {
      avatars.value.unshift({ id: `av_opt_${Date.now()}`, childid: childId, drivefileid: result.fileId, uploadedat: new Date().toISOString() });
      fetchSyncDatabase(true); // Pull fresh associations
    } else { throw new Error(result.message); }
  } catch (err) { alert(`Avatar mutation failure: ${err.message}`); }
  finally { isLoading.value = false; }
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

function handleFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    loadedImageAsset = new Image();
    loadedImageAsset.onload = () => {
      isCroppingActive.value = true;
      nextTick(() => initializeCropperWorkspace());
    };
    loadedImageAsset.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function initializeCropperWorkspace() {
  if (!sourceCanvas.value || !loadedImageAsset) return;
  const ctx = sourceCanvas.value.getContext('2d');
  
  // Rule: Cap display workspace viewport to 100% width parameters safely
  const maxWidth = Math.min(workspaceContainer.value.clientWidth, 400);
  scaleRatio = maxWidth / loadedImageAsset.width;
  
  const displayWidth = maxWidth;
  const displayHeight = loadedImageAsset.height * scaleRatio;
  
  sourceCanvas.value.width = displayWidth;
  sourceCanvas.value.height = displayHeight;
  
  // Paint background image scaled to the view area
  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.drawImage(loadedImageAsset, 0, 0, displayWidth, displayHeight);
  
  // Initialize lens selector as a balanced default square in view boundary limits
  const baseSize = Math.min(displayWidth, displayHeight, 140);
  lens.value = {
    x: (displayWidth - baseSize) / 2,
    y: (displayHeight - baseSize) / 2,
    size: baseSize
  };
}

// Interactive Event Listeners (Mouse & Touch compatible tracking)
function startDrag(event, mode) {
  event.preventDefault();
  dragMeta.value.isActive = true;
  dragMeta.value.mode = mode;
  
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  
  dragMeta.value.startX = clientX;
  dragMeta.value.startY = clientY;
  dragMeta.value.startLensX = lens.value.x;
  dragMeta.value.startLensY = lens.value.y;
  dragMeta.value.startLensSize = lens.value.size;
}

function onDrag(event) {
  if (!dragMeta.value.isActive) return;
  
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  
  const deltaX = clientX - dragMeta.value.startX;
  const deltaY = clientY - dragMeta.value.startY;
  
  const canvasW = sourceCanvas.value.width;
  const canvasH = sourceCanvas.value.height;

  if (dragMeta.value.mode === 'move') {
    // Standard translation boundary clipping rules
    let nextX = dragMeta.value.startLensX + deltaX;
    let nextY = dragMeta.value.startLensY + deltaY;
    
    if (nextX < 0) nextX = 0;
    if (nextY < 0) nextY = 0;
    if (nextX + lens.value.size > canvasW) nextX = canvasW - lens.value.size;
    if (nextY + lens.value.size > canvasH) nextY = canvasH - lens.value.size;
    
    lens.value.x = nextX;
    lens.value.y = nextY;
  } else if (dragMeta.value.mode === 'resize') {
    // Proportional uniform bounding box resizing engine rule
    const deltaSize = Math.max(deltaX, deltaY);
    let nextSize = dragMeta.value.startLensSize + deltaSize;
    
    if (nextSize < 40) nextSize = 40; // minimum clamp bounds size
    if (lens.value.x + nextSize > canvasW) nextSize = canvasW - lens.value.x;
    if (lens.value.y + nextSize > canvasH) nextSize = canvasH - lens.value.y;
    
    lens.value.size = nextSize;
  }
}

function endDrag() {
  dragMeta.value.isActive = false;
}

// Generates true transparent target frames
function processInteractiveCrop() {
  if (!outputCanvas.value || !sourceCanvas.value) return;
  const outCtx = outputCanvas.value.getContext('2d');
  
  // Isolate the exact coordinates of our selection lens relative to the original photo sizes
  const sourceCropX = lens.value.x / scaleRatio;
  const sourceCropY = lens.value.y / scaleRatio;
  const sourceCropSize = lens.value.size / scaleRatio;
  
  outCtx.clearRect(0, 0, 100, 100);
  
  // 🌟 PNG Alpha Circle masking logic sequence
  outCtx.beginPath();
  outCtx.arc(50, 50, 50, 0, Math.PI * 2);
  outCtx.clip(); // Locks down subsequent render updates strictly within this circle path bounds
  
  // Draw original picture selection framed down into the masked 100x100 pixel canvas
  outCtx.drawImage(
    loadedImageAsset,
    sourceCropX, sourceCropY, sourceCropSize, sourceCropSize, // Source image bounds
    0, 0, 100, 100 // Target element boundaries
  );
  
  // Export as transparent clean layout PNG string asset
  const base64Data = outputCanvas.value.toDataURL('image/png');
  emit('upload-avatar', { childId: childForm.value.id, base64Data });
  isCroppingActive.value = false;
}

// 🧠 Local storage image stream cache manager
const avatarBase64Cache = ref(JSON.parse(localStorage.getItem("vault_avatar_cache") || "{}"));

async function resolveAndCacheAvatar(childId, driveFileId) {
  if (!driveFileId) return 'https://placehold.co/100x100?text=Face';
  
  // Rule 1: If we have a local cache entry, return it immediately for instant rendering!
  if (avatarBase64Cache.value[childId]) {
    // Silently fetch and update the cache in the background without blocking the UI
    lazyUpdateAvatarCacheInBackground(childId, driveFileId);
    return avatarBase64Cache.value[childId];
  }

  // Rule 2: If no cache exists, hit the drive network source directly
  const secureUrl = `https://drive.google.com/thumbnail?sz=w500&id=${driveFileId}`;
  lazyUpdateAvatarCacheInBackground(childId, driveFileId);
  return secureUrl;
}

async function lazyUpdateAvatarCacheInBackground(childId, driveFileId) {
  if (!isOnline.value) return;
  try {
    const targetUrl = `https://drive.google.com/thumbnail?sz=w500&id=${driveFileId}`;
    const response = await fetch(targetUrl);
    const blob = await response.blob();
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      // Commit string stream directly into localized operational memory arrays
      avatarBase64Cache.value[childId] = base64String;
      localStorage.setItem("vault_avatar_cache", JSON.stringify(avatarBase64Cache.value));
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.warn(`Silent avatar update bypassed: ${err.message}`);
  }
}

// Storage dictionary structure: { "lat_lng_key": { suggestions: [...], lat: X, lng: Y, timestamp: Date } }
const geoProximityCache = ref(JSON.parse(localStorage.getItem("vault_geo_location_cache") || "[]"));

async function getAISuggestionsWithGeoCache(currentLatitude, currentLongitude) {
  const coordinateThreshold = 0.0005; // 🌟 Math: Maps to a ~55-meter radius box bound

  // Check if our cache contains coordinates within our threshold box
  const matchedCacheEntry = geoProximityCache.value.find(entry => {
    const latDelta = Math.abs(entry.lat - currentLatitude);
    const lngDelta = Math.abs(entry.lng - currentLongitude);
    return latDelta <= coordinateThreshold && lngDelta <= coordinateThreshold;
  });

  if (matchedCacheEntry) {
    console.log("🎯 Proximity cache match found within 50m! Returning instantly.");
    
    // 🚀 Background Sync: Refresh the cache silently from the cloud API to catch changes
    silentRefreshGeoCache(currentLatitude, currentLongitude);
    
    return matchedCacheEntry.suggestions;
  }

  // If no cache entry matches, perform standard live cloud API fetching pipeline
  return await fetchLiveLocationSuggestions(currentLatitude, currentLongitude);
}

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

async function silentRefreshGeoCache(lat, lng) {
  if (!isOnline.value) return;
  // Fire request quietly to keep suggestions up to date over time
  const freshSuggestions = await fetchLiveLocationSuggestions(lat, lng);
  console.log("🔄 Background geo-cache synchronization finalized successfully.");
}
</script>

<style scoped>

</style>