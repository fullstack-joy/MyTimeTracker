import React, { useMemo } from 'react';
import { FiClock, FiCalendar, FiTrendingUp, FiPlayCircle } from 'react-icons/fi';

const formatTime = (seconds) => {
  seconds = Number(seconds);
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  return seconds;
};

const calcProgress = (seconds, maxHours) => {
  const hours = Number(seconds) / 3600;
  const ratio = Math.min(hours / maxHours, 1);
  return Number.isFinite(ratio) ? (ratio * 100).toFixed(1) : '0.0';
};

export default function OverviewCards({ dailyTime, weeklyTime, monthlyTime, activeTasks }) {
  const dailySeconds = useMemo(() => formatTime(dailyTime), [dailyTime]);
  const weeklySeconds = useMemo(() => formatTime(weeklyTime), [weeklyTime]);
  const monthlySeconds = useMemo(() => formatTime(monthlyTime), [monthlyTime]);

  const dailyHours = useMemo(() => (dailySeconds / 3600).toFixed(2), [dailySeconds]);
  const weeklyHours = useMemo(() => (weeklySeconds / 3600).toFixed(2), [weeklySeconds]);
  const monthlyHours = useMemo(() => (monthlySeconds / 3600).toFixed(2), [monthlySeconds]);

  return (
    <>
      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl shadow flex flex-col justify-between">
        <div className="flex items-center gap-2 text-white text-sm font-medium tracking-wide">
          <FiClock /> Daily
        </div>
        <div className="text-white text-3xl font-bold mt-2">{dailyHours} hr</div>
        <div className="text-white text-xs opacity-80">completed today</div>
        <div className="mt-4">
          <div className="w-full bg-white bg-opacity-20 h-2 rounded-full">
            <div
              className="h-2 rounded-full bg-white"
              style={{ width: `${calcProgress(dailySeconds, 24)}%` }}
            ></div>
          </div>
          <div className="text-right text-xs mt-1 text-white font-medium">
            {calcProgress(dailySeconds, 24)}%
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-4 rounded-2xl shadow flex flex-col justify-between">
        <div className="flex items-center gap-2 text-white text-sm font-medium tracking-wide">
          <FiCalendar /> Weekly
        </div>
        <div className="text-white text-3xl font-bold mt-2">{weeklyHours} hr</div>
        <div className="text-white text-xs opacity-80">completed this week</div>
        <div className="mt-4">
          <div className="w-full bg-white bg-opacity-20 h-2 rounded-full">
            <div
              className="h-2 rounded-full bg-white"
              style={{ width: `${calcProgress(weeklySeconds, 168)}%` }}
            ></div>
          </div>
          <div className="text-right text-xs mt-1 text-white font-medium">
            {calcProgress(weeklySeconds, 168)}%
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-4 rounded-2xl shadow flex flex-col justify-between">
        <div className="flex items-center gap-2 text-white text-sm font-medium tracking-wide">
          <FiTrendingUp /> Monthly
        </div>
        <div className="text-white text-3xl font-bold mt-2">{monthlyHours} hr</div>
        <div className="text-white text-xs opacity-80">completed this month</div>
        <div className="mt-4">
          <div className="w-full bg-white bg-opacity-20 h-2 rounded-full">
            <div
              className="h-2 rounded-full bg-white"
              style={{ width: `${calcProgress(monthlySeconds, 720)}%` }}
            ></div>
          </div>
          <div className="text-right text-xs mt-1 text-white font-medium">
            {calcProgress(monthlySeconds, 720)}%
          </div>
        </div>
      </div>
    </>
  );
}