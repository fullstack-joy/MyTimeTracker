import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { useSettings } from '../../context/SettingsContext'; // Import useSettings

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeeklyOverview({ data }) {
  const { settings } = useSettings(); // Get settings for dark mode
  const { sessions } = useTimeTracker();

  const weeklyChartData = useMemo(() => {
    const dailyTotals = Array(7).fill(0).map((_, i) => ({ name: DAY_NAMES[i], hours: 0 }));
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // Sunday is 0, Saturday is 6

    sessions.forEach(session => {
      const sessionDate = new Date(session.startTime);
      const dayDiff = (sessionDate.getDay() - currentDayOfWeek + 7) % 7; // Days from current day (0 for today, 1 for tomorrow, etc.)
      
      // Consider only the current week, starting from Sunday
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - currentDayOfWeek);
      startOfWeek.setHours(0,0,0,0);

      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - currentDayOfWeek));
      endOfWeek.setHours(23,59,59,999);

      if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
        const dayIndex = sessionDate.getDay();
        const start = new Date(session.startTime);
        const end = session.endTime ? new Date(session.endTime) : new Date();
        const duration = Math.max(0, (end - start) / 1000 / 3600); // hours
        if (Number.isFinite(duration)) {
          dailyTotals[dayIndex].hours += duration;
        }
      }
    });
    // Round to 2 decimal places
    return dailyTotals.map(d => ({ ...d, hours: parseFloat(d.hours.toFixed(2)) }));
  }, [sessions]);

  const chartColor = settings.darkMode ? '#f97316' : '#ea580c'; // Orange for dark, slightly darker orange for light
  const axisColor = settings.darkMode ? '#a1a1aa' : '#71717a'; // Lighter gray for dark, darker gray for light

  return (
    <div className="bg-gray-50 dark:bg-[#1f1f1f] p-5 rounded-xl shadow text-gray-900 dark:text-white">
      <h2 className="text-lg font-semibold mb-4">Weekly Activity</h2>
      {weeklyChartData.every(d => d.hours === 0) ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded for this week yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyChartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
            <XAxis dataKey="name" stroke={axisColor} fontSize={12} />
            <YAxis stroke={axisColor} fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: settings.darkMode ? '#27272a' : '#ffffff', border: '1px solid #3f3f46' }}
              labelStyle={{ color: settings.darkMode ? '#e4e4e7' : '#3f3f46' }}
              itemStyle={{ color: chartColor }}
              formatter={(value) => [`${value} hr`, 'Hours']}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
              {weeklyChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
