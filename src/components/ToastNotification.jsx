import React, { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ToastNotification() {
  const { toast, dismissToast } = useToast();

  if (!toast.isVisible) return null;

  const Icon = toast.type === 'success' ? FiCheckCircle : FiAlertTriangle;

  return (
    <div className={`toast-notification toast-${toast.type}`}>
      <Icon style={{ marginRight: '10px', minWidth: '20px' }} size={20} />
      <span className="toast-message">{toast.message}</span>
      <button 
        className="toast-dismiss-btn" 
        onClick={dismissToast}
        title="Dismiss"
      >
        <FiX size={18} />
      </button>
    </div>
  );
}
