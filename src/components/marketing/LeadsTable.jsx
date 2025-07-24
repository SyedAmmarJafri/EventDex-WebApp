import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';

const MarketingTable = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isSending, setIsSending] = useState(false);
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    // Toast notification helpers
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
                <h5 className="mb-2">No Customers Found</h5>
                <p className="text-muted mb-4">Your customer list is currently empty. New customers will appear here when they register.</p>
            </div>
        );
    };

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

    // Fetch customers
    const fetchCustomers = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/admin/customers`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch customers');
            }

            const data = await response.json();
            if (data.data && data.data.content) {
                setCustomers(data.data.content);
            } else {
                throw new Error(data.message || 'Failed to fetch customers');
            }
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch templates
    const fetchTemplates = useCallback(async () => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
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
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            showErrorToast(err.message);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchTemplates();
    }, [fetchCustomers, fetchTemplates]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getStatusBadge = (status) => {
        if (!status) return null;

        const statusMap = {
            'Active': { color: 'bg-emerald', label: 'Active' },
            'Inactive': { color: 'bg-red', label: 'Inactive' },
            'New': { color: 'bg-blue', label: 'New' },
            'Regular': { color: 'bg-green1', label: 'Regular' },
            'Frequent': { color: 'bg-purple', label: 'Frequent' },
            'Occasional': { color: 'bg-yellow', label: 'Occasional' },
            'High-value': { color: 'bg-orange', label: 'High-value' },
        };

        const statusInfo = statusMap[status] || { color: 'bg-secondary', label: status };
        return <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>;
    };

    const getTooltipContent = (classification, reason) => {
        return (
            <div className="tooltip-content">
                {reason}
            </div>
        );
    };

    // Handle row selection
    const handleRowSelect = (row) => {
        const isSelected = selectedRows.some(selectedRow => selectedRow.id === row.id);
        if (isSelected) {
            setSelectedRows(selectedRows.filter(selectedRow => selectedRow.id !== row.id));
        } else {
            setSelectedRows([...selectedRows, row]);
        }
    };

    // Handle select all rows
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedRows([]);
        } else {
            setSelectedRows([...customers]);
        }
        setSelectAll(!selectAll);
    };

    // Handle template selection
    const handleTemplateChange = (e) => {
        setSelectedTemplate(e.target.value);
    };

    // Handle send campaign
    const handleSendCampaign = async () => {
        if (!selectedTemplate) {
            showErrorToast('Please select a template');
            return;
        }

        if (selectedRows.length === 0) {
            showErrorToast('Please select at least one customer');
            return;
        }

        try {
            setIsSending(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const customerIds = selectedRows.map(row => row.id);
            const response = await fetch(`${BASE_URL}/api/admin/marketing/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notificationType: "EMAIL",
                    templateId: selectedTemplate,
                    customerIds: customerIds
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send campaign');
            }

            showSuccessToast('Campaign sent successfully!');
            setSelectedRows([]);
            setSelectedTemplate('');
            setSelectAll(false);
        } catch (err) {
            showErrorToast(err.message);
        } finally {
            setIsSending(false);
        }
    };

    // Skeleton loader component
    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col" style={{ width: '40px' }}>
                                <Skeleton
                                    width={20}
                                    height={20}
                                    baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                    highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                />
                            </th>
                            <th scope="col">Name</th>
                            <th scope="col">Email</th>
                            <th scope="col">Verified</th>
                            <th scope="col">Customer Segment</th>
                            <th scope="col">Active Status</th>
                            <th scope="col">Order Frequency</th>
                            <th scope="col">Total Orders</th>
                            <th scope="col">Last Order</th>
                            <th scope="col">Joined Date</th>
                            <th scope="col" className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
                                <td style={{ width: '40px' }}>
                                    <Skeleton
                                        width={20}
                                        height={20}
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
                                        width={150}
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </td>
                                <td>
                                    <Skeleton
                                        width={60}
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
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const columns = React.useMemo(() => [
        {
            id: 'selection',
            header: ({ table }) => (
                <div className="form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                        }}
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedRows.some(selectedRow => selectedRow.id === row.original.id)}
                        onChange={() => handleRowSelect(row.original)}
                        style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                        }}
                    />
                </div>
            ),
            size: 40,
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: (info) => info.getValue() || '-'
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: (info) => (
                <div className="d-flex align-items-center gap-1">
                    {info.getValue()}
                    {info.row.original.verified ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#0d6efd" className="bi bi-patch-check-fill" viewBox="0 0 16 16">
                            <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#dc3545" className="bi bi-patch-exclamation-fill" viewBox="0 0 16 16">
                            <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
                        </svg>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'customerSegment',
            header: 'Customer Segment',
            cell: (info) => {
                const segment = info.getValue();
                return (
                    <div className="tooltip-container">
                        {getStatusBadge(segment?.classification)}
                        <div className="tooltip">
                            {getTooltipContent(segment?.classification, segment?.reason)}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: 'activeStatus',
            header: 'Active Status',
            cell: (info) => {
                const status = info.getValue();
                return (
                    <div className="tooltip-container">
                        {getStatusBadge(status?.classification)}
                        <div className="tooltip">
                            {getTooltipContent(status?.classification, status?.reason)}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: 'orderFrequency',
            header: 'Order Frequency',
            cell: (info) => {
                const frequency = info.getValue();
                return (
                    <div className="tooltip-container">
                        {getStatusBadge(frequency?.classification)}
                        <div className="tooltip">
                            {getTooltipContent(frequency?.classification, frequency?.reason)}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: 'totalOrders',
            header: 'Total Orders',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'lastOrderDate',
            header: 'Last Order',
            cell: (info) => formatDate(info.getValue())
        },
        {
            accessorKey: 'createdAt',
            header: 'Joined Date',
            cell: (info) => formatDate(info.getValue())
        },
    ], [selectAll, selectedRows]);

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
                <h4>Marketing</h4>
                {selectedRows.length > 0 && (
                    <div className="d-flex align-items-center gap-3">
                        <span className="text-muted">{selectedRows.length} selected</span>
                        <Form.Select
                            size="sm"
                            style={{ width: '200px' }}
                            value={selectedTemplate}
                            onChange={handleTemplateChange}
                            disabled={isSending}
                        >
                            <option value="">Select Template</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </Form.Select>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSendCampaign}
                            disabled={!selectedTemplate || isSending}
                        >
                            {isSending ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2"
                                    />
                                    Sending...
                                </>
                            ) : (
                                'Send Campaign'
                            )}
                        </Button>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setSelectedRows([])}
                            disabled={isSending}
                        >
                            Clear Selection
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : customers.length === 0 ? (
                <EmptyState />
            ) : (
                <Table
                    data={customers}
                    columns={columns}
                    initialState={{ pagination: { pageSize: 10 } }}
                />
            )}

            <style>
                {`
                /* Custom badge colors */
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
                
                /* Tooltip styles */
                .tooltip-container {
                    position: relative;
                    display: inline-block;
                }
                
                .tooltip {
                    visibility: hidden;
                    width: 200px;
                    background-color: ${isDarkMode ? '#1e293b' : '#ffffff'};
                    color: ${isDarkMode ? '#ffffff' : '#000000'};
                    text-align: left;
                    border-radius: 6px;
                    padding: 8px;
                    position: absolute;
                    z-index: 1;
                    bottom: 125%;
                    left: 50%;
                    margin-left: -100px;
                    opacity: 0;
                    transition: opacity 0.3s;
                    border: 1px solid ${isDarkMode ? '#334155' : '#e5e7eb'};
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                
                .tooltip-container:hover .tooltip {
                    visibility: visible;
                    opacity: 1;
                }
                
                .tooltip-content {
                    font-size: 0.875rem;
                    line-height: 1.4;
                }

                /* Checkbox styles */
                .form-check-input {
                    width: 18px;
                    height: 18px;
                    margin-top: 0;
                }

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
                `}
            </style>
        </>
    );
};

export default MarketingTable;