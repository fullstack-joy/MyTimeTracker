import React, { useMemo } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';

export default function WeeklyOverview({ data }) {
  const { tasks, projects } = useTimeTracker();

  const weeklySummary = useMemo(() => {
    const summary = {};
    (data.weekly || []).forEach(entry => {
      const task = tasks.find(t => t.id === entry.taskId);
      if (!task) return;
      const project = projects.find(p => p.id === task.projectId);
      const projectName = project ? project.name : 'Unknown Project';
      const start = new Date(entry.startTime);
      const end = entry.endTime ? new Date(entry.endTime) : new Date();
      const duration = Math.max(0, (end - start) / 1000);
      summary[projectName] = (summary[projectName] || 0) + duration;
    });
    return summary;
  }, [data.weekly, tasks, projects]);

  const sortedProjects = useMemo(() =>
    Object.entries(weeklySummary).sort((a, b) => b[1] - a[1]),
    [weeklySummary]
  );

  const hasData = sortedProjects.length > 0;

  return (
    <div className="bg-[#1f1f1f] p-5 rounded-xl shadow text-white">
      <h2 className="text-lg font-semibold mb-4">Weekly Overview</h2>
      {!hasData ? (
        <p className="text-gray-400 text-sm">No weekly data available.</p>
      ) : (
        <ul className="space-y-3 text-sm text-gray-300">
          {sortedProjects.map(([project, duration], idx) => (
            <li key={idx} className="flex justify-between">
              <span>{project}</span>
              <span>{(duration / 3600).toFixed(2)} hr</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
