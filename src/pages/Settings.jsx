import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { FiSun, FiMoon } from 'react-icons/fi'; // Import icons

export default function Settings() {
  const { settings, updateSetting, resetSettings, replaceAllSettings } = useSettings();
  const { clearAllTrackerData, replaceAllTrackerData, projects, tasks, sessions: contextSessions } = useTimeTracker();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [notifications, setNotifications] = useState(
    JSON.parse(localStorage.getItem('notifications')) || {
      enabled: true,
      sound: false,
      breakReminders: true,
    }
  );

  const [breakInterval, setBreakInterval] = useState(
    Number(localStorage.getItem('breakInterval')) || 60
  );

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
        if (data.projects || data.tasks || data.sessions) {
          replaceAllTrackerData({
            projects: data.projects || [],
            tasks: data.tasks || [],
            sessions: data.sessions || [],
          });
        }
        if (data.settings) {
          replaceAllSettings(data.settings);
        }
        alert('Data imported successfully!');
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <div className="text-gray-900 dark:text-white bg-white dark:bg-black flex flex-col h-full"> {/* MODIFIED: Changed text-black to text-gray-900 */}
      <h1 className="text-2xl font-bold mb-6 flex-shrink-0 px-6 pt-6">Settings</h1> {/* MODIFIED: Added px-6 pt-6 here for title */}

      <div className="flex-grow overflow-y-auto p-6"> {/* MODIFIED: Added p-6 here */}
        {/* General Settings */}
        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">General</h2>
          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm">Theme Mode (Dark/Light)</label>
            <button
              onClick={() => updateSetting('darkMode', !settings.darkMode)}
              className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={settings.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {settings.darkMode ? (
                <FiSun size={20} className="text-yellow-500" />
              ) : (
                <FiMoon size={20} className="text-indigo-500" />
              )}
            </button>
          </div>
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
              className="bg-gray-200 dark:bg-gray-800 px-3 py-2 rounded w-full text-black dark:text-white"
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
              className="w-full px-3 py-2 rounded bg-gray-200 dark:bg-gray-800 text-black dark:text-white"
            />
          </div>
          
        </div>

        {/* Notifications */}
        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
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
        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Breaks</h2>
          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm">Break Reminder Interval (minutes)</label>
            <input
              type="number"
              min="10"
              max="180"
              value={breakInterval}
              onChange={e => handleBreakIntervalChange(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded bg-gray-200 dark:bg-gray-800 text-black dark:text-white"
            />
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow mb-6">
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
            <div className="mt-4 bg-red-200 dark:bg-red-900 bg-opacity-80 p-4 rounded">
              <div className="mb-2 font-semibold text-red-800 dark:text-red-100">Are you sure you want to clear all data? This cannot be undone.</div>
              <button
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm font-medium mr-2"
                onClick={handleClearData}
              >
                Yes, Clear All
              </button>
              <button
                className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-800 px-4 py-2 rounded text-black dark:text-white text-sm font-medium"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
