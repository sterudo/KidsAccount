<template>
  <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
    <div class="modal-card about-card" @click.stop>
      <div class="modal-header">
        <div class="header-logo-group">
          <span class="about-emoji-logo">🤑</span>
          <h3>Kids Accounts <span class="app-version-tag">v{{ appVersion }} (PWA)</span></h3>
        </div>
        <button type="button" @click="$emit('close')" class="btn-close-modal">✕</button>
      </div>
      
      <div class="modal-body">
        
        <p class="app-description">
          A secure, voice-driven smart ledger tracking kids' pocket money, allowances, and savings history directly connected to your private cloud spreadsheet backend.
        </p>
        
        <hr class="modal-divider" />
        
        <div class="about-meta-grid">
          <div class="meta-item">
            <p class="meta-label">Author:</p>
            <p class="meta-value">Stephan Rudolph (sterudo (at) gmail.com)</p>
          </div>
          <div class="meta-item">
            <p class="meta-label">GIThub page:</p>
            <p class="meta-value"><a href="https://github.com/sterudo/KidsAccount" target="_blank">github.com/sterudo/KidsAccount</a>              
              <br>
              <a href="https://github.com/sterudo/KidsAccount/blob/main/README.md" target="_blank">readme.md</a>
              <br>
              <a href="https://sterudo.github.io/KidsAccount/marketing/index.html" target="_blank">Marketing Website</a>
            </p>
          </div>
          <div class="meta-item">
            <p class="meta-label">Tech stack:</p>
            <p class="meta-value">Vue.js, Tests, vite, JavaScript, HTML, CSS, PWA, Google Sheets API, Google Drive, gemini-2.5-flash</p>
          </div>
          <div class="meta-item">
            <p class="meta-label">Features:</p>
            <p class="meta-value">PWA, Web, Offline mode and connectivity checker, 
                AI features (Dictation, Camera, Location), Authentication, Responsiveness, mobile first, Backup and Restore</p>
          </div>
          <div class="meta-item">
            <p class="meta-label">Version History:</p>
            <div class="meta-value"><ul>
                <li><strong>0.106</strong> - fingerprint and cleanup</li>
                <li><strong>0.97</strong> - Device management, WhoPaid, readme, webpage improvements</li>
                <li><strong>0.92</strong> - User roles</li>
                <li><strong>0.78</strong> - User management improvements</li>
                <li><strong>0.73</strong> - Device authentication improvements</li>
                <li><strong>0.70</strong> - styling, childmanagemt, refactoring </li>
                <li><strong>0.39</strong> - bug fixes, caching </li>
                <li><strong>0.38</strong> - Image handling </li>
                <li><strong>0.37</strong> - Management module, delete </li>
                <li><strong>0.36</strong> - Accent color</li>
                <li><strong>0.35</strong> - Children management.</li>
                <li><strong>0.34</strong> - Visual improvements mainly Dashboard.</li>
                <li><strong>0.33</strong> - API Key fixes.</li>
                <li><strong>0.32</strong> - Child to Child transfer</li>
                <li><strong>0.31</strong> - JSON export and import, Backup to Google Drive</li>
                <li><strong>v0 - v0.30</strong> - PWA, Web, Offline mode and connectivity checker, AI features (Dictation, Camera, Location), Authentication, Responsiveness, mobile first</li>
            </ul></div>
          </div>        
          <div>
            <code>{{ fingerprint }}</code>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  appVersion: {
    type: String,
    required: true
  },
  fingerprint: {
    type: String,
    required: true
  }
});

defineEmits(['close']);
</script>

<style scoped>
/* Scoped layout styles to ensure isolation from App.vue grid systems */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000; /* Ensure it floats above everything */
  padding: 20px;
}

.modal-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: modalSlideUp 0.2s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #334155;
  background-color: #0f172a;
}

.header-logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.about-emoji-logo {
  font-size: 1.8rem;
  line-height: 1;
}

.modal-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.25rem;
  font-weight: 600;
}

.btn-close-modal {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.15s;
}

.btn-close-modal:hover {
  color: #f1f5f9;
}

.modal-body {
  padding: 20px;
  color: #cbd5e1;
      max-height: 50vh;
    overflow-y: auto;
}

.app-version-tag {
  font-size: 0.8rem;
  color: #38bdf8;
  font-weight: bold;
  letter-spacing: 0.05em;
  margin-top: 0;
  margin-bottom: 8px;
}

.app-description {
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.modal-divider {
  border: 0;
  height: 1px;
  background-color: #334155;
  margin: 16px 0;
}

.about-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meta-item {
display: flex;
    font-size: 0.85rem;
    flex-direction: column;
    width: 100%;
    align-content: start;
    align-items: start;
    align-self: start;
}

.meta-label {
  color: #64748b;
}

.meta-value {
    color: #e2e8f0;
    font-weight: normal;
    text-align: left;
    max-width: 100%;
    position: relative;
    top: -6px;

}

div.meta-value ul {
        margin: 0px;
        padding: 0px;
        padding-left: 0px;
        list-style: none;
    }

.modal-footer {
  padding: 12px 20px;
  background-color: #0f172a;
  border-top: 1px solid #334155;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-secondary {
  background-color: #334155;
  color: #f1f5f9;
  transition: background-color 0.15s;
}

.btn-secondary:hover {
  background-color: #475569;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(15px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>