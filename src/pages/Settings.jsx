import React, { useState } from 'react';
import { useSettings, SettingsProvider } from '../context/SettingsContext';

function SettingsContent() {
  const { settings, updateSetting } = useSettings();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState(
    JSON.parse(localStorage.getItem('notifications')) || {
      enabled: true,
      sound: false,
      breakReminders: true,
    }
  );

  // Break settings
  const [breakInterval, setBreakInterval] = useState(
    Number(localStorage.getItem('breakInterval')) || 60
  );

  // Apply dark mode to <body> when toggled
  React.useEffect(() => {
    if (settings.darkMode) {
      document.body.classList.add('bg-black', 'text-white');
      document.body.classList.remove('bg-white', 'text-black');
    } else {
      document.body.classList.remove('bg-black', 'text-white');
      document.body.classList.add('bg-white', 'text-black');
    }
  }, [settings.darkMode]);

  // Handlers
  const handleNotificationsChange = (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const handleBreakIntervalChange = (val) => {
    setBreakInterval(val);
    localStorage.setItem('breakInterval', val);
  };

  const handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleExportData = () => {
    const data = {
      projects: JSON.parse(localStorage.getItem('projects') || '[]'),
      tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
      sessions: JSON.parse(localStorage.getItem('sessions') || '[]'),
      settings: JSON.parse(localStorage.getItem('settings') || '{}'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetracker-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.projects) localStorage.setItem('projects', JSON.stringify(data.projects));
        if (data.tasks) localStorage.setItem('tasks', JSON.stringify(data.tasks));
        if (data.sessions) localStorage.setItem('sessions', JSON.stringify(data.sessions));
        if (data.settings) localStorage.setItem('settings', JSON.stringify(data.settings));
        window.location.reload();
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* General Settings */}
      <div className="bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">General</h2>
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm">Enable Screenshot Capture</label>
          <input
            type="checkbox"
            checked={settings.screenshotEnabled}
            onChange={(e) => updateSetting('screenshotEnabled', e.target.checked)}
            className="w-5 h-5"
          />
        </div>
        <div className="mb-4">
          <label className="text-sm block mb-1">Idle Timeout (minutes)</label>
          <select
            value={settings.idleTimeout}
            onChange={(e) => updateSetting('idleTimeout', parseInt(e.target.value))}
            className="bg-gray-800 px-3 py-2 rounded w-full text-white"
          >
            {[5, 10, 15, 30].map((min) => (
              <option key={min} value={min}>{min} min</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="text-sm block mb-1">Daily Time Goal (hours)</label>
          <input
            type="number"
            min="1"
            value={settings.dailyGoal}
            onChange={(e) => updateSetting('dailyGoal', parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white"
          />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm">Enable Dark Mode</label>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) => updateSetting('darkMode', e.target.checked)}
            className="w-5 h-5"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm">Enable Notifications</label>
          <input
            type="checkbox"
            checked={notifications.enabled}
            onChange={e => handleNotificationsChange('enabled', e.target.checked)}
            className="w-5 h-5"
          />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm">Sound on Screenshot</label>
          <input
            type="checkbox"
            checked={notifications.sound}
            onChange={e => handleNotificationsChange('sound', e.target.checked)}
            className="w-5 h-5"
          />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm">Break Reminders</label>
          <input
            type="checkbox"
            checked={notifications.breakReminders}
            onChange={e => handleNotificationsChange('breakReminders', e.target.checked)}
            className="w-5 h-5"
          />
        </div>
      </div>

      {/* Breaks */}
      <div className="bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Breaks</h2>
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm">Break Reminder Interval (minutes)</label>
          <input
            type="number"
            min="10"
            max="180"
            value={breakInterval}
            onChange={e => handleBreakIntervalChange(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded bg-gray-800 text-white"
          />
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>
        <div className="flex flex-wrap gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm font-medium"
            onClick={handleExportData}
          >
            Export Data
          </button>
          <label className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm font-medium cursor-pointer">
            Import Data
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportData}
            />
          </label>
          <button
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm font-medium"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear All Data
          </button>
        </div>
        {showClearConfirm && (
          <div className="mt-4 bg-red-900 bg-opacity-80 p-4 rounded">
            <div className="mb-2 font-semibold">Are you sure you want to clear all data? This cannot be undone.</div>
            <button
              className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded text-white text-sm font-medium mr-2"
              onClick={handleClearData}
            >
              Yes, Clear All
            </button>
            <button
              className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded text-white text-sm font-medium"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <SettingsProvider>
      <SettingsContent />
    </SettingsProvider>
  );
}
