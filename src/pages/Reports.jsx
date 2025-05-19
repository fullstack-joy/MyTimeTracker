// src/components/Reports.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';

export default function Reports() {
  const { sessions, tasks, projects } = useTimeTracker();
  const [detailsProject, setDetailsProject] = useState(null);
  const [page, setPage] = useState(1);
  const [projectScreenshots, setProjectScreenshots] = useState([]);
  const PROJECTS_PER_PAGE = 10;

  // Helper to get project name for a session
  const getProjectName = (session) => {
    const task = tasks.find(t => t.id === session.taskId);
    if (!task) return 'Unknown Project';
    const project = projects.find(p => p.id === task.projectId);
    return project ? project.name : 'Unknown Project';
  };

  // Helper to get task name for a session
  const getTaskName = (session) => {
    const task = tasks.find(t => t.id === session.taskId);
    return task ? task.title : 'Unknown Task';
  };

  // Calculate total time for a session
  const getSessionDuration = (session) => {
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    return Math.max(0, (end - start) / 1000); // in seconds
  };

  // Memoize project time calculations
  const projArr = useMemo(() => {
    const projectTimeMap = {};
    sessions.forEach(session => {
      const projectName = getProjectName(session);
      const duration = Number(getSessionDuration(session)) || 0;
      projectTimeMap[projectName] = (projectTimeMap[projectName] || 0) + duration;
    });
    return Object.entries(projectTimeMap).map(([project, seconds]) => ({
      project,
      hours: Number.isFinite(seconds) ? (seconds / 3600).toFixed(2) : '0.00',
      completed: (projects.find(p => p.name === project) || {}).completed || false,
    })).sort((a, b) => b.hours - a.hours);
  }, [sessions, projects]);

  // Pagination
  const totalPages = Math.ceil(projArr.length / PROJECTS_PER_PAGE);
  const paginatedProjects = projArr.slice((page - 1) * PROJECTS_PER_PAGE, page * PROJECTS_PER_PAGE);

  // Memoize summary
  const summary = useMemo(() => {
    const totalSeconds = sessions.reduce((total, session) => {
      const duration = Number(getSessionDuration(session)) || 0;
      return total + duration;
    }, 0);
    const totalHours = Number.isFinite(totalSeconds) ? (totalSeconds / 3600).toFixed(2) : '0.00';
    return {
      totalHours,
      topProject: projArr.length ? projArr[0].project : '—',
    };
  }, [sessions, projArr]);

  // Memoize task breakdown and total hours
  const getTaskBreakdown = useCallback((projectName) => {
    const project = projects.find(p => p.name === projectName);
    if (!project) return [];
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    return projectTasks.map(task => {
      const taskSessions = sessions.filter(s => s.taskId === task.id);
      const totalSeconds = taskSessions.reduce((sum, s) => sum + getSessionDuration(s), 0);
      return {
        taskTitle: task.title,
        seconds: totalSeconds,
        hours: (totalSeconds / 3600).toFixed(2),
      };
    });
  }, [projects, tasks, sessions]);

  const getProjectTotalHours = useCallback((projectName) => {
    const breakdown = getTaskBreakdown(projectName);
    const total = breakdown.reduce((sum, t) => sum + t.seconds, 0);
    return (total / 3600).toFixed(2);
  }, [getTaskBreakdown]);

  // Memoize projectDetails for modal
  const projectDetails = useMemo(() => {
    if (!detailsProject) return null;
    const project = projects.find(p => p.name === detailsProject);
    if (!project) return null;
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectTaskIds = projectTasks.map(t => t.id);
    const projectSessions = sessions.filter(s => projectTaskIds.includes(s.taskId));
    projectSessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    const totalSeconds = projectSessions.reduce((sum, s) => {
      const start = new Date(s.startTime);
      const end = s.endTime ? new Date(s.endTime) : new Date();
      return sum + Math.max(0, (end - start) / 1000);
    }, 0);
    return { project, projectTasks, projectSessions, totalSeconds };
  }, [detailsProject, projects, tasks, sessions]);

  // Load screenshots for details modal
  useEffect(() => {
    async function fetchScreenshots() {
      if (!detailsProject || !window.electronAPI?.listScreenshots) {
        setProjectScreenshots([]);
        return;
      }
      const project = projects.find(p => p.name === detailsProject);
      if (!project) {
        setProjectScreenshots([]);
        return;
      }
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const labels = projectTasks.map(
        t => `${project.name}-${t.title}`.replace(/\s+/g, '_')
      );
      const files = await window.electronAPI.listScreenshots();
      // Filter files that match any label
      const screenshots = files.filter(f =>
        labels.some(label => f.includes(label))
      );
      setProjectScreenshots(screenshots);
    }
    fetchScreenshots();
    // eslint-disable-next-line
  }, [detailsProject, projects, tasks]);

  return (
    <div className="text-gray-900 dark:text-white bg-white dark:bg-black flex flex-col h-full"> {/* MODIFIED: Removed p-6 */}
      <h1 className="text-2xl font-bold mb-6 flex-shrink-0 px-6 pt-6">Reports</h1> {/* MODIFIED: Added px-6 pt-6 here */}

      <div className="flex-grow overflow-y-auto p-6"> {/* MODIFIED: Added p-6 here */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-100 dark:bg-[#1f1f1f] p-4 rounded-xl shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Hours</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{summary.totalHours} hr</div>
          </div>
          <div className="bg-gray-100 dark:bg-[#1f1f1f] p-4 rounded-xl shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Top Project</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-white">{summary.topProject}</div>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Project Breakdown</h2>
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="border-b border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="pb-2">Project</th>
                <th className="pb-2">Total Time</th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((project, idx) => (
                <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-200/40 dark:hover:bg-gray-800/40 transition">
                  <td className="py-3">{project.project}</td>
                  <td className="py-3">{project.hours} hr</td>
                  <td className="py-3">
                    {project.completed ? (
                      <span className="text-green-400 font-semibold">Completed</span>
                    ) : (
                      <span className="text-orange-400 font-semibold">Active</span>
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => setDetailsProject(project.project)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-white disabled:opacity-50"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-white disabled:opacity-50"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Details Modal is outside the scrollable area, which is fine as it's position:fixed */}
      {detailsProject && projectDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-100 dark:bg-[#23232b] rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl"
              onClick={() => setDetailsProject(null)}
              title="Close"
              aria-label="Close project details"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-orange-500 dark:text-orange-400">{detailsProject} - Details</h3>
            <div className="mb-4">
              <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">Total Hours Worked</div>
              <div className="text-lg text-orange-500 dark:text-orange-400 font-bold mb-2">
                {(projectDetails.totalSeconds / 3600).toFixed(2)} hr
              </div>
            </div>
            <div className="mb-4">
              <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">Tracked Sessions</div>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 max-h-40 overflow-y-auto">
                {projectDetails.projectSessions.map((session, idx) => {
                  const task = tasks.find(t => t.id === session.taskId);
                  const start = new Date(session.startTime);
                  const end = session.endTime ? new Date(session.endTime) : null;
                  const duration = end
                    ? ((end - start) / 3600 / 1000).toFixed(2)
                    : ((Date.now() - start) / 3600 / 1000).toFixed(2);
                  return (
                    <li key={idx} className="flex justify-between border-b border-gray-300 dark:border-gray-700 pb-1">
                      <span>
                        {task ? task.title : 'Unknown Task'}<span className="ml-2 text-gray-500 dark:text-gray-500">{start.toLocaleString()}</span>
                      </span>
                      <span>{duration} hr</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mb-4">
              <div className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">Screenshots</div>
              {projectScreenshots.length === 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-500 italic">No screenshots found.</div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {projectScreenshots.map((file, idx) => (
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
                        className="w-20 h-14 object-cover rounded border border-gray-400 dark:border-gray-700 hover:scale-105 transition"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
