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
import Select from 'react-select';

const DiscountsTable = () => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [discountToDelete, setDiscountToDelete] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [newDiscount, setNewDiscount] = useState({
        code: '',
        type: 'GENERAL',
        discountValue: 0,
        discountType: 'PERCENTAGE',
        validFrom: '',
        validTo: '',
        minimumOrderAmount: 0,
        description: '',
        active: true,
        firstOrderOnly: false,
        customerIds: []
    });
    const [editDiscount, setEditDiscount] = useState({
        id: '',
        code: '',
        type: 'GENERAL',
        discountValue: 0,
        discountType: 'PERCENTAGE',
        validFrom: '',
        validTo: '',
        minimumOrderAmount: 0,
        description: '',
        active: true,
        firstOrderOnly: false,
        customerIds: []
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
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

    // Check permissions
    const canRead = userRole === 'CLIENT_ADMIN' || userPermissions.includes('COUPON_READ');
    const canWrite = userRole === 'CLIENT_ADMIN' || userPermissions.includes('COUPON_WRITE');
    const canUpdate = userRole === 'CLIENT_ADMIN' || userPermissions.includes('COUPON_UPDATE');
    const canDelete = userRole === 'CLIENT_ADMIN' || userPermissions.includes('COUPON_DELETE');

    const isDateExpired = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        return date < today;
    };

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Code</th>
                            <th scope="col">Type</th>
                            <th scope="col">Discount</th>
                            <th scope="col">Valid From</th>
                            <th scope="col">Valid To</th>
                            <th scope="col">Min. Order</th>
                            <th scope="col">Status</th>
                            {canRead && <th scope="col" className="text-end">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
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
                <h5 className="mb-2">No Discounts Found</h5>
                <p className="text-muted mb-4">You haven&apos;t added any discounts yet. Start by adding a new discount.</p>
                {canWrite && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiPlus /> Add Discount
                    </Button>
                )}
            </div>
        );
    };

    const fetchDiscounts = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/admin/coupons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch discounts');
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setDiscounts(data);
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        try {
            setLoadingCustomers(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/admin/customers`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch customers');
            }

            const data = await response.json();
            if (data?.data?.content) {
                const customerOptions = data.data.content.map(customer => ({
                    value: customer.id,
                    label: `${customer.name} (${customer.email})`
                }));
                setCustomers(customerOptions);
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoadingCustomers(false);
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewDiscount(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditDiscount(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleCustomerSelectChange = (selectedOptions) => {
        setNewDiscount(prev => ({
            ...prev,
            customerIds: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };

    const handleEditCustomerSelectChange = (selectedOptions) => {
        setEditDiscount(prev => ({
            ...prev,
            customerIds: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.code.trim()) errors.code = 'Code is required';
        if (!formData.discountValue || formData.discountValue <= 0) errors.discountValue = 'Discount value must be greater than 0';
        if (!formData.validFrom) errors.validFrom = 'Valid from date is required';
        if (!formData.validTo) errors.validTo = 'Valid to date is required';
        if (new Date(formData.validTo) < new Date(formData.validFrom)) errors.validTo = 'Valid to must be after valid from';
        if (formData.type === 'CUSTOMER_SPECIFIC' && (!formData.customerIds || formData.customerIds.length === 0)) {
            errors.customerIds = 'At least one customer must be selected';
        }
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newDiscount, setFormErrors)) return;

        try {
            setCreating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const discountData = {
                code: newDiscount.code,
                type: newDiscount.type,
                discountValue: parseFloat(newDiscount.discountValue),
                discountType: newDiscount.discountType,
                validFrom: newDiscount.validFrom,
                validTo: newDiscount.validTo,
                minimumOrderAmount: parseFloat(newDiscount.minimumOrderAmount),
                description: newDiscount.description,
                active: newDiscount.active,
                firstOrderOnly: newDiscount.firstOrderOnly,
                ...(newDiscount.type === 'CUSTOMER_SPECIFIC' && {
                    customerIds: newDiscount.customerIds
                })
            };

            const response = await fetch(`${BASE_URL}/api/admin/coupons`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(discountData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create discount');
            }

            toast.success('Discount created successfully');
            await fetchDiscounts();
            setIsModalOpen(false);
            setNewDiscount({
                code: '',
                type: 'GENERAL',
                discountValue: 0,
                discountType: 'PERCENTAGE',
                validFrom: '',
                validTo: '',
                minimumOrderAmount: 0,
                description: '',
                active: true,
                firstOrderOnly: false,
                customerIds: []
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editDiscount, setEditFormErrors)) return;

        try {
            setUpdating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            const discountData = {
                code: editDiscount.code,
                type: editDiscount.type,
                discountValue: parseFloat(editDiscount.discountValue),
                discountType: editDiscount.discountType,
                validFrom: editDiscount.validFrom,
                validTo: editDiscount.validTo,
                minimumOrderAmount: parseFloat(editDiscount.minimumOrderAmount),
                description: editDiscount.description,
                active: editDiscount.active,
                firstOrderOnly: editDiscount.firstOrderOnly,
                ...(editDiscount.type === 'CUSTOMER_SPECIFIC' && {
                    customerIds: editDiscount.customerIds
                })
            };

            const response = await fetch(`${BASE_URL}/api/admin/coupons/${editDiscount.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(discountData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update discount');
            }

            toast.success('Discount updated successfully');
            await fetchDiscounts();
            setIsEditModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusChange = async (discount) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            const newStatus = !discount.active;

            setDiscounts(prev => prev.map(d =>
                d.id === discount.id ? { ...d, active: newStatus } : d
            ));

            const updatedDiscount = {
                ...discount,
                active: newStatus
            };

            const response = await fetch(`${BASE_URL}/api/admin/coupons/${discount.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedDiscount)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update discount status');
            }

            toast.success(`Discount ${newStatus ? 'activated' : 'deactivated'} successfully`);
            await fetchDiscounts();
        } catch (err) {
            setDiscounts(prev => prev.map(d =>
                d.id === discount.id ? { ...d, active: discount.active } : d
            ));
            toast.error(err.message);
        }
    };

    const handleViewDiscount = (discount) => {
        setSelectedDiscount(discount);
        setIsViewModalOpen(true);
    };

    const handleEditDiscount = (discount) => {
        setEditDiscount({
            id: discount.id,
            code: discount.code,
            type: discount.type,
            discountValue: discount.discountValue,
            discountType: discount.discountType,
            validFrom: discount.validFrom.split('T')[0],
            validTo: discount.validTo.split('T')[0],
            minimumOrderAmount: discount.minimumOrderAmount,
            description: discount.description,
            active: discount.active,
            firstOrderOnly: discount.firstOrderOnly,
            customerIds: discount.customerIds || []
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (discount) => {
        setDiscountToDelete(discount);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteDiscount = async () => {
        try {
            setDeleting(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            const response = await fetch(`${BASE_URL}/api/admin/coupons/${discountToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete discount');
            }

            toast.success('Discount deleted successfully');
            await fetchDiscounts();
            setIsDeleteModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDiscountValue = (discount) => {
        if (discount.discountType === 'PERCENTAGE') {
            return `${discount.discountValue}%`;
        } else {
            return `${currencySymbol}${discount.discountValue.toFixed(2)}`;
        }
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'code',
            header: 'Code',
            cell: (info) => (
                <span className="fw-bold">{info.getValue()}</span>
            )
        },
        {
            accessorKey: 'type',
            header: 'Type',
            cell: (info) => info.getValue().replace('_', ' ')
        },
        {
            accessorKey: 'discountValue',
            header: 'Discount',
            cell: (info) => formatDiscountValue(info.row.original)
        },
        {
            accessorKey: 'validFrom',
            header: 'Valid From',
            cell: (info) => formatDate(info.getValue())
        },
        {
            accessorKey: 'validTo',
            header: 'Valid To',
            cell: (info) => {
                const isValidToExpired = isDateExpired(info.getValue());
                return (
                    <span style={{ color: isValidToExpired ? 'red' : 'inherit' }}>
                        {formatDate(info.getValue())}
                        {isValidToExpired && (
                            <span className="ms-1" title="This discount has expired">⚠️</span>
                        )}
                    </span>
                );
            }
        },
        {
            accessorKey: 'minimumOrderAmount',
            header: 'Min. Order',
            cell: (info) => info.getValue() ? `${currencySymbol}${info.getValue().toFixed(2)}` : 'None'
        },
        {
            accessorKey: 'active',
            header: 'Status',
            cell: (info) => (
                <Switch
                    checked={info.getValue()}
                    onChange={() => handleStatusChange(info.row.original)}
                    color="primary"
                    disabled={!canUpdate}
                />
            )
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    {canRead && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewDiscount(row.original)}
                        >
                            <FiEye />
                        </button>
                    )}
                    {canUpdate && (
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleEditDiscount(row.original)}
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
            fetchDiscounts();
        }
        if (canWrite || canUpdate) {
            fetchCustomers();
        }
    }, [fetchDiscounts, fetchCustomers, canRead, canWrite, canUpdate]);

    if (!canRead) {
        return (
            <div className="text-center py-5">
                <h5>Access Denied</h5>
                <p>You don&apos;t have permission to view discounts.</p>
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
                <h4>Discounts</h4>
                {canWrite && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiPlus /> Add Discount
                    </Button>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : discounts.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={discounts}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                    rowStyle={(row) => {
                        const isValidToExpired = isDateExpired(row.original.validTo);
                        return {
                            style: {
                                backgroundColor: isValidToExpired ? 'rgba(255, 0, 0, 0.05)' : 'inherit'
                            }
                        };
                    }}
                />
            )}

            {/* Add Discount Modal */}
            {canWrite && (
                <Modal show={isModalOpen} onHide={() => {
                    setIsModalOpen(false);
                    setNewDiscount({
                        code: '',
                        type: 'GENERAL',
                        discountValue: 0,
                        discountType: 'PERCENTAGE',
                        validFrom: '',
                        validTo: '',
                        minimumOrderAmount: 0,
                        description: '',
                        active: true,
                        firstOrderOnly: false,
                        customerIds: []
                    });
                    setFormErrors({});
                }} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Add Discount</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="code" className="form-label">Code *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.code ? 'is-invalid' : ''}`}
                                        id="code"
                                        name="code"
                                        value={newDiscount.code}
                                        onChange={handleInputChange}
                                    />
                                    {formErrors.code && <div className="invalid-feedback">{formErrors.code}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="type" className="form-label" style={{ color: '#0092ff' }}>
                                        Type *
                                    </label>
                                    <select
                                        className="form-select"
                                        id="type"
                                        name="type"
                                        value={newDiscount.type}
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
                                    >
                                        <option value="GENERAL" style={{ color: '#000000ff', backgroundColor: 'white' }}>General</option>
                                        <option value="FIRST_ORDER" style={{ color: '#000000ff', backgroundColor: 'white' }}>First Order</option>
                                        <option value="CUSTOMER_SPECIFIC" style={{ color: '#000000ff', backgroundColor: 'white' }}>Specific Customers</option>
                                    </select>
                                </div>
                            </div>

                            {newDiscount.type === 'CUSTOMER_SPECIFIC' && (
                                <div className="mb-3">
                                    <label className="form-label">Select Customers *</label>
                                    <Select
                                        isMulti
                                        options={customers}
                                        isLoading={loadingCustomers}
                                        onChange={handleCustomerSelectChange}
                                        value={customers.filter(customer =>
                                            newDiscount.customerIds.includes(customer.value)
                                        )}
                                        className={`basic-multi-select ${formErrors.customerIds ? 'is-invalid' : ''}`}
                                        classNamePrefix="select"
                                    />
                                    {formErrors.customerIds && (
                                        <div className="text-danger small mt-1">{formErrors.customerIds}</div>
                                    )}
                                </div>
                            )}

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="discountValue" className="form-label">Discount Value *</label>
                                    <input
                                        type="number"
                                        className={`form-control ${formErrors.discountValue ? 'is-invalid' : ''}`}
                                        id="discountValue"
                                        name="discountValue"
                                        value={newDiscount.discountValue}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                    />
                                    {formErrors.discountValue && <div className="invalid-feedback">{formErrors.discountValue}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="discountType" className="form-label" style={{ color: '#0092ff', fontWeight: '500' }}>
                                        Discount Type *
                                    </label>
                                    <select
                                        className="form-select"
                                        id="discountType"
                                        name="discountType"
                                        value={newDiscount.discountType}
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
                                    >
                                        <option value="PERCENTAGE" style={{ color: '#000000ff', backgroundColor: 'white', padding: '8px' }}>
                                            Percentage
                                        </option>
                                        <option value="FIXED_AMOUNT" style={{ color: '#000000ff', backgroundColor: 'white', padding: '8px' }}>
                                            Fixed Amount
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="validFrom" className="form-label">Valid From *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${formErrors.validFrom ? 'is-invalid' : ''}`}
                                        id="validFrom"
                                        name="validFrom"
                                        value={newDiscount.validFrom}
                                        onChange={handleInputChange}
                                    />
                                    {formErrors.validFrom && <div className="invalid-feedback">{formErrors.validFrom}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="validTo" className="form-label">Valid To *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${formErrors.validTo ? 'is-invalid' : ''}`}
                                        id="validTo"
                                        name="validTo"
                                        value={newDiscount.validTo}
                                        onChange={handleInputChange}
                                        min={newDiscount.validFrom}
                                    />
                                    {formErrors.validTo && <div className="invalid-feedback">{formErrors.validTo}</div>}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="minimumOrderAmount" className="form-label">Minimum Order Amount</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="minimumOrderAmount"
                                    name="minimumOrderAmount"
                                    value={newDiscount.minimumOrderAmount}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Description</label>
                                <textarea
                                    className="form-control"
                                    id="description"
                                    name="description"
                                    value={newDiscount.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                />
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="active"
                                            name="active"
                                            checked={newDiscount.active}
                                            onChange={handleInputChange}
                                        />
                                        <h8 className="form-check-label" htmlFor="active">Active</h8>
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="firstOrderOnly"
                                            name="firstOrderOnly"
                                            checked={newDiscount.firstOrderOnly}
                                            onChange={handleInputChange}
                                        />
                                        <h8 className="form-check-label" htmlFor="firstOrderOnly">First Order Only</h8>
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
                            disabled={creating}
                        >
                            {creating ? (
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
            )}

            {/* Edit Discount Modal */}
            {canUpdate && (
                <Modal show={isEditModalOpen} onHide={() => {
                    setIsEditModalOpen(false);
                    setEditFormErrors({});
                }} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Discount</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleEditSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-code" className="form-label">Code *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${editFormErrors.code ? 'is-invalid' : ''}`}
                                        id="edit-code"
                                        name="code"
                                        value={editDiscount.code}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.code && <div className="invalid-feedback">{editFormErrors.code}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-type" className="form-label" style={{
                                        color: '#0092ff',
                                        fontWeight: '500',
                                        marginBottom: '8px'
                                    }}>
                                        Type *
                                    </label>
                                    <select
                                        className="form-select"
                                        id="edit-type"
                                        name="type"
                                        value={editDiscount.type}
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
                                    >
                                        <option value="GENERAL" style={{
                                            color: '#000000ff',
                                            backgroundColor: 'white',
                                            padding: '10px 16px'
                                        }}>
                                            General
                                        </option>
                                        <option value="FIRST_ORDER" style={{
                                            color: '#000000ff',
                                            backgroundColor: 'white',
                                            padding: '10px 16px'
                                        }}>
                                            First Order
                                        </option>
                                        <option value="CUSTOMER_SPECIFIC" style={{
                                            color: '#000000ff',
                                            backgroundColor: 'white',
                                            padding: '10px 16px'
                                        }}>
                                            Specific Customers
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {editDiscount.type === 'CUSTOMER_SPECIFIC' && (
                                <div className="mb-3">
                                    <label className="form-label">Select Customers *</label>
                                    <Select
                                        isMulti
                                        options={customers}
                                        isLoading={loadingCustomers}
                                        onChange={handleEditCustomerSelectChange}
                                        value={customers.filter(customer =>
                                            editDiscount.customerIds.includes(customer.value)
                                        )}
                                        className={`basic-multi-select ${editFormErrors.customerIds ? 'is-invalid' : ''}`}
                                        classNamePrefix="select"
                                    />
                                    {editFormErrors.customerIds && (
                                        <div className="text-danger small mt-1">{editFormErrors.customerIds}</div>
                                    )}
                                </div>
                            )}

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-discountValue" className="form-label">Discount Value *</label>
                                    <input
                                        type="number"
                                        className={`form-control ${editFormErrors.discountValue ? 'is-invalid' : ''}`}
                                        id="edit-discountValue"
                                        name="discountValue"
                                        value={editDiscount.discountValue}
                                        onChange={handleEditInputChange}
                                        min="0"
                                        step="0.01"
                                    />
                                    {editFormErrors.discountValue && <div className="invalid-feedback">{editFormErrors.discountValue}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-discountType" className="form-label" style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem'
                                    }}>
                                        Discount Type *
                                    </label>
                                    <select
                                        className="form-select"
                                        id="edit-discountType"
                                        name="discountType"
                                        value={editDiscount.discountType}
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
                                    >
                                        <option value="PERCENTAGE" style={{
                                            color: '#000000ff',
                                            backgroundColor: 'white',
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.875rem'
                                        }}>
                                            Percentage
                                        </option>
                                        <option value="FIXED_AMOUNT" style={{
                                            color: '#000000ff',
                                            backgroundColor: 'white',
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.875rem'
                                        }}>
                                            Fixed Amount
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-validFrom" className="form-label">Valid From *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${editFormErrors.validFrom ? 'is-invalid' : ''}`}
                                        id="edit-validFrom"
                                        name="validFrom"
                                        value={editDiscount.validFrom}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.validFrom && <div className="invalid-feedback">{editFormErrors.validFrom}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-validTo" className="form-label">Valid To *</label>
                                    <input
                                        type="date"
                                        className={`form-control ${editFormErrors.validTo ? 'is-invalid' : ''}`}
                                        id="edit-validTo"
                                        name="validTo"
                                        value={editDiscount.validTo}
                                        onChange={handleEditInputChange}
                                        min={editDiscount.validFrom}
                                    />
                                    {editFormErrors.validTo && <div className="invalid-feedback">{editFormErrors.validTo}</div>}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="edit-minimumOrderAmount" className="form-label">Minimum Order Amount</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="edit-minimumOrderAmount"
                                    name="minimumOrderAmount"
                                    value={editDiscount.minimumOrderAmount}
                                    onChange={handleEditInputChange}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="edit-description" className="form-label">Description</label>
                                <textarea
                                    className="form-control"
                                    id="edit-description"
                                    name="description"
                                    value={editDiscount.description}
                                    onChange={handleEditInputChange}
                                    rows="3"
                                />
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="edit-active"
                                            name="active"
                                            checked={editDiscount.active}
                                            onChange={handleEditInputChange}
                                        />
                                        <h8 className="form-check-label" htmlFor="edit-active">Active</h8>
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="edit-firstOrderOnly"
                                            name="firstOrderOnly"
                                            checked={editDiscount.firstOrderOnly}
                                            onChange={handleEditInputChange}
                                        />
                                        <h8 className="form-check-label" htmlFor="edit-firstOrderOnly">First Order Only</h8>
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
                            disabled={updating}
                        >
                            {updating ? (
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
            )}

            {/* View Discount Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Discount Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDiscount && (
                        <div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Code</h5>
                                    <h8>{selectedDiscount.code}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Type</h5>
                                    <h8>{selectedDiscount.type.replace('_', ' ')}</h8>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Discount</h5>
                                    <h8>{formatDiscountValue(selectedDiscount)}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Minimum Order</h5>
                                    <h8>{selectedDiscount.minimumOrderAmount ? `${currencySymbol}${selectedDiscount.minimumOrderAmount.toFixed(2)}` : 'None'}</h8>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Valid From</h5>
                                    <h8>{formatDate(selectedDiscount.validFrom)}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Valid To</h5>
                                    <h8 style={{ color: isDateExpired(selectedDiscount.validTo) ? 'red' : 'inherit' }}>
                                        {formatDate(selectedDiscount.validTo)}
                                        {isDateExpired(selectedDiscount.validTo) && (
                                            <span className="ms-1" title="This discount has expired">⚠️</span>
                                        )}
                                    </h8>
                                </div>
                            </div>
                            {selectedDiscount.type === 'CUSTOMER_SPECIFIC' && selectedDiscount.customerIds?.length > 0 && (
                                <div className="mb-3">
                                    <h5>Applicable Customers</h5>
                                    <div className="mt-2">
                                        {selectedDiscount.customerIds.map(customerId => {
                                            const customer = customers.find(c => c.value === customerId);
                                            return (
                                                <div key={customerId} className="badge bg-primary me-2 mb-2">
                                                    {customer ? customer.label : customerId}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Status</h5>
                                    <h8>{selectedDiscount.active ? 'Active' : 'Inactive'}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>First Order Only</h5>
                                    <h8>{selectedDiscount.firstOrderOnly ? 'Yes' : 'No'}</h8>
                                </div>
                            </div>
                            <div className="mb-3">
                                <h5>Description</h5>
                                <h8>{selectedDiscount.description || 'No description provided'}</h8>
                            </div>
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
                        <Modal.Title>Delete Discount</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {discountToDelete && (
                            <>
                                <h8>Are you sure you want to delete the discount <strong>{discountToDelete.code}</strong>?</h8><br />
                                <h8>This action cannot be undone.</h8>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleDeleteDiscount}
                            style={{ backgroundColor: '#d32f2f', color: 'white' }}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    );
};

export default DiscountsTable;