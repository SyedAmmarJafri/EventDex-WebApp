import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Spin,
    message,
    Typography,
    Tag,
    Divider,
    Badge,
    Button
} from 'antd';
import {
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip
} from 'recharts';
import axios from 'axios';
import moment from 'moment';
import {
    ShoppingCartOutlined,
    DollarOutlined,
    UserOutlined,
    SyncOutlined,
    FireOutlined,
    WarningOutlined,
    ArrowUpOutlined
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { Title, Text } = Typography;

const COLORS = ['#005ece', '#0092ff', '#EC4899', '#F43F5E', '#F59E0B', '#10B981'];

// IndexedDB setup
const DB_NAME = 'DashboardDB';
const DB_VERSION = 1;
const STORE_NAME = 'dashboardData';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache validity

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const getCachedData = async () => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('dashboard');

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const data = request.result;
                // Check if cached data exists and is still valid
                if (data && Date.now() - data.timestamp < CACHE_TTL) {
                    resolve(data.value);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB error:', error);
        return null;
    }
};

const cacheData = async (data) => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put({ id: 'dashboard', value: data, timestamp: Date.now() });
    } catch (error) {
        console.error('IndexedDB caching error:', error);
    }
};

// Custom Table component with improved UI
const CustomTable = ({ data, columns }) => {
    return (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table
                className="table table-nowrap"
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    margin: '16px 0',
                    fontSize: '14px'
                }}
            >
                <thead>
                    <tr style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb'
                    }}>
                        {columns.map(column => (
                            <th
                                key={column.key}
                                scope="col"
                                style={{
                                    padding: '12px 16px',
                                    textAlign: column.align || 'left',
                                    fontWeight: 600,
                                    color: '#374151'
                                }}
                            >
                                {column.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr
                            key={item.key || index}
                            style={{
                                borderBottom: '1px solid #e5e7eb',
                                ':hover': { backgroundColor: '#f9fafb' }
                            }}
                        >
                            {columns.map(column => (
                                <td
                                    key={column.key}
                                    style={{
                                        padding: '12px 16px',
                                        verticalAlign: 'middle',
                                        textAlign: column.align || 'left'
                                    }}
                                >
                                    {column.render ? column.render(item[column.dataIndex], item) : item[column.dataIndex]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            // First try to load from cache
            const cachedData = await getCachedData();
            if (cachedData) {
                setDashboardData(cachedData);
                setLoading(false);
            }

            // Then fetch fresh data in the background
            fetchDashboardData(false);
        };

        loadData();
    }, []);

    const fetchDashboardData = async (forceRefresh = true) => {
        try {
            if (forceRefresh) {
                setIsRefreshing(true);
            } else if (dashboardData && !forceRefresh) {
                // If we already have data and this isn't a forced refresh,
                // we can skip showing the loading spinner
                setLoading(false);
            } else {
                setLoading(true);
            }

            const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

            if (!token) {
                message.error('Authentication token not found');
                return;
            }

            const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = response.data.data;
            setDashboardData(data);
            await cacheData(data);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            if (forceRefresh) {
                message.error('Failed to refresh dashboard data');
            } else if (!dashboardData) {
                message.error('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const formatOrderStatusData = () => {
        if (!dashboardData?.orderStatusDistribution) return [];
        return Object.entries(dashboardData.orderStatusDistribution).map(([status, count]) => ({
            name: status,
            value: count
        }));
    };

    const orderStatusColors = {
        CREATED: '#000000ff',
        COMPLETED: '#0abe00ff',
        DELIVERED: '#10b981',
        ACCEPTED: '#0092ff',
        ASSIGNED: '#e802cdff',
        PENDING: '#6a6a6aff',
        REJECTED: '#b10101ff'
    };

    const recentOrdersColumns = [
        {
            title: 'Order Number',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            render: (text) => <Text strong style={{ color: '#111827' }} className="text-dark">{text}</Text>
        },
        {
            title: 'Customer',
            dataIndex: 'customerName',
            key: 'customerName',
            render: (text) => <Text style={{ color: '#4b5563' }} className="text-dark">{text}</Text>
        },
        {
            title: 'Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount) => <Text strong style={{ color: '#0092ff' }}>{currencySymbol}{amount.toFixed(2)}</Text>,
            align: 'right'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={orderStatusColors[status]} style={{ textTransform: 'capitalize' }}>
                    {status.toLowerCase()}
                </Tag>
            )
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => <Text style={{ color: '#6b7280' }} className="text-dark">{moment(date).format('MMM D, YYYY h:mm A')}</Text>
        }
    ];

    const topSellingColumns = [
        {
            title: 'Item Name',
            dataIndex: 'itemName',
            key: 'itemName',
            render: (text) => <Text strong style={{ color: '#111827' }} className="text-dark">{text}</Text>
        },
        {
            title: 'Quantity Sold',
            dataIndex: 'quantitySold',
            key: 'quantitySold',
            render: (quantity) => (
                <Tag color="#0abe00ff" icon={<FireOutlined />}>
                    {quantity}
                </Tag>
            ),
            align: 'right'
        }
    ];

    const lowStockColumns = [
        {
            title: 'Product',
            dataIndex: 'itemName',
            key: 'itemName',
            render: (text) => <Text className="text-dark">{text}</Text>
        },
        {
            title: 'Stock Level',
            dataIndex: 'currentStock',
            key: 'currentStock',
            render: (stock) => (
                <Text className="text-dark">
                    {stock} in stock
                </Text>
            )
        },
        {
            title: 'Threshold',
            dataIndex: 'threshold',
            key: 'threshold',
            render: (threshold) => (
                <Text className="text-dark">Threshold: {threshold}</Text>
            )
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                const { currentStock } = record;
                const isOutOfStock = currentStock === 0;

                return (
                    <Tag Status Distribution
                        color={isOutOfStock ? '#000000ff' : '#b10101ff'}
                        style={{ fontWeight: 500 }}
                    >
                        {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                    </Tag>
                );
            }
        }
    ];

    // Get currency settings from localStorage
    const authData = JSON.parse(localStorage.getItem("authData"));
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

    return (
        <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '24px'
        }}>
            <div style={{
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Title level={3} style={{
                    margin: 0,
                    fontWeight: 600,
                    color: '#111827'
                }}>
                    Dashboard
                </Title>
                <Button
                    type="primary"
                    onClick={() => fetchDashboardData(true)}
                    loading={isRefreshing}
                    icon={<SyncOutlined spin={isRefreshing} />}
                    style={{
                        fontWeight: '500',
                        background: '#0092ff',
                        border: 'none',
                        boxShadow: '0 1px 3px rgba(16, 148, 185, 0.3)',
                    }}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>

            {loading && !dashboardData && (
                <div style={{
                    textAlign: 'center',
                    padding: '80px 0',
                    background: '#fff',
                    borderRadius: '12px'
                }} className="card bg-white text-light">
                    <Spin size="large" tip="Loading dashboard data..." />
                </div>
            )}

            {dashboardData && (
                <>
                    <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className="card bg-white text-light"
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '12px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#ECFDF5',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px'
                                    }} className="card bg-white text-light">
                                        <DollarOutlined style={{ fontSize: '16px', color: '#0092ff' }} />
                                    </div>
                                    <div>
                                        <Text className="text-dark" style={{ fontSize: '12px' }}>Today's Revenue</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {currencySymbol}{dashboardData.todayRevenue.toFixed(2)}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text className="text-dark" style={{ fontSize: '12px' }}>Total: {currencySymbol}{dashboardData.totalRevenue.toFixed(2)}</Text>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className="card bg-white text-light"
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '12px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#ECFDF5',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px'
                                    }} className="card bg-white text-light">
                                        <ShoppingCartOutlined style={{ fontSize: '16px', color: '#0092ff' }} />
                                    </div>
                                    <div>
                                        <Text className="text-dark" style={{ fontSize: '12px' }}>Today's Orders</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {dashboardData.todayOrders}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text className="text-dark" style={{ fontSize: '12px' }}>Total: {dashboardData.totalOrders}</Text>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className="card bg-white text-light"
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '12px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#ECFDF5',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px'
                                    }} className="card bg-white text-light">
                                        <UserOutlined style={{ fontSize: '16px', color: '#0092ff' }} />
                                    </div>
                                    <div>
                                        <Text className="text-dark" style={{ fontSize: '12px' }}>Today's Customers</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {dashboardData.todayCustomers}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text className="text-dark" style={{ fontSize: '12px' }}>Total: {dashboardData.totalCustomers}</Text>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className="card bg-white text-light"
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '12px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#ECFDF5',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px'
                                    }} className="card bg-white text-light">
                                        <DollarOutlined style={{ fontSize: '16px', color: '#0092ff' }} />
                                    </div>
                                    <div>
                                        <Text className="text-dark" style={{ fontSize: '12px' }}>Avg. Order Value</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {currencySymbol}{dashboardData.averageOrderValue.toFixed(2)}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text className="text-dark" style={{ fontSize: '12px' }}>Products: {dashboardData.activeProducts}</Text>
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                        <Col xs={24} lg={12}>
                            <Card
                                className="card bg-white text-light"
                                title={<Text strong style={{ fontSize: '14px' }} className="text-dark">Order Status Distribution</Text>}
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                bodyStyle={{ padding: '12px 0' }}
                                extra={
                                    <Tag color="#0092ff" style={{ fontSize: '12px' }}>
                                        {moment().format('MMM D, YYYY')}
                                    </Tag>
                                }
                            >
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart width={400} height={300}>
                                        <Pie
                                            data={formatOrderStatusData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {formatOrderStatusData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend
                                            layout="vertical"
                                            align="right"
                                            verticalAlign="middle"
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{ fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card
                                className="card bg-white text-light"
                                title={<Text strong style={{ fontSize: '14px' }} className="text-dark">Recent Orders</Text>}
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '12px 0' }}
                                extra={
                                    <Tag color="#0092ff" style={{ fontSize: '12px' }}>
                                        Last 10 Orders
                                    </Tag>
                                }
                            >
                                <CustomTable
                                    columns={recentOrdersColumns}
                                    data={dashboardData.recentOrders}
                                    scroll={{ y: 240 }}
                                    size="small"
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                            <Card
                                className="card bg-white text-light"
                                title={<Text strong style={{ fontSize: '14px' }} className="text-dark">Top Selling Items</Text>}
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                bodyStyle={{ padding: '12px 0' }}
                                extra={
                                    <Tag color="#0abe00ff" icon={<FireOutlined style={{ fontSize: '12px' }} />} style={{ fontSize: '12px' }}>
                                        Best Sellers
                                    </Tag>
                                }
                            >
                                <CustomTable
                                    columns={topSellingColumns}
                                    data={dashboardData.topSellingItems}
                                    size="small"
                                    scroll={{ y: 240 }}
                                    pagination={false}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card
                                className="card bg-white text-light"
                                title={<Text strong style={{ fontSize: '14px' }} className="text-dark">Low Stock Items</Text>}
                                bordered={false}
                                style={{
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                bodyStyle={{ padding: '12px 0' }}
                                extra={
                                    <Tag color="#c30000ff" icon={<WarningOutlined style={{ fontSize: '12px' }} />} style={{ fontSize: '12px' }}>
                                        Needs Restocking
                                    </Tag>
                                }
                            >
                                <CustomTable
                                    columns={lowStockColumns}
                                    data={dashboardData.lowStockItems}
                                    size="small"
                                    scroll={{ y: 240 }}
                                    pagination={false}
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

export default Dashboard;