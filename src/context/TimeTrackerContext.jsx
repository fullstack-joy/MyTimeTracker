// src/context/TimeTrackerContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSettings } from './SettingsContext';

const TimeTrackerContext = createContext();

export const useTimeTracker = () => useContext(TimeTrackerContext);

const PROJECTS_KEY = 'projects';
const TASKS_KEY = 'tasks';
const SESSIONS_KEY = 'sessions';

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

  const [projects, setProjects] = useState(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_KEY);
      return storedProjects ? JSON.parse(storedProjects) : [];
    } catch (error) {
      console.error("Failed to parse projects from localStorage:", error);
      return [];
    }
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const storedTasks = localStorage.getItem(TASKS_KEY);
      return storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
      console.error("Failed to parse tasks from localStorage:", error);
      return [];
    }
  });

  const [sessions, setSessions] = useState(() => {
    try {
      const storedSessions = localStorage.getItem(SESSIONS_KEY);
      return storedSessions ? JSON.parse(storedSessions) : [];
    } catch (error) {
      console.error("Failed to parse sessions from localStorage:", error);
      return [];
    }
  });

  const toastRef = useRef(null);
  const setToastExternal = (fn) => { toastRef.current = fn; };

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
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

  // Listen for stop-all-sessions event from main process
  useEffect(() => {
    function handleStopAllSessions() {
      setSessions((prev) =>
        prev.map((s) =>
          !s.endTime ? { ...s, endTime: new Date().toISOString() } : s
        )
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.isRunning ? { ...t, isRunning: false } : t
        )
      );
    }
    if (window.electronAPI && window.electronAPI.onStopAllSessions) {
      window.electronAPI.onStopAllSessions(handleStopAllSessions);
    } else if (window.require) {
      // For older preload, fallback to ipcRenderer
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.on('time-tracker:stop-all-sessions', handleStopAllSessions);
    }
    return () => {
      if (window.electronAPI && window.electronAPI.removeStopAllSessions) {
        window.electronAPI.removeStopAllSessions(handleStopAllSessions);
      } else if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.removeListener('time-tracker:stop-all-sessions', handleStopAllSessions);
      }
    };
  }, []);

  const addProject = (name) => {
    if (!name.trim()) {
      console.error('Project name cannot be empty');
      return;
    }
    const newProject = { id: Date.now(), name, completed: false }; // Ensure completed is initialized
    setProjects((prev) => [...prev, newProject]);
  };

  const addTask = (projectId, title) => {
    if (!title.trim()) {
      console.error('Task title cannot be empty');
      return;
    }
    const newTask = { id: Date.now(), projectId, title, isRunning: false }; // Ensure isRunning is initialized
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

  const updateProjectName = (projectId, newName) => {
    if (!newName.trim()) {
      console.error('Project name cannot be empty');
      return;
    }
    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p.id === projectId ? { ...p, name: newName } : p
      )
    );
  };

  const deleteProjectAndRelatedData = (projectId) => {
    const tasksToDelete = tasks.filter(task => task.projectId === projectId);
    const taskIdsToDelete = tasksToDelete.map(task => task.id);

    setProjects((prevProjects) => prevProjects.filter(p => p.id !== projectId));
    setTasks((prevTasks) => prevTasks.filter(task => task.projectId !== projectId));
    setSessions((prevSessions) => prevSessions.filter(session => !taskIdsToDelete.includes(session.taskId)));
  };

  const duplicateExistingProject = (projectToDuplicate) => {
    const newProject = { ...projectToDuplicate, id: Date.now(), name: `${projectToDuplicate.name} (Copy)`, completed: false };
    const originalTasks = tasks.filter(t => t.projectId === projectToDuplicate.id);
    const newTasks = originalTasks.map(t => ({
      ...t,
      id: Date.now() + Math.random(), // Ensure unique ID
      projectId: newProject.id,
      isRunning: false,
    }));

    setProjects(prev => [...prev, newProject]);
    setTasks(prev => [...prev, ...newTasks]);
  };

  const updateTaskTitle = (taskId, newTitle) => {
    if (!newTitle.trim()) {
      console.error('Task title cannot be empty');
      return;
    }
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, title: newTitle } : t
      )
    );
  };

  const deleteTaskAndRelatedData = (taskId) => {
    setTasks((prevTasks) => prevTasks.filter(t => t.id !== taskId));
    setSessions((prevSessions) => prevSessions.filter(s => s.taskId !== taskId));
  };

  const deleteSession = (sessionId) => {
    setSessions((prevSessions) => prevSessions.filter(s => s.id !== sessionId));
  };

  const clearAllTrackerData = () => {
    setProjects([]);
    setTasks([]);
    setSessions([]);
    // localStorage will be cleared by the useEffect hooks when states become empty
  };

  const replaceAllTrackerData = (data) => {
    setProjects(data.projects || []);
    setTasks(data.tasks || []);
    setSessions(data.sessions || []);
  };

  return (
    <TimeTrackerContext.Provider value={{
      projects, tasks, sessions,
      addProject, addTask, addSession, stopSession, setToastExternal,
      completeProject, reopenProject,
      updateProjectName, deleteProjectAndRelatedData, duplicateExistingProject,
      updateTaskTitle, deleteTaskAndRelatedData,
      deleteSession, clearAllTrackerData, replaceAllTrackerData
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
};
