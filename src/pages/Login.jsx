import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase-config';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useToast } from '../context/ToastContext'; // NEW: Import Toast Context

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast(); // NEW: Use Toast Hook

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Step 1: Firebase Auth से साइन इन करें
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Firestore से यूजर का डेटा fetch करें
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // Step 3: Banned status की जाँच करें
        if (userData.isBanned) {
          // अगर user banned है, तो तुरंत Firebase Auth से लॉग आउट करें
          await signOut(auth); 
          // Custom error message for banned user
          showToast('Your account has been disabled by the system administrator. Please contact support.', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Step 4: यदि सब ठीक है, तो डैशबोर्ड पर जाएँ
      showToast('Login successful! Welcome back to SentinelVault.', 'success'); // NEW TOAST on successful login
      navigate('/dashboard');

    } catch (err) {
      // Firebase Auth errors (e.g., wrong password, user not found)
      showToast('Invalid credentials. Please check your email and password.', 'error');
    }
    
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      showToast('Please enter your email address first to reset the password.', 'error');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset link has been sent to your email.', 'success');
    } catch (err) {
      showToast('Failed to send password reset email. Please check the email address.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <h1 className="auth-form-title">System <span>Login</span></h1>
      {/* REMOVED: Old local error/message boxes */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your registered email"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="password-input-wrapper">
            <input
              className="input-field password-field"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>
        <div className="forgot-password-link">
          <button type="button" onClick={handlePasswordReset} disabled={loading}>
            Forgot Password?
          </button>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Authenticating...' : 'Access Vault'}
        </button>
      </form>
      <p className="auth-link">
        Need an account? <Link to="/signup">Register Now</Link>
      </p>
    </div>
  );
}
