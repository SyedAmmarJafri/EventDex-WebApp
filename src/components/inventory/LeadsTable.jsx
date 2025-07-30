import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiEdit } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';

const InventoryTable = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState({
        id: '',
        name: '',
        description: '',
        price: 0,
        quantity: 0,
        lowStockThreshold: 5,
        category: '',
        categoryName: '',
        primaryImageUrl: '',
        active: true
    });
    const [editFormErrors, setEditFormErrors] = useState({});
    const [userPermissions, setUserPermissions] = useState([]);
    const [userRole, setUserRole] = useState('');
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Initialize user permissions and role
    useEffect(() => {
        const authData = JSON.parse(localStorage.getItem("authData"));
        if (authData) {
            setUserRole(authData.role || '');
            setUserPermissions(authData.permissions || []);
        }
    }, []);

    // Check if user has permission
    const hasPermission = (permission) => {
        if (userRole === 'CLIENT_ADMIN') return true;
        return userPermissions.includes(permission);
    };

    // Custom toast notification function
    const showToast = (message, type = 'success') => {
        const toastOptions = {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
        };

        if (type === 'success') {
            toast.success(message, toastOptions);
        } else if (type === 'error') {
            toast.error(message, toastOptions);
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
                <h5 className="mb-2">No Inventory Items Found</h5>
                <p className="text-muted mb-4">Your inventory is currently empty. Add items to get started.</p>
            </div>
        );
    };

    // Skeleton loader component
    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Image</th>
                            <th scope="col">Name</th>
                            <th scope="col">Quantity</th>
                            <th scope="col">Low Stock Threshold</th>
                            <th scope="col">Category</th>
                            <th scope="col">Status</th>
                            {hasPermission('ITEM_UPDATE') && <th scope="col" className="text-end">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
                                <td>
                                    <Skeleton
                                        circle
                                        width={40}
                                        height={40}
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
                                        width={120}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={60}
                                        height={24}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                {hasPermission('ITEM_UPDATE') && (
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
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Fetch items
    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/items`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setItems(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch items');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/categories`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }, []);

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, [fetchItems, fetchCategories]);

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditItem(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.quantity < 0) errors.quantity = 'Quantity cannot be negative';
        if (formData.lowStockThreshold < 0) errors.lowStockThreshold = 'Threshold cannot be negative';
        if (!formData.category) errors.category = 'Category is required';
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editItem, setEditFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const response = await fetch(`${BASE_URL}/api/client-admin/items/${editItem.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quantity: editItem.quantity,
                    lowStockThreshold: editItem.lowStockThreshold,
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update item');
            }

            showToast('Item updated successfully');
            await fetchItems();
            setIsEditModalOpen(false);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleEditItem = (item) => {
        setEditItem({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            quantity: item.quantity,
            lowStockThreshold: item.lowStockThreshold || 5,
            category: item.category,
            categoryName: item.categoryName,
            primaryImageUrl: item.primaryImageUrl,
            active: item.active
        });
        setIsEditModalOpen(true);
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'primaryImageUrl',
            header: 'Image',
            cell: (info) => (
                info.getValue() ? (
                    <img
                        src={info.getValue()}
                        alt="Item"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                ) : <img
                    src="/images/avatar/1.png"
                    alt="Item"
                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                />
            )
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'categoryName',
            header: 'Category',
            cell: (info) => info.getValue() || 'N/A'
        },
        {
            accessorKey: 'quantity',
            header: 'Quantity',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'lowStockThreshold',
            header: 'Low Stock Threshold',
            cell: (info) => info.getValue() || '5'
        },
        ...(hasPermission('ITEM_UPDATE') ? [{
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditItem(row.original)}
                    >
                        <FiEdit />
                    </button>
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        }] : [])
    ], [hasPermission]);

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Inventory</h4>
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : items.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={items}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Edit Item Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Update Inventory</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleEditSubmit}>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label htmlFor="edit-quantity" className="form-label">Quantity</label>
                                <input
                                    type="number"
                                    className={`form-control ${editFormErrors.quantity ? 'is-invalid' : ''}`}
                                    id="edit-quantity"
                                    name="quantity"
                                    value={editItem.quantity}
                                    onChange={handleEditInputChange}
                                    min="0"
                                />
                                {editFormErrors.quantity && <div className="invalid-feedback">{editFormErrors.quantity}</div>}
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="edit-lowStockThreshold" className="form-label">Low Stock Threshold</label>
                                <input
                                    type="number"
                                    className={`form-control ${editFormErrors.lowStockThreshold ? 'is-invalid' : ''}`}
                                    id="edit-lowStockThreshold"
                                    name="lowStockThreshold"
                                    value={editItem.lowStockThreshold}
                                    onChange={handleEditInputChange}
                                    min="0"
                                />
                                {editFormErrors.lowStockThreshold && <div className="invalid-feedback">{editFormErrors.lowStockThreshold}</div>}
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
                        Update
                    </Button>
                </Modal.Footer>
            </Modal>

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
        </>
    );
};

export default InventoryTable;