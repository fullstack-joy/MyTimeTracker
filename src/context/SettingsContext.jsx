import React, { createContext, useContext, useEffect, useState } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

// Modified initialSettings to check system preference for darkMode
const getInitialDarkMode = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true; // Default to dark mode if matchMedia is not available (e.g., SSR, older browsers)
};

const initialSettings = {
  screenshotEnabled: true,
  idleTimeout: 5,
  darkMode: getInitialDarkMode(), // Use function to get initial dark mode state
  dailyGoal: 6,
  autoExport: false,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const storedSettings = localStorage.getItem('settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Ensure initialSettings provides defaults for any missing keys
        // The spread order handles darkMode correctly:
        // initialSettings.darkMode is the base, parsedSettings.darkMode overrides if present.
        return {
          ...initialSettings,
          ...parsedSettings,
        };
      }
      // If no stored settings, use initialSettings (which includes system-derived darkMode).
      return initialSettings;
    } catch (error) {
      console.error("Failed to parse settings from localStorage:", error);
      // Fallback to initial settings if localStorage is corrupt or parsing fails.
      return initialSettings;
    }
  });

  useEffect(() => {
    // This effect now correctly applies the initial settings (including system-derived darkMode if nothing was stored)
    // to localStorage on first load if nothing was there.
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(initialSettings);
    // localStorage will be updated by the useEffect hook
  };

  const replaceAllSettings = (newSettings) => {
    if (newSettings && typeof newSettings === 'object') {
      // Validate or merge with initialSettings to ensure all keys are present
      const mergedSettings = { ...initialSettings, ...newSettings };
      setSettings(mergedSettings);
    } else {
      // Fallback to initial if imported settings are invalid
      setSettings(initialSettings);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, replaceAllSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};