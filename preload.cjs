// preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  takeScreenshot: (label) => ipcRenderer.send('time-tracker:screenshot', label),
  onScreenshotSaved: (cb) => {
    ipcRenderer.on('time-tracker:screenshot-saved', (_, data) => {
      if (data && typeof data.filePath === 'string') {
        cb(data.filePath);
        // Dispatch a DOM event for React to listen
        window.dispatchEvent(new CustomEvent('screenshot-saved', { detail: data }));
      } else {
        console.error('Invalid filePath received:', data);
      }
    });
  },
  onScreenshotError: (cb) => ipcRenderer.on('time-tracker:screenshot-error', (_, err) => cb(err)),
  listScreenshots: () => ipcRenderer.invoke('time-tracker:list-screenshots'),
  deleteScreenshot: (filePath) => ipcRenderer.invoke('time-tracker:delete-screenshot', filePath),
  openDevTools: (mode = 'right') => ipcRenderer.send('open-devtools', mode),
  onStopAllSessions: (cb) => ipcRenderer.on('time-tracker:stop-all-sessions', cb),
  removeStopAllSessions: (cb) => ipcRenderer.removeListener('time-tracker:stop-all-sessions', cb),
});
