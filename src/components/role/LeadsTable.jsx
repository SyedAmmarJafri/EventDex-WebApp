import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/paths.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Switch from '@mui/material/Switch';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

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
        permissions: [],
        active: true
    });
    const [editRole, setEditRole] = useState({
        id: '',
        name: '',
        description: '',
        permissions: [],
        active: true
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Complete permissions list
    const availablePermissions = [
        'CATEGORY_READ',
        'CATEGORY_UPDATE',
        'CATEGORY_WRITE',
        'CATEGORY_DELETE',
        'ITEM_READ',
        'ITEM_WRITE',
        'ITEM_UPDATE',
        'ITEM_DELETE',
        'DEAL_READ',
        'DEAL_WRITE',
        'DEAL_UPDATE',
        'DEAL_DELETE',
        'COUPON_READ',
        'COUPON_WRITE',
        'COUPON_UPDATE',
        'COUPON_DELETE',
        'TEMPLATE_READ',
        'TEMPLATE_WRITE',
        'TEMPLATE_UPDATE',
        'TEMPLATE_DELETE',
        'EMAIL_SETTINGS_READ',
        'EMAIL_SETTINGS_WRITE',
        'EMAIL_SETTINGS_DELETE',
        'ORDER_READ',
        'ORDER_WRITE',
        'ORDER_UPDATE',
        'ORDER_ACCEPT',
        'ORDER_REJECT',
        'TAX_WRITE',
        'TAX_UPDATE'
    ];

    // Group permissions by resource
    const groupedPermissions = {
        'Category': availablePermissions.filter(p => p.startsWith('CATEGORY_')),
        'Item': availablePermissions.filter(p => p.startsWith('ITEM_')),
        'Deal': availablePermissions.filter(p => p.startsWith('DEAL_')),
        'Coupon': availablePermissions.filter(p => p.startsWith('COUPON_')),
        'Template': availablePermissions.filter(p => p.startsWith('TEMPLATE_')),
        'Email Settings': availablePermissions.filter(p => p.startsWith('EMAIL_SETTINGS_')),
        'Order': availablePermissions.filter(p => p.startsWith('ORDER_')),
        'Tax': availablePermissions.filter(p => p.startsWith('TAX_'))
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
                                        width={250}
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
                <h5 className="mb-2">No Roles Found</h5>
                <p className="text-muted mb-4">You haven't added any roles yet. Start by adding a new role.</p>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2 mx-auto"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Role
                </Button>
            </div>
        );
    };

    const fetchRoles = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                setLoading(false);
                return;
            }

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
            } else {
                throw new Error('Invalid roles data format received');
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
            toast.error(err.message || 'Failed to load roles');
            setRoles([]);
        } finally {
            setLoading(false);
        }
    }, []);

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

    const handleStatusToggle = (isNewRole) => (e) => {
        const checked = e.target.checked;
        if (isNewRole) {
            setNewRole(prev => ({ ...prev, active: checked }));
        } else {
            setEditRole(prev => ({ ...prev, active: checked }));
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
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.permissions.length === 0) errors.permissions = 'At least one permission is required';
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newRole, setFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/client-admin/roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newRole.name,
                    description: newRole.description,
                    permissions: newRole.permissions,
                    active: newRole.active
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create role');
            }

            toast.success('Role created successfully');
            await fetchRoles();
            setIsModalOpen(false);
            setNewRole({
                name: '',
                description: '',
                permissions: [],
                active: true
            });
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editRole, setEditFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/client-admin/roles/${editRole.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editRole.name,
                    description: editRole.description,
                    permissions: editRole.permissions,
                    active: editRole.active
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update role');
            }

            toast.success('Role updated successfully');
            await fetchRoles();
            setIsEditModalOpen(false);
        } catch (err) {
            toast.error(err.message);
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
            permissions: role.permissions || [],
            active: role.active
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
            const authData = JSON.parse(localStorage.getItem("authData"));

            // Optimistic update
            setRoles(prev => prev.filter(role => role.id !== roleToDelete.id));
            setIsDeleteModalOpen(false);

            const response = await fetch(`${BASE_URL}/api/client-admin/roles/${roleToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete role');
            }

            toast.success('Role deleted successfully');
            await fetchRoles(); // Refresh data to ensure consistency
        } catch (err) {
            // Revert on error
            setRoles(prev => [...prev, roleToDelete]);
            toast.error(err.message);
        } finally {
            setRoleToDelete(null);
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
            cell: (info) => info.getValue()
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
            accessorKey: 'active',
            header: 'Status',
            cell: (info) => (
                <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${info.getValue() ? 'bg-success' : 'bg-danger'}`}>
                        {info.getValue() ? 'Active' : 'Inactive'}
                    </span>
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
                        title="View"
                    >
                        <FiEye />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditRole(row.original)}
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
    ], []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

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
                <h4>Roles Management</h4>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Role
                </Button>
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

            {/* Add Role Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewRole({ name: '', description: '', permissions: [], active: true });
                setFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create New Role</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="name" className="form-label">Role Name*</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                id="name"
                                name="name"
                                value={newRole.name}
                                onChange={handleInputChange}
                                placeholder="Enter role name"
                            />
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
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
                            <Form.Group controlId="formActiveStatus">
                                <Form.Label>Status</Form.Label>
                                <div className="d-flex align-items-center">
                                    <Switch
                                        checked={newRole.active}
                                        onChange={handleStatusToggle(true)}
                                        color="primary"
                                    />
                                    <h8 className="ms-2">
                                        {newRole.active ? 'Active' : 'Inactive'}
                                    </h8>
                                </div>
                            </Form.Group>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Permissions*</label>
                            {formErrors.permissions && <div className="text-danger small mb-2">{formErrors.permissions}</div>}

                            <div className="border rounded p-3">
                                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                    <div key={resource} className="mb-4">
                                        <h6 className="mb-2">{resource} Permissions</h6>
                                        <div className="d-flex flex-wrap gap-3">
                                            {perms.map(permission => (
                                                <div key={permission} className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`perm-${permission}`}
                                                        checked={newRole.permissions.includes(permission)}
                                                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                                                    />
                                                    <h8 className="form-check-label" htmlFor={`perm-${permission}`}>
                                                        {permission.split('_')[1]}
                                                    </h8>
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
                        onClick={handleSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Create Role
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Role Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Role: {editRole.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleEditSubmit}>
                        <div className="mb-3">
                            <label htmlFor="edit-name" className="form-label">Role Name*</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                id="edit-name"
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
                            <Form.Group controlId="formEditActiveStatus">
                                <Form.Label>Status</Form.Label>
                                <div className="d-flex align-items-center">
                                    <Switch
                                        checked={editRole.active}
                                        onChange={handleStatusToggle(false)}
                                        color="primary"
                                    />
                                    <h8 className="ms-2">
                                        {editRole.active ? 'Active' : 'Inactive'}
                                    </h8>
                                </div>
                            </Form.Group>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Permissions*</label>
                            {editFormErrors.permissions && <div className="text-danger small mb-2">{editFormErrors.permissions}</div>}

                            <div className="border rounded p-3">
                                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                    <div key={resource} className="mb-4">
                                        <h6 className="mb-2">{resource} Permissions</h6>
                                        <div className="d-flex flex-wrap gap-3">
                                            {perms.map(permission => (
                                                <div key={permission} className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`edit-perm-${permission}`}
                                                        checked={editRole.permissions.includes(permission)}
                                                        onChange={(e) => handleEditPermissionChange(permission, e.target.checked)}
                                                    />
                                                    <h8 className="form-check-label" htmlFor={`edit-perm-${permission}`}>
                                                        {permission.split('_')[1]}
                                                    </h8>
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
                        onClick={handleEditSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Update Role
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
                                <h8 className="fs-6">{selectedRole.name}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Description</h5>
                                <h8 className="fs-6">{selectedRole.description}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Status</h5>
                                <h8 className="fs-6">
                                    <span className={`badge ${selectedRole.active ? 'bg-success' : 'bg-danger'}`}>
                                        {selectedRole.active ? 'Active' : 'Inactive'}
                                    </span>
                                </h8>
                            </div>
                            <div className="mb-3">
                                <h5>Permissions</h5>
                                <div className="border rounded p-3">
                                    {Object.entries(groupedPermissions).map(([resource, perms]) => {
                                        const rolePerms = perms.filter(p => selectedRole.permissions.includes(p));
                                        if (rolePerms.length === 0) return null;

                                        return (
                                            <div key={resource} className="mb-3">
                                                <h6 className="mb-2">{resource}</h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {rolePerms.map((permission, index) => (
                                                        <span key={index} className="badge bg-primary">
                                                            {permission.split('_')[1]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                    {roleToDelete && (
                        <>
                            <h8>Are you sure you want to delete the role <strong>{roleToDelete.name}</strong>? </h8>
                            <h8>This action cannot be undone and will remove all associated permissions.</h8>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteRole}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        Delete Role
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default RolesTable;