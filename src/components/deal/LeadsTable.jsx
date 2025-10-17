import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiEdit, FiPlus, FiEye, FiUpload, FiExternalLink, FiCheck, FiX } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';

// Error Boundary Component
const ErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const handleError = (error) => {
            console.error('Error caught by boundary:', error);
            setHasError(true);
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
        return (
            <div className="alert alert-danger">
                Something went wrong. Please refresh the page.
            </div>
        );
    }

    return children;
};

const SponsorsTable = () => {
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedSponsor, setSelectedSponsor] = useState(null);
    const [sponsorToDelete, setSponsorToDelete] = useState(null);
    const [sponsorToUpdateStatus, setSponsorToUpdateStatus] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [newSponsor, setNewSponsor] = useState({
        fullName: '',
        businessEmail: '',
        companyName: '',
        companyWebsite: '',
        contactNumber: '',
        pitchDescription: ''
    });
    const [editSponsor, setEditSponsor] = useState({
        id: '',
        fullName: '',
        businessEmail: '',
        companyName: '',
        companyWebsite: '',
        contactNumber: '',
        pitchDescription: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';
    const [deleting, setDeleting] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [imageSizeError, setImageSizeError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const authData = JSON.parse(localStorage.getItem("authData") || "{}");
    const userRole = authData?.role || '';
    const userPermissions = authData?.permissions || [];
    const eventId = authData?.eventId || '';

    // Permission checks
    const canRead = userRole === 'PATRON' || userPermissions.includes('SPONSOR_READ');
    const canWrite = userRole === 'PATRON' || userPermissions.includes('SPONSOR_WRITE');
    const canUpdate = userRole === 'PATRON' || userPermissions.includes('SPONSOR_UPDATE');
    const canDelete = userRole === 'PATRON' || userPermissions.includes('SPONSOR_DELETE');
    const canUpdateStatus = userRole === 'PATRON' || userPermissions.includes('SPONSOR_UPDATE_STATUS');

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Logo</th>
                            <th scope="col">Full Name</th>
                            <th scope="col">Company</th>
                            <th scope="col">Email</th>
                            <th scope="col">Contact</th>
                            <th scope="col">Status</th>
                            <th scope="col">Event</th>
                            {canRead || canUpdate || canDelete || canUpdateStatus ? (
                                <th scope="col" className="text-end">Actions</th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
                                <td>
                                    <Skeleton
                                        circle
                                        width={40}
                                        height={40}
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
                                        width={120}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={180}
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
                                        width={100}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                {canRead || canUpdate || canDelete || canUpdateStatus ? (
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
                                ) : null}
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
                <h5 className="mb-2">No Sponsors Found</h5>
                <p className="text-muted mb-4">You haven&apos;t added any sponsors yet. Start by adding a new sponsor.</p>
                {canWrite && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 mx-auto"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Add Sponsor
                    </Button>
                )}
            </div>
        );
    };

    const handleFileChange = (e, isEditModal = false) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            if (toast && toast.error) {
                toast.error('Please select an image file');
            }
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2 MB limit
            setImageSizeError('File size should be less than 2MB');
            setSelectedFile(null);
            setImagePreview('');
            return;
        }

        setImageSizeError('');
        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const fetchSponsors = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData") || "{}");
            if (!authData?.token) {
                if (toast && toast.error) {
                    toast.error("Authentication token not found");
                }
                return;
            }

            const response = await fetch(`${BASE_URL}/api/sponsors`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to fetch sponsors';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (data.success && data.data) {
                setSponsors(data.data);
            } else {
                throw new Error(data.error || data.message || 'Failed to fetch sponsors');
            }
        } catch (err) {
            console.error('Fetch sponsors error:', err);
            if (toast && toast.error) {
                toast.error(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const getStatusBadge = (status) => {
        if (!status) {
            return (
                <Badge bg="secondary" className="text-capitalize">
                    Unknown
                </Badge>
            );
        }

        const statusConfig = {
            'PENDING': { variant: 'warning', label: 'Pending' },
            'PENDING_APPROVAL': { variant: 'warning', label: 'Pending Approval' },
            'APPROVED': { variant: 'success', label: 'Approved' },
            'REJECTED': { variant: 'danger', label: 'Rejected' }
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        
        return (
            <Badge bg={config.variant} className="text-capitalize">
                {config.label}
            </Badge>
        );
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSponsor(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditSponsor(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.fullName?.trim()) errors.fullName = 'Full name is required';
        if (!formData.businessEmail?.trim()) errors.businessEmail = 'Business email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) errors.businessEmail = 'Email is invalid';
        if (!formData.companyName?.trim()) errors.companyName = 'Company name is required';
        if (!formData.contactNumber?.trim()) errors.contactNumber = 'Contact number is required';
        if (!formData.pitchDescription?.trim()) errors.pitchDescription = 'Pitch description is required';
        
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newSponsor, setFormErrors)) return;
        
        if (!eventId) {
            if (toast && toast.error) {
                toast.error('Event ID not found. Please make sure you are associated with an event.');
            }
            return;
        }

        if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
            setImageSizeError('File size should be less than 2MB');
            return;
        }

        try {
            setSubmitting(true);
            const authData = JSON.parse(localStorage.getItem("authData") || "{}");

            const formData = new FormData();
            formData.append('fullName', newSponsor.fullName);
            formData.append('businessEmail', newSponsor.businessEmail);
            formData.append('companyName', newSponsor.companyName);
            formData.append('companyWebsite', newSponsor.companyWebsite);
            formData.append('contactNumber', newSponsor.contactNumber);
            formData.append('pitchDescription', newSponsor.pitchDescription);
            formData.append('eventId', eventId);
            
            if (selectedFile) {
                formData.append('companyLogo', selectedFile);
            }

            const response = await fetch(`${BASE_URL}/api/sponsors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to create sponsor';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (toast && toast.success) {
                toast.success('Sponsor created successfully');
            }
            
            await fetchSponsors();
            setIsModalOpen(false);
            setNewSponsor({
                fullName: '',
                businessEmail: '',
                companyName: '',
                companyWebsite: '',
                contactNumber: '',
                pitchDescription: ''
            });
            setSelectedFile(null);
            setImagePreview('');
            setImageSizeError('');
        } catch (err) {
            console.error('Create sponsor error:', err);
            if (toast && toast.error) {
                toast.error(err.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editSponsor, setEditFormErrors)) return;
        
        if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
            setImageSizeError('File size should be less than 2MB');
            return;
        }

        try {
            setSubmitting(true);
            const authData = JSON.parse(localStorage.getItem("authData") || "{}");

            const formData = new FormData();
            formData.append('fullName', editSponsor.fullName);
            formData.append('businessEmail', editSponsor.businessEmail);
            formData.append('companyName', editSponsor.companyName);
            formData.append('companyWebsite', editSponsor.companyWebsite);
            formData.append('contactNumber', editSponsor.contactNumber);
            formData.append('pitchDescription', editSponsor.pitchDescription);
            
            if (selectedFile) {
                formData.append('companyLogo', selectedFile);
            }

            const response = await fetch(`${BASE_URL}/api/sponsors/${editSponsor.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to update sponsor';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (toast && toast.success) {
                toast.success('Sponsor updated successfully');
            }
            
            await fetchSponsors();
            setIsEditModalOpen(false);
            setSelectedFile(null);
            setImagePreview('');
            setImageSizeError('');
        } catch (err) {
            console.error('Update sponsor error:', err);
            if (toast && toast.error) {
                toast.error(err.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewSponsor = (sponsor) => {
        if (!sponsor) return;
        setSelectedSponsor(sponsor);
        setIsViewModalOpen(true);
    };

    const handleEditSponsor = (sponsor) => {
        if (!sponsor) return;
        setEditSponsor({
            id: sponsor.id || '',
            fullName: sponsor.fullName || '',
            businessEmail: sponsor.businessEmail || '',
            companyName: sponsor.companyName || '',
            companyWebsite: sponsor.companyWebsite || '',
            contactNumber: sponsor.contactNumber || '',
            pitchDescription: sponsor.pitchDescription || ''
        });
        setSelectedFile(null);
        setImagePreview('');
        setImageSizeError('');
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (sponsor) => {
        if (!sponsor) return;
        setSponsorToDelete(sponsor);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteSponsor = async () => {
        if (!sponsorToDelete?.id) {
            if (toast && toast.error) {
                toast.error("Sponsor information is missing");
            }
            return;
        }

        try {
            setDeleting(true);
            const authData = JSON.parse(localStorage.getItem("authData") || "{}");
            const response = await fetch(`${BASE_URL}/api/sponsors/${sponsorToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to delete sponsor';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (toast && toast.success) {
                toast.success('Sponsor deleted successfully');
            }
            
            await fetchSponsors();
            setIsDeleteModalOpen(false);
        } catch (err) {
            console.error('Delete sponsor error:', err);
            if (toast && toast.error) {
                toast.error(err.message);
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleStatusUpdateClick = (sponsor, status) => {
        if (!sponsor) return;
        
        console.log('Status update clicked:', { sponsor: sponsor.companyName, status });
        
        setSponsorToUpdateStatus(sponsor);
        setNewStatus(status);
        setRejectionReason('');
        
        if (status === 'REJECTED') {
            setIsStatusModalOpen(true);
        } else {
            // Directly call handleUpdateStatus for APPROVED
            handleUpdateStatus(status);
        }
    };

    const handleUpdateStatus = async (status = null) => {
        const finalStatus = status || newStatus;
        
        console.log('Updating status to:', finalStatus, 'for sponsor:', sponsorToUpdateStatus?.companyName);
        
        // Validate required data
        if (!sponsorToUpdateStatus?.id) {
            if (toast && toast.error) {
                toast.error("Sponsor information is missing");
            }
            return;
        }

        try {
            setUpdatingStatus(true);
            const authData = JSON.parse(localStorage.getItem("authData") || "{}");
            
            if (!authData?.token) {
                if (toast && toast.error) {
                    toast.error("Authentication token not found");
                }
                return;
            }

            const requestBody = {
                status: finalStatus
            };
            
            // Add rejection reason if status is REJECTED
            if (finalStatus === 'REJECTED' && rejectionReason?.trim()) {
                requestBody.rejectionReason = rejectionReason.trim();
            }

            console.log('Sending status update request:', {
                url: `${BASE_URL}/api/sponsors/${sponsorToUpdateStatus.id}/status`,
                method: 'PATCH',
                body: requestBody
            });

            const response = await fetch(`${BASE_URL}/api/sponsors/${sponsorToUpdateStatus.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            // Check if response is ok before parsing JSON
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to update sponsor status';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Status update response:', data);
            
            // Check if toast exists before calling it
            if (toast && toast.success) {
                toast.success(`Sponsor ${finalStatus.toLowerCase()} successfully`);
            }
            
            await fetchSponsors();
            setIsStatusModalOpen(false);
            setIsViewModalOpen(false);
            setSponsorToUpdateStatus(null);
            setNewStatus('');
            setRejectionReason('');
        } catch (err) {
            console.error('Status update error:', err);
            // Check if toast exists before calling it
            if (toast && toast.error) {
                toast.error(err.message || 'Failed to update sponsor status');
            }
        } finally {
            setUpdatingStatus(false);
        }
    };

    const getLogoUrl = (logoUrl) => {
        if (!logoUrl) return '/images/avatar/undefined.png';
        return logoUrl.startsWith('http') ? logoUrl : `${BASE_URL}/uploads/${logoUrl}`;
    };

    const StatusActions = ({ sponsor }) => {
        if (!sponsor || !canUpdateStatus) return null;

        // Show buttons for both PENDING and PENDING_APPROVAL statuses
        const showActions = sponsor.status === 'PENDING' || sponsor.status === 'PENDING_APPROVAL';
        
        if (!showActions) return null;

        return (
            <div className="d-flex gap-2 mt-3">
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<FiCheck />}
                    onClick={() => handleStatusUpdateClick(sponsor, 'APPROVED')}
                    style={{ backgroundColor: '#28a745', color: 'white' }}
                >
                    Approve
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<FiX />}
                    onClick={() => handleStatusUpdateClick(sponsor, 'REJECTED')}
                    style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                    Reject
                </Button>
            </div>
        );
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'companyLogoUrl',
            header: 'Logo',
            cell: (info) => {
                const logoUrl = info.getValue();
                return (
                    <img
                        src={getLogoUrl(logoUrl)}
                        alt="Company Logo"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                        onError={(e) => {
                            e.target.src = '/images/avatar/undefined.png';
                        }}
                    />
                );
            }
        },
        {
            accessorKey: 'fullName',
            header: 'Full Name',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'companyName',
            header: 'Company',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'businessEmail',
            header: 'Email',
            cell: (info) => {
                const email = info.getValue();
                if (!email) return '-';
                return (
                    <a href={`mailto:${email}`} className="text-decoration-none">
                        {email}
                    </a>
                );
            }
        },
        {
            accessorKey: 'contactNumber',
            header: 'Contact',
            cell: (info) => {
                const contact = info.getValue();
                if (!contact) return '-';
                return (
                    <a href={`tel:${contact}`} className="text-decoration-none">
                        {contact}
                    </a>
                );
            }
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (info) => {
                const status = info.getValue();
                const sponsor = info.row.original;
                
                // Handle null or undefined status
                if (!status) return null;
                
                return (
                    <div className="d-flex align-items-center gap-2">
                        {getStatusBadge(status)}
                        {/* Show Accept/Reject buttons for both PENDING and PENDING_APPROVAL statuses */}
                        {canUpdateStatus && (status === 'PENDING' || status === 'PENDING_APPROVAL') && (
                            <div className="d-flex gap-1">
                                <button
                                    className="btn btn-success btn-sm p-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Approve clicked for:', sponsor.companyName);
                                        handleStatusUpdateClick(sponsor, 'APPROVED');
                                    }}
                                    title="Approve"
                                    style={{ width: '24px', height: '24px' }}
                                >
                                    <FiCheck size={12} />
                                </button>
                                <button
                                    className="btn btn-danger btn-sm p-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Reject clicked for:', sponsor.companyName);
                                        handleStatusUpdateClick(sponsor, 'REJECTED');
                                    }}
                                    title="Reject"
                                    style={{ width: '24px', height: '24px' }}
                                >
                                    <FiX size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'eventName',
            header: 'Event',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => {
                const sponsor = row.original;
                if (!sponsor) return null;
                
                return (
                    <div className="hstack gap-2 justify-content-end">
                        {canRead && (
                            <button
                                className="avatar-text avatar-md"
                                onClick={() => handleViewSponsor(sponsor)}
                            >
                                <FiEye />
                            </button>
                        )}
                        {canUpdate && (
                            <button
                                className="avatar-text avatar-md"
                                onClick={() => handleEditSponsor(sponsor)}
                            >
                                <FiEdit />
                            </button>
                        )}
                        {canDelete && (
                            <button
                                className="avatar-text avatar-md"
                                onClick={() => handleDeleteClick(sponsor)}
                            >
                                <FiTrash />
                            </button>
                        )}
                    </div>
                );
            },
            meta: { headerClassName: 'text-end' }
        },
    ], [canRead, canUpdate, canDelete, canUpdateStatus]);

    useEffect(() => {
        fetchSponsors();
    }, [fetchSponsors]);

    return (
        <ErrorBoundary>
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
                <h4>Sponsors</h4>
                {canWrite && (
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#af0000ff', color: 'white' }}
                    >
                        <FiPlus /> Add Sponsor
                    </Button>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : sponsors.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={sponsors}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Add Sponsor Modal */}
            {canWrite && (
                <Modal show={isModalOpen} onHide={() => {
                    if (!submitting) {
                        setIsModalOpen(false);
                        setNewSponsor({
                            fullName: '',
                            businessEmail: '',
                            companyName: '',
                            companyWebsite: '',
                            contactNumber: '',
                            pitchDescription: ''
                        });
                        setFormErrors({});
                        setSelectedFile(null);
                        setImagePreview('');
                        setImageSizeError('');
                    }
                }} centered size="lg">
                    <Modal.Header closeButton={!submitting}>
                        <Modal.Title>Add Sponsor</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="fullName" className="form-label">Full Name *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.fullName ? 'is-invalid' : ''}`}
                                        id="fullName"
                                        name="fullName"
                                        value={newSponsor.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Enter full name"
                                    />
                                    {formErrors.fullName && <div className="invalid-feedback">{formErrors.fullName}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="businessEmail" className="form-label">Business Email *</label>
                                    <input
                                        type="email"
                                        className={`form-control ${formErrors.businessEmail ? 'is-invalid' : ''}`}
                                        id="businessEmail"
                                        name="businessEmail"
                                        value={newSponsor.businessEmail}
                                        onChange={handleInputChange}
                                        placeholder="Enter business email"
                                    />
                                    {formErrors.businessEmail && <div className="invalid-feedback">{formErrors.businessEmail}</div>}
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="companyName" className="form-label">Company Name *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.companyName ? 'is-invalid' : ''}`}
                                        id="companyName"
                                        name="companyName"
                                        value={newSponsor.companyName}
                                        onChange={handleInputChange}
                                        placeholder="Enter company name"
                                    />
                                    {formErrors.companyName && <div className="invalid-feedback">{formErrors.companyName}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="companyWebsite" className="form-label">Company Website</label>
                                    <input
                                        type="url"
                                        className="form-control"
                                        id="companyWebsite"
                                        name="companyWebsite"
                                        value={newSponsor.companyWebsite}
                                        onChange={handleInputChange}
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="contactNumber" className="form-label">Contact Number *</label>
                                    <input
                                        type="tel"
                                        className={`form-control ${formErrors.contactNumber ? 'is-invalid' : ''}`}
                                        id="contactNumber"
                                        name="contactNumber"
                                        value={newSponsor.contactNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter contact number"
                                    />
                                    {formErrors.contactNumber && <div className="invalid-feedback">{formErrors.contactNumber}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Company Logo</label>
                                    <div className="d-flex flex-wrap gap-3">
                                        <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                                            <div
                                                className="w-100 h-100 border rounded d-flex flex-column justify-content-center align-items-center cursor-pointer"
                                                style={{
                                                    borderStyle: imagePreview ? 'solid' : 'dashed',
                                                    backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa'
                                                }}
                                                onClick={() => document.getElementById('add-logo-upload').click()}
                                            >
                                                {imagePreview ? (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-100 h-100"
                                                        style={{
                                                            objectFit: 'cover',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                ) : (
                                                    <>
                                                        <FiUpload size={20} className="mb-1" />
                                                        <h8 className="small">Upload Logo</h8>
                                                        <h8 className="small">Max 2 MB</h8>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                id="add-logo-upload"
                                                className="d-none"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, false)}
                                            />
                                        </div>
                                    </div>
                                    {imageSizeError && (
                                        <div className="text-danger small mt-1">{imageSizeError}</div>
                                    )}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="pitchDescription" className="form-label">Pitch Description *</label>
                                <textarea
                                    className={`form-control ${formErrors.pitchDescription ? 'is-invalid' : ''}`}
                                    id="pitchDescription"
                                    name="pitchDescription"
                                    value={newSponsor.pitchDescription}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Describe the sponsor's pitch and value proposition"
                                />
                                {formErrors.pitchDescription && <div className="invalid-feedback">{formErrors.pitchDescription}</div>}
                            </div>
                            <div className="mb-3">
                                <h8 className="text-muted">* Required fields</h8>
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Creating...
                                </>
                            ) : (
                                'Create Sponsor'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Edit Sponsor Modal */}
            {canUpdate && (
                <Modal show={isEditModalOpen} onHide={() => {
                    if (!submitting) {
                        setIsEditModalOpen(false);
                        setEditFormErrors({});
                        setSelectedFile(null);
                        setImagePreview('');
                        setImageSizeError('');
                    }
                }} centered size="lg">
                    <Modal.Header closeButton={!submitting}>
                        <Modal.Title>Edit Sponsor</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={handleEditSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-fullName" className="form-label">Full Name *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${editFormErrors.fullName ? 'is-invalid' : ''}`}
                                        id="edit-fullName"
                                        name="fullName"
                                        value={editSponsor.fullName}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.fullName && <div className="invalid-feedback">{editFormErrors.fullName}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-businessEmail" className="form-label">Business Email *</label>
                                    <input
                                        type="email"
                                        className={`form-control ${editFormErrors.businessEmail ? 'is-invalid' : ''}`}
                                        id="edit-businessEmail"
                                        name="businessEmail"
                                        value={editSponsor.businessEmail}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.businessEmail && <div className="invalid-feedback">{editFormErrors.businessEmail}</div>}
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-companyName" className="form-label">Company Name *</label>
                                    <input
                                        type="text"
                                        className={`form-control ${editFormErrors.companyName ? 'is-invalid' : ''}`}
                                        id="edit-companyName"
                                        name="companyName"
                                        value={editSponsor.companyName}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.companyName && <div className="invalid-feedback">{editFormErrors.companyName}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-companyWebsite" className="form-label">Company Website</label>
                                    <input
                                        type="url"
                                        className="form-control"
                                        id="edit-companyWebsite"
                                        name="companyWebsite"
                                        value={editSponsor.companyWebsite}
                                        onChange={handleEditInputChange}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-contactNumber" className="form-label">Contact Number *</label>
                                    <input
                                        type="tel"
                                        className={`form-control ${editFormErrors.contactNumber ? 'is-invalid' : ''}`}
                                        id="edit-contactNumber"
                                        name="contactNumber"
                                        value={editSponsor.contactNumber}
                                        onChange={handleEditInputChange}
                                    />
                                    {editFormErrors.contactNumber && <div className="invalid-feedback">{editFormErrors.contactNumber}</div>}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Company Logo</label>
                                    <div className="d-flex flex-wrap gap-3">
                                        {editSponsor.id && (
                                            <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                                                <img
                                                    src={getLogoUrl(selectedSponsor?.companyLogoUrl)}
                                                    alt="Current Logo"
                                                    className="w-100 h-100"
                                                    style={{
                                                        objectFit: 'cover',
                                                        borderRadius: '4px'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.src = '/images/avatar/undefined.png';
                                                    }}
                                                />
                                                <h8 className="small text-center mt-1">Current</h8>
                                            </div>
                                        )}
                                        <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                                            <div
                                                className="w-100 h-100 border rounded d-flex flex-column justify-content-center align-items-center cursor-pointer"
                                                style={{
                                                    borderStyle: imagePreview ? 'solid' : 'dashed',
                                                    backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa'
                                                }}
                                                onClick={() => document.getElementById('edit-logo-upload').click()}
                                            >
                                                {imagePreview ? (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-100 h-100"
                                                        style={{
                                                            objectFit: 'cover',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                ) : (
                                                    <>
                                                        <FiUpload size={20} className="mb-1" />
                                                        <h8 className="small">Change Logo</h8>
                                                        <h8 className="small">Max 2 MB</h8>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                id="edit-logo-upload"
                                                className="d-none"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, true)}
                                            />
                                        </div>
                                    </div>
                                    {imageSizeError && (
                                        <div className="text-danger small mt-1">{imageSizeError}</div>
                                    )}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="edit-pitchDescription" className="form-label">Pitch Description *</label>
                                <textarea
                                    className={`form-control ${editFormErrors.pitchDescription ? 'is-invalid' : ''}`}
                                    id="edit-pitchDescription"
                                    name="pitchDescription"
                                    value={editSponsor.pitchDescription}
                                    onChange={handleEditInputChange}
                                    rows="4"
                                />
                                {editFormErrors.pitchDescription && <div className="invalid-feedback">{editFormErrors.pitchDescription}</div>}
                            </div>
                            <div className="mb-3">
                                <h8 className="text-muted">* Required fields</h8>
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleEditSubmit}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Updating...
                                </>
                            ) : (
                                'Update Sponsor'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* View Sponsor Modal */}
            {canRead && (
                <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Sponsor Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedSponsor && (
                            <div>
                                <div className="row mb-4">
                                    <div className="col-md-4 text-center">
                                        <img
                                            src={getLogoUrl(selectedSponsor.companyLogoUrl)}
                                            alt="Company Logo"
                                            style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                                            onError={(e) => {
                                                e.target.src = '/images/avatar/undefined.png';
                                            }}
                                        />
                                    </div>
                                    <div className="col-md-8">
                                        <h4>{selectedSponsor.companyName}</h4>
                                        <p className="text-muted mb-2">{selectedSponsor.pitchDescription}</p>
                                        <div className="mb-2">
                                            <strong>Status: </strong>
                                            {getStatusBadge(selectedSponsor.status)}
                                        </div>
                                        {selectedSponsor.companyWebsite && (
                                            <div className="mb-2">
                                                <strong>Website: </strong>
                                                <a href={selectedSponsor.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                                    {selectedSponsor.companyWebsite} <FiExternalLink size={14} />
                                                </a>
                                            </div>
                                        )}
                                        {/* Show Accept/Reject buttons for both PENDING and PENDING_APPROVAL statuses */}
                                        {canUpdateStatus && (selectedSponsor.status === 'PENDING' || selectedSponsor.status === 'PENDING_APPROVAL') && (
                                            <div className="d-flex gap-2 mt-3">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<FiCheck />}
                                                    onClick={() => handleStatusUpdateClick(selectedSponsor, 'APPROVED')}
                                                    style={{ backgroundColor: '#28a745', color: 'white' }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<FiX />}
                                                    onClick={() => handleStatusUpdateClick(selectedSponsor, 'REJECTED')}
                                                    style={{ backgroundColor: '#dc3545', color: 'white' }}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <h6>Contact Information</h6>
                                        <p><strong>Full Name:</strong> {selectedSponsor.fullName}</p>
                                        <p><strong>Email:</strong> 
                                            <a href={`mailto:${selectedSponsor.businessEmail}`} className="text-decoration-none ms-1">
                                                {selectedSponsor.businessEmail}
                                            </a>
                                        </p>
                                        <p><strong>Contact:</strong> 
                                            <a href={`tel:${selectedSponsor.contactNumber}`} className="text-decoration-none ms-1">
                                                {selectedSponsor.contactNumber}
                                            </a>
                                        </p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <h6>Event Information</h6>
                                        <p><strong>Event:</strong> {selectedSponsor.eventName || '-'}</p>
                                        <p><strong>Self Registered:</strong> {selectedSponsor.selfRegistered ? 'Yes' : 'No'}</p>
                                        <p><strong>OTP Verified:</strong> {selectedSponsor.otpVerified ? 'Yes' : 'No'}</p>
                                        <p><strong>Created At:</strong> {new Date(selectedSponsor.createdAt).toLocaleDateString()}</p>
                                        {selectedSponsor.approvedAt && (
                                            <p><strong>Approved At:</strong> {new Date(selectedSponsor.approvedAt).toLocaleDateString()}</p>
                                        )}
                                        {selectedSponsor.rejectionReason && (
                                            <p><strong>Rejection Reason:</strong> {selectedSponsor.rejectionReason}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {canDelete && (
                <Modal show={isDeleteModalOpen} onHide={() => {
                    if (!deleting) {
                        setIsDeleteModalOpen(false);
                    }
                }} centered>
                    <Modal.Header closeButton={!deleting}>
                        <Modal.Title>Delete Sponsor</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {sponsorToDelete && (
                            <>
                                <h8>Are you sure you want to delete the sponsor <strong>{sponsorToDelete.companyName}</strong>?</h8>
                                <h8 className="d-block mt-2">This action cannot be undone.</h8>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="contained"
                            onClick={handleDeleteSponsor}
                            style={{ backgroundColor: '#af0000ff', color: 'white' }}
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

            {/* Status Update Modal for Rejection Reason */}
            <Modal show={isStatusModalOpen} onHide={() => {
                if (!updatingStatus) {
                    setIsStatusModalOpen(false);
                }
            }} centered>
                <Modal.Header closeButton={!updatingStatus}>
                    <Modal.Title>Reject Sponsor</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {sponsorToUpdateStatus && (
                        <>
                            <p>Are you sure you want to reject the sponsor <strong>{sponsorToUpdateStatus.companyName}</strong>?</p>
                            <div className="mb-3">
                                <label htmlFor="rejectionReason" className="form-label">Rejection Reason (Optional)</label>
                                <textarea
                                    className="form-control"
                                    id="rejectionReason"
                                    rows="3"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Enter reason for rejection..."
                                />
                            </div>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={() => handleUpdateStatus()}
                        style={{ backgroundColor: '#dc3545', color: 'white' }}
                        disabled={updatingStatus}
                    >
                        {updatingStatus ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Rejecting...
                            </>
                        ) : (
                            'Reject Sponsor'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </ErrorBoundary>
    );
};

export default SponsorsTable;