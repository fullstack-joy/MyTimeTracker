import React, { useState, useRef, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { FiCoffee, FiCheckCircle, FiPlay, FiRotateCcw } from 'react-icons/fi';

export default function WorkStatus() {
  const { tasks, projects, sessions, stopSession, addSession } = useTimeTracker();

  // Find running task
  const runningTask = tasks.find(t => t.isRunning);
  const runningProject = runningTask
    ? projects.find(p => p.id === runningTask.projectId)
    : null;

  // Find last stopped task
  const lastStoppedSession = [...sessions]
    .filter(s => s.endTime)
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];
  const lastTask = lastStoppedSession
    ? tasks.find(t => t.id === lastStoppedSession.taskId)
    : null;
  const lastProject = lastTask
    ? projects.find(p => p.id === lastTask.projectId)
    : null;

  // Break state
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(null);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const lastTaskRef = useRef(null);

  // Calculate today's total time
  const now = new Date();
  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const todaySessions = sessions.filter(s => isSameDay(new Date(s.startTime), now));
  const todaySeconds = todaySessions.reduce((total, s) => {
    const start = new Date(s.startTime);
    const end = s.endTime ? new Date(s.endTime) : new Date();
    return total + Math.max(0, (end - start) / 1000);
  }, 0);
  const todayHours = (todaySeconds / 3600).toFixed(2);

  // Daily goal (could be from settings, fallback to 6)
  let dailyGoal = 6;
  try {
    const settings = JSON.parse(localStorage.getItem('settings'));
    if (settings && typeof settings.dailyGoal === 'number') dailyGoal = settings.dailyGoal;
  } catch {}

  const progress = Math.min(todaySeconds / (dailyGoal * 3600), 1);

  let userStatus = 'No Active Task';
  let userStatusColor = 'bg-gray-500';
  let userStatusDetail = '';

  if (onBreak) {
    userStatus = 'On Break';
    userStatusColor = 'bg-blue-500 animate-pulse';
    userStatusDetail = `Break time: ${Math.floor(breakSeconds / 60)
      .toString()
      .padStart(2, '0')}:${(breakSeconds % 60).toString().padStart(2, '0')}`;
  } else if (runningTask) {
    userStatus = 'Working';
    userStatusColor = 'bg-green-500';
    userStatusDetail = `On "${runningTask.title}" (${runningProject ? runningProject.name : 'Unknown Project'})`;
  } else if (tasks.length > 0) {
    userStatus = 'Idle';
    userStatusColor = 'bg-yellow-500';
    userStatusDetail = 'No timer running';
  }

  // Break timer effect
  useEffect(() => {
    let interval;
    if (onBreak && breakStart) {
      interval = setInterval(() => {
        setBreakSeconds(Math.floor((Date.now() - breakStart) / 1000));
      }, 1000);
    } else {
      setBreakSeconds(0);
    }
    return () => clearInterval(interval);
  }, [onBreak, breakStart]);

  // Take a break: stop current session, store last task, start break timer
  const handleBreak = () => {
    if (runningTask) {
      stopSession(runningTask.id);
      lastTaskRef.current = runningTask.id;
      setOnBreak(true);
      setBreakStart(Date.now());
    }
  };

  // Resume: end break, resume last task
  const handleResume = () => {
    if (lastTaskRef.current) {
      addSession(lastTaskRef.current);
      lastTaskRef.current = null;
    }
    setOnBreak(false);
    setBreakStart(null);
    setBreakSeconds(0);
  };

  return (
    <div className="bg-[#1f1f1f] p-5 rounded-xl shadow text-white">
      <h2 className="text-lg font-semibold mb-4">My Focus</h2>
      <div className="mb-4 flex items-center gap-3">
        <span className={`inline-block w-3 h-3 rounded-full ${userStatusColor}`}></span>
        <span className="font-semibold">{userStatus}</span>
      </div>
      {onBreak ? (
        <div className="mb-4 text-sm text-blue-400 font-medium flex items-center gap-2">
          <FiCoffee /> {userStatusDetail}
        </div>
      ) : runningTask ? (
        <div className="mb-4 text-sm text-green-400 font-medium">
          {userStatusDetail}
        </div>
      ) : (
        <div className="mb-4 text-sm text-yellow-400 font-medium">
          {userStatusDetail}
        </div>
      )}
      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-1">Today's Progress</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-orange-500 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-xs text-gray-300">{todayHours} / {dailyGoal} hr</span>
        </div>
        {progress >= 1 && (
          <div className="flex items-center gap-2 mt-2 text-green-400 text-xs font-semibold">
            <FiCheckCircle /> Daily goal achieved!
          </div>
        )}
      </div>
      {onBreak ? (
        <button
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm font-medium mt-2"
          onClick={handleResume}
        >
          <FiPlay /> Resume Work
        </button>
      ) : runningTask && (
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm font-medium mt-2"
          onClick={handleBreak}
        >
          <FiCoffee /> Take a Break
        </button>
      )}
      {/* Start Last Task button */}
      {!runningTask && lastTask && (
        <button
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded text-white text-sm font-medium mt-2"
          onClick={() => addSession(lastTask.id)}
        >
          <FiRotateCcw /> Start Last Task: "{lastTask.title}" {lastProject ? `(${lastProject.name})` : ''}
        </button>
      )}
    </div>
  );
}
