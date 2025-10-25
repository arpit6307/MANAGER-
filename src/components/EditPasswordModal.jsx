import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { FiEye, FiEyeOff, FiSave, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { generatePassword } from '../utils/helpers'; 

export default function EditPasswordModal({ password, onClose }) {
    const { currentUser } = useAuth();
    // Editing के लिए लोकल स्टेट में डेटा कॉपी करें
    const [editData, setEditData] = useState({ ...password });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleGeneratePassword = () => {
        setEditData(prev => ({ ...prev, password: generatePassword() }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const docRef = doc(db, 'users', currentUser.uid, 'passwords', password.id);
            await updateDoc(docRef, {
                site: editData.site,
                username: editData.username,
                password: editData.password, 
            });
            setMessage('Credential updated successfully!');
            
            // 1 सेकंड बाद मॉडल बंद करें 
            setTimeout(onClose, 1000); 

        } catch (err) {
            setError('Failed to update credential. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content card" style={{ maxWidth: '550px' }}>
                <h3 className="card-title" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
                    Edit Credential for <span style={{color: 'var(--accent-blue)'}}>{password.site}</span>
                </h3>

                {message && <p className="message-box success">{message}</p>}
                {error && <p className="message-box error">{error}</p>}

                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label className="form-label">Site / App Name</label>
                        <input
                            type="text"
                            className="input-field"
                            value={editData.site}
                            onChange={(e) => setEditData({...editData, site: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Username / Email</label>
                        <input
                            type="text"
                            className="input-field"
                            value={editData.username}
                            onChange={(e) => setEditData({...editData, username: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="password-generator">
                            <div className="password-input-wrapper" style={{width: '100%'}}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field password-field"
                                    value={editData.password}
                                    onChange={(e) => setEditData({...editData, password: e.target.value})}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="password-toggle-btn" 
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                            <button 
                                type="button" 
                                className="btn btn-primary btn-generate" 
                                onClick={handleGeneratePassword}
                                title="Generate New Password"
                                style={{backgroundColor: 'var(--accent-orange)'}} 
                            >
                                <FiRefreshCw />
                            </button>
                        </div>
                    </div>
                    
                    <div className="modal-actions" style={{marginTop: '2rem'}}>
                        <button 
                            type="button"
                            className="btn btn-secondary" 
                            onClick={onClose}
                            disabled={loading}
                        >
                            <FiXCircle style={{marginRight: '0.5rem'}}/> Cancel
                        </button>
                        <button 
                            type="submit"
                            className="btn btn-primary" 
                            disabled={loading}
                        >
                            <FiSave style={{marginRight: '0.5rem'}}/> {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
