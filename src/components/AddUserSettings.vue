<template>
  <section class="screen single-column-screen" style="margin-top:30px">
    <div class="card structural-form adduserform" style="margin-top:30px">
      <h2>{{ modelValue.mode === 'edit' ? `Edit ${modelValue?.name}` : 'Add Authorized Parent/User' }}</h2>
      <form @submit.prevent="$emit('submit')">
        <div class="form-vertical-group">
          <label for="new-user-name">User/Parent Name</label>
          <input 
            id="new-user-name" 
            :value="modelValue.name" 
            @input="$emit('update:modelValue', { ...modelValue, name: $event.target.value })" 
            type="text" 
            required 
          />
        </div>

        <div class="form-vertical-group">
          <label for="new-user-role">Role</label>
         <select
          id="new-user-role" 
          :value="modelValue.role" 
          @change="$emit('update:modelValue', { ...modelValue, role: $event.target.value })" 
          required 
        >
          
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="super" v-if="modelValue.role === 'super'" >Super</option>
        </select>
        </div>
        <div class="form-vertical-group">
          <label for="new-user-pass">Password</label>
          <input maxlength="16"
            id="new-user-password" 
            :value="modelValue.pass" 
            @input="$emit('update:modelValue', { ...modelValue, pass: $event.target.value })"     
            type="password"       
          />
          <p  v-if="modelValue.mode === 'edit'" style="font-size: 12px;
  color: silver;
  margin-top: 2px;
  margin-left: 6px;
  line-height: 1.2em;">Empty password will keep the current password unchanged.</p>
        </div>
        <div class="form-vertical-group" v-if="modelValue.mode === 'edit'">
          <label for="new-user-remove"><input  style="display: inline;max-width: 20px;"
            id="new-user-remove" 
            :checked="modelValue.removePass" 
            @change="$emit('update:modelValue', { ...modelValue, removePass: $event.target.checked })"     
            type="checkbox"       
          /> Remove Password</label>
          
        </div>
        <br></br>
        <button type="submit" class="btn btn-success block-btn">
          {{  (modelValue.mode === 'edit') ? 'Edit User' : 'Register User'}}</button>
      </form>
      
      <div class="user-list-display">
        <h3 style="margin-top: 16px;">Registered Users</h3>

        <p v-if="!users || users.length === 0" class="empty-state" style="font-size: 0.9em; color: #64748b;">
          No registered users found.
        </p>

        <ul v-else class="deletable-list">
          <li v-for="user in users" :key="user.id" style="display: grid; grid-template-columns: 1fr 100px 50px 50px; gap: 8px;">
            <span>{{ user.name }}</span>
            <span> ({{ user.role }})</span>
            <button  v-if="(currentUser.id === 'Dad' && user.id == 'Dad') || (user.id !== 'Dad')"          
              @click="editUser(user.id)" 
              class="btn-edit-small" 
              title="Edit User"
            >
              Edit
            </button>
            <span v-if="!((currentUser.id === 'Dad' && user.id == 'Dad') || (user.id !== 'Dad'))"><br></span>
            <button 
              v-if="isUserDeletable(user.id)" 
              @click="$emit('delete-user', user.id)" 
              class="btn-delete-small" 
              title="Delete User"
            >
              Delete
            </button>
            <span  v-if="!isUserDeletable(user.id)"><br></span> 
          </li>
        </ul>
        <button              
              @click="newNewUser" 
              class="btn-new-small" 
              title="Add User"
            >
              Add new user
            </button>
      </div>
    </div>
  </section>
</template>

<script setup>

import { onMounted, nextTick } from 'vue';
import { triggerSystemAlert } from '../utils/dialogState.js';

onMounted(() => {
  // Auto-focus password input when component mounts
  setTimeout(() => {
    const input = document.getElementById("new-user-name");
    if (input) input.focus();
  }, 300);
});

function editUser(userId) {
  emit('edit-user', userId);
  
  // 3. Use nextTick instead of a guessed setTimeout
  nextTick(() => {
    const input = document.getElementById("new-user-name");
    if (input) {
      input.focus();
    }
  });
}

function newNewUser() {
  emit('new-user');
  
  // 3. Use nextTick instead of a guessed setTimeout
  nextTick(() => {
    const input = document.getElementById("new-user-name");
    if (input) {
      input.focus();
    }
  });
}

// Explicitly map incoming system values and arrays
defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  users: {
    type: Array,
    required: true,
    default: () => []
  },
  isUserDeletable: {
    type: Function,
    required: true
  },
  currentUser: {
     type: Object,
     required: true
  }
});

// Broadcast form events back up to App.vue orchestration layer
const emit = defineEmits(['submit', 'update:modelValue', 'delete-user','edit-user', 'new-user']);
</script>
<style>
 .adduserform label {
  color: #92b5e2;
  font-weight: normal !important;
  position: relative;
  top: 8px;
 }

.form-vertical-group {
  margin-bottom: 0px !important;
}
</style>