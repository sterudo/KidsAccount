<script setup>
/**
 * SystemConfirm Component
 * Provides a non-blocking, Promise-based alternative to window.confirm().
 */
import { ref } from 'vue';

const isOpen = ref(false);
const message = ref('');
const title = ref('');
let resolvePromise = null;

const triggerSystemConfirm = (msg, t = 'Confirmation') => {
    message.value = msg;
    title.value = t;
    isOpen.value = true;
    return new Promise((resolve) => {
        resolvePromise = resolve;
    });
};

const handleConfirm = () => {
    isOpen.value = false;
    if (resolvePromise) {
        resolvePromise(true);
    }
};

const handleCancel = () => {
    isOpen.value = false;
    if (resolvePromise) {
        resolvePromise(false);
    }
};

defineExpose({ triggerSystemConfirm });
</script>

<template>
    <div v-if="isOpen" class="confirm-back">
        <div class="confirm-dialog">
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>
            <div style="display: flex; gap: 0.75rem;">
                <button @click="handleCancel" class="cancelBtn">Cancel</button>
                <button @click="handleConfirm" class="confirmBbtn">Confirm</button>
            </div>
        </div>
    </div>
</template>

<style>
.confirm-back {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 9999
}

.confirm-dialog {
    width: 100%;
    max-width: 400px;
    padding: 1.5rem;
    background-color: black;
    border-radius: 1rem;
    z-index: 10000;
    box-shadow: rgba(255, 255, 255, 0.1) 0px 10px 15px -3px;
}

.confirm-dialog .confirmBbtn {
    flex: 1;
    padding: 0.5rem 1rem;
    color: white;
    background-color: #2563EB;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;    
}

.confirm-dialog .cancelBtn {
    flex: 1 1 0%;
    padding: 0.5rem 1rem;
    color: black;
    background-color: silver;
    border: medium;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.confirm-dialog p {
    margin-bottom: 1.5rem;
    color: rgb(255, 194, 77);
}

.confirm-dialog h3 {
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
    font-weight: bold;
    color: white;
}
</style>