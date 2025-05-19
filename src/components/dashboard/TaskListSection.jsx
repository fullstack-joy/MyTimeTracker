import React from 'react';
import PropTypes from 'prop-types';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { FiPlay, FiStopCircle } from 'react-icons/fi';
import { formatTime } from '../utils/timeUtils';

// Memoized helpers outside component to avoid recreation
const getProjectName = (projects, task) => {
  const project = projects.find(p => p.id === task.projectId);
  return project ? project.name : '';
};

const getTaskTotalTime = (sessions, taskId) => {
  return sessions
    .filter(s => s.taskId === taskId)
    .reduce((total, session) => {
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : new Date();
      const diff = (end - start) / 1000;
      return Number.isFinite(diff) && diff > 0 ? total + diff : total;
    }, 0);
};

const TaskListItem = React.memo(function TaskListItem({
  task,
  projectName,
  running,
  totalTime,
  onStart,
  onStop,
  tabIndex,
}) {
  return (
    <li
      className="flex items-center justify-between bg-gray-200 dark:bg-gray-800 rounded px-3 py-2 hover:bg-gray-300 dark:hover:bg-gray-700 transition group"
      tabIndex={tabIndex}
      aria-label={`Task: ${task.title}${projectName ? `, Project: ${projectName}` : ''}`}
      role="listitem"
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          if (running) onStop(task.id);
          else onStart(task.id);
        }
      }}
    >
      <div className="truncate max-w-xs flex flex-col">
        <span className={`font-medium ${running ? 'text-green-500 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
          {task.title}
        </span>
        <span className="ml-0 text-xs text-gray-500 dark:text-gray-400 truncate">
          {projectName ? `(${projectName})` : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono min-w-[70px] text-right">
          {formatTime(totalTime)}
        </span>
        {running ? (
          <button
            className="ml-2 px-2 py-0.5 rounded-full bg-red-500 dark:bg-red-600 text-xs text-white hover:bg-red-600 dark:hover:bg-red-700 flex items-center gap-1"
            onClick={() => onStop(task.id)}
            title="Stop Timer"
            aria-label={`Stop timer for ${task.title}`}
          >
            <FiStopCircle /> Stop
          </button>
        ) : (
          <button
            className="ml-2 px-2 py-0.5 rounded-full bg-green-500 dark:bg-green-600 text-xs text-white hover:bg-green-600 dark:hover:bg-green-700 flex items-center gap-1"
            onClick={() => onStart(task.id)}
            title="Start Timer"
            aria-label={`Start timer for ${task.title}`}
          >
            <FiPlay /> Start
          </button>
        )}
        {running && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500 dark:bg-green-600 text-xs text-white animate-pulse">
            Running
          </span>
        )}
      </div>
    </li>
  );
});

TaskListItem.propTypes = {
  task: PropTypes.object.isRequired,
  projectName: PropTypes.string,
  running: PropTypes.bool.isRequired,
  totalTime: PropTypes.number.isRequired,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  tabIndex: PropTypes.number,
};

export default function TaskListSection() {
  const { tasks, projects, sessions, addSession, stopSession } = useTimeTracker();

  // Memoize getLastSessionTime for stable sorting
  const getLastSessionTime = React.useCallback((taskId) => {
    const taskSessions = sessions.filter(s => s.taskId === taskId);
    if (taskSessions.length === 0) return 0;
    return Math.max(...taskSessions.map(s => new Date(s.endTime || s.startTime).getTime()));
  }, [sessions]);

  // Memoize sortedTasks for performance
  const sortedTasks = React.useMemo(() => (
    [...tasks].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      const lastA = getLastSessionTime(a.id);
      const lastB = getLastSessionTime(b.id);
      if (lastA !== lastB) return lastB - lastA;
      const projA = getProjectName(projects, a) || '';
      const projB = getProjectName(projects, b) || '';
      return projA.localeCompare(projB);
    })
  ), [tasks, getLastSessionTime, projects]);

  const isTaskRunning = (task) => !!task.isRunning;

  return (
    <div className="bg-gray-50 dark:bg-[#1f1f1f] p-5 rounded-xl shadow text-gray-900 dark:text-white" role="region" aria-label="Task List">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">My Tasks</h2>
      {sortedTasks.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks found. Add a task from the Projects page.</p>
      ) : (
        <ul className="space-y-3 text-sm" role="list">
          {sortedTasks.map((task, idx) => (
            <TaskListItem
              key={task.id}
              task={task}
              projectName={getProjectName(projects, task)}
              running={isTaskRunning(task)}
              totalTime={getTaskTotalTime(sessions, task.id)}
              onStart={addSession}
              onStop={stopSession}
              tabIndex={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
