import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { doc, deleteDoc } from 'firebase/firestore'; 
import { FiCopy, FiTrash2, FiEye, FiEyeOff, FiEdit } from 'react-icons/fi';
import { calculateStrength } from '../utils/helpers';
import DeleteConfirmationModal from './DeleteConfirmationModal'; 
import EditPasswordModal from './EditPasswordModal';
import { useToast } from '../context/ToastContext'; // NEW: Import Toast Context

export default function PasswordItem({ password }) {
    const { currentUser } = useAuth();
    const { showToast } = useToast(); // NEW: Initialize Toast hook
    const [showPassword, setShowPassword] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false); 
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const strength = calculateStrength(password.password);

    // --- UPDATED: Use Toast for Copy Confirmation ---
    const handleCopy = (text, type = 'Password') => {
        // Use a standard browser API for copying text
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show professional toast notification on success
                showToast(`${type} copied to clipboard!`, 'success'); 
            })
            .catch(err => {
                console.error("Failed to copy text: ", err);
                // Show error toast on failure
                showToast(`Failed to copy ${type}. Please try manually.`, 'error');
            });
    };
    // ------------------------------------------------

    // DELETE LOGIC
    const handleConfirmDeletion = async () => {
        setIsDeleting(true);
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'passwords', password.id);
            await deleteDoc(docRef);
            showToast(`Credential for ${password.site} deleted successfully.`, 'success');
        } catch (error) {
            console.error("Error removing document: ", error);
            showToast("Failed to delete credential. Please check your connection.", 'error');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false); 
        }
    };

    return (
        <>
            {/* RENDER EDIT MODAL CONDITIONALLY */}
            {showEditModal && (
                <EditPasswordModal 
                    password={password}
                    // मॉडल बंद करने के लिए फंक्शन
                    onClose={() => setShowEditModal(false)} 
                />
            )}

            {showDeleteModal && (
                <DeleteConfirmationModal 
                    siteName={password.site}
                    onConfirm={handleConfirmDeletion}
                    onCancel={() => setShowDeleteModal(false)}
                    isLoading={isDeleting}
                />
            )}

            <div className="password-item" style={{ position: 'relative' }}>
                {/* 1st Column: Site Name (Strong tag is the first child of password-item) */}
                <strong>{password.site}</strong>
                
                {/* 2nd Column: Username and Strength (New Wrapper) */}
                <div className="password-info-group"> 
                    {/* UPDATED: handleCopy is used here */}
                    <span title={password.username} onClick={() => handleCopy(password.username, 'Username')} style={{cursor: 'pointer'}}>{password.username}</span>
                    <div className="strength-indicator" style={{ color: strength.color }}>
                        <div className="strength-dot" style={{ backgroundColor: strength.color }}></div>
                        {strength.text}
                    </div>
                </div>
                
                {/* 3rd Column: Actions */}
                <div className="password-actions">
                    {/* UPDATED: handleCopy is used here */}
                    <button title="Copy Password" className="action-btn" onClick={() => handleCopy(password.password, 'Password')}><FiCopy /></button>
                    <button title="Show/Hide Password" className="action-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                    {/* EDIT button अब मॉडल खोलता है */}
                    <button title="Edit" className="action-btn" onClick={() => setShowEditModal(true)}><FiEdit /></button>
                    <button title="Delete" className="action-btn delete" onClick={() => setShowDeleteModal(true)}><FiTrash2 /></button>
                </div>
                
                {/* Full Width Password Display (Row below the main grid, spans all columns) */}
                {showPassword && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', color: 'var(--accent-blue)', wordBreak: 'break-all' }}>
                        Password: {password.password}
                    </div>
                )}
            </div>
        </>
    );
}
