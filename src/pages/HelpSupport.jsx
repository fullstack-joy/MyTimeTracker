import React from 'react';

export default function HelpSupport() {
  return (
    <div className="p-6 min-h-screen bg-black text-white">
      <h1 className="text-2xl font-bold mb-4">Help & Support</h1>
      <div className="bg-[#1f1f1f] p-6 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">About TimeTracker</h2>
        <p className="text-gray-300 mb-2">
          <span className="font-semibold text-orange-400">TimeTracker</span> is a free and open-source desktop application for tracking your work, projects, and productivity. It is built with React, Electron, and Tailwind CSS.
        </p>
        <p className="text-gray-400 text-sm">
          You can use, modify, and share this software under the MIT License.
        </p>
      </div>

      <div className="bg-[#1f1f1f] p-6 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
        <ul className="list-disc ml-6 text-gray-300 space-y-1">
          <li>Use the sidebar to navigate between Dashboard, Projects, Reports, Analytics, and Settings.</li>
          <li>Add projects and tasks, then start a timer to track your work.</li>
          <li>View your tracked time and productivity in the Dashboard and Analytics sections.</li>
          <li>Export or import your data from the Settings page.</li>
        </ul>
      </div>

      <div className="bg-[#1f1f1f] p-6 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">FAQ</h2>
        <ul className="space-y-3 text-gray-300">
          <li>
            <span className="font-semibold text-orange-400">Is TimeTracker free?</span>
            <br />
            Yes, it is completely free and open-source.
          </li>
          <li>
            <span className="font-semibold text-orange-400">Where is my data stored?</span>
            <br />
            All your data is stored locally on your computer. No data is sent to any server.
          </li>
          <li>
            <span className="font-semibold text-orange-400">How can I contribute?</span>
            <br />
            Fork the repository on GitHub, make your changes, and submit a pull request!
          </li>
        </ul>
      </div>

      <div className="bg-[#1f1f1f] p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Contact & Community</h2>
        <p className="text-gray-300 mb-2">
          For questions, suggestions, or support, please visit our <a href="https://github.com/fullstack-joy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">GitHub page</a>.
        </p>
        <p className="text-gray-400 text-xs">
          &copy; {new Date().getFullYear()} TimeTracker. MIT License.
        </p>
      </div>
    </div>
  );
}
