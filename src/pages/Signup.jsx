import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase-config';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import Select from 'react-select';
import { countryPhoneData } from '../components/countryPhoneData';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useToast } from '../context/ToastContext'; // NEW: Import Toast Context

// react-select ke liye custom styles
const selectStyles = {
    control: (styles) => ({
        ...styles,
        backgroundColor: 'var(--bg-dark)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px 0 0 6px',
        padding: '4px',
        boxShadow: 'none',
        minHeight: '50px',
    }),
    menu: (styles) => ({
        ...styles,
        backgroundColor: 'var(--bg-light)',
        border: '1px solid var(--border-color)'
    }),
    option: (styles, { isFocused, isSelected }) => ({
        ...styles,
        backgroundColor: isSelected ? 'var(--accent-blue)' : isFocused ? 'var(--bg-dark)' : 'var(--bg-light)',
        color: isSelected ? 'var(--bg-dark)' : 'var(--text-primary)',
        fontSize: '0.9rem',
        ':active': { ...styles[':active'], backgroundColor: 'var(--accent-blue)' },
    }),
    singleValue: (styles) => ({
        ...styles,
        color: 'var(--text-primary)',
        fontSize: '0.9rem',
    }),
    input: (styles) => ({ ...styles, color: 'var(--text-primary)'}),
};

export default function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState({ value: '+91', label: '🇮🇳 IN (+91)' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // REMOVED: const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { showToast } = useToast(); // NEW: Initialize Toast hook

    const countryOptions = useMemo(() => countryPhoneData, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error'); // NEW TOAST
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters long.', 'error'); // NEW TOAST
            return;
        }

        setLoading(true);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Firebase Auth profile mein username update karein
            await updateProfile(user, { displayName: username });

            // Firestore mein user ka data save karein (vaultPin is empty by default)
            await setDoc(doc(db, 'users', user.uid), {
                username: username,
                email: user.email,
                phone: `${country.value}${phone}`,
                vaultPin: '', // Ensures the PIN setup modal is triggered
                isAdmin: false, // Default role set to false
                isBanned: false, // Default status set to false
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
            
            // NEW: Show toast and redirect to Profile page to force PIN setup
            showToast('Account created successfully! Please set your Vault PIN.', 'success'); 
            navigate('/profile'); 

        } catch (err) {
            // Replaced static error handling with toast notification
            showToast('Failed to create account. The email may already be in use.', 'error');
        }
        setLoading(false);
    };

    const getDefaultValue = () => countryOptions.find(c => c.value === '+91');

    return (
        <div className="auth-form-container">
            <h1 className="auth-form-title">Create <span>Account</span></h1>
            {/* REMOVED: {error && <p className="message-box error">{error}</p>} */}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Username</label>
                    <input className="input-field" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                 <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="phone-input-group">
                        <Select
                            options={countryOptions}
                            styles={selectStyles}
                            defaultValue={getDefaultValue()}
                            onChange={setCountry}
                        />
                        <input className="input-field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" required />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="password-input-wrapper">
                        <input className="input-field password-field" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <div className="password-input-wrapper">
                        <input className="input-field password-field" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                         <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Register'}
                </button>
            </form>
            <p className="auth-link">
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
}
