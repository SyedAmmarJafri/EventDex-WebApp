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
import Form from 'react-bootstrap/Form';

const TeamTable = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleId: ''
    });
    const [editUser, setEditUser] = useState({
        id: '',
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleId: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [roles, setRoles] = useState([]);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Get user role from authData - only PATRON can access
    const authData = JSON.parse(localStorage.getItem("authData"));
    const userRole = authData?.role;
    const isPatron = userRole === 'PATRON';

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Username</th>
                            <th scope="col">Name</th>
                            <th scope="col">Email</th>
                            <th scope="col">Phone</th>
                            <th scope="col">Role</th>
                            <th scope="col">Status</th>
                            {isPatron && <th scope="col" className="text-end">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, index) => (
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
                                        width={180}
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
                                {isPatron && (
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
                <h5 className="mb-2">No Users Found</h5>
                <p className="text-muted mb-4">You haven&apos;t added any users yet. Start by adding a new user.</p>
                {isPatron && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Add User
                    </Button>
                )}
            </div>
        );
    };

    // Fetch all users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                setLoading(false);
                return;
            }

            const response = await fetch(`${BASE_URL}/api/admin/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch users');
            }

            if (data.success && Array.isArray(data.data)) {
                setUsers(data.data);
            } else {
                throw new Error('Invalid users data format received');
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error(err.message || 'Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch custom roles for dropdown
    const fetchCustomRoles = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) return;

            const response = await fetch(`${BASE_URL}/api/admin/roles/custom`, {
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

            if (data.success && Array.isArray(data.data)) {
                setRoles(data.data);
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
            toast.error('Failed to load roles');
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditUser(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors, isEdit = false) => {
        const errors = {};
        
        if (!formData.username.trim()) errors.username = 'Username is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.phone.trim()) errors.phone = 'Phone is required';
        if (!formData.roleId) errors.roleId = 'Role is required';

        // Password validation
        if (!isEdit && !formData.password.trim()) {
            errors.password = 'Password is required';
        }
        if (!isEdit && formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!validateForm(newUser, setFormErrors, false)) return;

        try {
            setCreating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: newUser.username,
                    email: newUser.email,
                    password: newUser.password,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    phone: newUser.phone,
                    roleId: newUser.roleId
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create user');
            }

            toast.success('User created successfully');
            await fetchUsers();
            setIsModalOpen(false);
            setNewUser({
                username: '',
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                phone: '',
                roleId: ''
            });
            setFormErrors({});
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!validateForm(editUser, setEditFormErrors, true)) return;

        try {
            setUpdating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const requestBody = {
                username: editUser.username,
                email: editUser.email,
                firstName: editUser.firstName,
                lastName: editUser.lastName,
                phone: editUser.phone,
                roleId: editUser.roleId
            };

            // Only include password if provided
            if (editUser.password && editUser.password.trim() !== '') {
                requestBody.password = editUser.password;
            }

            const response = await fetch(`${BASE_URL}/api/admin/users/${editUser.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update user');
            }

            toast.success('User updated successfully');
            await fetchUsers();
            setIsEditModalOpen(false);
            setEditFormErrors({});
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleViewUser = (user) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditUser({
            id: user.id,
            username: user.username,
            email: user.email,
            password: '', // Empty by default, only set if changing
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            roleId: getRoleIdByName(user.roleName)
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            setDeleting(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete user');
            }

            toast.success('User deleted successfully');
            await fetchUsers();
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
        }
    };

    // Helper function to get role ID by role name
    const getRoleIdByName = (roleName) => {
        const role = roles.find(r => r.name === roleName);
        return role ? role.id : '';
    };

    const columns = React.useMemo(() => {
        const baseColumns = [
            {
                accessorKey: 'username',
                header: 'Username',
                cell: (info) => info.getValue()
            },
            {
                accessorKey: 'firstName',
                header: 'Name',
                cell: (info) => `${info.row.original.firstName} ${info.row.original.lastName}`
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: (info) => info.getValue()
            },
            {
                accessorKey: 'phone',
                header: 'Phone',
                cell: (info) => info.getValue() || '-'
            },
            {
                accessorKey: 'roleName',
                header: 'Role',
                cell: (info) => info.getValue()
            },
            {
                accessorKey: 'active',
                header: 'Status',
                cell: (info) => (
                    <span className={`badge ${info.getValue() ? 'bg-success' : 'bg-danger'}`}>
                        {info.getValue() ? 'Active' : 'Inactive'}
                    </span>
                )
            }
        ];

        if (isPatron) {
            baseColumns.push({
                accessorKey: 'actions',
                header: "Actions",
                cell: ({ row }) => (
                    <div className="hstack gap-2 justify-content-end">
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewUser(row.original)}
                            title="View Details"
                        >
                            <FiEye />
                        </button>
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditUser(row.original)}
                            title="Edit User"
                        >
                            <FiEdit />
                        </button>
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleDeleteClick(row.original)}
                            title="Delete User"
                        >
                            <FiTrash />
                        </button>
                    </div>
                ),
                meta: { headerClassName: 'text-end' }
            });
        }

        return baseColumns;
    }, [roles, isPatron]);

    useEffect(() => {
        fetchUsers();
        fetchCustomRoles();
    }, [fetchUsers, fetchCustomRoles]);

    if (!isPatron) {
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
                <h5 className="mb-2">Access Denied</h5>
                <p className="text-muted mb-4">Only PATRON users can manage users.</p>
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
                <div>
                    <h4>User Management</h4>
                </div>
                {isPatron && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Add User
                    </Button>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : users.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={users}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Add User Modal */}
            <Modal show={isModalOpen} onHide={() => {
                if (!creating) {
                    setIsModalOpen(false);
                    setNewUser({
                        username: '',
                        email: '',
                        password: '',
                        firstName: '',
                        lastName: '',
                        phone: '',
                        roleId: ''
                    });
                    setFormErrors({});
                }
            }} centered size="lg">
                <Modal.Header closeButton={!creating}>
                    <Modal.Title>Add New User</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreateUser}>
                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="username" className="form-label">Username*</label>
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.username ? 'is-invalid' : ''}`}
                                        id="username"
                                        name="username"
                                        value={newUser.username}
                                        onChange={handleInputChange}
                                        placeholder="Enter username"
                                        disabled={creating}
                                    />
                                    {formErrors.username && <div className="invalid-feedback">{formErrors.username}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">Email*</label>
                                    <input
                                        type="email"
                                        className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                                        id="email"
                                        name="email"
                                        value={newUser.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter email"
                                        disabled={creating}
                                    />
                                    {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="firstName" className="form-label">First Name*</label>
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.firstName ? 'is-invalid' : ''}`}
                                        id="firstName"
                                        name="firstName"
                                        value={newUser.firstName}
                                        onChange={handleInputChange}
                                        placeholder="Enter first name"
                                        disabled={creating}
                                    />
                                    {formErrors.firstName && <div className="invalid-feedback">{formErrors.firstName}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="lastName" className="form-label">Last Name*</label>
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.lastName ? 'is-invalid' : ''}`}
                                        id="lastName"
                                        name="lastName"
                                        value={newUser.lastName}
                                        onChange={handleInputChange}
                                        placeholder="Enter last name"
                                        disabled={creating}
                                    />
                                    {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="phone" className="form-label">Phone*</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                                id="phone"
                                name="phone"
                                value={newUser.phone}
                                onChange={handleInputChange}
                                placeholder="Enter phone number"
                                disabled={creating}
                            />
                            {formErrors.phone && <div className="invalid-feedback">{formErrors.phone}</div>}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password*</label>
                            <input
                                type="password"
                                className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                                id="password"
                                name="password"
                                value={newUser.password}
                                onChange={handleInputChange}
                                placeholder="Enter password (min 6 characters)"
                                disabled={creating}
                            />
                            {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="roleId" className="form-label">Role*</label>
                            <select
                                className={`form-select ${formErrors.roleId ? 'is-invalid' : ''}`}
                                id="roleId"
                                name="roleId"
                                value={newUser.roleId}
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
                                disabled={creating}
                            >
                                <option value="">Select a role</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {formErrors.roleId && <div className="invalid-feedback">{formErrors.roleId}</div>}
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleCreateUser}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        disabled={creating}
                    >
                        {creating ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating...
                            </>
                        ) : (
                            'Create User'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit User Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                if (!updating) {
                    setIsEditModalOpen(false);
                    setEditFormErrors({});
                }
            }} centered size="lg">
                <Modal.Header closeButton={!updating}>
                    <Modal.Title>Edit User: {editUser.username}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleUpdateUser}>
                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="edit-username" className="form-label">Username*</label>
                                    <input
                                        type="text"
                                        className={`form-control ${editFormErrors.username ? 'is-invalid' : ''}`}
                                        id="edit-username"
                                        name="username"
                                        value={editUser.username}
                                        onChange={handleEditInputChange}
                                        placeholder="Enter username"
                                        disabled={updating}
                                    />
                                    {editFormErrors.username && <div className="invalid-feedback">{editFormErrors.username}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="edit-email" className="form-label">Email*</label>
                                    <input
                                        type="email"
                                        className={`form-control ${editFormErrors.email ? 'is-invalid' : ''}`}
                                        id="edit-email"
                                        name="email"
                                        value={editUser.email}
                                        onChange={handleEditInputChange}
                                        placeholder="Enter email"
                                        disabled={updating}
                                    />
                                    {editFormErrors.email && <div className="invalid-feedback">{editFormErrors.email}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="edit-firstName" className="form-label">First Name*</label>
                                    <input
                                        type="text"
                                        className={`form-control ${editFormErrors.firstName ? 'is-invalid' : ''}`}
                                        id="edit-firstName"
                                        name="firstName"
                                        value={editUser.firstName}
                                        onChange={handleEditInputChange}
                                        placeholder="Enter first name"
                                        disabled={updating}
                                    />
                                    {editFormErrors.firstName && <div className="invalid-feedback">{editFormErrors.firstName}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="edit-lastName" className="form-label">Last Name*</label>
                                    <input
                                        type="text"
                                        className={`form-control ${editFormErrors.lastName ? 'is-invalid' : ''}`}
                                        id="edit-lastName"
                                        name="lastName"
                                        value={editUser.lastName}
                                        onChange={handleEditInputChange}
                                        placeholder="Enter last name"
                                        disabled={updating}
                                    />
                                    {editFormErrors.lastName && <div className="invalid-feedback">{editFormErrors.lastName}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="edit-phone" className="form-label">Phone*</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.phone ? 'is-invalid' : ''}`}
                                id="edit-phone"
                                name="phone"
                                value={editUser.phone}
                                onChange={handleEditInputChange}
                                placeholder="Enter phone number"
                                disabled={updating}
                            />
                            {editFormErrors.phone && <div className="invalid-feedback">{editFormErrors.phone}</div>}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="edit-password" className="form-label">Password (leave blank to keep current)</label>
                            <input
                                type="password"
                                className={`form-control ${editFormErrors.password ? 'is-invalid' : ''}`}
                                id="edit-password"
                                name="password"
                                value={editUser.password}
                                onChange={handleEditInputChange}
                                placeholder="Enter new password"
                                disabled={updating}
                            />
                            {editFormErrors.password && <div className="invalid-feedback">{editFormErrors.password}</div>}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="edit-roleId" className="form-label">Role*</label>
                            <select
                                className={`form-select ${editFormErrors.roleId ? 'is-invalid' : ''}`}
                                id="edit-roleId"
                                name="roleId"
                                value={editUser.roleId}
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
                                disabled={updating}
                            >
                                <option value="">Select a role</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {editFormErrors.roleId && <div className="invalid-feedback">{editFormErrors.roleId}</div>}
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleUpdateUser}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        disabled={updating}
                    >
                        {updating ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Updating...
                            </>
                        ) : (
                            'Update User'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View User Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>User Details: {selectedUser?.username}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <div>
                            <div className="mb-4">
                                <h5>Username</h5>
                                <p className="fs-6">{selectedUser.username}</p>
                            </div>
                            <div className="mb-4">
                                <h5>Name</h5>
                                <p className="fs-6">{selectedUser.firstName} {selectedUser.lastName}</p>
                            </div>
                            <div className="mb-4">
                                <h5>Email</h5>
                                <p className="fs-6">{selectedUser.email}</p>
                            </div>
                            <div className="mb-4">
                                <h5>Phone</h5>
                                <p className="fs-6">{selectedUser.phone || 'Not provided'}</p>
                            </div>
                            <div className="mb-4">
                                <h5>Role</h5>
                                <p className="fs-6">{selectedUser.roleName}</p>
                            </div>
                            <div className="mb-4">
                                <h5>Status</h5>
                                <p className="fs-6">
                                    <span className={`badge ${selectedUser.active ? 'bg-success' : 'bg-danger'}`}>
                                        {selectedUser.active ? 'Active' : 'Inactive'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onHide={() => {
                if (!deleting) {
                    setIsDeleteModalOpen(false);
                }
            }} centered>
                <Modal.Header closeButton={!deleting}>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {userToDelete && (
                        <>
                            <p>Are you sure you want to delete the user <strong>{userToDelete.username}</strong>?</p>
                            <p className="text-danger">This action cannot be undone and will permanently remove the user from the system.</p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteUser}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Deleting...
                            </>
                        ) : (
                            'Delete User'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default TeamTable;