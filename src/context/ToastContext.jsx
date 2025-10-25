// src/context/ToastContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    message: '',
    type: 'success', // 'success' or 'error'
    isVisible: false,
  });

  // Function to show the toast
  const showToast = useCallback((message, type = 'success', duration = 3000) => { // CHANGED duration to 3000ms
    setToast({ message, type, isVisible: true });

    // Hide the toast after the specified duration (3 seconds default)
    setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

  // Function to dismiss immediately (optional, used by Toast component)
  const dismissToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  const value = { toast, showToast, dismissToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}