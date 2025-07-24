import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye, FiUpload, FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/paths.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';
import Switch from '@mui/material/Switch';

const ItemsTable = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        price: 0,
        discountedPrice: 0,
        itemDiscountRate: 0,
        itemDiscountEnabled: false,
        quantity: 0,
        category: '',
        primaryImageUrl: '',
        active: true,
        barcode: '',
        lowStockThreshold: 0,
        variants: []
    });
    const [editItem, setEditItem] = useState({
        id: '',
        name: '',
        description: '',
        price: 0,
        discountedPrice: 0,
        itemDiscountRate: 0,
        itemDiscountEnabled: false,
        quantity: 0,
        category: '',
        categoryName: '',
        primaryImageUrl: '',
        imageUrls: [],
        active: true,
        barcode: '',
        lowStockThreshold: 0,
        variants: []
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [expandedVariantIndex, setExpandedVariantIndex] = useState(null);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Get currency settings from localStorage
    const authData = JSON.parse(localStorage.getItem("authData"));
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

    // Toast notification helpers
    const showSuccessToast = (message) => {
        toast.success(message, {
            position: "bottom-center",
            autoClose: 5000,
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
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
        });
    };

    // Variant management functions
    const addNewVariant = (isEdit = false) => {
        const newVariant = {
            name: '',
            description: '',
            options: [{ name: '', priceModifier: 0 }],
            required: false
        };

        if (isEdit) {
            setEditItem(prev => ({
                ...prev,
                variants: [...prev.variants, newVariant]
            }));
            setExpandedVariantIndex(editItem.variants.length);
        } else {
            setNewItem(prev => ({
                ...prev,
                variants: [...prev.variants, newVariant]
            }));
        }
    };

    const removeVariant = (index, isEdit = false) => {
        if (isEdit) {
            setEditItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants.splice(index, 1);
                return { ...prev, variants: updatedVariants };
            });
            if (expandedVariantIndex === index) {
                setExpandedVariantIndex(null);
            } else if (expandedVariantIndex > index) {
                setExpandedVariantIndex(expandedVariantIndex - 1);
            }
        } else {
            setNewItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants.splice(index, 1);
                return { ...prev, variants: updatedVariants };
            });
        }
    };

    const updateVariant = (index, field, value, isEdit = false) => {
        if (isEdit) {
            setEditItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[index] = { ...updatedVariants[index], [field]: value };
                return { ...prev, variants: updatedVariants };
            });
        } else {
            setNewItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[index] = { ...updatedVariants[index], [field]: value };
                return { ...prev, variants: updatedVariants };
            });
        }
    };

    const addOptionToVariant = (variantIndex, isEdit = false) => {
        const newOption = { name: '', priceModifier: 0 };
        if (isEdit) {
            setEditItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[variantIndex].options = [...updatedVariants[variantIndex].options, newOption];
                return { ...prev, variants: updatedVariants };
            });
        } else {
            setNewItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[variantIndex].options = [...updatedVariants[variantIndex].options, newOption];
                return { ...prev, variants: updatedVariants };
            });
        }
    };

    const removeOptionFromVariant = (variantIndex, optionIndex, isEdit = false) => {
        if (isEdit) {
            setEditItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[variantIndex].options.splice(optionIndex, 1);
                return { ...prev, variants: updatedVariants };
            });
        } else {
            setNewItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[variantIndex].options.splice(optionIndex, 1);
                return { ...prev, variants: updatedVariants };
            });
        }
    };

    const updateOption = (variantIndex, optionIndex, field, value, isEdit = false) => {
        if (isEdit) {
            setEditItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[variantIndex].options[optionIndex] = {
                    ...updatedVariants[variantIndex].options[optionIndex],
                    [field]: value
                };
                return { ...prev, variants: updatedVariants };
            });
        } else {
            setNewItem(prev => {
                const updatedVariants = [...prev.variants];
                updatedVariants[variantIndex].options[optionIndex] = {
                    ...updatedVariants[variantIndex].options[optionIndex],
                    [field]: value
                };
                return { ...prev, variants: updatedVariants };
            });
        }
    };

    const toggleVariantExpansion = (index) => {
        setExpandedVariantIndex(expandedVariantIndex === index ? null : index);
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
                <h5 className="mb-2">No Items Found</h5>
                <p className="text-muted mb-4">You haven't added any items yet. Start by adding a new item.</p>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2 mx-auto"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Item
                </Button>
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
                            <th scope="col">Category</th>
                            <th scope="col">Price</th>
                            <th scope="col">Discounted Price</th>
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
                                    <Skeleton
                                        width={80}
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
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch items');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setItems(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch items');
            }
        } catch (err) {
            showErrorToast(err.message);
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
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch categories');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setCategories(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch categories');
            }
        } catch (err) {
            showErrorToast(err.message);
        }
    }, []);

    // Handle status toggle
    const handleStatusChange = async (itemId, currentStatus) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const response = await fetch(`${BASE_URL}/api/client-admin/items/${itemId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    active: !currentStatus
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update item status');
            }

            showSuccessToast('Item status updated successfully');
            await fetchItems();
        } catch (err) {
            showErrorToast(err.message);
        }
    };

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, [fetchItems, fetchCategories]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setNewItem(prev => ({ ...prev, [name]: val }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setEditItem(prev => ({ ...prev, [name]: val }));

        // Calculate discounted price when discount rate changes
        if (name === 'itemDiscountRate') {
            const discountRate = parseFloat(val) || 0;
            const price = parseFloat(editItem.price) || 0;
            const discountedPrice = price - (price * discountRate / 100);
            setEditItem(prev => ({
                ...prev,
                discountedPrice: !isNaN(discountedPrice) ? parseFloat(discountedPrice.toFixed(2)) : 0
            }));
        }

        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handle file selection and preview
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            showErrorToast('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showErrorToast('File size should be less than 5MB');
            return;
        }

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Handle image deletion
    const handleDeleteImage = async (imageUrl) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            // Construct the URL with query parameters
            const deleteUrl = new URL(`${BASE_URL}/api/client-admin/items/${editItem.id}/images`);
            deleteUrl.searchParams.append('imageUrl', imageUrl);

            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete image');
            }

            showSuccessToast('Image deleted successfully');

            // Update the state to remove the deleted image
            setEditItem(prev => ({
                ...prev,
                imageUrls: prev.imageUrls.filter(url => url !== imageUrl)
            }));

            // If the deleted image was the primary image, clear the primary image
            if (editItem.primaryImageUrl === imageUrl) {
                setEditItem(prev => ({
                    ...prev,
                    primaryImageUrl: prev.imageUrls.length > 1 ?
                        prev.imageUrls.find(url => url !== imageUrl) : ''
                }));
            }

            // Refresh the items list
            await fetchItems();
        } catch (err) {
            showErrorToast(err.message);
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.price <= 0) errors.price = 'Price must be greater than 0';
        if (formData.quantity < 0) errors.quantity = 'Quantity cannot be negative';
        if (!formData.category) errors.category = 'Category is required';
        if (formData.itemDiscountEnabled && (formData.itemDiscountRate < 0 || formData.itemDiscountRate > 100)) {
            errors.itemDiscountRate = 'Discount rate must be between 0 and 100';
        }

        // Validate variants
        if (formData.variants && formData.variants.length > 0) {
            formData.variants.forEach((variant, index) => {
                if (!variant.name.trim()) {
                    errors[`variantName_${index}`] = 'Variant name is required';
                }

                if (variant.options && variant.options.length > 0) {
                    variant.options.forEach((option, optIndex) => {
                        if (!option.name.trim()) {
                            errors[`optionName_${index}_${optIndex}`] = 'Option name is required';
                        }
                    });
                } else {
                    errors[`variantOptions_${index}`] = 'At least one option is required';
                }
            });
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newItem, setFormErrors)) return;

        try {
            setUploadingImage(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            // Calculate discounted price if discount is enabled
            const discountedPrice = newItem.itemDiscountEnabled
                ? newItem.price - (newItem.price * newItem.itemDiscountRate / 100)
                : 0;

            const response = await fetch(`${BASE_URL}/api/client-admin/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...newItem,
                    discountedPrice: parseFloat(discountedPrice.toFixed(2)),
                    category: newItem.category || null,
                    variants: newItem.variants.length > 0 ? newItem.variants : null
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create item');
            }

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('primary', true);

                const uploadResponse = await fetch(`${BASE_URL}/api/client-admin/items/${data.data.id}/images`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authData.token}`,
                    },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const uploadError = await uploadResponse.json();
                    throw new Error(uploadError.message || 'Failed to upload image');
                }
            }

            showSuccessToast('Item created successfully');
            await fetchItems();
            setIsModalOpen(false);
            setNewItem({
                name: '',
                description: '',
                price: 0,
                discountedPrice: 0,
                itemDiscountRate: 0,
                itemDiscountEnabled: false,
                quantity: 0,
                category: '',
                primaryImageUrl: '',
                active: true,
                barcode: '',
                lowStockThreshold: 0,
                variants: []
            });
            setSelectedFile(null);
            setImagePreview('');
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editItem, setEditFormErrors)) return;

        try {
            setUploadingImage(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            let imageUrl = editItem.primaryImageUrl;
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('primary', true);

                const uploadResponse = await fetch(`${BASE_URL}/api/client-admin/items/${editItem.id}/images`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authData.token}`,
                    },
                    body: formData
                });

                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok) {
                    throw new Error(uploadData.message || 'Failed to upload image');
                }

                imageUrl = uploadData.imageUrl;
            }

            // Calculate discounted price if discount is enabled
            const discountedPrice = editItem.itemDiscountEnabled
                ? editItem.price - (editItem.price * editItem.itemDiscountRate / 100)
                : 0;

            const response = await fetch(`${BASE_URL}/api/client-admin/items/${editItem.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editItem.name,
                    description: editItem.description,
                    price: editItem.price,
                    discountedPrice: parseFloat(discountedPrice.toFixed(2)),
                    itemDiscountRate: editItem.itemDiscountRate,
                    itemDiscountEnabled: editItem.itemDiscountEnabled,
                    quantity: editItem.quantity,
                    category: editItem.category || null,
                    primaryImageUrl: imageUrl,
                    active: editItem.active,
                    barcode: editItem.barcode,
                    lowStockThreshold: editItem.lowStockThreshold,
                    variants: editItem.variants.length > 0 ? editItem.variants : null
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update item');
            }

            showSuccessToast('Item updated successfully');
            await fetchItems();
            setIsEditModalOpen(false);
            setSelectedFile(null);
            setImagePreview('');
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteItem = async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const response = await fetch(`${BASE_URL}/api/client-admin/items/${itemToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete item');
            }

            showSuccessToast('Item deleted successfully');
            await fetchItems();
            setIsDeleteModalOpen(false);
        } catch (err) {
            showErrorToast(err.message);
        }
    };

    const handleViewItem = (item) => {
        setSelectedItem(item);
        setIsViewModalOpen(true);
    };

    const handleEditItem = (item) => {
        setEditItem({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            discountedPrice: item.discountedPrice || 0,
            itemDiscountRate: item.itemDiscountRate || 0,
            itemDiscountEnabled: item.itemDiscountEnabled || false,
            quantity: item.quantity,
            category: item.category,
            categoryName: item.categoryName,
            primaryImageUrl: item.primaryImageUrl,
            imageUrls: item.imageUrls || [],
            active: item.active,
            barcode: item.barcode || '',
            lowStockThreshold: item.lowStockThreshold || 0,
            variants: item.variants || []
        });
        setSelectedFile(null);
        setImagePreview('');
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
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
                ) : (
                    <img
                        src="/images/avatar/1.png"
                        alt="Item"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                )
            )
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => (
                <div>
                    {info.getValue()}
                    {info.row.original.variants && info.row.original.variants.length > 0 && (
                        <span className="badge bg-primary ms-2">Variants</span>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'categoryName',
            header: 'Category',
            cell: (info) => info.getValue() || 'N/A'
        },
        {
            accessorKey: 'price',
            header: 'Price',
            cell: (info) => {
                const value = info.getValue();
                return value !== null && value !== undefined
                    ? `${currencySymbol}${Number(value).toFixed(2)}`
                    : `${currencySymbol}0.00`;
            }
        },
        {
            accessorKey: 'discountedPrice',
            header: 'Discounted Price',
            cell: (info) => {
                const item = info.row.original;
                if (!item.itemDiscountEnabled) return '-';

                const value = item.discountedPrice;
                return value !== null && value !== undefined
                    ? `${currencySymbol}${Number(value).toFixed(2)}`
                    : `${currencySymbol}0.00`;
            }
        },
        {
            accessorKey: 'active',
            header: 'Status',
            cell: ({ row }) => (
                <Switch
                    checked={row.original.active}
                    onChange={() => handleStatusChange(row.original.id, row.original.active)}
                    color="primary"
                    inputProps={{
                        'aria-label': 'status switch',
                        'id': `status-switch-${row.original.id}`
                    }}
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
                        onClick={() => handleViewItem(row.original)}
                    >
                        <FiEye />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditItem(row.original)}
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
    ], [categories, currencySymbol]);

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
                <h4>Item</h4>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Item
                </Button>
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

            {/* Add Item Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewItem({
                    name: '',
                    description: '',
                    price: 0,
                    discountedPrice: 0,
                    itemDiscountRate: 0,
                    itemDiscountEnabled: false,
                    quantity: 0,
                    category: '',
                    primaryImageUrl: '',
                    active: true,
                    barcode: '',
                    lowStockThreshold: 0,
                    variants: []
                });
                setFormErrors({});
                setSelectedFile(null);
                setImagePreview('');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Item</Modal.Title>
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
                                value={newItem.name}
                                onChange={handleInputChange}
                            />
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="description" className="form-label">Description</label>
                            <textarea
                                className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                                id="description"
                                name="description"
                                value={newItem.description}
                                onChange={handleInputChange}
                                rows="2"
                                style={{ minHeight: '80px' }}
                            />
                            {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label htmlFor="price" className="form-label">Price</label>
                                <div className="input-group">
                                    <span className="input-group-text">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                                        id="price"
                                        name="price"
                                        value={newItem.price}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                    {formErrors.price && <div className="invalid-feedback">{formErrors.price}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="category" className="form-label">Category</label>
                                <select
                                    className={`form-control ${formErrors.category ? 'is-invalid' : ''}`}
                                    id="category"
                                    name="category"
                                    value={newItem.category}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.category && <div className="invalid-feedback">{formErrors.category}</div>}
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="itemDiscountEnabled"
                                        name="itemDiscountEnabled"
                                        checked={newItem.itemDiscountEnabled}
                                        onChange={handleInputChange}
                                    />
                                    <h8 className="form-check-label" htmlFor="itemDiscountEnabled">
                                        Enable Discount
                                    </h8>
                                </div>
                                {newItem.itemDiscountEnabled && (
                                    <div className="mb-3">
                                        <label htmlFor="itemDiscountRate" className="form-label">Discount Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={`form-control ${formErrors.itemDiscountRate ? 'is-invalid' : ''}`}
                                            id="itemDiscountRate"
                                            name="itemDiscountRate"
                                            value={newItem.itemDiscountRate}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="100"
                                        />
                                        {formErrors.itemDiscountRate && (
                                            <div className="invalid-feedback">{formErrors.itemDiscountRate}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="quantity" className="form-label">Quantity</label>
                                    <input
                                        type="number"
                                        className={`form-control ${formErrors.quantity ? 'is-invalid' : ''}`}
                                        id="quantity"
                                        name="quantity"
                                        value={newItem.quantity}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                    {formErrors.quantity && <div className="invalid-feedback">{formErrors.quantity}</div>}
                                </div>
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label htmlFor="barcode" className="form-label">Barcode</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="barcode"
                                    name="barcode"
                                    value={newItem.barcode}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="lowStockThreshold" className="form-label">Low Stock Threshold</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="lowStockThreshold"
                                    name="lowStockThreshold"
                                    value={newItem.lowStockThreshold}
                                    onChange={handleInputChange}
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Variants Section */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5>Variants</h5>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => addNewVariant()}
                                >
                                    Add Variant
                                </Button>
                            </div>

                            {newItem.variants.length === 0 ? (
                                <div className="text-muted mb-3">No variants added</div>
                            ) : (
                                <div className="accordion" id="variantsAccordion">
                                    {newItem.variants.map((variant, index) => (
                                        <div className="accordion-item mb-2" key={index}>
                                            <div className="accordion-header d-flex justify-content-between align-items-center p-2">
                                                <div className="d-flex align-items-center">
                                                    <button
                                                        className="btn btn-link me-2"
                                                        type="button"
                                                        onClick={() => toggleVariantExpansion(index)}
                                                    >
                                                        {expandedVariantIndex === index ? <FiChevronUp /> : <FiChevronDown />}
                                                    </button>
                                                    <span>
                                                        {variant.name || `Variant ${index + 1}`}
                                                        {variant.required && <span className="badge bg-info ms-2">Required</span>}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => removeVariant(index)}
                                                >
                                                    <FiX />
                                                </button>
                                            </div>

                                            <div className={`accordion-collapse ${expandedVariantIndex === index ? 'show' : 'collapse'}`}>
                                                <div className="accordion-body p-3">
                                                    <div className="mb-3">
                                                        <label htmlFor={`variantName-${index}`} className="form-label">Variant Name</label>
                                                        <input
                                                            type="text"
                                                            className={`form-control ${formErrors[`variantName_${index}`] ? 'is-invalid' : ''}`}
                                                            id={`variantName-${index}`}
                                                            value={variant.name}
                                                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                                        />
                                                        {formErrors[`variantName_${index}`] && (
                                                            <div className="invalid-feedback">{formErrors[`variantName_${index}`]}</div>
                                                        )}
                                                    </div>

                                                    <div className="mb-3">
                                                        <label htmlFor={`variantDesc-${index}`} className="form-label">Description (Optional)</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            id={`variantDesc-${index}`}
                                                            value={variant.description}
                                                            onChange={(e) => updateVariant(index, 'description', e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="form-check mb-3">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`variantRequired-${index}`}
                                                            checked={variant.required}
                                                            onChange={(e) => updateVariant(index, 'required', e.target.checked)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`variantRequired-${index}`}>
                                                            Required Selection
                                                        </label>
                                                    </div>

                                                    <div className="mb-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h6>Options</h6>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => addOptionToVariant(index)}
                                                            >
                                                                <FiPlus /> Add Option
                                                            </Button>
                                                        </div>

                                                        {variant.options.length === 0 ? (
                                                            <div className="text-muted">No options added</div>
                                                        ) : (
                                                            <div className="table-responsive">
                                                                <table className="table table-sm">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Option Name</th>
                                                                            <th>Price Modifier</th>
                                                                            <th>Action</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {variant.options.map((option, optIndex) => (
                                                                            <tr key={optIndex}>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className={`form-control form-control-sm ${formErrors[`optionName_${index}_${optIndex}`] ? 'is-invalid' : ''}`}
                                                                                        value={option.name}
                                                                                        onChange={(e) => updateOption(index, optIndex, 'name', e.target.value)}
                                                                                    />
                                                                                    {formErrors[`optionName_${index}_${optIndex}`] && (
                                                                                        <div className="invalid-feedback">{formErrors[`optionName_${index}_${optIndex}`]}</div>
                                                                                    )}
                                                                                </td>
                                                                                <td>
                                                                                    <div className="input-group input-group-sm">
                                                                                        <span className="input-group-text">{currencySymbol}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            className="form-control"
                                                                                            value={option.priceModifier}
                                                                                            onChange={(e) => updateOption(index, optIndex, 'priceModifier', parseFloat(e.target.value) || 0)}
                                                                                        />
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn btn-danger btn-sm"
                                                                                        onClick={() => removeOptionFromVariant(index, optIndex)}
                                                                                    >
                                                                                        <FiX />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Item Image</label>
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

            {/* Edit Item Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
                setSelectedFile(null);
                setImagePreview('');
                setExpandedVariantIndex(null);
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Item</Modal.Title>
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
                                value={editItem.name}
                                onChange={handleEditInputChange}
                            />
                            {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-description" className="form-label">Description</label>
                            <textarea
                                className={`form-control ${editFormErrors.description ? 'is-invalid' : ''}`}
                                id="edit-description"
                                name="description"
                                value={editItem.description}
                                onChange={handleEditInputChange}
                                rows="2"
                                style={{ minHeight: '80px' }}
                            />
                            {editFormErrors.description && <div className="invalid-feedback">{editFormErrors.description}</div>}
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label htmlFor="edit-price" className="form-label">Price</label>
                                <div className="input-group">
                                    <span className="input-group-text">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={`form-control ${editFormErrors.price ? 'is-invalid' : ''}`}
                                        id="edit-price"
                                        name="price"
                                        value={editItem.price}
                                        onChange={handleEditInputChange}
                                        min="0"
                                    />
                                    {editFormErrors.price && <div className="invalid-feedback">{editFormErrors.price}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="edit-category" className="form-label">Category</label>
                                <select
                                    className={`form-control ${editFormErrors.category ? 'is-invalid' : ''}`}
                                    id="edit-category"
                                    name="category"
                                    value={editItem.category}
                                    onChange={handleEditInputChange}
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                {editFormErrors.category && <div className="invalid-feedback">{editFormErrors.category}</div>}
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="edit-itemDiscountEnabled"
                                        name="itemDiscountEnabled"
                                        checked={editItem.itemDiscountEnabled}
                                        onChange={handleEditInputChange}
                                    />
                                    <h8 className="form-check-label" htmlFor="edit-itemDiscountEnabled">
                                        Enable Discount
                                    </h8>
                                </div>
                                {editItem.itemDiscountEnabled && (
                                    <div className="mb-3">
                                        <label htmlFor="edit-itemDiscountRate" className="form-label">Discount Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={`form-control ${editFormErrors.itemDiscountRate ? 'is-invalid' : ''}`}
                                            id="edit-itemDiscountRate"
                                            name="itemDiscountRate"
                                            value={editItem.itemDiscountRate}
                                            onChange={handleEditInputChange}
                                            min="0"
                                            max="100"
                                        />
                                        {editFormErrors.itemDiscountRate && (
                                            <div className="invalid-feedback">{editFormErrors.itemDiscountRate}</div>
                                        )}
                                        <div className="mt-2">
                                            <strong>Discounted Price:</strong> {currencySymbol}{
                                                editItem.discountedPrice !== null && editItem.discountedPrice !== undefined
                                                    ? editItem.discountedPrice.toFixed(2)
                                                    : '0.00'
                                            }
                                        </div>
                                    </div>
                                )}
                                <div className="mb-3">
                                    <label htmlFor="edit-barcode" className="form-label">Barcode</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="edit-barcode"
                                        name="barcode"
                                        value={editItem.barcode}
                                        onChange={handleEditInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Variants Section */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5>Variants</h5>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => addNewVariant(true)}
                                >
                                    Add Variant
                                </Button>
                            </div>

                            {editItem.variants.length === 0 ? (
                                <div className="text-muted mb-3">No variants added</div>
                            ) : (
                                <div className="accordion" id="editVariantsAccordion">
                                    {editItem.variants.map((variant, index) => (
                                        <div className="accordion-item mb-2" key={index}>
                                            <div className="accordion-header d-flex justify-content-between align-items-center p-2">
                                                <div className="d-flex align-items-center">
                                                    <button
                                                        className="btn btn-link me-2"
                                                        type="button"
                                                        onClick={() => toggleVariantExpansion(index)}
                                                    >
                                                        {expandedVariantIndex === index ? <FiChevronUp /> : <FiChevronDown />}
                                                    </button>
                                                    <h8>
                                                        {variant.name || `Variant ${index + 1}`}
                                                        {variant.required && <span className="badge bg-info ms-2">Required</span>}
                                                    </h8>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => removeVariant(index, true)}
                                                >
                                                    <FiX />
                                                </button>
                                            </div>

                                            <div className={`accordion-collapse ${expandedVariantIndex === index ? 'show' : 'collapse'}`}>
                                                <div className="accordion-body p-3">
                                                    <div className="mb-3">
                                                        <label htmlFor={`editVariantName-${index}`} className="form-label">Variant Name</label>
                                                        <input
                                                            type="text"
                                                            className={`form-control ${editFormErrors[`variantName_${index}`] ? 'is-invalid' : ''}`}
                                                            id={`editVariantName-${index}`}
                                                            value={variant.name}
                                                            onChange={(e) => updateVariant(index, 'name', e.target.value, true)}
                                                        />
                                                        {editFormErrors[`variantName_${index}`] && (
                                                            <div className="invalid-feedback">{editFormErrors[`variantName_${index}`]}</div>
                                                        )}
                                                    </div>

                                                    <div className="mb-3">
                                                        <label htmlFor={`editVariantDesc-${index}`} className="form-label">Description (Optional)</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            id={`editVariantDesc-${index}`}
                                                            value={variant.description}
                                                            onChange={(e) => updateVariant(index, 'description', e.target.value, true)}
                                                        />
                                                    </div>

                                                    <div className="form-check mb-3">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`editVariantRequired-${index}`}
                                                            checked={variant.required}
                                                            onChange={(e) => updateVariant(index, 'required', e.target.checked, true)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`editVariantRequired-${index}`}>
                                                            Required Selection
                                                        </label>
                                                    </div>

                                                    <div className="mb-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h6>Options</h6>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => addOptionToVariant(index, true)}
                                                            >
                                                                Add Option
                                                            </Button>
                                                        </div>

                                                        {variant.options.length === 0 ? (
                                                            <div className="text-muted">No options added</div>
                                                        ) : (
                                                            <div className="table-responsive">
                                                                <table className="table table-sm">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Option Name</th>
                                                                            <th>Price Modifier</th>
                                                                            <th>Action</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {variant.options.map((option, optIndex) => (
                                                                            <tr key={optIndex}>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className={`form-control form-control-sm ${editFormErrors[`optionName_${index}_${optIndex}`] ? 'is-invalid' : ''}`}
                                                                                        value={option.name}
                                                                                        onChange={(e) => updateOption(index, optIndex, 'name', e.target.value, true)}
                                                                                    />
                                                                                    {editFormErrors[`optionName_${index}_${optIndex}`] && (
                                                                                        <div className="invalid-feedback">{editFormErrors[`optionName_${index}_${optIndex}`]}</div>
                                                                                    )}
                                                                                </td>
                                                                                <td>
                                                                                    <div className="input-group input-group-sm">
                                                                                        <span className="input-group-text">{currencySymbol}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            className="form-control"
                                                                                            value={option.priceModifier}
                                                                                            onChange={(e) => updateOption(index, optIndex, 'priceModifier', parseFloat(e.target.value) || 0, true)}
                                                                                        />
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn btn-danger btn-sm"
                                                                                        onClick={() => removeOptionFromVariant(index, optIndex, true)}
                                                                                    >
                                                                                        <FiX />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Item Images</label>
                            <div className="d-flex flex-wrap gap-3 mb-3">
                                {editItem.imageUrls?.map((imageUrl, index) => (
                                    <div
                                        key={index}
                                        className="position-relative"
                                        style={{ width: '100px', height: '100px' }}
                                        onClick={() => setEditItem(prev => ({ ...prev, primaryImageUrl: imageUrl }))}
                                    >
                                        <img
                                            src={imageUrl}
                                            alt={`Item ${index}`}
                                            className="w-100 h-100 cursor-pointer"
                                            style={{
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                border: imageUrl === editItem.primaryImageUrl ? '2px solid #1976d2' : '1px solid #dee2e6'
                                            }}
                                        />
                                        <div className="position-absolute top-0 end-0 p-1">
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm p-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteImage(imageUrl);
                                                }}
                                                style={{ width: '24px', height: '24px' }}
                                            >
                                                <FiTrash size={12} />
                                            </button>
                                        </div>
                                        {imageUrl === editItem.primaryImageUrl && (
                                            <div className="position-absolute bottom-0 start-0 bg-primary text-white px-2 py-1 small">
                                                Primary
                                            </div>
                                        )}
                                    </div>
                                ))}

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
                                                <h8 className="small">Add Image</h8>
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

            {/* View Item Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Item Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Name</h5>
                                    <h8>{selectedItem.name}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Status</h5>
                                    <h8>{selectedItem.active ? 'Active' : 'Inactive'}</h8>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Price</h5>
                                    <h8>{currencySymbol}{selectedItem.price !== null && selectedItem.price !== undefined ? selectedItem.price.toFixed(2) : '0.00'}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Category</h5>
                                    <h8>{selectedItem.categoryName || 'N/A'}</h8>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Discount</h5>
                                    <h8>
                                        {selectedItem.itemDiscountEnabled ?
                                            `${selectedItem.itemDiscountRate}% (${currencySymbol}${selectedItem.discountedPrice !== null && selectedItem.discountedPrice !== undefined
                                                ? selectedItem.discountedPrice.toFixed(2)
                                                : '0.00'
                                            })` :
                                            'No discount'}
                                    </h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Quantity</h5>
                                    <h8>{selectedItem.quantity}</h8>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Barcode</h5>
                                    <h8>{selectedItem.barcode || 'N/A'}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Low Stock Threshold</h5>
                                    <h8>{selectedItem.lowStockThreshold || '0'}</h8>
                                </div>
                            </div>
                            <div className="mb-3">
                                <h5>Description</h5>
                                <h8>{selectedItem.description || 'N/A'}</h8>
                            </div>

                            {/* Variants Section */}
                            {selectedItem.variants && selectedItem.variants.length > 0 && (
                                <div className="mb-3">
                                    <h5>Variants</h5>
                                    <div className="accordion" id="viewVariantsAccordion">
                                        {selectedItem.variants.map((variant, index) => (
                                            <div className="accordion-item mb-2" key={index}>
                                                <div className="accordion-header d-flex justify-content-between align-items-center p-2">
                                                    <div className="d-flex align-items-center">
                                                        <button
                                                            className="btn btn-link me-2"
                                                            type="button"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target={`#viewVariantCollapse-${index}`}
                                                        >
                                                            <FiChevronDown />
                                                        </button>
                                                        <h8>
                                                            {variant.name}
                                                            {variant.required && <span className="badge bg-info ms-2">Required</span>}
                                                        </h8>
                                                    </div>
                                                </div>

                                                <div id={`viewVariantCollapse-${index}`} className="accordion-collapse collapse show">
                                                    <div className="accordion-body p-3">
                                                        {variant.description && (
                                                            <div className="mb-2">
                                                                <strong>Description:</strong> {variant.description}
                                                            </div>
                                                        )}

                                                        <div className="mb-2">
                                                            <strong>Options:</strong>
                                                            <ul className="list-group mt-2">
                                                                {variant.options.map((option, optIndex) => (
                                                                    <li key={optIndex} className="list-group-item d-flex justify-content-between align-items-center">
                                                                        <span>
                                                                            {option.name}
                                                                            {option.priceModifier !== 0 && (
                                                                                <span className="ms-2">
                                                                                    ({option.priceModifier > 0 ? '+' : ''}{currencySymbol}{Math.abs(option.priceModifier).toFixed(2)})
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-3">
                                <h5>Images</h5>
                                <div className="d-flex flex-wrap gap-3">
                                    {selectedItem.imageUrls?.length > 0 ? (
                                        selectedItem.imageUrls.map((imageUrl, index) => (
                                            <div key={index} className="position-relative" style={{ width: '100px', height: '100px' }}>
                                                <img
                                                    src={imageUrl}
                                                    alt={`Item ${index}`}
                                                    className="w-100 h-100"
                                                    style={{
                                                        objectFit: 'cover',
                                                        borderRadius: '4px',
                                                        border: imageUrl === selectedItem.primaryImageUrl ? '2px solid #1976d2' : '1px solid #dee2e6'
                                                    }}
                                                />
                                                {imageUrl === selectedItem.primaryImageUrl && (
                                                    <div className="position-absolute bottom-0 start-0 bg-primary text-white px-2 py-1 small">
                                                        Primary
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ width: '100px', height: '100px' }}>
                                            <img
                                                src="/images/avatar/1.png"
                                                alt="Item"
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
                    <Modal.Title>Delete Item</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {itemToDelete && (
                        <>
                            <h8>Are you sure you want to delete the item <strong>{itemToDelete.name}</strong>? </h8>
                            <h8>This action cannot be undone.</h8>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteItem}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ItemsTable;