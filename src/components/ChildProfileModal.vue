<template>
  <div v-if="isOpen" class="editor-modal-overlay">
    <div class="editor-modal-card">
      <h3 class="editor-modal-title"><span v-if="childForm.id">⚙️ Configure Profile: <em :style="`color:${childForm.accentColor};`">{{ childForm.name }}</em></span>
      <span v-else>➕ Create New Child Profile</span></h3>
      <div class="editor-modal-body" style="max-height: 70vh; overflow-y: auto;">
        <div class="avatar-workspace-flex">
            <img 
            :src="childForm.avatarFileId ? `https://docs.google.com/uc?export=view&id=${childForm.avatarFileId}` : 'https://placehold.co/100x100?text=Face'" 
            class="avatar-preview-circle" 
            alt="Active Profile Picture"
            />
            
            <div style="flex: 1;">
    
            <div v-if="isCroppingActive" style="margin-top: 10px; display: flex; align-items: center; gap: 12px;">
                <canvas ref="cropCanvas" class="crop-canvas-box"></canvas>
                <button type="button" @click="saveCroppedAvatar" class="btn btn-submit-tx" style="padding: 6px 12px; font-size: 11px; background: #10b981;">✂️ Crop & Save</button>
            </div>
            </div>
        </div>
            <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Update Face Portrait</label>
            <input type="file" ref="imageFileInput" accept="image/*" @change="handleFileChange" class="form-input" style="font-size: 12px; padding: 4px;" />
            
        <div v-if="avatarsList.filter(a => String(a.childid) === String(childForm.id)).length > 0">
            <span style="font-size: 11px; color: #64748b;">Choose from previously uploaded history files:</span>
            <div class="historical-grid-scroller">
            <img 
                v-for="av in avatarsList.filter(a => String(a.childid) === String(childForm.id))" 
                :key="av.id"
                :src="`https://docs.google.com/uc?export=view&id=${av.drivefileid}`"
                class="history-avatar-thumb"
                :class="{ 'active': childForm.avatarFileId === av.drivefileid }"
                @click="childForm.avatarFileId = av.drivefileid"
            />
            </div>
        </div>

        <div class="form-group" style="margin-top: 15px;">
            <label>Display Name</label>
            <input type="text" v-model="childForm.name" class="form-input" placeholder="Display name string" />
        </div>

        <div class="form-group" style="margin-top: 15px;">
            <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>🎨 Accent Color</span>
            <input type="color" v-model="childForm.accentColor" style="border:none; background:transparent; cursor:pointer; width:36px; height:24px;" />
            </label>
            
            <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 8px;">
            Contrast Check Preview (Simulated Background Layout Themes):
            </span>
            
            <div class="color-preview-matrix">
            <div class="preview-tile tile-dark-blue">
                <span :style="{ color: childForm.accentColor }">{{ childForm.name || 'Child Name' }}</span>
                <small>#182848</small>
            </div>
            <div class="preview-tile tile-dark-green">
                <span :style="{ color: childForm.accentColor }">{{ childForm.name || 'Child Name' }}</span>
                <small>#143b0e</small>
            </div>
            <div class="preview-tile tile-dark-red">
                <span :style="{ color: childForm.accentColor }">{{ childForm.name || 'Child Name' }}</span>
                <small>#4a0108</small>
            </div>
            </div>
        </div>

        <div class="form-group">
            <label>🤖 Voice AI Variations / Aliases (Comma separated)</label>
            <input type="text" v-model="childForm.aliases" class="form-input" placeholder="e.g. Evie, EV, daughter, princess" />
        </div>

        
            <div class="form-group">
            <label>Allowance Amount ($)</label>
            <input type="number" step="0.25" v-model.number="childForm.allowanceAmount" class="form-input" />
            </div>
            <div class="form-group">
            <label>Payment Interval</label>
            <select v-model="childForm.allowanceInterval" class="form-input">
                <option value="weekly">Weekly (Every Monday)</option>
                <option value="monthly">Monthly (1st of Month)</option>
            </select>
            </div>
    

    
            <div class="form-group">
            <label>📅 Next Scheduled Payment</label>
            <input type="text" v-model="childForm.allowanceNextDate" class="form-input" style="background: #0f172a; color: #38bdf8; font-weight: bold;" readonly />
            </div>
            <div class="form-group">
            <label>📈 Growth Interest Rate</label>
            <select v-model.number="childForm.interestRate" class="form-input">
                <option :value="0.00">0% No Incentive</option>
                <option :value="0.005">0.5% Regular Standard</option>
                <option :value="0.01">1.0% High Savings Rate</option>
                <option :value="0.02">2.0% Aggressive Incentive</option>
            </select>
            </div>
    

        <div class="form-group">
            <label>Internal Ledger Comments / Notes</label>
            <textarea v-model="childForm.comment" class="form-input" rows="2" placeholder="Biographical tracking details..."></textarea>
        </div>

        <div class="form-group">
            <label>Account Status Mode</label>
            <select v-model="childForm.status" class="form-input">
            <option value="active">Active Operational Status</option>
            <option value="deactivated">🛑 Deactivated</option>
            </select>
        </div>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; align-items: center; width: 100%;">
        <button v-if="childForm.id" type="button" @click="emitDelete" class="btn" style="background: maroon; color: white; margin-right: auto;padding:4px;">
          🗑️ Delete
        </button>
        <button type="button" @click="$emit('close')" class="btn" style="background: #475569;padding:4px">Cancel</button>
        <button type="button" @click="emitSave" class="btn btn-submit-tx" style="background: darkgreen;margin: 0;padding: 4px;">💾 Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  initialChildData: Object,
  avatarsList: { type: Array, default: () => [] },
  hasTransactions: Boolean
});

const emit = defineEmits(['close', 'save', 'delete', 'upload-avatar']);

const childForm = ref({
  id: '', name: '', aliases: '', status: 'active',
  interestRate: 0.005, allowanceAmount: 0, allowanceInterval: 'weekly',
  allowanceNextDate: '', comment: '', avatarFileId: '', accentColor: '#38bdf8'
});

const imageFileInput = ref(null);
const cropCanvas = ref(null);
const isCroppingActive = ref(false);
let rawImageElement = null;

// Synchronize profile mapping when component opens or initial child transitions
watch(() => props.isOpen, (openState) => {
  if (openState) {
    if (props.initialChildData) {
      const c = props.initialChildData;
      childForm.value = {
        id: c.id || '',
        name: c.name || '',
        aliases: c.aliases || '',
        status: c.status || 'active',
        interestRate: Number(c.interestrate || c.interestRate || 0.005),
        allowanceAmount: Number(c.allowanceamount || c.weeklyAllowance || 0),
        allowanceInterval: c.allowanceinterval || 'weekly',
        allowanceNextDate: c.allowancenextdate || '',
        comment: c.comment || '',
        avatarFileId: c.avatarfileid || '',
        accentColor: c.accentcolor || c.accentColor || '#38bdf8'
      };
    } else {
      // Flush form defaults for adding a completely fresh child profile
      childForm.value = {
        id: '', name: '', aliases: '', status: 'active',
        interestRate: 0.005, allowanceAmount: 0, allowanceInterval: 'weekly',
        allowanceNextDate: '', comment: '', avatarFileId: '', accentColor: '#38bdf8'
      };
    }
    if (!childForm.value.allowanceNextDate) {
      childForm.value.allowanceNextDate = calculateTargetMilestone(childForm.value.allowanceInterval);
    }
    isCroppingActive.value = false;
  }
}, { immediate: true });

// Calendar Engine Tracking
function calculateTargetMilestone(interval) {
  const now = new Date();
  if (interval === 'monthly') {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  } else {
    const resultDate = new Date(now);
    const currentDay = now.getDay();
    let daysToMonday = 1 - currentDay;
    if (daysToMonday <= 0) daysToMonday += 7;
    resultDate.setDate(now.getDate() + daysToMonday);
    return resultDate.toISOString().split('T')[0];
  }
}

watch(() => childForm.value.allowanceInterval, (newInterval) => {
  if (props.isOpen) {
    childForm.value.allowanceNextDate = calculateTargetMilestone(newInterval);
  }
});

// Canvas Cropping Pipeline
function handleFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    rawImageElement = new Image();
    rawImageElement.onload = () => {
      isCroppingActive.value = true;
      nextTick(() => drawCropCanvas());
    };
    rawImageElement.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawCropCanvas() {
  if (!cropCanvas.value) return;
  const ctx = cropCanvas.value.getContext('2d');
  cropCanvas.value.width = 100;
  cropCanvas.value.height = 100;
  const minDim = Math.min(rawImageElement.width, rawImageElement.height);
  const sx = (rawImageElement.width - minDim) / 2;
  const sy = (rawImageElement.height - minDim) / 2;
  ctx.clearRect(0, 0, 100, 100);
  ctx.drawImage(rawImageElement, sx, sy, minDim, minDim, 0, 0, 100, 100);
}

function saveCroppedAvatar() {
  if (!cropCanvas.value || !childForm.value.id) return;
  const base64Data = cropCanvas.value.toDataURL('image/jpeg', 0.85);
  emit('upload-avatar', { childId: childForm.value.id, base64Data });
  isCroppingActive.value = false;
}

// Global programmatic action relays out to parent view context wrapper
function emitSave() {
  if (!childForm.value.name.trim()) return alert("Please enter a profile name.");
  emit('save', { ...childForm.value });
}

function emitDelete() {
  if (props.hasTransactions) {
    alert("🔒 This account cannot be deleted because it has ledger transactions. You can deactivate it instead using the status dropdown.");
    return;
  }
  if (confirm(`Are you absolutely sure you want to permanently delete "${childForm.value.name}"?`)) {
    emit('delete', childForm.value.id);
  }
}

// Expose internal form modifications back to parent updates
defineExpose({ childForm });
</script>