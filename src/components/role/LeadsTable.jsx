import React, { useEffect, useState } from 'react';
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

// Common system roles (non-editable)
const SYSTEM_ROLES = [
    'PATRON',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RIDER',
    'ANALYTICS',
    'SUPPORT',
    'MARKETING',
    'ACCOUNTANT',
    'KITCHEN_STAFF'
];

const RolesTable = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [newRole, setNewRole] = useState({
        name: '',
        description: '',
        permissions: []
    });
    const [editRole, setEditRole] = useState({
        id: '',
        name: '',
        description: '',
        permissions: []
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Get user role from authData
    const authData = JSON.parse(localStorage.getItem("authData"));
    const userRole = authData?.role;
    
    // Only PATRON can access role management
    const isPatron = userRole === 'PATRON';

    // Complete permissions list for event management system
    const availablePermissions = [
        // Event Permissions
        'EVENT_READ',
        'EVENT_WRITE',
        'EVENT_UPDATE',
        'EVENT_DELETE',
        
        // Domain Permissions
        'DOMAIN_READ',
        'DOMAIN_WRITE',
        'DOMAIN_UPDATE',
        'DOMAIN_DELETE',
        
        // Participant Permissions
        'PARTICIPANT_READ',
        'PARTICIPANT_WRITE',
        'PARTICIPANT_UPDATE',
        'PARTICIPANT_DELETE',
        
        // Registration Permissions
        'REGISTRATION_READ',
        'REGISTRATION_WRITE',
        'REGISTRATION_UPDATE',
        'REGISTRATION_DELETE',
        
        // Payment Permissions
        'PAYMENT_READ',
        'PAYMENT_WRITE',
        'PAYMENT_UPDATE',
        'PAYMENT_DELETE',
        
        // User Management Permissions
        'USER_READ',
        'USER_WRITE',
        'USER_UPDATE',
        'USER_DELETE',
        
        // Role Permissions
        'ROLE_READ',
        'ROLE_WRITE',
        'ROLE_UPDATE',
        'ROLE_DELETE',
        
        // Analytics Permissions
        'ANALYTICS_READ',
        'ANALYTICS_EXPORT',
        
        // Report Permissions
        'REPORT_READ',
        'REPORT_WRITE',
        'REPORT_EXPORT',
        
        // Settings Permissions
        'SETTINGS_READ',
        'SETTINGS_WRITE',
        'SETTINGS_UPDATE',
        
        // Financial Permissions
        'FINANCE_READ',
        'FINANCE_WRITE',
        'FINANCE_UPDATE',
        
        // Notification Permissions
        'NOTIFICATION_READ',
        'NOTIFICATION_WRITE',
        'NOTIFICATION_SEND'
    ];

    // Group permissions by resource
    const groupedPermissions = {
        'Event Management': availablePermissions.filter(p => p.startsWith('EVENT_')),
        'Domain Management': availablePermissions.filter(p => p.startsWith('DOMAIN_')),
        'Participant Management': availablePermissions.filter(p => p.startsWith('PARTICIPANT_')),
        'Registration Management': availablePermissions.filter(p => p.startsWith('REGISTRATION_')),
        'Payment Management': availablePermissions.filter(p => p.startsWith('PAYMENT_')),
        'User Management': availablePermissions.filter(p => p.startsWith('USER_')),
        'Role Management': availablePermissions.filter(p => p.startsWith('ROLE_')),
        'Analytics': availablePermissions.filter(p => p.startsWith('ANALYTICS_')),
        'Reports': availablePermissions.filter(p => p.startsWith('REPORT_')),
        'Settings': availablePermissions.filter(p => p.startsWith('SETTINGS_')),
        'Finance': availablePermissions.filter(p => p.startsWith('FINANCE_')),
        'Notifications': availablePermissions.filter(p => p.startsWith('NOTIFICATION_'))
    };

    // Fetch custom roles only
    const fetchCustomRoles = async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            
            if (!authData?.token) {
                toast.error("Authentication token not found");
                setLoading(false);
                return;
            }

            const response = await fetch(`${BASE_URL}/api/admin/roles/custom`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch custom roles');
            }

            if (data.success && Array.isArray(data.data)) {
                setRoles(data.data);
            } else {
                throw new Error('Invalid custom roles data format received');
            }
        } catch (err) {
            console.error('Error fetching custom roles:', err);
            toast.error(err.message || 'Failed to load custom roles');
        } finally {
            setLoading(false);
        }
    };

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Description</th>
                            <th scope="col">Permissions</th>
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
                                        width={250}
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
                <h5 className="mb-2">No Custom Roles Found</h5>
                <p className="text-muted mb-4">You haven&apos;t created any custom roles yet.</p>
                {isPatron && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Create Custom Role
                    </Button>
                )}
            </div>
        );
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewRole(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditRole(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePermissionChange = (permission, isChecked) => {
        setNewRole(prev => {
            if (isChecked) {
                return {
                    ...prev,
                    permissions: [...prev.permissions, permission]
                };
            } else {
                return {
                    ...prev,
                    permissions: prev.permissions.filter(p => p !== permission)
                };
            }
        });
    };

    const handleEditPermissionChange = (permission, isChecked) => {
        setEditRole(prev => {
            if (isChecked) {
                return {
                    ...prev,
                    permissions: [...prev.permissions, permission]
                };
            } else {
                return {
                    ...prev,
                    permissions: prev.permissions.filter(p => p !== permission)
                };
            }
        });
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Role name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.permissions.length === 0) errors.permissions = 'At least one permission is required';

        // Check if role name is a system role
        if (SYSTEM_ROLES.includes(formData.name.toUpperCase())) {
            errors.name = 'This role name is reserved for system roles';
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!validateForm(newRole, setFormErrors)) return;

        try {
            setCreating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newRole.name.toUpperCase(),
                    description: newRole.description,
                    permissions: newRole.permissions
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create role');
            }

            toast.success('Custom role created successfully');
            await fetchCustomRoles(); // Refresh the list with custom roles only
            setIsModalOpen(false);
            setNewRole({
                name: '',
                description: '',
                permissions: []
            });
            setFormErrors({});
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        if (!validateForm(editRole, setEditFormErrors)) return;

        try {
            setUpdating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/roles/${editRole.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editRole.name.toUpperCase(),
                    description: editRole.description,
                    permissions: editRole.permissions
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update role');
            }

            toast.success('Custom role updated successfully');
            await fetchCustomRoles(); // Refresh the list
            setIsEditModalOpen(false);
            setEditFormErrors({});
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleViewRole = (role) => {
        setSelectedRole(role);
        setIsViewModalOpen(true);
    };

    const handleEditRole = (role) => {
        setEditRole({
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions || []
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (role) => {
        setRoleToDelete(role);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteRole = async () => {
        if (!roleToDelete) return;

        try {
            setDeleting(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/roles/${roleToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete role');
            }

            toast.success('Custom role deleted successfully');
            await fetchCustomRoles(); // Refresh the list
            setIsDeleteModalOpen(false);
            setRoleToDelete(null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
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
            accessorKey: 'permissions',
            header: 'Permissions',
            cell: (info) => (
                <div className="d-flex flex-wrap gap-1">
                    {info.getValue()?.slice(0, 3).map((permission, index) => (
                        <span key={index} className="badge bg-primary">
                            {permission.split('_')[1]}
                        </span>
                    ))}
                    {info.getValue()?.length > 3 && (
                        <span className="badge bg-secondary">
                            +{info.getValue().length - 3} more
                        </span>
                    )}
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
                        onClick={() => handleViewRole(row.original)}
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                    {isPatron && (
                        <>
                            <button
                                className="avatar-text avatar-md"
                                onClick={() => handleEditRole(row.original)}
                                title="Edit Role"
                            >
                                <FiEdit />
                            </button>
                            <button
                                className="avatar-text avatar-md"
                                onClick={() => handleDeleteClick(row.original)}
                                title="Delete Role"
                            >
                                <FiTrash />
                            </button>
                        </>
                    )}
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], [isPatron]);

    useEffect(() => {
        fetchCustomRoles(); // Load only custom roles
    }, []);

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
                <p className="text-muted mb-4">Only PATRON users can manage custom roles.</p>
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
                    <h4>Custom Roles Management</h4>
                </div>
                {isPatron && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Create Custom Role
                    </Button>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : roles.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={roles}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Create Role Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewRole({
                    name: '',
                    description: '',
                    permissions: []
                });
                setFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create Custom Role</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreateRole}>
                        <div className="mb-3">
                            <label htmlFor="roleName" className="form-label">Role Name*</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                id="roleName"
                                name="name"
                                value={newRole.name}
                                onChange={handleInputChange}
                                placeholder="Enter role name (will be converted to uppercase)"
                            />
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                            <div className="form-text">
                                System roles ({SYSTEM_ROLES.join(', ')}) cannot be created as custom roles.
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="description" className="form-label">Description*</label>
                            <textarea
                                className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                                id="description"
                                name="description"
                                value={newRole.description}
                                onChange={handleInputChange}
                                rows="3"
                                placeholder="Enter role description"
                            />
                            {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Permissions*</label>
                            {formErrors.permissions && <div className="text-danger small mb-2">{formErrors.permissions}</div>}

                            <div className="border rounded p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                    <div key={resource} className="mb-4">
                                        <h6 className="mb-2">{resource}</h6>
                                        <div className="row">
                                            {perms.map(permission => (
                                                <div key={permission} className="col-md-6 mb-2">
                                                    <div className="form-check">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`perm-${permission}`}
                                                            checked={newRole.permissions.includes(permission)}
                                                            onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`perm-${permission}`}>
                                                            {permission.replace(/_/g, ' ')}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleCreateRole}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        disabled={creating}
                    >
                        {creating ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating...
                            </>
                        ) : (
                            'Create Role'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Role Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Custom Role: {editRole.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleUpdateRole}>
                        <div className="mb-3">
                            <label htmlFor="edit-roleName" className="form-label">Role Name*</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                id="edit-roleName"
                                name="name"
                                value={editRole.name}
                                onChange={handleEditInputChange}
                                placeholder="Enter role name"
                            />
                            {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="edit-description" className="form-label">Description*</label>
                            <textarea
                                className={`form-control ${editFormErrors.description ? 'is-invalid' : ''}`}
                                id="edit-description"
                                name="description"
                                value={editRole.description}
                                onChange={handleEditInputChange}
                                rows="3"
                                placeholder="Enter role description"
                            />
                            {editFormErrors.description && <div className="invalid-feedback">{editFormErrors.description}</div>}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Permissions*</label>
                            {editFormErrors.permissions && <div className="text-danger small mb-2">{editFormErrors.permissions}</div>}

                            <div className="border rounded p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                    <div key={resource} className="mb-4">
                                        <h6 className="mb-2">{resource}</h6>
                                        <div className="row">
                                            {perms.map(permission => (
                                                <div key={permission} className="col-md-6 mb-2">
                                                    <div className="form-check">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`edit-perm-${permission}`}
                                                            checked={editRole.permissions.includes(permission)}
                                                            onChange={(e) => handleEditPermissionChange(permission, e.target.checked)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`edit-perm-${permission}`}>
                                                            {permission.replace(/_/g, ' ')}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleUpdateRole}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        disabled={updating}
                    >
                        {updating ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Updating...
                            </>
                        ) : (
                            'Update Role'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View Role Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Role Details: {selectedRole?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRole && (
                        <div>
                            <div className="mb-4">
                                <h5>Name</h5>
                                <p className="fs-6">{selectedRole.name}</p>
                            </div>
                            <div className="mb-4">
                                <h5>Description</h5>
                                <p className="fs-6">{selectedRole.description || 'No description provided'}</p>
                            </div>
                            <div className="mb-3">
                                <h5>Permissions</h5>
                                <div className="border rounded p-3">
                                    {Object.entries(groupedPermissions).map(([resource, perms]) => {
                                        const rolePerms = perms.filter(p => selectedRole.permissions?.includes(p));
                                        if (rolePerms.length === 0) return null;

                                        return (
                                            <div key={resource} className="mb-3">
                                                <h6 className="mb-2">{resource}</h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {rolePerms.map((permission, index) => (
                                                        <span key={index} className="badge bg-primary">
                                                            {permission.replace(/_/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {!selectedRole.permissions || selectedRole.permissions.length === 0 ? (
                                        <p className="text-muted">No permissions assigned</p>
                                    ) : null}
                                </div>
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
                    {roleToDelete && (
                        <>
                            <p>Are you sure you want to delete the custom role <strong>{roleToDelete.name}</strong>?</p>
                            <p className="text-danger">This action cannot be undone and will remove all associated permissions from users assigned to this role.</p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteRole}
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Deleting...
                            </>
                        ) : (
                            'Delete Role'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default RolesTable;