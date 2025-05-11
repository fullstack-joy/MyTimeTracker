import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiBarChart2,
  FiFolder,
  FiFileText,
  FiClock,
  FiSettings,
  FiHelpCircle,
} from 'react-icons/fi';
import { useTimeTracker } from '../../context/TimeTrackerContext';

const menuItems = [
  { label: 'Dashboard', icon: <FiGrid />, to: '/' },
  { label: 'Analytics', icon: <FiBarChart2 />, to: '/analytics' },
  { label: 'Projects', icon: <FiFolder />, to: '/projects' },
  { label: 'Reports', icon: <FiFileText />, to: '/reports' },
  { label: 'History', icon: <FiClock />, to: '/history' },
  { label: 'Settings', icon: <FiSettings />, to: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const { tasks } = useTimeTracker();
  const isTracking = tasks.some(t => t.isRunning);

  return (
    <div className="w-20 lg:w-64 bg-black text-white flex flex-col py-6 px-4 border-r border-gray-800">
      {/* Logo */}
      <div className="mb-10 text-center lg:text-left flex items-center justify-center lg:justify-center gap-2">
        <div className="flex items-center">
          {/* Show icon and "MTT" on small screens, full text on large screens */}
          
          <span className="block lg:hidden text-orange-500 font-bold text-md">MTT</span>
          <span className="hidden lg:inline text-orange-500 font-bold text-xl">MyTime</span>
          <span className="hidden lg:inline text-white font-light text-xl">Tracker</span>
          {isTracking && (
            <span
              className="ml-2 inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"
              title="Time tracker is running"
            ></span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.to}
            className={`flex items-center space-x-4 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors border-l-4 ${
              location.pathname === item.to
                ? 'bg-gray-800 text-orange-500 border-orange-500'
                : 'text-gray-300 border-transparent'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="hidden lg:inline-block">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Help & Support */}
      <div className="mt-auto">
        <Link
          to="/help"
          className={`flex items-center space-x-4 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors ${
            location.pathname === '/help' ? 'bg-gray-800 text-orange-500' : 'text-gray-300'
          }`}
        >
          <span className="text-xl"><FiHelpCircle /></span>
          <span className="hidden lg:inline-block">Help & Support</span>
        </Link>
      </div>
    </div>
  );
}
