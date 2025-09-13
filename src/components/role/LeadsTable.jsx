import React, { useEffect, useState } from 'react';
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

// Common role options
const COMMON_ROLES = [
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RIDER',
    'ANALYTICS',
    'SUPPORT',
    'MARKETING',
    'ACCOUNTANT',
    'KITCHEN_STAFF',
    'OTHER'
];

// Tab permissions based on the dashboard image
const TAB_PERMISSIONS = [
    'DASHBOARD',
    'POS',
    'ORDERS',
    'PRODUCTS',
    'CATEGORY',
    'ITEM',
    'DEAL',
    'CUSTOMERS',
    'DISCOUNTS',
    'MARKETING',
    'EMAIL_MARKETING',
    'MARKETING_TEMPLATE',
    'INVENTORY',
    'FINANCE',
    'ANALYTICS',
    'SALES_ANALYTICS',
    'PRODUCT_ANALYTICS',
    'CUSTOMER_ANALYTICS',
    'FINANCIAL_ANALYTICS',
    'TEAM_ANALYTICS',
    'COMPARISON_ANALYTICS',
    'REPORTS',
    'LIVE_TRACKER',
    'USERS',
    'TEAM',
    'ROLE',
    'ONLINE_STORE'
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
        permissions: [],
        tabPermissions: TAB_PERMISSIONS.reduce((acc, tab) => {
            acc[tab.toLowerCase()] = tab === 'DASHBOARD' ? true : false;
            return acc;
        }, {}),
        active: true,
        isCustomRole: false
    });
    const [editRole, setEditRole] = useState({
        id: '',
        name: '',
        description: '',
        permissions: [],
        tabPermissions: TAB_PERMISSIONS.reduce((acc, tab) => {
            acc[tab.toLowerCase()] = tab === 'DASHBOARD' ? true : false;
            return acc;
        }, {}),
        active: true,
        isCustomRole: false
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Get user role and permissions from authData
    const authData = JSON.parse(localStorage.getItem("authData"));
    const userRole = authData?.role;
    const userPermissions = authData?.permissions || [];

    // Check if user is client admin
    const isClientAdmin = userRole === 'CLIENT_ADMIN';

    // Check specific permissions
    const canViewRoles = isClientAdmin || userPermissions.includes('ROLE_READ');
    const canCreateRoles = isClientAdmin || userPermissions.includes('ROLE_WRITE');
    const canEditRoles = isClientAdmin || userPermissions.includes('ROLE_UPDATE');
    const canDeleteRoles = isClientAdmin || userPermissions.includes('ROLE_DELETE');

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
        'TAX_READ',
        'TAX_UPDATE',
        'ANALYTICS_READ',
        'FINANCE_READ',
        'FINANCE_WRITE',
        'FINANCE_UPDATE',
        'FINANCE_DELETE',
        'CURRENCY_READ',
        'CURRENCY_UPDATE',
        'RIDER_LOCATION',
        'PROFILE_READ',
        'PROFILE_UPDATE',
        'PROFILE_PICTURE_UPLOAD',
        'PROFILE_PICTURE_UPDATE',
        'SETTINGS_MANAGE',
        'CUSTOMER_READ',
        'STAFF_MANAGEMENT',
        'ROLE_READ'
    ];

    // Group permissions by resource
    const groupedPermissions = {
        'Category': availablePermissions.filter(p => p.startsWith('CATEGORY_')),
        'Item': availablePermissions.filter(p => p.startsWith('ITEM_')),
        'Deal': availablePermissions.filter(p => p.startsWith('DEAL_')),
        'Order': availablePermissions.filter(p => p.startsWith('ORDER_')),
        'Discount': availablePermissions.filter(p => p.startsWith('COUPON_')),
        'Template': availablePermissions.filter(p => p.startsWith('TEMPLATE_')),
        'Email Settings': availablePermissions.filter(p => p.startsWith('EMAIL_SETTINGS_')),
        'Finance': availablePermissions.filter(p => p.startsWith('FINANCE_')),
        'Settings': [
            'SETTINGS_MANAGE',
            'STAFF_MANAGEMENT',
            'ROLE_READ',
            'CUSTOMER_READ',
            'RIDER_LOCATION'
        ],
        'Profile': availablePermissions.filter(p => p.startsWith('PROFILE_')),
        'Analytics': availablePermissions.filter(p => p.startsWith('ANALYTICS_')),
        'Tax': availablePermissions.filter(p => p.startsWith('TAX_')),
        'Currency': availablePermissions.filter(p => p.startsWith('CURRENCY_')),
    };

    const fetchRolesFromAPI = async () => {
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

            let rolesData = [];
            if (Array.isArray(data)) {
                rolesData = data;
            } else if (data.data && Array.isArray(data.data)) {
                rolesData = data.data;
            } else if (data.status === 200 && data.data) {
                rolesData = data.data;
            } else {
                throw new Error('Invalid roles data format received');
            }

            // Ensure all roles have tabPermissions with all required fields
            const processedRoles = rolesData.map(role => {
                const defaultTabPermissions = TAB_PERMISSIONS.reduce((acc, tab) => {
                    acc[tab.toLowerCase()] = role.tabPermissions?.[tab.toLowerCase()] || (tab === 'DASHBOARD' ? true : false);
                    return acc;
                }, {});

                return {
                    ...role,
                    tabPermissions: role.tabPermissions ? { ...defaultTabPermissions, ...role.tabPermissions } : defaultTabPermissions
                };
            });

            setRoles(processedRoles);
        } catch (err) {
            console.error('Error fetching roles:', err);
            toast.error(err.message || 'Failed to load roles');
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
                            <th scope="col">Status</th>
                            {canViewRoles && <th scope="col" className="text-end">Actions</th>}
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
                                {canViewRoles && (
                                    <td>
                                        <div className="hstack gap-2 justify-content-end">
                                            {canViewRoles && (
                                                <Skeleton
                                                    circle
                                                    width={24}
                                                    height={24}
                                                    baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                                    highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                                />
                                            )}
                                            {canEditRoles && (
                                                <Skeleton
                                                    circle
                                                    width={24}
                                                    height={24}
                                                    baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                                    highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                                />
                                            )}
                                            {canDeleteRoles && (
                                                <Skeleton
                                                    circle
                                                    width={24}
                                                    height={24}
                                                    baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                                    highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                                />
                                            )}
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
                <h5 className="mb-2">No Roles Found</h5>
                <p className="text-muted mb-4">You haven&apos;t added any roles yet. Start by adding a new role.</p>
                {canCreateRoles && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiPlus /> Add Role
                    </Button>
                )}
            </div>
        );
    };

    const handleRoleTypeChange = (e) => {
        const selectedValue = e.target.value;
        const isCustom = selectedValue === 'OTHER';

        setNewRole(prev => ({
            ...prev,
            name: isCustom ? '' : selectedValue,
            isCustomRole: isCustom
        }));

        if (formErrors.name) {
            setFormErrors(prev => ({ ...prev, name: '' }));
        }
    };

    const handleCustomRoleNameChange = (e) => {
        const value = e.target.value.toUpperCase();
        setNewRole(prev => ({ ...prev, name: value }));
        if (formErrors.name) {
            setFormErrors(prev => ({ ...prev, name: '' }));
        }
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

    const handleTabPermissionChange = (tab, isChecked) => {
        if (tab === 'dashboard') return;

        setNewRole(prev => ({
            ...prev,
            tabPermissions: {
                ...prev.tabPermissions,
                [tab]: isChecked
            }
        }));
    };

    const handleEditTabPermissionChange = (tab, isChecked) => {
        if (tab === 'dashboard') return;

        setEditRole(prev => ({
            ...prev,
            tabPermissions: {
                ...prev.tabPermissions,
                [tab]: isChecked
            }
        }));
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.permissions.length === 0) errors.permissions = 'At least one permission is required';

        const hasTabPermission = Object.entries(formData.tabPermissions)
            .filter(([tab]) => tab !== 'dashboard')
            .some(([_, val]) => val);

        if (!hasTabPermission) errors.tabPermissions = 'At least one tab access (other than Dashboard) must be selected';

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newRole, setFormErrors)) return;

        try {
            setCreating(true);
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
                    tabPermissions: newRole.tabPermissions,
                    active: newRole.active
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create role');
            }

            toast.success('Role created successfully');
            setRoles(prev => [...prev, data]);
            setIsModalOpen(false);
            setNewRole({
                name: '',
                description: '',
                permissions: [],
                tabPermissions: TAB_PERMISSIONS.reduce((acc, tab) => {
                    acc[tab.toLowerCase()] = tab === 'DASHBOARD' ? true : false;
                    return acc;
                }, {}),
                active: true,
                isCustomRole: false
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editRole, setEditFormErrors)) return;

        try {
            setUpdating(true);
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
                    tabPermissions: editRole.tabPermissions,
                    active: editRole.active
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update role');
            }

            toast.success('Role updated successfully');
            setRoles(prev => prev.map(r => r.id === editRole.id ? data : r));
            setIsEditModalOpen(false);
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
            permissions: role.permissions || [],
            tabPermissions: {
                ...TAB_PERMISSIONS.reduce((acc, tab) => {
                    acc[tab.toLowerCase()] = tab === 'DASHBOARD' ? true : false;
                    return acc;
                }, {}),
                ...role.tabPermissions,
                dashboard: true
            },
            active: role.active,
            isCustomRole: !COMMON_ROLES.includes(role.name)
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
        } catch (err) {
            // Revert on error
            setRoles(prev => [...prev, roleToDelete]);
            toast.error(err.message);
        } finally {
            setRoleToDelete(null);
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
                    {canViewRoles && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewRole(row.original)}
                            title="View"
                        >
                            <FiEye />
                        </button>
                    )}
                    {canEditRoles && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditRole(row.original)}
                            title="Edit"
                        >
                            <FiEdit />
                        </button>
                    )}
                    {canDeleteRoles && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleDeleteClick(row.original)}
                            title="Delete"
                        >
                            <FiTrash />
                        </button>
                    )}
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], [canViewRoles, canEditRoles, canDeleteRoles]);

    useEffect(() => {
        fetchRolesFromAPI();
    }, []);

    if (!canViewRoles) {
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
                <p className="text-muted mb-4">You don&apos;t have permission to view roles.</p>
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
                <h4>Roles Management</h4>
                {canCreateRoles && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiPlus /> Add Role
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

            {/* Add Role Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewRole({
                    name: '',
                    description: '',
                    permissions: [],
                    tabPermissions: TAB_PERMISSIONS.reduce((acc, tab) => {
                        acc[tab.toLowerCase()] = tab === 'DASHBOARD' ? true : false;
                        return acc;
                    }, {}),
                    active: true,
                    isCustomRole: false
                });
                setFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create New Role</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="roleType" className="form-label">Role Type*</label>
                            <select
                                className={`form-select ${formErrors.name ? 'is-invalid' : ''}`}
                                id="roleType"
                                onChange={handleRoleTypeChange}
                                value={newRole.isCustomRole ? 'OTHER' : newRole.name || ''}
                                style={{
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    paddingRight: '2.5rem',
                                    backgroundImage:
                                        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundSize: '16px 12px',
                                    appearance: 'none',
                                }}
                            >
                                <option
                                    value=""
                                    style={{
                                        color: '#6c757d',
                                        backgroundColor: '#fff',
                                        fontSize: '0.9rem',
                                        padding: '0.5rem 1rem',
                                    }}
                                >
                                    Select a role type
                                </option>
                                {COMMON_ROLES.map(role => (
                                    <option
                                        key={role}
                                        value={role}
                                        style={{
                                            color: '#000000ff',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem',
                                        }}
                                    >
                                        {role.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                        </div>

                        {newRole.isCustomRole && (
                            <div className="mb-3">
                                <label htmlFor="customRoleName" className="form-label">Custom Role Name*</label>
                                <input
                                    type="text"
                                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                    id="customRoleName"
                                    name="name"
                                    value={newRole.name}
                                    onChange={handleCustomRoleNameChange}
                                    placeholder="Enter custom role name"
                                />
                                {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                            </div>
                        )}

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
                            <label className="form-label">Tab Access*</label>
                            {formErrors.tabPermissions && <div className="text-danger small mb-2">{formErrors.tabPermissions}</div>}

                            <div className="border rounded p-3">
                                <div className="row">
                                    {TAB_PERMISSIONS.map(tab => (
                                        <div key={tab} className="col-md-4 mb-3">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`tab-${tab}`}
                                                    checked={newRole.tabPermissions[tab.toLowerCase()] || false}
                                                    onChange={(e) => handleTabPermissionChange(tab.toLowerCase(), e.target.checked)}
                                                    disabled={tab === 'DASHBOARD'}
                                                />
                                                <h8 className="form-check-label" htmlFor={`tab-${tab}`}>
                                                    {tab.replace(/_/g, ' ')}
                                                    {tab === 'DASHBOARD' && <span className="text-muted small ms-1">(required)</span>}
                                                </h8>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                                                        {permission.replace(/_/g, ' ')}
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
                    <Modal.Title>Edit Role: {editRole.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleEditSubmit}>
                        <div className="mb-3">
                            <label htmlFor="edit-roleType" className="form-label">Role Type*</label>
                            <select
                                className={`form-select ${editFormErrors.name ? 'is-invalid' : ''}`}
                                id="edit-roleType"
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    const isCustom = selectedValue === 'OTHER';
                                    setEditRole(prev => ({
                                        ...prev,
                                        name: isCustom ? '' : selectedValue,
                                        isCustomRole: isCustom
                                    }));
                                    if (editFormErrors.name) {
                                        setEditFormErrors(prev => ({ ...prev, name: '' }));
                                    }
                                }}
                                value={editRole.isCustomRole ? 'OTHER' : editRole.name || ''}
                                style={{
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    paddingRight: '2.5rem',
                                    backgroundImage:
                                        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundSize: '16px 12px',
                                    appearance: 'none',
                                }}
                            >
                                <option
                                    value=""
                                    style={{
                                        color: '#6c757d',
                                        backgroundColor: '#fff',
                                        fontSize: '0.9rem',
                                        padding: '0.5rem 1rem',
                                    }}
                                >
                                    Select a role type
                                </option>
                                {COMMON_ROLES.map(role => (
                                    <option
                                        key={role}
                                        value={role}
                                        style={{
                                            color: '#000000ff',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem',
                                        }}
                                    >
                                        {role.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                        </div>

                        {editRole.isCustomRole && (
                            <div className="mb-3">
                                <label htmlFor="edit-customRoleName" className="form-label">Custom Role Name*</label>
                                <input
                                    type="text"
                                    className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                    id="edit-customRoleName"
                                    name="name"
                                    value={editRole.name}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        setEditRole(prev => ({ ...prev, name: value }));
                                        if (editFormErrors.name) {
                                            setEditFormErrors(prev => ({ ...prev, name: '' }));
                                        }
                                    }}
                                    placeholder="Enter custom role name (will be converted to uppercase)"
                                />
                                {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                            </div>
                        )}

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
                            <label className="form-label">Tab Access*</label>
                            {editFormErrors.tabPermissions && <div className="text-danger small mb-2">{editFormErrors.tabPermissions}</div>}

                            <div className="border rounded p-3">
                                <div className="row">
                                    {TAB_PERMISSIONS.map(tab => (
                                        <div key={tab} className="col-md-4 mb-3">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`edit-tab-${tab}`}
                                                    checked={editRole.tabPermissions[tab.toLowerCase()] || false}
                                                    onChange={(e) => handleEditTabPermissionChange(tab.toLowerCase(), e.target.checked)}
                                                    disabled={tab === 'DASHBOARD'}
                                                />
                                                <h8 className="form-check-label" htmlFor={`edit-tab-${tab}`}>
                                                    {tab.replace(/_/g, ' ')}
                                                    {tab === 'DASHBOARD' && <span className="text-muted small ms-1">(required)</span>}
                                                </h8>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                                                        {permission.replace(/_/g, ' ')}
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
                                <h8 className="fs-6">{selectedRole.name}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Description</h5>
                                <h8 className="fs-6">{selectedRole.description}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Tab Access</h5>
                                <div className="d-flex flex-wrap gap-2">
                                    {TAB_PERMISSIONS.map(tab => (
                                        selectedRole.tabPermissions[tab.toLowerCase()] && (
                                            <span key={tab} className="badge bg-info">
                                                {tab.replace(/_/g, ' ')}
                                            </span>
                                        )
                                    ))}
                                </div>
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
                                                            {permission.replace(/_/g, ' ')}
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