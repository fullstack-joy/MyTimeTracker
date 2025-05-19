import React from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import OverviewCards from './OverviewCards';
import TaskAnalysis from './TaskAnalysis';
import WeeklyOverview from './WeeklyOverview';
import WorkStatus from './WorkStatus';
import TaskListSection from './TaskListSection';

export default function Dashboard() {
  const { sessions, tasks } = useTimeTracker();

  const calculateTotalTime = (entries) => {
    return entries.reduce((total, entry) => {
      const start = new Date(entry.startTime);
      const end = entry.endTime ? new Date(entry.endTime) : new Date();
      return total + (end - start) / 1000;
    }, 0);
  };

  const now = new Date();
  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isSameMonth = (d1, d2) =>
    d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const isInLast7Days = (d) => {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    return d >= new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
  };

  const dailySessions = sessions.filter((s) => isSameDay(new Date(s.startTime), now));
  const weeklySessions = sessions.filter((s) => isInLast7Days(new Date(s.startTime)));
  const monthlySessions = sessions.filter((s) => isSameMonth(new Date(s.startTime), now));

  const dailyTime = calculateTotalTime(dailySessions);
  const weeklyTime = calculateTotalTime(weeklySessions);
  const monthlyTime = calculateTotalTime(monthlySessions);

  // Count active tasks (tasks with isRunning true)
  const activeTasks = tasks.filter(t => t.isRunning).length;

  return (
    <div className="bg-white dark:bg-black text-gray-900 dark:text-white flex flex-col h-full"> {/* MODIFIED: Removed p-6 */}
      {/* The Dashboard doesn't have a shared H1, so its content starts directly in the scrollable area */}
      <div className="flex-grow overflow-y-auto p-6"> {/* MODIFIED: Added p-6 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <OverviewCards
            dailyTime={dailyTime}
            weeklyTime={weeklyTime}
            monthlyTime={monthlyTime}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TaskAnalysis sortedHistory={sessions} />
            <WorkStatus />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <WeeklyOverview data={{ weekly: weeklySessions }} />
            <TaskListSection />
        </div>
      </div>
    </div>
  );
}
