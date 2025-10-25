// src/components/AdminRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { currentUser, isAdmin } = useAuth();

  // 1. If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // 2. If logged in but NOT admin, redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}