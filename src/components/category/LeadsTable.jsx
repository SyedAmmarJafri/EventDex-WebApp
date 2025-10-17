import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';

const CategoriesTable = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        registrationFee: 0,
        participantLimit: 0,
        domainHeadId: '',
        parentDomainId: ''
    });
    const [editCategory, setEditCategory] = useState({
        id: '',
        name: '',
        description: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [updatingCategory, setUpdatingCategory] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState(false);
    const [currentEventId, setCurrentEventId] = useState(null);
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
    const getEventId = () => {
        // First try to get from localStorage (set by EventsDropdown)
        const savedEventId = localStorage.getItem('eventid');
        if (savedEventId) {
            return savedEventId;
        }

        // If not in localStorage, try to get from currentEventId state
        if (currentEventId) {
            return currentEventId;
        }

        // Fallback to checking if there's an event selected in the dropdown
        const eventData = JSON.parse(localStorage.getItem('selectedEvent'));
        if (eventData && eventData.id) {
            return eventData.id;
        }

        return null;
    };

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Description</th>
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
                <h5 className="mb-2">No Event Domains Found</h5>
                <p className="text-muted mb-4">No event domains are available for this event.</p>
                {canWrite && (
                    <Button
                        variant="contained"
                        startIcon={<FiPlus />}
                        onClick={() => setIsModalOpen(true)}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        Create New Domain
                    </Button>
                )}
            </div>
        );
    };

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found", {
                    position: "bottom-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                });
                return;
            }

            // Get event ID dynamically
            const eventId = getEventId();
            if (!eventId) {
                toast.error("Please select an event first", {
                    position: "bottom-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                });
                setLoading(false);
                return;
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
                const errorMessage = data.error || data.message || 'Failed to fetch event domains';
                throw new Error(errorMessage);
            }

            if (data.success && data.data) {
                // Transform the API response to match our table structure
                const transformedDomains = data.data.map(domain => ({
                    id: domain.id,
                    name: domain.name,
                    description: domain.description,
                    registrationFee: domain.registrationFee,
                    participantLimit: domain.participantLimit,
                    currentParticipants: domain.currentParticipants,
                    domainHeadName: domain.domainHeadName,
                    eventName: domain.eventName,
                    domainType: domain.domainType,
                    parentDomainName: domain.parentDomainName,
                    subDomains: domain.subDomains,
                    domainHeadId: domain.domainHeadId,
                    parentDomainId: domain.parentDomainId,
                    createdAt: domain.createdAt
                }));
                setCategories(transformedDomains);
            } else {
                const errorMessage = data.message || 'Failed to fetch event domains';
                throw new Error(errorMessage);
            }
        } catch (err) {
            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCategory(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditCategory(prev => ({
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
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateDomain = async (e) => {
        e.preventDefault();
        if (!validateForm(newCategory, setFormErrors)) return;

        try {
            setCreatingCategory(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                toast.error("Please select an event first", {
                    position: "bottom-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                });
                return;
            }

            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newCategory.name,
                    description: newCategory.description,
                    registrationFee: 0,
                    participantLimit: 0,
                    domainHeadId: null,
                    parentDomainId: null
                })
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMessage = data.error || data.message || 'Failed to create domain';
                throw new Error(errorMessage);
            }

            toast.success('Domain created successfully', {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            await fetchCategories();
            setIsModalOpen(false);
            setNewCategory({
                name: '',
                description: '',
                registrationFee: 0,
                participantLimit: 0,
                domainHeadId: '',
                parentDomainId: ''
            });
            setFormErrors({});
        } catch (err) {
            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editCategory, setEditFormErrors)) return;

        try {
            setUpdatingCategory(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                toast.error("Please select an event first", {
                    position: "bottom-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                });
                return;
            }

            // Use the update endpoint from your backend
            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains/${editCategory.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editCategory.name,
                    description: editCategory.description,
                    registrationFee: 0,
                    participantLimit: 0,
                    domainHeadId: null,
                    parentDomainId: null
                })
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMessage = data.error || data.message || 'Failed to update domain';
                throw new Error(errorMessage);
            }

            toast.success('Domain updated successfully', {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            await fetchCategories();
            setIsEditModalOpen(false);
            setEditFormErrors({});
        } catch (err) {
            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
        } finally {
            setUpdatingCategory(false);
        }
    };

    const handleViewCategory = (category) => {
        if (!canRead) return;
        setSelectedCategory(category);
        setIsViewModalOpen(true);
    };

    const handleEditCategory = (category) => {
        if (!canUpdate) return;
        setEditCategory({
            id: category.id,
            name: category.name,
            description: category.description
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (category) => {
        if (!canDelete) return;
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteCategory = async () => {
        try {
            setDeletingCategory(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const eventId = getEventId();

            if (!eventId) {
                toast.error("Please select an event first", {
                    position: "bottom-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                });
                return;
            }

            // Use the delete endpoint from your backend
            const response = await fetch(`${BASE_URL}/api/events/${eventId}/domains/${categoryToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMessage = data.error || data.message || 'Failed to delete domain';
                throw new Error(errorMessage);
            }

            toast.success('Domain deleted successfully', {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            await fetchCategories();
            setIsDeleteModalOpen(false);
        } catch (err) {
            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
            setIsDeleteModalOpen(false);
        } finally {
            setDeletingCategory(false);
        }
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
            accessorKey: 'currentParticipants',
            header: 'Current Participants',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    {canRead && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewCategory(row.original)}
                        >
                            <FiEye />
                        </button>
                    )}
                    {canUpdate && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditCategory(row.original)}
                        >
                            <FiEdit />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleDeleteClick(row.original)}
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
            if (eventDetail && eventDetail.id) {
                setCurrentEventId(eventDetail.id);
                localStorage.setItem('eventid', eventDetail.id);
                localStorage.setItem('selectedEvent', JSON.stringify(eventDetail));

                // Refresh categories when event changes
                fetchCategories();
            }
        };

        // Add event listener for custom event
        window.addEventListener('eventSelected', handleEventSelected);

        // Also check for existing event ID on component mount
        const existingEventId = getEventId();
        if (existingEventId) {
            setCurrentEventId(existingEventId);
        }

        return () => {
            window.removeEventListener('eventSelected', handleEventSelected);
        };
    }, [fetchCategories]);

    // Fetch categories on component mount if event ID is available
    useEffect(() => {
        const eventId = getEventId();
        if (eventId) {
            fetchCategories();
        }
    }, [fetchCategories]);

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
                <h4>Event Domains</h4>
                <div className="d-flex align-items-center gap-3">
                    {canWrite && getEventId() && (
                        <Button
                            variant="contained"
                            onClick={() => setIsModalOpen(true)}
                            className="d-flex align-items-center gap-2 mx-auto"
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        >
                            <FiPlus /> Create Domain
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
                    <p className="text-muted">Please select an event from the dropdown to view domains.</p>
                </div>
            ) : loading ? (
                <SkeletonLoader />
            ) : categories.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={categories}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Create Domain Modal */}
            {canWrite && (
                <Modal show={isModalOpen} onHide={() => setIsModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Domain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleCreateDomain}>
                            <div className="mb-3">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                    name="name"
                                    value={newCategory.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter domain name"
                                />
                                {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description *</label>
                                <textarea
                                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                                    name="description"
                                    value={newCategory.description}
                                    onChange={handleInputChange}
                                    placeholder="Enter domain description"
                                    rows="3"
                                />
                                {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleCreateDomain}
                            disabled={creatingCategory}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        >
                            {creatingCategory ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Creating...
                                </>
                            ) : (
                                'Create Domain'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Edit Domain Modal */}
            {canUpdate && (
                <Modal show={isEditModalOpen} onHide={() => setIsEditModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Domain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleEditSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                    name="name"
                                    value={editCategory.name}
                                    onChange={handleEditInputChange}
                                />
                                {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description *</label>
                                <textarea
                                    className={`form-control ${editFormErrors.description ? 'is-invalid' : ''}`}
                                    name="description"
                                    value={editCategory.description}
                                    onChange={handleEditInputChange}
                                    rows="3"
                                />
                                {editFormErrors.description && <div className="invalid-feedback">{editFormErrors.description}</div>}
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleEditSubmit}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={updatingCategory}
                        >
                            {updatingCategory ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Updating...
                                </>
                            ) : (
                                'Update Domain'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* View Domain Modal */}
            {canRead && (
                <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Domain Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedCategory && (
                            <div>
                                <div className="mb-3">
                                    <h5>Name</h5>
                                    <p className="mb-0">{selectedCategory.name}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Description</h5>
                                    <p className="mb-0">{selectedCategory.description || '-'}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Current Participants</h5>
                                    <p className="mb-0">{selectedCategory.currentParticipants}</p>
                                </div>
                                <div className="mb-3">
                                    <h5>Created At</h5>
                                    <p className="mb-0">{formatDate(selectedCategory.createdAt)}</p>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {canDelete && (
                <Modal show={isDeleteModalOpen} onHide={() => {
                    if (!deletingCategory) {
                        setIsDeleteModalOpen(false);
                    }
                }} centered>
                    <Modal.Header closeButton={!deletingCategory}>
                        <Modal.Title>Delete Domain</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {categoryToDelete && (
                            <>
                                <p>Are you sure you want to delete the domain <strong>{categoryToDelete.name}</strong>?</p>
                                <p className="text-danger">This action cannot be undone.</p>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleDeleteCategory}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={deletingCategory}
                        >
                            {deletingCategory ? (
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

export default CategoriesTable;