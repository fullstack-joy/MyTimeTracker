import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import Analytics from './pages/Analytics';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import History from './pages/History';
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';
import { TimeTrackerProvider } from './context/TimeTrackerContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import Toast from './components/ui/Toast';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutesAndContent() {
  const { settings } = useSettings();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (settings.darkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    if (window.electronAPI?.onScreenshotSaved) {
      window.electronAPI.onScreenshotSaved((filePath) => {
        const fileName = filePath.split('/').pop();
        setToast(`📸 Screenshot saved: ${fileName}`);
      });
    }

    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (
        (isMac && e.metaKey && e.ctrlKey && e.key.toLowerCase() === 'i') ||
        (!isMac && e.ctrlKey && e.altKey && e.key.toLowerCase() === 'i')
      ) {
        if (window.electronAPI?.openDevTools) {
          window.electronAPI.openDevTools('right');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <TimeTrackerProvider>
      <Router>
        <ScrollToTop />
        <AppRoutesLayout setToast={setToast} />
      </Router>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </TimeTrackerProvider>
  );
}

function AppRoutesLayout({ setToast }) {
  const location = useLocation();
  const [initialRedirect, setInitialRedirect] = useState(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!hasRedirected) {
      const lastRoute = localStorage.getItem('lastRoute');
      if (
        lastRoute &&
        lastRoute !== '/' &&
        location.pathname === '/'
      ) {
        setInitialRedirect(lastRoute);
        setHasRedirected(true);
      } else {
        setHasRedirected(true);
      }
    }
  }, [location.pathname, hasRedirected]);

  useEffect(() => {
    if (hasRedirected && location && location.pathname) {
      localStorage.setItem('lastRoute', location.pathname);
    }
  }, [location, hasRedirected]);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white relative">
      <Sidebar />
      <div className="flex-1"> {/* MODIFIED: Removed overflow-y-auto */}
        <Routes location={location}>
          <Route path="/" element={<Dashboard key={location.key} />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppRoutesAndContent />
    </SettingsProvider>
  );
}
