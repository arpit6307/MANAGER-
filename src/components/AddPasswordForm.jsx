import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, addDoc } from 'firebase/firestore';
import { generatePassword } from '../utils/helpers';
import { FiRefreshCw } from 'react-icons/fi';
import Select from 'react-select';

// react-select ke liye custom styles
const selectStyles = {
    control: (styles) => ({ ...styles, backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', boxShadow: 'none' }),
    menu: (styles) => ({ ...styles, backgroundColor: 'var(--bg-light)', border: '1px solid var(--border-color)' }),
    option: (styles, { isFocused, isSelected }) => ({ ...styles, backgroundColor: isSelected ? 'var(--accent-blue)' : isFocused ? 'var(--bg-dark)' : 'var(--bg-light)', color: isSelected ? 'var(--bg-dark)' : 'var(--text-primary)' }),
    singleValue: (styles) => ({ ...styles, color: 'var(--text-primary)' }),
};

export default function AddPasswordForm({ categories }) {
    const [site, setSite] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [category, setCategory] = useState(categories[0]); // Default to first category
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { currentUser } = useAuth();

    const handleGeneratePassword = () => {
        setPassword(generatePassword());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'passwords'), {
                site,
                username,
                password,
                category: category.value,
            });
            setSite('');
            setUsername('');
            setPassword('');
            setMessage('Credential added successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error: Could not add credential.');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            {message && <p className="message-box success">{message}</p>}
            <div className="form-group">
                <label className="form-label">Site / App Name</label>
                <input className="input-field" type="text" value={site} onChange={(e) => setSite(e.target.value)} required />
            </div>
            <div className="form-group">
                <label className="form-label">Username / Email</label>
                <input className="input-field" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-generator">
                    <input className="input-field" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" className="btn btn-primary btn-generate" onClick={handleGeneratePassword}>
                        <FiRefreshCw />
                    </button>
                </div>
            </div>
             <div className="form-group">
                <label className="form-label">Category</label>
                <Select
                    options={categories}
                    styles={selectStyles}
                    defaultValue={category}
                    onChange={setCategory}
                />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Credential'}
            </button>
        </form>
    );
}