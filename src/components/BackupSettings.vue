<template>
  <div class="backup-manager-card">
    <h3>💾 Data Lifecycle Backup & Restore</h3>
    <p class="section-hint">Manage external storage snapshots. System structure is auto-validated before rewrite application loops.</p>
    
    <div class="action-grid">
      <div class="action-row">
        <h4>Local Device File Options</h4>
        <div class="btn-group">
          <button type="button" @click="handleLocalExport" class="btn btn-primary" :disabled="isProcessing">
            📥 Export to JSON File
          </button>
          
          <label class="btn btn-secondary file-input-label" :class="{ 'disabled-btn': isProcessing }">
            📤 Restore from JSON File
            <input type="file" accept=".json" @change="handleLocalImport" :disabled="isProcessing" ref="fileField" />
          </label>
        </div>
      </div>

      <div class="action-row">
        <h4>Google Drive Cloud Automation</h4>
        <div class="btn-group">
          <button type="button" @click="handleDriveBackup" class="btn btn-cloud" :disabled="isProcessing || !isOnline">
            ☁️ Safe Snapshot to Drive
          </button>
        </div>
        <small v-if="!isOnline" class="error-text">⚠️ Cloud features locked while operating in Offline Mode.</small>
      </div>
    </div>
    
    <div v-if="statusMessage" class="status-banner" :class="statusType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  apiUrl: { type: String, required: true },
  fingerprint: { type: String, required: true },
  isOnline: { type: Boolean, default: true }
});

const emit = defineEmits(['trigger-refresh']);

const isProcessing = ref(false);
const statusMessage = ref("");
const statusType = ref("info");
const fileField = ref(null);

function updateStatus(msg, type = "info") {
  statusMessage.value = msg;
  statusType.value = type;
}

// 1. EXPORT TO LOCAL JSON
async function handleLocalExport() {
  isProcessing.value = true;
  updateStatus("Compiling data fields...");
  try {
    const response = await fetch(props.apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "exportBackup", fingerprint: props.fingerprint, target: "client" })
    });
    const result = await response.json();
    
    if (result.status === "success") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.database, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `allowance_vault_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      updateStatus("JSON backup downloaded successfully!", "success");
    } else {
      throw new Error(result.message || "Failed extraction execution.");
    }
  } catch (err) {
    updateStatus(`Export failed: ${err.message}`, "error");
  } finally {
    isProcessing.value = false;
  }
}

// 2. RESTORE FROM LOCAL JSON FILE
function handleLocalImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  isProcessing.value = true;
  updateStatus("Reading structural file fields...");

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsedJson = JSON.parse(e.target.result);
      
      if (!confirm("⚠️ WARNING: Restoring will overwrite all current spreadsheet data rows. Are you sure you want to proceed?")) {
        isProcessing.value = false;
        updateStatus("Operation aborted.");
        return;
      }

      updateStatus("Uploading & validating database layout schema...");
      const response = await fetch(props.apiUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "importRestore",
          fingerprint: props.fingerprint,
          database: parsedJson
        })
      });
      const data = await response.json();

      if (data.status === "success") {
        updateStatus("Success! Database completely restored.", "success");
        emit('trigger-refresh'); // Force update UI layouts
      } else {
        throw new Error(data.message || "Spreadsheet rejected file structure alignment.");
      }
    } catch (err) {
      updateStatus(`Restore failed: ${err.message}`, "error");
    } finally {
      isProcessing.value = false;
      if (fileField.value) fileField.value.value = ""; // reset field node
    }
  };
  reader.readAsText(file);
}

// 3. EXECUTE BACKUP DIRECT TO GOOGLE DRIVE
async function handleDriveBackup() {
  isProcessing.value = true;
  updateStatus("Sending cloud backup trigger signal...");
  try {
    const response = await fetch(props.apiUrl, {
      method: "POST",
      body: JSON.stringify({ action: "exportBackup", fingerprint: props.fingerprint, target: "drive" })
    });
    const result = await response.json();
    if (result.status === "success") {
      updateStatus(result.message, "success");
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    updateStatus(`Drive snapshot failed: ${err.message}`, "error");
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style scoped>
.backup-manager-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  color: #f8fafc;
}
.backup-manager-card h3 { margin-top: 0; font-size: 1.15rem; color: #f1f5f9; }
.section-hint { font-size: 0.85rem; color: #64748b; margin-bottom: 16px; }
.action-grid { display: flex; flex-direction: column; gap: 16px; }
.action-row h4 { margin: 0 0 8px 0; font-size: 0.9rem; color: #94a3b8; }
.btn-group { display: flex; gap: 10px; flex-wrap: wrap; }
.btn { padding: 10px 14px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; font-size: 0.85rem; display: inline-block; }
.btn-primary { background-color: #2563eb; color: white; }
.btn-secondary { background-color: #475569; color: white; }
.btn-cloud { background-color: #0d9488; color: white; }
.btn:disabled, .disabled-btn { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
.file-input-label input[type="file"] { display: none; }
.status-banner { margin-top: 14px; padding: 10px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 500; }
.status-banner.info { background-color: #1e293b; border-left: 4px solid #38bdf8; color: #38bdf8; }
.status-banner.success { background-color: #064e3b; border-left: 4px solid #34d399; color: #34d399; }
.status-banner.error { background-color: #7f1d1d; border-left: 4px solid #f87171; color: #f87171; }
.error-text { color: #ef4444; font-size: 0.75rem; margin-top: 4px; display: block; }
</style>