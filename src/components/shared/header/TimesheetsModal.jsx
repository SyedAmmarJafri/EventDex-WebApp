import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiRefreshCw, FiVolume2, FiVolumeX, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Modal from 'react-bootstrap/Modal';
import { BASE_URL } from '/src/constants.js';

const TimesheetsModal = () => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(() => {
        // Initialize from localStorage or default to false
        const savedValue = localStorage.getItem('notificationsMuted');
        return savedValue !== null ? JSON.parse(savedValue) : false;
    });
    const [hasInteracted, setHasInteracted] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const audioRef = useRef(null);

    const fetchPendingOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/orders/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pending orders');
            }

            const data = await response.json();
            setPendingOrders(data.data || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching pending orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingOrders();

        const intervalId = setInterval(fetchPendingOrders, 30000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const handleInteraction = () => {
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

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.loop = true;
            audioRef.current.muted = isMuted;

            if (pendingOrders.length > 0 && !isMuted && hasInteracted) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Autoplay was prevented:", error);
                    });
                }
            } else {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [pendingOrders, isMuted, hasInteracted]);

    const handleOrderAction = async (orderId, action) => {
        try {
            const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

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
                throw new Error(`Failed to ${action} order`);
            }

            fetchPendingOrders();
        } catch (err) {
            setError(err.message);
            console.error(`Error ${action}ing order:`, err);
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        localStorage.setItem('notificationsMuted', JSON.stringify(newMutedState));
    };

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setShowOrderModal(true);
    };

    const handleCloseModal = () => {
        setShowOrderModal(false);
        setSelectedOrder(null);
    };

    return (
        <div className="dropdown nxl-h-item">
            <audio
                ref={audioRef}
                src="/music/mixkit-bell-tick-tock-timer-1046.mp3"
                loop
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
                        className="btn btn-sm btn-link fs-11 text-success text-end ms-auto"
                        onClick={fetchPendingOrders}
                        disabled={loading}
                    >
                        <FiRefreshCw size={16} className={loading ? 'me-1 spin' : 'me-1'} />
                    </button>
                </div>

                <div className="timesheets-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="text-center py-3">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : pendingOrders.length === 0 ? (
                        <div className="text-center py-4">
                            <i className="feather-clock fs-1 mb-4"></i>
                            <p className="text-muted">No pending orders found!</p>
                        </div>
                    ) : (
                        pendingOrders.map(order => (
                            <div key={order.id} className="card mb-2">
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            <h6 className="card-title mb-1">Order #{order.orderNumber}</h6>
                                            <p className="card-text text-muted small mb-1">
                                                Customer: {order.customerName}
                                            </p>
                                            <p className="card-text text-muted small mb-1">
                                                Total: ${order.totalAmount.toFixed(2)}
                                            </p>
                                            <p className="card-text text-muted small mb-2">
                                                Created: {new Date(order.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="d-flex flex-column">
                                            <button
                                                className="btn btn-sm btn-success mb-1"
                                                onClick={() => handleOrderAction(order.id, 'accept')}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger mb-1"
                                                onClick={() => handleOrderAction(order.id, 'reject')}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleViewDetails(order)}
                                            >
                                                <FiEye size={14} className="me-1" /> View
                                            </button>
                                        </div>
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

            {/* Order Details Modal */}
            <Modal show={showOrderModal} onHide={handleCloseModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Order Details #{selectedOrder?.orderNumber}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedOrder && (
                        <div className="order-details">
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <div className="card h-100">
                                        <div className="card-header bg-primary">
                                            <h6 className="mb-0" style={{color: 'white'}}>Customer Information</h6>
                                        </div>
                                        <div className="card-body">
                                            <h6 className="mb-2"><strong>Name:</strong> {selectedOrder.customerName}</h6>
                                            <h6 className="mb-2"><strong>Email:</strong> {selectedOrder.customerContact || 'N/A'}</h6>
                                            <h6 className="mb-2"><strong>Address:</strong> {selectedOrder.deliveryAddress || 'N/A'}</h6>
                                            <h6 className="mb-0"><strong>Order Type:</strong> {selectedOrder.orderType || 'N/A'}</h6>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="card h-100">
                                        <div className="card-header bg-primary">
                                            <h6 className="mb-0" style={{color: 'white'}}>Order Summary</h6>
                                        </div>
                                        <div className="card-body">
                                            <h6 className="mb-2"><strong>Status:</strong> <span className={`badge bg-${selectedOrder.status === 'PENDING' ? 'warning' : 'success'}`}>{selectedOrder.status}</span></h6>
                                            <h6 className="mb-2"><strong>Order ID:</strong> #{selectedOrder.orderNumber}</h6>
                                            <h6 className="mb-2"><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</h6>
                                            <h6 className="mb-0"><strong>Fulfillment:</strong> {selectedOrder.fulfillmentType || 'Not specified'}</h6>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-header bg-primary">
                                    <h6 className="mb-0" style={{color: 'white'}}>Order Items</h6>
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
                                                {selectedOrder.items?.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.name}</td>
                                                        <td>${item.price.toFixed(2)}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>${item.itemTotal.toFixed(2)}</td>
                                                        <td>{item.itemDiscountRate}%</td>
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
                                            <h6 className="mb-0" style={{color: 'white'}}>Payment Details</h6>
                                        </div>
                                        <div className="card-body">
                                            <h6 className="mb-2"><strong>Method:</strong> {selectedOrder.paymentMethod || 'Not specified'}</h6>
                                            <h6 className="mb-2"><strong>Currency:</strong> {selectedOrder.currencyCode || 'N/A'} {selectedOrder.currencySymbol || ''}</h6>
                                            <h6 className="mb-0"><strong>Invoice PDF:</strong> {selectedOrder.pdfInvoice ? 'Available' : 'Not available'}</h6>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="card">
                                        <div className="card-header bg-primary">
                                            <h6 className="mb-0" style={{color: 'white'}}>Order Totals</h6>
                                        </div>
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between mb-2">
                                                <h6>Subtotal:</h6>
                                                <h6>${selectedOrder.subtotal.toFixed(2)}</h6>
                                            </div>
                                            {selectedOrder.discountAmount > 0 && (
                                                <div className="d-flex justify-content-between mb-2">
                                                    <h6>Discount:</h6>
                                                    <h6 className="text-danger">-${selectedOrder.discountAmount.toFixed(2)}</h6>
                                                </div>
                                            )}
                                            {selectedOrder.gstAmount > 0 && (
                                                <div className="d-flex justify-content-between mb-2">
                                                    <h6>GST ({selectedOrder.gstRate}%):</h6>
                                                    <h6>${selectedOrder.gstAmount.toFixed(2)}</h6>
                                                </div>
                                            )}
                                            {selectedOrder.sstAmount > 0 && (
                                                <div className="d-flex justify-content-between mb-2">
                                                    <h6>SST ({selectedOrder.sstRate}%):</h6>
                                                    <h6>${selectedOrder.sstAmount.toFixed(2)}</h6>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between fw-bold">
                                                <h6>Total:</h6>
                                                <h6>${selectedOrder.totalAmount.toFixed(2)}</h6>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div className="card mt-4">
                                    <div className="card-header bg-primary">
                                        <h6 className="mb-0" style={{color: 'white'}}>Special Notes</h6>
                                    </div>
                                    <div className="card-body">
                                        <h6 className="mb-0">{selectedOrder.notes}</h6>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
            </Modal>

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
            `}</style>
        </div>
    );
};

export default TimesheetsModal;