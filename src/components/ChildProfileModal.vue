<template>
  <div v-if="isOpen" class="editor-modal-overlay">
    <div class="editor-modal-card" style="position:relative">
       <img
          :src="childForm.avatarFileId ? `https://drive.google.com/thumbnail?sz=w500&id=${childForm.avatarFileId}` : 'https://placehold.co/100x100?text=Face'"
          class="avatar-preview-circle" alt="Active Profile Picture" style="top: 4px;  left: 7px;position: absolute;"
          @click="clickUploadBtn"
          @error="(e) => { e.target.src = 'https://placehold.co/100x100?text=Error' }" />
        <h3 class="editor-modal-title">
          <span v-if="childForm.id" style="padding-left:60px">Edit Profile: <em
            :style="`color:${childForm.accentColor};`">{{ childForm.name }}</em></span>
          <span v-else style="padding-left:60px">➕  New Child Profile</span>
      </h3>
      <div class="editor-modal-body" style="max-height: 70vh; overflow-y: auto;padding-right: 8px;">
        <div class="avatar-workspace-container">
          <div class="avatar-current-row" v-if="!isCroppingActive"></div>
          <div v-if="!isCroppingActive">
            <label style="font-size: 12px;  display: block; margin-bottom: 4px;">Upload file</label>
            <input type="file" ref="imageFileInput" accept="image/*" @change="handleFileChange" class="form-input"
               id="uploadavatar"  style="font-size: 11px; padding: 2px;" />
          </div>

          <div v-if="isCroppingActive" class="cropper-studio">
            <div class="cropper-canvas-wrapper" ref="workspaceContainer" @mousemove="onDrag" @touchmove.passive="onDrag"
              @mouseup="endDrag" @touchend="endDrag" @mouseleave="endDrag">
              <canvas ref="sourceCanvas" class="source-render-canvas"></canvas>

              <div class="crop-lens-overlay" :style="{
                left: (lens?.x ?? 0) + 'px',
                top: (lens?.y ?? 0) + 'px',
                width: (lens?.size ?? 100) + 'px',
                height: (lens?.size ?? 100) + 'px'
              }" @mousedown.self="startDrag($event, 'move')" @touchstart.self="startDrag($event, 'move')">
                <div class="lens-resize-handle" @mousedown.stop="startDrag($event, 'resize')"
                  @touchstart.stop="startDrag($event, 'resize')"></div>
              </div>
            </div>

            <div class="cropper-actions-row">
              <button type="button" @click="isCroppingActive = false" class="btn"
                style="background:#475569; padding: 4px 10px; font-size:11px;">Cancel</button>
              <button type="button" @click="processInteractiveCrop" class="btn btn-submit-tx"
                style="padding: 4px 12px; font-size: 11px; background: #10b981; margin:0;">✂️ Crop</button>
            </div>
          </div>

          <canvas ref="outputCanvas" width="100" height="100" style="display: none;"></canvas>
        </div>

        <div v-if="avatarsList.filter(a => String(a.childid) === String(childForm.id)).length > 0">
          <label>Choose from previously uploaded files:</label>
          <div class="historical-grid-scroller">
            <img v-for="av in avatarsList.filter(a => String(a.childid) === String(childForm.id))" :key="av.id"
              :src="`https://drive.google.com/thumbnail?sz=w500&id=${av.drivefileid}`" class="history-avatar-thumb"
              :class="{ 'active': childForm.avatarFileId === av.drivefileid }"
              @click="childForm.avatarFileId = av.drivefileid" />
          </div>
        </div>

        <div class="form-group" style="margin-top: 0px;">
          <label>Display Name</label>
          <input type="text" v-model="childForm.name" class="form-input" placeholder="Display name string" />
        </div>

        <div class="form-group" style="margin-top: 8px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>🎨 Accent Color</span>
            <input type="color" v-model="childForm.accentColor"
              style="border:none; background:transparent; cursor:pointer; width:36px; height:24px;" />
          </label>

          <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 8px;">
            Contrast Check Preview (Simulated Background Layout Themes):
          </span>

          <div class="color-preview-matrix">
            <div class="preview-tile tile-dark-blue">
              <span :style="{ color: childForm.accentColor }">{{ childForm.name || 'Name' }}</span>
              <small>#182848</small>
            </div>
            <div class="preview-tile tile-dark-green">
              <span :style="{ color: childForm.accentColor }">{{ childForm.name || 'Name' }}</span>
              <small>#143b0e</small>
            </div>
            <div class="preview-tile tile-dark-red">
              <span :style="{ color: childForm.accentColor }">{{ childForm.name || 'Name' }}</span>
              <small>#4a0108</small>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>🤖 Voice AI Variations (Comma separated)</label>
          <input type="text" v-model="childForm.aliases" class="form-input"
            placeholder="e.g. Evie, EV, daughter, princess" />
        </div>


        <div class="form-group">
          <label>Allowance Amount (£)</label>
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
          <input type="text" v-model="childForm.allowanceNextDate" class="form-input"
            style="background: #0f172a; color: #38bdf8; font-weight: bold;" readonly />
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
          <textarea v-model="childForm.comment" class="form-input" rows="4"
            placeholder="Biographical tracking details..."></textarea>
        </div>

        <div class="form-group">
          <label>Account Status Mode</label>
          <select v-model="childForm.status" class="form-input">
            <option value="active">🟢 Active</option>
            <option value="deactivated">🛑 Deactivated</option>
          </select>
        </div>
      </div>
      <div
        style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; align-items: center; width: 100%;">
        <button v-if="childForm.id && !props.hasTransactions" type="button" @click="emitDelete" class="btn"
          style="background: maroon; color: white; margin-right: auto;padding:4px;">
          Delete
        </button>
        <button type="button" @click="$emit('close')" class="btn"
          style="background: #475569;padding:4px">Cancel</button>
        <button type="button" @click="emitSave" class="btn btn-submit-tx"
          style="background: darkgreen;margin: 0;padding: 4px;">💾 Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

// 1. Core Props & Emits Definitions
const props = defineProps({
  isOpen: Boolean,
  initialChildData: Object,
  avatarsList: { type: Array, default: () => [] },
  hasTransactions: Boolean
});

const emit = defineEmits(['close', 'save', 'delete', 'upload-avatar']);

// 2. Form & Profile State Variables
const childForm = ref({
  id: '', name: '', aliases: '', status: 'active',
  interestRate: 0.005, allowanceAmount: 0, allowanceInterval: 'weekly',
  allowanceNextDate: '', comment: '', avatarFileId: '', accentColor: '#38bdf8'
});

// 3. 📸 Cropper Lens Tracking Matrices
const sourceCanvas = ref(null);
const outputCanvas = ref(null);
const workspaceContainer = ref(null);
const isCroppingActive = ref(false);

const lens = ref({ x: 0, y: 0, size: 100 });
const dragMeta = ref({ isActive: false, mode: '', startX: 0, startY: 0, startLensX: 0, startLensY: 0, startLensSize: 0 });

let loadedImageAsset = null;
let scaleRatio = 1;

// 4. Watchers & Lifecycles
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

function clickUploadBtn() {
  document.getElementById('uploadavatar').click();
}

// 5. Image File Handler Pipeline
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

  const maxWidth = Math.min(workspaceContainer.value.clientWidth, 400);
  scaleRatio = maxWidth / loadedImageAsset.width;

  const displayWidth = maxWidth;
  const displayHeight = loadedImageAsset.height * scaleRatio;

  sourceCanvas.value.width = displayWidth;
  sourceCanvas.value.height = displayHeight;

  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.drawImage(loadedImageAsset, 0, 0, displayWidth, displayHeight);

  const baseSize = Math.min(displayWidth, displayHeight, 140);
  lens.value = {
    x: (displayWidth - baseSize) / 2,
    y: (displayHeight - baseSize) / 2,
    size: baseSize
  };
}

// 🌟 6. THE CORE DRAG & SCALE EVENT LISTENERS
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
    let nextX = dragMeta.value.startLensX + deltaX;
    let nextY = dragMeta.value.startLensY + deltaY;

    if (nextX < 0) nextX = 0;
    if (nextY < 0) nextY = 0;
    if (nextX + lens.value.size > canvasW) nextX = canvasW - lens.value.size;
    if (nextY + lens.value.size > canvasH) nextY = canvasH - lens.value.size;

    lens.value.x = nextX;
    lens.value.y = nextY;
  } else if (dragMeta.value.mode === 'resize') {
    const deltaSize = Math.max(deltaX, deltaY);
    let nextSize = dragMeta.value.startLensSize + deltaSize;

    if (nextSize < 40) nextSize = 40;
    if (lens.value.x + nextSize > canvasW) nextSize = canvasW - lens.value.x;
    if (lens.value.y + nextSize > canvasH) nextSize = canvasH - lens.value.y;

    lens.value.size = nextSize;
  }
}

function endDrag() {
  dragMeta.value.isActive = false;
}

function processInteractiveCrop() {
  if (!outputCanvas.value || !sourceCanvas.value) return;
  const outCtx = outputCanvas.value.getContext('2d');

  const sourceCropX = lens.value.x / scaleRatio;
  const sourceCropY = lens.value.y / scaleRatio;
  const sourceCropSize = lens.value.size / scaleRatio;

  outCtx.clearRect(0, 0, 100, 100);

  outCtx.beginPath();
  outCtx.arc(50, 50, 50, 0, Math.PI * 2);
  outCtx.clip();

  outCtx.drawImage(
    loadedImageAsset,
    sourceCropX, sourceCropY, sourceCropSize, sourceCropSize,
    0, 0, 100, 100
  );

  const base64Data = outputCanvas.value.toDataURL('image/png');
  const tid = (String(childForm.value.id)) ? childForm.value.id :  `temp_${Date.now()}`
  childForm.value.id = tid;
  console.log("===== processInteractiveCrop")
  emit('upload-avatar', { tempId: tid, base64Data, childForm }); // childForm.value.id  
  isCroppingActive.value = false;
}

// 7. Global Emits Relays
function emitSave() {
  if (!childForm.value.name.trim()) return triggerSystemAlert("Please enter a profile name.");
  emit('save', { ...childForm.value });
}

function emitDelete() {
  if (props.hasTransactions) {
    triggerSystemAlert("🔒 This account cannot be deleted because it has ledger transactions.");
    return;
  }
  emit('delete', childForm.value.id);

}

defineExpose({ childForm });
</script>