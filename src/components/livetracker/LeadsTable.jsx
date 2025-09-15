import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { Map, Satellite, Users, Navigation, Gauge } from 'lucide-react';
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

// Custom rider marker with rotation support
const createRiderIcon = (size, isSelected = false, bearing = 0) => {
  return L.divIcon({
    html: `
      <div class="rider-marker ${isSelected ? 'selected' : ''}" style="transform: rotate(${bearing}deg);">
        <img src="/images/rider_marker.png" width="${size}" height="${size}" />
        ${isSelected ? '<div class="pulse-animation"></div>' : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: 'custom-rider-marker'
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
  const animationFrameRef = useRef(null);
  const markerAnimationsRef = useRef({});

  const WS_CONFIG = {
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    connectionTimeout: 10000,
  };

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('map-container', {
      zoomControl: false,
      inertia: true, // Enable smooth panning
      inertiaDeceleration: 3000, // Adjust for smoother movement
      easeLinearity: 0.2
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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

  const formatSpeed = (speed) => {
    if (speed === null || speed === undefined) return 'N/A';
    // Convert m/s to km/h and format
    const kmh = speed * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  const smoothMoveMarker = useCallback((marker, newLatLng, newBearing, duration = 2000) => {
    if (!marker) return;

    const currentPos = marker.getLatLng();
    const currentBearing = marker._currentBearing || 0;
    
    // Cancel any existing animation for this marker
    if (markerAnimationsRef.current[marker._riderId]) {
      cancelAnimationFrame(markerAnimationsRef.current[marker._riderId]);
    }

    const startTime = Date.now();
    const startPos = currentPos;
    const startBearing = currentBearing;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const easedProgress = ease(progress);

      // Interpolate position
      const lat = startPos.lat + (newLatLng.lat - startPos.lat) * easedProgress;
      const lng = startPos.lng + (newLatLng.lng - startPos.lng) * easedProgress;
      
      // Interpolate bearing (handle circular nature of angles)
      let bearingDiff = newBearing - startBearing;
      if (bearingDiff > 180) bearingDiff -= 360;
      if (bearingDiff < -180) bearingDiff += 360;
      const bearing = startBearing + bearingDiff * easedProgress;

      // Update marker position and rotation
      marker.setLatLng([lat, lng]);
      marker.setIcon(createRiderIcon(selectedRiderId === marker._riderId ? 50 : 40, 
                                    selectedRiderId === marker._riderId, 
                                    bearing));
      
      // Store current bearing for next animation
      marker._currentBearing = bearing;

      if (progress < 1) {
        markerAnimationsRef.current[marker._riderId] = requestAnimationFrame(animate);
      } else {
        // Ensure final position and bearing are exact
        marker.setLatLng(newLatLng);
        marker.setIcon(createRiderIcon(selectedRiderId === marker._riderId ? 50 : 40, 
                                      selectedRiderId === marker._riderId, 
                                      newBearing));
        marker._currentBearing = newBearing;
        delete markerAnimationsRef.current[marker._riderId];
      }
    };

    markerAnimationsRef.current[marker._riderId] = requestAnimationFrame(animate);
  }, [selectedRiderId]);

  const handleSeeAll = useCallback(() => {
    if (!mapRef.current || riders.length === 0) return;

    setSelectedRiderId(null);
    setViewMode('seeAll');

    // Show all markers with smooth transition
    Object.keys(markersRef.current).forEach(id => {
      const marker = markersRef.current[id];
      marker.addTo(mapRef.current);
      marker.setIcon(createRiderIcon(40, false, marker._currentBearing || 0));
    });

    // Fit bounds to show all markers with smooth transition
    const bounds = L.latLngBounds(riders
      .filter(rider => rider.latitude && rider.longitude)
      .map(rider => [rider.latitude, rider.longitude])
    );

    if (bounds.isValid()) {
      mapRef.current.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [riders]);

  const handleRiderClick = useCallback((rider) => {
    if (!mapRef.current || !rider.latitude || !rider.longitude) return;

    setSelectedRiderId(rider.riderId);
    setViewMode('focused');

    // Hide all other markers except the selected one with smooth transition
    Object.keys(markersRef.current).forEach(id => {
      const marker = markersRef.current[id];
      if (id === rider.riderId) {
        // Show and highlight selected marker
        marker.addTo(mapRef.current);
        marker.setIcon(createRiderIcon(50, true, marker._currentBearing || 0));
        marker.openPopup();
      } else {
        // Remove other markers from map
        mapRef.current.removeLayer(marker);
      }
    });

    // Smooth fly to selected rider
    mapRef.current.flyTo([rider.latitude, rider.longitude], 17, {
      duration: 1.5,
      easeLinearity: 0.25
    });
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
      const bearing = rider.bearing || 0;
      const speed = rider.speed || 0;

      if (!lat || !lng) return;

      if (markersRef.current[riderId]) {
        const marker = markersRef.current[riderId];
        const newPosition = L.latLng(lat, lng);
        const currentPosition = marker.getLatLng();
        
        // Only animate if the position has changed significantly
        const distance = currentPosition.distanceTo(newPosition);
        if (distance > 5) { // Only animate if moved more than 5 meters
          smoothMoveMarker(marker, newPosition, bearing);
        } else {
          // Small movement, just update position and bearing without animation
          marker.setLatLng(newPosition);
          marker.setIcon(createRiderIcon(
            selectedRiderId === riderId ? 50 : 40,
            selectedRiderId === riderId,
            bearing
          ));
          marker._currentBearing = bearing;
        }

        // Update popup content with speed information
        const popupContent = `
          <div class="rider-popup">
            <p><b>${rider.riderName}</b></p>
            <p>Phone: ${rider.riderPhone}</p>
            <p>Speed: ${formatSpeed(speed)}</p>
            <p>Status: <span class="status-badge" style="background-color: ${getStatusColor(rider.status)}">
              ${rider.status.replace('_', ' ')}
            </span></p>
            <small>Last updated: ${new Date(rider.timestamp).toLocaleTimeString()}</small>
          </div>
        `;
        marker.setPopupContent(popupContent);

        // Only pan to rider if in focused mode and this is the selected rider
        if (selectedRiderId === riderId && viewMode === 'focused') {
          mapRef.current.panTo(newPosition, {
            animate: true,
            duration: 1.0
          });
        }
      } else {
        const marker = L.marker([lat, lng], {
          icon: createRiderIcon(40, false, bearing),
          title: rider.riderName
        });

        // Store rider ID and current bearing for animation
        marker._riderId = riderId;
        marker._currentBearing = bearing;

        const popupContent = `
          <div class="rider-popup">
            <p><b>${rider.riderName}</b></p>
            <p>Phone: ${rider.riderPhone}</p>
            <p>Speed: ${formatSpeed(speed)}</p>
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
        // Also cancel any ongoing animation
        if (markerAnimationsRef.current[riderId]) {
          cancelAnimationFrame(markerAnimationsRef.current[riderId]);
          delete markerAnimationsRef.current[riderId];
        }
      }
    });

    markersRef.current = { ...markersRef.current, ...newMarkers };
  }, [selectedRiderId, viewMode, smoothMoveMarker]);

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
                    bearing: locationUpdate.bearing || 0,
                    speed: locationUpdate.speed || 0,
                    timestamp: locationUpdate.timestamp,
                    status: locationUpdate.status
                  } : rider
                );

                if (mapRef.current) {
                  // Update marker with smooth animation
                  const marker = markersRef.current[locationUpdate.riderId];
                  if (marker) {
                    const newPosition = L.latLng(
                      locationUpdate.latitude,
                      locationUpdate.longitude
                    );
                    const bearing = locationUpdate.bearing || 0;
                    
                    smoothMoveMarker(marker, newPosition, bearing);

                    // Only pan to rider if in focused mode and this is the selected rider
                    if (selectedRiderId === locationUpdate.riderId && viewMode === 'focused') {
                      mapRef.current.panTo(newPosition, {
                        animate: true,
                        duration: 1.0
                      });
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
  }, [getClientId, reconnectAttempts, selectedRiderId, viewMode, smoothMoveMarker]);

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
      // Cancel all animations
      Object.values(markerAnimationsRef.current).forEach(animationId => {
        cancelAnimationFrame(animationId);
      });
      markerAnimationsRef.current = {};
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
              mapRef.current.flyToBounds(bounds, {
                padding: [50, 50],
                duration: 1.5,
                easeLinearity: 0.25
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
          
          /* Custom rider marker styling */
          .custom-rider-marker {
            background: transparent !important;
            border: none !important;
          }
          
          .rider-marker {
            position: relative;
            transition: transform 0.3s ease;
            will-change: transform;
          }
          
          .rider-marker.selected {
            z-index: 1000;
          }
          
          .rider-marker.selected .pulse-animation {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 60px;
            height: 60px;
            margin: -30px 0 0 -30px;
            background: rgba(33, 150, 243, 0.3);
            border-radius: 50%;
            animation: pulse 2s infinite;
            z-index: -1;
          }
          
          @keyframes pulse {
            0% {
              transform: scale(0.8);
              opacity: 0.7;
            }
            70% {
              transform: scale(1.2);
              opacity: 0;
            }
            100% {
              transform: scale(0.8);
              opacity: 0;
            }
          }
          
          /* Hide zoom controls */
          .leaflet-control-zoom {
            display: none !important;
          }
          
          /* Speed indicator in list */
          .speed-indicator {
            font-size: 12px;
            color: #6c757d;
            display: flex;
            align-items: center;
            gap: 4px;
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
                        <small className="text-muted d-block">
                          {rider.vehicle} • {rider.riderPhone}
                        </small>
                        <div className="speed-indicator">
                          <Gauge size={12} />
                          {formatSpeed(rider.speed)}
                        </div>
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
                    • Tracking: {selectedRider.riderName} • Speed: {formatSpeed(selectedRider.speed)}
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