import React, { useEffect, useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

const COLORS = ['#f97316', '#6366f1', '#10b981', '#f43f5e', '#fbbf24', '#a78bfa', '#34d399', '#f87171'];
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

        // Pie: Time by Project
        const projectAgg = aggregate(entries, 'project');
        const pie = Object.entries(projectAgg).map(([name, ms]) => ({
          name,
          value: Number((ms / 3600000).toFixed(2))
        }));
        setTimeData(pie);

        // Bar: Active vs Idle by Day
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

        // Line: Time by Day (trend)
        const dateAgg = entries.reduce((acc, e) => {
          const d = new Date(e.timestampMs);
          if (isNaN(d.getTime())) return acc; // skip invalid
          // Use ISO date string (YYYY-MM-DD) for sorting and display
          const date = d.toISOString().slice(0, 10);
          acc[date] = (acc[date] || 0) + e.durationMs;
          return acc;
        }, {});
        const line = Object.entries(dateAgg).map(([date, ms]) => ({
          date,
          hours: Number((ms / 3600000).toFixed(2))
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setDailyTrend(line);

        // Bar: Most Active Hour
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

  // Memoize filteredTopProjects and chart data
  const filteredTopProjects = useMemo(
    () => timeData.filter(proj => proj.name !== 'Idle' && Number.isFinite(proj.value) && proj.value > 0),
    [timeData]
  );
  const totalTracked = useMemo(() => {
    const total = getTotalTime(timeData);
    return Number.isFinite(total) ? total.toFixed(2) : '0.00';
  }, [timeData]);
  const topProject = useMemo(() => (timeData.length ? timeData[0].name : '—'), [timeData]);

  if (loading) return <div className="p-6 text-white bg-black">Loading analytics...</div>;

  if (timeData.length === 0) {
    return (
      <div className="p-6 text-white bg-black min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Analytics</h1>
        <p className="text-gray-400">No activity data available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1f1f1f] p-5 rounded-xl shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Time by Project</h2>
            <div className="flex gap-2">
              {timeData.map((entry, idx) => (
                <span key={entry.name} className="flex items-center gap-1 text-xs">
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
                label={({ name }) => name}
              >
                {timeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={value => `${value}h`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-xs text-gray-400">
            <span className="font-semibold">Total Tracked:</span> {totalTracked} hr &nbsp;|&nbsp;
            <span className="font-semibold">Top Project:</span> {topProject}
          </div>
        </div>

        <div className="bg-[#1f1f1f] p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Active vs Idle Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productivityData}>
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip formatter={value => `${value}h`} />
              <Legend />
              <Bar dataKey="active" stackId="a" fill="#10b981" name="Active" />
              <Bar dataKey="idle" stackId="a" fill="#f43f5e" name="Idle" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1f1f1f] p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Time by Day</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyTrend}>
              <XAxis
                dataKey="date"
                stroke="#aaa"
                tickFormatter={date => {
                  // Format YYYY-MM-DD to e.g. "Apr 22"
                  const d = new Date(date);
                  return !isNaN(d.getTime())
                    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : date;
                }}
              />
              <YAxis stroke="#aaa" />
              <Tooltip formatter={value => `${value}h`} labelFormatter={date => {
                const d = new Date(date);
                return !isNaN(d.getTime())
                  ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : date;
              }} />
              <Line type="monotone" dataKey="hours" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#1f1f1f] p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Most Active Hour</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip formatter={value => `${value}h`} />
              <Bar dataKey="hours" fill="#6366f1" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1f1f1f] p-5 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Top Projects</h2>
        <ul className="space-y-3 text-sm text-gray-300">
          {filteredTopProjects.length === 0 && (
            <li className="text-gray-500 italic">No project activity found.</li>
          )}
          {filteredTopProjects.slice(0, 5).map((proj, idx) => (
            <li key={idx} className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }}></span>
                {proj.name}
              </span>
              <span>{proj.value}h</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}