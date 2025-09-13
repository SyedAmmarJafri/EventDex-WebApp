import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { BASE_URL } from '/src/constants.js';
import {
    Modal,
    Form,
    Button,
    Card,
    Spinner,
    Row,
    Col,
    InputGroup,
    Image,
    Badge
} from 'react-bootstrap';
import Footer from '@/components/shared/Footer';
import Switch from '@mui/material/Switch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const StoreSettingsForm = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [updatingHeader, setUpdatingHeader] = useState(false);
    const [updatingFooter, setUpdatingFooter] = useState(false);
    const [updatingStore, setUpdatingStore] = useState(false);
    const [updatingPolicies, setUpdatingPolicies] = useState(false);
    const [updatingDelivery, setUpdatingDelivery] = useState(false);
    const [updatingApp, setUpdatingApp] = useState(false);
    const [updatingAlertBar, setUpdatingAlertBar] = useState(false);
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [showAlertBarModal, setShowAlertBarModal] = useState(false);
    const [alertBars, setAlertBars] = useState([]);

    // Map references
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapContainerRef = useRef(null);
    const [mapLoading, setMapLoading] = useState(true);
    const [mapError, setMapError] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Get currency settings from localStorage
    const authData = JSON.parse(localStorage.getItem("authData"));
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

    // Days for schedule
    const days = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday'
    ];

    // Social media platforms
    const socialPlatforms = [
        { value: "facebook", label: "Facebook", iconClass: "fab fa-facebook" },
        { value: "instagram", label: "Instagram", iconClass: "fab fa-instagram" },
        { value: "twitter", label: "Twitter (X)", iconClass: "fab fa-twitter" },
        { value: "tiktok", label: "TikTok", iconClass: "fab fa-tiktok" },
        { value: "youtube", label: "YouTube", iconClass: "fab fa-youtube" },
        { value: "pinterest", label: "Pinterest", iconClass: "fab fa-pinterest" },
        { value: "snapchat", label: "Snapchat", iconClass: "fab fa-snapchat" },
        { value: "whatsapp", label: "WhatsApp", iconClass: "fab fa-whatsapp" },
        { value: "telegram", label: "Telegram", iconClass: "fab fa-telegram" },
        { value: "linkedin", label: "LinkedIn", iconClass: "fab fa-linkedin" },
        { value: "google", label: "Google Reviews", iconClass: "fab fa-google" }
    ];

    // Helper function to get icon class by platform value
    const getIconClassByPlatform = (platformValue) => {
        const platform = socialPlatforms.find(p => p.value === platformValue);
        return platform ? platform.iconClass : '';
    };

    const timezones = Intl.supportedValuesOf('timeZone').map(tz => ({
        value: tz,
        label: tz
    }));

    // Configure toast notifications
    const showToast = (message, type = 'success') => {
        const toastOptions = {
            position: "bottom-center",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        };

        if (type === 'success') {
            toast.success(message, toastOptions);
        } else if (type === 'error') {
            toast.error(message, toastOptions);
        } else if (type === 'warning') {
            toast.warning(message, toastOptions);
        } else {
            toast.info(message, toastOptions);
        }
    };

    // Initialize map with fixed marker in center
    const initMap = () => {
        if (!mapContainerRef.current) return;

        // Default coordinates (New York)
        const defaultLat = settings?.store?.storeLatitude || 40.7128;
        const defaultLng = settings?.store?.storeLongitude || -74.0060;

        // Initialize map
        mapRef.current = L.map(mapContainerRef.current, {
            zoomControl: false
        }).setView([defaultLat, defaultLng], 17);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ''
        }).addTo(mapRef.current);

        // Create black marker icon
        const blueMarkerIcon = L.icon({
            iconUrl: '/images/store_marker.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        // Add fixed marker in center
        markerRef.current = L.marker([defaultLat, defaultLng], {
            icon: blueMarkerIcon,
            draggable: false
        }).addTo(mapRef.current);

        // Update coordinates when map moves
        mapRef.current.on('moveend', () => {
            const center = mapRef.current.getCenter();
            const lat = center.lat;
            const lng = center.lng;

            // Update coordinates in state
            handleInputChange('store.storeLatitude', lat);
            handleInputChange('store.storeLongitude', lng);

            // Reverse geocode to get address
            reverseGeocode(lat, lng);
        });

        // Update marker position to always be at center
        mapRef.current.on('move', () => {
            const center = mapRef.current.getCenter();
            markerRef.current.setLatLng(center);
        });

        // Set initial selected location
        setSelectedLocation({
            lat: defaultLat,
            lng: defaultLng,
            address: settings?.store?.storeLocationAddress || 'New York, NY, USA'
        });

        setMapLoading(false);
    };

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by this browser', 'error');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Update map view to current location
                mapRef.current.setView([latitude, longitude], 15);

                // Update coordinates in state
                handleInputChange('store.storeLatitude', latitude);
                handleInputChange('store.storeLongitude', longitude);

                // Reverse geocode to get address
                reverseGeocode(latitude, longitude);

                setIsLocating(false);
                showToast('Location found successfully');
            },
            (error) => {
                setIsLocating(false);
                let errorMessage = 'Unable to get your location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }

                showToast(errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    // Reverse geocode coordinates to get address
    const reverseGeocode = async (lat, lng) => {
        try {
            setIsFetchingAddress(true);
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            if (data && data.display_name) {
                const address = data.display_name;
                setSelectedLocation({ lat, lng, address });
                handleInputChange('store.storeLocationAddress', address);
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            setSelectedLocation({ lat, lng, address: 'Address not found' });
        } finally {
            setIsFetchingAddress(false);
        }
    };

    // Fetch settings
    const fetchSettings = async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const data = await response.json();
            setSettings(data);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch alert bars
    const fetchAlertBars = async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                console.log("No authentication token found");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/alert-bars/all`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log('Failed to fetch alert bars');
                return;
            }

            const data = await response.json();

            // Handle different response structures
            if (data.data) {
                // If response has a data field (single alert bar or array)
                if (Array.isArray(data.data)) {
                    setAlertBars(data.data);
                } else {
                    setAlertBars([data.data]);
                }
            } else if (Array.isArray(data)) {
                // If response is directly an array
                setAlertBars(data);
            } else if (data && typeof data === 'object') {
                // If response is a single object
                setAlertBars([data]);
            } else {
                setAlertBars([]);
            }
        } catch (error) {
            console.log('Error fetching alert bars:', error.message);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchAlertBars();
    }, []);

    // Initialize map when settings are loaded
    useEffect(() => {
        if (settings && !mapRef.current) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                initMap();
            }, 100);
        }

        // Cleanup function to remove map when component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [settings]);

    // Handle store status toggle
    const handleStoreStatusToggle = async (isOpen) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/settings/store-status?isOpen=${isOpen}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to update store status');
            }

            setSettings(prev => ({
                ...prev,
                store: {
                    ...prev.store,
                    storeOpen: isOpen
                }
            }));
            showToast(`Store is now ${isOpen ? 'open' : 'closed'}`);
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // Handle logo upload
    const handleLogoUpload = async (file) => {
        try {
            // Check file size (max 200 KB)
            if (file.size > 200 * 1024) {
                showToast('Logo file size must be less than 200 KB', 'error');
                return;
            }

            setUploading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${BASE_URL}/api/settings/upload-logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload logo');
            }

            const data = await response.json();
            setSettings(prev => ({
                ...prev,
                header: {
                    ...prev.header,
                    logoUrl: data.url
                }
            }));
            showToast('Logo uploaded successfully');
            fetchSettings();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    // Handle banner upload with data
    const handleBannerUploadWithData = async (file, bannerData) => {
        try {
            // Check file size (max 500 KB)
            if (file.size > 500 * 1024) {
                showToast('Banner file size must be less than 500 KB', 'error');
                return;
            }

            setUploading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', bannerData.title);
            formData.append('subtitle', bannerData.subtitle);
            formData.append('buttonText', bannerData.buttonText);
            formData.append('buttonLink', bannerData.buttonLink);

            const response = await fetch(`${BASE_URL}/api/settings/upload-banner`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload banner');
            }

            const data = await response.json();
            setSettings(prev => ({
                ...prev,
                header: {
                    ...prev.header,
                    heroBanners: [...prev.header.heroBanners, {
                        imageUrl: data.url,
                        title: bannerData.title,
                        subtitle: bannerData.subtitle,
                        buttonText: bannerData.buttonText,
                        buttonLink: bannerData.buttonLink,
                        active: true,
                        displayOrder: prev.header.heroBanners.length
                    }]
                }
            }));
            showToast('Banner uploaded successfully');
            fetchSettings();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    // Handle create alert bar
    const handleCreateAlertBar = async (alertBarData) => {
        try {
            setUpdatingAlertBar(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/alert-bars`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...alertBarData,
                    active: alertBarData.active !== false
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create alert bar');
            }

            showToast('Alert bar created successfully');
            fetchAlertBars();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setUpdatingAlertBar(false);
            setShowAlertBarModal(false);
        }
    };

    // Handle delete alert bar
    const handleDeleteAlertBar = async (id) => {
        try {
            setUpdatingAlertBar(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/alert-bars`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                throw new Error('Failed to delete alert bar');
            }

            showToast('Alert bar deleted successfully');
            fetchAlertBars();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setUpdatingAlertBar(false);
        }
    };

    // Handle input changes
    const handleInputChange = (path, value) => {
        const keys = path.split('.');
        setSettings(prev => {
            const newSettings = { ...prev };
            let current = newSettings;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]] = { ...current[keys[i]] };
            }

            current[keys[keys.length - 1]] = value;
            return newSettings;
        });
    };

    // Handle array item changes
    const handleArrayItemChange = (path, index, field, value) => {
        const keys = path.split('.');
        setSettings(prev => {
            const newSettings = { ...prev };
            let current = newSettings;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]] = { ...current[keys[i]] };
            }

            const array = [...current[keys[keys.length - 1]]];
            array[index] = { ...array[index], [field]: value };
            current[keys[keys.length - 1]] = array;

            return newSettings;
        });
    };

    // Add new array item
    const addArrayItem = (path, template) => {
        const keys = path.split('.');
        setSettings(prev => {
            const newSettings = { ...prev };
            let current = newSettings;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]] = { ...current[keys[i]] };
            }

            current[keys[keys.length - 1]] = [...current[keys[keys.length - 1]], template];
            return newSettings;
        });
    };

    // Remove array item
    const removeArrayItem = (path, index) => {
        const keys = path.split('.');
        setSettings(prev => {
            const newSettings = { ...prev };
            let current = newSettings;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]] = { ...current[keys[i]] };
            }

            const array = [...current[keys[keys.length - 1]]];
            array.splice(index, 1);
            current[keys[keys.length - 1]] = array;

            return newSettings;
        });
    };

    // Handle section updates
    const handleSectionUpdate = async (section, setLoadingState) => {
        try {
            setLoadingState(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [section]: settings[section]
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update ${section} settings`);
            }

            showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} settings updated successfully`);
            fetchSettings();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoadingState(false);
        }
    };

    // Banner Upload Modal Component
    const BannerUploadModal = ({ show, onHide, onUpload }) => {
        const [file, setFile] = useState(null);
        const [bannerData, setBannerData] = useState({
            title: '',
            subtitle: '',
            buttonText: '',
            buttonLink: ''
        });
        const [fileError, setFileError] = useState('');

        const handleFileChange = (e) => {
            const selectedFile = e.target.files[0];
            if (selectedFile) {
                // Check file size (max 500 KB)
                if (selectedFile.size > 500 * 1024) {
                    setFileError('Banner file size must be less than 500 KB');
                    setFile(null);
                } else {
                    setFileError('');
                    setFile(selectedFile);
                }
            }
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setBannerData(prev => ({
                ...prev,
                [name]: value
            }));
        };

        const handleSubmit = () => {
            if (!file) {
                showToast('Please select an image file', 'error');
                return;
            }
            onUpload(file, bannerData);
            onHide();
        };

        return (
            <Modal show={show} onHide={onHide}>
                <Modal.Header closeButton>
                    <Modal.Title>Upload New Hero Banner</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Banner Image (Max 500 KB)</Form.Label>
                        <Form.Control
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                            isInvalid={!!fileError}
                        />
                        {fileError && (
                            <Form.Text className="text-danger">
                                {fileError}<br></br>
                            </Form.Text>
                        )}
                        <Form.Text className="text-muted">
                            Maximum file size: 500 KB
                        </Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                            type="text"
                            name="title"
                            value={bannerData.title}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Subtitle</Form.Label>
                        <Form.Control
                            type="text"
                            name="subtitle"
                            value={bannerData.subtitle}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Button Text</Form.Label>
                        <Form.Control
                            type="text"
                            name="buttonText"
                            value={bannerData.buttonText}
                            onChange={(e) => handleInputChange(e)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Button Link</Form.Label>
                        <Form.Control
                            type="text"
                            name="buttonLink"
                            value={bannerData.buttonLink}
                            onChange={handleInputChange}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleSubmit} disabled={!!fileError}>
                        Upload Banner
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    };

    // Alert Bar Modal Component
    const AlertBarModal = ({ show, onHide, onSubmit }) => {
        const [alertBarData, setAlertBarData] = useState({
            message: '',
            backgroundColor: '#FF0000',
            textColor: '#FFFFFF',
            startTime: '',
            endTime: '',
            dismissible: false,
            active: true
        });

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setAlertBarData(prev => ({
                ...prev,
                [name]: value
            }));
        };

        const handleCheckboxChange = (e) => {
            const { name, checked } = e.target;
            setAlertBarData(prev => ({
                ...prev,
                [name]: checked
            }));
        };

        const handleSubmit = () => {
            if (!alertBarData.message) {
                showToast('Please enter a message', 'error');
                return;
            }
            if (!alertBarData.startTime || !alertBarData.endTime) {
                showToast('Please set both start and end times', 'error');
                return;
            }
            onSubmit(alertBarData);
        };

        // Get current datetime in format for datetime-local input
        const getCurrentDateTime = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Calculate min datetime for end time (must be after start time)
        const getMinEndTime = () => {
            if (!alertBarData.startTime) return '';
            const start = new Date(alertBarData.startTime);
            start.setMinutes(start.getMinutes() + 1);
            return start.toISOString().slice(0, 16);
        };

        return (
            <Modal show={show} onHide={onHide}>
                <Modal.Header closeButton>
                    <Modal.Title>Create New Alert Bar</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Message</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="message"
                            value={alertBarData.message}
                            onChange={handleInputChange}
                            placeholder="Enter alert message"
                        />
                    </Form.Group>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Background Color</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="color"
                                        name="backgroundColor"
                                        value={alertBarData.backgroundColor}
                                        onChange={handleInputChange}
                                        style={{ height: '38px' }}
                                    />
                                    <Form.Control
                                        type="text"
                                        name="backgroundColor"
                                        value={alertBarData.backgroundColor}
                                        onChange={handleInputChange}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Text Color</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="color"
                                        name="textColor"
                                        value={alertBarData.textColor}
                                        onChange={handleInputChange}
                                        style={{ height: '38px' }}
                                    />
                                    <Form.Control
                                        type="text"
                                        name="textColor"
                                        value={alertBarData.textColor}
                                        onChange={handleInputChange}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Start Time</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    name="startTime"
                                    value={alertBarData.startTime}
                                    onChange={handleInputChange}
                                    min={getCurrentDateTime()}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>End Time</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    name="endTime"
                                    value={alertBarData.endTime}
                                    onChange={handleInputChange}
                                    min={getMinEndTime() || getCurrentDateTime()}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <div className="d-flex align-items-center">
                            <Switch
                                id="dismissible-switch"
                                name="dismissible"
                                checked={alertBarData.dismissible}
                                onChange={handleCheckboxChange}
                                color="primary"
                            />
                            <Form.Label className="ms-2 mb-0">Dismissible</Form.Label>
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <div className="d-flex align-items-center">
                            <Switch
                                id="active-switch"
                                name="active"
                                checked={alertBarData.active}
                                onChange={handleCheckboxChange}
                                color="primary"
                            />
                            <Form.Label className="ms-2 mb-0">Active</Form.Label>
                        </div>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleSubmit}>
                        Create Alert Bar
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    };

    // Custom file upload component using Bootstrap
    const FileUploadInput = ({ label, currentFile, onUpload, accept, multiple = false, loading }) => {
        const [fileError, setFileError] = useState('');

        const handleFileChange = (e) => {
            const selectedFile = e.target.files[0];
            if (selectedFile) {
                // Check file size based on label (logo vs banner)
                if (label.includes('Logo') && selectedFile.size > 200 * 1024) {
                    setFileError('Logo file size must be less than 200 KB');
                } else if (label.includes('Banner') && selectedFile.size > 500 * 1024) {
                    setFileError('Banner file size must be less than 500 KB');
                } else {
                    setFileError('');
                    if (multiple) {
                        onUpload(Array.from(e.target.files));
                    } else {
                        onUpload(selectedFile);
                    }
                }
            }
        };

        return (
            <Form.Group className="mb-3">
                <Form.Label>
                    {label}
                    {label.includes('Logo') && ' (Max 200 KB)'}
                    {label.includes('Banner') && ' (Max 500 KB)'}
                </Form.Label>
                {currentFile && (
                    <div className="mb-2">
                        <Image src={currentFile} thumbnail style={{ maxHeight: '100px' }} />
                    </div>
                )}
                <Form.Control
                    type="file"
                    onChange={handleFileChange}
                    accept={accept}
                    multiple={multiple}
                    disabled={loading}
                    isInvalid={!!fileError}
                />
                {fileError && (
                    <Form.Text className="text-danger">
                        {fileError}
                    </Form.Text>
                )}
                {loading && <Spinner animation="border" size="sm" className="mt-2" />}
            </Form.Group>
        );
    };

    // Custom toggle switch component using Material-UI Switch
    const ToggleSwitch = ({ label, checked, onChange }) => {
        return (
            <Form.Group className="mb-3">
                <div className="d-flex align-items-center">
                    <Switch
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        color="primary"
                    />
                    <Form.Label className="ms-2 mb-0">{label}</Form.Label>
                </div>
            </Form.Group>
        );
    };

    // Custom color picker component using Bootstrap
    const ColorPicker = ({ label, color, onChange }) => {
        return (
            <Form.Group className="mb-3">
                <Form.Label>{label}</Form.Label>
                <InputGroup>
                    <Form.Control
                        type="color"
                        value={color}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ height: '38px' }}
                    />
                    <Form.Control
                        type="text"
                        value={color}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </InputGroup>
            </Form.Group>
        );
    };

    // Custom time picker component using Bootstrap
    const TimePicker = ({ label, value, onChange, disabled }) => {
        return (
            <Form.Group className="mb-3">
                <Form.Label>{label}</Form.Label>
                <Form.Control
                    type="time"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                />
            </Form.Group>
        );
    };

    // Custom select dropdown component using Bootstrap
    const SelectDropdown = ({ label, options, value, onChange }) => {
        return (
            <Form.Group className="mb-3">
                <Form.Label>{label}</Form.Label>
                <Form.Select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>
        );
    };

    if (loading) {
        return (
            <div className="content-area setting-form">
                <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
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
                />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="content-area setting-form">
                <div className="text-center py-5">
                    <p>Failed to load settings</p>
                </div>
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
                />
            </div>
        );
    }

    return (
        <div className="content-area setting-form">
            <PerfectScrollbar>
                <div className="content-area-body">
                    {/* Alert Bar Settings */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Alert Bar Settings</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setShowAlertBarModal(true)}
                            >
                                Add New Alert Bar
                            </Button>
                        </Card.Header>

                        <Card.Body>
                            {alertBars.length === 0 ? (
                                <p className="text-muted small mb-0">No alert bars configured</p>
                            ) : (
                                <div className="alert-bars-list">
                                    {alertBars.map((alert) => (
                                        <Card key={alert.id} className="mb-3">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div className="small">
                                                        <p className="mb-1 text-dark">
                                                            <strong>Message: {alert.message}</strong>
                                                        </p>
                                                        <p className="mb-1 text-dark">
                                                            <strong>Status:</strong>
                                                            <Badge
                                                                bg={alert.active ? "success" : "secondary"}
                                                                className="ms-1"
                                                            >
                                                                {alert.active ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </p>
                                                        <p className="mb-1 text-dark">
                                                            <strong>Active Period:</strong>{" "}
                                                            {new Date(alert.startTime).toLocaleString()} -{" "}
                                                            {new Date(alert.endTime).toLocaleString()}
                                                        </p>
                                                        <p className="mb-1 text-dark">
                                                            <strong>Colors:</strong>
                                                            <span
                                                                className="d-inline-block ms-2"
                                                                style={{
                                                                    width: "12px",
                                                                    height: "12px",
                                                                    backgroundColor: alert.backgroundColor,
                                                                    border: "1px solid #ddd",
                                                                }}
                                                            ></span>
                                                            <span
                                                                className="d-inline-block ms-2"
                                                                style={{
                                                                    width: "12px",
                                                                    height: "12px",
                                                                    backgroundColor: alert.textColor,
                                                                    border: "1px solid #ddd",
                                                                }}
                                                            ></span>
                                                        </p>
                                                        <p className="mb-0 text-dark">
                                                            <strong>Dismissible:</strong>{" "}
                                                            {alert.dismissible ? "Yes" : "No"}
                                                        </p>
                                                    </div>

                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteAlertBar(alert.id)}
                                                        disabled={updatingAlertBar}
                                                    >
                                                        {updatingAlertBar ? (
                                                            <Spinner animation="border" size="sm" />
                                                        ) : (
                                                            "Delete"
                                                        )}
                                                    </Button>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    <AlertBarModal
                        show={showAlertBarModal}
                        onHide={() => setShowAlertBarModal(false)}
                        onSubmit={handleCreateAlertBar}
                    />

                    {/* Header Settings */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>Header Settings</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSectionUpdate('header', setUpdatingHeader)}
                                disabled={updatingHeader}
                            >
                                {updatingHeader ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : 'Update Header'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <FileUploadInput
                                        label="Store Logo"
                                        currentFile={settings.header.logoUrl}
                                        onUpload={handleLogoUpload}
                                        accept="image/*"
                                        loading={uploading}
                                    />
                                </Col>
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Show Search Bar"
                                        checked={settings.header.showSearchBar}
                                        onChange={(checked) => handleInputChange('header.showSearchBar', checked)}
                                    />
                                    <ToggleSwitch
                                        label="Show Cart Icon"
                                        checked={settings.header.showCartIcon}
                                        onChange={(checked) => handleInputChange('header.showCartIcon', checked)}
                                    />
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Label>Primary Color</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type="color"
                                            name="header.primaryColor"
                                            value={settings.header.primaryColor}
                                            onChange={(e) => handleInputChange('header.primaryColor', e.target.value)}
                                            style={{ height: '38px' }}
                                        />
                                        <Form.Control
                                            type="text"
                                            name="header.primaryColor"
                                            value={settings.header.primaryColor}
                                            onChange={(e) => handleInputChange('header.primaryColor', e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>

                                <Col md={6}>
                                    <Form.Label>Secondary Color</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type="color"
                                            name="header.secondaryColor"
                                            value={settings.header.secondaryColor}
                                            onChange={(e) => handleInputChange('header.secondaryColor', e.target.value)}
                                            style={{ height: '38px' }}
                                        />
                                        <Form.Control
                                            type="text"
                                            name="header.secondaryColor"
                                            value={settings.header.secondaryColor}
                                            onChange={(e) => handleInputChange('header.secondaryColor', e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                            </Row>


                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6>Hero Banners</h6>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => setShowBannerModal(true)}
                                    >
                                        Add New Banner
                                    </Button>
                                </div>

                                <BannerUploadModal
                                    show={showBannerModal}
                                    onHide={() => setShowBannerModal(false)}
                                    onUpload={handleBannerUploadWithData}
                                />

                                {settings.header.heroBanners.map((banner, index) => (
                                    <Card key={index} className="mb-3">
                                        <Card.Body>
                                            <Row>
                                                <Col md={4}>
                                                    <Image
                                                        src={banner.imageUrl}
                                                        alt={`Banner ${index + 1}`}
                                                        fluid
                                                        rounded
                                                        className="mb-3"
                                                    />
                                                </Col>
                                                <Col md={8}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Title</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={banner.title}
                                                            onChange={(e) => handleArrayItemChange('header.heroBanners', index, 'title', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Subtitle</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={banner.subtitle}
                                                            onChange={(e) => handleArrayItemChange('header.heroBanners', index, 'subtitle', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Button Text</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={banner.buttonText}
                                                            onChange={(e) => handleArrayItemChange('header.heroBanners', index, 'buttonText', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Button Link</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={banner.buttonLink}
                                                            onChange={(e) => handleArrayItemChange('header.heroBanners', index, 'buttonLink', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                                        <ToggleSwitch
                                                            label="Active"
                                                            checked={banner.active}
                                                            onChange={(checked) => handleArrayItemChange('header.heroBanners', index, 'active', checked)}
                                                        />
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => removeArrayItem('header.heroBanners', index)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Footer Settings */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>Footer Settings</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSectionUpdate('footer', setUpdatingFooter)}
                                disabled={updatingFooter}
                            >
                                {updatingFooter ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : 'Update Footer'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            value={settings.footer.email}
                                            onChange={(e) => handleInputChange('footer.email', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Phone</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.footer.phone}
                                            onChange={(e) => handleInputChange('footer.phone', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Address</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={settings.footer.address}
                                            onChange={(e) => handleInputChange('footer.address', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Working Hours</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.footer.workingHours}
                                            onChange={(e) => handleInputChange('footer.workingHours', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div className="mb-4">
                                <h6>Social Links</h6>
                                {settings.footer.socialLinks.map((link, index) => (
                                    <Card key={index} className="mb-3">
                                        <Card.Body>
                                            <Row>
                                                <Col md={4}>
                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <Form.Label>Platform</Form.Label>
                                                        <select
                                                            value={link.platform}
                                                            onChange={(e) => {
                                                                handleArrayItemChange('footer.socialLinks', index, 'platform', e.target.value);
                                                                handleArrayItemChange('footer.socialLinks', index, 'iconClass', getIconClassByPlatform(e.target.value));
                                                            }}
                                                            style={{
                                                                color: '#0092ff',
                                                                border: '1px solid #0092ff',
                                                                borderRadius: '6px',
                                                                backgroundColor: 'rgba(0, 146, 255, 0.05)',
                                                                cursor: 'pointer',
                                                                padding: '0.625rem 1rem',
                                                                paddingRight: '2.5rem',
                                                                fontSize: '0.9rem',
                                                                lineHeight: '1.5',
                                                                minHeight: '2.875rem',
                                                                width: '100%',
                                                                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                                                backgroundRepeat: 'no-repeat',
                                                                backgroundPosition: 'right 1rem center',
                                                                backgroundSize: '16px 12px',
                                                                appearance: 'none',
                                                                transition: 'all 0.2s ease-in-out',
                                                                ':hover': {
                                                                    borderColor: '#007acc',
                                                                    backgroundColor: 'rgba(0, 146, 255, 0.08)'
                                                                },
                                                                ':focus': {
                                                                    borderColor: '#0092ff',
                                                                    boxShadow: '0 0 0 0.25rem rgba(0, 146, 255, 0.2)',
                                                                    outline: 'none',
                                                                    backgroundColor: 'rgba(0, 146, 255, 0.05)'
                                                                }
                                                            }}
                                                        >
                                                            {socialPlatforms.map((platform) => (
                                                                <option
                                                                    key={platform.value}
                                                                    value={platform.value}
                                                                    style={{
                                                                        color: '#000000ff',
                                                                        backgroundColor: '#fff',
                                                                        fontSize: '0.9rem',
                                                                        padding: '0.5rem 1rem'
                                                                    }}
                                                                >
                                                                    {platform.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>URL</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={link.url}
                                                            onChange={(e) => handleArrayItemChange('footer.socialLinks', index, 'url', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2} className="d-flex align-items-end">
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        className="w-100"
                                                        onClick={() => removeArrayItem('footer.socialLinks', index)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                ))}
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        const selectedPlatform = socialPlatforms[0]; // Default to first platform
                                        addArrayItem('footer.socialLinks', {
                                            platform: selectedPlatform.value,
                                            url: '',
                                            iconClass: selectedPlatform.iconClass
                                        });
                                    }}
                                >
                                    Add Social Link
                                </Button>
                            </div>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Show Newsletter Signup"
                                        checked={settings.footer.showNewsletterSignup}
                                        onChange={(checked) => handleInputChange('footer.showNewsletterSignup', checked)}
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Copyright Text</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.footer.copyrightText}
                                            onChange={(e) => handleInputChange('footer.copyrightText', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Store Settings */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>Store Settings</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSectionUpdate('store', setUpdatingStore)}
                                disabled={updatingStore}
                            >
                                {updatingStore ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : 'Update Store'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Store Open"
                                        checked={settings.store.storeOpen}
                                        onChange={handleStoreStatusToggle}
                                    />
                                </Col>
                                <Col md={6}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{
                                            color: '#0092ff',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            marginBottom: '0.5rem',
                                            display: 'block'
                                        }}>
                                            Timezone
                                        </label>
                                        <select
                                            value={settings.store.timezone}
                                            onChange={(e) => handleInputChange('store.timezone', e.target.value)}
                                            style={{
                                                color: '#0092ff',
                                                border: '1px solid #0092ff',
                                                borderRadius: '6px',
                                                backgroundColor: 'rgba(0, 146, 255, 0.05)',
                                                cursor: 'pointer',
                                                padding: '0.75rem 1rem',
                                                paddingRight: '2.5rem',
                                                fontSize: '0.9rem',
                                                lineHeight: '1.5',
                                                minHeight: '3rem',
                                                width: '100%',
                                                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 1rem center',
                                                backgroundSize: '16px 12px',
                                                appearance: 'none',
                                                transition: 'all 0.2s ease-in-out',
                                                ':hover': {
                                                    borderColor: '#007acc',
                                                    backgroundColor: 'rgba(0, 146, 255, 0.08)'
                                                },
                                                ':focus': {
                                                    borderColor: '#0092ff',
                                                    boxShadow: '0 0 0 0.25rem rgba(0, 146, 255, 0.2)',
                                                    outline: 'none',
                                                    backgroundColor: 'rgba(0, 146, 255, 0.05)'
                                                }
                                            }}
                                        >
                                            {timezones.map((timezone) => (
                                                <option
                                                    key={timezone.value}
                                                    value={timezone.value}
                                                    style={{
                                                        color: '#000000ff',
                                                        backgroundColor: '#fff',
                                                        fontSize: '0.9rem',
                                                        padding: '0.5rem 1rem'
                                                    }}
                                                >
                                                    {timezone.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Store Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.store.storeName}
                                            onChange={(e) => handleInputChange('store.storeName', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Store Description</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={settings.store.storeDescription}
                                            onChange={(e) => handleInputChange('store.storeDescription', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Allow Pickup"
                                        checked={settings.store.allowPickup}
                                        onChange={(checked) => handleInputChange('store.allowPickup', checked)}
                                    />
                                </Col>
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Allow Delivery"
                                        checked={settings.store.allowDelivery}
                                        onChange={(checked) => handleInputChange('store.allowDelivery', checked)}
                                    />
                                </Col>
                            </Row>

                            {/* New Location Fields */}
                            <Row className="mb-4">
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Store Location Address</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.store.storeLocationAddress}
                                            onChange={(e) => handleInputChange('store.storeLocationAddress', e.target.value)}
                                            placeholder="Enter store address"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Map Component */}
                            <Row className="mb-4">
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Form.Label>Store Location Map</Form.Label>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={getCurrentLocation}
                                                disabled={isLocating}
                                            >
                                                {isLocating ? (
                                                    <>
                                                        <Spinner animation="border" size="sm" className="me-2" />
                                                        Locating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-location-arrow me-2"></i>
                                                        Use My Location
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div
                                            ref={mapContainerRef}
                                            style={{ height: '400px', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
                                        >
                                            {mapLoading && (
                                                <div className="d-flex justify-content-center align-items-center h-100 w-100 bg-light bg-opacity-75">
                                                    <div className="spinner-border text-dark" role="status">
                                                        <span className="visually-hidden">Loading map...</span>
                                                    </div>
                                                    <span className="ms-2">Loading map...</span>
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            Drag the map to set your store location. The marker will always stay in the center.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6>Store Schedules</h6>
                                    {settings.store.schedules.length < 7 && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => addArrayItem('store.schedules', {
                                                day: 'Monday',
                                                openingTime: '09:00',
                                                closingTime: '17:00',
                                                open: true
                                            })}
                                        >
                                            Add Schedule
                                        </Button>
                                    )}
                                </div>

                                {settings.store.schedules.map((schedule, index) => {
                                    // Get available days (filter out already selected days except the current one)
                                    const availableDays = days.filter(day =>
                                        day === schedule.day || !settings.store.schedules.some((s, i) => i !== index && s.day === day)
                                    );

                                    return (
                                        <Card key={index} className="mb-3">
                                            <Card.Body>
                                                <Row>
                                                    <Col md={3}>
                                                        <div style={{ marginBottom: '1rem', width: '100%' }}>
                                                            <label style={{
                                                                color: '#0092ff',
                                                                fontWeight: '600',
                                                                fontSize: '0.9rem',
                                                                marginBottom: '0.5rem',
                                                                display: 'block'
                                                            }}>
                                                                Day
                                                            </label>
                                                            <select
                                                                value={schedule.day}
                                                                onChange={(e) => handleArrayItemChange('store.schedules', index, 'day', e.target.value)}
                                                                style={{
                                                                    color: '#0092ff',
                                                                    border: '1px solid #0092ff',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: 'rgba(0, 146, 255, 0.05)',
                                                                    cursor: 'pointer',
                                                                    padding: '0.625rem 1rem',
                                                                    paddingRight: '2.5rem',
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: '1.5',
                                                                    minHeight: '2.875rem',
                                                                    width: '100%',
                                                                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")',
                                                                    backgroundRepeat: 'no-repeat',
                                                                    backgroundPosition: 'right 1rem center',
                                                                    backgroundSize: '16px 12px',
                                                                    appearance: 'none',
                                                                    transition: 'all 0.2s ease-in-out',
                                                                    ':hover': {
                                                                        borderColor: '#007acc',
                                                                        backgroundColor: 'rgba(0, 146, 255, 0.08)'
                                                                    },
                                                                    ':focus': {
                                                                        borderColor: '#0092ff',
                                                                        boxShadow: '0 0 0 0.25rem rgba(0, 146, 255, 0.2)',
                                                                        outline: 'none',
                                                                        backgroundColor: 'rgba(0, 146, 255, 0.05)'
                                                                    }
                                                                }}
                                                            >
                                                                {availableDays.map(day => (
                                                                    <option
                                                                        key={day}
                                                                        value={day}
                                                                        style={{
                                                                            color: '#000000ff',
                                                                            backgroundColor: '#fff',
                                                                            fontSize: '0.9rem',
                                                                            padding: '0.5rem 1rem'
                                                                        }}
                                                                    >
                                                                        {day}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </Col>
                                                    <Col md={3}>
                                                        <TimePicker
                                                            label="Opening Time"
                                                            value={schedule.openingTime}
                                                            onChange={(value) => handleArrayItemChange('store.schedules', index, 'openingTime', value)}
                                                            disabled={!schedule.open}
                                                        />
                                                    </Col>
                                                    <Col md={3}>
                                                        <TimePicker
                                                            label="Closing Time"
                                                            value={schedule.closingTime}
                                                            onChange={(value) => handleArrayItemChange('store.schedules', index, 'closingTime', value)}
                                                            disabled={!schedule.open}
                                                        />
                                                    </Col>
                                                    <Col md={3} className="d-flex align-items-end">
                                                        <div className="d-flex align-items-center justify-content-between w-100">
                                                            <ToggleSwitch
                                                                label="Open"
                                                                checked={schedule.open}
                                                                onChange={(checked) => handleArrayItemChange('store.schedules', index, 'open', checked)}
                                                            />
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => removeArrayItem('store.schedules', index)}
                                                                className="ms-2"
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>
                                    );
                                })}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Policies */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>Policies</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSectionUpdate('policies', setUpdatingPolicies)}
                                disabled={updatingPolicies}
                            >
                                {updatingPolicies ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : 'Update Policies'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Form.Group className="mb-4">
                                <Form.Label>Refund Policy</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={settings.policies.refundPolicy}
                                    onChange={(e) => handleInputChange('policies.refundPolicy', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label>Privacy Policy</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={settings.policies.privacyPolicy}
                                    onChange={(e) => handleInputChange('policies.privacyPolicy', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label>Terms and Conditions</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={settings.policies.termsAndConditions}
                                    onChange={(e) => handleInputChange('policies.termsAndConditions', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label>Shipping Policy</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={settings.policies.shippingPolicy}
                                    onChange={(e) => handleInputChange('policies.shippingPolicy', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label>Return Policy</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={settings.policies.returnPolicy}
                                    onChange={(e) => handleInputChange('policies.returnPolicy', e.target.value)}
                                />
                            </Form.Group>
                        </Card.Body>
                    </Card>

                    {/* Delivery Settings */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>Delivery Settings</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSectionUpdate('delivery', setUpdatingDelivery)}
                                disabled={updatingDelivery}
                            >
                                {updatingDelivery ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : 'Update Delivery'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Minimum Order Amount</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text>{currencySymbol}</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                value={settings.delivery.minimumOrderAmount}
                                                onChange={(e) => handleInputChange('delivery.minimumOrderAmount', parseFloat(e.target.value))}
                                            />
                                        </InputGroup>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Delivery Fee</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text>{currencySymbol}</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                value={settings.delivery.deliveryFee}
                                                onChange={(e) => handleInputChange('delivery.deliveryFee', parseFloat(e.target.value))}
                                            />
                                        </InputGroup>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Delivery Time Estimate</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.delivery.deliveryTimeEstimate}
                                            onChange={(e) => handleInputChange('delivery.deliveryTimeEstimate', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Free Delivery Above Amount"
                                        checked={settings.delivery.freeDeliveryAboveAmount}
                                        onChange={(checked) => handleInputChange('delivery.freeDeliveryAboveAmount', checked)}
                                    />
                                    {settings.delivery.freeDeliveryAboveAmount && (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Free Delivery Threshold</Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text>{currencySymbol}</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    value={settings.delivery.freeDeliveryThreshold}
                                                    onChange={(e) => handleInputChange('delivery.freeDeliveryThreshold', parseFloat(e.target.value))}
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                    )}
                                </Col>
                            </Row>

                            <div className="mb-4">
                                <h6>Delivery Areas</h6>
                                {settings.delivery.deliveryAreas.map((area, index) => (
                                    <Card key={index} className="mb-3">
                                        <Card.Body>
                                            <Row>
                                                <Col md={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Name</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={area.name}
                                                            onChange={(e) => handleArrayItemChange('delivery.deliveryAreas', index, 'name', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Zip Code</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={area.zipCode}
                                                            onChange={(e) => handleArrayItemChange('delivery.deliveryAreas', index, 'zipCode', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Delivery Fee</Form.Label>
                                                        <InputGroup>
                                                            <InputGroup.Text>{currencySymbol}</InputGroup.Text>
                                                            <Form.Control
                                                                type="number"
                                                                value={area.deliveryFee}
                                                                onChange={(e) => handleArrayItemChange('delivery.deliveryAreas', index, 'deliveryFee', parseFloat(e.target.value))}
                                                            />
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Delivery Time</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={area.deliveryTime}
                                                            onChange={(e) => handleArrayItemChange('delivery.deliveryAreas', index, 'deliveryTime', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2} className="d-flex align-items-end">
                                                    <ToggleSwitch
                                                        label="Active"
                                                        checked={area.active}
                                                        onChange={(checked) => handleArrayItemChange('delivery.deliveryAreas', index, 'active', checked)}
                                                    />
                                                </Col>
                                            </Row>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => removeArrayItem('delivery.deliveryAreas', index)}
                                            >
                                                Remove Area
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                ))}
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => addArrayItem('delivery.deliveryAreas', {
                                        name: '',
                                        zipCode: '',
                                        deliveryFee: 0,
                                        deliveryTime: '',
                                        active: true
                                    })}
                                >
                                    Add Delivery Area
                                </Button>
                            </div>

                            <div className="mb-4">
                                <h6>Pickup Locations</h6>
                                {settings.delivery.pickupLocations.map((location, index) => (
                                    <Card key={index} className="mb-3">
                                        <Card.Body>
                                            <Row>
                                                <Col md={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Name</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={location.name}
                                                            onChange={(e) => handleArrayItemChange('delivery.pickupLocations', index, 'name', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Address</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={location.address}
                                                            onChange={(e) => handleArrayItemChange('delivery.pickupLocations', index, 'address', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Contact Number</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={location.contactNumber}
                                                            onChange={(e) => handleArrayItemChange('delivery.pickupLocations', index, 'contactNumber', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Instructions</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={location.instructions}
                                                            onChange={(e) => handleArrayItemChange('delivery.pickupLocations', index, 'instructions', e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={1} className="d-flex align-items-end">
                                                    <ToggleSwitch
                                                        label="Active"
                                                        checked={location.active}
                                                        onChange={(checked) => handleArrayItemChange('delivery.pickupLocations', index, 'active', checked)}
                                                    />
                                                </Col>
                                            </Row>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => removeArrayItem('delivery.pickupLocations', index)}
                                            >
                                                Remove Location
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                ))}
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => addArrayItem('delivery.pickupLocations', {
                                        name: '',
                                        address: '',
                                        contactNumber: '',
                                        instructions: '',
                                        active: true
                                    })}
                                >
                                    Add Pickup Location
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* App Settings */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>App Settings</h6>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSectionUpdate('appSettings', setUpdatingApp)}
                                disabled={updatingApp}
                            >
                                {updatingApp ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : 'Update App'}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Maintenance Mode"
                                        checked={settings.appSettings.maintenanceMode}
                                        onChange={(checked) => handleInputChange('appSettings.maintenanceMode', checked)}
                                    />
                                </Col>
                                <Col md={6}>
                                    <ToggleSwitch
                                        label="Force Update"
                                        checked={settings.appSettings.forceUpdate}
                                        onChange={(checked) => handleInputChange('appSettings.forceUpdate', checked)}
                                    />
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>App Version</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.appSettings.appVersion}
                                            onChange={(e) => handleInputChange('appSettings.appVersion', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Minimum App Version</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.appSettings.minimumAppVersion}
                                            onChange={(e) => handleInputChange('appSettings.minimumAppVersion', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Android App Link</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.appSettings.androidAppLink}
                                            onChange={(e) => handleInputChange('appSettings.androidAppLink', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>iOS App Link</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={settings.appSettings.iosAppLink}
                                            onChange={(e) => handleInputChange('appSettings.iosAppLink', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>App Message</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={settings.appSettings.appMessage}
                                            onChange={(e) => handleInputChange('appSettings.appMessage', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </div>
                <Footer />
            </PerfectScrollbar>
            <ToastContainer
                position="bottom-center"
                autoClose={2000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
        </div>
    );
};

export default StoreSettingsForm;