// src/utils/helpers.js

// Function to calculate password strength
export const calculateStrength = (password) => {
    let score = 0;
    if (!password) return { text: '', color: '' };

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[\W_]/.test(password)) score++;

    if (score < 3) return { text: 'Weak', color: '#ff8c00' }; // Orange
    if (score < 5) return { text: 'Medium', color: '#00aaff' }; // Blue
    return { text: 'Strong', color: '#39ff14' }; // Neon Green
};

// Function to generate a secure password
export const generatePassword = (length = 14) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let newPassword = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        newPassword += charset.charAt(Math.floor(Math.random() * n));
    }
    return newPassword;
};

// --- NEW HELPER: FORMAT DATE ---
export const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Check if it's a Firestore Timestamp object
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};
