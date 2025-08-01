import React, { useEffect, useState, useCallback } from 'react';
import Table from '@/components/shared/table/Table';
import { BASE_URL } from '/src/constants.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    FaWallet,
    FaMoneyBillWave,
    FaArrowUp,
    FaArrowDown,
    FaExchangeAlt,
    FaChartLine,
    FaChartBar,
    FaPiggyBank,
    FaCreditCard,
    FaPlus,
    FaToggleOn,
    FaToggleOff,
    FaTrash,
    FaSync
} from 'react-icons/fa';
import { Modal, Button, Form } from 'react-bootstrap';

// IndexedDB setup
const DB_NAME = 'FinanceDB';
const DB_VERSION = 1;
const STORE_TRANSACTIONS = 'transactions';
const STORE_PAYMENT_METHODS = 'paymentMethods';
const STORE_SUMMARY = 'summary';

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
                db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_PAYMENT_METHODS)) {
                db.createObjectStore(STORE_PAYMENT_METHODS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_SUMMARY)) {
                db.createObjectStore(STORE_SUMMARY, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getFromDB = async (storeName, key) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getAllFromDB = async (storeName) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveToDB = async (storeName, data) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        if (Array.isArray(data)) {
            data.forEach(item => store.put(item));
        } else {
            store.put(data);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const deleteFromDB = async (storeName, key) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const TransactionsTable = () => {
    const authData = JSON.parse(localStorage.getItem("authData"));
    const userRole = authData?.role;
    const userPermissions = authData?.permissions || [];
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';
    const skinTheme = localStorage.getItem('skinTheme') || 'light';
    const isDarkMode = skinTheme === 'dark';

    const hasPermission = (permission) => {
        if (userRole === 'CLIENT_ADMIN') return true;
        return userPermissions.includes(permission);
    };

    const canDelete = hasPermission('FINANCE_DELETE');
    const canUpdate = hasPermission('FINANCE_UPDATE');
    const canWrite = hasPermission('FINANCE_WRITE');

    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
    const [forceRefresh, setForceRefresh] = useState(false);

    // Modals state
    const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddWithdrawal, setShowAddWithdrawal] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [paymentMethodToDelete, setPaymentMethodToDelete] = useState(null);

    // Form states
    const [newPaymentMethod, setNewPaymentMethod] = useState({
        name: '',
        type: 'CASH',
        description: '',
        active: true,
        default: false
    });

    const [newTransaction, setNewTransaction] = useState({
        type: '',
        amount: '',
        paymentMethodId: '',
        description: '',
        category: '',
        reference: '',
        transactionDate: new Date().toISOString().slice(0, 16)
    });

    const [paymentMethodTypes] = useState([
        { value: 'CASH', label: 'Cash' },
        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
        { value: 'CARD', label: 'Credit/Debit Card' },
        { value: 'DIGITAL_WALLET', label: 'Digital Wallet' }
    ]);

    const [transactionCategories] = useState([
        { value: 'SALES', label: 'Sales' },
        { value: 'SERVICE', label: 'Service' },
        { value: 'RENT', label: 'Rent' },
        { value: 'UTILITIES', label: 'Utilities' },
        { value: 'SALARY', label: 'Salary' },
        { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
        { value: 'MARKETING', label: 'Marketing' },
        { value: 'TRAVEL', label: 'Travel' },
        { value: 'PERSONAL', label: 'Personal' },
        { value: 'OTHER', label: 'Other' }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const SkeletonLoader = () => {
        return (
            <div className="table-responsive">
                <table className="table table-hover table-nowrap">
                    <thead>
                        <tr>
                            <th scope="col">Type</th>
                            <th scope="col">Amount</th>
                            <th scope="col">Payment Method</th>
                            <th scope="col">Description</th>
                            <th scope="col">Category</th>
                            <th scope="col">Reference</th>
                            <th scope="col">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(10)].map((_, index) => (
                            <tr key={index}>
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
                                        width={120}
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const SummaryCardSkeleton = () => {
        return (
            <>
                <div className="row mb-4">
                    {[...Array(4)].map((_, index) => (
                        <div className="col-md-3 col-sm-6 mb-3" key={index}>
                            <div className="card h-100">
                                <div className="card-body">
                                    <Skeleton
                                        height={20}
                                        width="60%"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                    <Skeleton
                                        height={30}
                                        width="80%"
                                        className="mt-2"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                    <Skeleton
                                        height={15}
                                        width="90%"
                                        className="mt-3"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="row mb-4">
                    {[...Array(4)].map((_, index) => (
                        <div className="col-md-3 col-sm-6 mb-3" key={index}>
                            <div className="card h-100">
                                <div className="card-body">
                                    <Skeleton
                                        height={20}
                                        width="60%"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                    <Skeleton
                                        height={30}
                                        width="80%"
                                        className="mt-2"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                    <Skeleton
                                        height={15}
                                        width="90%"
                                        className="mt-3"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="row mb-4">
                    {[...Array(2)].map((_, index) => (
                        <div className="col-md-3 col-sm-6 mb-3" key={index}>
                            <div className="card h-100">
                                <div className="card-body">
                                    <Skeleton
                                        height={20}
                                        width="60%"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                    <Skeleton
                                        height={30}
                                        width="80%"
                                        className="mt-2"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                    <Skeleton
                                        height={15}
                                        width="90%"
                                        className="mt-3"
                                        baseColor={isDarkMode ? "#1e293b" : "#f3f3f3"}
                                        highlightColor={isDarkMode ? "#334155" : "#ecebeb"}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
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
                <h5 className="mb-2">No Transactions Found</h5>
                <p className="text-muted mb-4">There are no transactions to display.</p>
            </div>
        );
    };

    const handleUpdatePaymentMethodStatus = async (paymentMethodId, newStatus) => {
        try {
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
            if (!paymentMethod) {
                toast.error("Payment method not found");
                return;
            }

            const updatedData = {
                name: paymentMethod.name,
                type: paymentMethod.type,
                description: paymentMethod.description,
                active: newStatus,
                default: paymentMethod.default
            };

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/payment-methods/${paymentMethodId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update payment method status');
            }

            const data = await response.json();
            if (data.status === 200) {
                toast.success("Payment method status updated successfully");
                // Update local state and IndexedDB
                const updatedPaymentMethods = paymentMethods.map(pm =>
                    pm.id === paymentMethodId ? { ...pm, active: newStatus } : pm
                );
                setPaymentMethods(updatedPaymentMethods);
                await saveToDB(STORE_PAYMENT_METHODS, updatedPaymentMethods);
            } else {
                throw new Error(data.message || 'Failed to update payment method status');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeletePaymentMethod = async () => {
        try {
            if (!paymentMethodToDelete) return;

            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodToDelete);
            if (!paymentMethod) {
                toast.error("Payment method not found");
                return;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/payment-methods/${paymentMethodToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: paymentMethod.name,
                    type: paymentMethod.type,
                    description: paymentMethod.description,
                    active: paymentMethod.active,
                    default: paymentMethod.default
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete payment method');
            }

            const data = await response.json();
            if (data.status === 200) {
                toast.success("Payment method deleted successfully");
                // Update local state and IndexedDB
                const updatedPaymentMethods = paymentMethods.filter(pm => pm.id !== paymentMethodToDelete);
                setPaymentMethods(updatedPaymentMethods);
                await deleteFromDB(STORE_PAYMENT_METHODS, paymentMethodToDelete);
                await saveToDB(STORE_PAYMENT_METHODS, updatedPaymentMethods);
                fetchSummary(true); // Force refresh summary
            } else {
                throw new Error(data.message || 'Failed to delete payment method');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setShowDeleteConfirmation(false);
            setPaymentMethodToDelete(null);
        }
    };

    const openDeleteConfirmation = (paymentMethodId) => {
        setPaymentMethodToDelete(paymentMethodId);
        setShowDeleteConfirmation(true);
    };

    const fetchTransactions = useCallback(async (force = false) => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            // Check if we have cached data and not forcing refresh
            if (!force) {
                const cachedTransactions = await getAllFromDB(STORE_TRANSACTIONS);
                if (cachedTransactions && cachedTransactions.length > 0) {
                    setTransactions(cachedTransactions);
                    setLoading(false);
                }
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/transactions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch transactions');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                const transactionsData = data.data.content || [];
                setTransactions(transactionsData);
                await saveToDB(STORE_TRANSACTIONS, transactionsData);
            } else {
                throw new Error(data.message || 'Failed to fetch transactions');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSummary = useCallback(async (force = false) => {
        try {
            setSummaryLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            // Check if we have cached data and not forcing refresh
            if (!force) {
                const cachedSummary = await getFromDB(STORE_SUMMARY, 'current');
                if (cachedSummary) {
                    setSummary(cachedSummary);
                    setSummaryLoading(false);
                }
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/summary`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch summary');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setSummary(data.data);
                await saveToDB(STORE_SUMMARY, { ...data.data, id: 'current' });
            } else {
                throw new Error(data.message || 'Failed to fetch summary');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    const fetchPaymentMethods = useCallback(async (force = false) => {
        try {
            setPaymentMethodsLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                toast.error("Authentication token not found");
                return;
            }

            // Check if we have cached data and not forcing refresh
            if (!force) {
                const cachedPaymentMethods = await getAllFromDB(STORE_PAYMENT_METHODS);
                if (cachedPaymentMethods && cachedPaymentMethods.length > 0) {
                    setPaymentMethods(cachedPaymentMethods);
                    setPaymentMethodsLoading(false);
                }
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/payment-methods`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch payment methods');
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                setPaymentMethods(data.data);
                await saveToDB(STORE_PAYMENT_METHODS, data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch payment methods');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPaymentMethodsLoading(false);
        }
    }, []);

    const handleAddPaymentMethod = async () => {
        try {
            setIsSubmitting(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            if (!authData?.token) {
                toast.error("Authentication token not found", { className: 'toast-error' });
                return;
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/payment-methods`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newPaymentMethod)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to add payment method');
            }

            toast.success("Payment method added successfully", { className: 'toast-success' });
            setShowAddPaymentMethod(false);
            setNewPaymentMethod({
                name: '',
                type: 'CASH',
                description: '',
                active: true,
                default: false
            });

            // Refresh data and update IndexedDB
            await Promise.all([
                fetchPaymentMethods(true),
                fetchSummary(true)
            ]);

        } catch (err) {
            toast.error(err.message, { className: 'toast-error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTransaction = async (type) => {
        try {
            setIsSubmitting(true);
            const authData = JSON.parse(localStorage.getItem("authData"));

            // Validate authentication
            if (!authData?.token) {
                toast.error("Authentication token not found", { className: 'toast-error' });
                return;
            }

            // Prepare transaction data with proper types
            const transactionData = {
                ...newTransaction,
                type: type.toUpperCase(), // Ensure consistent casing
                amount: parseFloat(newTransaction.amount),
                transactionDate: new Date(newTransaction.transactionDate).toISOString()
            };

            // Validate amount
            if (isNaN(transactionData.amount)) {  // Now properly closed
                throw new Error("Invalid amount value");
            }

            const response = await fetch(`${BASE_URL}/api/client-admin/finance/transactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Failed to add ${type.toLowerCase()} transaction`);
            }

            // Success handling
            toast.success(`${type} transaction added successfully`, { className: 'toast-success' });

            // Close the appropriate modal based on transaction type
            const modalSetters = {
                INCOME: setShowAddIncome,
                EXPENSE: setShowAddExpense,
                WITHDRAWAL: setShowAddWithdrawal
            };
            modalSetters[type]?.(false);

            // Reset form
            setNewTransaction({
                type: '',
                amount: '',
                paymentMethodId: '',
                description: '',
                category: '',
                reference: '',
                transactionDate: new Date().toISOString().slice(0, 16) // Default to current datetime
            });

            // Refresh data and update IndexedDB
            await Promise.all([
                fetchTransactions(true),
                fetchSummary(true)
            ]);

        } catch (err) {
            toast.error(err.message, { className: 'toast-error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForceRefresh = () => {
        setForceRefresh(prev => !prev);
    };

    useEffect(() => {
        fetchTransactions();
        fetchSummary();
        fetchPaymentMethods();
    }, [fetchTransactions, fetchSummary, fetchPaymentMethods, forceRefresh]);

    const columns = React.useMemo(() => [
        {
            accessorKey: 'type',
            header: 'Type',
            cell: (info) => {
                const type = info.getValue();
                let color = '';
                let badgeClass = 'badge ';

                if (type === 'INCOME') {
                    color = 'text-success';
                    badgeClass += 'bg-success';
                }
                if (type === 'EXPENSE') {
                    color = 'text-danger';
                    badgeClass += 'bg-danger';
                }
                if (type === 'WITHDRAWAL') {
                    color = 'text-warning';
                    badgeClass += 'bg-warning';
                }

                return (
                    <span className={`badge ${badgeClass}`}>
                        {type}
                    </span>
                );
            }
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: (info) => {
                const amount = info.getValue();
                const type = info.row.original.type;
                let color = '';
                if (type === 'INCOME') color = 'text-success';
                if (type === 'EXPENSE') color = 'text-danger';
                if (type === 'WITHDRAWAL') color = 'text-warning';

                return <span className={color}>{currencySymbol}{amount.toFixed(2)}</span>;
            }
        },
        {
            accessorKey: 'paymentMethodName',
            header: 'Payment Method',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'reference',
            header: 'Reference',
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'transactionDate',
            header: 'Date',
            cell: (info) => {
                const date = new Date(info.getValue());
                return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            }
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

            {/* Add Payment Method Modal */}
            <Modal show={showAddPaymentMethod} onHide={() => setShowAddPaymentMethod(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add New Payment Method</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. Cash Account, Bank Account"
                                value={newPaymentMethod.name}
                                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label style={{
                                color: '#0092ff',
                                fontWeight: '500',
                                marginBottom: '0.5rem',
                                fontSize: '0.875rem'
                            }}>
                                Type
                            </Form.Label>
                            <Form.Select
                                value={newPaymentMethod.type}
                                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value })}
                                style={{
                                    backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                }}
                            >
                                {paymentMethodTypes.map((type) => (
                                    <option
                                        key={type.value}
                                        value={type.value}
                                        style={{
                                            color: '#000000ff',
                                            backgroundColor: 'white',
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        {type.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Optional description"
                                value={newPaymentMethod.description}
                                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, description: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3 d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center">
                                <Form.Check
                                    type="checkbox"
                                    checked={newPaymentMethod.active}
                                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, active: e.target.checked })}
                                    className="me-2"
                                />
                                <h8 className="m-0">Active</h8>
                            </div>
                            <div className="d-flex align-items-center">
                                <Form.Check
                                    type="checkbox"
                                    checked={newPaymentMethod.default}
                                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, default: e.target.checked })}
                                    className="me-2"
                                />
                                <h8 className="m-0">Set as default payment method</h8>
                            </div>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {canWrite && (
                        <Button variant="primary" onClick={handleAddPaymentMethod} disabled={isSubmitting || !newPaymentMethod.name}>
                            {isSubmitting ? 'Adding...' : 'Add Payment Method'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Add Income Modal */}
            <Modal show={showAddIncome} onHide={() => setShowAddIncome(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Income Transaction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Amount</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="Enter amount"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Payment Method
                                    </Form.Label>
                                    <Form.Select
                                        value={newTransaction.paymentMethodId}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethodId: e.target.value })}
                                        required
                                        style={{
                                            backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                        }}
                                    >
                                        <option value="" style={{
                                            color: '#6c757d',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem'
                                        }}>
                                            Select payment method
                                        </option>
                                        {paymentMethods.map((method) => (
                                            <option
                                                key={method.id}
                                                value={method.id}
                                                style={{
                                                    color: '#000000ff',
                                                    backgroundColor: '#fff',
                                                    fontSize: '0.9rem',
                                                    padding: '0.5rem 1rem'
                                                }}
                                            >
                                                {method.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Enter description"
                                value={newTransaction.description}
                                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem',
                                        display: 'block'
                                    }}>
                                        Category
                                    </Form.Label>
                                    <Form.Select
                                        value={newTransaction.category}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                        required
                                        style={{
                                            backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                        }}
                                    >
                                        <option value="" style={{
                                            color: '#6c757d',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem'
                                        }}>
                                            Select category
                                        </option>
                                        {transactionCategories.map((category) => (
                                            <option
                                                key={category.value}
                                                value={category.value}
                                                style={{
                                                    color: '#000000ff',
                                                    backgroundColor: '#fff',
                                                    fontSize: '0.9rem',
                                                    padding: '0.5rem 1rem'
                                                }}
                                            >
                                                {category.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Date & Time</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={newTransaction.transactionDate}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Reference</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter reference"
                                value={newTransaction.reference}
                                onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {canWrite && (
                        <Button variant="primary" onClick={() => handleAddTransaction('INCOME')}
                            disabled={isSubmitting || !newTransaction.amount || !newTransaction.paymentMethodId || !newTransaction.description || !newTransaction.category}>
                            {isSubmitting ? 'Adding...' : 'Add Income'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Add Expense Modal */}
            <Modal show={showAddExpense} onHide={() => setShowAddExpense(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Expense Transaction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Amount</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="Enter amount"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem',
                                        display: 'block'
                                    }}>
                                        Payment Method
                                    </Form.Label>
                                    <Form.Select
                                        value={newTransaction.paymentMethodId}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethodId: e.target.value })}
                                        required
                                        style={{
                                            backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                        }}
                                    >
                                        <option value="" style={{
                                            color: '#6c757d',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem'
                                        }}>
                                            Select payment method
                                        </option>
                                        {paymentMethods.map((method) => (
                                            <option
                                                key={method.id}
                                                value={method.id}
                                                style={{
                                                    color: '#000000ff',
                                                    backgroundColor: '#fff',
                                                    fontSize: '0.9rem',
                                                    padding: '0.5rem 1rem'
                                                }}
                                            >
                                                {method.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Enter description"
                                value={newTransaction.description}
                                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem',
                                        display: 'block'
                                    }}>
                                        Category
                                    </Form.Label>
                                    <Form.Select
                                        value={newTransaction.category}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                        required
                                        style={{
                                            backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                        }}
                                    >
                                        <option value="" style={{
                                            color: '#6c757d',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem'
                                        }}>
                                            Select category
                                        </option>
                                        {transactionCategories.map((category) => (
                                            <option
                                                key={category.value}
                                                value={category.value}
                                                style={{
                                                    color: '#000000ff',
                                                    backgroundColor: '#fff',
                                                    fontSize: '0.9rem',
                                                    padding: '0.5rem 1rem'
                                                }}
                                            >
                                                {category.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Date & Time</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={newTransaction.transactionDate}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Reference</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter reference"
                                value={newTransaction.reference}
                                onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {canWrite && (
                        <Button variant="primary" onClick={() => handleAddTransaction('EXPENSE')}
                            disabled={isSubmitting || !newTransaction.amount || !newTransaction.paymentMethodId || !newTransaction.description || !newTransaction.category}>
                            {isSubmitting ? 'Adding...' : 'Add Expense'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Add Withdrawal Modal */}
            <Modal show={showAddWithdrawal} onHide={() => setShowAddWithdrawal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Add Withdrawal Transaction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Amount</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="Enter amount"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem',
                                        display: 'block'
                                    }}>
                                        Payment Method
                                    </Form.Label>
                                    <Form.Select
                                        value={newTransaction.paymentMethodId}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethodId: e.target.value })}
                                        required
                                        style={{
                                            backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                        }}
                                    >
                                        <option value="" style={{
                                            color: '#6c757d',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem'
                                        }}>
                                            Select payment method
                                        </option>
                                        {paymentMethods.map((method) => (
                                            <option
                                                key={method.id}
                                                value={method.id}
                                                style={{
                                                    color: '#000000ff',
                                                    backgroundColor: '#fff',
                                                    fontSize: '0.9rem',
                                                    padding: '0.5rem 1rem'
                                                }}
                                            >
                                                {method.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Enter description"
                                value={newTransaction.description}
                                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label style={{
                                        color: '#0092ff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem',
                                        display: 'block'
                                    }}>
                                        Category
                                    </Form.Label>
                                    <Form.Select
                                        value={newTransaction.category}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                        required
                                        style={{
                                            backgroundColor: 'transparent', cursor: 'pointer', paddingRight: '2.5rem', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%230092ff\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px', appearance: 'none',
                                        }}
                                    >
                                        <option value="" style={{
                                            color: '#6c757d',
                                            backgroundColor: '#fff',
                                            fontSize: '0.9rem',
                                            padding: '0.5rem 1rem'
                                        }}>
                                            Select category
                                        </option>
                                        <option
                                            value="PERSONAL"
                                            style={{
                                                color: '#000000ff',
                                                backgroundColor: '#fff',
                                                fontSize: '0.9rem',
                                                padding: '0.5rem 1rem'
                                            }}
                                        >
                                            Personal
                                        </option>
                                        <option
                                            value="OTHER"
                                            style={{
                                                color: '#000000ff',
                                                backgroundColor: '#fff',
                                                fontSize: '0.9rem',
                                                padding: '0.5rem 1rem'
                                            }}
                                        >
                                            Other
                                        </option>
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Date & Time</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={newTransaction.transactionDate}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Reference</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter reference"
                                value={newTransaction.reference}
                                onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {canWrite && (
                        <Button variant="primary" onClick={() => handleAddTransaction('WITHDRAWAL')}
                            disabled={isSubmitting || !newTransaction.amount || !newTransaction.paymentMethodId || !newTransaction.description || !newTransaction.category}>
                            {isSubmitting ? 'Adding...' : 'Add Withdrawal'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Finance Management</h4>
            </div>

            {/* Summary Cards */}
            {summaryLoading ? (
                <SummaryCardSkeleton />
            ) : summary ? (
                <>
                    <div className="row mb-4">
                        {/* Current Balance Card */}
                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-80px',
                                    right: '0',
                                    width: '160px',
                                    height: '160px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center">
                                            <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Current Balance</h6>
                                            <FaSync
                                                className="ms-2"
                                                size={16}
                                                style={{ cursor: 'pointer', opacity: 0.8 }}
                                                onClick={handleForceRefresh}
                                                title="Refresh data"
                                            />
                                        </div>
                                        <FaWallet size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.currentBalance.toFixed(2)}
                                    </h3>
                                    <div className="mt-auto text-white" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9,
                                        marginTop: '16px'
                                    }}>
                                        Overall available balance
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Total Income</h6>
                                        <FaArrowUp size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-2" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.totalIncome.toFixed(2)}
                                    </h3>
                                    <div className="text-white mb-3" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9
                                    }}>
                                        All-time income
                                    </div>
                                    <div className="mt-auto">
                                        {canWrite && (
                                            <Button
                                                variant="light"
                                                className="me-2"
                                                onClick={() => setShowAddIncome(true)}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    fontWeight: '500',
                                                    padding: '8px 16px',
                                                    background: 'rgba(255, 255, 255, 1)',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                            >
                                                <FaPlus className="me-1" /> Add Income
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Total Expenses</h6>
                                        <FaArrowDown size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-2" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.totalExpenses.toFixed(2)}
                                    </h3>
                                    <div className="text-white mb-3" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9
                                    }}>
                                        All-time expenses
                                    </div>
                                    <div className="mt-auto">
                                        {canWrite && (
                                            <Button
                                                variant="light"
                                                className="me-2"
                                                onClick={() => setShowAddExpense(true)}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    fontWeight: '500',
                                                    padding: '8px 16px',
                                                    background: 'rgba(255, 255, 255, 1)',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                            >
                                                <FaPlus className="me-1" /> Add Expense
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Total Withdrawals</h6>
                                        <FaMoneyBillWave size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-2" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.totalWithdrawals.toFixed(2)}
                                    </h3>
                                    <div className="text-white mb-3" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9
                                    }}>
                                        All-time withdrawals
                                    </div>
                                    <div className="mt-auto">
                                        {canWrite && (
                                            <Button
                                                variant="light"
                                                className="me-2"
                                                onClick={() => setShowAddWithdrawal(true)}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    fontWeight: '500',
                                                    padding: '8px 16px',
                                                    background: 'rgba(255, 255, 255, 1)',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                            >
                                                <FaPlus className="me-1" /> Add Withdrawal
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mb-4">
                        {/* Monthly Income Card */}
                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Monthly Income</h6>
                                        <FaChartLine size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.monthlyIncome.toFixed(2)}
                                    </h3>
                                    <div className="mt-auto text-white" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9,
                                        marginTop: '16px'
                                    }}>
                                        This month's income
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Expenses Card */}
                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Monthly Expenses</h6>
                                        <FaChartBar size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.monthlyExpenses.toFixed(2)}
                                    </h3>
                                    <div className="mt-auto text-white" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9,
                                        marginTop: '16px'
                                    }}>
                                        This month's expenses
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profit Card */}
                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Profit</h6>
                                        <FaArrowUp size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.profit.toFixed(2)}
                                    </h3>
                                    <div className="mt-auto text-white" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9,
                                        marginTop: '16px'
                                    }}>
                                        Net profit
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loss Card */}
                        <div className="col-md-3 col-sm-6 mb-3">
                            <div className="card text-white h-100" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                border: 'none',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: '0 4px 20px rgba(0, 146, 255, 0.2)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50px',
                                    right: '-50px',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }} />
                                <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="card-title mb-0" style={{ fontWeight: 600 }}>Loss</h6>
                                        <FaArrowDown size={24} style={{ opacity: 0.8 }} />
                                    </div>
                                    <h3 className="text-light mb-0" style={{ fontSize: '28px', fontWeight: 600 }}>
                                        {currencySymbol}{summary.loss.toFixed(2)}
                                    </h3>
                                    <div className="mt-auto text-white" style={{
                                        fontSize: '0.8rem',
                                        opacity: 0.9,
                                        marginTop: '16px'
                                    }}>
                                        Net loss
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4>Payment Methods</h4>
                    </div>
                    {/* Add Delete Confirmation Modal */}
                    <Modal
                        show={showDeleteConfirmation}
                        onHide={() => setShowDeleteConfirmation(false)}
                        centered
                        dialogClassName="modal-dialog-centered"
                    >
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="w-100 text-center">Confirm Deletion</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="text-center py-4">
                            {paymentMethodToDelete && (
                                <>
                                    <h8>Are you sure you want to delete this payment method?</h8>
                                    <p className="text-danger mb-0">This action cannot be undone.</p>
                                </>
                            )}
                        </Modal.Body>
                        <Modal.Footer className="border-0 justify-content-center">
                            <Button
                                variant="outline-secondary"
                                onClick={() => setShowDeleteConfirmation(false)}
                                style={{ minWidth: '100px' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDeletePaymentMethod}
                                style={{ minWidth: '100px' }}
                            >
                                Delete
                            </Button>
                        </Modal.Footer>
                    </Modal>
                    <div className="row mb-4">
                        {summary.paymentMethodBalances?.map((method, index) => {
                            const paymentMethod = paymentMethods.find(pm => pm.name === method.paymentMethodName);
                            const isActive = paymentMethod?.active;
                            return (
                                <div className="col-md-3 col-sm-6 mb-3" key={index}>
                                    <div className={`card text-white h-100`} style={isActive ? {
                                        background: 'linear-gradient(135deg, #ff00c8ff 0%, #4d00a4ff 100%)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        boxShadow: '0 4px 20px rgba(247, 0, 255, 0.2)'
                                    } : {
                                        background: '#6c757d',
                                        borderRadius: '12px',
                                        border: 'none'
                                    }}>
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-50px',
                                                right: '-50px',
                                                width: '200px',
                                                height: '200px',
                                                borderRadius: '50%',
                                                background: 'rgba(255, 255, 255, 0.1)'
                                            }} />
                                        )}
                                        <div className="card-body d-flex flex-column" style={{ padding: '24px', zIndex: 1 }}>
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h6 className="card-title mb-0 d-flex align-items-center" style={{ fontWeight: 600 }}>
                                                    <FaWallet size={20} className="me-2" />
                                                    <span className="ms-2">{method.paymentMethodName}</span>
                                                </h6>
                                                {canUpdate && (
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (paymentMethod) {
                                                                handleUpdatePaymentMethodStatus(paymentMethod.id, !paymentMethod.active);
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {isActive ? (
                                                            <FaToggleOn size={24} style={{ color: 'white', opacity: 0.8 }} />
                                                        ) : (
                                                            <FaToggleOff size={24} className="text-light" style={{ opacity: 0.8 }} />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className={`mb-0 ${method.balance > 0 ? 'text-light' :
                                                method.balance < 0 ? 'text-danger' : 'text-light'
                                                }`} style={{ fontSize: '28px', fontWeight: 600 }}>
                                                {currencySymbol}{method.balance.toFixed(2)}
                                            </h3>
                                            <div className="mt-auto d-flex justify-content-between align-items-center">
                                                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                {paymentMethod && !paymentMethod.default && canDelete && (
                                                    <FaTrash
                                                        className="text-white"
                                                        style={{
                                                            cursor: 'pointer',
                                                            opacity: 0.7,
                                                            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDeleteConfirmation(paymentMethod.id);
                                                        }}
                                                        title="Delete payment method"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {canWrite && (
                            <div className="col-md-3 col-sm-6 mb-3">
                                <div
                                    className="card h-100 d-flex align-items-center justify-content-center"
                                    style={{
                                        border: '2px dashed var(--bs-gray-400)',
                                        cursor: 'pointer',
                                        background: 'transparent',
                                        height: '115px',
                                        transition: 'all 0.2s ease',
                                        minHeight: '115px',
                                        borderRadius: '12px'
                                    }}
                                    onClick={() => setShowAddPaymentMethod(true)}
                                >
                                    <div className="card-body text-center d-flex flex-column align-items-center justify-content-center p-3">
                                        <FaPlus
                                            className="me-1"
                                            size={24}
                                            style={{ color: 'var(--bs-gray-600)' }}
                                        />
                                        <h6 className="mb-0 mt-2" style={{ color: 'var(--bs-gray-600)' }}>
                                            Add Payment Method
                                        </h6>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : null
            }

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Transaction History</h4>
            </div>
            {
                loading ? (
                    <SkeletonLoader />
                ) : transactions.length === 0 ? (
                    <EmptyState />
                ) : (
                    <Table
                        data={transactions}
                        columns={columns}
                        initialState={{ pagination: { pageSize: 10 } }}
                    />
                )
            }
        </>
    );
};

export default TransactionsTable;