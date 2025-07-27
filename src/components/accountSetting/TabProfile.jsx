import React, { useState, useEffect, useRef } from 'react';
import { FiCamera, FiUpload } from 'react-icons/fi';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BASE_URL } from '/src/constants.js';

const TabProfile = () => {
    // State for form data
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactNumber: '',
        country: '',
        state: '',
        city: '',
        businessDetails: {
            businessName: ''
        },
        profilePicture: ''
    });

    // State for UI
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState('/images/avatar/1.png');
    const fileInputRef = useRef(null);

    // Fetch profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const authData = JSON.parse(localStorage.getItem('authData'));
                if (!authData?.token) {
                    toast.error('Authentication token not found');
                    setLoadingProfile(false);
                    return;
                }

                // Try to fetch fresh data from API
                try {
                    const response = await axios.get(`${BASE_URL}/api/client-admin/profile`, {
                        headers: {
                            Authorization: `Bearer ${authData.token}`
                        }
                    });

                    const profileData = response.data || {};
                    setFormData({
                        name: profileData.name || '',
                        address: profileData.address || '',
                        contactNumber: profileData.contactNumber || '',
                        country: profileData.country || '',
                        state: profileData.state || '',
                        city: profileData.city || '',
                        businessDetails: {
                            businessName: profileData.businessDetails?.businessName || ''
                        },
                        profilePicture: profileData.profilePicture || ''
                    });

                    if (profileData.profilePicture) {
                        setProfilePictureUrl(profileData.profilePicture);
                    }

                    // Update localStorage
                    localStorage.setItem('authData', JSON.stringify({
                        ...authData,
                        ...profileData
                    }));
                } catch (apiError) {
                    console.warn('Failed to fetch fresh profile, using localStorage data');
                    if (authData) {
                        setFormData({
                            name: authData.name || '',
                            address: authData.address || '',
                            contactNumber: authData.contactNumber || '',
                            country: authData.country || '',
                            state: authData.state || '',
                            city: authData.city || '',
                            businessDetails: {
                                businessName: authData.businessDetails?.businessName || ''
                            },
                            profilePicture: authData.profilePicture || ''
                        });
                        if (authData.profilePicture) {
                            setProfilePictureUrl(authData.profilePicture);
                        }
                    }
                }

            } catch (error) {
                toast.error('Failed to load profile data');
                console.error('Error:', error);
            } finally {
                setLoadingProfile(false);
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
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.match('image.*')) {
                toast.error('Please select an image file (png, jpg, jpeg)');
                return;
            }

            // Validate file size
            if (file.size > 2 * 1024 * 1024) {
                toast.error('File size should be less than 2MB');
                return;
            }

            setProfilePicture(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePictureUrl(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfilePicture = async () => {
        if (!profilePicture) return null;

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

            return response.data.url;

        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile picture');
            console.error('Error:', error);
            return null;
        }
    };

    const handleSubmit = async () => {
        setUpdating(true);
        setShowConfirmModal(false);

        try {
            const authData = JSON.parse(localStorage.getItem('authData'));
            if (!authData?.token) {
                toast.error('Authentication token not found');
                return;
            }

            // First upload profile picture if changed
            let newPictureUrl = null;
            if (profilePicture) {
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

            // Update the profile via API
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
            }

            toast.success('Profile updated successfully');

            // Reload the page after a short delay to show the success message
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
            console.error('Error:', error);
        } finally {
            setUpdating(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <div className="tab-pane fade show active" id="profileTab" role="tabpanel">
            <div className="card-body personal-info">
                <Form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }}>
                    <div className="mb-4 d-flex align-items-center justify-content-between">
                        <h5 className="fw-bold mb-0 me-4">
                            <span className="d-block mb-2">Personal Information:</span>
                            <span className="fs-12 fw-normal text-muted">Following information is publicly displayed, be careful!</span>
                        </h5>
                    </div>

                    {/* Avatar Section with Upload Button */}
                    <Form.Group className="row mb-4 align-items-center">
                        <Form.Label column lg={4} className="fw-semibold">Avatar:</Form.Label>
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
                                    <div>• Avatar size 150x150</div>
                                    <div>• Max upload size 2MB</div>
                                    <div>• Allowed: PNG, JPG, JPEG</div>
                                </div>
                            </div>
                        </div>
                    </Form.Group>

                    {/* Name */}
                    <Form.Group className="row mb-3">
                        <Form.Label column lg={4} className="fw-semibold">Full Name:</Form.Label>
                        <div className="col-lg-8">
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
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
                            />
                        </div>
                    </Form.Group>

                    {/* Business Name */}
                    <Form.Group className="row mb-3">
                        <Form.Label column lg={4} className="fw-semibold">Business Name:</Form.Label>
                        <div className="col-lg-8">
                            <Form.Control
                                type="text"
                                name="businessDetails.businessName"
                                value={formData.businessDetails.businessName}
                                onChange={handleChange}
                                placeholder="Enter business name"
                                required
                            />
                        </div>
                    </Form.Group>

                    <div className="row mt-4">
                        <div className="col-lg-8 offset-lg-4">
                            <Button variant="primary" type="submit" disabled={updating}>
                                {updating ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        <span className="ms-2">Updating...</span>
                                    </>
                                ) : 'Update Profile'}
                            </Button>
                        </div>
                    </div>
                </Form>
            </div>

            {/* Confirmation Modal */}
            <Modal
                show={showConfirmModal}
                onHide={() => !updating && setShowConfirmModal(false)} // Prevent closing when updating
                centered
                backdrop={updating ? 'static' : true} // Force static backdrop when updating
                keyboard={!updating} // Only allow keyboard dismiss when not updating
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
        </div>
    );
};

export default TabProfile;