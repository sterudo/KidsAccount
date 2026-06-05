// tests/integration/AddUserSettings.spec.js
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AddUserSettings from '@/components/AddUserSettings.vue';

describe('AddUserSettings.vue Parent Manager Integration Test Spec', () => {

  // A helper function to quickly mount the component with customized props/stubs
  const factory = (propsData = {}) => {
    return mount(AddUserSettings, {
      props: {
        modelValue: '',
        users: ['Dad', 'Mum', 'Grandpa'],
        isUserDeletable: (user) => user !== 'Dad', // Dad is treated as the master account (not deletable)
        ...propsData
      }
    });
  };

  it('renders a clean empty state text statement when user arrays arrive blank', () => {
    const wrapper = factory({ users: [] });
    
    // Asserts that the empty helper statement text appears inside the component wrapper
    expect(wrapper.text()).toContain('No registered users found.');
    expect(wrapper.find('.deletable-list').exists()).toBe(false);
  });

  it('populates a text row list item for every authorized array index parameter provided', () => {
    const mockUsers = ['Alice', 'Bob', 'Charlie'];
    const wrapper = factory({ users: mockUsers });
    
    const renderedRows = wrapper.findAll('.deletable-list li');
    expect(renderedRows.length).toBe(3);
    expect(renderedRows[0].text()).toContain('Alice');
    expect(renderedRows[1].text()).toContain('Bob');
    expect(renderedRows[2].text()).toContain('Charlie');
  });

  it('enforces functional permission security bounds on delete action controls', () => {
    // According to our mock factory function, 'Dad' returns false for deletable; others return true
    const wrapper = factory({ users: ['Dad', 'Mum'] });
    const listItems = wrapper.findAll('.deletable-list li');

    // 🌟 FIX: Loop and assert explicitly using standard Vitest matchers
    let dadRowFound = false;
    let mumRowFound = false;

    listItems.forEach(item => {
      const rowText = item.text();
      
      if (rowText.includes('Dad')) {
        dadRowFound = true;
        // Assert that the delete button DOES NOT exist inside the Dad row wrapper
        expect(item.find('.btn-delete-small').exists()).toBe(false);
      }
      
      if (rowText.includes('Mum')) {
        mumRowFound = true;
        // Assert that the delete button DOES exist inside the Mum row wrapper
        expect(item.find('.btn-delete-small').exists()).toBe(true);
      }
    });

    // Integrity check to ensure both test subject items were actually processed in the loop
    expect(dadRowFound).toBe(true);
    expect(mumRowFound).toBe(true);
  });

  it('captures text field updates and triggers form submission triggers successfully', async () => {
    let parentFormState = '';
    const wrapper = mount(AddUserSettings, {
      props: {
        modelValue: parentFormState,
        users: ['Dad'],
        isUserDeletable: () => true,
        'onUpdate:modelValue': (val) => { parentFormState = val; }
      }
    });

    const textInput = wrapper.find('#new-user-name');
    
    // Simulate a parent typing 'Grandma' into the registering name text field
    await textInput.setValue('Grandma');
    
    // Check that the v-model sync pattern bound the mutation backward into parent variables
    expect(parentFormState).toBe('Grandma');

    // Trigger the HTML form submission element wrapper
    await wrapper.find('form').trigger('submit.prevent');

    // Assert that the submit alert event cracked and signaled out to the root App controller
    expect(wrapper.emitted()).toHaveProperty('submit');
    expect(wrapper.emitted('submit').length).toBe(1);
  });

  it('broadcasts an explicitly targeted deletion parameter back up when clicking delete buttons', async () => {
    const wrapper = factory({ users: ['Dad', 'Mum'] });
    const listItems = wrapper.findAll('.deletable-list li');
    
    let mumRowWrapper = null;

    // 🌟 FIX: Safely loop through elements to locate the exact wrapper matching 'Mum'
    for (const item of listItems) {
      if (item.text().includes('Mum')) {
        mumRowWrapper = item;
        break;
      }
    }

    // Ensure our loop successfully located the target row element before clicking
    expect(mumRowWrapper).not.toBeNull();
    
    // Now execute the click simulation safely on the specific element node
    await mumRowWrapper.find('.btn-delete-small').trigger('click');

    // Assert that 'delete-user' bubbled outward
    expect(wrapper.emitted()).toHaveProperty('delete-user');
    expect(wrapper.emitted('delete-user').length).toBe(1);
    
    // Verify the custom payload passes the argument matching the targeted item name string
    expect(wrapper.emitted('delete-user')[0]).toEqual(['Mum']);
  });
});