import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';

const ItemsTable = () => {
    const [domains, setDomains] = useState([]);
    const [parentDomains, setParentDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [domainToDelete, setDomainToDelete] = useState(null);
    const [newDomain, setNewDomain] = useState({
        name: '',
        description: '',
        registrationFee: '',
        participantLimit: '',
        parentDomainId: ''
    });
    const [editDomain, setEditDomain] = useState({
        id: '',
        name: '',
        description: '',
        registrationFee: '',
        participantLimit: '',
        parentDomainId: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [creatingDomain, setCreatingDomain] = useState(false);
    const [updatingDomain, setUpdatingDomain] = useState(false);
    const [currentEventId, setCurrentEventId] = useState(null);
    const [hasFetchedInitialData, setHasFetchedInitialData] = useState(false);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Get user permissions from authData
    const authData = JSON.parse(localStorage.getItem("authData")) || {};
    const userRole = authData?.role || '';
    const userPermissions = authData?.permissions || [];

    // Permission checks
    const canRead = userRole === 'PATRON' || userPermissions.includes('CATEGORY_READ');
    const canWrite = userRole === 'PATRON' || userPermissions.includes('CATEGORY_WRITE');
    const canUpdate = userRole === 'PATRON' || userPermissions.includes('CATEGORY_UPDATE');
    const canDelete = userRole === 'PATRON' || userPermissions.includes('CATEGORY_DELETE');

    // Get event ID from localStorage or EventsDropdown
    const getEventId = useCallback(() => {
        const savedEventId = localStorage.getItem('eventid');
        if (savedEventId) {
            return savedEventId;
        }
        if (currentEventId) {
            return currentEventId;
        }
        const eventData = JSON.parse(localStorage.getItem('selectedEvent'));
        if (eventData && eventData.id) {
            return eventData.id;
        }
        return null;
    }, [currentEventId]);

    // Toast notification helpers
    const showSuccessToast = (message) => {
        toast.success(message, {
            position: "bottom-center",
            autoClose: 2000,
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
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
        });
    };

    // Utility function to add delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
                <h5 className="mb-2">No Event Subdomains Found</h5>
                <p className="text-muted mb-4">No event subdomains are available for this event.</p>
                {canWrite && getEventId() && (
                    <Button 
                        variant="contained" 
                        startIcon={<FiPlus />}
                        onClick={() => setIsModalOpen(true)}
                    >
                        Create New Subdomain
                    </Button>
                )}
            </div>
        );
    };

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Description</th>
                            <th scope="col">Registration Fee</th>
                            <th scope="col">Participant Limit</th>
                            <th scope="col">Current Participants</th>
                            <th scope="col" className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
                                <td>
                                    <Skeleton
                                        width={150}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={200}
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
                                        width={80}
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
                                        <Skeleton
                                            circle
                                            width={24}
                                            height={24}
                                            baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                            highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                        />
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

    // Fetch all data with sequential requests to prevent concurrent API calls
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                setLoading(false);
                return;
            }

            // Fetch parent domains first
            const parentDomainsResponse = await fetch(`${BASE_URL}/api/events/${eventId}/domains`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const parentDomainsData = await parentDomainsResponse.json();
            if (!parentDomainsResponse.ok) {
                throw new Error(parentDomainsData.message || 'Failed to fetch parent domains');
            }

            if (parentDomainsData.success && parentDomainsData.data) {
                setParentDomains(parentDomainsData.data);

                // Fetch subdomains sequentially instead of in parallel to prevent concurrent requests
                const allSubDomains = [];
                for (const parentDomain of parentDomainsData.data) {
                    try {
                        // Add a small delay between requests to prevent overwhelming the backend
                        await delay(50);
                        
                        const subDomainsResponse = await fetch(`${BASE_URL}/api/events/${eventId}/domains/${parentDomain.id}/subdomains`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${authData.token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        const subDomainsData = await subDomainsResponse.json();
                        if (subDomainsResponse.ok && subDomainsData.success && subDomainsData.data) {
                            allSubDomains.push(...subDomainsData.data);
                        }
                    } catch (error) {
                        console.error(`Error fetching subdomains for parent ${parentDomain.id}:`, error);
                        // Continue with other domains even if one fails
                    }
                }
                
                setDomains(allSubDomains);
            } else {
                setParentDomains([]);
                setDomains([]);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            showErrorToast(err.message);
            setParentDomains([]);
            setDomains([]);
        } finally {
            setLoading(false);
            setHasFetchedInitialData(true);
        }
    }, [getEventId]);

    // Refresh function for after create/update/delete operations
    const refreshData = useCallback(async () => {
        await fetchAllData();
    }, [fetchAllData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewDomain(prev => ({ 
            ...prev, 
            [name]: value 
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditDomain(prev => ({ 
            ...prev, 
            [name]: value 
        }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        
        // Validate registration fee
        if (formData.registrationFee === '' || formData.registrationFee === null) {
            errors.registrationFee = 'Registration fee is required';
        } else {
            const fee = parseFloat(formData.registrationFee);
            if (isNaN(fee) || fee < 0) {
                errors.registrationFee = 'Registration fee must be a valid number and cannot be negative';
            }
        }

        // Validate participant limit
        if (formData.participantLimit === '' || formData.participantLimit === null) {
            errors.participantLimit = 'Participant limit is required';
        } else {
            const limit = parseInt(formData.participantLimit);
            if (isNaN(limit) || limit < 1) {
                errors.participantLimit = 'Participant limit must be a valid number and at least 1';
            }
        }

        // Validate parent domain selection
        if (!formData.parentDomainId) {
            errors.parentDomainId = 'Parent domain is required';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateDomain = async (e) => {
        e.preventDefault();
        if (!validateForm(newDomain, setFormErrors)) return;

        try {
            setCreatingDomain(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                showErrorToast("Please select an event first");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newDomain.name,
                    description: newDomain.description,
                    registrationFee: parseFloat(newDomain.registrationFee),
                    participantLimit: parseInt(newDomain.participantLimit),
                    domainHeadId: null,
                    parentDomainId: newDomain.parentDomainId || null
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create domain');
            }

            showSuccessToast('Subdomain created successfully');
            await refreshData();
            setIsModalOpen(false);
            setNewDomain({
                name: '',
                description: '',
                registrationFee: '',
                participantLimit: '',
                parentDomainId: ''
            });
            setFormErrors({});
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setCreatingDomain(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editDomain, setEditFormErrors)) return;

        try {
            setUpdatingDomain(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                showErrorToast("Please select an event first");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains/${editDomain.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editDomain.name,
                    description: editDomain.description,
                    registrationFee: parseFloat(editDomain.registrationFee),
                    participantLimit: parseInt(editDomain.participantLimit),
                    domainHeadId: null,
                    parentDomainId: editDomain.parentDomainId || null
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update domain');
            }

            showSuccessToast('Subdomain updated successfully');
            await refreshData();
            setIsEditModalOpen(false);
            setEditFormErrors({});
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setUpdatingDomain(false);
        }
    };

    const handleDeleteDomain = async () => {
        try {
            setDeleteLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                showErrorToast("Please select an event first");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains/${domainToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete domain');
            }

            showSuccessToast('Subdomain deleted successfully');
            await refreshData();
            setIsDeleteModalOpen(false);
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleViewDomain = (domain) => {
        if (!canRead) return;
        setSelectedDomain(domain);
        setIsViewModalOpen(true);
    };

    const handleEditDomain = (domain) => {
        if (!canUpdate) return;
        setEditDomain({
            id: domain.id,
            name: domain.name,
            description: domain.description,
            registrationFee: domain.registrationFee?.toString() || '',
            participantLimit: domain.participantLimit?.toString() || '',
            parentDomainId: domain.parentDomainId || ''
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (domain) => {
        if (!canDelete) return;
        setDomainToDelete(domain);
        setIsDeleteModalOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not available';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'Rs. 0';
        return `Rs. ${parseFloat(amount).toLocaleString('en-PK')}`;
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'registrationFee',
            header: 'Registration Fee',
            cell: (info) => formatCurrency(info.getValue())
        },
        {
            accessorKey: 'participantLimit',
            header: 'Participant Limit',
            cell: (info) => info.getValue()?.toLocaleString() || '0'
        },
        {
            accessorKey: 'currentParticipants',
            header: 'Current Participants',
            cell: (info) => info.getValue()?.toLocaleString() || '0'
        },
        {
            accessorKey: 'parentDomainName',
            header: 'Parent Domain',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    {canRead && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewDomain(row.original)}
                            title="View Details"
                        >
                            <FiEye />
                        </button>
                    )}
                    {canUpdate && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditDomain(row.original)}
                            title="Edit Subdomain"
                        >
                            <FiEdit />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleDeleteClick(row.original)}
                            title="Delete Subdomain"
                        >
                            <FiTrash />
                        </button>
                    )}
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], [canRead, canUpdate, canDelete]);

    // Listen for event selection changes
    useEffect(() => {
        const handleEventSelected = (event) => {
            const eventDetail = event.detail;
            if (eventDetail && eventDetail.id && eventDetail.id !== currentEventId) {
                setCurrentEventId(eventDetail.id);
                localStorage.setItem('eventid', eventDetail.id);
                localStorage.setItem('selectedEvent', JSON.stringify(eventDetail));
                
                // Reset data and refresh when event changes
                setDomains([]);
                setParentDomains([]);
                setHasFetchedInitialData(false);
                fetchAllData();
            }
        };

        window.addEventListener('eventSelected', handleEventSelected);

        return () => {
            window.removeEventListener('eventSelected', handleEventSelected);
        };
    }, [currentEventId, fetchAllData]);

    // Fetch domains on component mount only once if event ID is available
    useEffect(() => {
        const eventId = getEventId();
        if (eventId && !hasFetchedInitialData) {
            fetchAllData();
        }
    }, [getEventId, fetchAllData, hasFetchedInitialData]);

    return (
        <>
            <ToastContainer
                position="bottom-center"
                autoClose={2000}
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
                <h4>Event Subdomains</h4>
                <div className="d-flex align-items-center gap-3">
                    {currentEventId && (
                        <small className="text-muted">
                            Showing subdomains for selected event
                        </small>
                    )}
                    {canWrite && getEventId() && (
                        <Button 
                            variant="contained" 
                            startIcon={<FiPlus />}
                            onClick={() => setIsModalOpen(true)}
                            size="small"
                        >
                            Create New Subdomain
                        </Button>
                    )}
                </div>
            </div>

            {!getEventId() ? (
                <div className="text-center py-5">
                    <div className="mb-4">
                        <FiPlus size={48} className="text-muted" />
                    </div>
                    <h5>No Event Selected</h5>
                    <p className="text-muted">Please select an event from the dropdown to view subdomains.</p>
                </div>
            ) : loading ? (
                <SkeletonLoader />
            ) : domains.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={domains}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Create Domain Modal */}
            {canWrite && (
                <Modal show={isModalOpen} onHide={() => setIsModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Subdomain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleCreateDomain}>
                            <div className="mb-3">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                    name="name"
                                    value={newDomain.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter subdomain name"
                                />
                                {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description *</label>
                                <textarea
                                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                                    name="description"
                                    value={newDomain.description}
                                    onChange={handleInputChange}
                                    placeholder="Enter subdomain description"
                                    rows="3"
                                />
                                {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Registration Fee (PKR) *</label>
                                        <div className="input-group">
                                            <span className="input-group-text">Rs.</span>
                                            <input
                                                type="number"
                                                className={`form-control ${formErrors.registrationFee ? 'is-invalid' : ''}`}
                                                name="registrationFee"
                                                value={newDomain.registrationFee}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        {formErrors.registrationFee && <div className="invalid-feedback">{formErrors.registrationFee}</div>}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Participant Limit *</label>
                                        <input
                                            type="number"
                                            className={`form-control ${formErrors.participantLimit ? 'is-invalid' : ''}`}
                                            name="participantLimit"
                                            value={newDomain.participantLimit}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            min="1"
                                        />
                                        {formErrors.participantLimit && <div className="invalid-feedback">{formErrors.participantLimit}</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Parent Domain *</label>
                                <select
                                    className={`form-control ${formErrors.parentDomainId ? 'is-invalid' : ''}`}
                                    name="parentDomainId"
                                    value={newDomain.parentDomainId}
                                    onChange={handleInputChange}
                                    style={{
                                        backgroundColor: 'transparent',
                                        cursor: 'pointer',
                                        paddingRight: '2.5rem',
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.75rem center',
                                        backgroundSize: '16px 12px',
                                        appearance: 'none',
                                    }}
                                >
                                    <option value="">Select a parent domain</option>
                                    {parentDomains.map(domain => (
                                        <option
                                            key={domain.id}
                                            value={domain.id}
                                        >
                                            {domain.name}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.parentDomainId && <div className="invalid-feedback">{formErrors.parentDomainId}</div>}
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="outlined" 
                            onClick={() => {
                                setIsModalOpen(false);
                                setFormErrors({});
                            }}
                            disabled={creatingDomain}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleCreateDomain}
                            disabled={creatingDomain}
                        >
                            {creatingDomain ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Creating...
                                </>
                            ) : (
                                'Create Subdomain'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Edit Domain Modal */}
            {canUpdate && (
                <Modal show={isEditModalOpen} onHide={() => setIsEditModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Subdomain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleEditSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                    name="name"
                                    value={editDomain.name}
                                    onChange={handleEditInputChange}
                                />
                                {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description *</label>
                                <textarea
                                    className={`form-control ${editFormErrors.description ? 'is-invalid' : ''}`}
                                    name="description"
                                    value={editDomain.description}
                                    onChange={handleEditInputChange}
                                    rows="3"
                                />
                                {editFormErrors.description && <div className="invalid-feedback">{editFormErrors.description}</div>}
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Registration Fee (PKR) *</label>
                                        <div className="input-group">
                                            <span className="input-group-text">Rs.</span>
                                            <input
                                                type="number"
                                                className={`form-control ${editFormErrors.registrationFee ? 'is-invalid' : ''}`}
                                                name="registrationFee"
                                                value={editDomain.registrationFee}
                                                onChange={handleEditInputChange}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        {editFormErrors.registrationFee && <div className="invalid-feedback">{editFormErrors.registrationFee}</div>}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Participant Limit *</label>
                                        <input
                                            type="number"
                                            className={`form-control ${editFormErrors.participantLimit ? 'is-invalid' : ''}`}
                                            name="participantLimit"
                                            value={editDomain.participantLimit}
                                            onChange={handleEditInputChange}
                                            min="1"
                                        />
                                        {editFormErrors.participantLimit && <div className="invalid-feedback">{editFormErrors.participantLimit}</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Parent Domain *</label>
                                <select
                                    className={`form-control ${editFormErrors.parentDomainId ? 'is-invalid' : ''}`}
                                    name="parentDomainId"
                                    value={editDomain.parentDomainId}
                                    onChange={handleEditInputChange}
                                    style={{
                                        backgroundColor: 'transparent',
                                        cursor: 'pointer',
                                        paddingRight: '2.5rem',
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.75rem center',
                                        backgroundSize: '16px 12px',
                                        appearance: 'none',
                                    }}
                                >
                                    <option value="">Select a parent domain</option>
                                    {parentDomains.map(domain => (
                                        <option
                                            key={domain.id}
                                            value={domain.id}
                                        >
                                            {domain.name}
                                        </option>
                                    ))}
                                </select>
                                {editFormErrors.parentDomainId && <div className="invalid-feedback">{editFormErrors.parentDomainId}</div>}
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="outlined" 
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditFormErrors({});
                            }}
                            disabled={updatingDomain}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleEditSubmit}
                            disabled={updatingDomain}
                        >
                            {updatingDomain ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Updating...
                                </>
                            ) : (
                                'Update Subdomain'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* View Domain Modal */}
            {canRead && (
                <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Subdomain Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedDomain && (
                            <div>
                                <div className="mb-3">
                                    <h5>Name</h5>
                                    <p className="mb-0">{selectedDomain.name}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Description</h5>
                                    <p className="mb-0">{selectedDomain.description || '-'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Current Participants</h5>
                                    <p className="mb-0">{selectedDomain.currentParticipants?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Registration Fee</h5>
                                    <p className="mb-0">{formatCurrency(selectedDomain.registrationFee)}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Participant Limit</h5>
                                    <p className="mb-0">{selectedDomain.participantLimit?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Domain Type</h5>
                                    <p className="mb-0">{selectedDomain.domainType}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Parent Domain</h5>
                                    <p className="mb-0">{selectedDomain.parentDomainName || 'N/A'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Created At</h5>
                                    <p className="mb-0">{formatDate(selectedDomain.createdAt)}</p>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {canDelete && (
                <Modal show={isDeleteModalOpen} onHide={() => {
                    if (!deleteLoading) {
                        setIsDeleteModalOpen(false);
                    }
                }} centered>
                    <Modal.Header closeButton={!deleteLoading}>
                        <Modal.Title>Delete Subdomain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {domainToDelete && (
                            <>
                                <p>Are you sure you want to delete the subdomain <strong>{domainToDelete.name}</strong>?</p>
                                <p className="text-danger">This action cannot be undone.</p>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="outlined"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={deleteLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleDeleteDomain}
                            style={{ backgroundColor: '#d32f2f', color: 'white' }}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    );
};

export default ItemsTable;