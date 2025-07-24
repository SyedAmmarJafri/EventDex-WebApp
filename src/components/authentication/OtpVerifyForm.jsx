import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '/src/constants.js';

const OtpVerifyForm = () => {
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Get email from localStorage when component mounts
        const savedEmail = localStorage.getItem('resetEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);

    const handleOtpChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(value)) return; // Only allow numbers
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus to next input
        if (value && index < 4) {
            document.getElementById(`otp-input-${index + 1}`).focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        const otpCode = otp.join('');
        if (otpCode.length !== 5) {
            setError('Please enter a complete 5-digit OTP');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/auth/password-reset/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    otp: otpCode
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }

            setMessage(data.message || 'OTP verified successfully!');
            
            // Save OTP to localStorage
            localStorage.setItem('verifiedOtp', otpCode);
            
            // Redirect to password change page
            navigate('/authentication/ChangeForm/cover');
        } catch (err) {
            setError(err.message || 'Failed to verify OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const maskedEmail = email ? email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + b.replace(/./g, '*')) : '';

    return (
        <>
            <h4 className="fs-13 fw-bold mb-2">Please enter the code generated one time password to verify your account.</h4>
            <p className="fs-12 fw-medium text-muted">
                <span>A code has been sent to</span> <strong>{maskedEmail || '*******9897'}</strong>
            </p>
            
            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                <div id="otp" className="inputs d-flex flex-row justify-content-center mt-2">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            id={`otp-input-${index}`}
                            className="m-2 text-center form-control rounded"
                            type="text"
                            value={digit}
                            maxLength={1}
                            required
                            onChange={(e) => handleOtpChange(e, index)}
                            onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !digit && index > 0) {
                                    document.getElementById(`otp-input-${index - 1}`).focus();
                                }
                            }}
                        />
                    ))}
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
                                Verifying...
                            </>
                        ) : 'Validate'}
                    </button>
                </div>
                
                <div className="mt-5 text-muted">
                    <span>Didn't get the code?</span>
                    <a href="/authentication/reset/cover"> Resend</a>
                </div>
            </form>
        </>
    );
};

export default OtpVerifyForm;