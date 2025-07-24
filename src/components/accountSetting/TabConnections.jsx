import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '/src/constants.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiEdit, FiSave, FiDollarSign, FiPercent, FiTag, FiGlobe } from 'react-icons/fi';

const TabConnections = () => {
    // Initial state setup
    const initialState = {
        tax: {
            gstRate: 0,
            sstRate: 0,
            discountRate: 0,
            gstEnabled: false,
            sstEnabled: false,
            discountEnabled: false
        },
        currency: {
            currency: 'PKR',
            currencySymbol: 'Rs.',
            currencyCode: 'RS'
        }
    };

    const [config, setConfig] = useState(initialState);
    const [supportedCurrencies, setSupportedCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [tempConfig, setTempConfig] = useState(initialState);
    const [isSaving, setIsSaving] = useState(false);

    // Toast notification handler
    const showToast = useCallback((type, message, options = {}) => {
        const toastStyles = {
            error: { background: '#dc3545', color: '#fff' },
            success: { background: '#28a745', color: '#fff' },
            warning: { background: '#ffc107', color: '#212529' }
        };

        toast[type](message, {
            position: "bottom-center",
            autoClose: type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            style: toastStyles[type],
            ...options
        });
    }, []);

    // Fetch configuration data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            
            if (!authData?.token) {
                throw new Error('Authentication token not found');
            }

            const headers = {
                'Authorization': `Bearer ${authData.token}`
            };

            const [taxRes, currencyRes, supportedCurrenciesRes] = await Promise.all([
                fetch(`${BASE_URL}/api/client-admin/tax-config`, { headers }),
                fetch(`${BASE_URL}/api/client-admin/currency`, { headers }),
                fetch(`${BASE_URL}/api/client-admin/currency/supported-currencies`, { headers })
            ]);

            // Check for errors
            const errors = [];
            if (!taxRes.ok) errors.push('Failed to fetch tax configuration');
            if (!currencyRes.ok) errors.push('Failed to fetch currency configuration');
            if (!supportedCurrenciesRes.ok) errors.push('Failed to fetch supported currencies');

            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            // Parse responses
            const [taxData, currencyData, supportedCurrenciesData] = await Promise.all([
                taxRes.json(),
                currencyRes.json(),
                supportedCurrenciesRes.json()
            ]);

            // Update state with fallback values
            setConfig({
                tax: taxData.data || initialState.tax,
                currency: currencyData.data || initialState.currency
            });
            setTempConfig({
                tax: taxData.data || initialState.tax,
                currency: currencyData.data || initialState.currency
            });
            setSupportedCurrencies(Object.values(supportedCurrenciesData.data || []));
        } catch (error) {
            showToast('error', error.message);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Form handlers
    const handleTaxToggle = (field) => {
        setTempConfig(prev => ({
            ...prev,
            tax: {
                ...prev.tax,
                [field]: !prev.tax[field]
            }
        }));
    };

    const handleTaxInputChange = (e) => {
        const { name, value } = e.target;
        const parsedValue = Math.min(100, Math.max(0, parseFloat(value) || 0));
        
        setTempConfig(prev => ({
            ...prev,
            tax: {
                ...prev.tax,
                [name]: parsedValue
            }
        }));
    };

    const handleCurrencyChange = (e) => {
        const selectedCurrency = supportedCurrencies.find(
            curr => curr.currency === e.target.value
        );

        if (selectedCurrency) {
            setTempConfig(prev => ({
                ...prev,
                currency: {
                    currency: selectedCurrency.currency,
                    currencySymbol: selectedCurrency.symbol,
                    currencyCode: selectedCurrency.code
                }
            }));
        }
    };

    // Form validation
    const validateForm = useCallback(() => {
        const errors = [];
        const { tax } = tempConfig;

        if (tax.gstEnabled && (tax.gstRate <= 0 || tax.gstRate > 100)) {
            errors.push('GST rate must be between 0 and 100%');
        }

        if (tax.sstEnabled && (tax.sstRate <= 0 || tax.sstRate > 100)) {
            errors.push('SST rate must be between 0 and 100%');
        }

        if (tax.discountEnabled && (tax.discountRate < 0 || tax.discountRate > 100)) {
            errors.push('Discount rate must be between 0 and 100%');
        }

        if (!tempConfig.currency.currency || !supportedCurrencies.some(c => c.currency === tempConfig.currency.currency)) {
            errors.push('Please select a valid currency');
        }

        if (errors.length > 0) {
            showToast('warning', errors.join('\n'));
            return false;
        }

        return true;
    }, [tempConfig, supportedCurrencies, showToast]);

    // Save handler
    const handleSave = useCallback(async () => {
        if (!validateForm()) return;

        try {
            setIsSaving(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            if (!authData?.token) {
                throw new Error('Authentication token not found');
            }

            const headers = {
                'Authorization': `Bearer ${authData.token}`,
                'Content-Type': 'application/json'
            };

            const [taxRes, currencyRes] = await Promise.all([
                fetch(`${BASE_URL}/api/client-admin/tax-config`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(tempConfig.tax)
                }),
                fetch(`${BASE_URL}/api/client-admin/currency`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        currency: tempConfig.currency.currency,
                        currencySymbol: tempConfig.currency.currencySymbol,
                        currencyCode: tempConfig.currency.currencyCode
                    })
                })
            ]);

            // Check for errors
            const errors = [];
            if (!taxRes.ok) errors.push('Failed to update tax configuration');
            if (!currencyRes.ok) errors.push('Failed to update currency configuration');

            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            // Update localStorage
            const updatedAuthData = {
                ...authData,
                currencySettings: {
                    currency: tempConfig.currency.currency,
                    currencySymbol: tempConfig.currency.currencySymbol,
                    currencyCode: tempConfig.currency.currencyCode
                }
            };
            localStorage.setItem("authData", JSON.stringify(updatedAuthData));

            // Refresh data
            await fetchData();
            setEditMode(false);
            showToast('success', 'Configuration updated successfully');
        } catch (error) {
            showToast('error', error.message);
        } finally {
            setIsSaving(false);
        }
    }, [tempConfig, validateForm, fetchData, showToast]);

    // Loading state
    if (loading) {
        return (
            <div className="tab-pane fade show active" id="connectionTab" role="tabpanel">
                <div className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="tab-pane fade show active" id="connectionTab" role="tabpanel">
                <div className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="fw-bold">System Configuration</h5>
                        {editMode ? (
                            <button
                                className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FiSave size={16} /> Save
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                onClick={() => setEditMode(true)}
                            >
                                <FiEdit size={16} /> Edit
                            </button>
                        )}
                    </div>

                    {/* Currency Configuration */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className="bg-light-info p-2 rounded">
                                    <FiGlobe size={20} className="text-info" />
                                </div>
                                <h6 className="mb-0">Currency Settings</h6>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="currencySelect" className="form-label">Currency</label>
                                <select
                                    id="currencySelect"
                                    className="form-select"
                                    value={tempConfig.currency.currency}
                                    onChange={handleCurrencyChange}
                                    disabled={!editMode}
                                >
                                    {supportedCurrencies.map((currency) => (
                                        <option key={currency.currency} value={currency.currency}>
                                            {currency.currency} ({currency.symbol})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="row">
                                <div className="col-md-6">
                                    <label className="form-label">Symbol</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={tempConfig.currency.currencySymbol}
                                        readOnly
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Code</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={tempConfig.currency.currencyCode}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tax Configuration */}
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className="bg-light-warning p-2 rounded">
                                    <FiPercent size={20} className="text-warning" />
                                </div>
                                <h6 className="mb-0">Tax Settings</h6>
                            </div>

                            {/* GST Configuration */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-light-primary p-2 rounded">
                                        <FiDollarSign size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h6 className="mb-0">GST</h6>
                                        <small className="text-muted">Goods and Services Tax</small>
                                    </div>
                                </div>
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="gstToggle"
                                        checked={tempConfig.tax.gstEnabled}
                                        onChange={() => handleTaxToggle('gstEnabled')}
                                        disabled={!editMode}
                                    />
                                    <label className="form-check-label" htmlFor="gstToggle"></label>
                                </div>
                            </div>
                            {tempConfig.tax.gstEnabled && (
                                <div className="mb-3">
                                    <label htmlFor="gstRate" className="form-label">GST Rate</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            id="gstRate"
                                            className="form-control"
                                            name="gstRate"
                                            value={tempConfig.tax.gstRate}
                                            onChange={handleTaxInputChange}
                                            disabled={!editMode}
                                            step="0.01"
                                            min="0"
                                            max="100"
                                        />
                                        <span className="input-group-text">%</span>
                                    </div>
                                </div>
                            )}

                            {/* SST Configuration */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-light-warning p-2 rounded">
                                        <FiPercent size={20} className="text-warning" />
                                    </div>
                                    <div>
                                        <h6 className="mb-0">SST</h6>
                                        <small className="text-muted">Sales and Service Tax</small>
                                    </div>
                                </div>
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="sstToggle"
                                        checked={tempConfig.tax.sstEnabled}
                                        onChange={() => handleTaxToggle('sstEnabled')}
                                        disabled={!editMode}
                                    />
                                    <label className="form-check-label" htmlFor="sstToggle"></label>
                                </div>
                            </div>
                            {tempConfig.tax.sstEnabled && (
                                <div className="mb-3">
                                    <label htmlFor="sstRate" className="form-label">SST Rate</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            id="sstRate"
                                            className="form-control"
                                            name="sstRate"
                                            value={tempConfig.tax.sstRate}
                                            onChange={handleTaxInputChange}
                                            disabled={!editMode}
                                            step="0.01"
                                            min="0"
                                            max="100"
                                        />
                                        <span className="input-group-text">%</span>
                                    </div>
                                </div>
                            )}

                            {/* Discount Configuration */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-light-success p-2 rounded">
                                        <FiTag size={20} className="text-success" />
                                    </div>
                                    <div>
                                        <h6 className="mb-0">Discount</h6>
                                        <small className="text-muted">Global Discount Rate</small>
                                    </div>
                                </div>
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="discountToggle"
                                        checked={tempConfig.tax.discountEnabled}
                                        onChange={() => handleTaxToggle('discountEnabled')}
                                        disabled={!editMode}
                                    />
                                    <label className="form-check-label" htmlFor="discountToggle"></label>
                                </div>
                            </div>
                            {tempConfig.tax.discountEnabled && (
                                <div className="mb-3">
                                    <label htmlFor="discountRate" className="form-label">Discount Rate</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            id="discountRate"
                                            className="form-control"
                                            name="discountRate"
                                            value={tempConfig.tax.discountRate}
                                            onChange={handleTaxInputChange}
                                            disabled={!editMode}
                                            step="0.01"
                                            min="0"
                                            max="100"
                                        />
                                        <span className="input-group-text">%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
                theme="colored"
            />
        </>
    );
};

export default TabConnections;