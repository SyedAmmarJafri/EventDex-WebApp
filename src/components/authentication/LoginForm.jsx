import { useState, useEffect } from 'react';
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

    // Custom danger color
    const customDangerColor = '#af0000ff';

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
        }, 1000);
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
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
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

            if (!data.success) {
                throw new Error(data.message || 'Login failed');
            }

            // Handle both admin and team logins with the new response structure
            const authData = {
                token: data.data.token,
                role: data.data.role,
                username: data.data.username,
                email: data.data.email,
                id: data.data.id,
                domainId: data.data.domainId,
                domainName: data.data.domainName,
                type: data.data.type
            };

            localStorage.setItem("authData", JSON.stringify(authData));

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
            }, 1000);
        } catch (err) {
            showNotification(err.message || 'An error occurred during login', 'primary');
        } finally {
            setLoading(false);
        }
    };

    // Custom button styles
    const getButtonStyle = (isActive) => ({
        backgroundColor: isActive ? customDangerColor : 'transparent',
        color: isActive ? 'white' : customDangerColor,
        border: `1px solid ${customDangerColor}`,
        padding: '8px 16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    });

    const getLoginButtonStyle = {
        backgroundColor: customDangerColor,
        color: 'white',
        border: 'none',
        padding: '12px',
        width: '100%',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold'
    };

    return (
        <>
            {/* Login type toggle */}
            <div className="d-flex justify-content-center mb-4">
                <div className="btn-group" role="group">
                    <button
                        type="button"
                        style={getButtonStyle(loginType === 'admin')}
                        onClick={toggleLoginType}
                    >
                        ADMIN LOGIN
                    </button>
                    <button
                        type="button"
                        style={getButtonStyle(loginType === 'team')}
                        onClick={toggleLoginType}
                    >
                        TEAM LOGIN
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
                        style={{
                            border: '1px solid #ced4da',
                            padding: '10px',
                            width: '100%'
                        }}
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
                        style={{
                            border: '1px solid #ced4da',
                            padding: '10px',
                            width: '100%',
                            paddingRight: '40px'
                        }}
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
                </div>
                <div className="mt-5">
                    <button
                        type="submit"
                        style={getLoginButtonStyle}
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
                        backgroundColor: notification.type === 'success' ? '#28a745' :
                            notification.type === 'error' ? customDangerColor : '#007bff',
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
                
                .btn-group button:first-child {
                    border-right: none;
                }
                
                .btn-group button:last-child {
                    border-left: none;
                }
                
                .btn-group button:hover {
                    background-color: ${customDangerColor} !important;
                    color: white !important;
                }
                
                .custom-control-input:checked {
                    background-color: ${customDangerColor};
                    border-color: ${customDangerColor};
                }
                
                .custom-control-input:focus {
                    border-color: ${customDangerColor};
                    box-shadow: 0 0 0 0.2rem rgba(175, 0, 0, 0.25);
                }
                `}
            </style>
        </>
    );
};

export default LoginForm;