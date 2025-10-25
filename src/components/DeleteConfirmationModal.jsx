// src/components/DeleteConfirmationModal.jsx

import React from 'react';

export default function DeleteConfirmationModal({ siteName, onConfirm, onCancel, isLoading }) {
    return (
        <div className="modal-backdrop">
            <div className="modal-content card">
                <h3 className="card-title" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
                    Confirm Deletion
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Are you sure you want to permanently delete the credential for <strong>{siteName}</strong>?
                    This action cannot be undone.
                </p>
                <div className="modal-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-danger" 
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{ backgroundColor: 'var(--accent-orange)', color: 'var(--bg-dark)' }}
                    >
                        {isLoading ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                </div>
            </div>
        </div>
    );
}