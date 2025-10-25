import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';

// NEW: Imports to ensure jsPDF and jspdf-autotable are loaded globally.
// This is done here to attach the autoTable function to jsPDF before 
// any component (like Dashboard) attempts to use it.
import jsPDF from 'jspdf';
import 'jspdf-autotable'; 
// Note: We use a static import here to try and resolve the error
// by loading the plugin's side effects early in the application lifecycle.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)