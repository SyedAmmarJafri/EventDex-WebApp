import { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Spin,
    message,
    Typography,
    Tag,
    Divider,
    Button,
    Space
} from 'antd';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from 'recharts';
import axios from 'axios';
import moment from 'moment-timezone';
import {
    ShoppingCartOutlined,
    DollarOutlined,
    UserOutlined,
    SyncOutlined,
    FireOutlined,
    WarningOutlined,
    ArrowUpOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { Title, Text } = Typography;

const COLORS = ['rgb(246, 185, 0)', '#10b981', '#003b8dff', '#0092ff', '#c026d3', '#f97316', '#7c3aed', '#ad0000ff', '#00cc41ff'];

// Custom Tooltip component for BarChart
const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{
                background: 'white',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <Text strong style={{ display: 'block', color: '#111827', marginBottom: '4px' }}>
                    {data.name}
                </Text>
                <Text style={{ display: 'block', color: '#4b5563' }}>
                    Orders: <Text strong>{data.value}</Text>
                </Text>
            </div>
        );
    }
    return null;
};

// IndexedDB setup
const DB_NAME = 'DashboardDB';
const DB_VERSION = 1;
const STORE_NAME = 'dashboardData';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache validity

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
    const [currentTime, setCurrentTime] = useState(moment());
    const [timezone, setTimezone] = useState('UTC');

    // Get auth data from localStorage
    const getAuthData = () => {
        try {
            const authDataStr = localStorage.getItem("authData");
            if (authDataStr) {
                return JSON.parse(authDataStr);
            }
        } catch (error) {
            console.error("Error parsing authData from localStorage:", error);
        }
        return null;
    };

    const authData = getAuthData();
    const currencySymbol = authData?.currencySettings?.currencySymbol || '$';
    const userName = authData?.name || 'Admin';
    const userRole = authData?.role;
    const userPermissions = authData?.permissions || [];
    const hasAnalyticsPermission = userRole === 'PATRON' || userPermissions.includes('ANALYTICS_READ');

    useEffect(() => {
        // Set timezone from auth data
        if (authData?.timezone) {
            setTimezone(authData.timezone);
        }

        const loadData = async () => {
            const cachedData = await getCachedData();
            if (cachedData) {
                setDashboardData(cachedData);
                setLoading(false);
            }

            if (hasAnalyticsPermission) {
                fetchDashboardData(false);
            }
        };

        loadData();
    }, []);

    const fetchDashboardData = async (forceRefresh = true) => {
        try {
            if (forceRefresh) {
                setIsRefreshing(true);
            } else if (dashboardData && !forceRefresh) {
                setLoading(false);
            } else {
                setLoading(true);
            }

            const token = authData?.token;

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

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(moment().tz(timezone));
        }, 1000);

        return () => clearInterval(interval);
    }, [timezone]);

    // Function to format dates according to the user's timezone
    const formatDate = (dateString, format = 'MMM D, YYYY h:mm A') => {
        return moment(dateString).tz(timezone).format(format);
    };

    const orderStatusColors = {
        CREATED: '#000000ff',
        COMPLETED: '#21c600ff',
        DELIVERED: '#10b981',
        ACCEPTED: '#0092ff',
        PENDING: '#6a6a6aff',
        REJECTED: '#8B0000',
        DISPATCHED: '#7c3aed',
        ON_THE_WAY: '#c026d3',
        READY: '#ffd000ff',
        PREPARING: '#f97316'
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
            render: (date) => <Text style={{ color: '#6b7280' }} className="text-dark">{formatDate(date)}</Text>
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
                    <Tag
                        color={isOutOfStock ? '#000000ff' : '#b10101ff'}
                        style={{ fontWeight: 500 }}
                    >
                        {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                    </Tag>
                );
            }
        }
    ];

    return (
        <div style={{
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '24px 32px'
        }}>
            <div style={{
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Space direction="vertical" size={0}>
                    <Title level={3} style={{
                        margin: 0,
                        fontWeight: 600,
                        color: '#111827'
                    }}>
                        Dashboard
                    </Title>
                </Space>

                {hasAnalyticsPermission && (
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
                )}
            </div>

            <Card className="card bg-white text-light" variant="borderless" styles={{ body: { padding: '24px', background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)', color: 'white', borderRadius: '10px', position: 'relative', overflow: 'hidden' } }} style={{ marginBottom: '24px', }} >
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }} />
                <div style={{ position: 'absolute', bottom: '-80px', right: '0', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }} />
                <Row align="middle" gutter={16}>
                    <Col flex="auto">
                        <Title level={3} style={{ color: 'white', marginBottom: '8px', fontWeight: 600 }}>
                            Welcome {userName}!
                        </Title>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'block', marginBottom: '16px', fontSize: '16px' }}>
                            Here&apos;s what&apos;s happening with business today.
                        </Text>
                        <Button type="default" icon={<CalendarOutlined />} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 500, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', }} >
                            <span style={{ color: '#ffffff', fontSize: 'clamp(12px, 2vw, 16px)', }} >
                                {currentTime.format('dddd, MMMM D, YYYY · h:mm:ss A')}
                            </span>
                        </Button>
                    </Col>
                </Row>
            </Card>

            {!hasAnalyticsPermission && (
                <Card className="card bg-white text-light" bordered={false} style={{ marginBottom: '24px' }}>
                    <Text className="text-dark">
                        You don&apos;t have permission to view analytics data. Please contact your administrator.
                    </Text>
                </Card>
            )}

            {hasAnalyticsPermission && loading && !dashboardData && (
                <div style={{
                    textAlign: 'center',
                    padding: '80px 0',
                    background: '#fff',
                    borderRadius: '12px'
                }} className="card bg-white text-light">
                    <Spin size="large" tip="Loading dashboard data..." />
                </div>
            )}

            {hasAnalyticsPermission && dashboardData && (
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
                                        <Text style={{ fontSize: '12px' }} className="text-dark">Today&apos;s Revenue</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {currencySymbol}{dashboardData.todayRevenue.toFixed(2)}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text style={{ fontSize: '12px' }} className="text-dark">Total: {currencySymbol}{dashboardData.totalRevenue.toFixed(2)}</Text>
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
                                        <Text style={{ fontSize: '12px' }} className="text-dark">Today&apos;s Orders</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {dashboardData.todayOrders}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text style={{ fontSize: '12px' }} className="text-dark">Total: {dashboardData.totalOrders}</Text>
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
                                        <Text style={{ fontSize: '12px' }} className="text-dark">Today&apos;s Customers</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {dashboardData.todayCustomers}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text style={{ fontSize: '12px' }} className="text-dark">Total: {dashboardData.totalCustomers}</Text>
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
                                        <Text style={{ fontSize: '12px' }} className="text-dark">Avg. Order Value</Text>
                                        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                                            {currencySymbol}{dashboardData.averageOrderValue.toFixed(2)}
                                        </Title>
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} className="card bg-white text-light" />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpOutlined style={{ color: '#10B981', fontSize: '12px', marginRight: '6px' }} />
                                    <Text style={{ fontSize: '12px' }} className="text-dark">Products: {dashboardData.activeProducts}</Text>
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
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '12px 0' }}
                                extra={
                                    <Tag color="#0092ff" style={{ fontSize: '12px' }}>
                                        {moment().format('MMM D, YYYY')}
                                    </Tag>
                                }
                            >
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart
                                        data={formatOrderStatusData()}
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 20,
                                            bottom: 5,
                                        }}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis type="category" />
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Bar
                                            dataKey="value"
                                            name="Orders"
                                            fill="#0092ff"
                                            radius={[0, 4, 4, 0]}
                                            barSize={20}
                                        >
                                            {formatOrderStatusData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
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
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
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
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    height: '100%'
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