<template>
  <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
    <div class="modal-card about-card" @click.stop>
      <div class="modal-header">
        <div class="header-logo-group">
          <span class="about-emoji-logo">🤑</span>
          <h3>Allowance Vault</h3>
        </div>
        <button type="button" @click="$emit('close')" class="btn-close-modal">✕</button>
      </div>
      
      <div class="modal-body">
        <p class="app-version-tag">Version 2.4.0 (PWA)</p>
        <p class="app-description">
          A secure, voice-driven smart ledger tracking kids' pocket money, allowances, and savings history directly connected to your private cloud spreadsheet backend.
        </p>
        
        <hr class="modal-divider" />
        
        <div class="about-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Environment:</span>
            <span class="meta-value">Production</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Storage Engine:</span>
            <span class="meta-value">Google Sheets API</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Features:</span>
            <span class="meta-value">Speech Synthesis, Strict MIME Checking, Offline Cache</span>
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
  max-width: 420px;
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
}

.app-version-tag {
  font-size: 0.8rem;
  color: #38bdf8;
  text-transform: uppercase;
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
  justify-content: space-between;
  font-size: 0.85rem;
}

.meta-label {
  color: #64748b;
}

.meta-value {
  color: #e2e8f0;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
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