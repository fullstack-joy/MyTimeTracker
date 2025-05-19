// src/components/ui/Toast.jsx
import React, { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose }) => {
  // Define base colors for light mode
  const backgroundColorsLight = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  // Define colors for dark mode (can be same or different)
  const backgroundColorsDark = {
    info: 'dark:bg-blue-600',
    success: 'dark:bg-green-600',
    error: 'dark:bg-red-600',
    warning: 'dark:bg-yellow-600',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white 
                  ${backgroundColorsLight[type]} ${backgroundColorsDark[type]} z-50`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white font-bold" aria-label="Close notification">
          &times;
        </button>
      </div>
    </div>
  );
};

export default Toast;
