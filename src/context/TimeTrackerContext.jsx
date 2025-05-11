// src/context/TimeTrackerContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSettings } from './SettingsContext';

const TimeTrackerContext = createContext();

export const useTimeTracker = () => useContext(TimeTrackerContext);

export const TimeTrackerProvider = ({ children }) => {
  // Fix: Provide a fallback if useSettings() is undefined (e.g., if not wrapped in SettingsProvider)
  const settingsCtx = useSettings?.() || {};
  const settings = settingsCtx.settings || {
    screenshotEnabled: true,
    idleTimeout: 5,
    darkMode: true,
    dailyGoal: 6,
    autoExport: false,
  };

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);

  const toastRef = useRef(null);
  const setToastExternal = (fn) => { toastRef.current = fn; };

  useEffect(() => {
    const storedProjects = JSON.parse(localStorage.getItem('projects')) || [];
    const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const storedSessions = JSON.parse(localStorage.getItem('sessions')) || [];
    setProjects(storedProjects);
    setTasks(storedTasks);
    setSessions(storedSessions);
  }, []);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    let timeoutId;
    const scheduleScreenshot = () => {
      const min = 10 * 60 * 1000;
      const max = 15 * 60 * 1000;
      const delay = Math.floor(Math.random() * (max - min)) + min;

      timeoutId = setTimeout(() => {
        const runningTask = tasks.find(task => task.isRunning);
        // Only take screenshot if enabled in settings
        if (
          settings?.screenshotEnabled &&
          runningTask &&
          window.electronAPI?.takeScreenshot
        ) {
          const project = projects.find(p => p.id === runningTask.projectId);
          const label = `${project ? project.name : 'Unknown'}-${runningTask.title}`;
          window.electronAPI.takeScreenshot(label);
          if (toastRef.current) {
            toastRef.current(`📸 Screenshot taken during: ${label}`);
          }
          if (window.Notification && Notification.permission === 'granted') {
            new Notification('📸 Screenshot Taken', { body: `During: ${label}` });
          }
        }
        scheduleScreenshot();
      }, delay);
    };

    // Only schedule if screenshots are enabled and there is at least one running task
    if (settings?.screenshotEnabled && tasks.some(t => t.isRunning)) {
      scheduleScreenshot();
    }

    return () => clearTimeout(timeoutId);
  }, [projects, tasks, settings]);

  const addProject = (name) => {
    if (!name.trim()) {
      console.error('Project name cannot be empty');
      return;
    }
    const newProject = { id: Date.now(), name };
    setProjects((prev) => [...prev, newProject]);
  };

  const addTask = (projectId, title) => {
    if (!title.trim()) {
      console.error('Task title cannot be empty');
      return;
    }
    const newTask = { id: Date.now(), projectId, title };
    setTasks((prev) => [...prev, newTask]);
  };

  // Add session and set isRunning on task, stop all other running sessions
  const addSession = (taskId, startTime = new Date().toISOString()) => {
    if (!taskId) {
      console.error('Task ID is required to add a session');
      return;
    }
    // Stop all other running sessions
    setSessions((prev) =>
      prev.map((s) =>
        !s.endTime ? { ...s, endTime: new Date().toISOString() } : s
      )
    );
    // Set isRunning only on this task, false for others
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, isRunning: true } : { ...t, isRunning: false }
      )
    );
    // Add new session
    const newSession = { id: Date.now(), taskId, startTime, endTime: null, time: 0, screenshots: [] };
    setSessions((prev) => [...prev, newSession]);
  };

  // Stop session and unset isRunning on task
  const stopSession = (taskId) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.taskId === taskId && !s.endTime
          ? { ...s, endTime: new Date().toISOString() }
          : s
      )
    );
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isRunning: false } : t))
    );
  };

  // Mark project as complete
  const completeProject = (projectId) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, completed: true } : p))
    );
  };

  // Reopen a completed project
  const reopenProject = (projectId) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, completed: false } : p))
    );
  };

  return (
    <TimeTrackerContext.Provider value={{
      projects, tasks, sessions,
      addProject, addTask, addSession, stopSession, setToastExternal,
      completeProject, reopenProject
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
};
