import React, { useEffect, useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { useTimeTracker } from '../context/TimeTrackerContext';

const LIGHT_COLORS = ['#ea580c', '#4f46e5', '#059669', '#e11d48', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];
const DARK_COLORS = ['#f97316', '#6366f1', '#10b981', '#f43f5e', '#fbbf24', '#a78bfa', '#34d399', '#f87171'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function aggregate(entries, key) {
  return entries.reduce((acc, e) => {
    acc[e[key]] = (acc[e[key]] || 0) + e.durationMs;
    return acc;
  }, {});
}

function getTotalTime(timeData) {
  return timeData.reduce((sum, d) => sum + d.value, 0);
}

export default function Analytics() {
  const [timeData, setTimeData] = useState([]);
  const [productivityData, setProductivityData] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const timeTracker = useTimeTracker();
  const clearAllTrackerData = timeTracker?.clearAllTrackerData;

  const COLORS = settings.darkMode ? DARK_COLORS : LIGHT_COLORS;
  const axisColor = settings.darkMode ? '#a1a1aa' : '#71717a';
  const tooltipBgColor = settings.darkMode ? '#27272a' : '#ffffff';
  const tooltipLabelColor = settings.darkMode ? '#e4e4e7' : '#3f3f46';
  const legendColor = settings.darkMode ? '#d4d4d8' : '#4b5563';

  useEffect(() => {
    async function loadData() {
      try {
        const paths = await window.electronAPI.listScreenshots();
        if (!paths || paths.length === 0) {
          setLoading(false);
          return;
        }

        let entries = paths.map(filePath => {
          const fileName = filePath.split(/[/\\]/).pop().replace('.png', '');
          const [ts, project] = fileName.split('-');
          return {
            project: project || 'Idle',
            timestampMs: Number(ts)
          };
        });

        entries.sort((a, b) => a.timestampMs - b.timestampMs);

        entries = entries.map((e, i) => {
          const next = entries[i + 1];
          const endMs = next ? next.timestampMs : Date.now();
          return { ...e, durationMs: endMs - e.timestampMs };
        });

        const projectAgg = aggregate(entries, 'project');
        const pie = Object.entries(projectAgg).map(([name, ms]) => ({
          name,
          value: Number((ms / 3600000).toFixed(2))
        }));
        setTimeData(pie);

        const dayAgg = entries.reduce((acc, e) => {
          const day = DAY_NAMES[new Date(e.timestampMs).getDay()];
          acc[day] = acc[day] || { active: 0, idle: 0 };
          if (e.project === 'Idle') acc[day].idle += e.durationMs;
          else acc[day].active += e.durationMs;
          return acc;
        }, {});
        const bar = DAY_NAMES.map(day => ({
          name: day,
          active: dayAgg[day] ? Number((dayAgg[day].active / 3600000).toFixed(2)) : 0,
          idle: dayAgg[day] ? Number((dayAgg[day].idle / 3600000).toFixed(2)) : 0
        }));
        setProductivityData(bar);

        const dateAgg = entries.reduce((acc, e) => {
          const d = new Date(e.timestampMs);
          if (isNaN(d.getTime())) return acc;
          const date = d.toISOString().slice(0, 10);
          acc[date] = (acc[date] || 0) + e.durationMs;
          return acc;
        }, {});
        const line = Object.entries(dateAgg).map(([date, ms]) => ({
          date,
          hours: Number((ms / 3600000).toFixed(2))
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setDailyTrend(line);

        const hourAgg = Array(24).fill(0);
        entries.forEach(e => {
          const hour = new Date(e.timestampMs).getHours();
          hourAgg[hour] += e.durationMs;
        });
        setHourlyData(hourAgg.map((ms, hour) => ({
          hour: `${hour}:00`,
          hours: Number((ms / 3600000).toFixed(2))
        })));
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all tracker data? This action cannot be undone.')) {
      if (clearAllTrackerData) {
        try {
          setLoading(true);
          await clearAllTrackerData();
          setTimeData([]);
          setProductivityData([]);
          setDailyTrend([]);
          setHourlyData([]);
        } catch (error) {
          console.error('Failed to clear tracker data:', error);
          alert('Failed to clear tracker data. See console for details.');
        } finally {
          setLoading(false);
        }
      } else {
        alert('Clear data functionality is not available.');
        console.warn('clearAllTrackerData function is not available from useTimeTracker.');
      }
    }
  };

  const filteredTopProjects = useMemo(
    () => timeData.filter(proj => proj.name !== 'Idle' && Number.isFinite(proj.value) && proj.value > 0),
    [timeData]
  );
  const totalTracked = useMemo(() => {
    const total = getTotalTime(timeData);
    return Number.isFinite(total) ? total.toFixed(2) : '0.00';
  }, [timeData]);
  const topProject = useMemo(() => (timeData.length ? timeData[0].name : '—'), [timeData]);

  if (loading) return (
    <div className="text-gray-900 dark:text-white bg-white dark:bg-black flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0 px-6 pt-6 mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        {clearAllTrackerData && (
          <button
            onClick={handleClearData}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
          >
            Clear All Data
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto p-6 flex items-center justify-center">Loading analytics...</div>
    </div>
  );

  if (timeData.length === 0 && productivityData.length === 0 && dailyTrend.length === 0 && hourlyData.length === 0) {
    return (
      <div className="text-gray-900 dark:text-white bg-white dark:bg-black flex flex-col h-full">
        <div className="flex justify-between items-center flex-shrink-0 px-6 pt-6 mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          {clearAllTrackerData && (
            <button
              onClick={handleClearData}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
            >
              Clear All Data
            </button>
          )}
        </div>
        <div className="flex-grow overflow-y-auto p-6 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No activity data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-gray-900 dark:text-white bg-white dark:bg-black flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0 px-6 pt-6 mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        {clearAllTrackerData && (
          <button
            onClick={handleClearData}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
          >
            Clear All Data
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Time by Project</h2>
              <div className="flex gap-2 flex-wrap">
                {timeData.map((entry, idx) => (
                  <span key={entry.name} className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }}></span>
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={timeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  className="text-xs text-gray-700 dark:text-gray-300"
                >
                  {timeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={value => `${value}h`}
                  contentStyle={{ backgroundColor: tooltipBgColor, border: `1px solid ${axisColor}`, borderRadius: '0.5rem' }}
                  labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold' }}
                  itemStyle={{ color: settings.darkMode ? DARK_COLORS[0] : LIGHT_COLORS[0] }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Total Tracked:</span> {totalTracked} hr &nbsp;|&nbsp;
              <span className="font-semibold">Top Project:</span> {topProject}
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Active vs Idle Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productivityData}>
                <XAxis dataKey="name" stroke={axisColor} className="text-xs" />
                <YAxis stroke={axisColor} className="text-xs" />
                <Tooltip 
                  formatter={value => `${value}h`}
                  contentStyle={{ backgroundColor: tooltipBgColor, border: `1px solid ${axisColor}`, borderRadius: '0.5rem' }}
                  labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ color: legendColor, fontSize: '0.75rem' }} />
                <Bar dataKey="active" stackId="a" fill={COLORS[2]} name="Active" radius={[4, 4, 0, 0]} />
                <Bar dataKey="idle" stackId="a" fill={COLORS[3]} name="Idle" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Time by Day</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyTrend}>
                <XAxis
                  dataKey="date"
                  stroke={axisColor}
                  className="text-xs"
                  tickFormatter={date => {
                    const d = new Date(date);
                    return !isNaN(d.getTime())
                      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : date;
                  }}
                />
                <YAxis stroke={axisColor} className="text-xs" />
                <Tooltip 
                  formatter={value => `${value}h`} 
                  labelFormatter={date => {
                    const d = new Date(date);
                    return !isNaN(d.getTime())
                      ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : date;
                  }}
                  contentStyle={{ backgroundColor: tooltipBgColor, border: `1px solid ${axisColor}`, borderRadius: '0.5rem' }}
                  labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold' }}
                  itemStyle={{ color: COLORS[0] }}
                />
                <Line type="monotone" dataKey="hours" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3, fill: COLORS[0] }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Most Active Hour</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" stroke={axisColor} className="text-xs" />
                <YAxis stroke={axisColor} className="text-xs" />
                <Tooltip 
                  formatter={value => `${value}h`}
                  contentStyle={{ backgroundColor: tooltipBgColor, border: `1px solid ${axisColor}`, borderRadius: '0.5rem' }}
                  labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold' }}
                />
                <Bar dataKey="hours" fill={COLORS[1]} name="Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-[#1f1f1f] p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Top Projects</h2>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {filteredTopProjects.length === 0 && (
              <li className="text-gray-500 dark:text-gray-500 italic">No project activity found.</li>
            )}
            {filteredTopProjects.slice(0, 5).map((proj, idx) => (
              <li key={idx} className="flex justify-between items-center p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700/50">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }}></span>
                  {proj.name}
                </span>
                <span className="font-semibold">{proj.value}h</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}