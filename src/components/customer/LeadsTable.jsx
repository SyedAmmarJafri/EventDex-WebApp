import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiEye, FiFilter, FiX, FiExternalLink } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';
import Button from '@mui/material/Button';
import Form from 'react-bootstrap/Form';

// IndexedDB setup
const DB_NAME = 'RegistrationDB';
const DB_VERSION = 1;
const STORE_NAME = 'registrations';
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getCachedData = async () => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const data = request.result[0]; // Get first record
                if (data && (Date.now() - data.timestamp) < CACHE_EXPIRY) {
                    resolve(data.registrations);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB error:', error);
        return null;
    }
};

const storeData = async (registrations) => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Clear existing data
        store.clear();

        // Store new data with timestamp
        store.put({
            id: 1, // Using a fixed ID since we only store one set of data
            registrations,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('IndexedDB error:', error);
    }
};

const RegistrationTable = () => {
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [subdomains, setSubdomains] = useState([]);
    const [selectedSubdomain, setSelectedSubdomain] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
    const [registrationStatusFilter, setRegistrationStatusFilter] = useState('');
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Get user permissions
    const authData = JSON.parse(localStorage.getItem("authData")) || {};
    const userRole = authData?.role || '';
    const canRead = userRole === 'PATRON' || userRole === 'DOMAIN_HEAD';

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

    // Function to get proper image URL
    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        
        // If it's already a full URL, return as is
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        // If it's a relative path, prepend BASE_URL
        if (imageUrl.startsWith('/')) {
            return BASE_URL + imageUrl;
        }
        
        // If it's just a filename, construct the full URL
        return `${BASE_URL}/api/files/payment-proofs/${imageUrl}`;
    };

    // Function to handle image click - opens in new tab
    const handleImageClick = (imageUrl) => {
        const fullImageUrl = getImageUrl(imageUrl);
        if (fullImageUrl) {
            window.open(fullImageUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const EmptyState = () => {
        return (
            <div className="text-center py-5" style={{ minHeight: '460px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div className="mb-4">
                    <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg">
                        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                            <ellipse fill={isDarkMode ? "#2d3748" : "#F5F5F5"} cx="32" cy="33" rx="32" ry="7"></ellipse>
                            <g fillRule="nonzero" stroke={isDarkMode ? "#4a5568" : "#D9D9D9"}>
                                <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z"></path>
                                <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill={isDarkMode ? "#1a202c" : "#FAFAFA"}></path>
                            </g>
                        </g>
                    </svg>
                </div>
                <h5 className="mb-2">No Registrations Found</h5>
                <p className="text-muted mb-4">No registrations are available for the selected filters.</p>
            </div>
        );
    };

    // Fetch subdomains for filtering
    const fetchSubdomains = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/subdomains`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch subdomains');
            }

            const data = await response.json();
            if (data.success && data.data) {
                setSubdomains(data.data);
            }
        } catch (err) {
            console.error('Error fetching subdomains:', err);
            showErrorToast('Failed to fetch subdomains');
        }
    }, []);

    // Fetch registrations from API
    const fetchRegistrationsFromAPI = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/registrations/admin/all`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch registrations');
            }

            const data = await response.json();
            if (data.success && data.data) {
                await storeData(data.data); // Cache the new data
                return data.data;
            }
            throw new Error(data.message || 'Failed to fetch registrations');
        } catch (err) {
            showErrorToast(err.message);
            return null;
        }
    }, []);

    // Fetch registrations with cache logic
    const fetchRegistrations = useCallback(async () => {
        if (!canRead) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            // First try to get cached data
            const cachedRegistrations = await getCachedData();

            if (cachedRegistrations) {
                setRegistrations(cachedRegistrations);
                setFilteredRegistrations(cachedRegistrations);
                setLoading(false);

                // Fetch fresh data in background
                setTimeout(async () => {
                    const freshRegistrations = await fetchRegistrationsFromAPI();
                    if (freshRegistrations) {
                        setRegistrations(freshRegistrations);
                        setFilteredRegistrations(freshRegistrations);
                    }
                }, 0);
            } else {
                // No valid cache, fetch from API
                const freshRegistrations = await fetchRegistrationsFromAPI();
                if (freshRegistrations) {
                    setRegistrations(freshRegistrations);
                    setFilteredRegistrations(freshRegistrations);
                }
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching registrations:', err);
            setLoading(false);
        }
    }, [fetchRegistrationsFromAPI, canRead]);

    // Apply filters
    const applyFilters = useCallback(() => {
        let filtered = [...registrations];

        // Filter by subdomain
        if (selectedSubdomain) {
            filtered = filtered.filter(reg =>
                reg.domainName === selectedSubdomain ||
                reg.subDomainId === selectedSubdomain
            );
        }

        // Filter by payment status
        if (paymentStatusFilter) {
            filtered = filtered.filter(reg =>
                reg.paymentStatus === paymentStatusFilter
            );
        }

        // Filter by registration status
        if (registrationStatusFilter) {
            filtered = filtered.filter(reg =>
                reg.registrationStatus === registrationStatusFilter
            );
        }

        setFilteredRegistrations(filtered);
    }, [registrations, selectedSubdomain, paymentStatusFilter, registrationStatusFilter]);

    // Clear all filters
    const clearFilters = () => {
        setSelectedSubdomain('');
        setPaymentStatusFilter('');
        setRegistrationStatusFilter('');
        setFilteredRegistrations(registrations);
        setShowFilter(false);
    };

    useEffect(() => {
        fetchRegistrations();
        fetchSubdomains();
    }, [fetchRegistrations, fetchSubdomains]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const handleViewRegistration = (registration) => {
        if (!canRead) return;
        setSelectedRegistration(registration);
        setIsViewModalOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (error) {
            return 'Invalid date';
        }
    };

    const getStatusBadge = (status, type = 'payment') => {
        if (!status) return null;

        const statusMap = {
            payment: {
                'PENDING': { color: 'bg-warning', label: 'Pending' },
                'APPROVED': { color: 'bg-success', label: 'Approved' },
                'REJECTED': { color: 'bg-danger', label: 'Rejected' }
            },
            registration: {
                'PENDING_OTP': { color: 'bg-secondary', label: 'Pending OTP' },
                'REGISTERED': { color: 'bg-info', label: 'Registered' },
                'CONFIRMED': { color: 'bg-success', label: 'Confirmed' },
                'CANCELLED': { color: 'bg-danger', label: 'Cancelled' }
            },
            team: {
                'Team': { color: 'bg-primary', label: 'Team' },
                'Individual': { color: 'bg-secondary', label: 'Individual' }
            }
        };

        const statusInfo = statusMap[type]?.[status] || { color: 'bg-secondary', label: status };
        return <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>;
    };

    // Skeleton loader component
    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Registration ID</th>
                            <th scope="col">Participant</th>
                            <th scope="col">Event</th>
                            <th scope="col">Domain</th>
                            <th scope="col">Registration Status</th>
                            <th scope="col">Payment Status</th>
                            <th scope="col">Type</th>
                            <th scope="col">Fee</th>
                            <th scope="col">Registered At</th>
                            <th scope="col" className="text-end">Actions</th>
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
                                        width={120}
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
                                        width={80}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={60}
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
                                    <div className="hstack gap-2 justify-content-end">
                                        <Skeleton
                                            circle
                                            width={24}
                                            height={24}
                                            baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                            highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'registrationId',
            header: 'Registration ID',
            cell: (info) => (
                <code className="text-primary">{info.getValue()}</code>
            )
        },
        {
            accessorKey: 'participantName',
            header: 'Participant',
            cell: (info) => (
                <div>
                    <div className="fw-semibold">{info.getValue()}</div>
                    <small className="text-muted">{info.row.original.studentId}</small>
                </div>
            )
        },
        {
            accessorKey: 'eventName',
            header: 'Event',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'domainName',
            header: 'Domain',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'registrationStatus',
            header: 'Registration Status',
            cell: (info) => getStatusBadge(info.getValue(), 'registration')
        },
        {
            accessorKey: 'paymentStatus',
            header: 'Payment Status',
            cell: (info) => getStatusBadge(info.getValue(), 'payment')
        },
        {
            accessorKey: 'teamRegistration',
            header: 'Type',
            cell: (info) => getStatusBadge(info.getValue() ? 'Team' : 'Individual', 'team')
        },
        {
            accessorKey: 'registrationFee',
            header: 'Fee',
            cell: (info) => `Rs. ${parseFloat(info.getValue() || 0).toLocaleString('en-PK')}`
        },
        {
            accessorKey: 'registeredAt',
            header: 'Registered At',
            cell: (info) => formatDate(info.getValue())
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleViewRegistration(row.original)}
                        title="View Registration Details"
                        disabled={!canRead}
                    >
                        <FiEye />
                    </button>
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], [canRead]);

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
                <p className="text-muted">You don't have permission to view registrations.</p>
            </div>
        );
    }

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

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Participants</h4>
                <div className="d-flex align-items-center gap-2">
                    {registrations.length > 0 && (
                        <small className="text-muted">
                            Showing {filteredRegistrations.length} of {registrations.length} registrations
                        </small>
                    )}
                    <Button
                        variant="contained"
                        onClick={() => setShowFilter(!showFilter)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiFilter /> Filters
                    </Button>
                </div>
            </div>

            {/* Filters Section */}
            {showFilter && (
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Filter Registrations</h5>
                            <Button
                                variant="text"
                                startIcon={<FiX />}
                                onClick={clearFilters}
                                size="small"
                            >
                                Clear All
                            </Button>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <Form.Label>Subdomain</Form.Label>
                                <Form.Select
                                    value={selectedSubdomain}
                                    onChange={(e) => setSelectedSubdomain(e.target.value)}
                                >
                                    <option value="">All Subdomains</option>
                                    {subdomains.map(subdomain => (
                                        <option key={subdomain.id} value={subdomain.name}>
                                            {subdomain.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                            <div className="col-md-4">
                                <Form.Label>Payment Status</Form.Label>
                                <Form.Select
                                    value={paymentStatusFilter}
                                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </Form.Select>
                            </div>
                            <div className="col-md-4">
                                <Form.Label>Registration Status</Form.Label>
                                <Form.Select
                                    value={registrationStatusFilter}
                                    onChange={(e) => setRegistrationStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="PENDING_OTP">Pending OTP</option>
                                    <option value="REGISTERED">Registered</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </Form.Select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <SkeletonLoader />
            ) : filteredRegistrations.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={filteredRegistrations}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* View Registration Modal */}
            <Modal
                show={isViewModalOpen}
                onHide={() => setIsViewModalOpen(false)}
                size="lg"
                centered
                scrollable
                className={isDarkMode ? 'dark-modal' : ''}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Registration Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRegistration && (
                        <div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Registration ID</h5>
                                    <p><code>{selectedRegistration.registrationId}</code></p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Registration Status</h5>
                                    <p>{getStatusBadge(selectedRegistration.registrationStatus, 'registration')}</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Participant Name</h5>
                                    <p>{selectedRegistration.participantName}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Student ID</h5>
                                    <p>{selectedRegistration.studentId}</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Email</h5>
                                    <p>{selectedRegistration.email}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Phone Number</h5>
                                    <p>{selectedRegistration.phoneNumber || '-'}</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Degree</h5>
                                    <p>{selectedRegistration.degree || '-'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Semester</h5>
                                    <p>{selectedRegistration.semester || '-'}</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Event</h5>
                                    <p>{selectedRegistration.eventName || '-'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Domain</h5>
                                    <p>{selectedRegistration.domainName || '-'}</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Registration Type</h5>
                                    <p>{getStatusBadge(selectedRegistration.teamRegistration ? 'Team' : 'Individual', 'team')}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Registration Fee</h5>
                                    <p className="fw-bold">Rs. {parseFloat(selectedRegistration.registrationFee || 0).toLocaleString('en-PK')}</p>
                                </div>
                            </div>

                            {selectedRegistration.teamRegistration && (
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h5>Team Name</h5>
                                        <p>{selectedRegistration.teamName || '-'}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <h5>Team Code</h5>
                                        <p><code>{selectedRegistration.teamCode || '-'}</code></p>
                                    </div>
                                </div>
                            )}

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Payment Status</h5>
                                    <p>{getStatusBadge(selectedRegistration.paymentStatus, 'payment')}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Transaction ID</h5>
                                    <p>{selectedRegistration.transactionId || '-'}</p>
                                </div>
                            </div>

                            {selectedRegistration.paymentStatus === 'REJECTED' && selectedRegistration.rejectionReason && (
                                <div className="row mb-3">
                                    <div className="col-12">
                                        <h5>Rejection Reason</h5>
                                        <p className="text-danger">{selectedRegistration.rejectionReason}</p>
                                    </div>
                                </div>
                            )}

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Registered At</h5>
                                    <p>{formatDate(selectedRegistration.registeredAt)}</p>
                                </div>
                                {selectedRegistration.paymentVerifiedAt && (
                                    <div className="col-md-6">
                                        <h5>Payment Verified At</h5>
                                        <p>{formatDate(selectedRegistration.paymentVerifiedAt)}</p>
                                    </div>
                                )}
                            </div>

                            {selectedRegistration.paymentProofImageUrl && (
                                <div className="row mb-3">
                                    <div className="col-12">
                                        <h5>Payment Proof</h5>
                                        <div className="text-center">
                                            <div 
                                                className="payment-proof-preview"
                                                onClick={() => handleImageClick(selectedRegistration.paymentProofImageUrl)}
                                                style={{ cursor: 'pointer', display: 'inline-block' }}
                                                title="Click to open payment proof in new tab"
                                            >
                                                <img
                                                    src={getImageUrl(selectedRegistration.paymentProofImageUrl)}
                                                    alt="Payment Proof"
                                                    className="img-fluid rounded border"
                                                    style={{ 
                                                        maxHeight: '200px',
                                                        maxWidth: '100%'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <div 
                                                    style={{ display: 'none' }} 
                                                    className="text-muted mt-2"
                                                >
                                                    Payment proof image not available
                                                </div>
                                                <div className="mt-2">
                                                    <small className="text-primary">
                                                        <FiExternalLink className="me-1" />
                                                        Click to view in new tab
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            <style>
                {`
                /* Custom badge colors */
                .bg-danger { background-color: #dc3545; color: white; }
                .bg-warning { background-color: #ffc107; color: #212529; }
                .bg-success { background-color: #28a745; color: white; }
                .bg-info { background-color: #17a2b8; color: white; }
                .bg-primary { background-color: #007bff; color: white; }
                .bg-secondary { background-color: #6c757d; color: white; }
                
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

                /* Payment proof preview styles */
                .payment-proof-preview:hover {
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }

                .avatar-text {
                    background: transparent;
                    border: none;
                    color: inherit;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }

                .avatar-text:hover {
                    background-color: rgba(0, 0, 0, 0.1);
                }

                .avatar-text:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .avatar-md {
                    width: 32px;
                    height: 32px;
                }
                `}
            </style>
        </>
    );
};

export default RegistrationTable;