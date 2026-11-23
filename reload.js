// Extension-origin page only. No extra permissions, server or debugging port.
const nonce = new URL(location.href).searchParams.get('nonce');
if (nonce) {
  if (localStorage.getItem('reloadNonce') !== nonce) {
    localStorage.setItem('reloadNonce', nonce);
    chrome.runtime.reload();
  }
  window.close();
}
