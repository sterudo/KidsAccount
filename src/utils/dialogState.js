// dialogState.js
import { reactive } from 'vue';

export const dialogConfig = reactive({
  isOpen: false,
  title: 'Notification',
  message: ''
});

export function triggerSystemAlert(message, title = 'Security Alert') {
  dialogConfig.message = message;
  dialogConfig.title = title;
  dialogConfig.isOpen = true;
}

export function closeDialog() {
  dialogConfig.isOpen = false;
}