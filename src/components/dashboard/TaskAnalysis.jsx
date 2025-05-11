import React, { useMemo } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';

export default function TaskAnalysis() {
  const { sessions, tasks, projects } = useTimeTracker();

  // Aggregate time by task
  const taskMap = {};
  sessions.forEach(session => {
    const task = tasks.find(t => t.id === session.taskId);
    if (!task) return;
    const project = projects.find(p => p.id === task.projectId);
    const taskKey = `${task.title}|||${project ? project.name : 'Unknown Project'}`;
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const duration = Math.max(0, (end - start) / 1000);
    taskMap[taskKey] = (taskMap[taskKey] || 0) + duration;
  });

  const taskSummary = useMemo(() =>
    Object.entries(taskMap).map(([key, duration]) => {
      const [task, project] = key.split('|||');
      return { task, project, duration };
    }).sort((a, b) => b.duration - a.duration),
    [sessions, tasks, projects]
  );

  const hasData = taskSummary.length > 0;

  return (
    <div className="bg-[#1f1f1f] p-5 rounded-xl shadow text-white">
      <h2 className="text-lg font-semibold mb-4">Task Analysis</h2>
      {!hasData ? (
        <p className="text-gray-400 text-sm">No task activity found.</p>
      ) : (
        <ul className="space-y-3 text-sm text-gray-300">
          {taskSummary.map(({ task, project, duration }, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{task} <span className="text-gray-500">({project})</span></span>
              <span>{(duration / 3600).toFixed(2)} hr</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}