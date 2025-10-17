import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye, FiUsers } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

const ItemsTable = () => {
    const [subdomains, setSubdomains] = useState([]);
    const [parentDomains, setParentDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedSubdomain, setSelectedSubdomain] = useState(null);
    const [subdomainToDelete, setSubdomainToDelete] = useState(null);
    const [newSubdomain, setNewSubdomain] = useState({
        name: '',
        description: '',
        registrationFee: '',
        participantLimit: '',
        parentDomainId: '',
        teamGame: false,
        minTeamSize: 1,
        maxTeamSize: 1
    });
    const [editSubdomain, setEditSubdomain] = useState({
        id: '',
        name: '',
        description: '',
        registrationFee: '',
        participantLimit: '',
        parentDomainId: '',
        teamGame: false,
        minTeamSize: 1,
        maxTeamSize: 1
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [creatingSubdomain, setCreatingSubdomain] = useState(false);
    const [updatingSubdomain, setUpdatingSubdomain] = useState(false);
    const [currentEventId, setCurrentEventId] = useState(null);
    const [hasFetchedInitialData, setHasFetchedInitialData] = useState(false);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Get user permissions from authData
    const authData = JSON.parse(localStorage.getItem("authData")) || {};
    const userRole = authData?.role || '';
    const userPermissions = authData?.permissions || [];

    // Permission checks - Updated to match backend security annotations
    const canRead = userRole === 'PATRON' || userRole === 'DOMAIN_HEAD';
    const canWrite = userRole === 'PATRON' || userRole === 'DOMAIN_HEAD';
    const canUpdate = userRole === 'PATRON' || userRole === 'DOMAIN_HEAD';
    const canDelete = userRole === 'PATRON' || userRole === 'DOMAIN_HEAD';

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
                <h5 className="mb-2">No Subdomains Found</h5>
                <p className="text-muted mb-4">No subdomains are available for this event.</p>
                {canWrite && getEventId() && (
                    <Button
                        variant="contained"
                        startIcon={<FiPlus />}
                        onClick={() => setIsModalOpen(true)}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        Create Subdomain
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
                            <th scope="col">Type</th>
                            <th scope="col">Team Size</th>
                            <th scope="col">Registered</th>
                            <th scope="col">Waitlist</th>
                            <th scope="col">Parent Domain</th>
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
                                        width={60}
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

    // Fetch parent domains (categories)
    const fetchParentDomains = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                return [];
            }

            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch parent domains');
            }

            if (data.success && data.data) {
                return data.data;
            } else {
                return [];
            }
        } catch (err) {
            console.error('Error fetching parent domains:', err);
            showErrorToast('Failed to fetch parent domains');
            return [];
        }
    }, [getEventId]);

    // Fetch all subdomains - Updated to use the correct backend endpoint
    const fetchAllSubdomains = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                setLoading(false);
                return;
            }

            // Fetch parent domains first
            const parentDomainsData = await fetchParentDomains();
            setParentDomains(parentDomainsData);

            // Fetch all subdomains using the correct API endpoint
            const response = await fetch(`${BASE_URL}/api/subdomains`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch subdomains');
            }

            if (data.success && data.data) {
                // Filter subdomains that belong to the current event's parent domains
                const eventParentDomainIds = parentDomainsData.map(domain => domain.id);
                const eventSubdomains = data.data.filter(subdomain =>
                    eventParentDomainIds.includes(subdomain.parentDomainId)
                );
                setSubdomains(eventSubdomains);
            } else {
                setSubdomains([]);
            }
        } catch (err) {
            console.error('Error fetching subdomains:', err);
            showErrorToast(err.message);
            setSubdomains([]);
        } finally {
            setLoading(false);
            setHasFetchedInitialData(true);
        }
    }, [getEventId, fetchParentDomains]);

    // Refresh function for after create/update/delete operations
    const refreshData = useCallback(async () => {
        await fetchAllSubdomains();
    }, [fetchAllSubdomains]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewSubdomain(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditSubdomain(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleTeamGameToggle = (checked) => {
        setNewSubdomain(prev => ({
            ...prev,
            teamGame: checked,
            minTeamSize: checked ? 2 : 1,
            maxTeamSize: checked ? 2 : 1
        }));
    };

    const handleEditTeamGameToggle = (checked) => {
        setEditSubdomain(prev => ({
            ...prev,
            teamGame: checked,
            minTeamSize: checked ? Math.max(prev.minTeamSize, 2) : 1,
            maxTeamSize: checked ? Math.max(prev.maxTeamSize, 2) : 1
        }));
    };

    // Updated validation to match backend constraints
    const validateForm = (formData, setErrors) => {
        const errors = {};

        if (!formData.name || !formData.name.trim()) {
            errors.name = 'Name is required';
        }

        if (!formData.description || !formData.description.trim()) {
            errors.description = 'Description is required';
        }

        // Validate registration fee - matches backend validation
        if (formData.registrationFee === '' || formData.registrationFee === null) {
            errors.registrationFee = 'Registration fee is required';
        } else {
            const fee = parseFloat(formData.registrationFee);
            if (isNaN(fee) || fee <= 0) {
                errors.registrationFee = 'Registration fee must be greater than 0';
            }
        }

        // Validate participant limit - matches backend validation
        if (formData.participantLimit === '' || formData.participantLimit === null) {
            errors.participantLimit = 'Participant limit is required';
        } else {
            const limit = parseInt(formData.participantLimit);
            if (isNaN(limit) || limit <= 0) {
                errors.participantLimit = 'Participant limit must be greater than 0';
            }
        }

        // Validate team game constraints - matches backend validation
        if (formData.teamGame) {
            const minSize = parseInt(formData.minTeamSize);
            const maxSize = parseInt(formData.maxTeamSize);

            if (isNaN(minSize) || minSize <= 0) {
                errors.minTeamSize = 'Minimum team size must be greater than 0 for team games';
            }
            if (isNaN(maxSize) || maxSize <= 0) {
                errors.maxTeamSize = 'Maximum team size must be greater than 0 for team games';
            }
            if (minSize > maxSize) {
                errors.maxTeamSize = 'Minimum team size cannot be greater than maximum team size';
            }

            // Additional backend validation: participant limit must be divisible by min team size
            const participantLimit = parseInt(formData.participantLimit);
            if (participantLimit % minSize !== 0) {
                errors.participantLimit = 'Participant limit must be divisible by minimum team size for team games';
            }
        }

        // Validate parent domain selection
        if (!formData.parentDomainId) {
            errors.parentDomainId = 'Parent domain is required';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateSubdomain = async (e) => {
        e.preventDefault();
        if (!validateForm(newSubdomain, setFormErrors)) return;

        try {
            setCreatingSubdomain(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const requestBody = {
                name: newSubdomain.name.trim(),
                description: newSubdomain.description,
                registrationFee: parseFloat(newSubdomain.registrationFee),
                participantLimit: parseInt(newSubdomain.participantLimit),
                parentDomainId: newSubdomain.parentDomainId,
                teamGame: newSubdomain.teamGame,
                minTeamSize: newSubdomain.teamGame ? parseInt(newSubdomain.minTeamSize) : 1,
                maxTeamSize: newSubdomain.teamGame ? parseInt(newSubdomain.maxTeamSize) : 1
            };

            const response = await fetch(`${BASE_URL}/api/subdomains`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create subdomain');
            }

            showSuccessToast('Subdomain created successfully');
            await refreshData();
            setIsModalOpen(false);
            setNewSubdomain({
                name: '',
                description: '',
                registrationFee: '',
                participantLimit: '',
                parentDomainId: '',
                teamGame: false,
                minTeamSize: 1,
                maxTeamSize: 1
            });
            setFormErrors({});
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setCreatingSubdomain(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editSubdomain, setEditFormErrors)) return;

        try {
            setUpdatingSubdomain(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const requestBody = {
                name: editSubdomain.name.trim(),
                description: editSubdomain.description,
                registrationFee: parseFloat(editSubdomain.registrationFee),
                participantLimit: parseInt(editSubdomain.participantLimit),
                parentDomainId: editSubdomain.parentDomainId,
                teamGame: editSubdomain.teamGame,
                minTeamSize: editSubdomain.teamGame ? parseInt(editSubdomain.minTeamSize) : 1,
                maxTeamSize: editSubdomain.teamGame ? parseInt(editSubdomain.maxTeamSize) : 1
            };

            const response = await fetch(`${BASE_URL}/api/subdomains/${editSubdomain.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update subdomain');
            }

            showSuccessToast('Subdomain updated successfully');
            await refreshData();
            setIsEditModalOpen(false);
            setEditFormErrors({});
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setUpdatingSubdomain(false);
        }
    };

    const handleDeleteSubdomain = async () => {
        try {
            setDeleteLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/subdomains/${subdomainToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete subdomain');
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

    const handleViewSubdomain = (subdomain) => {
        if (!canRead) return;
        setSelectedSubdomain(subdomain);
        setIsViewModalOpen(true);
    };

    const handleEditSubdomain = (subdomain) => {
        if (!canUpdate) return;
        setEditSubdomain({
            id: subdomain.id,
            name: subdomain.name,
            description: subdomain.description,
            registrationFee: subdomain.registrationFee?.toString() || '',
            participantLimit: subdomain.participantLimit?.toString() || '',
            parentDomainId: subdomain.parentDomainId || '',
            teamGame: subdomain.teamGame || false,
            minTeamSize: subdomain.minTeamSize || 1,
            maxTeamSize: subdomain.maxTeamSize || 1
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (subdomain) => {
        if (!canDelete) return;
        setSubdomainToDelete(subdomain);
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

    const getGameType = (subdomain) => {
        return subdomain.teamGame ? 'Team Game' : 'Individual';
    };

    const getTeamSizeRange = (subdomain) => {
        if (!subdomain.teamGame) return '1 (Individual)';
        return `${subdomain.minTeamSize} - ${subdomain.maxTeamSize}`;
    };

    // Updated columns to match backend response structure
    const columns = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => (
                <div className="d-flex align-items-center">
                    {info.row.original.teamGame && (
                        <FiUsers className="me-2 text-primary" title="Team Game" />
                    )}
                    {info.getValue()}
                </div>
            )
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
            accessorKey: 'teamGame',
            header: 'Type',
            cell: ({ row }) => (
                <span className={`badge ${row.original.teamGame ? 'bg-primary' : 'bg-secondary'}`}>
                    {getGameType(row.original)}
                </span>
            )
        },
        {
            accessorKey: 'teamSize',
            header: 'Team Size',
            cell: ({ row }) => getTeamSizeRange(row.original)
        },
        {
            accessorKey: 'registeredCount',
            header: 'Registered',
            cell: (info) => (
                <span className="badge bg-success">
                    {info.getValue()?.toLocaleString() || '0'}
                </span>
            )
        },
        {
            accessorKey: 'waitlistCount',
            header: 'Waitlist',
            cell: (info) => (
                <span className="badge bg-warning text-dark">
                    {info.getValue()?.toLocaleString() || '0'}
                </span>
            )
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
                            onClick={() => handleViewSubdomain(row.original)}
                            title="View Details"
                        >
                            <FiEye />
                        </button>
                    )}
                    {canUpdate && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditSubdomain(row.original)}
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
                setSubdomains([]);
                setParentDomains([]);
                setHasFetchedInitialData(false);
                fetchAllSubdomains();
            }
        };

        window.addEventListener('eventSelected', handleEventSelected);

        return () => {
            window.removeEventListener('eventSelected', handleEventSelected);
        };
    }, [currentEventId, fetchAllSubdomains]);

    // Fetch subdomains on component mount only once if event ID is available
    useEffect(() => {
        const eventId = getEventId();
        if (eventId && !hasFetchedInitialData) {
            fetchAllSubdomains();
        }
    }, [getEventId, fetchAllSubdomains, hasFetchedInitialData]);

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
                    {canWrite && getEventId() && (
                        <Button
                            variant="contained"
                            onClick={() => setIsModalOpen(true)}
                            className="d-flex align-items-center gap-2 mx-auto"
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        >
                            <FiPlus /> Create Subdomain
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
            ) : subdomains.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={subdomains}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Create Subdomain Modal */}
            {canWrite && (
                <Modal show={isModalOpen} onHide={() => setIsModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Subdomain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleCreateSubdomain}>
                            <div className="mb-3">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                    name="name"
                                    value={newSubdomain.name}
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
                                    value={newSubdomain.description}
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
                                                value={newSubdomain.registrationFee}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                min="0.01"
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
                                            value={newSubdomain.participantLimit}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            min="1"
                                        />
                                        {formErrors.participantLimit && <div className="invalid-feedback">{formErrors.participantLimit}</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={newSubdomain.teamGame}
                                            onChange={(e) => handleTeamGameToggle(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Team Game"
                                />
                                <Form.Text className="text-muted">
                                    Enable if this subdomain requires team participation
                                </Form.Text>
                            </div>
                            {newSubdomain.teamGame && (
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Minimum Team Size *</label>
                                        <input
                                            type="number"
                                            className={`form-control ${formErrors.minTeamSize ? 'is-invalid' : ''}`}
                                            name="minTeamSize"
                                            value={newSubdomain.minTeamSize}
                                            onChange={handleInputChange}
                                            min="1"
                                        />
                                        {formErrors.minTeamSize && <div className="invalid-feedback">{formErrors.minTeamSize}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Maximum Team Size *</label>
                                        <input
                                            type="number"
                                            className={`form-control ${formErrors.maxTeamSize ? 'is-invalid' : ''}`}
                                            name="maxTeamSize"
                                            value={newSubdomain.maxTeamSize}
                                            onChange={handleInputChange}
                                            min="1"
                                        />
                                        {formErrors.maxTeamSize && <div className="invalid-feedback">{formErrors.maxTeamSize}</div>}
                                    </div>
                                </div>
                            )}
                            <div className="mb-3">
                                <label className="form-label">Parent Domain *</label>
                                <select
                                    className={`form-control ${formErrors.parentDomainId ? 'is-invalid' : ''}`}
                                    name="parentDomainId"
                                    value={newSubdomain.parentDomainId}
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
                            variant="contained"
                            onClick={handleCreateSubdomain}
                            disabled={creatingSubdomain}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        >
                            {creatingSubdomain ? (
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

            {/* Edit Subdomain Modal */}
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
                                    value={editSubdomain.name}
                                    onChange={handleEditInputChange}
                                />
                                {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description *</label>
                                <textarea
                                    className={`form-control ${editFormErrors.description ? 'is-invalid' : ''}`}
                                    name="description"
                                    value={editSubdomain.description}
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
                                                value={editSubdomain.registrationFee}
                                                onChange={handleEditInputChange}
                                                min="0.01"
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
                                            value={editSubdomain.participantLimit}
                                            onChange={handleEditInputChange}
                                            min="1"
                                        />
                                        {editFormErrors.participantLimit && <div className="invalid-feedback">{editFormErrors.participantLimit}</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={editSubdomain.teamGame}
                                            onChange={(e) => handleEditTeamGameToggle(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Team Game"
                                />
                                <Form.Text className="text-muted">
                                    Enable if this subdomain requires team participation
                                </Form.Text>
                            </div>
                            {editSubdomain.teamGame && (
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Minimum Team Size *</label>
                                        <input
                                            type="number"
                                            className={`form-control ${editFormErrors.minTeamSize ? 'is-invalid' : ''}`}
                                            name="minTeamSize"
                                            value={editSubdomain.minTeamSize}
                                            onChange={handleEditInputChange}
                                            min="1"
                                        />
                                        {editFormErrors.minTeamSize && <div className="invalid-feedback">{editFormErrors.minTeamSize}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Maximum Team Size *</label>
                                        <input
                                            type="number"
                                            className={`form-control ${editFormErrors.maxTeamSize ? 'is-invalid' : ''}`}
                                            name="maxTeamSize"
                                            value={editSubdomain.maxTeamSize}
                                            onChange={handleEditInputChange}
                                            min="1"
                                        />
                                        {editFormErrors.maxTeamSize && <div className="invalid-feedback">{editFormErrors.maxTeamSize}</div>}
                                    </div>
                                </div>
                            )}
                            <div className="mb-3">
                                <label className="form-label">Parent Domain *</label>
                                <select
                                    className={`form-control ${editFormErrors.parentDomainId ? 'is-invalid' : ''}`}
                                    name="parentDomainId"
                                    value={editSubdomain.parentDomainId}
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
                            variant="contained"
                            onClick={handleEditSubmit}
                            disabled={updatingSubdomain}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        >
                            {updatingSubdomain ? (
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

            {/* View Subdomain Modal */}
            {canRead && (
                <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Subdomain Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedSubdomain && (
                            <div>
                                <div className="mb-3">
                                    <h5>Name</h5>
                                    <p className="mb-0">{selectedSubdomain.name}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Description</h5>
                                    <p className="mb-0">{selectedSubdomain.description || '-'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Game Type</h5>
                                    <p className="mb-0">
                                        <span className={`badge ${selectedSubdomain.teamGame ? 'bg-primary' : 'bg-secondary'}`}>
                                            {getGameType(selectedSubdomain)}
                                        </span>
                                    </p>
                                </div>
                                {selectedSubdomain.teamGame && (
                                    <>
                                        <div className="mb-3">
                                            <h5>Team Size Range</h5>
                                            <p className="mb-0">{getTeamSizeRange(selectedSubdomain)}</p>
                                        </div>
                                        <div className="mb-3">
                                            <h5>Minimum Team Size</h5>
                                            <p className="mb-0">{selectedSubdomain.minTeamSize || '1'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <h5>Maximum Team Size</h5>
                                            <p className="mb-0">{selectedSubdomain.maxTeamSize || '1'}</p>
                                        </div>
                                    </>
                                )}
                                <div className="mb-3">
                                    <h5>Current Participants</h5>
                                    <p className="mb-0">{selectedSubdomain.currentParticipants?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Registered Count</h5>
                                    <p className="mb-0">{selectedSubdomain.registeredCount?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Waitlist Count</h5>
                                    <p className="mb-0">{selectedSubdomain.waitlistCount?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Registration Fee</h5>
                                    <p className="mb-0">{formatCurrency(selectedSubdomain.registrationFee)}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Participant Limit</h5>
                                    <p className="mb-0">{selectedSubdomain.participantLimit?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Parent Domain</h5>
                                    <p className="mb-0">{selectedSubdomain.parentDomainName || 'N/A'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Created At</h5>
                                    <p className="mb-0">{formatDate(selectedSubdomain.createdAt)}</p>
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
                        {subdomainToDelete && (
                            <>
                                <p>Are you sure you want to delete the subdomain <strong>{subdomainToDelete.name}</strong>?</p>
                                <p className="text-danger">This action cannot be undone.</p>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleDeleteSubdomain}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
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