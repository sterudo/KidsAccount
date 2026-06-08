<template>
  <section class="screen single-column-screen" style="margin-top:30px">
    <div class="card structural-form adduserform" style="margin-top:30px">
      <h2>Add Authorized Parent/User</h2>
      <form @submit.prevent="$emit('submit')">
        <div class="form-vertical-group">
          <label for="new-user-name">Parent Name</label>
          <input 
            id="new-user-name" 
            :value="modelValue.name" 
            @input="$emit('update:modelValue', { ...modelValue, name: $event.target.value })" 
            type="text" 
            placeholder="Display Name" 
            required 
          />
        </div>

        <div class="form-vertical-group">
          <label for="new-user-name">Role</label>
         <select
          id="new-user-role" 
          :value="modelValue.role" 
          @change="$emit('update:modelValue', { ...modelValue, role: $event.target.value })" 
          required 
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
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
        </div>
        <button type="submit" class="btn btn-success block-btn">Register User</button>
      </form>
      
      <div class="user-list-display">
        <h3 style="margin-top: 16px;">Registered Users</h3>
        <p v-if="!users || users.length === 0" class="empty-state" style="font-size: 0.9em; color: #64748b;">
          No registered users found.
        </p>
        <ul v-else class="deletable-list">
          <li v-for="user in users" :key="user.id">
            <span>{{ user.name }}</span>
            <span> ({{ user.role }})</span>
            <button 
              v-if="isUserDeletable(user.id)" 
              @click="$emit('delete-user', user.id)" 
              class="btn-delete-small" 
              title="Delete User"
            >
              Delete
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
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
  }
});

// Broadcast form events back up to App.vue orchestration layer
defineEmits(['submit', 'update:modelValue', 'delete-user']);
</script>
<style>
 .adduserform label {
  color: #92b5e2;
  font-weight: normal !important;
  position: relative;
  top: 8px;
 }

</style>