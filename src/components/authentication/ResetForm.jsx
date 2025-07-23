import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '/src/paths.js';

const ResetForm = ({ path }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch(`${BASE_URL}/api/auth/password-reset/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setMessage(data.message || 'Reset link sent successfully!');

            // Save email to localStorage
            localStorage.setItem('resetEmail', email);

            // Redirect to verification page
            navigate('/authentication/verify/cover');
        } catch (err) {
            setError(err.message || 'Failed to send reset request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Reset</h2>
            <h4 className="fs-13 fw-bold mb-2">Reset your password</h4>
            <p className="fs-12 fw-medium text-muted">
                Enter your email and a reset link will be sent to you. Let's access the best recommendations for you.
            </p>

            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <input
                        className="form-control"
                        placeholder="Email"
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                                Sending...
                            </>
                        ) : 'Reset Now'}
                    </button>
                </div>
            </form>
            <div className="mt-5 text-muted">
                <span>Back to login?</span>
                <Link
                    to="/authentication/login/cover"
                    className="fw-bold ms-1"
                >
                    Login
                </Link>
            </div>
        </>
    );
};

export default ResetForm;