<template>
    <div class="action-menu-container" v-click-outside="closeMenu">
        <button type="button" @click="toggleMenu" class="btn-menu-trigger" :class="{ 'menu-active': isOpen }"
            title="Options Menu">
            ⋮
        </button>

        <transition name="dropdown-fade">
            <div v-if="isOpen" class="menu-dropdown-card">
                <div class="menu-section-title" v-if="currentUser.role == 'admin' || currentUser.role == 'super'">Navigation & Profiles</div>

                <button :disabled="!isOnline" type="button" class="menu-item" :class="{ 'isDisabled': !isOnline }"
                    @click="triggerAction('addUserSettings')" v-if="currentUser.role == 'admin' || currentUser.role == 'super'" >
                    <span class="menu-item-icon">👥</span> Add / Manage Parents
                </button>

                <button :disabled="!isOnline" type="button" v-if="currentUser.role == 'admin' || currentUser.role == 'super'" class="menu-item" :class="{ 'isDisabled': !isOnline }"
                    @click="$emit('request-add-child')">
                    <span class="menu-item-icon">👦</span> Add New Child Profile
                </button>

                <hr class="menu-divider" v-if="currentUser.role == 'admin' || currentUser.role == 'super'" />

                <div class="menu-section-title" v-if="currentUser.role == 'admin' || currentUser.role == 'super'">System Utilities</div>

                <button :disabled="!isOnline" type="button" class="menu-item" :class="{ 'isDisabled': !isOnline }"
                    @click="triggerAction('refreshDatabase')">
                    <span class="menu-item-icon">🔄</span> Refresh / Sync
                </button>
                <button :disabled="!isOnline" type="button" class="menu-item" :class="{ 'isDisabled': !isOnline }"
                    @click="triggerAction('backupSettings')" v-if="currentUser.role == 'super'" >
                    <span class="menu-item-icon">💾</span> Backup & Restore
                </button>

                <button type="button" class="menu-item" @click="triggerAction('toggleHelp')">
                    <span class="menu-item-icon">💡</span> {{ showHelp ? 'Hide Speech Help' : 'Show Speech Help' }}
                </button>

                <button type="button" class="menu-item debug-toggle" :class="{ 'debug-on': debugMode }"
                    @click="triggerAction('toggleDebug')" v-if="currentUser.role == 'admin' || currentUser.role == 'super'" >
                    <span class="menu-item-icon">⚙️</span> Debug Console: {{ debugMode ? 'ON' : 'OFF' }}
                </button>

                <button type="button" class="menu-item" @click="triggerAction('aboutDialog')">
                    <span class="menu-item-icon">ℹ️</span> About This App
                </button>

                  <hr class="menu-divider" v-if="currentUser.role == 'super'" />
                <div class="menu-section-title" v-if="currentUser.role == 'super'">Admin Controls</div>

                <button :disabled="!isOnline" type="button" class="menu-item" 
                  @click="triggerAction('deviceAuth')" v-if="currentUser.role == 'super'">
                    <span class="menu-item-icon">🛡️</span> Manage Device Auth
                </button>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

defineProps({
    debugMode: {
        type: Boolean,
        default: false
    },
    showHelp: {
        type: Boolean,
        default: false
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    currentUser : {
        type: Object,
        default: { }
    }
});

const emit = defineEmits(['navigate', 'refresh', 'toggle-debug', 'toggle-help']);

const isOpen = ref(false);

function toggleMenu() {
    isOpen.value = !isOpen.value;
}

function closeMenu() {
    isOpen.value = false;
}

function triggerAction(actionType) {
    closeMenu();

    if (actionType === 'addUserSettings' || actionType === 'addChildSettings') {
        emit('navigate', actionType);
    } else if (actionType === 'refreshDatabase') {
        emit('refresh');
    } else if (actionType === 'toggleDebug') {
        emit('toggle-debug');
    } else if (actionType === 'backupSettings') {
        emit('navigate', 'backupSettings');
    } else if (actionType === 'toggleHelp') {
        emit('toggle-help');
    } else if (actionType === 'aboutDialog') {
        emit('about');
    } else if (actionType === 'deviceAuth') {
        emit('navigate', 'deviceAuth');
    }
}

// Simple custom directive simulation logic to catch outside viewport click boundaries
const vClickOutside = {
    mounted(el, binding) {
        el.clickOutsideEvent = (event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        document.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
    }
};
</script>

<style scoped>
.action-menu-container {
    position: relative;
    display: inline-block;
}

.btn-menu-trigger {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.8rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0 8px;
    line-height: 1;
    border-radius: 6px;
    transition: color 0.15s, background-color 0.15s;
    width: 32px;
}

.btn-menu-trigger:hover,
.btn-menu-trigger.menu-active {
    color: #f1f5f9;
    background-color: #1e293b;
}

.menu-dropdown-card {
    position: absolute;
    top: calc(100% + 55px);
    right: 0;
    width: 240px;
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 40px 2px rgb(0, 0, 0);
    padding: 6px;
    z-index: 9999;
}

.menu-section-title {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    padding: 6px 10px 4px 10px;
    font-weight: bold;
}

.menu-item {
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    padding: 10px 12px;
    font-size: 0.9rem;
    color: #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background-color 0.15s, color 0.15s;
}

.menu-item:hover {
    background-color: #293548;
    color: #ffffff;
}

.menu-item-icon {
    margin-right: 10px;
    font-size: 1.05rem;
    width: 18px;
    text-align: center;
}

.menu-divider {
    border: 0;
    height: 1px;
    background-color: #334155;
    margin: 6px 0;
}

.debug-toggle.debug-on {
    color: #38bdf8;
    font-weight: 500;
}

/* Dropdown Animation Hooks */
.dropdown-fade-enter-active {
    transition: all 0.15s ease-out;
}

.dropdown-fade-leave-active {
    transition: all 0.1s ease-in;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
    transform: translateY(-8px);
    opacity: 0;
}
</style>