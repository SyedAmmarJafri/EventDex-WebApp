import { Fragment, useState, useEffect, useCallback } from 'react'
import { FiDollarSign, FiLogOut, FiSettings, FiUser, FiX } from "react-icons/fi"
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import { BASE_URL } from '/src/constants.js';
import Modal from 'react-bootstrap/Modal';

const ProfileModal = () => {
    const navigate = useNavigate()
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [notification, setNotification] = useState(null)
    const [profilePicture, setProfilePicture] = useState('')
    
    // Timeout durations in milliseconds
    const ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
    
    // Get theme from localStorage
    const skinTheme = localStorage.getItem('skinTheme') || 'light'
    const isDarkMode = skinTheme === 'dark'

    // Track activity
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [loginTime] = useState(Date.now()); // Set when component mounts

    // Reset timers on user activity
    const resetInactivityTimer = useCallback(() => {
        setLastActivity(Date.now());
    }, []);

    const setupActivityListeners = useCallback(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            window.addEventListener(event, resetInactivityTimer);
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetInactivityTimer);
            });
        };
    }, [resetInactivityTimer]);

    useEffect(() => {
        const fetchProfilePicture = async () => {
            try {
                const authData = JSON.parse(localStorage.getItem('authData'))

                if (!authData?.token) {
                    throw new Error('No authentication token found')
                }

                const response = await fetch(`${BASE_URL}/api/client-admin/profile/picture`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authData.token}`,
                        'Content-Type': 'application/json'
                    }
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to fetch profile picture')
                }

                setProfilePicture(data.data)
            } catch (error) {
                console.error('Error fetching profile picture:', error)
            }
        }

        fetchProfilePicture()
        
        // Set up activity listeners
        const cleanupListeners = setupActivityListeners();
        
        // Set up timers
        const absoluteTimeout = setTimeout(() => {
            handleAutoLogout('Your session has expired after 24 hours');
        }, ABSOLUTE_TIMEOUT);

        const inactivityCheck = setInterval(() => {
            const currentTime = Date.now();
            if (currentTime - lastActivity > INACTIVITY_TIMEOUT) {
                handleAutoLogout('You have been logged out due to inactivity');
            }
        }, 60000); // Check every minute

        return () => {
            cleanupListeners();
            clearTimeout(absoluteTimeout);
            clearInterval(inactivityCheck);
        };
    }, [lastActivity, setupActivityListeners]);

    const handleAutoLogout = (message) => {
        showNotification(message, 'info');
        setTimeout(() => {
            handleLogout();
        }, 2000);
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

    const handleLogout = async () => {
        setIsConfirmModalOpen(false) // Close the modal first

        try {
            const authData = JSON.parse(localStorage.getItem('authData'))

            if (!authData?.token) {
                throw new Error('No authentication token found')
            }

            const response = await fetch(`${BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Logout failed')
            }

            localStorage.removeItem('authData')
            showNotification(data.message || 'Logged out successfully', 'success')

            setTimeout(() => {
                navigate('/authentication/login/cover')
                window.location.reload()
            }, 2000)

        } catch (error) {
            showNotification(error.message || 'Logout failed', 'error')
        }
    }

    const authData = JSON.parse(localStorage.getItem('authData')) || {}
    const { username = '', clientType = '', name = '', role = '', permissions = [] } = authData

    // Check if user has specific permission
    const hasPermission = (permission) => {
        if (role === 'CLIENT_ADMIN') return true;
        return permissions.includes(permission);
    }

    // Default avatar if profilePicture is not available
    const getAvatar = () => {
        if (profilePicture) {
            return profilePicture;
        }
        return "/images/avatar/1.png"; // Fallback to default avatar
    }

    return (
        <Fragment>
            <div className="dropdown nxl-h-item">
                <a href="#" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                    <img
                        src={getAvatar()}
                        alt="user-image"
                        className="img-fluid user-avtar me-0"
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    />                
                </a>
                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-user-dropdown">
                    <div className="dropdown-header">
                        <div className="d-flex align-items-center gap-3">
                            <img
                                src={getAvatar()}
                                alt={`${name}'s avatar`}
                                className="img-fluid user-avatar"
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            />
                            <div className="d-flex flex-column">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <h6 className="text-dark mb-0 fw-semibold">{name}</h6>
                                    <span className="badge bg-primary bg-opacity-10 text-light fs-11 fw-medium">
                                        {clientType}
                                    </span>
                                </div>
                                <span className="text-muted fs-12 mt-n1">{username}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Account Information - Show if CLIENT_ADMIN or has PROFILE_READ permission */}
                    {(role === 'CLIENT_ADMIN' || hasPermission('PROFILE_UPDATE')) && (
                        <a href="/account" className="dropdown-item">
                            <i><FiUser /></i>
                            <span>Account Information</span>
                        </a>
                    )}
                    
                    {/* Subscription & Plan - Only show for CLIENT_ADMIN */}
                    {role === 'CLIENT_ADMIN' && (
                        <a href="/account" className="dropdown-item">
                            <i><FiDollarSign /></i>
                            <span>Subscription & Plan</span>
                        </a>
                    )}
                    
                    {/* System Settings - Show if CLIENT_ADMIN or has TAX_WRITE or CURRENCY_READ permission */}
                    {(role === 'CLIENT_ADMIN' || hasPermission('TAX_READ') || hasPermission('CURRENCY_READ')) && (
                        <a href="/account" className="dropdown-item">
                            <i><FiSettings /></i>
                            <span>System Settings</span>
                        </a>
                    )}
                    
                    <a href="#" className="dropdown-item" onClick={() => setIsConfirmModalOpen(true)}>
                        <i><FiLogOut /></i>
                        <span>Logout</span>
                    </a>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                show={isConfirmModalOpen}
                onHide={() => setIsConfirmModalOpen(false)}
                centered
                className={isDarkMode ? 'dark-modal' : ''}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Logout Confirmation</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ textAlign: 'center' }}>
                    <h8 style={{ marginBottom: '30px', color: isDarkMode ? '#ffffff' : '#000000' }}>
                        Are you sure you want to logout?
                    </h8>
                </Modal.Body>
                <Modal.Footer style={{ justifyContent: 'center', gap: '16px' }}>
                    <Button
                        variant="contained"
                        onClick={() => setIsConfirmModalOpen(false)}
                        style={{
                            backgroundColor: isDarkMode ? '#495057' : '#6c757d',
                            color: 'white',
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleLogout}
                        style={{
                            backgroundColor: isDarkMode ? '#c62828' : '#d32f2f',
                            color: 'white',
                        }}
                    >
                        Logout
                    </Button>
                </Modal.Footer>
            </Modal>

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
                                          notification.type === 'error' ? '#dc3545' : '#17a2b8',
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

            {/* Add some CSS for the animation and dark mode */}
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

                /* Dark mode modal styles */
                .dark-modal .modal-content {
                    background-color: #0f172a;
                    color: white;
                }

                .dark-modal .modal-header,
                .dark-modal .modal-footer {
                    border-color: #1e293b;
                }

                .dark-modal .close {
                    color: white;
                }
                `}
            </style>
        </Fragment>
    )
}

export default ProfileModal