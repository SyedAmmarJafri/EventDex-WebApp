import React, { useState, useEffect, useCallback } from 'react';
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
    Space,
    Statistic,
    Grid,
    Progress,
    List
} from 'antd';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    PieChart,
    Pie,
    Legend,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import axios from 'axios';
import moment from 'moment-timezone';
import {
    TeamOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    UserOutlined,
    RiseOutlined,
    FallOutlined,
    SyncOutlined,
    CalendarOutlined,
    DollarOutlined,
    ShoppingCartOutlined,
    WarningOutlined,
    BarChartOutlined,
    PieChartOutlined,
    HomeOutlined,
    DashboardOutlined,
    BarChartOutlined as ChartOutlined
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const COLORS = ['#0092ff', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f59e0b'];
const CHART_COLORS = {
    primary: '#0092ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6'
};

// Custom Tooltip component for Charts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)'
            }}>
                <Text strong style={{ display: 'block', color: '#111827', marginBottom: '8px', fontSize: '14px' }}>
                    {label}
                </Text>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: entry.color,
                            borderRadius: '2px',
                            marginRight: '8px'
                        }} />
                        <Text style={{ fontSize: '13px', color: '#6b7280' }}>
                            {entry.name}: <Text strong style={{ color: '#111827' }}>{entry.value}</Text>
                        </Text>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Modern Stat Card Component
const StatCard = ({ title, value, icon, color, trend, suffix, loading, size = 'medium' }) => {
    const screens = useBreakpoint();
    
    const getCardSize = () => {
        switch (size) {
            case 'large':
                return {
                    padding: screens.xs ? '16px' : '20px',
                    iconSize: screens.xs ? '36px' : '44px',
                    fontSize: screens.xs ? '20px' : '24px',
                    titleSize: screens.xs ? '12px' : '14px'
                };
            case 'medium':
            default:
                return {
                    padding: screens.xs ? '16px' : '20px',
                    iconSize: screens.xs ? '32px' : '40px',
                    fontSize: screens.xs ? '18px' : '22px',
                    titleSize: screens.xs ? '12px' : '14px'
                };
        }
    };

    const sizeConfig = getCardSize();

    return (
        <Card
            bordered={false}
            style={{
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                height: '100%',
                minHeight: '140px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #f1f5f9',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
            }}
            bodyStyle={{ 
                padding: sizeConfig.padding,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
            className="stat-card-hover"
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                    <Text style={{ 
                        fontSize: sizeConfig.titleSize, 
                        color: '#64748b',
                        fontWeight: 600,
                        display: 'block',
                        marginBottom: '8px'
                    }}>
                        {title}
                    </Text>
                    {loading ? (
                        <div style={{ height: size === 'large' ? '40px' : '32px', display: 'flex', alignItems: 'center' }}>
                            <Spin size="small" />
                        </div>
                    ) : (
                        <Statistic
                            value={value}
                            suffix={suffix}
                            valueStyle={{
                                fontSize: sizeConfig.fontSize,
                                fontWeight: 700,
                                color: '#1e293b',
                                margin: '4px 0',
                                lineHeight: 1.2
                            }}
                        />
                    )}
                </div>
                <div style={{
                    width: sizeConfig.iconSize,
                    height: sizeConfig.iconSize,
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '16px',
                    border: `1px solid ${color}20`
                }}>
                    {React.cloneElement(icon, { 
                        style: { 
                            fontSize: '18px', 
                            color: color 
                        } 
                    })}
                </div>
            </div>
            
            {trend && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: trend.direction === 'up' ? '#10b98110' : '#ef444410',
                    borderRadius: '8px',
                    border: `1px solid ${trend.direction === 'up' ? '#10b98120' : '#ef444420'}`
                }}>
                    {trend.direction === 'up' ? (
                        <RiseOutlined style={{ color: '#10b981', fontSize: '14px', marginRight: '6px' }} />
                    ) : (
                        <FallOutlined style={{ color: '#ef4444', fontSize: '14px', marginRight: '6px' }} />
                    )}
                    <Text style={{ 
                        fontSize: '12px', 
                        color: trend.direction === 'up' ? '#10b981' : '#ef4444',
                        fontWeight: 600
                    }}>
                        {trend.value}
                    </Text>
                </div>
            )}
        </Card>
    );
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [registrationStats, setRegistrationStats] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(moment());
    const [timezone, setTimezone] = useState('UTC');
    const screens = useBreakpoint();

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
    const token = authData?.token;
    const userName = authData?.username || 'Admin';
    const userRole = authData?.role;
    const userPermissions = authData?.permissions || [];
    const hasAnalyticsPermission = userRole === 'PATRON' || userPermissions.includes('ANALYTICS_READ');

    useEffect(() => {
        if (authData?.timezone) {
            setTimezone(authData.timezone);
        }

        const loadData = async () => {
            setLoading(true);
            const cachedRegistration = await getCachedData('registrations');
            if (cachedRegistration) {
                setRegistrationStats(cachedRegistration);
            }

            if (hasAnalyticsPermission) {
                await fetchRegistrationStats(false);
            }
            
            setLoading(false);
        };

        loadData();
    }, []);

    const fetchRegistrationStats = async (forceRefresh = true) => {
        if (!token) {
            message.error('Authentication token not found');
            return;
        }

        try {
            if (forceRefresh) {
                setIsRefreshing(true);
            }

            const response = await axios.get(`${BASE_URL}/api/registrations/admin/statistics`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = response.data.data;
            setRegistrationStats(data);
            await cacheData('registrations', data);

        } catch (error) {
            console.error('Error fetching registration statistics:', error);
            if (forceRefresh) {
                message.error('Failed to refresh registration statistics');
            } else if (!registrationStats) {
                message.error('Failed to load registration statistics');
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    // Format data for charts
    const formatDailyRegistrationData = () => {
        if (!registrationStats?.dailyRegistrations) return [];
        return Object.entries(registrationStats.dailyRegistrations).map(([date, count]) => ({
            date,
            registrations: count,
            confirmed: registrationStats.dailyConfirmed?.[date] || 0
        }));
    };

    const formatRegistrationTypeData = () => {
        if (!registrationStats) return [];
        return [
            { name: 'Team Registrations', value: registrationStats.teamRegistrations, color: CHART_COLORS.primary },
            { name: 'Solo Registrations', value: registrationStats.soloRegistrations, color: CHART_COLORS.success }
        ];
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(moment().tz(timezone));
        }, 1000);

        return () => clearInterval(interval);
    }, [timezone]);

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        await fetchRegistrationStats(true);
        setIsRefreshing(false);
        message.success('Dashboard refreshed successfully');
    };

    // All Statistics Cards - Same size
    const mainStatsCards = [
        {
            title: 'Total Registrations',
            value: registrationStats?.totalRegistrations || 0,
            icon: <FileTextOutlined />,
            color: CHART_COLORS.primary,
            trend: { direction: 'up', value: `Today: ${registrationStats?.todayRegistrations || 0}` }
        },
        {
            title: 'Confirmed Registrations',
            value: registrationStats?.confirmedRegistrations || 0,
            icon: <CheckCircleOutlined />,
            color: CHART_COLORS.success,
            trend: { direction: 'up', value: `Today: ${registrationStats?.todayConfirmed || 0}` }
        },
        {
            title: 'Pending Payments',
            value: registrationStats?.pendingPayments || 0,
            icon: <ClockCircleOutlined />,
            color: CHART_COLORS.warning,
            trend: { direction: 'down', value: 'Need attention' }
        }
    ];

    // Secondary Statistics Cards (Same size as main)
    const secondaryStatsCards = [
        {
            title: 'Approved Payments',
            value: registrationStats?.approvedPayments || 0,
            icon: <CheckCircleOutlined />,
            color: CHART_COLORS.success
        },
        {
            title: 'Rejected Payments',
            value: registrationStats?.rejectedPayments || 0,
            icon: <CloseCircleOutlined />,
            color: CHART_COLORS.error
        },
        {
            title: 'Team Registrations',
            value: registrationStats?.teamRegistrations || 0,
            icon: <TeamOutlined />,
            color: CHART_COLORS.primary
        },
        {
            title: 'Solo Registrations',
            value: registrationStats?.soloRegistrations || 0,
            icon: <UserOutlined />,
            color: CHART_COLORS.info
        }
    ];

    // Add some CSS for hover effects
    const cardHoverStyles = `
        .stat-card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px rgba(0,0,0,0.12);
        }
    `;

    // IndexedDB functions
    const getCachedData = async (key) => {
        try {
            const db = await openDB();
            const transaction = db.transaction('dashboardData', 'readonly');
            const store = transaction.objectStore('dashboardData');
            const request = store.get(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const data = request.result;
                    if (data && Date.now() - data.timestamp < (10 * 60 * 1000)) {
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

    const cacheData = async (key, data) => {
        try {
            const db = await openDB();
            const transaction = db.transaction('dashboardData', 'readwrite');
            const store = transaction.objectStore('dashboardData');
            store.put({ id: key, value: data, timestamp: Date.now() });
        } catch (error) {
            console.error('IndexedDB caching error:', error);
        }
    };

    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('DashboardDB', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('dashboardData')) {
                    db.createObjectStore('dashboardData', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    return (
        <>
            <style>{cardHoverStyles}</style>
            <div style={{
                maxWidth: '1800px',
                margin: '0 auto',
                padding: screens.xs ? '16px' : '24px',
                minHeight: '100vh'
            }}>
                {/* Header Section */}
                <div style={{
                    marginBottom: '32px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexDirection: screens.xs ? 'column' : 'row',
                    gap: screens.xs ? '16px' : '0'
                }}>
                    <Space direction="vertical" size={screens.xs ? 8 : 12}>
                        <Title level={1} style={{
                            margin: 0,
                            fontWeight: 800,
                            color: '#1e293b',
                            fontSize: screens.xs ? '24px' : '32px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Home Dashboard
                        </Title>
                        <Text style={{
                            color: '#64748b',
                            fontSize: screens.xs ? '14px' : '16px',
                            fontWeight: 500
                        }}>
                            Welcome back, {userName}! Real-time insights into your event registrations.
                        </Text>
                    </Space>

                    {hasAnalyticsPermission && (
                        <Button
                            type="primary"
                            onClick={handleRefreshAll}
                            loading={isRefreshing}
                            icon={<SyncOutlined spin={isRefreshing} />}
                            style={{
                                fontWeight: '600',
                                background: 'linear-gradient(135deg, #af0000ff 0%, #840000ff 100%)',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(175, 0, 0, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 20px',
                                height: 'auto',
                                fontSize: '14px'
                            }}
                        >
                            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                        </Button>
                    )}
                </div>

                {/* Welcome Card */}
                <Card
                    style={{
                        marginBottom: '40px',
                        background: 'linear-gradient(135deg, #af0000ff 0%, #840000ff 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        position: 'relative',
                        overflow: 'hidden',
                        border: 'none'
                    }}
                    bodyStyle={{ 
                        padding: screens.xs ? '20px' : '32px',
                        position: 'relative',
                        zIndex: 2
                    }}
                >
                    {/* Background Elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-80px',
                        right: '-80px',
                        width: '300px',
                        height: '300px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        zIndex: 1
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '-100px',
                        right: '40px',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        zIndex: 1
                    }} />
                    
                    <Row align="middle" gutter={[32, 32]}>
                        <Col xs={24} lg={16}>
                            <Title level={2} style={{ 
                                color: 'white', 
                                margin: 0, 
                                fontWeight: 700,
                                fontSize: screens.xs ? '18px' : '24px',
                                lineHeight: 1.2
                            }}>
                                <UserOutlined style={{ marginRight: '12px' }} />
                                Welcome {userName}!
                            </Title>
                            <Text style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                display: 'block',
                                marginTop: '12px',
                                fontSize: screens.xs ? '13px' : '15px',
                                lineHeight: 1.6,
                                fontWeight: 500
                            }}>
                                Comprehensive analytics dashboard showing date-wise registration trends, 
                                payment status distribution, and domain-wise participation insights.
                            </Text>
                            <Button 
                                type="default" 
                                icon={<CalendarOutlined />}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: '12px',
                                    marginTop: '20px',
                                    backdropFilter: 'blur(10px)',
                                    padding: '12px 20px',
                                    height: 'auto',
                                    fontSize: '14px'
                                }}
                            >
                                <span style={{ 
                                    color: '#ffffff', 
                                    fontSize: screens.xs ? '12px' : '14px',
                                }}>
                                    {currentTime.format('dddd, MMMM D, YYYY · h:mm:ss A')}
                                </span>
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* Permission Message */}
                {!hasAnalyticsPermission && (
                    <Card style={{ 
                        marginBottom: '32px', 
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: '1px solid #f59e0b20'
                    }}>
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <WarningOutlined style={{ fontSize: '56px', color: '#f59e0b', marginBottom: '20px' }} />
                            <Title level={3} style={{ color: '#92400e', marginBottom: '12px' }}>
                                Access Restricted
                            </Title>
                            <Text style={{ color: '#b45309', fontSize: '16px' }}>
                                You don't have permission to view registration analytics. Please contact your administrator.
                            </Text>
                        </div>
                    </Card>
                )}

                {/* Loading State */}
                {hasAnalyticsPermission && loading && !registrationStats && (
                    <div style={{
                        textAlign: 'center',
                        padding: '120px 0',
                        background: '#fff',
                        borderRadius: '20px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        <Spin size="large" tip="Loading registration analytics..." />
                    </div>
                )}

                {/* Main Content */}
                {hasAnalyticsPermission && registrationStats && (
                    <>
                        {/* Main Statistics Section */}
                        <div style={{ marginBottom: '40px' }}>
                            <Title level={2} style={{ 
                                color: '#1e293b', 
                                marginBottom: '24px', 
                                fontWeight: 700,
                                fontSize: screens.xs ? '18px' : '24px'
                            }}>
                              
                                Overview Metrics
                            </Title>
                            <Row gutter={[24, 24]}>
                                {mainStatsCards.map((card, index) => (
                                    <Col key={index} xs={24} lg={8}>
                                        <StatCard {...card} loading={loading} size="medium" />
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        {/* Secondary Statistics */}
                        <div style={{ marginBottom: '40px' }}>
                            <Title level={2} style={{ 
                                color: '#1e293b', 
                                marginBottom: '24px', 
                                fontWeight: 700,
                                fontSize: screens.xs ? '18px' : '24px'
                            }}>
                         
                                Detailed Statistics
                            </Title>
                            <Row gutter={[24, 24]}>
                                {secondaryStatsCards.map((card, index) => (
                                    <Col key={index} xs={24} sm={12} lg={6}>
                                        <StatCard {...card} loading={loading} size="medium" />
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        {/* Charts Section - Row 1 */}
                        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                            {/* Daily Registration Trend */}
                            <Col xs={24} lg={12}>
                                <Card
                                    title={
                                        <Space>
                                            <BarChartOutlined />
                                            <Text strong style={{ fontSize: '16px', color: '#1e293b' }}>
                                                7-Day Registration Trend
                                            </Text>
                                        </Space>
                                    }
                                    bordered={false}
                                    style={{ 
                                        borderRadius: '16px', 
                                        height: '100%',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}
                                    bodyStyle={{ padding: '20px' }}
                                >
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart
                                            data={formatDailyRegistrationData()}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="date" 
                                                tick={{ fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Line 
                                                type="monotone" 
                                                dataKey="registrations" 
                                                stroke={CHART_COLORS.primary}
                                                strokeWidth={3}
                                                dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: CHART_COLORS.primary }}
                                                name="Total Registrations"
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="confirmed" 
                                                stroke={CHART_COLORS.success}
                                                strokeWidth={3}
                                                dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: CHART_COLORS.success }}
                                                name="Confirmed"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Col>

                            {/* Registration Types */}
                            <Col xs={24} lg={12}>
                                <Card
                                    title={
                                        <Space>
                                            <PieChartOutlined />
                                            <Text strong style={{ fontSize: '16px', color: '#1e293b' }}>
                                                Registration Types
                                            </Text>
                                        </Space>
                                    }
                                    bordered={false}
                                    style={{ 
                                        borderRadius: '16px', 
                                        height: '100%',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}
                                    bodyStyle={{ padding: '20px' }}
                                >
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={formatRegistrationTypeData()}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                innerRadius={40}
                                                fill="#8884d8"
                                                dataKey="value"
                                                paddingAngle={2}
                                            >
                                                {formatRegistrationTypeData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend 
                                                verticalAlign="bottom" 
                                                height={36}
                                                formatter={(value) => <Text style={{ fontSize: '12px' }}>{value}</Text>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Col>
                        </Row>
                    </>
                )}
            </div>
        </>
    );
};

export default Dashboard;