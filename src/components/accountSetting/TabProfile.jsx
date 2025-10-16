import { useState, useEffect, useRef } from 'react';
import { FiCamera } from 'react-icons/fi';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BASE_URL } from '/src/constants.js';

const TabProfile = () => {
    // Get all IANA timezones
    const timezones = Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz }));
    
    // State for form data
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactNumber: '',
        country: '',
        state: '',
        city: '',
        timezone: '',
        businessDetails: {
            businessName: ''
        },
        profilePicture: ''
    });

    // State for UI
    const [updating, setUpdating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState('/images/avatar/undefined-profile.png');
    const [imageSizeError, setImageSizeError] = useState('');
    const fileInputRef = useRef(null);

    // Get auth data from localStorage
    const authData = JSON.parse(localStorage.getItem('authData')) || {};
    const { role = '', permissions = [] } = authData;

    // Check permissions
    const canUpdateProfile = role === 'PATRON' || permissions.includes('PROFILE_UPDATE');
    const canUploadProfilePicture = role === 'PATRON' ||
        (permissions.includes('PROFILE_PICTURE_UPLOAD') &&
        permissions.includes('PROFILE_PICTURE_UPDATE'));

    // Fetch profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!authData?.token) {
                    toast.error('Authentication token not found');
                    return;
                }

                // Set form data from localStorage first for faster rendering
                setFormData({
                    name: authData.name || '',
                    address: authData.address || '',
                    contactNumber: authData.contactNumber || '',
                    country: authData.country || '',
                    state: authData.state || '',
                    city: authData.city || '',
                    timezone: authData.timezone || '',
                    businessDetails: {
                        businessName: authData.businessDetails?.businessName || ''
                    },
                    profilePicture: authData.profilePicture || ''
                });

                // Check if we have a cached profile picture in localStorage
                const cachedProfilePicture = localStorage.getItem('profilePicture');
                if (cachedProfilePicture) {
                    setProfilePictureUrl(cachedProfilePicture);
                } else if (authData.profilePicture) {
                    setProfilePictureUrl(authData.profilePicture);
                }

                // Then fetch fresh profile picture from API if allowed
                if (canUploadProfilePicture) {
                    try {
                        const pictureResponse = await axios.get(`${BASE_URL}/api/client-admin/profile/picture`, {
                            headers: {
                                Authorization: `Bearer ${authData.token}`
                            }
                        });

                        if (pictureResponse.data?.data) {
                            setProfilePictureUrl(pictureResponse.data.data);
                            // Store in localStorage for future use
                            localStorage.setItem('profilePicture', pictureResponse.data.data);
                        }
                    } catch (pictureError) {
                        console.warn('Failed to fetch profile picture from API, using cached data');
                        if (cachedProfilePicture) {
                            setProfilePictureUrl(cachedProfilePicture);
                        } else if (authData.profilePicture) {
                            setProfilePictureUrl(authData.profilePicture);
                        }
                    }
                }

                // Optionally fetch fresh profile data in background if allowed
                if (canUpdateProfile) {
                    try {
                        const profileResponse = await axios.get(`${BASE_URL}/api/client-admin/profile`, {
                            headers: {
                                Authorization: `Bearer ${authData.token}`
                            }
                        });

                        const profileData = profileResponse.data || {};
                        setFormData({
                            name: profileData.name || authData.name || '',
                            address: profileData.address || authData.address || '',
                            contactNumber: profileData.contactNumber || authData.contactNumber || '',
                            country: profileData.country || authData.country || '',
                            state: profileData.state || authData.state || '',
                            city: profileData.city || authData.city || '',
                            timezone: profileData.timezone || authData.timezone || '',
                            businessDetails: {
                                businessName: profileData.businessDetails?.businessName || authData.businessDetails?.businessName || ''
                            },
                            profilePicture: profileData.profilePicture || authData.profilePicture || ''
                        });

                        // Update localStorage with fresh data
                        localStorage.setItem('authData', JSON.stringify({
                            ...authData,
                            ...profileData
                        }));
                    } catch (profileError) {
                        console.warn('Failed to fetch fresh profile data, using localStorage data');
                    }
                }

            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Failed to load profile data');
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('businessDetails.')) {
            const fieldName = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                businessDetails: {
                    ...prev.businessDetails,
                    [fieldName]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleFileChange = (e) => {
        if (!canUploadProfilePicture) return;

        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.match('image.*')) {
                toast.error('Please select an image file (png, jpg, jpeg)');
                return;
            }

            // Validate file size (200KB limit)
            if (file.size > 200 * 1024) {
                setImageSizeError('File size should be less than 200KB');
                setProfilePicture(null);
                setProfilePictureUrl(formData.profilePicture || '/images/avatar/undefined-profile.png');
                return;
            }

            setImageSizeError('');
            setProfilePicture(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePictureUrl(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfilePicture = async () => {
        if (!profilePicture || !canUploadProfilePicture) return null;

        try {
            const authData = JSON.parse(localStorage.getItem('authData'));
            if (!authData?.token) {
                toast.error('Authentication token not found');
                return null;
            }

            const formData = new FormData();
            formData.append('file', profilePicture);

            const config = {
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            };

            // Determine if we're creating (POST) or updating (PUT)
            const url = `${BASE_URL}/api/client-admin/profile/picture`;
            const method = formData.profilePicture ? 'put' : 'post';

            const response = await axios[method](url, formData, config);

            // Store the new profile picture URL in localStorage
            if (response.data.url) {
                localStorage.setItem('profilePicture', response.data.url);
            }

            return response.data.url;

        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile picture');
            console.error('Error:', error);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!canUpdateProfile) return;

        // Check if there's an image size error
        if (profilePicture && profilePicture.size > 200 * 1024) {
            setImageSizeError('File size should be less than 200KB');
            setShowConfirmModal(false);
            return;
        }

        setUpdating(true);
        setShowConfirmModal(false);

        try {
            const authData = JSON.parse(localStorage.getItem('authData'));
            if (!authData?.token) {
                toast.error('Authentication token not found');
                return;
            }

            // First upload profile picture if changed and allowed
            let newPictureUrl = null;
            if (profilePicture && canUploadProfilePicture) {
                newPictureUrl = await uploadProfilePicture();
                if (newPictureUrl) {
                    setFormData(prev => ({
                        ...prev,
                        profilePicture: newPictureUrl
                    }));
                }
            }

            // Prepare the data to send
            const dataToSend = {
                ...formData,
                profilePicture: newPictureUrl || formData.profilePicture
            };

            // Update the profile via API if allowed
            if (canUpdateProfile) {
                await axios.put(
                    `${BASE_URL}/api/client-admin/profile`,
                    dataToSend,
                    {
                        headers: {
                            Authorization: `Bearer ${authData.token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                // Update localStorage
                const updatedAuthData = {
                    ...authData,
                    ...dataToSend
                };
                localStorage.setItem('authData', JSON.stringify(updatedAuthData));

                // Reset the profile picture state if upload was successful
                if (newPictureUrl) {
                    setProfilePicture(null);
                    setProfilePictureUrl(newPictureUrl);
                    setImageSizeError('');
                }

                toast.success('Profile updated successfully');

                // Reload the page after a short delay to show the success message
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
            console.error('Error:', error);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="tab-pane fade show active" id="profileTab" role="tabpanel">
            <div className="card-body personal-info">
                {canUpdateProfile ? (
                    <Form onSubmit={(e) => { 
                        e.preventDefault(); 
                        // Check for image size error before showing confirmation modal
                        if (profilePicture && profilePicture.size > 200 * 1024) {
                            setImageSizeError('File size should be less than 200KB');
                            return;
                        }
                        setShowConfirmModal(true); 
                    }}>
                        <div className="mb-4 d-flex align-items-center justify-content-between">
                            <h5 className="fw-bold mb-0 me-4">
                                <span className="d-block mb-2">Business Information:</span>
                            </h5>
                        </div>

                        {/* Avatar Section with Upload Button - Only show if allowed */}
                        {canUploadProfilePicture && (
                            <Form.Group className="row mb-4 align-items-center">
                                <Form.Label column lg={4} className="fw-semibold">Logo:</Form.Label>
                                <div className="col-lg-8">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="position-relative">
                                            <img
                                                src={profilePictureUrl}
                                                className="rounded"
                                                style={{
                                                    width: '100px',
                                                    height: '100px',
                                                    objectFit: 'cover',
                                                    cursor: 'pointer'
                                                }}
                                                alt="Profile"
                                                onClick={() => fileInputRef.current.click()}
                                                onError={(e) => {
                                                    e.target.src = '/images/avatar/1.png'; // Fallback if image fails to load
                                                }}
                                            />
                                            <div
                                                className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                                                style={{
                                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                                    opacity: 0,
                                                    transition: 'opacity 0.3s',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                                                onClick={() => fileInputRef.current.click()}
                                            >
                                                <FiCamera className="text-white" size={24} />
                                            </div>
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            hidden
                                        />

                                        <div className="text-muted ms-3" style={{ fontSize: '0.75rem' }}>
                                            <div>• Logo size 150x150</div>
                                            <div>• Max upload size 200 KB</div>
                                            <div>• Allowed: PNG, JPG, JPEG</div>
                                        </div>
                                    </div>
                                    {imageSizeError && (
                                        <div className="text-danger small mt-2">{imageSizeError}</div>
                                    )}
                                </div>
                            </Form.Group>
                        )}

                        {/* Name */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">Business Name:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* Address */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">Address:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    as="textarea"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter your address"
                                    required
                                    rows={3}
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* Contact Number */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">Contact Number:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    type="tel"
                                    name="contactNumber"
                                    value={formData.contactNumber}
                                    onChange={handleChange}
                                    placeholder="Enter contact number"
                                    required
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* Country */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">Country:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    placeholder="Enter country"
                                    required
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* State */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">State/Province:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    placeholder="Enter state/province"
                                    required
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* City */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">City:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="Enter city"
                                    required
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* Timezone */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">Timezone:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Select
                                    name="timezone"
                                    value={formData.timezone}
                                    onChange={handleChange}
                                    required
                                    disabled={!canUpdateProfile}
                                >
                                    <option value="">Select Timezone</option>
                                    {timezones.map((tz) => (
                                        <option key={tz.value} value={tz.value}>
                                            {tz.label}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        </Form.Group>

                        {/* Business Name */}
                        <Form.Group className="row mb-3">
                            <Form.Label column lg={4} className="fw-semibold">Business Registered Name:</Form.Label>
                            <div className="col-lg-8">
                                <Form.Control
                                    type="text"
                                    name="businessDetails.businessName"
                                    value={formData.businessDetails.businessName}
                                    onChange={handleChange}
                                    placeholder="Enter business name"
                                    required
                                    readOnly={!canUpdateProfile}
                                />
                            </div>
                        </Form.Group>

                        {/* Only show update button if allowed */}
                        {canUpdateProfile && (
                            <div className="row mt-4">
                                <div className="col-lg-8 offset-lg-4">
                                    <Button variant="primary" type="submit" disabled={updating || imageSizeError}>
                                        {updating ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                <span className="ms-2">Updating...</span>
                                            </>
                                        ) : 'Update Profile'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                ) : (
                    <div className="alert alert-info">
                        You don&apos;t have permission to update profile information.
                    </div>
                )}
            </div>

            {/* Confirmation Modal - Only shown if canUpdateProfile is true */}
            {canUpdateProfile && (
                <Modal
                    show={showConfirmModal}
                    onHide={() => {
                        if (!updating) {
                            setShowConfirmModal(false);
                        }
                    }}
                    centered
                    backdrop={updating ? 'static' : true}
                    keyboard={!updating}
                >
                    <Modal.Header closeButton={!updating} className="border-0 pb-0">
                        <Modal.Title className="w-100 text-center">
                            <h5 className="fw-bold">Confirm Update</h5>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="text-center py-4">
                        <h8 className="mb-4">Are you sure you want to update your profile information?</h8>
                    </Modal.Body>
                    <Modal.Footer className="justify-content-center">
                        <Button
                            variant="danger"
                            onClick={() => setShowConfirmModal(false)}
                            className="px-4"
                            disabled={updating}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            className="px-4"
                            disabled={updating}
                        >
                            {updating ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2"
                                    />
                                    Updating...
                                </>
                            ) : 'Confirm Update'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
    );
};

export default TabProfile;