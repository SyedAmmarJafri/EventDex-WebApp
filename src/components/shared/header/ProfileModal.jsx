import { Fragment, useState } from 'react'
import { FiBell, FiDollarSign, FiLogOut, FiSettings, FiUser, FiX } from "react-icons/fi"
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import { BASE_URL } from '/src/paths.js';
import Modal from 'react-bootstrap/Modal';

const ProfileModal = () => {
    const navigate = useNavigate()
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [notification, setNotification] = useState(null)

    // Get theme from localStorage
    const skinTheme = localStorage.getItem('skinTheme') || 'light'
    const isDarkMode = skinTheme === 'dark'

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
    const { username = '', clientType = '', name = '', profilePicture = '' } = authData

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
                            width: '40px',
                            height: '40px',
                            borderRadius: '4px',
                            objectFit: 'cover'
                        }}
                    />                </a>
                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-user-dropdown">
                    <div className="dropdown-header">
                        <div className="d-flex align-items-center">
                            <img
                                src={getAvatar()}
                                alt="user-image"
                                className="img-fluid user-avtar"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '4px',
                                    objectFit: 'cover'
                                }}
                            />
                            <div>
                                <h6 className="text-dark mb-0">{name}<span className="badge bg-soft-success text-success ms-1">{clientType}</span></h6>
                                <span className="fs-12 fw-medium text-muted">{username}</span>
                            </div>
                        </div>
                    </div>
                    <a href="/account" className="dropdown-item">
                        <i><FiUser /></i>
                        <span>Account Information</span>
                    </a>
                    <a href="/account" className="dropdown-item">
                        <i><FiDollarSign /></i>
                        <span>Subscription & Plan</span>
                    </a>
                    <a href="/account" className="dropdown-item">
                        <i><FiSettings /></i>
                        <span>System Settings</span>
                    </a>
                    <div className="dropdown-divider"></div>
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