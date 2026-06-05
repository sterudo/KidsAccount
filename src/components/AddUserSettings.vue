<template>
  <section class="screen single-column-screen">
    <div class="card structural-form" slyle="margin-top:30px">
      <h2>Add Authorized Parent/User</h2>
      <form @submit.prevent="$emit('submit')">
        <div class="form-vertical-group">
          <label for="new-user-name">Parent Name</label>
          <input 
            id="new-user-name" 
            :value="modelValue" 
            @input="$emit('update:modelValue', $event.target.value)" 
            type="text" 
            placeholder="e.g. Mum" 
            required 
          />
        </div>
        <button type="submit" class="btn btn-success block-btn">Register User</button>
      </form>
      
      <div class="user-list-display">
        <h3>Registered Users</h3>
        <p v-if="!users || users.length === 0" class="empty-state" style="font-size: 0.9em; color: #64748b;">
          No registered users found.
        </p>
        <ul v-else class="deletable-list">
          <li v-for="user in users" :key="user">
            <span>{{ user }}</span>
            <button 
              v-if="isUserDeletable(user)" 
              @click="$emit('delete-user', user)" 
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
    type: String,
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