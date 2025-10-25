import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore'; 
import AddPasswordForm from '../components/AddPasswordForm';
import PasswordList from '../components/PasswordList';
import Select from 'react-select';
// UPDATED ICONS: Added FiUnlock, FiRefreshCw, FiSearch, FiXCircle
import { FiLock, FiUnlock, FiRefreshCw, FiSearch, FiXCircle } from 'react-icons/fi'; 

// IMPORTS FOR TOAST AND PDF EXPORT
import { useToast } from '../context/ToastContext'; 
import jsPDF from 'jspdf'; 
import * as jspdfAutoTable from 'jspdf-autotable'; 


// react-select ke liye custom styles (Unchanged)
const selectStyles = {
    control: (styles) => ({ ...styles, backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', boxShadow: 'none' }),
    menu: (styles) => ({ ...styles, backgroundColor: 'var(--bg-light)', border: '1px solid var(--border-color)' }),
    option: (styles, { isFocused, isSelected }) => ({ ...styles, backgroundColor: isSelected ? 'var(--accent-blue)' : isFocused ? 'var(--bg-dark)' : 'var(--bg-light)', color: isSelected ? 'var(--bg-dark)' : 'var(--text-primary)' }),
    singleValue: (styles) => ({ ...styles, color: 'var(--text-primary)' }),
};

// --- MODIFIED: VAULT LOCK COMPONENT (Now a Modal) ---
function VaultPinLock({ onUnlock, onClose, setModalError, modalError }) {
    const [pin, setPin] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const { currentUser } = useAuth();
    
    // Clear the external error state when modal opens
    useEffect(() => {
        setModalError('');
    }, [setModalError]);

    const handlePinSubmit = async (e) => {
        e.preventDefault();
        setModalError('');
        setIsChecking(true);

        if (pin.length !== 4) {
            setModalError('PIN must be 4 digits.');
            setIsChecking(false);
            return;
        }

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            
            const storedPin = docSnap.exists() ? docSnap.data().vaultPin : null;

            if (!storedPin) {
                setModalError("Vault PIN is not set. Please set one in the Profile page.");
            } else if (storedPin === pin) {
                onUnlock(); // Successful unlock
            } else {
                setModalError('Incorrect PIN.');
            }
        } catch (err) {
            console.error("PIN Check Error:", err);
            setModalError('An error occurred during verification.');
        }

        setIsChecking(false);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content card" style={{ maxWidth: '400px', textAlign: 'center' }}>
                <FiLock size={48} color="var(--accent-blue)" style={{ marginBottom: '1.5rem' }} />
                <h3 className="card-title" style={{ fontSize: '1.8rem' }}>Vault <span>Locked</span></h3>
                {modalError && <p className="message-box error">{modalError}</p>}
                
                <form onSubmit={handlePinSubmit}>
                    <div className="form-group">
                        <label className="form-label">Enter 4-Digit Vault PIN</label>
                        <input
                            className="input-field"
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.slice(0, 4))}
                            placeholder="****"
                            maxLength="4"
                            pattern="\d{4}"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="modal-actions">
                         <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isChecking}>
                            <FiXCircle style={{marginRight: '0.5rem'}}/> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isChecking}>
                            {isChecking ? 'Unlocking...' : 'Unlock Vault'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
// --- END MODIFIED VAULT LOCK COMPONENT ---


export default function Dashboard() {
    const { currentUser } = useAuth();
    const { showToast } = useToast(); 
    const [passwords, setPasswords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState({ value: 'all', label: 'All Categories' });
    const [loading, setLoading] = useState(true);
    
    // MODIFIED STATE: isVaultUnlocked now controls the blur effect/data display
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false); 
    const [showLockModal, setShowLockModal] = useState(false); // NEW: Controls the PIN popup
    const [modalError, setModalError] = useState(''); // NEW: Error state for the modal

    // State to hold the unsubscribe function from Firestore
    const [unsubscribe, setUnsubscribe] = useState(null); 

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'work', label: 'Work' },
        { value: 'social', label: 'Social' },
        { value: 'finance', label: 'Finance' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'other', label: 'Other' },
    ];
    
    // EFFECT: Manually initialize jspdf-autotable plugin once on mount. (Unchanged)
    useEffect(() => {
        try {
            if (jspdfAutoTable && jspdfAutoTable.applyPlugin) {
                 jspdfAutoTable.applyPlugin(jsPDF);
            }
        } catch (e) {
            console.error("Failed to initialize jspdf-autotable plugin:", e);
        }
    }, []); 

    // MODIFIED: Fetching data logic (now separated into a function for refresh control)
    const fetchPasswords = useCallback(() => {
        // Ensure user is logged in and vault is unlocked
        if (!isVaultUnlocked || !currentUser?.uid) {
             // If locked, clear sensitive data and stop fetching
             setPasswords([]); 
             setLoading(false);
             return;
        }

        setLoading(true);
        // Clean up previous listener if it exists
        if (unsubscribe) unsubscribe();

        const q = query(collection(db, 'users', currentUser.uid, 'passwords'), orderBy('site', 'asc'));
        
        // Setup new listener
        const newUnsubscribe = onSnapshot(q, (querySnapshot) => {
            const passwordsData = [];
            querySnapshot.forEach((doc) => {
                passwordsData.push({ ...doc.data(), id: doc.id });
            });
            setPasswords(passwordsData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Listener Error:", error);
            setLoading(false);
            showToast('Failed to load credentials. Check network.', 'error');
        });
        
        setUnsubscribe(() => newUnsubscribe);

        // Cleanup function for React effect
        return () => newUnsubscribe();
    }, [currentUser?.uid, isVaultUnlocked]);

    // Hook to run fetchPasswords when dependencies change
    useEffect(() => {
        // Automatically check if unlocked on mount/status change
        const cleanup = fetchPasswords();
        // Return cleanup function to stop listener when component unmounts
        return cleanup;
    }, [fetchPasswords]);
    
    // HANDLER: Re-Lock Vault
    const handleReLock = () => {
        if (unsubscribe) {
            unsubscribe(); // Stop the Firestore listener
            setUnsubscribe(null);
        }
        setIsVaultUnlocked(false);
        setSearchTerm('');
        setSelectedCategory(categories[0]);
        showToast('Vault successfully locked.', 'info');
    };
    
    // HANDLER: Refresh Data (Manually re-run fetchPasswords)
    const handleRefresh = () => {
        showToast('Refreshing credentials...', 'info');
        fetchPasswords(); 
    };


    const filteredPasswords = passwords.filter(p =>
        // Search by site, username, or category
        (p.site.toLowerCase().includes(searchTerm.toLowerCase()) || p.username.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedCategory.value === 'all' || p.category === selectedCategory.value)
    );

    // --- UPDATED EXPORT FUNCTION: Always Enabled and Email Protected PDF ---
    const exportData = () => { /* ... Unchanged PDF Export Logic ... */
        if (passwords.length === 0) {
            showToast('No credentials found to export.', 'error');
            return;
        }
        
        // Use user's email as the PDF encryption password
        const pdfPassword = currentUser.email;
        
        try {
            const doc = new jsPDF('p', 'mm', 'a4'); 
            const now = new Date();
            const filename = `SentinelVault_Export_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.pdf`;
            
            // --- HEADER ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(0, 170, 255); 
            doc.text("SentinelVault Secure Credentials", 105, 20, { align: 'center' });

            // --- METADATA ---
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(139, 148, 158); 
            doc.text(`User: ${currentUser.email}`, 14, 30);
            doc.text(`Export Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 196, 30, { align: 'right' });
            
            // --- TABLE SETUP ---
            const tableColumn = ["Site/App Name", "Username/Email", "Password", "Category"];
            const tableRows = passwords.map(credential => [
                credential.site || 'N/A',
                credential.username || 'N/A',
                credential.password, 
                credential.category || 'other'
            ]);

            // --- GENERATE TABLE with professional highlights ---
            doc.autoTable(tableColumn, tableRows, {
                startY: 38,
                theme: 'striped',
                headStyles: { 
                    fillColor: [0, 170, 255], 
                    textColor: 13, 
                    fontStyle: 'bold',
                    fontSize: 12
                },
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    textColor: 230, 
                    lineColor: [48, 54, 61], 
                    lineWidth: 0.1
                },
                bodyStyles: { fontStyle: 'bold' },
                
                margin: { top: 35 },
                didDrawPage: (data) => {
                    doc.setFontSize(8);
                    doc.text("Page " + data.pageNumber, data.settings.margin.left, doc.internal.pageSize.height - 10);
                }
            });

            // --- SECURITY FEATURE: Password Protection (Using Email) ---
            doc.save(filename, { 
                passphrase: pdfPassword, // This is currentUser.email
                encryption: {
                    userPassword: pdfPassword,
                    ownerPassword: pdfPassword,
                    userPermissions: ['print', 'modify', 'copy', 'annot-forms']
                }
            });

            // --- USER POP-UP/TOAST NOTIFICATION ---
            showToast(`Encrypted PDF exported successfully! The password to open the file is your registered email address: ${currentUser.email}`, 'success', 10000); 

        } catch (error) {
            console.error("PDF Export Error:", error);
            showToast('Export failed. Please ensure jspdf and jspdf-autotable are correctly installed.', 'error');
        }
    };
    // --- END UPDATED EXPORT FUNCTION ---


    return (
        <div className="dashboard-layout">
            {/* NEW: Render the PIN Modal if state is true */}
            {showLockModal && (
                <VaultPinLock 
                    onUnlock={() => {
                        setIsVaultUnlocked(true); // Unlock data viewing
                        setShowLockModal(false);  // Close modal
                        // fetchPasswords() is called via useEffect dependency chain
                    }} 
                    onClose={() => setShowLockModal(false)}
                    setModalError={setModalError}
                    modalError={modalError}
                />
            )}
            
            <header className="dashboard-header">
                {/* MODIFIED HEADER: Title, Unlock/Re-Lock Button, Refresh Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <h1 className="dashboard-title">My Vault</h1>
                    
                    {/* Lock/Unlock Button */}
                    {!isVaultUnlocked ? (
                         <button 
                            className="btn btn-primary" 
                            onClick={() => setShowLockModal(true)}
                            style={{ width: 'auto', padding: '10px 20px', background: 'var(--accent-blue)', color: 'var(--bg-dark)' }}
                            title="Unlock the vault with your PIN"
                        >
                            <FiUnlock style={{marginRight: '0.5rem'}}/> Unlock Vault
                        </button>
                    ) : (
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleReLock}
                            style={{ width: 'auto', padding: '8px 15px', background: 'var(--accent-orange)', color: 'var(--bg-dark)' }}
                            title="Lock the vault immediately"
                        >
                            <FiLock style={{marginRight: '0.5rem'}}/> Re-Lock Vault
                        </button>
                    )}
                    
                    {isVaultUnlocked && ( // Only show refresh when unlocked
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleRefresh}
                            style={{ width: 'auto', padding: '8px 15px' }}
                            title="Refresh Credentials"
                        >
                            <FiRefreshCw style={{marginRight: '0.5rem'}}/> Refresh Data
                        </button>
                    )}
                </div>
                
                {/* MODIFIED CONTROLS: Combined Search Bar and Export button */}
                <div className="dashboard-controls dashboard-filters" style={{flexWrap: 'wrap'}}>
                    {/* ADDED: Dedicated Search/Filter Section */}
                    <div className="password-generator" style={{width: '300px', position: 'relative'}}>
                        <input
                            type="text"
                            className="input-field search-input"
                            placeholder="Search by Site or Username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            disabled={!isVaultUnlocked}
                        />
                        <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
                    </div>
                    
                    {/* Existing Category Filter */}
                    <Select
                        className="category-filter"
                        options={categories}
                        styles={selectStyles}
                        defaultValue={categories[0]}
                        onChange={setSelectedCategory}
                        isDisabled={!isVaultUnlocked}
                    />

                    {/* Export Button */}
                    <button 
                        className="btn btn-secondary" 
                        onClick={exportData}
                        style={{ width: 'auto', padding: '10px 20px' }}
                        disabled={!isVaultUnlocked || loading}
                    >
                        Export PDF
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="card" style={{ position: 'relative' }}>
                    {/* --- BLUR LOCK OVERLAY --- */}
                    {!isVaultUnlocked && (
                         <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            backgroundColor: 'rgba(13, 17, 23, 0.95)', // Dark overlay
                            backdropFilter: 'blur(8px)', // THE BLUR EFFECT
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer' // Indicate interactivity
                        }}
                        onClick={() => setShowLockModal(true)} // Clicking overlay opens modal
                        >
                             <h3 style={{ color: 'var(--accent-orange)', margin: 0 }}>Vault Locked. Click to Unlock.</h3>
                        </div>
                    )}
                    
                    {/* Main Content (Blurred when locked) */}
                    <h2 className="card-title">Stored Credentials ({filteredPasswords.length})</h2>
                    <div className="password-list" style={{ filter: isVaultUnlocked ? 'none' : 'blur(2px)' }}>
                        {loading ? <p>Loading...</p> : <PasswordList passwords={filteredPasswords} />}
                    </div>
                </div>
                
                {/* Add Password Form (Also locked/blurred for consistency/security) */}
                <div className="card" style={{ filter: isVaultUnlocked ? 'none' : 'blur(2px)' }}>
                    <h2 className="card-title">Add New Credential</h2>
                    <AddPasswordForm categories={categories.slice(1)} /> 
                </div>
            </div>
        </div>
    );
}