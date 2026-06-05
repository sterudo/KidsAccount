<template>
  <section class="screen single-column-screen">
    <div class="card structural-form">
      <h2>Create New Child Account</h2>
      <form @submit.prevent="$emit('submit')">
        <div class="form-vertical-group">
          <label for="new-name">Child's Name</label>
          <input id="new-name" v-model="form.name" type="text" placeholder="e.g. Liam" required />
        </div>
        <div class="form-vertical-group">
          <label for="new-start">Starting Balance (£)</label>
          <input id="new-start" v-model.number="form.startAmount" type="number" step="0.01" min="0" />
        </div>
        <div class="form-vertical-group">
          <label for="new-allowance">Weekly Allowance Amount (£)</label>
          <input id="new-allowance" v-model.number="form.weeklyAllowance" type="number" step="0.01" min="0" />
        </div>
        <button type="submit" class="btn btn-success block-btn">Save Child Account</button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

// Define the incoming reactive form state bound from App.vue
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
});

// Define outward events to alert the parent orchestration script when saving
const emit = defineEmits(['submit', 'update:modelValue']);

// Maintain a computed proxy to allow clean two-way data sync mutations
const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});
</script>
