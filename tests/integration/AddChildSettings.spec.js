// tests/integration/AddChildSettings.spec.js
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AddChildSettings from '@/components/AddChildSettings.vue';

describe('AddChildSettings.vue Form Integration Test Spec', () => {
  
  // Setup a mock reactive object model structure representing our frontend form state
  const createMockForm = () => ({
    name: '',
    startAmount: 0,
    weeklyAllowance: 0
  });

  it('binds text inputs to state models and correctly fires submit payload actions', async () => {
    const mockFormState = createMockForm();
    
    // 1. Mount the Vue SFC into our simulated jsdom wrapper layer
    const wrapper = mount(AddChildSettings, {
      props: {
        modelValue: mockFormState,
        'onUpdate:modelValue': (val) => Object.assign(mockFormState, val)
      }
    });

    // 2. Select the HTML input nodes
    const nameInput = wrapper.find('#new-name');
    const startInput = wrapper.find('#new-start');
    const allowanceInput = wrapper.find('#new-allowance');

    // 3. Simulate real human typings into the PWA form fields
    await nameInput.setValue('Tester Kid');
    await startInput.setValue(150.50);
    await allowanceInput.setValue(7.25);

    // Verify component internal value modifications synchronizations reflect accurately
    expect(mockFormState.name).toBe('Tester Kid');
    expect(mockFormState.startAmount).toBe(150.50);
    expect(mockFormState.weeklyAllowance).toBe(7.25);

    // 4. Trigger the form submit button event execution
    await wrapper.find('form').trigger('submit.prevent');

    // 5. Assert that the component successfully emitted its submit bubble alert to App.vue
    expect(wrapper.emitted()).toHaveProperty('submit');
    expect(wrapper.emitted('submit').length).toBe(1);
  });
});