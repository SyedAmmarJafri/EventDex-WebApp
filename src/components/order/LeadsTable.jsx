import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiEye, FiDownload, FiEdit, FiUserPlus, FiMap } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/paths.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Modal from 'react-bootstrap/Modal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const OrderTable = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedRider, setSelectedRider] = useState('');
    const [nextStatusOptions, setNextStatusOptions] = useState([]);
    const [riders, setRiders] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
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

    const EmptyState = () => {
        return (
            <div className="text-center py-5" style={{
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
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
                <h5 className="mb-2">No Orders Found</h5>
                <p className="text-muted mb-4">Your order list is currently empty. New orders will appear here.</p>
            </div>
        );
    };

    // Filter orders based on active filter
    const filterOrders = useCallback(() => {
        if (activeFilter === 'all') {
            setFilteredOrders(orders);
            return;
        }

        const filtered = orders.filter(order => {
            const orderType = order.orderType?.toLowerCase();
            const fulfillmentType = order.fulfillmentType?.toLowerCase();
            const status = order.status?.toLowerCase();

            switch (activeFilter) {
                case 'pos':
                    return orderType?.includes('pos');
                case 'online':
                    return orderType?.includes('online');
                case 'delivery':
                    return fulfillmentType?.includes('delivery');
                case 'takeaway':
                    return fulfillmentType?.includes('takeaway');
                case 'pending':
                    return status === 'pending';
                case 'accepted':
                    return status === 'accepted';
                case 'preparing':
                    return status === 'preparing';
                case 'ready':
                    return status === 'ready';
                case 'dispatched':
                    return status === 'dispatched';
                case 'on_the_way':
                    return status === 'on_the_way';
                case 'delivered':
                    return status === 'delivered';
                case 'completed':
                    return status === 'completed';
                case 'cancelled':
                    return status === 'cancelled';
                case 'rejected':
                    return status === 'rejected';
                default:
                    return true;
            }
        });

        setFilteredOrders(filtered);
    }, [activeFilter, orders]);

    useEffect(() => {
        filterOrders();
    }, [filterOrders]);

    // Fetch orders
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/orders`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch orders');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setOrders(data.data);
                setFilteredOrders(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch orders');
            }
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch riders
    const fetchRiders = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/staff-users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch riders');
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                // Filter only riders (case insensitive check for roleName)
                const riderRoles = ['rider', 'delivery', 'delivery partner'];
                const filteredRiders = data.filter(staff =>
                    riderRoles.includes(staff.roleName?.toLowerCase())
                );
                setRiders(filteredRiders);
            } else {
                throw new Error('Invalid riders data format');
            }
        } catch (err) {
            showErrorToast(err.message);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setIsViewModalOpen(true);
    };

    const handleViewOnMap = (order) => {
        if (!order.deliveryLatitude || !order.deliveryLongitude) {
            showErrorToast('No delivery location available for this order');
            return;
        }
        setSelectedOrder(order);
        setIsMapModalOpen(true);
    };

    const handleEditOrder = (order) => {
        // Don't allow status updates for POS orders or completed/delivered/rejected/cancelled orders
        if (order.orderType?.toLowerCase().includes('pos') ||
            ['COMPLETED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.status.toUpperCase())) {
            showErrorToast('Status updates are not available for this order');
            return;
        }

        setSelectedOrder(order);
        setSelectedStatus('');

        // Determine next possible statuses based on current status and fulfillment type
        const currentStatus = order.status.toUpperCase();
        const fulfillmentType = order.fulfillmentType?.toLowerCase();

        let nextOptions = [];

        if (fulfillmentType?.includes('delivery')) {
            // Delivery workflow
            switch (currentStatus) {
                case 'PENDING':
                    nextOptions = [
                        { value: 'ACCEPTED', label: 'Accept Order', color: 'bg-info' },
                        { value: 'REJECTED', label: 'Reject Order', color: 'bg-dark-red' }
                    ];
                    break;
                case 'ACCEPTED':
                    nextOptions = [{ value: 'PREPARING', label: 'Start Preparing', color: 'bg-primary' }];
                    break;
                case 'PREPARING':
                    nextOptions = [{ value: 'READY', label: 'Mark as Ready', color: 'bg-warning text-dark' }];
                    break;
                case 'READY':
                    nextOptions = [{ value: 'DISPATCHED', label: 'Dispatch for Delivery', color: 'bg-purple' }];
                    break;
                case 'DISPATCHED':
                    nextOptions = [{ value: 'ON_THE_WAY', label: 'On the Way', color: 'bg-indigo' }];
                    break;
                case 'ON_THE_WAY':
                    nextOptions = [{ value: 'DELIVERED', label: 'Mark as Delivered', color: 'bg-success' }];
                    break;
                default:
                    nextOptions = [
                        { value: 'ACCEPTED', label: 'Accept Order', color: 'bg-info' },
                        { value: 'REJECTED', label: 'Reject Order', color: 'bg-dark-red' }
                    ];
            }
        } else {
            // Takeaway/Dine-in workflow
            switch (currentStatus) {
                case 'PENDING':
                    nextOptions = [
                        { value: 'ACCEPTED', label: 'Accept Order', color: 'bg-info' },
                        { value: 'REJECTED', label: 'Reject Order', color: 'bg-dark-red' }
                    ];
                    break;
                case 'ACCEPTED':
                    nextOptions = [{ value: 'PREPARING', label: 'Start Preparing', color: 'bg-primary' }];
                    break;
                case 'PREPARING':
                    nextOptions = [{ value: 'READY', label: 'Mark as Ready', color: 'bg-warning text-dark' }];
                    break;
                case 'READY':
                    nextOptions = [{ value: 'COMPLETED', label: 'Complete Order', color: 'bg-success' }];
                    break;
                default:
                    nextOptions = [
                        { value: 'ACCEPTED', label: 'Accept Order', color: 'bg-info' },
                        { value: 'REJECTED', label: 'Reject Order', color: 'bg-dark-red' }
                    ];
            }
        }

        setNextStatusOptions(nextOptions);
        setIsEditModalOpen(true);
    };

    const handleStatusUpdate = async () => {
        if (!selectedOrder || !selectedStatus) return;

        try {
            setIsUpdating(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/orders/${selectedOrder.id}/update-status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: selectedStatus })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update order status');
            }

            const data = await response.json();
            if (data.status === 200) {
                showSuccessToast('Order status updated successfully');
                fetchOrders(); // Refresh orders
                setIsEditModalOpen(false);
            } else {
                throw new Error(data.message || 'Failed to update order status');
            }
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAssignRider = async () => {
        if (!selectedOrder || !selectedRider) return;

        try {
            setIsAssigning(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/assignments?orderId=${selectedOrder.id}&riderId=${selectedRider}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to assign rider');
            }

            showSuccessToast('Rider assigned successfully');
            fetchOrders(); // Refresh orders
            setIsRiderModalOpen(false);
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleDownloadInvoice = async (order) => {
        try {
            if (!order.pdfInvoice) {
                showErrorToast('No invoice available for this order');
                return;
            }

            // Decode the base64 PDF
            const binaryString = atob(order.pdfInvoice);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Create a temporary anchor element to trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${order.orderNumber}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            showSuccessToast('Invoice downloaded successfully');
        } catch (err) {
            showErrorToast('Failed to download invoice: ' + err.message);
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getOrderTypeBadge = (orderType) => {
        if (!orderType) return null;

        const type = orderType.toLowerCase();
        let badgeClass = '';
        let displayText = '';

        if (type.includes('pos')) {
            badgeClass = 'badge bg-black';
            displayText = 'POS';
        } else if (type.includes('online')) {
            badgeClass = 'badge bg-orange';
            displayText = 'Online';
        } else {
            badgeClass = 'badge bg-secondary';
            displayText = orderType.charAt(0).toUpperCase() + orderType.slice(1).toLowerCase();
        }

        return <span className={badgeClass}>{displayText}</span>;
    };

    const getFulfillmentBadge = (fulfillmentType) => {
        if (!fulfillmentType) return null;

        const type = fulfillmentType.toLowerCase();
        let badgeClass = '';
        let displayText = '';

        if (type.includes('delivery')) {
            badgeClass = 'badge bg-indigo';
            displayText = 'Delivery';
        } else if (type.includes('takeaway')) {
            badgeClass = 'badge bg-pink';
            displayText = 'Takeaway';
        } else {
            badgeClass = 'badge bg-black';
            displayText = fulfillmentType.charAt(0).toUpperCase() + fulfillmentType.slice(1).toLowerCase();
        }

        return <span className={badgeClass}>{displayText}</span>;
    };

    const getStatusBadge = (status) => {
        if (!status) return null;

        const statusMap = {
            'PENDING': { color: 'bg-gray', label: 'Pending' },
            'ACCEPTED': { color: 'bg-blue', label: 'Accepted' },
            'PREPARING': { color: 'bg-orange', label: 'Preparing' },
            'READY': { color: 'bg-yellow', label: 'Ready' },
            'DISPATCHED': { color: 'bg-violet', label: 'Dispatched' },
            'ON_THE_WAY': { color: 'bg-fuchsia', label: 'On the way' },
            'DELIVERED': { color: 'bg-emerald', label: 'Delivered' },
            'COMPLETED': { color: 'bg-green1', label: 'Completed' },
            'CANCELLED': { color: 'bg-red', label: 'Cancelled' },
            'REJECTED': { color: 'bg-dark-red', label: 'Rejected' }
        };

        const statusInfo = statusMap[status.toUpperCase()] || { color: 'bg-black', label: status };
        return <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>;
    };

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
    };

    // Check if order has delivery coordinates
    const hasDeliveryLocation = (order) => {
        return order.deliveryLatitude && order.deliveryLongitude &&
            parseFloat(order.deliveryLatitude) !== 0 && parseFloat(order.deliveryLongitude) !== 0;
    };

    // Skeleton loader component
    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Order #</th>
                            <th scope="col">Customer</th>
                            <th scope="col">Order Type</th>
                            <th scope="col">Fulfillment</th>
                            <th scope="col">Total</th>
                            <th scope="col">Payment</th>
                            <th scope="col">Status</th>
                            <th scope="col">Date</th>
                            <th scope="col" className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
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
                                        width={100}
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
                                <td>
                                    <Skeleton
                                        width={100}
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
                                    <Skeleton
                                        width={100}
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

    const columns = React.useMemo(() => [
        {
            accessorKey: 'orderNumber',
            header: 'Order #',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'customerName',
            header: 'Customer',
            cell: (info) => info.getValue() || 'Walk-in Customer'
        },
        {
            accessorKey: 'orderType',
            header: 'Order Type',
            cell: (info) => getOrderTypeBadge(info.getValue())
        },
        {
            accessorKey: 'fulfillmentType',
            header: 'Fulfillment',
            cell: (info) => getFulfillmentBadge(info.getValue() || 'In House')
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total',
            cell: (info) => `${currencySymbol}${info.getValue().toFixed(2)}`
        },
        {
            accessorKey: 'paymentMethod',
            header: 'Payment',
            cell: (info) => {
                const method = info.getValue();
                return method ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() : 'N/A';
            }
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (info) => getStatusBadge(info.getValue())
        },
        {
            accessorKey: 'createdAt',
            header: 'Date',
            cell: (info) => formatDate(info.getValue())
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => {
                const isDeliveryReady =
                    row.original.fulfillmentType?.toLowerCase().includes('delivery') &&
                    row.original.status.toUpperCase() === 'READY';

                return (
                    <div className="hstack gap-2 justify-content-end">
                        {/* Hide edit button for POS orders or completed/delivered/rejected/cancelled orders */}
                        {!row.original.orderType?.toLowerCase().includes('pos') &&
                            !['COMPLETED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(row.original.status.toUpperCase()) && (
                                <button
                                    className="avatar-text avatar-md"
                                    onClick={() => handleEditOrder(row.original)}
                                    title="Update Status"
                                >
                                    <FiEdit />
                                </button>
                            )}

                        {/* Assign Rider button for delivery orders that are ready */}
                        {isDeliveryReady && (
                            <button
                                className="avatar-text avatar-md bg-success text-white"
                                onClick={() => {
                                    setSelectedOrder(row.original);
                                    setIsRiderModalOpen(true);
                                    fetchRiders();
                                }}
                                title="Assign Rider"
                            >
                                <FiUserPlus />
                            </button>
                        )}

                        {/* View on Map button for orders with delivery coordinates */}
                        {hasDeliveryLocation(row.original) && (
                            <button
                                className="avatar-text avatar-md bg-primary text-white"
                                onClick={() => handleViewOnMap(row.original)}
                                title="View on Map"
                            >
                                <FiMap />
                            </button>
                        )}

                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleViewOrder(row.original)}
                            title="View Order"
                        >
                            <FiEye />
                        </button>
                        <button
                            className="avatar-text avatar-md"
                            onClick={() => handleDownloadInvoice(row.original)}
                            title="Download Invoice"
                        >
                            <FiDownload />
                        </button>
                    </div>
                );
            },
            meta: { headerClassName: 'text-end' }
        },
    ], [currencySymbol]);

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
                <h4>Orders</h4>
            </div>

            {/* Filter Buttons - Compact Version */}
            <div className="mb-4" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '8px' }}>
                <div className="d-flex gap-1">
                    <Button
                        size="small"
                        variant={activeFilter === 'all' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('all')}
                        style={{
                            minWidth: '60px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'all' ? '#0092ff' : '',
                            color: activeFilter === 'all' ? 'white' : ''
                        }}
                    >
                        All
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'pos' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('pos')}
                        style={{
                            minWidth: '60px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'pos' ? 'rgb(0, 0, 0)' : '',
                            color: activeFilter === 'pos' ? 'white' : ''
                        }}
                    >
                        POS
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'delivery' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('delivery')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'delivery' ? 'rgb(102, 16, 242)' : '',
                            color: activeFilter === 'delivery' ? 'white' : ''
                        }}
                    >
                        Delivery
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'takeaway' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('takeaway')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'takeaway' ? 'rgb(236, 72, 153)' : '',
                            color: activeFilter === 'takeaway' ? 'white' : ''
                        }}
                    >
                        Takeaway
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'accepted' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('accepted')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'accepted' ? '#3b82f6' : '',
                            color: activeFilter === 'accepted' ? 'white' : ''
                        }}
                    >
                        Accepted
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'preparing' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('preparing')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'preparing' ? '#f97316' : '',
                            color: activeFilter === 'preparing' ? 'white' : ''
                        }}
                    >
                        Preparing
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'ready' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('ready')}
                        style={{
                            minWidth: '60px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'ready' ? 'rgb(246, 185, 0)' : '',
                            color: activeFilter === 'ready' ? 'white' : ''
                        }}
                    >
                        Ready
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'dispatched' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('dispatched')}
                        style={{
                            minWidth: '90px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'dispatched' ? '#7c3aed' : '',
                            color: activeFilter === 'dispatched' ? 'white' : ''
                        }}
                    >
                        Dispatched
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'delivered' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('delivered')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'delivered' ? '#10b981' : '',
                            color: activeFilter === 'delivered' ? 'white' : ''
                        }}
                    >
                        Delivered
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'completed' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('completed')}
                        style={{
                            minWidth: '90px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'completed' ? '#00c60d' : '',
                            color: activeFilter === 'completed' ? 'white' : ''
                        }}
                    >
                        Completed
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'cancelled' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('cancelled')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'cancelled' ? '#ef4444' : '',
                            color: activeFilter === 'cancelled' ? 'white' : ''
                        }}
                    >
                        Cancelled
                    </Button>
                    <Button
                        size="small"
                        variant={activeFilter === 'rejected' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('rejected')}
                        style={{
                            minWidth: '80px',
                            fontSize: '0.75rem',
                            backgroundColor: activeFilter === 'rejected' ? '#8B0000' : '',
                            color: activeFilter === 'rejected' ? 'white' : ''
                        }}
                    >
                        Rejected
                    </Button>
                </div>
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : filteredOrders.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={filteredOrders}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* View Order Modal */}
            <Modal
                show={isViewModalOpen}
                onHide={() => setIsViewModalOpen(false)}
                size="lg"
                centered
                scrollable
                className={isDarkMode ? 'dark-modal' : ''}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Order Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedOrder && (
                        <div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Order Number</h5>
                                    <p>{selectedOrder.orderNumber}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Date</h5>
                                    <p>{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Customer</h5>
                                    <p>{selectedOrder.customerName || 'Walk-in Customer'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Status</h5>
                                    <p>{getStatusBadge(selectedOrder.status)}</p>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Fulfillment Type</h5>
                                    <p>{getFulfillmentBadge(selectedOrder.fulfillmentType)}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Order Type</h5>
                                    <p>{getOrderTypeBadge(selectedOrder.orderType)}</p>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Payment Method</h5>
                                    <p>{selectedOrder.paymentMethod ? selectedOrder.paymentMethod.charAt(0).toUpperCase() + selectedOrder.paymentMethod.slice(1).toLowerCase() : 'N/A'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Notes</h5>
                                    <p>{selectedOrder.notes || 'N/A'}</p>
                                </div>
                            </div>

                            {hasDeliveryLocation(selectedOrder) && (
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h5>Delivery Location</h5>
                                        <p>
                                            <p>{selectedOrder.deliveryAddress || 'N/A'}</p>
                                        </p>
                                    </div>
                                    <div className="col-md-6">
                                        <h5>View Location</h5>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleViewOnMap(selectedOrder)}
                                            startIcon={<FiMap />}
                                            style={{ backgroundColor: '#0092ff', color: 'white' }}
                                        >
                                            View on Map
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="mb-3">
                                <h5>Items</h5>
                                <div className="table-responsive">
                                    <table className="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Price</th>
                                                <th>Qty</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items?.map((item, index) => (
                                                <React.Fragment key={index}>
                                                    <tr>
                                                        <td>
                                                            {item.name}
                                                            {item.variants && item.variants.length > 0 && (
                                                                <div className="mt-1">
                                                                    {item.variants.map((variant, vIndex) => (
                                                                        <div key={vIndex} className="text-muted small">
                                                                            <strong>{variant.name}:</strong>
                                                                            {variant.options.map((opt, oIndex) => (
                                                                                <span key={oIndex}>
                                                                                    {oIndex > 0 && ', '}
                                                                                    {opt.name} (+{currencySymbol}{opt.priceModifier.toFixed(2)})
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>{currencySymbol}{item.price.toFixed(2)}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{currencySymbol}{item.itemTotal.toFixed(2)}</td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <h5>Subtotal</h5>
                                    <p>{currencySymbol}{selectedOrder.subtotal?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h5>Taxes</h5>
                                    <p>{currencySymbol}{selectedOrder.totalTaxAmount?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h5>Total Amount</h5>
                                    <p className="fw-bold">{currencySymbol}{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiDownload className="me-2" /> Download Invoice
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Order Modal */}
            <Modal
                show={isEditModalOpen}
                onHide={() => setIsEditModalOpen(false)}
                centered
                className={isDarkMode ? 'dark-modal' : ''}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Update Order Status</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedOrder && (
                        <div>
                            <div className="mb-4">
                                <p><strong>Order #:</strong> {selectedOrder.orderNumber}</p>
                                <p><strong>Customer:</strong> {selectedOrder.customerName || 'Walk-in Customer'}</p>
                                <p><strong>Current Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                                <p><strong>Fulfillment:</strong> {getFulfillmentBadge(selectedOrder.fulfillmentType)}</p>
                            </div>

                            <FormControl fullWidth>
                                <InputLabel
                                    id="status-select-label"
                                    sx={{
                                        color: '#0092ff',
                                        '&.Mui-focused': {
                                            color: '#0092ff'
                                        }
                                    }}
                                >
                                    Next Status
                                </InputLabel>
                                <Select
                                    labelId="status-select-label"
                                    id="status-select"
                                    value={selectedStatus}
                                    label="Next Status"
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    disabled={nextStatusOptions.length === 0}
                                    sx={{
                                        color: '#0092ff',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0092ff',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0092ff',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0092ff',
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: '#0092ff',
                                        },
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                backgroundColor: '#0092ff',
                                                color: 'white',
                                                '& .MuiMenuItem-root': {
                                                    '&:hover': {
                                                        backgroundColor: '#0183e6ff',
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {nextStatusOptions.length === 0 ? (
                                        <MenuItem value="" disabled>
                                            No further actions available
                                        </MenuItem>
                                    ) : (
                                        nextStatusOptions.map((option) => (
                                            <MenuItem
                                                key={option.value}
                                                value={option.value}
                                                sx={{
                                                    color: 'white',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                                    },
                                                }}
                                            >
                                                <span className={`badge ${option.color} me-2`}></span>
                                                {option.label}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleStatusUpdate}
                        disabled={isUpdating || !selectedStatus || nextStatusOptions.length === 0}
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        {isUpdating ? 'Updating...' : 'Update Status'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Assign Rider Modal */}
            <Modal
                show={isRiderModalOpen}
                onHide={() => setIsRiderModalOpen(false)}
                centered
                className={isDarkMode ? 'dark-modal' : ''}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Assign Rider</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedOrder && (
                        <div>
                            <div className="mb-4">
                                <p><strong>Order #:</strong> {selectedOrder.orderNumber}</p>
                                <p><strong>Customer:</strong> {selectedOrder.customerName || 'Walk-in Customer'}</p>
                                <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                            </div>

                            <FormControl fullWidth>
                                <InputLabel
                                    id="rider-select-label"
                                    sx={{
                                        color: '#0092ff',
                                        '&.Mui-focused': {
                                            color: '#0092ff'
                                        }
                                    }}
                                >
                                    Select Rider
                                </InputLabel>
                                <Select
                                    labelId="rider-select-label"
                                    id="rider-select"
                                    value={selectedRider}
                                    label="Select Rider"
                                    onChange={(e) => setSelectedRider(e.target.value)}
                                    disabled={riders.length === 0}
                                    sx={{
                                        color: '#0092ff',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0092ff',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0092ff',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#0092ff',
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: '#0092ff',
                                        },
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                backgroundColor: '#0092ff',
                                                color: 'white',
                                                '& .MuiMenuItem-root': {
                                                    '&:hover': {
                                                        backgroundColor: '#0183e6ff',
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {riders.length === 0 ? (
                                        <MenuItem value="" disabled>
                                            No riders available
                                        </MenuItem>
                                    ) : (
                                        riders.map((rider) => (
                                            <MenuItem
                                                key={rider.id}
                                                value={rider.id}
                                                sx={{
                                                    color: 'white',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                                    },
                                                }}
                                            >
                                                {rider.name} ({rider.phone})
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleAssignRider}
                        disabled={isAssigning || !selectedRider || riders.length === 0}
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        {isAssigning ? 'Assigning...' : 'Assign Rider'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Map Modal */}
            <Modal
                show={isMapModalOpen}
                onHide={() => setIsMapModalOpen(false)}
                size="lg"
                centered
                className={isDarkMode ? 'dark-modal' : ''}
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FiMap className="me-2" />
                        Delivery Location - Order #{selectedOrder?.orderNumber}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: 0, height: '500px' }}>
                    {selectedOrder && hasDeliveryLocation(selectedOrder) && (
                        <MapContainer
                            center={[parseFloat(selectedOrder.deliveryLatitude), parseFloat(selectedOrder.deliveryLongitude)]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker
                                position={[parseFloat(selectedOrder.deliveryLatitude), parseFloat(selectedOrder.deliveryLongitude)]}
                            >
                                <Popup>
                                    <div>
                                        <strong>Order #{selectedOrder.orderNumber}</strong><br />
                                        Customer: {selectedOrder.customerName || 'Walk-in Customer'}<br />
                                        Status: {selectedOrder.status}<br />
                                        Total: {currencySymbol}{selectedOrder.totalAmount?.toFixed(2)}<br />
                                        Address: {selectedOrder.deliveryAddress}<br />
                                    </div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <div className="d-flex justify-content-between align-items-center w-100">
                        <div className="text-muted small">
                            {selectedOrder && (
                                <>
                                    Customer: {selectedOrder.customerName || 'Walk-in Customer'} |
                                    Total: {currencySymbol}{selectedOrder.totalAmount?.toFixed(2)} |
                                    Status: {selectedOrder.status}
                                </>
                            )}
                        </div>

                    </div>
                </Modal.Footer>
            </Modal>

            <style>
                {`/* Custom badge colors */
.bg-purple { background-color: #9333ea; color: white; }
.bg-teal { background-color: #0d9488; color: white; }
.bg-indigo { background-color: #4f46e5; color: white; }
.bg-orange { background-color: #f97316; color: white; }
.bg-pink { background-color: #ec4899; color: white; }
.bg-gray { background-color: #6b7280; color: white; }
.bg-blue { background-color: #3b82f6; color: white; }
.bg-cyan { background-color: #06b6d4; color: white; }
.bg-yellow { background-color:rgb(246, 185, 0); color: white; }
.bg-violet { background-color: #7c3aed; color: white; }
.bg-fuchsia { background-color: #c026d3; color: white; }
.bg-emerald { background-color: #10b981; color: white; }
.bg-black { background-color:rgb(0, 0, 0); color: white; }
.bg-green1 { background-color:rgb(0, 198, 13); color: white; }
.bg-red { background-color: #ef4444; color: white; }
.bg-dark-red { background-color: #8B0000; color: white; }
.bg-info { background-color: #17a2b8; color: white; }
.bg-primary { background-color: #007bff; color: white; }
.bg-warning { background-color: #ffc107; color: #212529; }
.bg-success { background-color: #28a745; color: white; }
.bg-secondary { background-color: #6c757d; color: white; }

/* Dark mode modal styles */
.dark-modal .modal-content {
    background-color: #0f172a;
    color: white;
}

.dark-modal .modal-header,
.dark-modal .modal-footer {
    border-color: #1e293b;
}

.dark-modal .close {
    color: white;
}

.dark-modal .table {
    color: white;
}

.dark-modal .table-bordered {
    border-color: #1e293b;
}

.dark-modal .table-bordered th,
.dark-modal .table-bordered td {
    border-color: #1e293b;
}

/* Leaflet map container styling */
.leaflet-container {
    height: 100%;
    width: 100%;
}

/* Custom popup styling */
.leaflet-popup-content {
    font-size: 14px;
    line-height: 1.4;
}

.leaflet-popup-content strong {
    color: #0092ff;
}

/* Map controls styling */
.leaflet-control-zoom a {
    background-color: #0092ff !important;
    color: white !important;
}

.leaflet-control-zoom a:hover {
    background-color: #0183e6 !important;
}

/* Attribution styling */
.leaflet-control-attribution {
    font-size: 11px;
    background-color: rgba(255, 255, 255, 0.8);
}

/* Dark mode adjustments for map */
.dark-modal .leaflet-popup-content-wrapper {
    background-color: #1e293b;
    color: white;
}

.dark-modal .leaflet-popup-tip {
    background-color: #1e293b;
}

.dark-modal .leaflet-control-attribution {
    background-color: rgba(30, 41, 59, 0.8);
    color: white;
}

.dark-modal .leaflet-control-attribution a {
    color: #60a5fa;
}`}
            </style>
        </>
    );
};

export default OrderTable;