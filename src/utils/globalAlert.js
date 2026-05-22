/**
 * Utility bridge to trigger beautiful alerts via GlobalAlertBridge.
 * Since GlobalAlertBridge overrides window.alert and resolves variants
 * based on negative/positive keyword matching, we format the message accordingly.
 */
export const globalAlert = {
  showSuccess: (message) => {
    window.alert(`Exito: ${message}`);
  },
  showError: (message) => {
    window.alert(`Error: ${message}`);
  },
  showInfo: (message) => {
    window.alert(`Info: ${message}`);
  }
};
