import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { BASE_URL } from '/src/constants.js';

const LoginForm = ({ registerPath, resetPath }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState('admin'); // 'admin' or 'team'
    const navigate = useNavigate();

    // Check for saved credentials on component mount
    useEffect(() => {
        const savedCredentials = localStorage.getItem("savedCredentials");
        if (savedCredentials) {
            const { username: savedUsername, password: savedPassword, loginType: savedLoginType } = JSON.parse(savedCredentials);
            setFormData({
                username: savedUsername,
                password: savedPassword
            });
            setRememberMe(true);
            if (savedLoginType) {
                setLoginType(savedLoginType);
            }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRememberMeChange = (e) => {
        setRememberMe(e.target.checked);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleLoginType = () => {
        setLoginType(loginType === 'admin' ? 'team' : 'admin');
    };

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 2000);
    };

    const closeNotification = () => {
        setNotification(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            showNotification('Please enter both username and password', 'error');
            return;
        }

        setLoading(true);
        setNotification(null);

        try {
            const endpoint = loginType === 'admin'
                ? `${BASE_URL}/api/auth/client-admin/login`
                : `${BASE_URL}/api/auth/staff/login`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (loginType === 'admin') {
                const authData = {
                    token: data.token,
                    role: data.role,
                    username: data.username,
                    clientId: data.clientId,
                    clientType: data.clientType,
                    name: data.name,
                    email: data.email,
                    contactNumber: data.contactNumber,
                    address: data.address,
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    businessDetails: {
                        businessName: data.businessDetails?.businessName
                    },
                    profilePicture: data.profilePicture,
                    subscriptionStartDate: data.subscriptionStartDate,
                    subscriptionEndDate: data.subscriptionEndDate,
                    subscriptionPlan: {
                        id: data.subscriptionPlan?.id,
                        name: data.subscriptionPlan?.name,
                        description: data.subscriptionPlan?.description,
                        monthlyPrice: data.subscriptionPlan?.monthlyPrice,
                        yearlyPrice: data.subscriptionPlan?.yearlyPrice,
                        features: data.subscriptionPlan?.features,
                        clientTypes: data.subscriptionPlan?.clientTypes,
                        active: data.subscriptionPlan?.active
                    },
                    currencySettings: {
                        currency: data.currencySettings?.currency,
                        currencySymbol: data.currencySettings?.currencySymbol,
                        currencyCode: data.currencySettings?.currencyCode
                    },
                    taxDetails: {
                        gstRate: data.taxDetails?.gstRate,
                        sstRate: data.taxDetails?.sstRate,
                        gstEnabled: data.taxDetails?.gstEnabled,
                        sstEnabled: data.taxDetails?.sstEnabled,
                        discountRate: data.taxDetails?.discountRate,
                        discountEnabled: data.taxDetails?.discountEnabled
                    }
                };
                localStorage.setItem("authData", JSON.stringify(authData));
            } else {
                // Updated Team login - save the specific fields
                const teamAuthData = {
                    token: data.token,
                    role: data.role,
                    username: data.username,
                    clientId: data.clientId,
                    userId: data.userId,
                    clientType: data.clientType,
                    name: data.name,
                    email: data.email,
                    contactNumber: data.contactNumber,
                    profilePicture: data.profilePicture,
                    permissions: data.permissions || [],
                    tabPermissions: data.tabPermissions || {},
                    currencySettings: {
                        currency: data.currencySettings?.currency,
                        currencySymbol: data.currencySettings?.currencySymbol,
                        currencyCode: data.currencySettings?.currencyCode
                    },
                    taxDetails: {
                        gstRate: data.taxDetails?.gstRate,
                        sstRate: data.taxDetails?.sstRate,
                        gstEnabled: data.taxDetails?.gstEnabled,
                        sstEnabled: data.taxDetails?.sstEnabled,
                        discountRate: data.taxDetails?.discountRate,
                        discountEnabled: data.taxDetails?.discountEnabled
                    }
                };
                localStorage.setItem("authData", JSON.stringify(teamAuthData));
            }

            // Handle remember me functionality
            if (rememberMe) {
                localStorage.setItem("savedCredentials", JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    loginType: loginType
                }));
            } else {
                localStorage.removeItem("savedCredentials");
            }

            showNotification('Login successful! Redirecting...', 'success');

            // Redirect after showing notification
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            showNotification(err.message || 'An error occurred during login', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Login type toggle */}
            <div className="d-flex justify-content-center mb-4">
                <div className="btn-group" role="group">
                    <button
                        type="button"
                        className={`btn ${loginType === 'admin' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={toggleLoginType}
                    >
                        Admin Login
                    </button>
                    <button
                        type="button"
                        className={`btn ${loginType === 'team' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={toggleLoginType}
                    >
                        Team Login
                    </button>
                </div>
            </div>
            <h2 className="fs-20 fw-bolder mb-4">Login</h2>
            <h4 className="fs-13 fw-bold mb-2">Login to your account</h4>

            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <input
                        type="text"
                        className="form-control"
                        name="username"
                        placeholder="Email or Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="mb-3 position-relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6c757d'
                        }}
                    >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="custom-control custom-checkbox">
                            <input
                                type="checkbox"
                                className="custom-control-input"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={handleRememberMeChange}
                            />
                            <label className="custom-control-label c-pointer" htmlFor="rememberMe">Remember Me</label>
                        </div>
                    </div>
                    {loginType === 'admin' && (
                        <div>
                            <Link to={resetPath} className="fs-11 text-primary">Forget password?</Link>
                        </div>
                    )}
                </div>
                <div className="mt-5">
                    <button
                        type="submit"
                        className="btn btn-lg btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </div>
            </form>
            {/* Notification Popup */}
            {notification && (
                <div className={`notification-popup ${notification.type}`}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '15px 30px',
                        borderRadius: '5px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: '300px',
                        maxWidth: '90%',
                        zIndex: 1000,
                        backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        animation: 'slideIn 0.3s ease-out'
                    }}
                >
                    <span>{notification.message}</span>
                    <button
                        onClick={closeNotification}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            marginLeft: '15px',
                            fontSize: '16px'
                        }}
                    >
                        <FiX />
                    </button>
                </div>
            )}

            {/* Add some CSS for the animation */}
            <style>
                {`
                @keyframes slideIn {
                    from {
                        transform: translateX(-50%) translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                `}
            </style>
        </>
    );
};

export default LoginForm;