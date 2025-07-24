import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '/src/constants.js';


const ResetForm = ({ path }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [passwordStrength, setPasswordStrength] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Get email and OTP from localStorage when component mounts
        const savedEmail = localStorage.getItem('resetEmail');
        const savedOtp = localStorage.getItem('verifiedOtp');

        if (savedEmail) setEmail(savedEmail);
        if (savedOtp) setOtp(savedOtp);
    }, []);

    useEffect(() => {
        // Check password strength whenever newPassword changes
        if (newPassword.length === 0) {
            setPasswordStrength('');
        } else if (newPassword.length < 8) {
            setPasswordStrength('Weak');
        } else if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            setPasswordStrength('Medium');
        } else {
            setPasswordStrength('Strong');
        }
    }, [newPassword]);

    const handleTryAgain = () => {
        // Clear local storage when Try Again is clicked
        localStorage.removeItem('resetEmail');
        localStorage.removeItem('verifiedOtp');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        // Validate password strength
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/auth/password-reset/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    otp: otp,
                    newPassword: newPassword
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Password reset failed');
            }

            setMessage(data.message || 'Password changed successfully!');

            // Clear local storage
            localStorage.removeItem('resetEmail');
            localStorage.removeItem('verifiedOtp');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/authentication/login/cover');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 'Weak': return 'text-danger';
            case 'Medium': return 'text-warning';
            case 'Strong': return 'text-success';
            default: return 'text-muted';
        }
    };

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Change Password</h2>
            <h4 className="fs-13 fw-bold mb-2">Set your new password</h4>
            <p className="fs-12 fw-medium text-muted">
                Enter and confirm your new password below.
            </p>

            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                <div className="mb-3">
                    <label className="form-label fs-12">New Password</label>
                    <input
                        className="form-control"
                        placeholder="New Password"
                        required
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                    />
                    <div className={`fs-11 mt-1 ${getPasswordStrengthColor()}`}>
                        {passwordStrength && (
                            <>
                                Password Strength: <span className="fw-bold">{passwordStrength}</span>
                                {passwordStrength === 'Weak' && ' (At least 8 characters)'}
                                {passwordStrength === 'Medium' && ' (Add uppercase, numbers, or symbols)'}
                                {passwordStrength === 'Strong' && ' (Great password!)'}
                            </>
                        )}
                        {!passwordStrength && 'Password must be at least 8 characters long'}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="form-label fs-12">Confirm Password</label>
                    <input
                        className="form-control"
                        placeholder="Confirm Password"
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                {message && (
                    <div className="alert alert-success fs-12 mb-3">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger fs-12 mb-3">
                        {error}
                    </div>
                )}

                <div className="mt-5">
                    <button
                        type="submit"
                        className="btn btn-lg btn-primary w-100 position-relative"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span 
                                    className="spinner-border spinner-border-sm me-2" 
                                    role="status" 
                                    aria-hidden="true"
                                ></span>
                                Updating...
                            </>
                        ) : 'Change Password'}
                    </button>
                </div>
            </form>
            <div className="mt-5 text-muted">
                <span>Failed to change password?</span>
                <Link 
                    to="/authentication/reset/cover" 
                    className="fw-bold ms-1"
                    onClick={handleTryAgain}
                >
                    Try Again
                </Link>
            </div>
        </>
    );
};

export default ResetForm;