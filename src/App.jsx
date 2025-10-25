import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext'; // NEW
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile'; 
import AdminPanel from './pages/AdminPanel';
import ToastNotification from './components/ToastNotification'; // NEW

import './App.css';

function App() {
  return (
    // Wrap entire app in ToastProvider
    <ToastProvider>
      <AuthProvider>
        {/* Toast is rendered outside the router so it always floats above */}
        <ToastNotification /> 
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="profile" element={ 
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* RESTORED: Admin Protected Route */}
            <Route path="admin" element={ 
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } />
            
            <Route path="*" element={<h1 style={{color: 'red'}}>404 - Page Not Found</h1>} />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
