import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye, FiUpload } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Switch from '@mui/material/Switch';
import Modal from 'react-bootstrap/Modal';
import Select from 'react-select';

const DealsTable = () => {
    const [deals, setDeals] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [dealToDelete, setDealToDelete] = useState(null);
    const [newDeal, setNewDeal] = useState({
        name: '',
        description: '',
        price: 0,
        items: [],
        imageUrl: ''
    });
    const [editDeal, setEditDeal] = useState({
        id: '',
        name: '',
        description: '',
        price: 0,
        items: [],
        imageUrl: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';
    const [selectedItems, setSelectedItems] = useState([]);

    const authData = JSON.parse(localStorage.getItem("authData"));
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

    const fetchItems = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/items`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to fetch items');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setItems(data.data);
            } else {
                throw new Error(data.error || data.message || 'Failed to fetch items');
            }
        } catch (err) {
            toast.error(err.message);
        }
    }, []);

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Image</th>
                            <th scope="col">Name</th>
                            <th scope="col">Description</th>
                            <th scope="col">Price</th>
                            <th scope="col">Items</th>
                            <th scope="col">Status</th>
                            <th scope="col" className="text-end">Actions</th>
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
                <h5 className="mb-2">No Deals Found</h5>
                <p className="text-muted mb-4">You haven't added any deals yet. Start by adding a new deal.</p>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2 mx-auto"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Deal
                </Button>
            </div>
        );
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB');
            return;
        }

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const fetchDeals = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/deals`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to fetch deals');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setDeals(data.data);
            } else {
                throw new Error(data.error || data.message || 'Failed to fetch deals');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const getItemNameById = (itemId) => {
        const item = items.find(item => item.id === itemId);
        return item ? item.name : `Item (ID: ${itemId})`;
    };

    const getItemDetailsById = (itemId) => {
        const item = items.find(item => item.id === itemId);
        return item || null;
    };

    const handleItemSelection = (selectedOptions, action) => {
        if (action.action === 'select-option' || action.action === 'remove-value' || action.action === 'pop-value') {
            const selectedItemsWithQuantity = selectedOptions.map(option => ({
                itemId: option.value,
                quantity: 1
            }));
            setNewDeal(prev => ({
                ...prev,
                items: selectedItemsWithQuantity
            }));
            setSelectedItems(selectedOptions);
        }
    };

    const handleEditItemSelection = (selectedOptions, action) => {
        if (action.action === 'select-option' || action.action === 'remove-value' || action.action === 'pop-value') {
            const selectedItemsWithQuantity = selectedOptions.map(option => ({
                itemId: option.value,
                quantity: editDeal.items.find(item => item.itemId === option.value)?.quantity || 1
            }));
            setEditDeal(prev => ({
                ...prev,
                items: selectedItemsWithQuantity
            }));
        }
    };

    const handleQuantityChange = (itemId, quantity) => {
        setNewDeal(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.itemId === itemId ? { ...item, quantity: parseInt(quantity) || 1 } : item
            )
        }));
    };

    const handleEditQuantityChange = (itemId, quantity) => {
        setEditDeal(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.itemId === itemId ? { ...item, quantity: parseInt(quantity) || 1 } : item
            )
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewDeal(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditDeal(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (formData.price <= 0) errors.price = 'Price must be greater than 0';
        if (formData.items.length === 0) errors.items = 'At least one item is required';
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newDeal, setFormErrors)) return;

        try {
            setUploadingImage(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/client-admin/deals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newDeal.name,
                    description: newDeal.description,
                    price: newDeal.price,
                    items: newDeal.items
                })
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMsg = data.error || data.message || 'Failed to create deal';
                throw new Error(errorMsg);
            }

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const uploadResponse = await fetch(`${BASE_URL}/api/client-admin/deals/${data.data.id}/image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authData.token}`,
                    },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const uploadError = await uploadResponse.json();
                    throw new Error(uploadError.error || uploadError.message || 'Failed to upload image');
                }
            }

            toast.success('Deal created successfully');
            await fetchDeals();
            setIsModalOpen(false);
            setNewDeal({
                name: '',
                description: '',
                price: 0,
                items: [],
                imageUrl: ''
            });
            setSelectedFile(null);
            setImagePreview('');
            setSelectedItems([]);
        } catch (err) {
            toast.error(err.message);
            setIsModalOpen(false);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editDeal, setEditFormErrors)) return;

        try {
            setUploadingImage(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/client-admin/deals/${editDeal.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editDeal.name,
                    description: editDeal.description,
                    price: editDeal.price,
                    items: editDeal.items
                })
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMsg = data.error || data.message || 'Failed to update deal';
                throw new Error(errorMsg);
            }

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const uploadResponse = await fetch(`${BASE_URL}/api/client-admin/deals/${editDeal.id}/image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authData.token}`,
                    },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const uploadError = await uploadResponse.json();
                    throw new Error(uploadError.error || uploadError.message || 'Failed to upload image');
                }
            }

            toast.success('Deal updated successfully');
            await fetchDeals();
            setIsEditModalOpen(false);
            setSelectedFile(null);
            setImagePreview('');
        } catch (err) {
            toast.error(err.message);
            setIsModalOpen(false);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleStatusChange = async (deal) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const newStatus = !deal.active;

            setDeals(prev => prev.map(d =>
                d.id === deal.id ? { ...d, active: newStatus } : d
            ));

            const response = await fetch(`${BASE_URL}/api/client-admin/deals/${deal.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: newStatus })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to update deal status');
            }

            toast.success(`Deal ${newStatus ? 'activated' : 'deactivated'} successfully`);
            await fetchDeals();
        } catch (err) {
            toast.error(err.message);
            setDeals(prev => prev.map(d =>
                d.id === deal.id ? { ...d, active: deal.active } : d
            ));
        }
    };

    const handleViewDeal = (deal) => {
        setSelectedDeal(deal);
        setIsViewModalOpen(true);
    };

    const handleEditDeal = (deal) => {
        setEditDeal({
            id: deal.id,
            name: deal.name,
            description: deal.description,
            price: deal.price,
            items: deal.items,
            imageUrl: deal.imageUrl || ''
        });
        setSelectedFile(null);
        setImagePreview('');
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (deal) => {
        setDealToDelete(deal);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteDeal = async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const response = await fetch(`${BASE_URL}/api/client-admin/deals/${dealToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMsg = data.error || data.message || 'Failed to delete deal';
                throw new Error(errorMsg);
            }

            toast.success('Deal deleted successfully');
            await fetchDeals();
            setIsDeleteModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'imageUrl',
            header: 'Image',
            cell: (info) => (
                info.getValue() ? (
                    <img
                        src={info.getValue()}
                        alt="Deal"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                ) : (
                    <img
                        src="/images/avatar/1.png"
                        alt="Deal"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                )
            )
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'price',
            header: 'Price',
            cell: (info) => `${currencySymbol}${info.getValue().toFixed(2)}`
        },
        {
            accessorKey: 'items',
            header: 'Items',
            cell: (info) => (
                <div>
                    {info.getValue().map((item, index) => (
                        <div key={index}>
                            {getItemNameById(item.itemId)} (Qty: {item.quantity})
                        </div>
                    ))}
                </div>
            )
        },
        {
            accessorKey: 'active',
            header: 'Status',
            cell: (info) => (
                <Switch
                    checked={info.getValue()}
                    onChange={() => handleStatusChange(info.row.original)}
                    color="primary"
                />
            )
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleViewDeal(row.original)}
                    >
                        <FiEye />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditDeal(row.original)}
                    >
                        <FiEdit />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleDeleteClick(row.original)}
                    >
                        <FiTrash />
                    </button>
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], [items]);

    useEffect(() => {
        fetchDeals();
        fetchItems();
    }, [fetchDeals, fetchItems]);

    const itemOptions = items.map(item => ({
        value: item.id,
        label: item.name,
        price: item.price
    }));

    const editSelectedItems = editDeal.items.map(item => ({
        value: item.itemId,
        label: getItemNameById(item.itemId),
        quantity: item.quantity
    }));

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
                <h4>Deals</h4>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Deal
                </Button>
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : deals.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={deals}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Add Deal Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewDeal({ name: '', description: '', price: 0, items: [], imageUrl: '' });
                setFormErrors({});
                setSelectedFile(null);
                setImagePreview('');
                setSelectedItems([]);
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Deal</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="name" className="form-label">Name</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                id="name"
                                name="name"
                                value={newDeal.name}
                                onChange={handleInputChange}
                            />
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="description" className="form-label">Description</label>
                            <textarea
                                className="form-control"
                                id="description"
                                name="description"
                                value={newDeal.description}
                                onChange={handleInputChange}
                                rows="3"
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="price" className="form-label">Price</label>
                            <input
                                type="number"
                                className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                                id="price"
                                name="price"
                                value={newDeal.price}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                            />
                            {formErrors.price && <div className="invalid-feedback">{formErrors.price}</div>}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Items</label>
                            <Select
                                isMulti
                                options={itemOptions}
                                className="basic-multi-select"
                                classNamePrefix="select"
                                onChange={handleItemSelection}
                                value={selectedItems}
                                placeholder="Select items..."
                            />
                            {formErrors.items && <div className="invalid-feedback d-block">{formErrors.items}</div>}

                            {newDeal.items.length > 0 && (
                                <div className="mt-3">
                                    <h6>Selected Items:</h6>
                                    {newDeal.items.map((item, index) => {
                                        const itemDetails = getItemDetailsById(item.itemId);
                                        return (
                                            <div key={index} className="d-flex align-items-center mb-2">
                                                <div className="flex-grow-1">
                                                    <h8>{itemDetails ? itemDetails.name : `Item ID: ${item.itemId}`}</h8>
                                                    {itemDetails && (
                                                        <div className="text-muted small">{currencySymbol}{itemDetails.price.toFixed(2)} each</div>
                                                    )}
                                                </div>
                                                <div className="d-flex align-items-center">
                                                    <h8 className="me-2">Qty:</h8>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="form-control form-control-sm"
                                                        style={{ width: '70px' }}
                                                        value={item.quantity}
                                                        onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Deal Image</label>
                            <div className="d-flex flex-wrap gap-3 mb-3">
                                <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                                    <div
                                        className="w-100 h-100 border rounded d-flex flex-column justify-content-center align-items-center cursor-pointer"
                                        style={{
                                            borderStyle: imagePreview ? 'solid' : 'dashed',
                                            backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa'
                                        }}
                                        onClick={() => document.getElementById('add-image-upload').click()}
                                    >
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-100 h-100"
                                                style={{
                                                    objectFit: 'cover',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <FiUpload size={20} className="mb-1" />
                                                <h8 className="small">Add Image</h8>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        id="add-image-upload"
                                        className="d-none"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                        disabled={uploadingImage}
                    >
                        {uploadingImage ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating...
                            </>
                        ) : (
                            'Create'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Deal Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
                setSelectedFile(null);
                setImagePreview('');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Deal</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleEditSubmit}>
                        <div className="mb-3">
                            <label htmlFor="edit-name" className="form-label">Name</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                id="edit-name"
                                name="name"
                                value={editDeal.name}
                                onChange={handleEditInputChange}
                            />
                            {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-description" className="form-label">Description</label>
                            <textarea
                                className="form-control"
                                id="edit-description"
                                name="description"
                                value={editDeal.description}
                                onChange={handleEditInputChange}
                                rows="3"
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-price" className="form-label">Price</label>
                            <input
                                type="number"
                                className={`form-control ${editFormErrors.price ? 'is-invalid' : ''}`}
                                id="edit-price"
                                name="price"
                                value={editDeal.price}
                                onChange={handleEditInputChange}
                                min="0"
                                step="0.01"
                            />
                            {editFormErrors.price && <div className="invalid-feedback">{editFormErrors.price}</div>}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Items</label>
                            <Select
                                isMulti
                                options={itemOptions}
                                className="basic-multi-select"
                                classNamePrefix="select"
                                onChange={handleEditItemSelection}
                                value={editSelectedItems}
                                placeholder="Select items..."
                            />
                            {editFormErrors.items && <div className="invalid-feedback d-block">{editFormErrors.items}</div>}

                            {editDeal.items.length > 0 && (
                                <div className="mt-3">
                                    <h6>Selected Items:</h6>
                                    {editDeal.items.map((item, index) => {
                                        const itemDetails = getItemDetailsById(item.itemId);
                                        return (
                                            <div key={index} className="d-flex align-items-center mb-2">
                                                <div className="flex-grow-1">
                                                    <h8>{itemDetails ? itemDetails.name : `Item ID: ${item.itemId}`}</h8>
                                                    {itemDetails && (
                                                        <div className="text-muted small">{currencySymbol}{itemDetails.price.toFixed(2)} each</div>
                                                    )}
                                                </div>
                                                <div className="d-flex align-items-center">
                                                    <h8 className="me-2">Qty:</h8>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="form-control form-control-sm"
                                                        style={{ width: '70px' }}
                                                        value={item.quantity}
                                                        onChange={(e) => handleEditQuantityChange(item.itemId, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Deal Image</label>
                            <div className="d-flex flex-wrap gap-3 mb-3">
                                {editDeal.imageUrl && (
                                    <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                                        <img
                                            src={editDeal.imageUrl}
                                            alt="Deal"
                                            className="w-100 h-100"
                                            style={{
                                                objectFit: 'cover',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                )}
                                <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                                    <div
                                        className="w-100 h-100 border rounded d-flex flex-column justify-content-center align-items-center cursor-pointer"
                                        style={{
                                            borderStyle: imagePreview ? 'solid' : 'dashed',
                                            backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa'
                                        }}
                                        onClick={() => document.getElementById('edit-image-upload').click()}
                                    >
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-100 h-100"
                                                style={{
                                                    objectFit: 'cover',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <FiUpload size={20} className="mb-1" />
                                                <h8 className="small">Change Image</h8>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        id="edit-image-upload"
                                        className="d-none"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleEditSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                        disabled={uploadingImage}
                    >
                        {uploadingImage ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Updating...
                            </>
                        ) : (
                            'Update'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View Deal Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Deal Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDeal && (
                        <div>
                            <div className="mb-3">
                                <h5>Name</h5>
                                <h8>{selectedDeal.name}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Description</h5>
                                <h8>{selectedDeal.description || '-'}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Price</h5>
                                <h8>{currencySymbol}{selectedDeal.price.toFixed(2)}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Status</h5>
                                <h8>{selectedDeal.active ? 'Active' : 'Inactive'}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Items</h5>
                                <ul className="list-unstyled">
                                    {selectedDeal.items.map((item, index) => {
                                        const itemDetails = getItemDetailsById(item.itemId);
                                        return (
                                            <li key={index} className="mb-2">
                                                {itemDetails ? (
                                                    <>
                                                        <div className="d-flex justify-content-between">
                                                            <h8>{itemDetails.name}</h8>
                                                            <h8>Qty: {item.quantity}</h8>
                                                        </div>
                                                        <div className="text-muted small">{currencySymbol}{itemDetails.price.toFixed(2)} each</div>
                                                    </>
                                                ) : (
                                                    <div className="d-flex justify-content-between">
                                                        <span>Item ID: {item.itemId}</span>
                                                        <span>Qty: {item.quantity}</span>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div className="mb-3">
                                <h5>Image</h5>
                                <div className="d-flex flex-wrap gap-3">
                                    {selectedDeal.imageUrl ? (
                                        <div style={{ width: '200px', height: '200px' }}>
                                            <img
                                                src={selectedDeal.imageUrl}
                                                alt="Deal"
                                                className="w-100 h-100"
                                                style={{
                                                    objectFit: 'cover',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ width: '200px', height: '200px' }}>
                                            <img
                                                src="/images/avatar/1.png"
                                                alt="Deal"
                                                className="w-100 h-100"
                                                style={{
                                                    objectFit: 'cover',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onHide={() => setIsDeleteModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Delete Deal</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {dealToDelete && (
                        <>
                            <h8>Are you sure you want to delete the deal <strong>{dealToDelete.name}</strong>? </h8>
                            <h8>This action cannot be undone.</h8>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteDeal}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default DealsTable;