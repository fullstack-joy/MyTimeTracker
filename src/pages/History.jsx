// src/components/History.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiChevronDown, FiChevronRight, FiCamera, FiTrash2, FiFolder } from 'react-icons/fi';
import { useTimeTracker } from '../context/TimeTrackerContext';

export default function History() {
  const { sessions, tasks, projects } = useTimeTracker();
  const [openIndex, setOpenIndex] = useState(null);
  const [screenshots, setScreenshots] = useState({});
  const [sessionsState, setSessionsState] = useState(sessions);
  const [viewMode, setViewMode] = useState('date'); // 'date' or 'project'
  const [page, setPage] = useState(1);
  const GROUPS_PER_PAGE = 10;

  useEffect(() => {
    setSessionsState(sessions);
  }, [sessions]);

  // Memoized helpers
  const getProjectName = useCallback((session) => {
    const task = tasks.find(t => t.id === session.taskId);
    if (!task) return 'Unknown Project';
    const project = projects.find(p => p.id === task.projectId);
    return project ? project.name : 'Unknown Project';
  }, [tasks, projects]);

  const getTaskName = useCallback((session) => {
    const task = tasks.find(t => t.id === session.taskId);
    return task ? task.title : 'Unknown Task';
  }, [tasks]);

  const getGroupTotalTime = useCallback((logs) => {
    const total = logs.reduce((sum, session) => {
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : new Date();
      const diff = (end - start) / 1000;
      return Number.isFinite(diff) && diff > 0 ? sum + diff : sum;
    }, 0);
    return Number.isFinite(total) ? total : 0;
  }, []);

  const groupByDate = useCallback((logs) => {
    return logs.reduce((acc, log) => {
      const dateObj = new Date(log.startTime);
      if (isNaN(dateObj.getTime())) return acc; // skip invalid dates
      const dateKey = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      acc[dateKey] = acc[dateKey] || [];
      acc[dateKey].push(log);
      return acc;
    }, {});
  }, []);

  const groupByProject = useCallback((logs) => {
    return logs.reduce((acc, log) => {
      const projectName = getProjectName(log);
      acc[projectName] = acc[projectName] || [];
      acc[projectName].push(log);
      return acc;
    }, {});
  }, [getProjectName]);

  // Load screenshots for each session (by matching label in filename)
  useEffect(() => {
    async function fetchScreenshots() {
      if (!window.electronAPI?.listScreenshots) return;
      const files = await window.electronAPI.listScreenshots();
      const sessionScreens = {};
      sessionsState.forEach(session => {
        const task = tasks.find(t => t.id === session.taskId);
        const project = projects.find(p => p.id === (task ? task.projectId : null));
        // Use session start time and task/project for unique label
        const label = `${project ? project.name : 'Unknown'}-${task ? task.title : 'Unknown'}`.replace(/\s+/g, '_');
        // Only match screenshots for this session's time window
        const sessionStart = new Date(session.startTime).getTime();
        const sessionEnd = session.endTime ? new Date(session.endTime).getTime() : Date.now();
        sessionScreens[session.id] = files.filter(f => {
          if (!f.includes(label)) return false;
          // Extract timestamp from filename (first part before '-')
          const match = f.match(/([0-9]+)-/);
          if (!match) return false;
          const ts = Number(match[1]);
          return ts >= sessionStart && ts <= sessionEnd;
        });
      });
      setScreenshots(sessionScreens);
    }
    fetchScreenshots();
    // eslint-disable-next-line
  }, [sessionsState, tasks, projects]);

  const toggle = index => setOpenIndex(openIndex === index ? null : index);

  // Delete session with confirmation
  const handleDeleteSession = (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    const updatedSessions = sessionsState.filter(s => s.id !== sessionId);
    setSessionsState(updatedSessions);
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));
  };

  // Memoize grouped logs and paginated data
  const groupedLogs = useMemo(() => (
    viewMode === 'date'
      ? groupByDate(sessionsState)
      : groupByProject(sessionsState)
  ), [viewMode, sessionsState, groupByDate, groupByProject]);

  const historyData = useMemo(() => (
    Object.entries(groupedLogs)
      .map(([key, logs]) => ({ key, logs }))
      .filter(entry => entry.key && entry.key !== 'Invalid Date')
      .sort((a, b) => {
        if (viewMode === 'date') {
          const aDate = new Date(a.key);
          const bDate = new Date(b.key);
          return bDate - aDate;
        } else {
          return a.key.localeCompare(b.key);
        }
      })
  ), [groupedLogs, viewMode]);

  const totalPages = Math.ceil(historyData.length / GROUPS_PER_PAGE);
  const paginatedData = useMemo(() =>
    historyData.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE),
    [historyData, page]
  );

  return (
    <div className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">History</h1>
      {/* Toggle view mode */}
      <div className="mb-6 flex gap-3">
        <button
          className={`px-4 py-2 rounded-l bg-[#23232b] border border-gray-700 ${viewMode === 'date' ? 'bg-orange-500 text-white' : 'text-gray-300'}`}
          onClick={() => { setViewMode('date'); setOpenIndex(null); setPage(1); }}
        >
          By Date
        </button>
        <button
          className={`px-4 py-2 rounded-r bg-[#23232b] border border-gray-700 ${viewMode === 'project' ? 'bg-orange-500 text-white' : 'text-gray-300'}`}
          onClick={() => { setViewMode('project'); setOpenIndex(null); setPage(1); }}
        >
          By Project
        </button>
      </div>
      <div className="space-y-6">
        {paginatedData.map((entry, index) => {
          const totalSeconds = getGroupTotalTime(entry.logs);
          const totalHours = Number.isFinite(totalSeconds) ? (totalSeconds / 3600).toFixed(2) : '0.00';
          return (
            <div key={entry.key} className="bg-[#18181b] rounded-xl shadow-lg">
              <button
                onClick={() => toggle(index)}
                className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-800/40 transition rounded-t-xl"
              >
                <span className="text-lg font-semibold flex items-center gap-2">
                  {viewMode === 'project' && <FiFolder className="text-orange-400" />}
                  {entry.key}
                  <span className="ml-4 text-xs text-gray-400 font-normal">
                    • {totalHours} hr tracked
                  </span>
                </span>
                {openIndex === index ? <FiChevronDown /> : <FiChevronRight />}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 pt-2">
                  <ul className="space-y-5">
                    {entry.logs.map((session, i) => (
                      <li key={i} className="bg-[#23232b] rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 shadow border-l-4 border-orange-500 relative">
                        <div className="flex-1">
                          <div className="font-semibold text-base flex items-center gap-2">
                            <FiCamera className="text-orange-400" />
                            {getTaskName(session)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {viewMode === 'date' ? getProjectName(session) : (
                              <>
                                <span className="font-semibold">Task:</span> {getTaskName(session)}
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                          </div>
                        </div>
                        {/* Screenshots */}
                        <div className="flex flex-wrap gap-2">
                          {(screenshots[session.id] && screenshots[session.id].length > 0) ? (
                            screenshots[session.id].map((file, idx) => (
                              <a
                                key={idx}
                                href={`file://${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                                title="View Screenshot"
                              >
                                <img
                                  src={`file://${file}`}
                                  alt="Screenshot"
                                  className="w-20 h-14 object-cover rounded border border-gray-700 hover:scale-105 transition"
                                />
                              </a>
                            ))
                          ) : (
                            <div className="flex items-center text-xs text-gray-500 italic px-2">
                              No screenshot
                            </div>
                          )}
                        </div>
                        {/* Delete session button */}
                        <button
                          className="absolute top-2 right-2 p-2 rounded-full hover:bg-red-600 transition"
                          title="Delete session"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <FiTrash2 className="text-red-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-sm text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
