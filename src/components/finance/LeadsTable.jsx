import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    FaWallet,
    FaMoneyBillWave,
    FaCheckCircle,
    FaEye,
    FaSync,
    FaRupeeSign,
    FaReceipt,
    FaUser,
    FaCalendarAlt,
    FaIdCard,
    FaCheckDouble,
    FaClock,
    FaFilter
} from 'react-icons/fa';
import { Modal, Button, Form, Card, Badge, Tabs, Tab } from 'react-bootstrap';

const PaymentsTable = () => {
    // Get user permissions and token
    const authData = JSON.parse(localStorage.getItem("authData")) || {};
    const userRole = authData?.role || '';
    const userPermissions = authData?.permissions || [];
    const currencySymbol = 'Rs. ';
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    const hasPermission = (permission) => {
        if (userRole === 'PATRON') return true;
        return userPermissions.includes(permission);
    };

    const canApprove = hasPermission('FINANCE_UPDATE');
    const canRead = userRole === 'PATRON' || userRole === 'DOMAIN_HEAD';

    const [pendingPayments, setPendingPayments] = useState([]);
    const [confirmedPayments, setConfirmedPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approvingPayment, setApprovingPayment] = useState(null);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    const [refreshing, setRefreshing] = useState(false);

    // Toast notification helpers
    const showSuccessToast = (message) => {
        toast.success(message, {
            position: "bottom-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
        });
    };

    const showErrorToast = (message) => {
        toast.error(message, {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
        });
    };

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Registration ID</th>
                            <th scope="col">Participant Name</th>
                            <th scope="col">Student ID</th>
                            <th scope="col">Domain</th>
                            <th scope="col">Amount</th>
                            <th scope="col">Date</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
                                <td>
                                    <Skeleton
                                        width={120}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={150}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={100}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={100}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={80}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={100}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={80}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const EmptyState = ({ type = 'pending' }) => {
        const config = {
            pending: {
                icon: <FaClock size={48} className="text-warning mb-3" />,
                title: "No Pending Payments",
                message: "All payments have been approved and processed.",
                subMessage: "New payment submissions will appear here."
            },
            confirmed: {
                icon: <FaCheckDouble size={48} className="text-success mb-3" />,
                title: "No Confirmed Payments",
                message: "No payments have been approved yet.",
                subMessage: "Approved payments will appear here."
            }
        };

        const { icon, title, message, subMessage } = config[type];

        return (
            <div className="text-center py-5" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {icon}
                <h5 className="mb-2">{title}</h5>
                <p className="text-muted mb-2">{message}</p>
                <small className="text-muted">{subMessage}</small>
            </div>
        );
    };

    const fetchPayments = useCallback(async (type = 'all') => {
        if (!canRead) {
            setLoading(false);
            return;
        }

        try {
            setRefreshing(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            let endpoint = '';
            if (type === 'pending') {
                endpoint = `${BASE_URL}/api/registrations/admin/pending-payments`;
            } else if (type === 'confirmed') {
                endpoint = `${BASE_URL}/api/registrations/admin/payment-status/APPROVED`;
            } else {
                // Fetch both in parallel
                const [pendingResponse, confirmedResponse] = await Promise.all([
                    fetch(`${BASE_URL}/api/registrations/admin/pending-payments`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authData.token}`,
                            'Content-Type': 'application/json'
                        }
                    }),
                    fetch(`${BASE_URL}/api/registrations/admin/payment-status/APPROVED`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authData.token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                ]);

                if (!pendingResponse.ok || !confirmedResponse.ok) {
                    throw new Error('Failed to fetch payments data');
                }

                const pendingData = await pendingResponse.json();
                const confirmedData = await confirmedResponse.json();

                if (pendingData.success === true && pendingData.data) {
                    setPendingPayments(pendingData.data.filter(payment => 
                        payment.paymentStatus === 'PENDING_VERIFICATION'
                    ));
                }

                if (confirmedData.success === true && confirmedData.data) {
                    setConfirmedPayments(confirmedData.data.filter(payment => 
                        payment.paymentStatus === 'APPROVED'
                    ));
                }

                setLoading(false);
                setRefreshing(false);
                return;
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to fetch payments';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', responseText);
                throw new Error('Invalid response format from server');
            }
            
            if (data.success === true && data.data) {
                if (type === 'pending') {
                    const pendingVerificationPayments = data.data.filter(
                        payment => payment.paymentStatus === 'PENDING_VERIFICATION'
                    );
                    setPendingPayments(pendingVerificationPayments);
                } else if (type === 'confirmed') {
                    const approvedPayments = data.data.filter(
                        payment => payment.paymentStatus === 'APPROVED'
                    );
                    setConfirmedPayments(approvedPayments);
                }
            } else {
                throw new Error(data.message || 'Failed to fetch payments');
            }
        } catch (err) {
            console.error('Error fetching payments:', err);
            showErrorToast(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [canRead]);

    const fetchPaymentDetails = async (registrationId) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/registrations/admin/details/${registrationId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to fetch payment details';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', responseText);
                throw new Error('Invalid response format from server');
            }

            if (data.success === true && data.data) {
                setSelectedPayment(data.data);
                setShowPaymentDetails(true);
            } else {
                throw new Error(data.message || 'Failed to fetch payment details');
            }
        } catch (err) {
            console.error('Error fetching payment details:', err);
            showErrorToast(err.message);
        }
    };

    const approvePayment = async (registrationId) => {
        try {
            setApprovingPayment(registrationId);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            console.log('Approving payment for:', registrationId);

            const response = await fetch(`${BASE_URL}/api/registrations/admin/${registrationId}/approve-payment`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // First get the response text
            const responseText = await response.text();
            console.log('Response text:', responseText);

            // Check if response is ok
            if (!response.ok) {
                let errorMessage = `Failed to approve payment (${response.status})`;
                
                try {
                    // Try to parse error response as JSON
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (parseError) {
                    // If JSON parsing fails, use the raw text or status text
                    errorMessage = responseText || response.statusText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            // Try to parse successful response
            let data;
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse success response as JSON:', responseText);
                    // If response is empty but status is ok, consider it successful
                    console.log('Empty or invalid JSON response, considering as success');
                    data = { success: true };
                }
            } else {
                // Empty response but status is ok
                data = { success: true };
            }

            // Handle different response structures
            const isSuccess = data.success === true || 
                            data.status === 'success' || 
                            data.status === 'approved' ||
                            response.status === 200;

            if (isSuccess) {
                showSuccessToast("Payment approved successfully");
                
                // Refresh both payment lists to ensure data consistency
                await fetchPayments('all');
                
                setShowPaymentDetails(false);
                setSelectedPayment(null);
            } else {
                throw new Error(data.message || data.error || 'Failed to approve payment');
            }
        } catch (err) {
            console.error('Error approving payment:', err);
            showErrorToast(err.message);
        } finally {
            setApprovingPayment(null);
        }
    };

    const handleForceRefresh = () => {
        fetchPayments('all');
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'pending' && pendingPayments.length === 0) {
            fetchPayments('pending');
        } else if (tab === 'confirmed' && confirmedPayments.length === 0) {
            fetchPayments('confirmed');
        }
    };

    useEffect(() => {
        fetchPayments('all');
    }, [fetchPayments]);

    // Common columns configuration
    const getColumns = (isConfirmed = false) => [
        {
            accessorKey: 'registrationId',
            header: 'Registration ID',
            cell: (info) => (
                <div className="d-flex align-items-center">
                    <FaIdCard className={`me-2 ${isConfirmed ? 'text-success' : 'text-primary'}`} />
                    <span className={`fw-bold ${isConfirmed ? 'text-success' : 'text-primary'}`}>
                        {info.getValue()}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'participantName',
            header: 'Participant Name',
            cell: (info) => (
                <div className="d-flex align-items-center">
                    <FaUser className="text-muted me-2" size={14} />
                    {info.getValue()}
                </div>
            )
        },
        {
            accessorKey: 'studentId',
            header: 'Student ID',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'domainName',
            header: 'Domain',
            cell: (info) => (
                <Badge bg={isConfirmed ? "success" : "info"} className="text-uppercase">
                    {info.getValue()}
                </Badge>
            )
        },
        {
            accessorKey: 'registrationFee',
            header: 'Amount',
            cell: (info) => {
                const amount = info.getValue();
                return (
                    <div className="d-flex align-items-center">
                        <FaRupeeSign className="text-success me-1" size={12} />
                        <span className="fw-bold text-success">
                            {amount?.toFixed(2) || '0.00'}
                        </span>
                    </div>
                );
            }
        },
        {
            accessorKey: 'registeredAt',
            header: 'Registration Date',
            cell: (info) => {
                const date = new Date(info.getValue());
                return (
                    <div className="d-flex align-items-center">
                        <FaCalendarAlt className="text-muted me-2" size={12} />
                        <div>
                            <div className="small">{date.toLocaleDateString()}</div>
                            <small className="text-muted">{date.toLocaleTimeString()}</small>
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (info) => {
                const payment = info.row.original;
                return (
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => fetchPaymentDetails(payment.registrationId)}
                            title="View Payment Details"
                            disabled={!canRead}
                            className="d-flex align-items-center gap-1"
                            style={{ 
                                borderRadius: '6px',
                                padding: '0.375rem 0.75rem',
                                borderWidth: '1.5px'
                            }}
                        >
                            <FaEye size={12} />
                            <span>View</span>
                        </Button>
                        {canApprove && !isConfirmed && (
                            <Button
                                variant="success"
                                size="sm"
                                onClick={() => approvePayment(payment.registrationId)}
                                disabled={approvingPayment === payment.registrationId || !canRead}
                                title="Approve Payment"
                                className="d-flex align-items-center gap-1"
                                style={{ 
                                    borderRadius: '6px',
                                    padding: '0.375rem 0.75rem',
                                    borderWidth: '1.5px',
                                    fontWeight: '500'
                                }}
                            >
                                {approvingPayment === payment.registrationId ? (
                                    <>
                                        <div className="spinner-border spinner-border-sm me-1" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <span>Approving</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle size={12} />
                                        <span>Approve</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    // Function to get proper image URL
    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        if (imageUrl.startsWith('/')) {
            return BASE_URL + imageUrl;
        }
        
        return `${BASE_URL}/api/files/payment-proofs/${imageUrl}`;
    };

    if (!canRead) {
        return (
            <div className="text-center py-5">
                <div className="mb-4">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 17V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 7H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </div>
                <h5>Access Denied</h5>
                <p className="text-muted">You don't have permission to view payments.</p>
            </div>
        );
    }

    const currentPayments = activeTab === 'pending' ? pendingPayments : confirmedPayments;
    const currentColumns = getColumns(activeTab === 'confirmed');

    return (
        <>
            <ToastContainer
                position="bottom-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />

            {/* Payment Details Modal */}
            <Modal show={showPaymentDetails} onHide={() => setShowPaymentDetails(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center">
                        <FaReceipt className="me-2 text-primary" />
                        Payment Details - {selectedPayment?.registrationId}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPayment && (
                        <div className="row">
                            <div className="col-md-6">
                                <Card className="mb-3">
                                    <Card.Header className="bg-light d-flex align-items-center">
                                        <FaUser className="me-2" />
                                        <h6 className="mb-0">Participant Information</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="mb-2">
                                            <strong>Name:</strong> {selectedPayment.participantName}
                                        </div>
                                        <div className="mb-2">
                                            <strong>Student ID:</strong> {selectedPayment.studentId}
                                        </div>
                                        <div className="mb-2">
                                            <strong>Email:</strong> {selectedPayment.email}
                                        </div>
                                        <div className="mb-2">
                                            <strong>Phone:</strong> {selectedPayment.phoneNumber}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </div>
                            <div className="col-md-6">
                                <Card className="mb-3">
                                    <Card.Header className="bg-light d-flex align-items-center">
                                        <FaReceipt className="me-2" />
                                        <h6 className="mb-0">Registration Information</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="mb-2">
                                            <strong>Domain:</strong> 
                                            <Badge bg="info" className="ms-2 text-uppercase">
                                                {selectedPayment.domainName}
                                            </Badge>
                                        </div>
                                        <div className="mb-2 d-flex align-items-center">
                                            <strong>Registration Fee:</strong> 
                                            <span className="fw-bold text-success ms-2 d-flex align-items-center">
                                                <FaRupeeSign size={12} className="me-1" />
                                                {selectedPayment.registrationFee?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <strong>Transaction ID:</strong> 
                                            <code className="ms-2">{selectedPayment.transactionId || 'N/A'}</code>
                                        </div>
                                        <div className="mb-2">
                                            <strong>Payment Status:</strong> 
                                            <Badge 
                                                bg={selectedPayment.paymentStatus === 'APPROVED' ? 'success' : 'warning'} 
                                                className="ms-2"
                                            >
                                                {selectedPayment.paymentStatus === 'APPROVED' ? 'Confirmed' : 'Pending'}
                                            </Badge>
                                        </div>
                                        <div className="mb-2 d-flex align-items-center">
                                            <strong>Registered At:</strong> 
                                            <div className="text-muted small ms-2 d-flex align-items-center">
                                                <FaCalendarAlt size={12} className="me-1" />
                                                {new Date(selectedPayment.registeredAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </div>
                            
                            {/* Payment Proof Section */}
                            {selectedPayment.paymentProofImageUrl && (
                                <div className="col-12">
                                    <Card>
                                        <Card.Header className="bg-light d-flex align-items-center">
                                            <FaEye className="me-2" />
                                            <h6 className="mb-0">Payment Proof</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="text-center">
                                                <img 
                                                    src={getImageUrl(selectedPayment.paymentProofImageUrl)} 
                                                    alt="Payment Proof" 
                                                    style={{ 
                                                        maxWidth: '100%', 
                                                        maxHeight: '400px', 
                                                        borderRadius: '8px',
                                                        border: '1px solid #dee2e6'
                                                    }}
                                                    className="mb-3"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <div style={{ display: 'none' }} className="text-center">
                                                    <p className="text-muted mb-2">Unable to load image</p>
                                                    <a 
                                                        href={getImageUrl(selectedPayment.paymentProofImageUrl)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                                    >
                                                        <FaEye size={12} />
                                                        View Payment Proof
                                                    </a>
                                                </div>
                                                <div className="mt-2">
                                                    <small className="text-muted">
                                                        Transaction ID: {selectedPayment.transactionId || 'Not provided'}
                                                    </small>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {canApprove && selectedPayment && selectedPayment.paymentStatus !== 'APPROVED' && (
                        <Button
                            variant="success"
                            onClick={() => approvePayment(selectedPayment.registrationId)}
                            disabled={approvingPayment === selectedPayment.registrationId}
                            className="d-flex align-items-center gap-2"
                            style={{ 
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontWeight: '500'
                            }}
                        >
                            {approvingPayment === selectedPayment.registrationId ? (
                                <>
                                    <div className="spinner-border spinner-border-sm" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <FaCheckCircle />
                                    Approve Payment
                                </>
                            )}
                        </Button>
                    )}
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowPaymentDetails(false)}
                        style={{ borderRadius: '6px', padding: '0.5rem 1rem' }}
                    >
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-1 d-flex align-items-center">
                        Payment Management
                    </h4>
                    <p className="text-muted mb-0">
                        Manage and verify payment submissions
                    </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {activeTab === 'pending' ? pendingPayments.length : confirmedPayments.length} {activeTab} payment{(activeTab === 'pending' ? pendingPayments.length : confirmedPayments.length) !== 1 ? 's' : ''}
                    </span>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleForceRefresh}
                        title="Refresh payments"
                        disabled={refreshing}
                        className="d-flex align-items-center gap-1"
                        style={{ borderRadius: '6px' }}
                    >
                        <FaSync className={refreshing ? 'spinning' : ''} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row mb-4">
                <div className="col-md-4 col-sm-6 mb-3">
                    <div className="card text-white h-100" style={{
                        background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                        borderRadius: '12px',
                        border: 'none',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 4px 20px rgba(255, 193, 7, 0.2)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-50px',
                            right: '-50px',
                            width: '200px',
                            height: '200px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }} />
                        <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="card-title mb-0 d-flex align-items-center" style={{ fontWeight: 600 }}>
                                    <FaClock className="me-2" />
                                    Pending Payments
                                </h6>
                                <FaWallet size={24} style={{ opacity: 0.8 }} />
                            </div>
                            <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                {pendingPayments.length}
                            </h3>
                            <div className="mt-auto text-white" style={{
                                fontSize: '0.8rem',
                                opacity: 0.9,
                                marginTop: '16px'
                            }}>
                                Awaiting approval
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4 col-sm-6 mb-3">
                    <div className="card text-white h-100" style={{
                        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        borderRadius: '12px',
                        border: 'none',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 4px 20px rgba(40, 167, 69, 0.2)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-50px',
                            right: '-50px',
                            width: '200px',
                            height: '200px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }} />
                        <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="card-title mb-0 d-flex align-items-center" style={{ fontWeight: 600 }}>
                                    <FaCheckDouble className="me-2" />
                                    Confirmed Payments
                                </h6>
                                <FaCheckCircle size={24} style={{ opacity: 0.8 }} />
                            </div>
                            <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                {confirmedPayments.length}
                            </h3>
                            <div className="mt-auto text-white" style={{
                                fontSize: '0.8rem',
                                opacity: 0.9,
                                marginTop: '16px'
                            }}>
                                Successfully approved
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4 col-sm-6 mb-3">
                    <div className="card text-white h-100" style={{
                        background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                        borderRadius: '12px',
                        border: 'none',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-50px',
                            right: '-50px',
                            width: '200px',
                            height: '200px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }} />
                        <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="card-title mb-0 d-flex align-items-center" style={{ fontWeight: 600 }}>
                                    <FaRupeeSign className="me-1" size={16} />
                                    Total Amount
                                </h6>
                                <FaMoneyBillWave size={24} style={{ opacity: 0.8 }} />
                            </div>
                            <h3 className="text-light mb-0 d-flex align-items-center" style={{ fontSize: '28px', fontWeight: 600 }}>
                                <FaRupeeSign className="me-1" size={20} />
                                {(pendingPayments.reduce((total, payment) => total + (payment.registrationFee || 0), 0) + 
                                  confirmedPayments.reduce((total, payment) => total + (payment.registrationFee || 0), 0)).toFixed(2)}
                            </h3>
                            <div className="mt-auto text-white" style={{
                                fontSize: '0.8rem',
                                opacity: 0.9,
                                marginTop: '16px'
                            }}>
                                Total processed amount
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modern Chip Tabs */}
            <Card className="mb-4">
                <Card.Body className="p-3">
                    <div className="d-flex gap-3">
                        <button
                            className={`btn ${activeTab === 'pending' ? 'btn-warning' : 'btn-outline-warning'} d-flex align-items-center gap-2`}
                            onClick={() => handleTabChange('pending')}
                            style={{
                                borderRadius: '25px',
                                padding: '0.5rem 1.5rem',
                                fontWeight: '600',
                                borderWidth: '2px'
                            }}
                        >
                            <FaClock />
                            Pending Payments
                            <Badge bg="dark" className="ms-1">
                                {pendingPayments.length}
                            </Badge>
                        </button>
                        <button
                            className={`btn ${activeTab === 'confirmed' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center gap-2`}
                            onClick={() => handleTabChange('confirmed')}
                            style={{
                                borderRadius: '25px',
                                padding: '0.5rem 1.5rem',
                                fontWeight: '600',
                                borderWidth: '2px'
                            }}
                        >
                            <FaCheckDouble />
                            Confirmed Payments
                            <Badge bg="dark" className="ms-1">
                                {confirmedPayments.length}
                            </Badge>
                        </button>
                    </div>
                </Card.Body>
            </Card>

            {/* Main Table */}
            {
                loading ? (
                    <SkeletonLoader />
                ) : currentPayments.length === 0 ? (
                    <EmptyState type={activeTab} />
                ) : (
                    <Table
                        data={currentPayments}
                        columns={currentColumns}
                        initialState={{ pagination: { pageSize: 10 } }}
                    />
                )
            }

            {/* Add some custom styles */}
            <style jsx>{`
                .spinning {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default PaymentsTable;