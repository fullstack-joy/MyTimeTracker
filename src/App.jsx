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
import Toast from './components/ui/Toast';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes({ setToast }) {
  return (
    <Router>
      <ScrollToTop />
      <AppRoutesContent setToast={setToast} />
    </Router>
  );
}

function AppRoutesContent({ setToast }) {
  const location = useLocation();
  const [initialRedirect, setInitialRedirect] = useState(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  // On first mount, redirect to last route if available and not already redirected
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

  // Save route on change (but not on first redirect)
  useEffect(() => {
    if (hasRedirected && location && location.pathname) {
      localStorage.setItem('lastRoute', location.pathname);
    }
  }, [location, hasRedirected]);

  // Fix: Always remount Dashboard when navigating to "/"
  // Use a key on Dashboard route that changes with location.key
  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <Routes location={location}>
          <Route path="/" element={<Dashboard key={location.key} />}/>
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
  const [toast, setToast] = useState(null);

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

    // Debug: Open DevTools with Ctrl+Alt+D or Cmd+Ctrl+D
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
      <AppRoutes setToast={setToast} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </TimeTrackerProvider>
  );
}
