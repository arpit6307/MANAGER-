import React from 'react';
import PasswordItem from './PasswordItem';

export default function PasswordList({ passwords }) {
    if (passwords.length === 0) {
        return <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No credentials found. Add one to get started!</p>;
    }

    return (
        <div>
            {passwords.map(pw => (
                <PasswordItem key={pw.id} password={pw} />
            ))}
        </div>
    );
}