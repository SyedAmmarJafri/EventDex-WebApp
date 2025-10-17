import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye, FiCalendar } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Switch from '@mui/material/Switch';
import Modal from 'react-bootstrap/Modal';
import { format, parseISO, isBefore, isAfter } from 'date-fns';

const EventsTable = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        eventDate: '',
        registrationDeadline: '',
        venue: ''
    });
    const [editEvent, setEditEvent] = useState({
        id: '',
        title: '',
        description: '',
        eventDate: '',
        registrationDeadline: '',
        venue: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const authData = JSON.parse(localStorage.getItem("authData"));
    const userRole = authData?.role;
    const userPermissions = authData?.permissions || [];

    // Check permissions - adjust these based on your actual permission names
    const canRead = userRole === 'PATRON' || userPermissions.includes('EVENT_READ');
    const canWrite = userRole === 'PATRON' || userPermissions.includes('EVENT_WRITE');
    const canUpdate = userRole === 'PATRON' || userPermissions.includes('EVENT_UPDATE');
    const canDelete = userRole === 'PATRON' || userPermissions.includes('EVENT_DELETE');

    // Helper functions
    const isEventActive = (eventDate) => {
        return isAfter(parseISO(eventDate), new Date());
    };

    const isRegistrationOpen = (registrationDeadline) => {
        return isAfter(parseISO(registrationDeadline), new Date());
    };

    const getAuthHeaders = () => {
        const authData = JSON.parse(localStorage.getItem("authData"));
        return {
            'Authorization': `Bearer ${authData?.token}`,
            'Content-Type': 'application/json'
        };
    };

    // Skeleton Loader
    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Title</th>
                            <th scope="col">Event Date</th>
                            <th scope="col">Registration Deadline</th>
                            <th scope="col">Venue</th>
                            <th scope="col">Status</th>
                            {canRead && <th scope="col" className="text-end">Actions</th>}
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
                                        width={120}
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
                                        width={80}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                {canRead && (
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
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Empty State
    const EmptyState = () => {
        return (
            <div className="text-center py-5" style={{ minHeight: '460px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div className="mb-4">
                    <FiCalendar size={64} color={isDarkMode ? "#4a5568" : "#d9d9d9"} />
                </div>
                <h5 className="mb-2">No Events Found</h5>
                <p className="text-muted mb-4">You haven't created any events yet. Start by adding a new event.</p>
                {canWrite && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Create Event
                    </Button>
                )}
            </div>
        );
    };

    // API Functions
    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/events`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch events');
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setEvents(data);
            } else if (data.data && Array.isArray(data.data)) {
                setEvents(data.data);
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createEvent = async (eventData) => {
        const response = await fetch(`${BASE_URL}/api/events`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create event');
        }

        return await response.json();
    };

    const updateEvent = async (eventId, eventData) => {
        const response = await fetch(`${BASE_URL}/api/events/${eventId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update event');
        }

        return await response.json();
    };

    const deleteEvent = async (eventId) => {
        const response = await fetch(`${BASE_URL}/api/events/${eventId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete event');
        }

        return await response.json();
    };

    // Event Handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEvent(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditEvent(prev => ({
            ...prev,
            [name]: value
        }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        
        if (!formData.title.trim()) errors.title = 'Title is required';
        if (!formData.eventDate) errors.eventDate = 'Event date is required';
        if (!formData.registrationDeadline) errors.registrationDeadline = 'Registration deadline is required';
        if (!formData.venue.trim()) errors.venue = 'Venue is required';
        
        if (formData.eventDate && formData.registrationDeadline) {
            if (new Date(formData.registrationDeadline) > new Date(formData.eventDate)) {
                errors.registrationDeadline = 'Registration deadline must be before event date';
            }
        }

        if (new Date(formData.eventDate) < new Date()) {
            errors.eventDate = 'Event date cannot be in the past';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newEvent, setFormErrors)) return;

        try {
            setCreating(true);
            
            const eventData = {
                title: newEvent.title,
                description: newEvent.description,
                eventDate: `${newEvent.eventDate}T10:00:00`, // Default time, adjust as needed
                registrationDeadline: `${newEvent.registrationDeadline}T23:59:00`,
                venue: newEvent.venue
            };

            await createEvent(eventData);
            
            toast.success('Event created successfully');
            await fetchEvents();
            setIsModalOpen(false);
            setNewEvent({
                title: '',
                description: '',
                eventDate: '',
                registrationDeadline: '',
                venue: ''
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editEvent, setEditFormErrors)) return;

        try {
            setUpdating(true);
            
            const eventData = {
                title: editEvent.title,
                description: editEvent.description,
                eventDate: `${editEvent.eventDate}T10:00:00`,
                registrationDeadline: `${editEvent.registrationDeadline}T23:59:00`,
                venue: editEvent.venue
            };

            await updateEvent(editEvent.id, eventData);
            
            toast.success('Event updated successfully');
            await fetchEvents();
            setIsEditModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleViewEvent = (event) => {
        setSelectedEvent(event);
        setIsViewModalOpen(true);
    };

    const handleEditEvent = (event) => {
        setEditEvent({
            id: event.id,
            title: event.title,
            description: event.description,
            eventDate: event.eventDate.split('T')[0],
            registrationDeadline: event.registrationDeadline.split('T')[0],
            venue: event.venue
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (event) => {
        setEventToDelete(event);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteEvent = async () => {
        try {
            setDeleting(true);
            await deleteEvent(eventToDelete.id);
            toast.success('Event deleted successfully');
            await fetchEvents();
            setIsDeleteModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const formatDateTime = (dateString) => {
        try {
            const date = parseISO(dateString);
            return format(date, 'MMM dd, yyyy HH:mm');
        } catch (error) {
            return dateString;
        }
    };

    const formatDateOnly = (dateString) => {
        try {
            const date = parseISO(dateString);
            return format(date, 'MMM dd, yyyy');
        } catch (error) {
            return dateString;
        }
    };

    // Table Columns
    const columns = React.useMemo(() => [
        {
            accessorKey: 'title',
            header: 'Title',
            cell: (info) => (
                <span className="fw-bold">{info.getValue()}</span>
            )
        },
        {
            accessorKey: 'eventDate',
            header: 'Event Date',
            cell: (info) => formatDateTime(info.getValue())
        },
        {
            accessorKey: 'registrationDeadline',
            header: 'Registration Deadline',
            cell: (info) => {
                const isOpen = isRegistrationOpen(info.getValue());
                return (
                    <span style={{ color: isOpen ? 'inherit' : 'red' }}>
                        {formatDateTime(info.getValue())}
                        {!isOpen && (
                            <span className="ms-1" title="Registration closed">🔒</span>
                        )}
                    </span>
                );
            }
        },
        {
            accessorKey: 'venue',
            header: 'Venue',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'eventDate',
            header: 'Status',
            cell: (info) => {
                const isActive = isEventActive(info.getValue());
                return (
                    <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {isActive ? 'Upcoming' : 'Completed'}
                    </span>
                );
            }
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    {canRead && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewEvent(row.original)}
                        >
                            <FiEye />
                        </button>
                    )}
                    {canUpdate && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditEvent(row.original)}
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

    useEffect(() => {
        if (canRead) {
            fetchEvents();
        }
    }, [fetchEvents, canRead]);

    if (!canRead) {
        return (
            <div className="text-center py-5">
                <h5>Access Denied</h5>
                <p>You don't have permission to view events.</p>
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
                <h4>Events Management</h4>
                {canWrite && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Create Event
                    </Button>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : events.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={events}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                    rowStyle={(row) => {
                        const isActive = isEventActive(row.original.eventDate);
                        return {
                            style: {
                                backgroundColor: !isActive ? 'rgba(0, 0, 0, 0.02)' : 'inherit'
                            }
                        };
                    }}
                />
            )}

            {/* Create Event Modal */}
            {canWrite && (
                <Modal show={isModalOpen} onHide={() => {
                    setIsModalOpen(false);
                    setNewEvent({
                        title: '',
                        description: '',
                        eventDate: '',
                        registrationDeadline: '',
                        venue: ''
                    });
                    setFormErrors({});
                }} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Event</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="title" className="form-label">Event Title *</label>
                                <input
                                    type="text"
                                    className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                                    id="title"
                                    name="title"
                                    value={newEvent.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter event title"
                                />
                                {formErrors.title && <div className="invalid-feedback">{formErrors.title}</div>}
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Description</label>
                                <textarea
                                    className="form-control"
                                    id="description"
                                    name="description"
                                    value={newEvent.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Enter event description"
                                />
                            </div>
                            
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="eventDate" className="form-label">Event Date *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${formErrors.eventDate ? 'is-invalid' : ''}`}
                                        id="eventDate"
                                        name="eventDate"
                                        value={newEvent.eventDate}
                                        onChange={handleInputChange}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    {formErrors.eventDate && <div className="invalid-feedback">{formErrors.eventDate}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="registrationDeadline" className="form-label">Registration Deadline *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${formErrors.registrationDeadline ? 'is-invalid' : ''}`}
                                        id="registrationDeadline"
                                        name="registrationDeadline"
                                        value={newEvent.registrationDeadline}
                                        onChange={handleInputChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        max={newEvent.eventDate}
                                    />
                                    {formErrors.registrationDeadline && <div className="invalid-feedback">{formErrors.registrationDeadline}</div>}
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="venue" className="form-label">Venue *</label>
                                <input
                                    type="text"
                                    className={`form-control ${formErrors.venue ? 'is-invalid' : ''}`}
                                    id="venue"
                                    name="venue"
                                    value={newEvent.venue}
                                    onChange={handleInputChange}
                                    placeholder="Enter event venue"
                                />
                                {formErrors.venue && <div className="invalid-feedback">{formErrors.venue}</div>}
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={creating}
                        >
                            {creating ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Creating...
                                </>
                            ) : (
                                'Create Event'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Edit Event Modal */}
            {canUpdate && (
                <Modal show={isEditModalOpen} onHide={() => {
                    setIsEditModalOpen(false);
                    setEditFormErrors({});
                }} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Event</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleEditSubmit}>
                            <div className="mb-3">
                                <label htmlFor="edit-title" className="form-label">Event Title *</label>
                                <input
                                    type="text"
                                    className={`form-control ${editFormErrors.title ? 'is-invalid' : ''}`}
                                    id="edit-title"
                                    name="title"
                                    value={editEvent.title}
                                    onChange={handleEditInputChange}
                                />
                                {editFormErrors.title && <div className="invalid-feedback">{editFormErrors.title}</div>}
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="edit-description" className="form-label">Description</label>
                                <textarea
                                    className="form-control"
                                    id="edit-description"
                                    name="description"
                                    value={editEvent.description}
                                    onChange={handleEditInputChange}
                                    rows="3"
                                />
                            </div>
                            
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-eventDate" className="form-label">Event Date *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${editFormErrors.eventDate ? 'is-invalid' : ''}`}
                                        id="edit-eventDate"
                                        name="eventDate"
                                        value={editEvent.eventDate}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.eventDate && <div className="invalid-feedback">{editFormErrors.eventDate}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-registrationDeadline" className="form-label">Registration Deadline *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${editFormErrors.registrationDeadline ? 'is-invalid' : ''}`}
                                        id="edit-registrationDeadline"
                                        name="registrationDeadline"
                                        value={editEvent.registrationDeadline}
                                        onChange={handleEditInputChange}
                                        max={editEvent.eventDate}
                                    />
                                    {editFormErrors.registrationDeadline && <div className="invalid-feedback">{editFormErrors.registrationDeadline}</div>}
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="edit-venue" className="form-label">Venue *</label>
                                <input
                                    type="text"
                                    className={`form-control ${editFormErrors.venue ? 'is-invalid' : ''}`}
                                    id="edit-venue"
                                    name="venue"
                                    value={editEvent.venue}
                                    onChange={handleEditInputChange}
                                />
                                {editFormErrors.venue && <div className="invalid-feedback">{editFormErrors.venue}</div>}
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleEditSubmit}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={updating}
                        >
                            {updating ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Updating...
                                </>
                            ) : (
                                'Update Event'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* View Event Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Event Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvent && (
                        <div>
                            <div className="row mb-3">
                                <div className="col-12">
                                    <h5>Title</h5>
                                    <p className="fs-6">{selectedEvent.title}</p>
                                </div>
                            </div>
                            
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Event Date</h5>
                                    <p className="fs-6">{formatDateTime(selectedEvent.eventDate)}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Registration Deadline</h5>
                                    <p className="fs-6" style={{ 
                                        color: isRegistrationOpen(selectedEvent.registrationDeadline) ? 'inherit' : 'red' 
                                    }}>
                                        {formatDateTime(selectedEvent.registrationDeadline)}
                                        {!isRegistrationOpen(selectedEvent.registrationDeadline) && (
                                            <span className="ms-1" title="Registration closed">🔒</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="row mb-3">
                                <div className="col-12">
                                    <h5>Venue</h5>
                                    <p className="fs-6">{selectedEvent.venue}</p>
                                </div>
                            </div>
                            
                            <div className="row mb-3">
                                <div className="col-12">
                                    <h5>Status</h5>
                                    <span className={`badge ${isEventActive(selectedEvent.eventDate) ? 'bg-success' : 'bg-secondary'}`}>
                                        {isEventActive(selectedEvent.eventDate) ? 'Upcoming' : 'Completed'}
                                    </span>
                                </div>
                            </div>
                            
                            {selectedEvent.description && (
                                <div className="mb-3">
                                    <h5>Description</h5>
                                    <p className="fs-6">{selectedEvent.description}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            {canDelete && (
                <Modal show={isDeleteModalOpen} onHide={() => {
                    if (!deleting) {
                        setIsDeleteModalOpen(false);
                    }
                }} centered>
                    <Modal.Header closeButton={!deleting}>
                        <Modal.Title>Delete Event</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {eventToDelete && (
                            <>
                                <p>Are you sure you want to delete the event <strong>"{eventToDelete.title}"</strong>?</p>
                                <p className="text-muted">This action cannot be undone.</p>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleDeleteEvent}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Deleting...
                                </>
                            ) : (
                                'Delete Event'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    );
};

export default EventsTable;