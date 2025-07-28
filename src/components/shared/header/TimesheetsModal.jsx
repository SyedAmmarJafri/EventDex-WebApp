import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiClock, FiRefreshCw, FiVolume2, FiVolumeX, FiEye, FiWifi, FiWifiOff } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { BASE_URL } from '/src/constants.js';

// Debug logging helper
const debugLog = (message, data = null) => {
    console.log(`[TimesheetsModal] ${message}`, data || '');
};

// Error logging helper
const errorLog = (message, error = null) => {
    console.error(`[TimesheetsModal ERROR] ${message}`, error || '');
};

// Get currency settings from localStorage
const authData = JSON.parse(localStorage.getItem("authData"));
const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

window.global ||= window;

const TimesheetsModal = () => {
    // State management
    const [allOrders, setAllOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsError, setWsError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [isMuted, setIsMuted] = useState(() => {
        try {
            const savedValue = localStorage.getItem('notificationsMuted');
            return savedValue !== null ? JSON.parse(savedValue) : false;
        } catch (e) {
            errorLog('Error reading muted state from localStorage', e);
            return false;
        }
    });
    const [hasInteracted, setHasInteracted] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [componentError, setComponentError] = useState(null);

    // Refs for cleanup and connection management
    const audioRef = useRef(null);
    const stompClientRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isUnmountedRef = useRef(false);

    // WebSocket configuration
    const WS_CONFIG = {
        maxReconnectAttempts: 3,
        reconnectDelay: 5000,
        connectionTimeout: 15000,
    };

    // Filter orders to only show pending ones
    const filterPendingOrders = useCallback((orders) => {
        return orders.filter(order => order.status === 'PENDING');
    }, []);

    // Update pending orders whenever allOrders changes
    useEffect(() => {
        setPendingOrders(filterPendingOrders(allOrders));
    }, [allOrders, filterPendingOrders]);

    // Component error handler
    const handleComponentError = useCallback((error, context = '') => {
        errorLog(`Component error in ${context}`, error);
        setComponentError(`Error in ${context}: ${error.message}`);
    }, []);

    // Get client ID from auth data
    const getClientId = useCallback(() => {
        try {
            const authData = localStorage.getItem('authData');
            if (authData) {
                const parsedData = JSON.parse(authData);
                const clientId = parsedData.clientId || parsedData.id || parsedData.userId;
                debugLog('Client ID retrieved', clientId);
                return clientId;
            }
            debugLog('No auth data found, using fallback client ID');
        } catch (error) {
            errorLog('Error getting client ID', error);
        }
        return "686faaeda2c5d3eee0137da1"; // Fallback client ID
    }, []);

    // Get auth token
    const getAuthToken = useCallback(() => {
        try {
            const authData = localStorage.getItem('authData');
            if (authData) {
                const parsedData = JSON.parse(authData);
                return parsedData.token;
            }
        } catch (error) {
            errorLog('Error getting auth token', error);
        }
        return null;
    }, []);

    // Fallback API call
    const fetchPendingOrdersAPI = useCallback(async () => {
        try {
            debugLog('Fetching pending orders via API');
            setLoading(true);
            setError(null);

            const token = getAuthToken();

            if (!token) {
                debugLog('No authentication token found, using mock data');
                const mockOrders = [
                    {
                        id: 'mock-1',
                        orderNumber: 'DEMO-001',
                        customerName: 'Demo Customer',
                        customerContact: '+1234567890',
                        totalAmount: 25.99,
                        status: 'PENDING',
                        createdAt: new Date().toISOString(),
                        items: [
                            { name: 'Demo Item 1', price: 15.99, quantity: 1, itemTotal: 15.99 },
                            { name: 'Demo Item 2', price: 10.00, quantity: 1, itemTotal: 10.00 }
                        ]
                    }
                ];
                setAllOrders(mockOrders);
                setLoading(false);
                return mockOrders;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/orders/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch pending orders`);
            }

            const data = await response.json();
            const orders = data.data || [];

            debugLog('API orders fetched', orders);

            setAllOrders(orders);
            setError(null);
            return orders;
        } catch (err) {
            errorLog('Error fetching pending orders', err);
            setError(err.message);
            setAllOrders([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [getAuthToken]);

    // Simplified WebSocket connection with dynamic imports
    const connectWebSocket = useCallback(async () => {
        if (isUnmountedRef.current) {
            debugLog('Component unmounted, skipping WebSocket connection');
            return;
        }

        const clientId = getClientId();
        if (!clientId) {
            debugLog('No client ID available, falling back to API');
            fetchPendingOrdersAPI();
            return;
        }

        // Clear any existing connection first
        disconnectWebSocket();

        try {
            debugLog('Attempting WebSocket connection', `${BASE_URL}/ws`);
            setWsError(null);
            setLoading(true);

            // Dynamically import SockJS and Stomp
            const SockJS = (await import('sockjs-client')).default;
            const Stomp = (await import('stompjs')).default;

            const socket = new SockJS(`${BASE_URL}/ws`);
            const stompClient = Stomp.over(socket);

            // Enable debug for troubleshooting
            stompClient.debug = (str) => {
                debugLog('STOMP Debug', str);
            };

            // Connection timeout
            const connectionTimeout = setTimeout(() => {
                if (stompClient && !stompClient.connected) {
                    debugLog('WebSocket connection timeout');
                    try {
                        stompClient.disconnect();
                    } catch (e) {
                        errorLog('Error disconnecting on timeout', e);
                    }
                    setWsError('Connection timeout');
                    fetchPendingOrdersAPI();
                }
            }, WS_CONFIG.connectionTimeout);

            // Connect to WebSocket
            stompClient.connect(
                {}, // headers
                (frame) => {
                    try {
                        clearTimeout(connectionTimeout);
                        if (isUnmountedRef.current) {
                            debugLog('Component unmounted during connection, disconnecting');
                            stompClient.disconnect();
                            return;
                        }

                        debugLog('✅ Connected to WebSocket', frame);
                        setWsConnected(true);
                        setWsError(null);
                        setReconnectAttempts(0);
                        setLoading(false);

                        // Subscribe to orders topic
                        const subscription = stompClient.subscribe(
                            `/topic/orders/${clientId}`,
                            (message) => {
                                try {
                                    const orderData = JSON.parse(message.body);
                                    debugLog('📥 New order received via WebSocket', orderData);

                                    setAllOrders(prevOrders => {
                                        const existingIndex = prevOrders.findIndex(
                                            order => order.id === orderData.id || order.orderNumber === orderData.orderNumber
                                        );

                                        if (existingIndex >= 0) {
                                            // Update existing order
                                            const updatedOrders = [...prevOrders];
                                            updatedOrders[existingIndex] = orderData;
                                            debugLog('Updated existing order', orderData);
                                            return updatedOrders;
                                        } else {
                                            // Add new order at the beginning
                                            debugLog('Added new order', orderData);
                                            return [orderData, ...prevOrders];
                                        }
                                    });
                                } catch (parseError) {
                                    errorLog('Error parsing WebSocket message', parseError);
                                }
                            }
                        );

                        stompClientRef.current = stompClient;
                        debugLog('WebSocket setup completed successfully');
                    } catch (connectionError) {
                        errorLog('Error in connection success handler', connectionError);
                        handleComponentError(connectionError, 'WebSocket connection handler');
                    }
                },
                (error) => {
                    try {
                        clearTimeout(connectionTimeout);
                        errorLog('❌ WebSocket connection error', error);

                        setWsConnected(false);
                        setWsError(error?.toString() || 'Connection failed');
                        setLoading(false);

                        if (reconnectAttempts < WS_CONFIG.maxReconnectAttempts) {
                            const newAttempts = reconnectAttempts + 1;
                            setReconnectAttempts(newAttempts);
                            debugLog(`Attempting to reconnect (${newAttempts}/${WS_CONFIG.maxReconnectAttempts})...`);

                            reconnectTimeoutRef.current = setTimeout(() => {
                                if (!isUnmountedRef.current) {
                                    connectWebSocket();
                                }
                            }, WS_CONFIG.reconnectDelay);
                        } else {
                            debugLog('Max reconnection attempts reached, falling back to API polling');
                            fetchPendingOrdersAPI();
                        }
                    } catch (errorHandlerError) {
                        errorLog('Error in error handler', errorHandlerError);
                        handleComponentError(errorHandlerError, 'WebSocket error handler');
                        fetchPendingOrdersAPI();
                    }
                }
            );

        } catch (error) {
            errorLog('Error creating WebSocket connection', error);
            setWsError(error?.toString() || 'Setup failed');
            setWsConnected(false);
            setLoading(false);
            handleComponentError(error, 'WebSocket setup');
            fetchPendingOrdersAPI();
        }
    }, [getClientId, reconnectAttempts, fetchPendingOrdersAPI, handleComponentError]);

    // Disconnect WebSocket
    const disconnectWebSocket = useCallback(() => {
        try {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (stompClientRef.current && stompClientRef.current.connected) {
                debugLog('Disconnecting WebSocket...');
                stompClientRef.current.disconnect();
                stompClientRef.current = null;
            }

            setWsConnected(false);
        } catch (error) {
            errorLog('Error disconnecting WebSocket', error);
        }
    }, []);

    // Initialize connection on mount
    useEffect(() => {
        debugLog('Component mounting, initializing connection');
        isUnmountedRef.current = false;
        setComponentError(null);

        // Start with API call first, then try WebSocket
        fetchPendingOrdersAPI().then(() => {
            debugLog('Initial API call completed, attempting WebSocket connection');
            // Small delay to ensure API data is loaded first
            setTimeout(() => {
                if (!isUnmountedRef.current) {
                    connectWebSocket();
                }
            }, 1000);
        }).catch((error) => {
            errorLog('Initial API call failed', error);
            handleComponentError(error, 'Initial API call');
        });

        return () => {
            debugLog('Component unmounting, cleaning up connections');
            isUnmountedRef.current = true;
            disconnectWebSocket();
        };
    }, []);

    // Handle user interaction for audio
    useEffect(() => {
        const handleInteraction = () => {
            debugLog('User interaction detected, enabling audio');
            setHasInteracted(true);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    // Handle audio notifications
    useEffect(() => {
        try {
            if (audioRef.current) {
                audioRef.current.loop = true;
                audioRef.current.muted = isMuted;

                if (pendingOrders.length > 0 && !isMuted && hasInteracted) {
                    const playPromise = audioRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            debugLog("Audio autoplay was prevented:", error);
                        });
                    }
                } else {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }
        } catch (error) {
            errorLog('Error handling audio notifications', error);
        }
    }, [pendingOrders, isMuted, hasInteracted]);

    // Handle order actions
    const handleOrderAction = async (orderId, action) => {
        try {
            debugLog(`Performing ${action} on order ${orderId}`);
            const token = getAuthToken();

            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/orders/${orderId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} order: HTTP ${response.status}`);
            }

            setAllOrders(prevOrders =>
                prevOrders.filter(order => order.id !== orderId)
            );

            debugLog(`Order ${action} successful`);

            if (!wsConnected) {
                fetchPendingOrdersAPI();
            }

        } catch (err) {
            errorLog(`Error ${action}ing order`, err);
            setError(err.message);
        }
    };

    // Manual refresh
    const handleManualRefresh = () => {
        debugLog('Manual refresh triggered');
        if (wsConnected) {
            disconnectWebSocket();
            setTimeout(() => connectWebSocket(), 1000);
        } else {
            fetchPendingOrdersAPI();
        }
    };

    // Toggle mute
    const toggleMute = (e) => {
        try {
            e.stopPropagation();
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            localStorage.setItem('notificationsMuted', JSON.stringify(newMutedState));
            debugLog('Mute state toggled', newMutedState);
        } catch (error) {
            errorLog('Error toggling mute state', error);
        }
    };

    // View order details
    const handleViewDetails = (order) => {
        debugLog('Viewing order details', order.id);
        setSelectedOrder(order);
        setShowOrderModal(true);
    };

    const handleCloseModal = () => {
        debugLog('Closing order modal');
        setShowOrderModal(false);
        setSelectedOrder(null);
    };

    // Component error display
    if (componentError) {
        return (
            <div className="dropdown nxl-h-item">
                <div className="nxl-head-link me-0" data-bs-toggle="dropdown" role="button">
                    <FiClock size={20} />
                    <span className="badge bg-danger nxl-h-badge">!</span>
                </div>
                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown">
                    <div className="alert alert-danger mx-3 my-2">
                        <h5>Component Error</h5>
                        <p>{componentError}</p>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                                setComponentError(null);
                                window.location.reload();
                            }}
                        >
                            Reload
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    try {
        return (
            <div className="dropdown nxl-h-item">
                <audio
                    ref={audioRef}
                    src="/music/mixkit-bell-tick-tock-timer-1046.mp3"
                    loop
                    preload="metadata"
                />

                <div className="nxl-head-link me-0" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                    <FiClock size={20} />
                    {pendingOrders.length > 0 && (
                        <span className="badge bg-success nxl-h-badge">{pendingOrders.length}</span>
                    )}
                </div>

                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-timesheets-menu">
                    <div className="d-flex justify-content-between align-items-center timesheets-head">
                        <div className="d-flex align-items-center">
                            <h6 className="fw-bold text-dark mb-0">Pending Orders</h6>

                            <ConnectionStatus
                                wsConnected={wsConnected}
                                wsError={wsError}
                            />

                            {pendingOrders.length > 0 && (
                                <label className="toggle-switch ms-2" title={isMuted ? "Unmute notifications" : "Mute notifications"}>
                                    <input
                                        type="checkbox"
                                        checked={!isMuted}
                                        onChange={toggleMute}
                                    />
                                    <span className="slider round">
                                        {isMuted ? (
                                            <FiVolumeX size={12} className="toggle-icon" />
                                        ) : (
                                            <FiVolume2 size={12} className="toggle-icon" />
                                        )}
                                    </span>
                                </label>
                            )}
                        </div>
                        <button
                            className="btn btn-sm btn-link fs-11 text-primary text-end ms-auto"
                            onClick={handleManualRefresh}
                            disabled={loading}
                            title="Refresh orders"
                        >
                            <FiRefreshCw size={16} className={loading ? 'me-1 spin' : 'me-1'} />
                        </button>
                    </div>

                    {wsError && (
                        <div className="alert alert-warning alert-sm mx-3 mb-2">
                            <small>WebSocket error: {wsError}. Using API fallback.</small>
                        </div>
                    )}

                    {componentError && (
                        <div className="alert alert-danger alert-sm mx-3 mb-2">
                            <small>Component error: {componentError}</small>
                        </div>
                    )}

                    <div className="timesheets-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {loading ? (
                            <div className="text-center py-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <div className="mt-2">
                                    <small className="text-muted">Loading orders...</small>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger mx-3">
                                <h6>Failed to load orders</h6>
                                <p className="mb-2">{error}</p>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => {
                                        setError(null);
                                        fetchPendingOrdersAPI();
                                    }}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : pendingOrders.length === 0 ? (
                            <div className="text-center py-4">
                                <i className="feather-clock fs-1 mb-4"></i>
                                <p className="text-muted">No pending orders found!</p>
                            </div>
                        ) : (
                            pendingOrders.map(order => (
                                <div key={order.id} className="card mb-2 mx-3">
                                    <div className="card-body p-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <button
                                                className="btn btn-sm btn-success me-1"
                                                onClick={() => handleOrderAction(order.id, 'accept')}
                                                style={{ minWidth: '70px' }}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger me-1"
                                                onClick={() => handleOrderAction(order.id, 'reject')}
                                                style={{ minWidth: '70px' }}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary me-1"
                                                onClick={() => handleViewDetails(order)}
                                                style={{ minWidth: '60px' }}
                                            >
                                                <FiEye size={14} className="me-1" /> View
                                            </button>
                                        </div>

                                        <div className="flex-grow-1">
                                            <h8 className="card-title mb-1"><strong>
                                                ORDER #{order.orderNumber}
                                            </strong>
                                            </h8>
                                            <p className="card-text text-muted small mb-1">
                                                <strong>Customer:</strong> {order.customerName}
                                            </p>
                                            <p className="card-text text-muted small mb-1">
                                                <strong>Contact:</strong> {order.customerContact || 'N/A'}
                                            </p>
                                            <p className="card-text text-muted small mb-1">
                                                <strong>Total:</strong> {currencySymbol}{order.totalAmount?.toFixed(2) || '0.00'}
                                            </p>
                                            <p className="card-text text-muted small mb-1">
                                                <strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="text-center timesheets-footer">
                        <Link to="/orders/list" className="fs-13 fw-semibold text-dark">View All Orders</Link>
                    </div>
                </div>

                {selectedOrder && (
                    <OrderDetailsModal
                        show={showOrderModal}
                        onHide={handleCloseModal}
                        order={selectedOrder}
                        onAccept={() => {
                            handleOrderAction(selectedOrder.id, 'accept');
                            handleCloseModal();
                        }}
                        onReject={() => {
                            handleOrderAction(selectedOrder.id, 'reject');
                            handleCloseModal();
                        }}
                    />
                )}

                <style>{`
                    .toggle-switch {
                        position: relative;
                        display: inline-block;
                        width: 36px;
                        height: 20px;
                        margin-left: 8px;
                    }
                    .toggle-switch input {
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }
                    .slider {
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: #ccc;
                        transition: .4s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .slider.round {
                        border-radius: 20px;
                    }
                    .toggle-switch input:checked + .slider {
                        background-color: #0d6efd;
                    }
                    .toggle-switch input:focus + .slider {
                        box-shadow: 0 0 1px #0d6efd;
                    }
                    .slider.round:before {
                        position: absolute;
                        content: "";
                        height: 16px;
                        width: 16px;
                        left: 2px;
                        bottom: 2px;
                        background-color: white;
                        transition: .4s;
                        border-radius: 50%;
                    }
                    .toggle-switch input:checked + .slider:before {
                        transform: translateX(16px);
                    }
                    .toggle-icon {
                        position: relative;
                        z-index: 1;
                        color: white;
                    }
                    .toggle-switch input:not(:checked) + .slider .toggle-icon {
                        color: #6c757d;
                    }
                    .spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .order-items-preview {
                        margin-top: 8px;
                        padding-top: 8px;
                        border-top: 1px solid #eee;
                    }
                `}</style>
            </div>
        );
    } catch (renderError) {
        errorLog('Component render error', renderError);
        return (
            <div className="dropdown nxl-h-item">
                <div className="nxl-head-link me-0">
                    <FiClock size={20} />
                    <span className="badge bg-danger nxl-h-badge">Error</span>
                </div>
            </div>
        );
    }
};

// Connection Status Component
const ConnectionStatus = ({ wsConnected, wsError }) => (
    <span
        className={`ms-2 ${wsConnected ? 'text-primary' : 'text-warning'}`}
        title={wsConnected ? 'Connected' : wsError || 'Disconnected'}
    >
        {wsConnected ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
    </span>
);

// Order Details Modal Component
const OrderDetailsModal = ({ show, onHide, order, onAccept, onReject }) => {
    if (!order) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Order Details #{order?.orderNumber}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="order-details">
                    <div className="row mb-4">
                        <div className="col-md-6">
                            <div className="card h-100">
                                <div className="card-header bg-primary">
                                    <h6 className="mb-0" style={{ color: 'white' }}>Customer Information</h6>
                                </div>
                                <div className="card-body">
                                    <h6 className="mb-2"><strong>Name:</strong> {order.customerName}</h6>
                                    <h6 className="mb-2"><strong>Contact:</strong> {order.customerContact || 'N/A'}</h6>
                                    <h6 className="mb-2"><strong>Address:</strong> {order.deliveryAddress || 'N/A'}</h6>
                                    <h6 className="mb-0"><strong>Order Type:</strong> {order.orderType || 'N/A'}</h6>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card h-100">
                                <div className="card-header bg-primary">
                                    <h6 className="mb-0" style={{ color: 'white' }}>Order Summary</h6>
                                </div>
                                <div className="card-body">
                                    <h6 className="mb-2"><strong>Status:</strong> <span className="badge bg-primary">{order.status}</span></h6>
                                    <h6 className="mb-2"><strong>Order ID:</strong> #{order.orderNumber}</h6>
                                    <h6 className="mb-2"><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</h6>
                                    <h6 className="mb-0"><strong>Fulfillment:</strong> {order.fulfillmentType || 'Not specified'}</h6>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-header bg-primary">
                            <h6 className="mb-0" style={{ color: 'white' }}>Order Items</h6>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Item</th>
                                            <th>Price</th>
                                            <th>Qty</th>
                                            <th>Total</th>
                                            <th>Discount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{currencySymbol}{item.price?.toFixed(2) || '0.00'}</td>
                                                <td>{item.quantity}</td>
                                                <td>{currencySymbol}{item.itemTotal?.toFixed(2) || '0.00'}</td>
                                                <td>{item.itemDiscountRate || 0}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="card mb-4">
                                <div className="card-header bg-primary">
                                    <h6 className="mb-0" style={{ color: 'white' }}>Payment Details</h6>
                                </div>
                                <div className="card-body">
                                    <h6 className="mb-2"><strong>Method:</strong> {order.paymentMethod || 'Not specified'}</h6>
                                    <h6 className="mb-2"><strong>Currency:</strong> {order.currencyCode || 'N/A'} {order.currencySymbol || ''}</h6>
                                    <h6 className="mb-0"><strong>Invoice PDF:</strong> {order.pdfInvoice ? 'Available' : 'Not available'}</h6>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card">
                                <div className="card-header bg-primary">
                                    <h6 className="mb-0" style={{ color: 'white' }}>Order Totals</h6>
                                </div>
                                <div className="card-body">
                                    <div className="d-flex justify-content-between mb-2">
                                        <h6>Subtotal:</h6>
                                        <h6>{currencySymbol}{order.subtotal?.toFixed(2) || order.totalAmount?.toFixed(2) || '0.00'}</h6>
                                    </div>
                                    {order.discountAmount > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <h6>Discount:</h6>
                                            <h6 className="text-danger">-${order.discountAmount.toFixed(2)}</h6>
                                        </div>
                                    )}
                                    {order.gstAmount > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <h6>GST ({order.gstRate}%):</h6>
                                            <h6>{currencySymbol}{order.gstAmount.toFixed(2)}</h6>
                                        </div>
                                    )}
                                    {order.sstAmount > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <h6>SST ({order.sstRate}%):</h6>
                                            <h6>{currencySymbol}{order.sstAmount.toFixed(2)}</h6>
                                        </div>
                                    )}
                                    <div className="d-flex justify-content-between fw-bold">
                                        <h6>Total:</h6>
                                        <h6>{currencySymbol}{order.totalAmount?.toFixed(2) || '0.00'}</h6>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="card mt-4">
                            <div className="card-header bg-primary">
                                <h6 className="mb-0" style={{ color: 'white' }}>Special Notes</h6>
                            </div>
                            <div className="card-body">
                                <h6 className="mb-0">{order.notes}</h6>
                            </div>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default TimesheetsModal;