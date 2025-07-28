import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, ListGroup, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { Map, Satellite, Users } from 'lucide-react';
import { BASE_URL } from '/src/constants.js';

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

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://maps.gomaps.pro/maps/api/js?key=AlzaSyNWmbqBT69lAW7bQ3RKsK37imGf2v6fhcy&libraries=places&callback=initMap';
    script.async = true;
    script.defer = true;

    window.initMap = () => {
      setMapLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setError('Failed to load map');
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      delete window.initMap;
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

    // Reset all markers to normal size
    Object.keys(markersRef.current).forEach(id => {
      const marker = markersRef.current[id];
      marker.setIcon({
        url: '/images/rider_marker.png',
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40)
      });
    });

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    riders.forEach(rider => {
      if (rider.latitude && rider.longitude) {
        bounds.extend(new google.maps.LatLng(rider.latitude, rider.longitude));
      }
    });

    if (!bounds.isEmpty()) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: Math.max(currentZoom, 12) // Don't zoom in more than zoom level 12
      });
    }
  }, [riders]);

  const handleRiderClick = useCallback((rider) => {
    if (!mapRef.current || !rider.latitude || !rider.longitude) return;

    setSelectedRiderId(rider.riderId);
    setViewMode('focused');

    const marker = markersRef.current[rider.riderId];
    if (marker) {
      if (marker.infoWindow) {
        marker.infoWindow.open(mapRef.current, marker);
      }

      // Set center and slightly zoomed in level
      mapRef.current.setCenter(new google.maps.LatLng(rider.latitude, rider.longitude));
      mapRef.current.setZoom(17); // Increased from 14 to 16 for a closer view

      // Larger size for selected marker
      marker.setIcon({
        url: '/images/rider_marker.png',
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 50)
      });

      // Reset other markers to normal size
      Object.keys(markersRef.current).forEach(id => {
        if (id !== rider.riderId) {
          const otherMarker = markersRef.current[id];
          otherMarker.setIcon({
            url: '/images/rider_marker.png',
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 40)
          });
        }
      });
    }
  }, []);

  const toggleMapType = useCallback(() => {
    if (!mapRef.current) return;

    const newMapType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(newMapType);
    mapRef.current.setMapTypeId(newMapType);
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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

  const initializeMap = useCallback(() => {
    if (mapRef.current || !mapLoaded) return;

    const defaultLat = riders.length > 0 ? riders[0].latitude : 24.8607;
    const defaultLng = riders.length > 0 ? riders[0].longitude : 67.0011;
    const defaultZoom = riders.length > 0 ? 12 : 10;

    mapRef.current = new google.maps.Map(document.getElementById('map-container'), {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: defaultZoom,
      mapTypeId: mapType,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      scaleControl: true
    });

    if (riders.length > 0) {
      updateMapMarkers(riders);
      // Set to see all by default after map is initialized
      setTimeout(() => {
        if (mapRef.current && riders.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          riders.forEach(rider => {
            if (rider.latitude && rider.longitude) {
              bounds.extend(new google.maps.LatLng(rider.latitude, rider.longitude));
            }
          });
          if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, {
              padding: 50,
              maxZoom: 12
            });
          }
        }
      }, 100);
    }
  }, [riders, mapLoaded, mapType]);

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
        const newPosition = new google.maps.LatLng(lat, lng);
        if (!marker.getPosition().equals(newPosition)) {
          marker.setPosition(newPosition);

          // Only pan to rider if in focused mode, don't change zoom
          if (selectedRiderId === riderId && viewMode === 'focused') {
            mapRef.current.panTo(newPosition);
            mapRef.current.setZoom(17); // Maintain the zoom level
          }
        }
      } else {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapRef.current,
          icon: {
            url: '/images/rider_marker.png',
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 40)
          },
          title: rider.riderName
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="rider-popup">
              <p><b>${rider.riderName}</b></p>
              <p>Phone: ${rider.riderPhone}</p>
              <p>Status: <span class="status-badge" style="background-color: ${getStatusColor(rider.status)}">
                ${rider.status.replace('_', ' ')}
              </span></p>
              <small>Last updated: ${new Date(rider.timestamp).toLocaleTimeString()}</small>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapRef.current, marker);
        });

        marker.infoWindow = infoWindow;
        newMarkers[riderId] = marker;
      }
    });

    // Remove markers for riders that no longer exist
    Object.keys(markersRef.current).forEach(riderId => {
      if (!riderData.find(r => r.riderId === riderId)) {
        markersRef.current[riderId].setMap(null);
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

      stompClient.connect({}, (frame) => {
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
                  // Update only the marker position without affecting camera
                  const marker = markersRef.current[locationUpdate.riderId];
                  if (marker) {
                    const newPosition = new google.maps.LatLng(
                      locationUpdate.latitude,
                      locationUpdate.longitude
                    );
                    marker.setPosition(newPosition);

                    // Only pan to rider if in focused mode, don't change zoom
                    if (selectedRiderId === locationUpdate.riderId && viewMode === 'focused') {
                      mapRef.current.panTo(newPosition);
                      mapRef.current.setZoom(17); // Maintain the zoom level
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

  useEffect(() => {
    if (mapLoaded && riders.length > 0 && !mapRef.current) {
      initializeMap();
    }
  }, [riders, initializeMap, mapLoaded]);

  // Update map type when changed
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  const availableRidersCount = riders.filter(r => r.status === 'IDLE').length;
  const busyRidersCount = riders.filter(r => r.status === 'ON_JOB').length;

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
            height: 500px; 
            min-height: 500px; 
            background: #f5f5f5; 
            position: relative;
          }
          .gm-style .gm-style-iw-c { padding: 0 !important; border-radius: 8px !important; }
          .gm-style .gm-style-iw-d { padding: 0 !important; overflow: hidden !important; }
          
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
        `}
      </style>

      <div className="row">
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
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Live Tracking</h5>
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
                >
                  <Users size={16} className="me-1" />
                  See All
                </Button>
                <Button
                  variant={mapType === 'satellite' ? 'success' : 'success'}
                  size="sm"
                  onClick={toggleMapType}
                >
                  {mapType === 'satellite' ? <Satellite size={16} /> : <Map size={16} />}
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div id="map-container"></div>
            </Card.Body>
            <Card.Footer className="text-muted">
              <small>
                Last refreshed: {new Date().toLocaleTimeString()}
              </small>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RidersAndMapView;