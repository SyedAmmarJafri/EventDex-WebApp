import React, { useEffect, useState, useCallback, useRef } from 'react';
import Table from '@/components/shared/table/Table';
import { FiEye, FiDownload, FiEdit, FiUserPlus, FiMap, FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Modal from 'react-bootstrap/Modal';

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
    const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
    const [map, setMap] = useState(null);

    // WebSocket states
    const [wsConnected, setWsConnected] = useState(false);
    const [wsError, setWsError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [componentError, setComponentError] = useState(null);

    // Refs for cleanup and connection management
    const stompClientRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isUnmountedRef = useRef(false);

    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Get currency settings from localStorage
    const authData = JSON.parse(localStorage.getItem("authData"));
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

    // WebSocket configuration
    const WS_CONFIG = {
        maxReconnectAttempts: 3,
        reconnectDelay: 5000,
        connectionTimeout: 15000,
    };

    // Component error handler
    const handleComponentError = useCallback((error, context = '') => {
        console.error(`[OrderTable ERROR] ${context}`, error);
        setComponentError(`Error in ${context}: ${error.message}`);
    }, []);

    // Get client ID from auth data
    const getClientId = useCallback(() => {
        try {
            const authData = localStorage.getItem('authData');
            if (authData) {
                const parsedData = JSON.parse(authData);
                const clientId = parsedData.clientId || parsedData.id || parsedData.userId;
                return clientId;
            }
        } catch (error) {
            console.error('Error getting client ID', error);
        }
        return "686faaeda2c5d3eee0137da1"; // Fallback client ID
    }, []);

    // Get auth token
    const getAuthToken = useCallback(() => {
        try {
            const authData = localStorage.getItem('authData');
            if (authData) {
                const parsedData = JSON.parse(authData);
                return parsedData.token;
            }
        } catch (error) {
            console.error('Error getting auth token', error);
        }
        return null;
    }, []);

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

    // API fetch orders function
    const fetchOrdersAPI = useCallback(async () => {
        try {
            setLoading(true);
            setComponentError(null);

            const token = getAuthToken();
            if (!token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/orders`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch orders');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                // Only update orders if WebSocket is not connected to avoid conflicts
                if (!wsConnected) {
                    setOrders(data.data);
                }
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch orders');
            }
        } catch (err) {
            console.error('Error fetching orders', err);
            if (!wsConnected) {
                showErrorToast(err.message);
                setOrders([]);
            }
            return [];
        } finally {
            setLoading(false);
        }
    }, [wsConnected, getAuthToken]);

    // WebSocket connection with dynamic imports
    const connectWebSocket = useCallback(async () => {
        if (isUnmountedRef.current) {
            return;
        }

        const clientId = getClientId();
        if (!clientId) {
            fetchOrdersAPI();
            return;
        }

        // Clear any existing connection first
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.disconnect();
        }

        try {
            setWsError(null);
            setLoading(true);

            // Dynamically import SockJS and Stomp
            const SockJS = (await import('sockjs-client')).default;
            const Stomp = (await import('stompjs')).default;

            const socket = new SockJS(`${BASE_URL.replace('/api', '')}/ws`);
            const stompClient = Stomp.over(socket);

            // Connection timeout
            const connectionTimeout = setTimeout(() => {
                if (stompClient && !stompClient.connected) {
                    try {
                        stompClient.disconnect();
                    } catch (e) {
                        console.error('Error disconnecting on timeout', e);
                    }
                    setWsError('Connection timeout');
                    fetchOrdersAPI();
                }
            }, WS_CONFIG.connectionTimeout);

            // Connect to WebSocket
            stompClient.connect(
                {},
                (frame) => {
                    try {
                        clearTimeout(connectionTimeout);
                        if (isUnmountedRef.current) {
                            stompClient.disconnect();
                            return;
                        }

                        setWsConnected(true);
                        setWsError(null);
                        setReconnectAttempts(0);
                        setLoading(false);

                        // Subscribe to orders topic for all order updates
                        // In the WebSocket subscription handler, modify the order update logic:
                        const subscription = stompClient.subscribe(
                            `/topic/orders/${clientId}`,
                            (message) => {
                                try {
                                    const orderUpdate = JSON.parse(message.body);
                                    setOrders(prevOrders => {
                                        const existingIndex = prevOrders.findIndex(
                                            order => order.id === orderUpdate.id || order.orderNumber === orderUpdate.orderNumber
                                        );

                                        let updatedOrders;

                                        if (existingIndex >= 0) {
                                            // Update existing order while preserving all properties
                                            updatedOrders = [...prevOrders];
                                            updatedOrders[existingIndex] = {
                                                ...updatedOrders[existingIndex], // Keep existing properties
                                                ...orderUpdate,                  // Apply updates
                                                // Ensure critical fields are preserved if not in update
                                                orderType: orderUpdate.orderType || updatedOrders[existingIndex].orderType,
                                                fulfillmentType: orderUpdate.fulfillmentType || updatedOrders[existingIndex].fulfillmentType,
                                                items: orderUpdate.items || updatedOrders[existingIndex].items,
                                                customerName: orderUpdate.customerName || updatedOrders[existingIndex].customerName
                                            };
                                        } else {
                                            // Add new order at the beginning
                                            updatedOrders = [orderUpdate, ...prevOrders];
                                        }

                                        return updatedOrders;
                                    });
                                } catch (parseError) {
                                    console.error('Error parsing WebSocket message', parseError);
                                }
                            }
                        );

                        // Subscribe to order deletions/cancellations
                        const deletionSubscription = stompClient.subscribe(
                            `/topic/orders/${clientId}/deleted`,
                            (message) => {
                                try {
                                    const deletedOrderId = JSON.parse(message.body);
                                    setOrders(prevOrders =>
                                        prevOrders.filter(order => order.id !== deletedOrderId)
                                    );
                                } catch (parseError) {
                                    console.error('Error parsing WebSocket deletion message', parseError);
                                }
                            }
                        );

                        stompClientRef.current = stompClient;
                    } catch (connectionError) {
                        handleComponentError(connectionError, 'WebSocket connection handler');
                    }
                },
                (error) => {
                    try {
                        clearTimeout(connectionTimeout);
                        console.error('WebSocket connection error', error);

                        setWsConnected(false);
                        setWsError(error?.toString() || 'Connection failed');
                        setLoading(false);

                        if (reconnectAttempts < WS_CONFIG.maxReconnectAttempts) {
                            const newAttempts = reconnectAttempts + 1;
                            setReconnectAttempts(newAttempts);
                            reconnectTimeoutRef.current = setTimeout(() => {
                                if (!isUnmountedRef.current) {
                                    connectWebSocket();
                                }
                            }, WS_CONFIG.reconnectDelay);
                        } else {
                            fetchOrdersAPI();
                            setInterval(() => {
                                if (!isUnmountedRef.current && !wsConnected) {
                                    fetchOrdersAPI();
                                }
                            }, 30000);
                        }
                    } catch (errorHandlerError) {
                        console.error('Error in error handler', errorHandlerError);
                        handleComponentError(errorHandlerError, 'WebSocket error handler');
                        fetchOrdersAPI();
                    }
                }
            );

        } catch (error) {
            console.error('Error creating WebSocket connection', error);
            setWsError(error?.toString() || 'Setup failed');
            setWsConnected(false);
            setLoading(false);
            handleComponentError(error, 'WebSocket setup');
            fetchOrdersAPI();
        }
    }, [getClientId, reconnectAttempts, fetchOrdersAPI, handleComponentError, wsConnected]);

    // Disconnect WebSocket
    const disconnectWebSocket = useCallback(() => {
        try {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.disconnect();
                stompClientRef.current = null;
            }

            setWsConnected(false);
        } catch (error) {
            console.error('Error disconnecting WebSocket', error);
        }
    }, []);

    // Manual refresh
    const handleManualRefresh = () => {
        if (wsConnected) {
            disconnectWebSocket();
            setTimeout(() => connectWebSocket(), 1000);
        } else {
            fetchOrdersAPI();
        }
    };

    // Initialize connection on mount
    useEffect(() => {
        isUnmountedRef.current = false;
        setComponentError(null);

        fetchOrdersAPI().then(() => {
            setTimeout(() => {
                if (!isUnmountedRef.current) {
                    connectWebSocket();
                }
            }, 1000);
        }).catch((error) => {
            handleComponentError(error, 'Initial API call');
        });

        return () => {
            isUnmountedRef.current = true;
            disconnectWebSocket();
        };
    }, []);

    // Load Google Maps script
    useEffect(() => {
        if (!isMapModalOpen || mapScriptLoaded) return;

        const script = document.createElement('script');
        script.src = `https://maps.gomaps.pro/maps/api/js?key=AlzaSyNWmbqBT69lAW7bQ3RKsK37imGf2v6fhcy&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapScriptLoaded(true);
        script.onerror = () => showErrorToast('Failed to load Google Maps');
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, [isMapModalOpen, mapScriptLoaded]);

    // Initialize map when modal opens and script is loaded
    useEffect(() => {
        if (isMapModalOpen && mapScriptLoaded && selectedOrder && hasDeliveryLocation(selectedOrder)) {
            initMap();
        }

        return () => {
            if (map) {
                setMap(null);
            }
        };
    }, [isMapModalOpen, mapScriptLoaded, selectedOrder]);

    const initMap = () => {
        if (!selectedOrder || !hasDeliveryLocation(selectedOrder)) return;

        const deliveryLat = parseFloat(selectedOrder.deliveryLatitude);
        const deliveryLng = parseFloat(selectedOrder.deliveryLongitude);

        const mapOptions = {
            center: { lat: deliveryLat, lng: deliveryLng },
            zoom: 15,
            styles: isDarkMode ? darkMapStyles : [],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
        };

        const mapInstance = new window.google.maps.Map(document.getElementById("google-map"), mapOptions);
        setMap(mapInstance);

        const markerIcon = {
            url: '/images/home_marker.png',
            scaledSize: new window.google.maps.Size(40, 40),
            origin: new window.google.maps.Point(0, 0),
            anchor: new window.google.maps.Point(20, 40)
        };

        const marker = new window.google.maps.Marker({
            position: { lat: deliveryLat, lng: deliveryLng },
            map: mapInstance,
            title: `Order #${selectedOrder.orderNumber}`,
            icon: markerIcon
        });

        const infoWindow = new window.google.maps.InfoWindow({
            content: `
                <div style="
                    color: ${isDarkMode ? '#f0f0f0' : '#333'};
                    font-family: 'Roboto', Arial, sans-serif;
                    min-width: 250px;
                    padding: 12px;
                    background: ${isDarkMode ? '#2d2d2d' : '#fff'};
                    border-radius: 8px;
                    box-shadow: 0 2px 7px rgba(0,0,0,0.3);
                ">
                    <div style="
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: ${isDarkMode ? '#fff' : '#1a73e8'};
                        border-bottom: 1px solid ${isDarkMode ? '#444' : '#eee'};
                        padding-bottom: 6px;
                    ">
                        Order #${selectedOrder.orderNumber}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; margin-bottom: 4px;">
                            <span style="flex: 1; font-weight: 500; color: ${isDarkMode ? '#bbb' : '#666'}">Customer:</span>
                            <span style="flex: 1">${selectedOrder.customerName || 'Walk-in Customer'}</span>
                        </div>
                        <div style="display: flex; margin-bottom: 4px;">
                            <span style="flex: 1; font-weight: 500; color: ${isDarkMode ? '#bbb' : '#666'}">Status:</span>
                            <span style="flex: 1; color: ${selectedOrder.status === 'Completed' ? '#0f9d58' :
                    selectedOrder.status === 'Pending' ? '#f4b400' :
                        selectedOrder.status === 'Cancelled' ? '#db4437' :
                            isDarkMode ? '#fff' : '#333'
                }">
                                ${selectedOrder.status}
                            </span>
                        </div>
                        <div style="display: flex; margin-bottom: 4px;">
                            <span style="flex: 1; font-weight: 500; color: ${isDarkMode ? '#bbb' : '#666'}">Total:</span>
                            <span style="flex: 1; font-weight: 600">${currencySymbol}${selectedOrder.totalAmount?.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style="
                        background: ${isDarkMode ? '#383838' : '#f8f9fa'};
                        padding: 8px;
                        border-radius: 4px;
                        font-size: 14px;
                    ">
                        <div style="font-weight: 500; margin-bottom: 4px; color: ${isDarkMode ? '#bbb' : '#666'}">Delivery Address:</div>
                        <div>${selectedOrder.deliveryAddress}</div>
                    </div>
                </div>
            `,
        });

        infoWindow.open(mapInstance, marker);
    };

    const darkMapStyles = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
        },
        {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
        },
        {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
        },
        {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
        },
        {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
        },
    ];

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
                <small className="text-muted">
                    Connection: {wsConnected ? 'WebSocket (Real-time)' : 'API'}
                    {wsError && ' (WebSocket failed)'}
                </small>
            </div>
        );
    };

    // Connection Status Component
    const ConnectionStatus = ({ wsConnected, wsError }) => (
        <span
            className={`ms-2 ${wsConnected ? 'text-primary' : 'text-warning'}`}
            title={wsConnected ? 'Connected' : wsError || 'Disconnected'}
        >
            {wsConnected ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
        </span>
    );

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
        if (order.orderType?.toLowerCase().includes('pos') ||
            ['COMPLETED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.status.toUpperCase())) {
            showErrorToast('Status updates are not available for this order');
            return;
        }

        setSelectedOrder(order);
        setSelectedStatus('');

        // Get current status in uppercase
        const currentStatus = order.status.toUpperCase();
        const isDelivery = order.fulfillmentType?.toLowerCase().includes('delivery');

        // Define status transitions based on fulfillment type
        let statusFlow = {};

        if (isDelivery) {
            // Delivery order status flow
            statusFlow = {
                'PENDING': ['ACCEPTED', 'REJECTED'],
                'ACCEPTED': ['PREPARING', 'REJECTED'],
                'PREPARING': ['READY', 'REJECTED'],
                'READY': ['DISPATCHED', 'REJECTED'],
                'DISPATCHED': ['ON_THE_WAY', 'REJECTED'],
                'ON_THE_WAY': ['DELIVERED', 'REJECTED'],
                'DELIVERED': ['COMPLETED'],
            };
        } else {
            // Takeaway order status flow (only PREPARING, READY, COMPLETED)
            statusFlow = {
                'PENDING': ['ACCEPTED', 'REJECTED'],
                'ACCEPTED': ['PREPARING', 'REJECTED'],
                'PREPARING': ['READY', 'REJECTED'],
                'READY': ['COMPLETED', 'REJECTED'],
            };
        }

        // Get the next possible statuses based on current status
        const nextStatuses = statusFlow[currentStatus] || [];

        // Map to full status options
        const statusOptionsMap = {
            'ACCEPTED': { value: 'ACCEPTED', label: 'Accepted', color: 'bg-blue' },
            'PREPARING': { value: 'PREPARING', label: 'Preparing', color: 'bg-orange' },
            'READY': { value: 'READY', label: 'Ready', color: 'bg-yellow' },
            'DISPATCHED': { value: 'DISPATCHED', label: 'Dispatched', color: 'bg-violet' },
            'ON_THE_WAY': { value: 'ON_THE_WAY', label: 'On the way', color: 'bg-fuchsia' },
            'DELIVERED': { value: 'DELIVERED', label: 'Delivered', color: 'bg-emerald' },
            'COMPLETED': { value: 'COMPLETED', label: 'Completed', color: 'bg-green1' },
            'REJECTED': { value: 'REJECTED', label: 'Rejected', color: 'bg-dark-red' }
        };

        // Filter out any undefined statuses and create the options array
        const nextStatusOptions = nextStatuses
            .filter(status => statusOptionsMap[status])
            .map(status => statusOptionsMap[status]);

        setNextStatusOptions(nextStatusOptions);
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

            // Validate status transition
            const currentStatus = selectedOrder.status.toUpperCase();
            const newStatus = selectedStatus.toUpperCase();

            // Prevent invalid transitions
            if (currentStatus === 'DELIVERED' && newStatus !== 'COMPLETED') {
                throw new Error("Cannot change status from Delivered");
            }
            if (currentStatus === 'COMPLETED') {
                throw new Error("Cannot change status from Completed");
            }
            if (currentStatus === 'CANCELLED') {
                throw new Error("Cannot change status from Cancelled");
            }
            if (currentStatus === 'REJECTED') {
                throw new Error("Cannot change status from Rejected");
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

                // If WebSocket is not connected, refresh via API
                if (!wsConnected) {
                    fetchOrdersAPI();
                }
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

            // If WebSocket is not connected, refresh via API
            if (!wsConnected) {
                fetchOrdersAPI();
            }
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

            const binaryString = atob(order.pdfInvoice);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${order.orderNumber}.pdf`;
            document.body.appendChild(a);
            a.click();

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

    const hasDeliveryLocation = (order) => {
        return order.deliveryLatitude && order.deliveryLongitude &&
            parseFloat(order.deliveryLatitude) !== 0 && parseFloat(order.deliveryLongitude) !== 0;
    };

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

    if (componentError) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h4>Component Error</h4>
                    <p>{componentError}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setComponentError(null);
                            window.location.reload();
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

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
            cell: (info) => {
                const value = info.getValue();
                return `${currencySymbol}${value ? value.toFixed(2) : '0.00'}`;
            }
        },
        {
            accessorKey: 'paymentMethod',
            header: 'Payment',
            cell: (info) => {
                const method = info.getValue();
                return method ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() : '-';
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
                const isDeliveryOrder = row.original.fulfillmentType?.toLowerCase().includes('delivery');
                const currentStatus = row.original.status.toUpperCase();
                const showAssignRider = isDeliveryOrder &&
                    ['READY', 'DISPATCHED', 'ON_THE_WAY'].includes(currentStatus);

                return (
                    <div className="hstack gap-2 justify-content-end">
                        {/* Hide edit button for POS orders or completed/delivered/rejected/cancelled orders */}
                        {!row.original.orderType?.toLowerCase().includes('pos') &&
                            !['COMPLETED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(currentStatus) && (
                                <button
                                    className="avatar-text avatar-md"
                                    onClick={() => handleEditOrder(row.original)}
                                    title="Update Status"
                                >
                                    <FiEdit />
                                </button>
                            )}

                        {/* Assign Rider button for delivery orders in READY, DISPATCHED, or ON_THE_WAY status */}
                        {showAssignRider && (
                            <button
                                className="avatar-text avatar-md bg-primary text-white"
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
                                className="avatar-text avatar-md"
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

    try {
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
                    <div className="d-flex align-items-center">
                        <h4 className="mb-0">Orders</h4>
                        <button
                            className="btn btn-sm btn-link text-primary ms-2"
                            onClick={handleManualRefresh}
                            disabled={loading}
                            title="Refresh orders"
                        >
                            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
                        </button>
                    </div>
                </div>

                {wsError && !wsConnected && (
                    <div className="alert alert-warning alert-dismissible fade show mb-3" role="alert">
                        <strong>Connection Notice:</strong> WebSocket connection failed ({wsError}). Using API fallback for updates.
                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                )}

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
                            <div
                                id="google-map"
                                style={{
                                    height: '100%',
                                    width: '100%',
                                    backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa'
                                }}
                            >
                                {!mapScriptLoaded && (
                                    <div className="d-flex justify-content-center align-items-center h-100">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
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

/* Google Maps container styling */
#google-map {
    height: 100%;
    width: 100%;
}

/* Loading spinner */
.spinner-border.text-primary {
    color: #0092ff !important;
}

/* Spin animation for refresh button */
.spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}`}
                </style>
            </>
        );
    } catch (renderError) {
        console.error('Component render error', renderError);
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h4>Render Error</h4>
                    <p>There was an error rendering the orders table. Please refresh the page.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }
};

export default OrderTable;