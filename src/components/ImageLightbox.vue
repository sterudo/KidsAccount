<template>
  <div v-if="isOpen" class="wait-scrim-overlay" @click="closeModal" style="z-index: 9999;">
    <div class="image-preview-modal-card" @click.stop>
      <div class="image-preview-header">
        <h4>🖼️ Attached Receipt Image</h4>
        <button type="button" @click="closeModal" class="btn-close-preview">✕</button>
      </div>
      
      <div class="image-preview-body">
        <img :src="imageUrl" alt="loading Receipt Document" class="full-preview-img" @load="imgLoad" />
      </div>
      <p v-if="isImgLoading">Loading ....</p>
      
      <div class="image-preview-footer">
        <a :href="imageUrl" target="_blank" class="btn-open-tab-fallback">Open External ↗</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const isImgLoading = ref(true)
// Define incoming data requirements from parent orchestration view
defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  }
});

// Define outward events to bubble communication back up to parent state handlers
const emit = defineEmits(['close']);

function imgLoad(event) {
  if(event.target.src.length > 200) {
      isImgLoading.value = false;
  } else {
      isImgLoading.value = true;
  }
}

function closeModal() {
  emit('close');
}
</script>

<style scoped>
/* Modal Card Overrides for Image Previews */
.image-preview-modal-card {
    background: #0f172a !important;
    border: 1px solid #334155 !important;
    max-width: 90vw !important;
    width: 380px !important;
    padding: 16px !important;
    border-radius: 12px !important;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.image-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 8px;
}

.image-preview-header h4 {
    margin: 0;
    color: #f1f5f9;
}

.btn-close-preview {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
}

.btn-close-preview:hover {
    color: #ef4444;
}

.image-preview-body {
    width: 100%;
    max-height: 60vh;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #020617;
    border-radius: 6px;
    border: 1px solid #1e293b;
}

.full-preview-img {
    max-width: 100%;
    max-height: 60vh;
    object-fit: contain; /* Ensures photo keeps true aspect ratio rules inside container bounds */
    display: block;
}

.image-preview-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
}
</style>