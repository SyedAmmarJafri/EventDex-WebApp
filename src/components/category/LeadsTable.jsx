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
        primaryImageUrl: ''
    });
    const [editCategory, setEditCategory] = useState({
        id: '',
        name: '',
        description: '',
        primaryImageUrl: '',
        imageUrls: []
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Image</th>
                            <th scope="col">Name</th>
                            <th scope="col">Description</th>
                            <th scope="col">Status</th>
                            <th scope="col">Item Count</th>
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
                <h5 className="mb-2">No Categories Found</h5>
                <p className="text-muted mb-4">You haven't added any categories yet. Start by adding a new category.</p>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2 mx-auto"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Category
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

    const handleDeleteImage = async (imageUrl) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const deleteUrl = new URL(`${BASE_URL}/api/client-admin/categories/${editCategory.id}/images`);
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

            toast.success('Image deleted successfully', {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            setEditCategory(prev => ({
                ...prev,
                imageUrls: prev.imageUrls.filter(url => url !== imageUrl)
            }));

            if (editCategory.primaryImageUrl === imageUrl) {
                setEditCategory(prev => ({
                    ...prev,
                    primaryImageUrl: prev.imageUrls.length > 1 ?
                        prev.imageUrls.find(url => url !== imageUrl) : ''
                }));
            }

            await fetchCategories();
        } catch (err) {
            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
        }
    };

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
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
                const categoriesWithImages = data.data.map(category => ({
                    ...category,
                    imageUrls: category.imageUrls || [],
                    primaryImageUrl: category.primaryImageUrl || ''
                }));
                setCategories(categoriesWithImages);
            } else {
                throw new Error(data.message || 'Failed to fetch categories');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCategory(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditCategory(prev => ({ ...prev, [name]: value }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newCategory, setFormErrors)) return;

        try {
            setUploadingImage(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/client-admin/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newCategory)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create category');
            }

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('primary', true);

                const uploadResponse = await fetch(`${BASE_URL}/api/client-admin/categories/${data.data.id}/images`, {
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

            toast.success('Category created successfully');
            await fetchCategories();
            setIsModalOpen(false);
            setNewCategory({
                name: '',
                description: '',
                primaryImageUrl: ''
            });
            setSelectedFile(null);
            setImagePreview('');
        } catch (err) {
            toast.error(err.message);
            setIsModalOpen(false);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editCategory, setEditFormErrors)) return;

        try {
            setUploadingImage(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            let imageUrl = editCategory.primaryImageUrl;
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('primary', true);

                const uploadResponse = await fetch(`${BASE_URL}/api/client-admin/categories/${editCategory.id}/images`, {
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

            const response = await fetch(`${BASE_URL}/api/client-admin/categories/${editCategory.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editCategory.name,
                    description: editCategory.description,
                    primaryImageUrl: imageUrl
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update category');
            }

            toast.success('Category updated successfully');
            await fetchCategories();
            setIsEditModalOpen(false);
            setSelectedFile(null);
            setImagePreview('');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleStatusChange = async (category) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const newStatus = !category.active;

            setCategories(prev => prev.map(cat =>
                cat.id === category.id ? { ...cat, active: newStatus } : cat
            ));

            const response = await fetch(`${BASE_URL}/api/client-admin/categories/${category.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: newStatus })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update category status');
            }

            toast.success(`Category ${newStatus ? 'activated' : 'deactivated'} successfully`, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            await fetchCategories();
        } catch (err) {
            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            setCategories(prev => prev.map(cat =>
                cat.id === category.id ? { ...cat, active: category.active } : cat
            ));
        }
    };

    const handleViewCategory = (category) => {
        setSelectedCategory(category);
        setIsViewModalOpen(true);
    };

    const handleEditCategory = (category) => {
        setEditCategory({
            id: category.id,
            name: category.name,
            description: category.description,
            primaryImageUrl: category.primaryImageUrl || '',
            imageUrls: category.imageUrls || []
        });
        setSelectedFile(null);
        setImagePreview('');
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (category) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteCategory = async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const response = await fetch(`${BASE_URL}/api/client-admin/categories/${categoryToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (!response.ok) {
                // Show the actual error message from the API response
                const errorMessage = data.error || data.message || 'Failed to delete category';
                throw new Error(errorMessage);
            }

            toast.success('Category deleted successfully', {
                position: "bottom-center",
                autoClose: 5000,
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
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
            setIsDeleteModalOpen(false);
        }
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'primaryImageUrl',
            header: 'Image',
            cell: (info) => (
                info.getValue() ? (
                    <img
                        src={info.getValue()}
                        alt="Category"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                ) : (
                    <img
                        src="/images/avatar/1.png"
                        alt="Category"
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
            accessorKey: 'description',
            header: 'Description',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'itemCount',
            header: 'Item Count',
            cell: (info) => info.getValue()
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
                        onClick={() => handleViewCategory(row.original)}
                    >
                        <FiEye />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditCategory(row.original)}
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
    ],);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

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
                <h4>Category</h4>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Category
                </Button>
            </div>

            {loading ? (
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

            {/* Add Category Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewCategory({ name: '', description: '', primaryImageUrl: '' });
                setFormErrors({});
                setSelectedFile(null);
                setImagePreview('');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Category</Modal.Title>
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
                                value={newCategory.name}
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
                                value={newCategory.description}
                                onChange={handleInputChange}
                                rows="3"
                            />
                            {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Category Image</label>
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

            {/* Edit Category Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
                setSelectedFile(null);
                setImagePreview('');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Category</Modal.Title>
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
                                value={editCategory.name}
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
                                value={editCategory.description}
                                onChange={handleEditInputChange}
                                rows="3"
                            />
                            {editFormErrors.description && <div className="invalid-feedback">{editFormErrors.description}</div>}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Category Images</label>
                            <div className="d-flex flex-wrap gap-3 mb-3">
                                {editCategory.imageUrls?.map((imageUrl, index) => (
                                    <div
                                        key={index}
                                        className="position-relative"
                                        style={{ width: '100px', height: '100px' }}
                                        onClick={() => setEditCategory(prev => ({ ...prev, primaryImageUrl: imageUrl }))}
                                    >
                                        <img
                                            src={imageUrl}
                                            alt={`Category ${index}`}
                                            className="w-100 h-100 cursor-pointer"
                                            style={{
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                border: imageUrl === editCategory.primaryImageUrl ? '2px solid #1976d2' : '1px solid #dee2e6'
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
                                        {imageUrl === editCategory.primaryImageUrl && (
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

            {/* View Category Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Category Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedCategory && (
                        <div>
                            <div className="mb-3">
                                <h5>Name</h5>
                                <h8>{selectedCategory.name}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Description</h5>
                                <h8>{selectedCategory.description}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Status</h5>
                                <h8>{selectedCategory.active ? 'Active' : 'Inactive'}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Item Count</h5>
                                <h8>{selectedCategory.itemCount}</h8>
                            </div>
                            <div className="mb-3">
                                <h5>Images</h5>
                                <div className="d-flex flex-wrap gap-3">
                                    {selectedCategory.imageUrls?.length > 0 ? (
                                        selectedCategory.imageUrls.map((imageUrl, index) => (
                                            <div key={index} className="position-relative" style={{ width: '100px', height: '100px' }}>
                                                <img
                                                    src={imageUrl}
                                                    alt={`Category ${index}`}
                                                    className="w-100 h-100"
                                                    style={{
                                                        objectFit: 'cover',
                                                        borderRadius: '4px',
                                                        border: imageUrl === selectedCategory.primaryImageUrl ? '2px solid #1976d2' : '1px solid #dee2e6'
                                                    }}
                                                />
                                                {imageUrl === selectedCategory.primaryImageUrl && (
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
                                                alt="Category"
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
                    <Modal.Title>Delete Category</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {categoryToDelete && (
                        <>
                            <h8>Are you sure you want to delete the category <strong>{categoryToDelete.name}</strong>? </h8>
                            <h8>This action cannot be undone.</h8>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteCategory}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default CategoriesTable;