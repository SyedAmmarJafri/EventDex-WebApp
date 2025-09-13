import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { Map, Satellite, Users } from 'lucide-react';
import { BASE_URL } from '/src/constants.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom rider marker
const createRiderIcon = (size, isSelected = false) => {
  return L.icon({
    iconUrl: '/images/rider_marker.png',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    className: isSelected ? 'selected-marker' : ''
  });
};

const RidersAndMapView = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [viewMode, setViewMode] = useState('seeAll'); // 'seeAll' or 'focused'
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' or 'satellite'

  const mapRef = useRef(null);
  const markersRef = useRef({});
  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const WS_CONFIG = {
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    connectionTimeout: 10000,
  };

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('map-container', {
      zoomControl: false // This removes the zoom buttons
    }).setView([24.8607, 67.0011], 10);
    mapRef.current = map;

    // Add base layer
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    }).addTo(map);

    // Add satellite layer (but don't add it to map initially)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: ''
    });

    // Store layers for later use
    map._layers = {
      roadmap: osmLayer,
      satellite: satelliteLayer
    };

    setMapLoaded(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map container size when component mounts or resizes
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current.invalidateSize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize after a short delay to ensure container is rendered
    setTimeout(handleResize, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'IDLE': return '#28a745'; // Green
      case 'ON_JOB': return '#fd7e14'; // Orange
      case 'OFFLINE': return '#6c757d'; // Gray
      case 'ON_BREAK': return '#17a2b8'; // Teal
      case 'ASSIGNED': return '#007bff'; // Blue
      case 'DISPATCHED': return '#dc3545'; // Red
      default: return '#343a40'; // Dark
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'IDLE': return 'bg-success';
      case 'ON_JOB': return 'bg-warning';
      case 'OFFLINE': return 'bg-secondary';
      case 'ON_BREAK': return 'bg-info';
      case 'ASSIGNED': return 'bg-primary';
      case 'DISPATCHED': return 'bg-danger';
      default: return 'bg-dark';
    }
  };

  const handleSeeAll = useCallback(() => {
    if (!mapRef.current || riders.length === 0) return;

    setSelectedRiderId(null);
    setViewMode('seeAll');

    // Show all markers
    Object.keys(markersRef.current).forEach(id => {
      const marker = markersRef.current[id];
      marker.setIcon(createRiderIcon(40));
      marker.addTo(mapRef.current);
    });

    // Fit bounds to show all markers
    const bounds = L.latLngBounds(riders
      .filter(rider => rider.latitude && rider.longitude)
      .map(rider => [rider.latitude, rider.longitude])
    );

    if (bounds.isValid()) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: Math.max(currentZoom, 12)
      });
    }
  }, [riders]);

  const handleRiderClick = useCallback((rider) => {
    if (!mapRef.current || !rider.latitude || !rider.longitude) return;

    setSelectedRiderId(rider.riderId);
    setViewMode('focused');

    // Hide all other markers except the selected one
    Object.keys(markersRef.current).forEach(id => {
      const marker = markersRef.current[id];
      if (id === rider.riderId) {
        // Show and highlight selected marker
        marker.addTo(mapRef.current);
        marker.setIcon(createRiderIcon(50, true));
        marker.openPopup();
      } else {
        // Remove other markers from map
        mapRef.current.removeLayer(marker);
      }
    });

    // Set center and zoom to selected rider
    mapRef.current.setView([rider.latitude, rider.longitude], 17);
  }, []);

  const toggleMapType = useCallback(() => {
    if (!mapRef.current) return;

    const newMapType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(newMapType);

    // Remove current layer
    Object.values(mapRef.current._layers).forEach(layer => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    // Add new layer
    mapRef.current.addLayer(mapRef.current._layers[newMapType]);
  }, [mapType]);

  const fetchLiveRiderLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const clientId = getClientId();
      const token = getAuthToken();

      if (!clientId || !token) {
        throw new Error('Authentication error');
      }

      const response = await fetch(`${BASE_URL}/api/client-admin/rider-locations/live`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(``);

      const data = await response.json();
      setRiders(data.map(rider => ({
        ...rider,
        vehicle: 'Motorcycle'
      })));

      if (mapRef.current) updateMapMarkers(data);
    } catch (err) {
      console.error('Error fetching rider locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getClientId, getAuthToken]);

  const updateMapMarkers = useCallback((riderData) => {
    if (!mapRef.current) return;

    const newMarkers = {};

    riderData.forEach(rider => {
      const riderId = rider.riderId;
      const lat = rider.latitude;
      const lng = rider.longitude;

      if (!lat || !lng) return;

      if (markersRef.current[riderId]) {
        const marker = markersRef.current[riderId];
        const newPosition = L.latLng(lat, lng);
        if (!marker.getLatLng().equals(newPosition)) {
          marker.setLatLng(newPosition);

          // Only pan to rider if in focused mode and this is the selected rider
          if (selectedRiderId === riderId && viewMode === 'focused') {
            mapRef.current.panTo(newPosition);
          }
        }
      } else {
        const marker = L.marker([lat, lng], {
          icon: createRiderIcon(40),
          title: rider.riderName
        });

        const popupContent = `
          <div class="rider-popup">
            <p><b>${rider.riderName}</b></p>
            <p>Phone: ${rider.riderPhone}</p>
            <p>Status: <span class="status-badge" style="background-color: ${getStatusColor(rider.status)}">
              ${rider.status.replace('_', ' ')}
            </span></p>
            <small>Last updated: ${new Date(rider.timestamp).toLocaleTimeString()}</small>
          </div>
        `;

        marker.bindPopup(popupContent);
        newMarkers[riderId] = marker;
        
        // Only add to map if we're in "see all" mode or this is the selected rider
        if (viewMode === 'seeAll' || selectedRiderId === riderId) {
          marker.addTo(mapRef.current);
        }
      }
    });

    // Remove markers for riders that no longer exist
    Object.keys(markersRef.current).forEach(riderId => {
      if (!riderData.find(r => r.riderId === riderId)) {
        mapRef.current.removeLayer(markersRef.current[riderId]);
        delete markersRef.current[riderId];
      }
    });

    markersRef.current = { ...markersRef.current, ...newMarkers };
  }, [selectedRiderId, viewMode]);

  const connectWebSocket = useCallback(async () => {
    if (isUnmountedRef.current) return;

    const clientId = getClientId();
    if (!clientId) return;

    disconnectWebSocket();

    try {
      setWsError(null);
      setWsConnected(false);

      const SockJS = (await import('sockjs-client')).default;
      const Stomp = (await import('stompjs')).default;

      const socket = new SockJS(`${BASE_URL}/ws`);
      const stompClient = Stomp.over(socket);
      stompClient.debug = () => { };

      const connectionTimeout = setTimeout(() => {
        if (stompClient && !stompClient.connected) {
          stompClient.disconnect();
          setWsError('Connection timeout');
        }
      }, WS_CONFIG.connectionTimeout);

      stompClient.connect({}, () => {
        clearTimeout(connectionTimeout);
        if (isUnmountedRef.current) return;

        setWsConnected(true);
        setWsError(null);
        setReconnectAttempts(0);

        const locationSub = stompClient.subscribe(
          `/topic/locations/${clientId}`,
          (message) => {
            try {
              const locationUpdate = JSON.parse(message.body);
              setRiders(prevRiders => {
                const updatedRiders = prevRiders.map(rider =>
                  rider.riderId === locationUpdate.riderId ? {
                    ...rider,
                    latitude: locationUpdate.latitude,
                    longitude: locationUpdate.longitude,
                    timestamp: locationUpdate.timestamp,
                    status: locationUpdate.status
                  } : rider
                );

                if (mapRef.current) {
                  // Update only the marker position
                  const marker = markersRef.current[locationUpdate.riderId];
                  if (marker) {
                    const newPosition = L.latLng(
                      locationUpdate.latitude,
                      locationUpdate.longitude
                    );
                    marker.setLatLng(newPosition);

                    // Only pan to rider if in focused mode and this is the selected rider
                    if (selectedRiderId === locationUpdate.riderId && viewMode === 'focused') {
                      mapRef.current.panTo(newPosition);
                    }
                  }
                }
                return updatedRiders;
              });
            } catch (parseError) {
              console.error('Error parsing location update:', parseError);
            }
          }
        );

        stompClientRef.current = {
          client: stompClient,
          subscriptions: [locationSub]
        };
      }, (error) => {
        clearTimeout(connectionTimeout);
        setWsConnected(false);
        setWsError(error?.toString() || 'Connection failed');

        if (reconnectAttempts < WS_CONFIG.maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, WS_CONFIG.reconnectDelay);
        }
      });
    } catch (error) {
      console.error('WebSocket setup error:', error);
      setWsError(error?.toString() || 'Setup failed');
      setWsConnected(false);
    }
  }, [getClientId, reconnectAttempts, selectedRiderId, viewMode]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (stompClientRef.current) {
      if (stompClientRef.current.subscriptions) {
        stompClientRef.current.subscriptions.forEach(sub => sub.unsubscribe());
      }
      if (stompClientRef.current.client.connected) {
        stompClientRef.current.client.disconnect();
      }
      stompClientRef.current = null;
    }
    setWsConnected(false);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    fetchLiveRiderLocations();
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      disconnectWebSocket();
    };
  }, [fetchLiveRiderLocations, connectWebSocket, disconnectWebSocket]);

  // Update map markers when riders change
  useEffect(() => {
    if (mapRef.current && riders.length > 0) {
      updateMapMarkers(riders);
      
      // If in "see all" mode, fit bounds to show all markers
      if (viewMode === 'seeAll') {
        setTimeout(() => {
          if (mapRef.current && riders.length > 0) {
            const bounds = L.latLngBounds(riders
              .filter(rider => rider.latitude && rider.longitude)
              .map(rider => [rider.latitude, rider.longitude])
            );

            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 12
              });
            }
          }
        }, 100);
      }
    }
  }, [riders, viewMode]);

  const availableRidersCount = riders.filter(r => r.status === 'IDLE').length;
  const busyRidersCount = riders.filter(r => r.status === 'ON_JOB').length;
  const selectedRider = riders.find(r => r.riderId === selectedRiderId);

  return (
    <div className="container-fluid mt-4">
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .rider-popup { min-width: 220px; padding: 12px; }
          .rider-popup h6 { margin-bottom: 8px; color: #333; font-size: 16px; }
          .rider-popup p { margin-bottom: 6px; color: #666; font-size: 14px; }
          .rider-popup small { color: #999; font-size: 12px; }
          #map-container { 
            width: 100%; 
            height: 100%;
            min-height: 500px;
            flex-grow: 1;
            background: #f5f5f5; 
            position: relative;
          }
          
          .map-card-body {
            display: flex;
            flex-direction: column;
            min-height: 500px;
          }
          
          .map-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .map-control-group {
            display: flex;
            gap: 4px;
          }
          
          .selected-rider {
            background-color: #e3f2fd !important;
            border-left: 4px solid #2196f3 !important;
          }
          
          /* Status badge styles */
          .badge-status {
            color: white !important;
            font-weight: 500;
            text-transform: capitalize;
            min-width: 80px;
            text-align: center;
          }
          
          /* Status in popup */
          .status-badge {
            display: inline-block;
            padding: 0.25em 0.4em;
            font-size: 75%;
            font-weight: 700;
            line-height: 1;
            text-align: center;
            white-space: nowrap;
            vertical-align: baseline;
            border-radius: 0.25rem;
            color: white;
          }
          
          /* Leaflet popup styling */
          .leaflet-popup-content-wrapper {
            border-radius: 8px;
          }
          
          /* Selected marker styling */
          .selected-marker {
            filter: drop-shadow(0 0 8px rgba(33, 150, 243, 0.8));
          }
          
          /* Hide zoom controls */
          .leaflet-control-zoom {
            display: none !important;
          }
        `}
      </style>

      <div className="row h-100">
        <div className="col-lg-3 col-md-5 mb-4">
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Available Riders</h5>
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <span className="badge bg-primary">{riders.length} riders</span>
              )}
            </Card.Header>
            <Card.Body className="hide-scrollbar" style={{
              overflowY: 'auto',
              maxHeight: '600px'
            }}>
              {error ? (
                <div className="alert alert-danger">{error}</div>
              ) : (
                <ListGroup variant="flush">
                  {riders.map(rider => (
                    <ListGroup.Item
                      key={rider.riderId}
                      className={`d-flex justify-content-between align-items-center ${selectedRiderId === rider.riderId ? 'selected-rider' : ''
                        }`}
                      action
                      onClick={() => handleRiderClick(rider)}
                    >
                      <div>
                        <h6 className="mb-1">{rider.riderName}</h6>
                        <small className="text-muted">
                          {rider.vehicle} • {rider.riderPhone}
                        </small>
                      </div>
                      <Badge
                        className={`${getStatusBadgeClass(rider.status)}`}
                        pill
                      >
                        {rider.status.replace('_', ' ')}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-lg-9 col-md-7 mb-4">
          <Card className="h-100 d-flex">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {viewMode === 'focused' && selectedRider ? 
                  `Tracking: ${selectedRider.riderName}` : 
                  'Live Tracking'
                }
              </h5>
              <div>
                <span className="badge bg-success me-2">Available: {availableRidersCount}</span>
                <span className="badge bg-warning">On Job: {busyRidersCount}</span>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant={viewMode === 'seeAll' ? 'primary' : 'primary'}
                  size="sm"
                  onClick={handleSeeAll}
                  disabled={riders.length === 0}
                  title="See All Riders"
                >
                  <Users size={16} className="me-1" />
                  See All
                </Button>
                <Button
                  variant={mapType === 'satellite' ? 'success' : 'success'}
                  size="sm"
                  onClick={toggleMapType}
                  title="Toggle Map Type"
                >
                  {mapType === 'satellite' ? <Satellite size={16} /> : <Map size={16} />}
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0 map-card-body">
              <div id="map-container"></div>
            </Card.Body>
            <Card.Footer className="text-muted">
              <small>
                Last refreshed: {new Date().toLocaleTimeString()}
                {viewMode === 'focused' && selectedRider && (
                  <span className="ms-2">
                    • Tracking: {selectedRider.riderName}
                  </span>
                )}
              </small>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RidersAndMapView;