import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiBell, 
  FiCheck, 
  FiX, 
  FiChevronRight,
  FiPackage,
  FiTruck,
  FiAlertCircle,
  FiClock,
  FiInfo,
  FiBox,
  FiUser,
  FiHash,
  FiAlertTriangle,
  FiShoppingBag,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const NOTIFICATION_TYPES = {
  INVENTORY: {
    icon: <FiPackage className="text-orange-500" size={18} />,
    color: 'bg-orange-50',
    border: 'border-orange-100',
    title: 'Inventory Alert'
  },
  RIDER: {
    icon: <FiTruck className="text-blue-500" size={18} />,
    color: 'bg-blue-50',
    border: 'border-blue-100',
    title: 'Rider Update'
  },
  ORDER: {
    icon: <FiShoppingBag className="text-green-500" size={18} />,
    color: 'bg-green-50',
    border: 'border-green-100',
    title: 'Order Update'
  },
  SYSTEM: {
    icon: <FiAlertCircle className="text-purple-500" size={18} />,
    color: 'bg-purple-50',
    border: 'border-purple-100',
    title: 'System Notification'
  },
  DEFAULT: {
    icon: <FiInfo className="text-gray-500" size={18} />,
    color: 'bg-gray-50',
    border: 'border-gray-100',
    title: 'Notification'
  }
};

const NotificationDetailView = ({ notification, onClose, onDismiss }) => {
  const notificationType = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.DEFAULT;

  const renderDetailItem = (icon, label, value, extraClass = '') => (
    <div className={`d-flex mb-3 ${extraClass}`}>
      <div className="me-3 text-muted mt-1">
        {icon}
      </div>
      <div className="flex-grow-1">
        <div className="small text-muted mb-1">{label}</div>
        <div className="fw-semibold">{value || 'N/A'}</div>
      </div>
    </div>
  );

  const renderInventoryDetails = () => (
    <>
      {renderDetailItem(<FiBox />, 'Item Name', notification.data.itemName)}
      {renderDetailItem(<FiHash />, 'Current Quantity', notification.data.currentQuantity)}
      {renderDetailItem(<FiAlertTriangle />, 'Threshold', notification.data.threshold)}
      {renderDetailItem(
        <FiInfo />, 
        'Status', 
        notification.data.currentQuantity <= 0 ? 'Out of Stock' : 
        notification.data.currentQuantity < notification.data.threshold ? 'Low Stock' : 'In Stock'
      )}
    </>
  );

  const renderRiderDetails = () => (
    <>
      {renderDetailItem(<FiUser />, 'Rider Name', notification.data.riderName)}
      {renderDetailItem(<FiHash />, 'Order Number', `#${notification.data.orderNumber}`)}
      {renderDetailItem(
        <FiInfo />, 
        'Status', 
        notification.data.status?.replace(/_/g, ' ').toLowerCase()
      )}
      {notification.data.estimatedDelivery && 
        renderDetailItem(
          <FiClock />, 
          'Estimated Delivery', 
          new Date(notification.data.estimatedDelivery).toLocaleString()
        )}
    </>
  );

  const renderOrderDetails = () => (
    <>
      {renderDetailItem(<FiShoppingBag />, 'Order Number', `#${notification.data.orderNumber}`)}
      {renderDetailItem(<FiUser />, 'Customer', notification.data.customerName)}
      {renderDetailItem(
        <FiInfo />, 
        'Status', 
        notification.data.status?.replace(/_/g, ' ').toLowerCase()
      )}
      {notification.data.totalAmount && 
        renderDetailItem(
          <FiHash />, 
          'Total Amount', 
          `$${parseFloat(notification.data.totalAmount).toFixed(2)}`
        )}
    </>
  );

  const renderSystemDetails = () => (
    <>
      {renderDetailItem(<FiInfo />, 'Message', notification.message)}
      {notification.data.priority && 
        renderDetailItem(<FiAlertTriangle />, 'Priority', notification.data.priority)}
    </>
  );

  const renderDetails = () => {
    switch (notification.type) {
      case 'INVENTORY': return renderInventoryDetails();
      case 'RIDER': return renderRiderDetails();
      case 'ORDER': return renderOrderDetails();
      case 'SYSTEM': return renderSystemDetails();
      default: return renderDetailItem(<FiInfo />, 'Details', notification.message);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title d-flex align-items-center">
              <span className={`me-2 ${notificationType.color.replace('bg', 'text')}`}>
                {notificationType.icon}
              </span>
              <span>{notificationType.title}</span>
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            />
          </div>
          <div className="modal-body pt-1">
            <h6 className="mb-4 text-dark">{notification.title}</h6>
            {renderDetails()}
            <div className="d-flex align-items-center small text-muted mt-4 pt-2 border-top">
              <FiClock className="me-2" />
              <span>Received: {new Date(notification.timestamp).toLocaleString()}</span>
            </div>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
              onClick={onClose}
            >
              Close
            </button>
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={() => {
                onDismiss(notification.id);
                onClose();
              }}
            >
              Dismiss Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsModal = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsError, setWsError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isMuted, setIsMuted] = useState(() => {
      const saved = localStorage.getItem('notificationsMuted');
      return saved ? JSON.parse(saved) : false;
    });
    const [hasInteracted, setHasInteracted] = useState(false);
    
    const stompClientRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isUnmountedRef = useRef(false);
    const receivedNotificationIds = useRef(new Set());
    const audioContextRef = useRef(null);
    const gainNodeRef = useRef(null);

    const WS_CONFIG = {
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        connectionTimeout: 10000,
    };

    const initAudio = useCallback(() => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = 0.2; // Set default volume
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error('Audio initialization error:', e);
      }
    }, []);

    const playNotificationSound = useCallback(() => {
      if (isMuted || !hasInteracted) return;
      
      try {
        if (!audioContextRef.current) {
          initAudio();
          if (!audioContextRef.current) return;
        }

        const now = audioContextRef.current.currentTime;
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(gainNodeRef.current);

        oscillator.start();
        oscillator.stop(now + 0.3);
      } catch (e) {
        console.error('Sound playback error:', e);
      }
    }, [isMuted, hasInteracted, initAudio]);

    const toggleMute = () => {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      localStorage.setItem('notificationsMuted', JSON.stringify(newMutedState));
    };

    useEffect(() => {
      const handleInteraction = () => {
        setHasInteracted(true);
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      };

      window.addEventListener('click', handleInteraction);
      window.addEventListener('keydown', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);

      return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      };
    }, []);

    const getClientId = useCallback(() => {
        try {
            const authData = localStorage.getItem('authData');
            if (authData) {
                const parsedData = JSON.parse(authData);
                return parsedData.clientId || parsedData.id || parsedData.userId;
            }
        } catch (error) {
            console.error('Error getting client ID:', error);
        }
        return null;
    }, []);

    const getStatusMessage = (status) => {
        const statusMap = {
            'ASSIGNED': 'has been assigned to',
            'ACCEPTED': 'has accepted',
            'REJECTED': 'has rejected',
            'PICKED_UP': 'has picked up',
            'DELIVERED': 'has delivered',
            'CANCELLED': 'has cancelled assignment for',
            'LOW_STOCK': 'is running low on stock',
            'OUT_OF_STOCK': 'is out of stock',
            'ORDER_CREATED': 'has been created',
            'ORDER_UPDATED': 'has been updated'
        };
        return statusMap[status] || 'has been updated';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const now = new Date();
        const notificationTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const addNotification = useCallback((notification) => {
        const notificationId = notification.data?.id || `${notification.type}-${notification.timestamp}`;
        if (receivedNotificationIds.current.has(notificationId)) {
            console.log('Duplicate notification skipped:', notificationId);
            return;
        }

        receivedNotificationIds.current.add(notificationId);
        
        setNotifications(prev => {
          const newNotifications = [{
              id: Date.now(),
              type: notification.type || 'SYSTEM',
              title: notification.title || 'Notification',
              message: notification.message || '',
              timestamp: notification.timestamp || new Date(),
              data: notification.data || {},
              ...notification
          }, ...prev.slice(0, 49)];

          if (prev.length > 0) {
            playNotificationSound();
          }
          return newNotifications;
        });
    }, [playNotificationSound]);

    const connectWebSocket = useCallback(async () => {
        if (isUnmountedRef.current) return;

        const clientId = getClientId();
        if (!clientId) {
            console.log('No client ID available');
            return;
        }

        disconnectWebSocket();

        try {
            console.log('Attempting WebSocket connection');
            setWsError(null);
            setLoading(true);

            const SockJS = (await import('sockjs-client')).default;
            const Stomp = (await import('stompjs')).default;

            const socket = new SockJS(`http://localhost:8080/ws`);
            const stompClient = Stomp.over(socket);

            stompClient.debug = () => {};

            const connectionTimeout = setTimeout(() => {
                if (stompClient && !stompClient.connected) {
                    console.log('WebSocket connection timeout');
                    try {
                        stompClient.disconnect();
                    } catch (e) {
                        console.error('Error disconnecting on timeout:', e);
                    }
                    setWsError('Connection timeout');
                }
            }, WS_CONFIG.connectionTimeout);

            stompClient.connect(
                {},
                (frame) => {
                    try {
                        clearTimeout(connectionTimeout);
                        if (isUnmountedRef.current) {
                            stompClient.disconnect();
                            return;
                        }

                        console.log('✅ Connected to WebSocket');
                        setWsConnected(true);
                        setWsError(null);
                        setReconnectAttempts(0);
                        setLoading(false);

                        const inventorySub = stompClient.subscribe(
                            `/topic/inventory/${clientId}`,
                            (message) => {
                                try {
                                    const notification = JSON.parse(message.body);
                                    console.log('New inventory notification:', notification);
                                    addNotification({
                                        type: 'INVENTORY',
                                        title: 'Inventory Alert',
                                        message: `${notification.itemName} ${getStatusMessage(notification.status)} (${notification.currentQuantity} remaining)`,
                                        timestamp: notification.timestamp,
                                        data: notification
                                    });
                                } catch (parseError) {
                                    console.error('Error parsing inventory notification:', parseError);
                                }
                            }
                        );

                        const riderSub = stompClient.subscribe(
                            `/topic/rider/${clientId}`,
                            (message) => {
                                try {
                                    const notification = JSON.parse(message.body);
                                    console.log('New rider notification:', notification);
                                    addNotification({
                                        type: 'RIDER',
                                        title: 'Rider Update',
                                        message: `${notification.riderName} ${getStatusMessage(notification.status)} order #${notification.orderNumber}`,
                                        timestamp: notification.timestamp,
                                        data: notification
                                    });
                                } catch (parseError) {
                                    console.error('Error parsing rider notification:', parseError);
                                }
                            }
                        );

                        const orderSub = stompClient.subscribe(
                            `/topic/orders/${clientId}`,
                            (message) => {
                                try {
                                    const notification = JSON.parse(message.body);
                                    console.log('New order notification:', notification);
                                    addNotification({
                                        type: 'ORDER',
                                        title: 'Order Update',
                                        message: `Order #${notification.orderNumber} ${getStatusMessage(notification.status)}`,
                                        timestamp: notification.timestamp,
                                        data: notification
                                    });
                                } catch (parseError) {
                                    console.error('Error parsing order notification:', parseError);
                                }
                            }
                        );

                        stompClientRef.current = {
                            client: stompClient,
                            subscriptions: [inventorySub, riderSub, orderSub]
                        };
                    } catch (connectionError) {
                        console.error('Connection error:', connectionError);
                    }
                },
                (error) => {
                    try {
                        clearTimeout(connectionTimeout);
                        console.error('WebSocket error:', error);
                        
                        setWsConnected(false);
                        setWsError(error?.toString() || 'Connection failed');
                        setLoading(false);
                        
                        if (reconnectAttempts < WS_CONFIG.maxReconnectAttempts) {
                            const newAttempts = reconnectAttempts + 1;
                            setReconnectAttempts(newAttempts);
                            console.log(`Reconnecting attempt ${newAttempts}/${WS_CONFIG.maxReconnectAttempts}`);
                            
                            reconnectTimeoutRef.current = setTimeout(() => {
                                if (!isUnmountedRef.current) {
                                    connectWebSocket();
                                }
                            }, WS_CONFIG.reconnectDelay);
                        }
                    } catch (errorHandlerError) {
                        console.error('Error handler error:', errorHandlerError);
                    }
                }
            );

        } catch (error) {
            console.error('WebSocket setup error:', error);
            setWsError(error?.toString() || 'Setup failed');
            setWsConnected(false);
            setLoading(false);
        }
    }, [getClientId, reconnectAttempts, addNotification]);

    const disconnectWebSocket = useCallback(() => {
        try {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (stompClientRef.current) {
                console.log('Disconnecting WebSocket...');
                if (stompClientRef.current.subscriptions) {
                    stompClientRef.current.subscriptions.forEach(sub => sub.unsubscribe());
                }
                if (stompClientRef.current.client.connected) {
                    stompClientRef.current.client.disconnect();
                }
                stompClientRef.current = null;
            }
            setWsConnected(false);
        } catch (error) {
            console.error('Disconnection error:', error);
        }
    }, []);

    const markAsRead = (id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    };

    const markAllAsRead = () => {
        setNotifications([]);
    };

    const viewNotificationDetails = (notification) => {
        setSelectedNotification(notification);
    };

    const closeNotificationDetails = () => {
        setSelectedNotification(null);
    };

    useEffect(() => {
        console.log('Component mounting');
        isUnmountedRef.current = false;
        connectWebSocket();

        return () => {
            console.log('Component unmounting');
            isUnmountedRef.current = true;
            disconnectWebSocket();
            receivedNotificationIds.current.clear();
        };
    }, [connectWebSocket]);

    return (
        <div className="dropdown nxl-h-item">
            <div className="nxl-head-link me-3" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                <FiBell size={20} className="text-gray-600" />
                {notifications.length > 0 && (
                    <span className="badge bg-danger nxl-h-badge">
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                )}
            </div>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-notifications-menu p-0" style={{ width: '350px' }}>
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                    <h6 className="fw-bold mb-0">Notifications</h6>
                    <div className="d-flex align-items-center">
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="btn btn-link p-0 text-primary me-2"
                                title="Mark all as read"
                            >
                                <FiCheck size={16} className="me-1" />
                                <span className="small">Mark all</span>
                            </button>
                        )}
                        <button
                            onClick={toggleMute}
                            className="btn btn-link p-0 text-muted"
                            title={isMuted ? "Unmute notifications" : "Mute notifications"}
                        >
                            {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
                        </button>
                    </div>
                </div>

                {wsError && (
                    <div className="alert alert-warning alert-sm m-3">
                        <small>Connection issue: {wsError}</small>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger m-3">
                        <small>Error: {error}</small>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-4">
                        <FiBell size={24} className="text-muted mb-2" />
                        <p className="text-muted mb-1">No notifications</p>
                        <small className="text-muted">
                            {wsConnected ? 'Connected to real-time updates' : 'Not connected'}
                        </small>
                    </div>
                ) : (
                    <div className="notification-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.map(notification => {
                            const notificationType = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.DEFAULT;
                            return (
                                <div 
                                    key={notification.id} 
                                    className={`p-3 border-bottom ${notificationType.color} ${notificationType.border}`}
                                    onClick={() => viewNotificationDetails(notification)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="d-flex align-items-start">
                                        <div className="me-3">
                                            {notificationType.icon}
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between">
                                                <h6 className="mb-1 fw-semibold">{notification.title}</h6>
                                            </div>
                                            <p className="mb-1 small text-muted">{notification.message}</p>
                                            <div className="d-flex align-items-center small text-muted mt-2">
                                                <FiClock size={12} className="me-1" />
                                                <span>{formatTime(notification.timestamp)}</span>
                                            </div>
                                        </div>
                                        <button 
                                            className="btn btn-link p-0 text-danger ms-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                            }}
                                            title="Dismiss"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="text-center p-2 border-top">
                    <Link to="/notifications" className="small text-primary">
                        View All Notifications
                    </Link>
                </div>
            </div>

            {selectedNotification && (
                <NotificationDetailView 
                    notification={selectedNotification}
                    onClose={closeNotificationDetails}
                    onDismiss={markAsRead}
                />
            )}
        </div>
    );
};

export default NotificationsModal;
