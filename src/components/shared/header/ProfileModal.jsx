import { Fragment, useState, useEffect, useCallback } from 'react'
import { FiLogOut, FiX } from "react-icons/fi"
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import { BASE_URL } from '/src/constants.js';
import Modal from 'react-bootstrap/Modal';

const ProfileModal = () => {
    const navigate = useNavigate()
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [notification, setNotification] = useState(null)

    // Timeout durations
    const ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

    // Theme settings
    const skinTheme = localStorage.getItem('skinTheme') || 'light'
    const isDarkMode = skinTheme === 'dark'

    // Activity tracking
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Reset timers on activity
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
        // Set up activity listeners
        const cleanupListeners = setupActivityListeners();

        // Set up timers
        const absoluteTimeout = setTimeout(() => {
            handleAutoLogout('Your session has expired after 24 hours');
        }, ABSOLUTE_TIMEOUT);

        const inactivityCheck = setInterval(() => {
            if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
                handleAutoLogout('You have been logged out due to inactivity');
            }
        }, 60000);

        return () => {
            cleanupListeners();
            clearTimeout(absoluteTimeout);
            clearInterval(inactivityCheck);
        };
    }, [lastActivity, setupActivityListeners]);

    const handleAutoLogout = (message) => {
        showNotification(message, 'info');
        setTimeout(handleLogout, 1000);
    };

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 1000);
    };

    const closeNotification = () => setNotification(null);

    const handleLogout = async () => {
        setIsConfirmModalOpen(false)

        try {
            const authData = JSON.parse(localStorage.getItem('authData'))
            if (!authData?.token) throw new Error('No authentication token found')

            const response = await fetch(`${BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.message || 'Logout failed')

            // Remove auth data from localStorage on logout
            localStorage.removeItem('authData')
            showNotification(data.message || 'Logged out successfully', 'success')

            setTimeout(() => {
                navigate('/login')
                window.location.reload()
            }, 1000)

        } catch (error) {
            showNotification(error.message || 'Logout failed', 'primary')
        }
    }

    const authData = JSON.parse(localStorage.getItem('authData')) || {}
    const { username = '', email = '', name = '', role = '', permissions = [] } = authData

    const hasPermission = (permission) => {
        if (role === 'PATRON') return true;
        return permissions.includes(permission);
    }

    const getAvatar = () => {
        return "/images/avatar/undefined-profile.png";
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
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #6b7280'
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
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid #6b7280'
                                }}
                            />
                            <div className="d-flex flex-column">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <h6 className="text-dark mb-0 fw-semibold">{username}</h6>
                                    <span className="badge bg-danger bg-opacity-10 text-light fs-11 fw-medium">
                                        {role}
                                    </span>
                                </div>
                                <span className="text-muted fs-12 mt-n1">{email}</span>
                            </div>
                        </div>
                    </div>

                    <a
                        className="dropdown-item"
                        style={{ cursor: "pointer" }}
                        onClick={() => setIsConfirmModalOpen(true)}
                    >
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

            <style>
                {`
                @keyframes slideIn {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .dark-modal .modal-content { background-color: #0f172a; color: white; }
                .dark-modal .modal-header, .dark-modal .modal-footer { border-color: #1e293b; }
                .dark-modal .close { color: white; }
                `}
            </style>
        </Fragment>
    )
}

export default ProfileModal