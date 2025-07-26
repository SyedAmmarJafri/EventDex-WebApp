import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { FiTrash, FiBook, FiEdit, FiPlus, FiEye, FiMail } from 'react-icons/fi';
import Button from '@mui/material/Button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from 'react-bootstrap/Modal';

// Initialize IndexedDB
const initIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MarketingDB', 2);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject('Failed to open IndexedDB');
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('templates')) {
                db.createObjectStore('templates', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('emailConfig')) {
                db.createObjectStore('emailConfig', { keyPath: 'id' });
            }
        };
    });
};

const TemplatesTable = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [emailConfig, setEmailConfig] = useState({
        fromEmail: '',
        appPassword: ''
    });
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        subject: '',
        content: ''
    });
    const [editTemplate, setEditTemplate] = useState({
        id: '',
        name: '',
        subject: '',
        content: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});
    const [configFormErrors, setConfigFormErrors] = useState({});
    const [activeTab, setActiveTab] = useState('edit');
    const [editActiveTab, setEditActiveTab] = useState('edit');
    const [db, setDb] = useState(null);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Initialize IndexedDB on component mount
    useEffect(() => {
        initIndexedDB().then(database => {
            setDb(database);
            // Load initial data
            loadInitialData(database);
        }).catch(error => {
            console.error('IndexedDB initialization failed:', error);
            // Fallback to API calls
            fetchTemplatesFromAPI();
            fetchEmailConfigFromAPI();
        });
    }, []);

    // Load initial data from cache or API
    const loadInitialData = async (database) => {
        try {
            setLoading(true);

            // Check if we have cached templates
            const cachedTemplates = await getFromIndexedDB(database, 'templates');
            if (cachedTemplates && cachedTemplates.length > 0) {
                setTemplates(cachedTemplates);

                // Check if data is stale (older than 1 hour)
                const lastSync = localStorage.getItem('templatesLastSync') || 0;
                if (Date.now() - lastSync > 3600000) {
                    await fetchTemplatesFromAPI(database);
                }
            } else {
                await fetchTemplatesFromAPI(database);
            }

            // Load email config
            const cachedConfig = await getFromIndexedDB(database, 'emailConfig', 'config');
            if (cachedConfig) {
                setEmailConfig({
                    fromEmail: cachedConfig.fromEmail,
                    appPassword: ''
                });
            } else {
                await fetchEmailConfigFromAPI(database);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Failed to load initial data');
        } finally {
            setLoading(false);
        }
    };

    // Generic function to get data from IndexedDB
    const getFromIndexedDB = (database, storeName, key = null) => {
        return new Promise((resolve) => {
            const transaction = database.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            const request = key ? store.get(key) : store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                resolve(null);
            };
        });
    };

    // Generic function to save data to IndexedDB
    const saveToIndexedDB = (database, storeName, data, key = null) => {
        return new Promise((resolve) => {
            const transaction = database.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            if (key) {
                store.put({ ...data, id: key });
            } else {
                // Clear existing data if storing array
                store.clear();
                data.forEach(item => store.put(item));
            }

            transaction.oncomplete = () => {
                resolve(true);
            };

            transaction.onerror = () => {
                resolve(false);
            };
        });
    };

    const fetchTemplatesFromAPI = async (database = db) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("Authentication token not found");
            }

            const response = await fetch(`${BASE_URL}/api/admin/marketing/templates`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch templates');
            }

            const data = await response.json();
            if (data && Array.isArray(data)) {
                setTemplates(data);
                if (database) {
                    await saveToIndexedDB(database, 'templates', data);
                    localStorage.setItem('templatesLastSync', Date.now());
                }
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const fetchEmailConfigFromAPI = async (database = db) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("Authentication token not found");
            }

            const response = await fetch(`${BASE_URL}/api/admin/marketing/email-configuration`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch email configuration');
            }

            const data = await response.json();
            setEmailConfig({
                fromEmail: data.fromEmail,
                appPassword: ''
            });

            if (database) {
                await saveToIndexedDB(database, 'emailConfig', data, 'config');
            }
        } catch (err) {
            toast.error(err.message);
        }
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
                <h5 className="mb-2">No Templates Found</h5>
                <p className="text-muted mb-4">You haven't created any templates yet. Start by adding a new template.</p>
                <Button
                    variant="contained"
                    onClick={() => setIsModalOpen(true)}
                    className="d-flex align-items-center gap-2 mx-auto"
                    style={{ backgroundColor: '#0092ff', color: 'white' }}
                >
                    <FiPlus /> Add Template
                </Button>
            </div>
        );
    };

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Subject</th>
                            <th scope="col">Created At</th>
                            <th scope="col">Updated At</th>
                            <th scope="col" className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
                                <td>
                                    <Skeleton
                                        width={150}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={200}
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
                                        width={120}
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

    const handleConfigInputChange = (e) => {
        const { name, value } = e.target;
        setEmailConfig(prev => ({ ...prev, [name]: value }));
        if (configFormErrors[name]) {
            setConfigFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTemplate(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditTemplate(prev => ({ ...prev, [name]: value }));
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (formData, setErrors) => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.subject.trim()) errors.subject = 'Subject is required';
        if (!formData.content.trim()) errors.content = 'Content is required';
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateConfigForm = (formData) => {
        const errors = {};
        if (!formData.fromEmail.trim()) errors.fromEmail = 'Email is required';
        if (!formData.appPassword.trim()) errors.appPassword = 'App Password is required';
        setConfigFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        if (!validateConfigForm(emailConfig)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/marketing/email-configuration`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fromEmail: emailConfig.fromEmail,
                    appPassword: emailConfig.appPassword
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update email configuration');
            }

            toast.success('Email configuration updated successfully');

            // Update local state and IndexedDB
            const newConfig = { fromEmail: emailConfig.fromEmail };
            setEmailConfig(prev => ({ ...prev, appPassword: '' }));
            if (db) {
                await saveToIndexedDB(db, 'emailConfig', newConfig, 'config');
            }

            setIsConfigModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(newTemplate, setFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/marketing/templates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTemplate)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create template');
            }

            toast.success('Template created successfully');

            // Update local state and IndexedDB
            const updatedTemplates = [...templates, data];
            setTemplates(updatedTemplates);
            if (db) {
                await saveToIndexedDB(db, 'templates', updatedTemplates);
            }

            setIsModalOpen(false);
            setNewTemplate({
                name: '',
                subject: '',
                content: ''
            });
            setActiveTab('edit');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm(editTemplate, setEditFormErrors)) return;

        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            const response = await fetch(`${BASE_URL}/api/admin/marketing/templates/${editTemplate.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editTemplate.name,
                    subject: editTemplate.subject,
                    content: editTemplate.content
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update template');
            }

            toast.success('Template updated successfully');

            // Update local state and IndexedDB
            const updatedTemplates = templates.map(t =>
                t.id === editTemplate.id ? data : t
            );
            setTemplates(updatedTemplates);
            if (db) {
                await saveToIndexedDB(db, 'templates', updatedTemplates);
            }

            setIsEditModalOpen(false);
            setEditActiveTab('edit');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleViewTemplate = (template) => {
        setSelectedTemplate(template);
        setIsViewModalOpen(true);
    };

    const handleEditTemplate = (template) => {
        setEditTemplate({
            id: template.id,
            name: template.name,
            subject: template.subject,
            content: template.content
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (template) => {
        setTemplateToDelete(template);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteTemplate = async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));

            // Optimistically update the UI
            const updatedTemplates = templates.filter(t => t.id !== templateToDelete.id);
            setTemplates(updatedTemplates);
            if (db) {
                await saveToIndexedDB(db, 'templates', updatedTemplates);
            }

            const response = await fetch(`${BASE_URL}/api/admin/marketing/templates/${templateToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete template');
            }

            toast.success('Template deleted successfully', {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });

            setIsDeleteModalOpen(false);
        } catch (err) {
            // Revert the UI change if the API call fails
            setTemplates(templates);
            if (db) {
                await saveToIndexedDB(db, 'templates', templates);
            }

            toast.error(err.message, {
                position: "bottom-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
            });
        }
    };

    const handleOpenConfigModal = () => {
        setIsConfigModalOpen(true);
    };

    const handleTabChange = (tab) => (e) => {
        e.preventDefault();
        setActiveTab(tab);
    };

    const handleEditTabChange = (tab) => (e) => {
        e.preventDefault();
        setEditActiveTab(tab);
    };

    const columns = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'subject',
            header: 'Subject',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'createdAt',
            header: 'Created At',
            cell: (info) => new Date(info.getValue()).toLocaleDateString()
        },
        {
            accessorKey: 'updatedAt',
            header: 'Updated At',
            cell: (info) => new Date(info.getValue()).toLocaleDateString()
        },
        {
            accessorKey: 'actions',
            header: "Actions",
            cell: ({ row }) => (
                <div className="hstack gap-2 justify-content-end">
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleViewTemplate(row.original)}
                    >
                        <FiEye />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleEditTemplate(row.original)}
                    >
                        <FiEdit />
                    </button>
                    <button
                        className="avatar-text avatar-md"
                        onClick={() => handleDeleteClick(row.original)}
                    >
                        <FiTrash />
                    </button>
                </div>
            ),
            meta: { headerClassName: 'text-end' }
        },
    ], []);

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

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <h4 className="mb-0 me-md-3">Marketing Templates</h4>
                <div className="ms-auto d-flex flex-column flex-sm-row gap-2">
                    <Button
                        variant="contained"
                        onClick={handleOpenConfigModal}
                        className="d-flex align-items-center gap-2 justify-content-center"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiMail /> Email Configure
                    </Button>
                    <Button
                        variant="contained"
                        href="https://www.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex align-items-center gap-2 justify-content-center"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiBook /> Template Library
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setIsModalOpen(true)}
                        className="d-flex align-items-center gap-2 justify-content-center"
                        style={{ backgroundColor: '#0092ff', color: 'white' }}
                    >
                        <FiPlus /> Add Template
                    </Button>
                </div>
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : templates.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={templates}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            {/* Add Template Modal */}
            <Modal show={isModalOpen} onHide={() => {
                setIsModalOpen(false);
                setNewTemplate({ name: '', subject: '', content: '' });
                setFormErrors({});
                setActiveTab('edit');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Template</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="name" className="form-label">Name</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                id="name"
                                name="name"
                                value={newTemplate.name}
                                onChange={handleInputChange}
                            />
                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="subject" className="form-label">Subject</label>
                            <input
                                type="text"
                                className={`form-control ${formErrors.subject ? 'is-invalid' : ''}`}
                                id="subject"
                                name="subject"
                                value={newTemplate.subject}
                                onChange={handleInputChange}
                            />
                            {formErrors.subject && <div className="invalid-feedback">{formErrors.subject}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="content" className="form-label">Content</label>
                            <ul className="nav nav-tabs mb-3">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'edit' ? 'active' : ''}`}
                                        onClick={handleTabChange('edit')}
                                        type="button"
                                    >
                                        Edit
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'preview' ? 'active' : ''}`}
                                        onClick={handleTabChange('preview')}
                                        type="button"
                                    >
                                        Preview
                                    </button>
                                </li>
                            </ul>

                            {activeTab === 'edit' ? (
                                <textarea
                                    className={`form-control ${formErrors.content ? 'is-invalid' : ''}`}
                                    id="content"
                                    name="content"
                                    value={newTemplate.content}
                                    onChange={handleInputChange}
                                    rows="7"
                                />
                            ) : (
                                <div
                                    className="border p-3 bg-light"
                                    style={{ minHeight: '200px' }}
                                    dangerouslySetInnerHTML={{ __html: newTemplate.content }}
                                />
                            )}
                            {formErrors.content && <div className="invalid-feedback">{formErrors.content}</div>}
                        </div>
                    </form>
                    <h8 className="form-text mb-2">
                        HTML code is supported. Switch between tabs to edit and preview.
                    </h8>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Create
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Template Modal */}
            <Modal show={isEditModalOpen} onHide={() => {
                setIsEditModalOpen(false);
                setEditFormErrors({});
                setEditActiveTab('edit');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Template</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleEditSubmit}>
                        <div className="mb-3">
                            <label htmlFor="edit-name" className="form-label">Name</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                                id="edit-name"
                                name="name"
                                value={editTemplate.name}
                                onChange={handleEditInputChange}
                            />
                            {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-subject" className="form-label">Subject</label>
                            <input
                                type="text"
                                className={`form-control ${editFormErrors.subject ? 'is-invalid' : ''}`}
                                id="edit-subject"
                                name="subject"
                                value={editTemplate.subject}
                                onChange={handleEditInputChange}
                            />
                            {editFormErrors.subject && <div className="invalid-feedback">{editFormErrors.subject}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="edit-content" className="form-label">Content</label>
                            <ul className="nav nav-tabs mb-3">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${editActiveTab === 'edit' ? 'active' : ''}`}
                                        onClick={handleEditTabChange('edit')}
                                        type="button"
                                    >
                                        Edit
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${editActiveTab === 'preview' ? 'active' : ''}`}
                                        onClick={handleEditTabChange('preview')}
                                        type="button"
                                    >
                                        Preview
                                    </button>
                                </li>
                            </ul>

                            {editActiveTab === 'edit' ? (
                                <textarea
                                    className={`form-control ${editFormErrors.content ? 'is-invalid' : ''}`}
                                    id="edit-content"
                                    name="content"
                                    value={editTemplate.content}
                                    onChange={handleEditInputChange}
                                    rows="7"
                                />
                            ) : (
                                <div
                                    className="border p-3 bg-light"
                                    style={{ minHeight: '200px' }}
                                    dangerouslySetInnerHTML={{ __html: editTemplate.content }}
                                />
                            )}
                            {editFormErrors.content && <div className="invalid-feedback">{editFormErrors.content}</div>}
                        </div>
                    </form>
                    <h8 className="form-text mb-2">
                        HTML code is supported. Switch between tabs to edit and preview.
                    </h8>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleEditSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Update
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View Template Modal */}
            <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Template Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTemplate && (
                        <div>
                            <div className="mb-4">
                                <h5>Name</h5>
                                <h8>{selectedTemplate.name}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Subject</h5>
                                <h8>{selectedTemplate.subject}</h8>
                            </div>
                            <div className="mb-4">
                                <h5>Content</h5>
                                <div
                                    className="border p-3 bg-light"
                                    style={{ minHeight: '200px' }}
                                    dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                                />
                            </div>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h5>Created At</h5>
                                    <h8>{new Date(selectedTemplate.createdAt).toLocaleString()}</h8>
                                </div>
                                <div className="col-md-6">
                                    <h5>Updated At</h5>
                                    <h8>{new Date(selectedTemplate.updatedAt).toLocaleString()}</h8>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onHide={() => setIsDeleteModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Delete Template</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {templateToDelete && (
                        <>
                            <h8>Are you sure you want to delete the template <strong>{templateToDelete.name}</strong>? </h8>
                            <h8>This action cannot be undone.</h8>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleDeleteTemplate}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Email Configuration Modal */}
            <Modal show={isConfigModalOpen} onHide={() => {
                setIsConfigModalOpen(false);
                setEmailConfig({ fromEmail: '', appPassword: '' });
                setConfigFormErrors({});
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Email Configuration</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleConfigSubmit}>
                        <div className="mb-3">
                            <label htmlFor="fromEmail" className="form-label">From Email</label>
                            <input
                                type="email"
                                className={`form-control ${configFormErrors.fromEmail ? 'is-invalid' : ''}`}
                                id="fromEmail"
                                name="fromEmail"
                                value={emailConfig.fromEmail}
                                onChange={handleConfigInputChange}
                            />
                            {configFormErrors.fromEmail && <div className="invalid-feedback">{configFormErrors.fromEmail}</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor="appPassword" className="form-label">App Password</label>
                            <input
                                type="password"
                                className={`form-control ${configFormErrors.appPassword ? 'is-invalid' : ''}`}
                                id="appPassword"
                                name="appPassword"
                                value={emailConfig.appPassword}
                                onChange={handleConfigInputChange}
                                placeholder="Enter new app password"
                            />
                            {configFormErrors.appPassword && <div className="invalid-feedback">{configFormErrors.appPassword}</div>}
                            <h8 className="form-text">
                                Note: This is the app-specific password for your email account, not your regular password.
                            </h8>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="contained"
                        onClick={handleConfigSubmit}
                        style={{ backgroundColor: '#1976d2', color: 'white' }}
                    >
                        Save Configuration
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default TemplatesTable;