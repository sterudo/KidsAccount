// tests/integration/Backup.spec.js
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BackupSettings from '@/components/BackupSettings.vue';

describe('BackupSettings.vue Integrity Verification Specs', () => {

  it('locks down Cloud Automation triggers securely when operating offline', () => {
    const wrapper = mount(BackupSettings, {
      props: {
        apiUrl: 'https://mock-script.google.com/exec',
        fingerprint: 'mock-test-fingerprint',
        isOnline: false // 📉 FORCE DEVICE OFFLINE
      }
    });

    const cloudButton = wrapper.find('.btn-cloud');
    expect(cloudButton.attributes()).toHaveProperty('disabled');
    expect(wrapper.text()).toContain('Cloud features locked while operating in Offline Mode.');
  });
});