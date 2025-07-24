import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Switch from '@mui/material/Switch';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

const TeamTable = () => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamToDelete, setTeamToDelete] = useState(null);
    const [newTeam, setNewTeam] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        roleId: '',
        active: true
    });
    const [editTeam, setEditTeam] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        phone: '',
        roleId: '',
        active: true
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [roles, setRoles] = useState([]);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Email</th>
                            <th scope="col">Phone</th>
                            <th scope="col">Status</th>
                            <th scope="col" className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, index) => (
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
                                        width={120}
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
                <h5 className="mb-2">No Team Members Found</h5>
                <p className="text-muted mb-4">You haven't added any team members yet. Start by adding a new team member.</p>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2 mx-auto"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Team Member
                </Button>
            </div>
        );
    };

    const fetchTeam = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                setLoading(false);
                return;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/staff-users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch team');
            }

            if (Array.isArray(data)) {
                setTeam(data);
            } else if (data.data && Array.isArray(data.data)) {
                setTeam(data.data);
            } else if (data.status === 200 && data.data) {
                setTeam(data.data);
            } else {
                throw new Error('Invalid team data format received');
            }
        } catch (err) {
            console.error('Error fetching team:', err);
            toast.error(err.message || 'Failed to load team');
            setTeam([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) return;

            const response = await fetch(`${BASE_URL}/api/client-admin/roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch roles');
            }

            if (Array.isArray(data)) {
                setRoles(data);
            } else if (data.data && Array.isArray(data.data)) {
                setRoles(data.data);
            } else if (data.status === 200 && data.data) {
                setRoles(data.data);
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTeam(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditTeam(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleStatusToggle = (isNewTeam) => (e) => {
        const checked = e.target.checked;
        if (isNewTeam) {
            setNewTeam(prev => ({ ...prev, active: checked }));
        } else {
            setEditTeam(prev => ({ ...prev, active: checked }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';
        if (!formData.phone.trim()) errors.phone = 'Phone is required';
        if (!formData.roleId) errors.roleId = 'Role is required';
        
        // Only validate password for new team (edit form might not change password)
        if (formData === newTeam && !formData.password.trim()) {
            errors.password = 'Password is required';
        }
        if (formData === newTeam && formData.password.length < 3) {
            errors.password = 'Password must be at least 3 characters';
        }
        
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newTeam, setFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/client-admin/staff-users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newTeam.name,
                    email: newTeam.email,
                    password: newTeam.password,
                    phone: newTeam.phone,
                    roleId: newTeam.roleId,
                    active: newTeam.active
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create team member');
            }

            toast.success('Team member created successfully');
            await fetchTeam();
            setIsModalOpen(false);
            setNewTeam({
                name: '',
                email: '',
                password: '',
                phone: '',
                roleId: '',
                active: true
            });
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editTeam, setEditFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const requestBody = {
                name: editTeam.name,
                email: editTeam.email,
                phone: editTeam.phone,
                roleId: editTeam.roleId,
                active: editTeam.active
            };

            // Only include password if it's been changed
            if (editTeam.password) {
                requestBody.password = editTeam.password;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/staff-users/${editTeam.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update team member');
            }

            toast.success('Team member updated successfully');
            await fetchTeam();
            setIsEditModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleViewTeam = (team) => {
        setSelectedTeam(team);
        setIsViewModalOpen(true);
    };

    const handleEditTeam = (team) => {
        setEditTeam({
            id: team.id,
            name: team.name,
            email: team.email,
            password: '', // Empty by default, only set if changing
            phone: team.phone,
            roleId: team.roleId,
            active: team.active
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (team) => {
        setTeamToDelete(team);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            // Optimistic update
            setTeam(prev => prev.filter(team => team.id !== teamToDelete.id));
            setIsDeleteModalOpen(false);

            const response = await fetch(`${BASE_URL}/api/client-admin/staff-users/${teamToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete team member');
            }

            toast.success('Team member deleted successfully');
            await fetchTeam(); // Refresh data to ensure consistency
        } catch (err) {
            // Revert on error
            setTeam(prev => [...prev, teamToDelete]);
            toast.error(err.message);
        } finally {
            setTeamToDelete(null);
        }
    };

    const getRoleName = (roleId) => {
        const role = roles.find(r => r.id === roleId);
        return role ? role.name : 'Unknown Role';
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'phone',
            header: 'Phone',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'roleId',
            header: 'Role',
            cell: (info) => getRoleName(info.getValue())
        },
        {
            accessorKey: 'active',
            header: 'Status',
            cell: (info) => (
                <div className="d-flex align-items-center gap-2">
                    <h8 className={`badge ${info.getValue() ? 'bg-success' : 'bg-danger'}`}>
                        {info.getValue() ? 'Active' : 'Inactive'}
                    </h8>
                </div>
            )
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleViewTeam(row.original)}
                        title="View"
                    >
                        <FiEye />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditTeam(row.original)}
                        title="Edit"
                    >
                        <FiEdit />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleDeleteClick(row.original)}
                        title="Delete"
                    >
                        <FiTrash />
                    </button>
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], [roles]);

    useEffect(() => {
        fetchTeam();
        fetchRoles();
    }, [fetchTeam, fetchRoles]);

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
                <h4>Team Management</h4>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Team Member
                </Button>
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : team.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={team}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Add Team Member Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewTeam({ name: '', email: '', password: '', phone: '', roleId: '', active: true });
                setFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add New Team Member</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="name" className="form-label">Name*</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                id="name"
                                name="name"
                                value={newTeam.name}
                                onChange={handleInputChange}
                                placeholder="Enter team member name"
                            />
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email*</label>
                            <input
                                type="email"
                                className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                                id="email"
                                name="email"
                                value={newTeam.email}
                                onChange={handleInputChange}
                                placeholder="Enter team member email"
                            />
                            {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password*</label>
                            <input
                                type="password"
                                className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                                id="password"
                                name="password"
                                value={newTeam.password}
                                onChange={handleInputChange}
                                placeholder="Enter password (min 3 characters)"
                            />
                            {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="phone" className="form-label">Phone*</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                                id="phone"
                                name="phone"
                                value={newTeam.phone}
                                onChange={handleInputChange}
                                placeholder="Enter team member phone number"
                            />
                            {formErrors.phone && <div className="invalid-feedback">{formErrors.phone}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="roleId" className="form-label">Role*</label>
                            <select
                                className={`form-select ${formErrors.roleId ? 'is-invalid' : ''}`}
                                id="roleId"
                                name="roleId"
                                value={newTeam.roleId}
                                onChange={handleInputChange}
                            >
                                <option value="">Select a role</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                            {formErrors.roleId && <div className="invalid-feedback">{formErrors.roleId}</div>}
                        </div>
                        <div className="mb-3">
                            <Form.Group controlId="formActiveStatus">
                                <Form.Label>Status</Form.Label>
                                <div className="d-flex align-items-center">
                                    <Switch
                                        checked={newTeam.active}
                                        onChange={handleStatusToggle(true)}
                                        color="primary"
                                    />
                                    <h8 className="ms-2">
                                        {newTeam.active ? 'Active' : 'Inactive'}
                                    </h8>
                                </div>
                            </Form.Group>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Add Team Member
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Team Member Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Team Member: {editTeam.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleEditSubmit}>
                        <div className="mb-3">
                            <label htmlFor="edit-name" className="form-label">Name*</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                id="edit-name"
                                name="name"
                                value={editTeam.name}
                                onChange={handleEditInputChange}
                                placeholder="Enter team member name"
                            />
                            {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-email" className="form-label">Email*</label>
                            <input
                                type="email"
                                className={`form-control ${editFormErrors.email ? 'is-invalid' : ''}`}
                                id="edit-email"
                                name="email"
                                value={editTeam.email}
                                onChange={handleEditInputChange}
                                placeholder="Enter team member email"
                            />
                            {editFormErrors.email && <div className="invalid-feedback">{editFormErrors.email}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-password" className="form-label">Password (leave blank to keep current)</label>
                            <input
                                type="password"
                                className={`form-control ${editFormErrors.password ? 'is-invalid' : ''}`}
                                id="edit-password"
                                name="password"
                                value={editTeam.password}
                                onChange={handleEditInputChange}
                                placeholder="Enter new password (min 3 characters)"
                            />
                            {editFormErrors.password && <div className="invalid-feedback">{editFormErrors.password}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-phone" className="form-label">Phone*</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.phone ? 'is-invalid' : ''}`}
                                id="edit-phone"
                                name="phone"
                                value={editTeam.phone}
                                onChange={handleEditInputChange}
                                placeholder="Enter team member phone number"
                            />
                            {editFormErrors.phone && <div className="invalid-feedback">{editFormErrors.phone}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-roleId" className="form-label">Role*</label>
                            <select
                                className={`form-select ${editFormErrors.roleId ? 'is-invalid' : ''}`}
                                id="edit-roleId"
                                name="roleId"
                                value={editTeam.roleId}
                                onChange={handleEditInputChange}
                            >
                                <option value="">Select a role</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                            {editFormErrors.roleId && <div className="invalid-feedback">{editFormErrors.roleId}</div>}
                        </div>
                        <div className="mb-3">
                            <Form.Group controlId="formEditActiveStatus">
                                <Form.Label>Status</Form.Label>
                                <div className="d-flex align-items-center">
                                    <Switch
                                        checked={editTeam.active}
                                        onChange={handleStatusToggle(false)}
                                        color="primary"
                                    />
                                    <h8 className="ms-2">
                                        {editTeam.active ? 'Active' : 'Inactive'}
                                    </h8>
                                </div>
                            </Form.Group>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleEditSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Update Team Member
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View Team Member Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Team Member Details: {selectedTeam?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTeam && (
                        <div>
                            <div className="mb-4">
                                <h5>Name</h5>
                                <h8 className="fs-6">{selectedTeam.name}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Email</h5>
                                <h8 className="fs-6">{selectedTeam.email}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Phone</h5>
                                <h8 className="fs-6">{selectedTeam.phone}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Role</h5>
                                <h8 className="fs-6">{getRoleName(selectedTeam.roleId)}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Status</h5>
                                <h8 className="fs-6">
                                    <span className={`badge ${selectedTeam.active ? 'bg-success' : 'bg-danger'}`}>
                                        {selectedTeam.active ? 'Active' : 'Inactive'}
                                    </span>
                                </h8>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onHide={() => setIsDeleteModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {teamToDelete && (
                        <>
                            <h8>Are you sure you want to delete the team member <strong>{teamToDelete.name}</strong>? </h8>
                            <h8>This action cannot be undone and will remove all associated data.</h8>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteTeam}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        Delete Team Member
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default TeamTable;