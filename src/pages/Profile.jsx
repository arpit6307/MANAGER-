import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, auth } from '../firebase-config';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiUnlock } from 'react-icons/fi'; // Added icons for the modal

// --- NEW COMPONENT: PIN SETUP MODAL ---
// This modal is shown when a new user is redirected to the profile page to set their PIN
const PinSetupModal = ({ onRedirectToPin }) => {
    return (
        <div className="modal-backdrop">
            <div className="modal-content card" style={{ maxWidth: '450px', textAlign: 'center' }}>
                <FiLock size={48} color="var(--accent-orange)" style={{ marginBottom: '1rem' }} />
                <h3 className="card-title" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
                    Secure Your Vault!
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Your security is important. Please set a 4-digit Vault PIN to protect your credentials before proceeding to the Dashboard.
                </p>
                <div className="modal-actions">
                    <button
                        className="btn btn-primary"
                        onClick={onRedirectToPin}
                    >
                        Create Vault PIN Now
                    </button>
                </div>
            </div>
        </div>
    );
};

// Function to get initials from username
const getInitials = (name = '') => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
        initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

export default function Profile() {
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [newUsername, setNewUsername] = useState('');
    const [loading, setLoading] = useState(true);
    
    // --- PIN STATES ---
    const [vaultPin, setVaultPin] = useState('');
    const [confirmVaultPin, setConfirmVaultPin] = useState('');
    const [isPinUpdating, setIsPinUpdating] = useState(false);
    
    // States for re-authentication before deletion
    const [showReauth, setShowReauth] = useState(false);
    const [password, setPassword] = useState('');

    // --- NEW PIN MODAL STATE ---
    const [showPinModal, setShowPinModal] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!currentUser) return;
        const docRef = doc(db, 'users', currentUser.uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile(data);
                setNewUsername(data.username || currentUser.displayName || '');

                // NEW: Check if PIN is set, if not, show modal
                if (!data.vaultPin) {
                    setShowPinModal(true);
                }

            } else {
                const initialData = {
                    username: currentUser.displayName || currentUser.email.split('@')[0],
                    email: currentUser.email,
                    phone: '',
                    vaultPin: '', // Initialize vaultPin field
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                };
                // Ensure doc is created if missing
                await setDoc(docRef, initialData); 
                setProfile(initialData);
                setNewUsername(initialData.username);
                
                // NEW: Show modal if profile was just created and PIN is empty
                setShowPinModal(true); 
            }
        } catch (err) {
            showToast("Failed to load profile data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [currentUser, showToast]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdateUsername = async (e) => {
        e.preventDefault();
        if (currentUser.displayName === newUsername) return;
        
        try {
            await updateProfile(auth.currentUser, { displayName: newUsername });
            const docRef = doc(db, 'users', currentUser.uid);
            await updateDoc(docRef, { username: newUsername, lastUpdated: serverTimestamp() });
            setProfile(prev => ({ ...prev, username: newUsername }));
            showToast('Username updated successfully!', 'success');
        } catch (err) {
            showToast('Failed to update username.', 'error');
        }
    };

    const handleSetPin = async (e) => {
        e.preventDefault();
        setIsPinUpdating(true);

        if (vaultPin.length !== 4 || isNaN(vaultPin)) {
            showToast('PIN must be exactly 4 digits.', 'error');
            setIsPinUpdating(false);
            return;
        }

        if (vaultPin !== confirmVaultPin) {
            showToast('PINs do not match.', 'error');
            setIsPinUpdating(false);
            return;
        }

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            await updateDoc(docRef, { vaultPin: vaultPin, lastUpdated: serverTimestamp() });
            showToast('Vault PIN set successfully! Redirecting to Dashboard.', 'success'); 
            
            // NEW: After setting PIN, hide modal and redirect to dashboard
            setShowPinModal(false);
            setVaultPin('');
            setConfirmVaultPin('');
            navigate('/dashboard'); 

        } catch (err) {
            showToast('Failed to set PIN.', 'error');
        }
        setIsPinUpdating(false);
    };


    const handlePasswordReset = () => {
        try {
            sendPasswordResetEmail(auth, currentUser.email);
            showToast(`Password reset link sent to ${currentUser.email}. Check your inbox.`, 'success');
        } catch (err) {
            showToast('Failed to send password reset email. Please check your connection.', 'error');
        }
    };

    // **UPDATED LOGIC FOR ACCOUNT DELETION**
    const handleConfirmDeletion = async (e) => {
        e.preventDefault();
        setLoading(true);
        const userToDelete = currentUser; // Cache user object before it's deleted

        if (!userToDelete) {
             showToast('No user found to delete.', 'error');
             setLoading(false);
             return;
        }

        try {
            // Step 1: Re-authenticate the user
            const credential = EmailAuthProvider.credential(userToDelete.email, password);
            await reauthenticateWithCredential(userToDelete, credential);
            
            // --- Step 2: Delete ALL Firestore Data ---
            const userDocRef = doc(db, 'users', userToDelete.uid);
            const passwordsCollectionRef = collection(userDocRef, 'passwords');

            // 2a. Delete Passwords Subcollection (using batch writes)
            const passwordSnapshot = await getDocs(passwordsCollectionRef);
            const batch = writeBatch(db);
            
            passwordSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // 2b. Delete the main User Profile Document
            await deleteDoc(userDocRef);
            // ------------------------------------------------

            // Step 3: Delete the user from Firebase Auth
            await deleteUser(userToDelete);
            
            // Step 4: Show success toast and redirect
            showToast('Account and all associated data deleted permanently.', 'success'); 
            
            setTimeout(() => {
                navigate('/signup');
            }, 500); 

        } catch (err) {
            if (err.code === 'auth/wrong-password') {
                showToast("Incorrect password. Deletion cancelled.", 'error'); 
            } else if (err.code === 'auth/requires-recent-login') {
                 // This error typically happens if reauthenticateWithCredential wasn't successful right before deleteUser
                 showToast("Please try again. Your login session has expired and requires a fresh login before deletion.", 'error'); 
            }
            else {
                showToast(`An error occurred during deletion: ${err.message}`, 'error'); 
            }
            setShowReauth(false);
            setLoading(false);
        }
    };
    
    // Function to handle the modal button click and scroll to the PIN section
    const handleRedirectToPin = () => {
        setShowPinModal(false); // Hide the introductory modal
        // Use document.getElementById and scrollIntoView to smoothly focus on the PIN section
        document.getElementById('vault-pin-security').scrollIntoView({ behavior: 'smooth' });
    };


    if (loading) return <p style={{ textAlign: 'center' }}>Loading Profile...</p>;
    if (!profile) return <p style={{ textAlign: 'center' }}>Could not load profile data.</p>; // Simplified fallback

    return (
        <div className="profile-container card">
            
            {/* NEW: RENDER PIN MODAL */}
            {showPinModal && <PinSetupModal onRedirectToPin={handleRedirectToPin} />}

            <div className="profile-header">
                <div className="profile-avatar">
                    {getInitials(newUsername)}
                </div>
                <h1 className="profile-title">{newUsername}</h1>
            </div>

            {/* REMOVED: Old message boxes */}
            
            <div className="profile-details">
                <div className="profile-info-item">
                    <span className="info-label">Email Address</span>
                    <span className="info-value">{profile.email}</span>
                </div>
                <div className="profile-info-item">
                    <span className="info-label">Phone Number</span>
                    <span className="info-value">{profile.phone || 'Not Set'}</span>
                </div>
                 <div className="profile-info-item">
                    <span className="info-label">User UID</span>
                    <span className="info-value uid">{currentUser.uid}</span>
                </div>
            </div>

            <hr className="divider" />
            
            {/* Update Username Form */}
            <form onSubmit={handleUpdateUsername}>
                <div className="form-group">
                    <label className="form-label">Update Username</label>
                    <input
                        type="text"
                        className="input-field"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Username'}
                </button>
            </form>

            <hr className="divider" />
            
            {/* --- PIN SETTING FORM --- */}
            {/* ADDED ID to allow smooth scrolling from modal */}
            <h2 className="card-title" id="vault-pin-security" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Vault PIN Security</h2>
            <form onSubmit={handleSetPin}>
                <div className="form-group">
                    <label className="form-label">Set 4-Digit Vault PIN</label>
                    <input
                        type="password"
                        className="input-field"
                        value={vaultPin}
                        onChange={(e) => setVaultPin(e.target.value.slice(0, 4))} // Max 4 digits
                        placeholder="New 4-Digit PIN"
                        maxLength="4"
                        pattern="\d{4}"
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Confirm 4-Digit Vault PIN</label>
                    <input
                        type="password"
                        className="input-field"
                        value={confirmVaultPin}
                        onChange={(e) => setConfirmVaultPin(e.target.value.slice(0, 4))} // Max 4 digits
                        placeholder="Confirm PIN"
                        maxLength="4"
                        pattern="\d{4}"
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isPinUpdating}>
                    {isPinUpdating ? 'Saving PIN...' : 'Save Vault PIN'}
                </button>
            </form>

            <hr className="divider" />

            {/* Account Security Section */}
            <div className="account-security">
                <h2 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Account Security</h2>
                <button onClick={handlePasswordReset} className="btn btn-secondary" disabled={loading}>
                    Send Password Reset Email
                </button>

                {/* Show delete confirmation form when button is clicked */}
                {!showReauth ? (
                    <button onClick={() => setShowReauth(true)} className="btn btn-danger" disabled={loading} style={{ marginTop: '1rem' }}>
                        Delete Account Permanently
                    </button>
                ) : (
                    <form onSubmit={handleConfirmDeletion} className="reauth-form">
                        <label className="form-label">Enter your password to confirm deletion:</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your Password"
                            required
                        />
                        <div className="reauth-actions">
                             <button type="button" className="btn btn-secondary" onClick={() => setShowReauth(false)}>Cancel</button>
                             <button type="submit" className="btn btn-danger" disabled={loading}>
                                {loading ? 'Deleting...' : 'Confirm & Delete'}
                            </button>
                        </div>
                    </form>
                )}
                <p style={{color: 'var(--accent-orange)', fontSize: '0.8rem', marginTop: '0.5rem'}}>Warning: Account deletion is irreversible.</p>
            </div>
        </div>
    );
}
