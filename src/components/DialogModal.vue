<template>
    <Transition name="modal-fade">
        <div v-if="dialogConfig.isOpen" class="custom-modal-overlay" @click.self="closeDialog">
            <div class="custom-modal-box" role="alertdialog" aria-modal="true">
                <div class="custom-modal-header">                   
                    <h3> <span class="custom-modal-icon">⚠️</span> {{ dialogConfig.title }}</h3>
                </div>
                <div class="custom-modal-body">
                    <p>{{ dialogConfig.message }}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="custom-modal-btn" ref="confirmBtn" @click="closeDialog">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { dialogConfig, closeDialog } from '../utils/dialogState.js';

const confirmBtn = ref(null);

// Automatically focus the dismiss button when opened for better accessibility
watch(() => dialogConfig.isOpen, async (newVal) => {
    if (newVal) {
        await nextTick();
        confirmBtn.value?.focus();
    }
});
</script>

<style scoped>
.custom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
}

.custom-modal-box {
    background: black;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 85%;
    box-shadow: 0 10px 25px rgba(255, 255, 255, 0.15);
    text-align: center;
    z-index: 10002;
}

.custom-modal-header h3 {
    margin: 8px 0;
    font-size: 1.25rem;
    color:white;
}

.custom-modal-body p {
    color: rgb(255, 194, 77);;
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 16px 0;
    margin-top: 32px;
    margin-bottom: 32px;
    text-align: left;
    max-height: 50vh;
    overflow-y: auto;
}

.custom-modal-btn {
    background-color: #2563EB;
    color: #ffffff;
    border: none;
    padding: 10px 24px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background 0.2s;
}

.custom-modal-btn:hover {
    background: #222222;
}

/* Smooth Fade/Scale Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-active .custom-modal-box {
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-leave-active .custom-modal-box {
    transition: transform 0.2s ease-in;
}

.modal-fade-enter-from .custom-modal-box {
    transform: scale(0.9) translateY(10px);
}

.modal-fade-leave-to .custom-modal-box {
    transform: scale(0.95);
}
</style>