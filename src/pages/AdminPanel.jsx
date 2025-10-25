import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase-config';
import { collection, getDocs, doc, updateDoc, writeBatch, serverTimestamp, addDoc, query, orderBy, limit, getDoc } from 'firebase/firestore'; 
import { sendPasswordResetEmail } from 'firebase/auth';
import { FiTrash2, FiLock, FiUnlock, FiUsers, FiRepeat, FiAlertTriangle, FiShield, FiUserCheck, FiUserX, FiActivity, FiKey, FiSettings, FiSave, FiXCircle, FiSearch, FiCloudDrizzle } from 'react-icons/fi';
import { formatDate, calculateStrength } from '../utils/helpers';
import { useAuth } from '../context/AuthContext'; 
import { useToast } from '../context/ToastContext'; 

// --- Helper component for the visual health bar (Unchanged) ---
const HealthBar = ({ label, count, total, color }) => {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return (
        <div className="health-bar-item">
            <div className="health-bar-header">
                <span>{label}</span>
                <strong>{count}</strong>
            </div>
            <div className="health-bar-container">
                <div 
                    className="health-bar-fill" 
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                ></div>
            </div>
            <span className="health-bar-percent" style={{color: color}}>{percentage}%</span>
        </div>
    );
};


// --- Log Sensitive Actions (One and only definition) ---
const logSensitiveAction = async (userEmail, action, level = 'info') => {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            timestamp: serverTimestamp(),
            userEmail: userEmail,
            action: action,
            level: level
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
    }
};

// --- NEW HELPER: Fetch ALL user passwords and data (used for scanning/analysis) ---
const fetchAllCredentialsData = async () => {
    let allCredentials = [];
    let usersData = [];
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        for (const user of usersData) {
            const passwordsCollectionRef = collection(db, 'users', user.uid, 'passwords');
            const passwordDocs = await getDocs(passwordsCollectionRef);
            
            passwordDocs.docs.forEach(pwDoc => {
                const pwData = pwDoc.data();
                allCredentials.push({
                    id: pwDoc.id,
                    userEmail: user.email || 'N/A',
                    site: pwData.site || 'N/A',
                    username: pwData.username || 'N/A',
                    password: pwData.password || 'N/A',
                    category: pwData.category || 'other',
                    ownerName: user.username || 'N/A'
                });
            });
        }
        return { allCredentials, usersData };
    } catch (err) {
        console.error("Error fetching all passwords for scan:", err);
        return { allCredentials: [], usersData: [] };
    }
};


// --- Admin PIN Setup/Update Form (Unchanged logic) ---
function AdminPinSetupForm({ currentUser, onClose }) {
    const { showToast } = useToast();
    const [vaultPin, setVaultPin] = useState('');
    const [confirmVaultPin, setConfirmVaultPin] = useState('');
    const [isPinUpdating, setIsPinUpdating] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSetPin = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsPinUpdating(true);

        if (vaultPin.length !== 4 || isNaN(vaultPin)) {
            setLocalError('PIN must be 4 digits.');
            setIsPinUpdating(false);
            return;
        }

        if (vaultPin !== confirmVaultPin) {
            setLocalError('PINs do not match.');
            setIsPinUpdating(false);
            return;
        }

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            await updateDoc(docRef, { 
                vaultPin: vaultPin, 
                lastUpdated: serverTimestamp() 
            });
            showToast('Admin Vault PIN set successfully!', 'success'); 
            onClose(); 

        } catch (err) {
            showToast('Failed to set PIN.', 'error');
            setLocalError('Failed to save PIN to Firestore.');
        } finally {
            setIsPinUpdating(false);
        }
    };
    
    return (
        <div className="modal-backdrop">
            <div className="modal-content card" style={{ maxWidth: '450px', textAlign: 'center' }}>
                <h3 className="card-title" style={{ fontSize: '1.4rem', marginBottom: '1rem', borderBottom: '1px solid var(--accent-orange)', paddingBottom: '1rem' }}>
                    <FiSettings style={{marginRight: '0.5rem'}}/> Set/Update Admin Vault PIN
                </h3>
                
                {localError && <p className="message-box error">{localError}</p>}
                <p className="info-label" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    This 4-digit PIN secures the sensitive Password Vault section.
                </p>

                <form onSubmit={handleSetPin}>
                    <div className="form-group">
                        <label className="form-label">New 4-Digit Vault PIN</label>
                        <input
                            type="password"
                            className="input-field"
                            value={vaultPin}
                            onChange={(e) => setVaultPin(e.target.value.slice(0, 4))} 
                            placeholder="New 4-Digit PIN"
                            maxLength="4"
                            pattern="\d{4}"
                            required
                            disabled={isPinUpdating}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm PIN</label>
                        <input
                            type="password"
                            className="input-field"
                            value={confirmVaultPin}
                            onChange={(e) => setConfirmVaultPin(e.target.value.slice(0, 4))}
                            placeholder="Confirm PIN"
                            maxLength="4"
                            pattern="\d{4}"
                            required
                            disabled={isPinUpdating}
                        />
                    </div>
                    <div className="modal-actions" style={{marginTop: '1.5rem'}}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPinUpdating}>
                            <FiXCircle style={{marginRight: '0.5rem'}}/> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isPinUpdating}>
                            <FiSave style={{marginRight: '0.5rem'}}/> {isPinUpdating ? 'Saving...' : 'Save PIN'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Lock Overlay (Unchanged logic) ---
function LockOverlay({ onUnlock, setPasswordsVaultError, passwordsVaultError, currentUser }) {
    const [pin, setPin] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    
    const handleUnlockAttempt = async (e) => {
        e.preventDefault();
        setPasswordsVaultError(''); 
        setIsChecking(true);

        if (pin.length !== 4) {
            setPasswordsVaultError('PIN must be 4 digits.');
            setIsChecking(false);
            return;
        }

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            const storedPin = docSnap.exists() ? docSnap.data().vaultPin : null;

            if (storedPin === pin) {
                onUnlock(); 
            } else {
                setPasswordsVaultError('Incorrect Admin PIN.');
            }
        } catch (err) {
            setPasswordsVaultError('An error occurred during verification.');
        }

        setIsChecking(false);
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50, 
            backgroundColor: 'rgba(13, 17, 23, 0.95)', 
            backdropFilter: 'blur(5px)', 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '8px',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <FiLock size={48} color="var(--accent-orange)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--accent-orange)', marginBottom: '1rem' }}>Vault is Locked</h3>

            {passwordsVaultError && <p className="message-box error" style={{marginBottom: '1rem'}}>{passwordsVaultError}</p>}
            
            <form onSubmit={handleUnlockAttempt} style={{ maxWidth: '300px', width: '100%' }}>
                <input
                    className="input-field"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.slice(0, 4))}
                    placeholder="Enter PIN"
                    maxLength="4"
                    pattern="\d{4}"
                    required
                    autoFocus
                    style={{ marginBottom: '1rem' }}
                />
                <button type="submit" className="btn btn-primary" disabled={isChecking}>
                    {isChecking ? 'Verifying...' : 'Unlock'}
                </button>
            </form>
            <p className="info-label" style={{ marginTop: '1rem' }}>
                This PIN secures the Admin Vault.
            </p>
        </div>
    );
}


export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [systemHealth, setSystemHealth] = useState({ weak: 0, medium: 0, strong: 0, total: 0 });

    const { currentUser } = useAuth(); 
    const { showToast } = useToast(); 

    const [showPinSetup, setShowPinSetup] = useState(false); 
    
    // States for the secured password section
    const [allPasswords, setAllPasswords] = useState([]); 
    const [isPasswordsVaultUnlocked, setIsPasswordsVaultUnlocked] = useState(false); 
    const [passwordsVaultError, setPasswordsVaultError] = useState(''); 
    const [isPasswordsLoading, setIsPasswordsLoading] = useState(false);
    
    // NEW STATES for the Dark Web Scanner
    const [isScanning, setIsScanning] = useState(false); 
    const [scanResults, setScanResults] = useState(null); 
    
    // NEW STATE for search bar
    const [searchQuery, setSearchQuery] = useState('');


    // --- Dark Web Leak Scan Simulation (Stable and Correct) ---
    const handleDarkWebScan = async () => {
        setIsScanning(true);
        setScanResults(null);
        setMessage('');
        setError('');

        if (!currentUser || !currentUser.email) {
            setError("Authentication error: Admin user email not found.");
            setIsScanning(false);
            return;
        }

        await logSensitiveAction(currentUser.email, `Initiated Global Dark Web Leak Exposure Scan.`, 'security');

        const { allCredentials, usersData } = await fetchAllCredentialsData(); 

        const MOCK_LEAK_DATABASE_EMAILS = ['arpitsinghyadav56@gmail.com', 'test@example.com'];
        const MOCK_LEAK_DATABASE_PASSWORDS = ['Arpit1432@269', 'password123']; 

        const exposedUsersMap = new Map(); 

        usersData.forEach(user => {
            if (MOCK_LEAK_DATABASE_EMAILS.includes(user.email.toLowerCase())) {
                exposedUsersMap.set(user.email, { email: user.email, username: user.username, exposureType: 'Email Breach' });
            }
        });

        allCredentials.forEach(p => {
            if (MOCK_LEAK_DATABASE_PASSWORDS.includes(p.password)) {
                if (!exposedUsersMap.has(p.userEmail)) {
                    exposedUsersMap.set(p.userEmail, { email: p.userEmail, username: p.ownerName, exposureType: 'Password Exposure' });
                }
            }
        });

        const exposedUsers = Array.from(exposedUsersMap.values());

        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const results = {
            exposedCount: exposedUsers.length,
            exposedUsers: exposedUsers
        };

        setScanResults(results);
        setIsScanning(false);

        if (results.exposedCount > 0) {
            setError(`SECURITY ALERT: ${results.exposedCount} accounts found exposed in mock breach data! Immediate action is recommended.`);
            await logSensitiveAction(currentUser.email, `Scan detected ${results.exposedCount} exposed users.`, 'danger');
        } else {
            setMessage('Global Dark Web Scan complete. No exposed accounts found.');
            await logSensitiveAction(currentUser.email, `Scan detected 0 exposed users.`, 'info');
        }
    };
    // ------------------------------------------------


    // --- fetchAuditLogs (Stable) ---
    const fetchAuditLogs = async () => {
        try {
            const logsQuery = query(
                collection(db, 'audit_logs'),
                orderBy('timestamp', 'desc'),
                limit(10) 
            );
            const logSnapshot = await getDocs(logsQuery);
            const logsData = logSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp ? formatDate(doc.data().timestamp) : 'N/A' 
            }));
            setAuditLogs(logsData);
        } catch (err) {
            console.error("Error fetching audit logs:", err);
        }
    };
    // -----------------------------

    // --- fetchAllPasswords: SENSITIVE FUNCTION (Wrapped in useCallback) ---
    const fetchAllPasswords = useCallback(async () => {
        setAllPasswords([]); 
        setIsPasswordsLoading(true);
        setPasswordsVaultError(''); 
        
        if (!currentUser || !currentUser.email) {
            setPasswordsVaultError("Authentication error: Admin user not logged in.");
            setIsPasswordsLoading(false);
            return;
        }
        
        const adminEmail = currentUser.email;

        try {
            const { allCredentials: fetchedCredentials } = await fetchAllCredentialsData();
            
            setAllPasswords(fetchedCredentials);
            setIsPasswordsVaultUnlocked(true); 
            setPasswordsVaultError(''); 

            await logSensitiveAction(adminEmail, `UNLOCKED/REFRESHED and viewed ${fetchedCredentials.length} total user credentials.`, 'danger'); 
            showToast('All user passwords successfully fetched.', 'success'); 

        } catch (err) {
            setPasswordsVaultError("Failed to fetch all passwords. Check Firestore rules and connection.");
            
            await logSensitiveAction(adminEmail, `FAILED to view all user credentials (Database Error).`, 'danger');
        } finally {
            setIsPasswordsLoading(false);
        }
    }, [currentUser, showToast]); 

    // --- fetchAllUsers (Stable and Correct) ---
    const fetchAllUsers = useCallback(async (shouldSetLoading = true) => {
        if(shouldSetLoading) setLoading(true);
        setError('');
        let healthCount = { weak: 0, medium: 0, strong: 0, total: 0 };
        const userList = [];

        try {
            const usersCollectionRef = collection(db, 'users');
            const userDocs = await getDocs(usersCollectionRef);

            for (const userDoc of userDocs.docs) {
                const userData = { ...userDoc.data(), uid: userDoc.id };

                // 1. Get Passwords for count and health analysis
                const passwordsCollectionRef = collection(db, 'users', userData.uid, 'passwords');
                const passwordDocs = await getDocs(passwordsCollectionRef);
                const passwordCount = passwordDocs.size;

                // 2. Perform Password Health Check on all passwords
                passwordDocs.docs.forEach(pwDoc => {
                    const pwData = pwDoc.data();
                    if (pwData.password) {
                        const strength = calculateStrength(pwData.password).text;
                        if (strength === 'Weak') healthCount.weak++;
                        if (strength === 'Medium') healthCount.medium++;
                        if (strength === 'Strong') healthCount.strong++;
                        healthCount.total++;
                    }
                });

                const lastUpdatedTimestamp = userDoc.data().lastUpdated;
                const createdAtTimestamp = userDoc.data().createdAt;
                const lastLogin = lastUpdatedTimestamp || createdAtTimestamp;

                userList.push({
                    ...userData,
                    passwordCount,
                    isBanned: !!userData.isBanned,
                    isAdmin: !!userData.isAdmin,
                    lastLogin: lastLogin ? formatDate(lastLogin) : 'N/A'
                });
            }

            setUsers(userList);
            setSystemHealth(healthCount);
            
            await fetchAuditLogs(); 

        } catch (err) {
            console.error("Error fetching users:", err);
            setError("Failed to load user data. Check Firestore rules and connection.");
        } finally {
            if(shouldSetLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);


    // --- NEW: FILTERING LOGIC for All Passwords Table ---
    const filteredPasswords = allPasswords.filter(p => {
        if (!searchQuery) return true;
        const queryTerm = searchQuery.toLowerCase();
        // Search by Owner Email, Site, Username, or Category
        return (
            p.userEmail.toLowerCase().includes(queryTerm) ||
            p.ownerName.toLowerCase().includes(queryTerm) ||
            p.site.toLowerCase().includes(queryTerm) ||
            p.username.toLowerCase().includes(queryTerm) ||
            p.category.toLowerCase().includes(queryTerm)
        );
    });
    // --- END FILTERING LOGIC ---

    // --- ACTIONS (Stabilized Handlers) ---
    
    // 1. Toggle Ban Status (Disable/Activate User)
    const handleToggleStatus = async (uid, currentStatus, email) => {
        const newStatus = !currentStatus;
        setMessage('');
        const action = `${newStatus ? 'Banned' : 'Activated'} user: ${email}`;

        try {
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, { isBanned: newStatus });
            
            // OPTIMISTIC UPDATE: Update the local state first
            setUsers(users.map(u => u.uid === uid ? { ...u, isBanned: newStatus } : u));
            setMessage(`User ${email} successfully ${newStatus ? 'DISABLED' : 'ACTIVATED'}.`);

            await logSensitiveAction(currentUser.email, action, newStatus ? 'danger' : 'security');
            
        } catch (err) {
            setError(`Failed to update status for user ${email}. Check Firebase rules.`);
            console.error(err);
        }
    };

    // 2. Force Password Reset (Email)
    const handleForcePasswordReset = async (email) => {
        setMessage('');
        const action = `Sent password reset email to: ${email}`;

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(`Password reset email sent to ${email}. The user will be required to change their password.`);
            await logSensitiveAction(currentUser.email, action, 'info');
            
        } catch (err) {
            // Common Firebase errors include 'auth/user-not-found'
            setError(`Failed to send password reset email for ${email}. Error: ${err.message}`);
            console.error(err);
        }
    };

    // 3. Purge All Credentials (DANGER)
    const handlePurgeCredentials = async (uid, username) => {
        if (!window.confirm(`DANGER: Are you sure you want to PERMANENTLY PURGE ALL credentials for ${username}? This is irreversible.`)) {
            return;
        }
        setMessage('');
        let purgedCount = 0;
        const action = `PURGED ALL credentials for user: ${username}`;

        try {
            const passwordsRef = collection(db, 'users', uid, 'passwords');
            const snapshot = await getDocs(passwordsRef);
            purgedCount = snapshot.size;
            
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // Re-fetch all user data to update the password count displayed
            await fetchAllUsers(); 
            setMessage(`All ${purgedCount} credentials purged for user ${username}.`);
            
            await logSensitiveAction(currentUser.email, action, 'danger');

        } catch (err) {
            setError(`Failed to purge credentials for ${username}. Check Firebase rules.`);
            console.error(err);
        }
    };
    
    // Toggle Admin Status (Kept for completeness)
    const handleToggleAdmin = async (uid, currentAdminStatus, username, email) => { 
        const newStatus = !currentAdminStatus;
        setMessage('');
        const action = `${newStatus ? 'Granted Admin' : 'Revoked Admin'} status for user: ${email}`;
        
        try {
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, { isAdmin: newStatus });
            
            setUsers(users.map(u => u.uid === uid ? { ...u, isAdmin: newStatus } : u));
            setMessage(`User ${username} successfully set as ${newStatus ? 'ADMIN' : 'STANDARD USER'}.`);
            
            await logSensitiveAction(currentUser.email, action, 'security');

        } catch (err) {
            setError(`Failed to update admin status for user ${username}.`);
            console.error(err);
        }
    };


    if (loading) return <p style={{ textAlign: 'center' }}>Loading all Admin Data...</p>;

    return (
        <div className="admin-panel-container">
            {showPinSetup && <AdminPinSetupForm currentUser={currentUser} onClose={() => setShowPinSetup(false)} />}

            <header className="dashboard-header" style={{marginBottom: '0.5rem', alignItems: 'flex-start'}}>
                <h1 className="dashboard-title"><FiUsers /> SentinelVault <span>Command</span></h1>
                {/* SET PIN Button */}
                <button 
                    className="btn btn-secondary" 
                    onClick={() => setShowPinSetup(true)}
                    style={{ background: 'var(--accent-orange)', color: 'var(--bg-dark)' }}
                >
                    <FiKey style={{marginRight: '0.5rem'}}/> Set/Update Admin PIN
                </button>
            </header>
            
            {message && <p className="message-box success" style={{maxWidth: '100%'}}>{message}</p>}
            {error && <p className="message-box error" style={{maxWidth: '100%'}}>{error}</p>}

            
            {/* --- NEW SECTION: Dark Web Exposure Scanner --- */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--accent-blue)' }}>
                <h2 className="card-title" style={{borderBottom: 'none', paddingBottom: '0.5rem'}}><FiCloudDrizzle style={{marginBottom: '-3px', marginRight: '0.5rem'}}/> Global Exposure Scanner (Mock)</h2>
                <p className="info-label" style={{marginBottom: '1rem'}}>
                    Scans all user emails and stored passwords against a mock database of known leaks to identify potential breaches.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleDarkWebScan}
                        disabled={isScanning}
                        style={{ width: 'auto', alignSelf: 'flex-start', padding: '10px 30px' }}
                    >
                        {isScanning ? 'Scanning...' : 'Run Dark Web Scan'}
                    </button>
                    
                    {scanResults && (
                        <div style={{ marginTop: '1rem' }}>
                            <h4 style={{ color: scanResults.exposedCount > 0 ? 'var(--accent-orange)' : '#39ff14', marginBottom: '0.5rem' }}>
                                Result: {scanResults.exposedCount} Exposed Accounts Found
                            </h4>
                            {scanResults.exposedCount > 0 && (
                                <div style={{ border: '1px solid var(--accent-orange)', padding: '1rem', borderRadius: '6px' }}>
                                    {scanResults.exposedUsers.map((user, index) => (
                                        <p key={index} style={{ color: 'var(--text-primary)', fontSize: '0.9rem', padding: '0.2rem 0' }}>
                                            <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', marginRight: '5px' }}>{user.email}</span> 
                                            ({user.username}) - {user.exposureType}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            
            {/* --- SECURITY HEALTH DASHBOARD (Unchanged) --- */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <h2 className="card-title" style={{borderBottom: 'none', paddingBottom: '0.5rem'}}><FiShield style={{marginBottom: '-3px', marginRight: '0.5rem'}}/> Vault Security Health</h2>
                <p className="info-label" style={{marginBottom: '1rem'}}>Analysis of all {systemHealth.total} stored passwords across {users.length} users.</p>
                <div className="admin-controls-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                        <p style={{fontSize: '2rem', color: 'var(--text-primary)'}}><strong>{users.length}</strong></p>
                        <p className="info-label">Total Users</p>
                    </div>
                    <div style={{ textAlign: 'center', color: '#39ff14' }}>
                        <p style={{fontSize: '2rem'}}><strong>{systemHealth.strong}</strong></p>
                        <p className="info-label">Strong</p>
                    </div>
                    <div style={{ textAlign: 'center', color: '#00aaff' }}>
                        <p style={{fontSize: '2rem'}}><strong>{systemHealth.medium}</strong></p>
                        <p className="info-label">Medium</p>
                    </div>
                    <div style={{ textAlign: 'center', color: 'var(--accent-orange)' }}>
                        <p style={{fontSize: '2rem'}}><strong>{systemHealth.weak}</strong></p>
                        <p className="info-label">Weak</p>
                    </div>
                </div>

                {/* Visual Health Bars */}
                <div className="health-bars-container" style={{marginTop: '2rem'}}>
                    <HealthBar label="Strong" count={systemHealth.strong} total={systemHealth.total} color="#39ff14" />
                    <HealthBar label="Medium" count={systemHealth.medium} total={systemHealth.total} color="#00aaff" />
                    <HealthBar label="Weak" count={systemHealth.weak} total={systemHealth.total} color="var(--accent-orange)" />
                </div>
            </div>

            {/* --- USER MANAGEMENT TABLE & ACTIONS --- */}
            <h2 className="card-title" style={{marginTop: '2rem'}}>User Table & Actions</h2>
            <div className="admin-table-wrapper card" style={{ padding: '0', overflowX: 'auto' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>User Name / Email</th>
                            <th>Status / Role</th>
                            <th>Credentials</th>
                            <th>Last Activity</th>
                            <th>Advanced Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.uid} className={user.isBanned ? 'banned-row' : ''}>
                                {/* ADDED data-label for mobile view */}
                                <td data-label="User Name / Email">
                                    <strong>{user.username || 'N/A'}</strong><br/>
                                    <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>{user.email}</span>
                                </td>
                                <td data-label="Status / Role">
                                    <span className={`status-pill ${user.isBanned ? 'status-banned' : 'status-active'}`}>
                                        {user.isBanned ? 'DISABLED' : 'ACTIVE'}
                                    </span>
                                    <span className={`status-pill ${user.isAdmin ? 'status-admin' : 'status-user'}`} style={{marginLeft: '0.5rem'}}>
                                        {user.isAdmin ? 'ADMIN' : 'USER'}
                                    </span>
                                </td>
                                <td data-label="Credentials">{user.passwordCount}</td>
                                <td data-label="Last Activity">{user.lastLogin}</td>
                                <td data-label="Advanced Actions">
                                    {/* All buttons remain in this single <td> for card view stacking */}
                                    {/* Toggle Admin Status */}
                                    <button 
                                        className="action-btn" 
                                        title={user.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                                        onClick={() => handleToggleAdmin(user.uid, user.isAdmin, user.username, user.email)}
                                        style={{ color: user.isAdmin ? 'var(--accent-orange)' : '#39ff14' }}
                                    >
                                        {user.isAdmin ? <FiUserX /> : <FiUserCheck />}
                                    </button>

                                    {/* Toggle Ban Status (Disable/Activate User) */}
                                    <button 
                                        className="action-btn" 
                                        title={user.isBanned ? 'Activate User' : 'Disable User'}
                                        onClick={() => handleToggleStatus(user.uid, user.isBanned, user.email)}
                                        style={{ color: user.isBanned ? 'var(--accent-blue)' : 'var(--accent-orange)' }}
                                    >
                                        {user.isBanned ? <FiUnlock /> : <FiLock />}
                                    </button>
                                    
                                    {/* Force Password Reset */}
                                    <button 
                                        className="action-btn" 
                                        title="Force Password Reset (Email)"
                                        onClick={() => handleForcePasswordReset(user.email)}
                                        style={{ color: 'var(--accent-blue)' }} 
                                    >
                                        <FiRepeat />
                                    </button>

                                    {/* Purge Credentials */}
                                    <button 
                                        className="action-btn delete" 
                                        title="PURGE ALL CREDENTIALS (DANGER)"
                                        onClick={() => handlePurgeCredentials(user.uid, user.username)}
                                    >
                                        <FiAlertTriangle />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


            {/* --------------------------------------------------------------------------------- */}
            {/* --- All Users' Saved Passwords (Requires PIN) --- */}
            {/* --------------------------------------------------------------------------------- */}
            <h2 className="card-title" style={{marginTop: '3rem', color: 'var(--accent-orange)'}}><FiKey style={{marginBottom: '-3px', marginRight: '0.5rem'}}/> All Users' Saved Passwords</h2>
            
            <div className="admin-table-wrapper card" style={{ padding: '0', overflowX: 'auto', marginTop: '2rem', position: 'relative' }}>
                <h3 className="card-title" style={{borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', margin: '0'}}>
                    Total Displayed: {filteredPasswords.length} / {allPasswords.length}
                    {isPasswordsVaultUnlocked && (
                        <div style={{ float: 'right', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {/* NEW: Search Bar */}
                            <div className="password-generator" style={{width: '250px'}}>
                                <input
                                    type="text"
                                    className="input-field search-input"
                                    placeholder="Search by Email or Site..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: '40px', width: '100%' }}
                                />
                                <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                            </div>
                            
                             {/* NEW: Refresh Button */}
                            <button 
                                className="btn btn-secondary" 
                                onClick={fetchAllPasswords}
                                disabled={isPasswordsLoading}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                title="Refresh Password Data"
                            >
                                <FiRefreshCw style={{marginRight: '0.5rem', animation: isPasswordsLoading ? 'spin 1s linear infinite' : 'none'}}/> Refresh
                            </button>
                            
                             {/* Re-Lock Button */}
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                    setIsPasswordsVaultUnlocked(false);
                                    setPasswordsVaultError('');
                                    setSearchQuery(''); 
                                }}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                                <FiLock style={{marginRight: '0.5rem'}}/> Re-Lock Vault
                            </button>
                        </div>
                    )}
                </h3>
                
                {/* --- LOCK OVERLAY --- */}
                {!isPasswordsVaultUnlocked && (
                    <LockOverlay 
                        onUnlock={fetchAllPasswords} 
                        setPasswordsVaultError={setPasswordsVaultError}
                        passwordsVaultError={passwordsVaultError}
                        currentUser={currentUser}
                    />
                )}
                {/* --- END LOCK OVERLAY --- */}

                {/* CONTENT (Always rendered, but covered by overlay when locked) */}
                {isPasswordsLoading && isPasswordsVaultUnlocked ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Fetching all sensitive credentials...</p>
                ) : filteredPasswords.length === 0 && searchQuery ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>No results found for "{searchQuery}".</p>
                ) : filteredPasswords.length === 0 && allPasswords.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>No passwords found across all user accounts.</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Owner Email (User)</th>
                                <th>Site / App</th>
                                <th>Username / ID</th>
                                <th>Password</th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPasswords.map((p) => (
                                <tr key={p.id}>
                                    {/* ADDED data-label for mobile view */}
                                    <td data-label="Owner Email (User)"><strong>{p.userEmail}</strong><br/><small>({p.ownerName})</small></td>
                                    <td data-label="Site / App">{p.site}</td>
                                    <td data-label="Username / ID">{p.username}</td>
                                    <td data-label="Password" style={{fontFamily: 'monospace', color: 'var(--accent-orange)'}}>{p.password}</td> 
                                    <td data-label="Category">{p.category}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* --- Sensitive Action Log (Unchanged) --- */}
            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', maxWidth: '100%' }}>
                <h2 className="card-title" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}><FiActivity style={{marginBottom: '-3px', marginRight: '0.5rem'}}/> Sensitive Action Log (Real-time)</h2>
                <div className="audit-log-list">
                    {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                            <div key={log.id} className="log-item" style={{borderBottom: '1px solid var(--bg-dark)', padding: '0.8rem 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem'}}>
                                <span style={{color: 'var(--text-secondary)'}}>[{log.time}]</span>
                                <span className={log.level === 'danger' ? 'log-admin' : log.level === 'security' ? 'log-action-security' : 'log-admin'} style={{width: '200px', flexShrink: 0}}>{log.userEmail}</span>
                                <span className={log.level === 'danger' ? 'log-action-danger' : log.level === 'security' ? 'log-action-security' : ''} style={{flexGrow: 1, paddingLeft: '1rem', wordBreak: 'break-all'}}>{log.action}</span>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '1rem' }}>No recent sensitive actions logged.</p>
                    )}
                    <div className="log-item" style={{textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '1rem'}}>
                        <small>Logs collection: `audit_logs`</small>
                    </div>
                </div>
            </div>
            
        </div>
    );
}