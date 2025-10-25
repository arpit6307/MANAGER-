import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';
import { FiMenu, FiX } from 'react-icons/fi';

export default function Layout() {
  const { currentUser, isAdmin } = useAuth(); // RESTORED: Destructure isAdmin from context
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <NavLink to="/" className="logo" onClick={closeMenu}>
          SENTINEL<span>VAULT</span>
        </NavLink>

        <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <FiX /> : <FiMenu />}
        </button>

        <nav className={`main-nav ${isMenuOpen ? 'nav-open' : ''}`}>
          {!currentUser ? (
            <>
              <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
                Login
              </NavLink>
              <NavLink to="/signup" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
                Sign Up
              </NavLink>
            </>
          ) : (
            <>
              {/* RESTORED: Conditional Admin Link */}
              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
                  Admin Panel
                </NavLink>
              )}
              
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
                Dashboard
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
                Profile
              </NavLink>
              <button onClick={handleLogout} className="btn-secondary" style={{ marginLeft: '1.5rem' }}>
                Logout
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="content-area">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p className="footer-credit">Developed with ❤️ by Arpit Singh Yadav</p>
        <p className="footer-copyright">&copy; 2024 SentinelVault. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
