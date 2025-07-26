import React, { useState, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Row,
  Col,
  Spin,
  message,
  Typography,
  Space,
  Button,
  Tag,
  Divider,
  Badge,
  Progress,
  Select
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import moment from 'moment';
import axios from 'axios';
import {
  TeamOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  StarOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const COLORS = ['#005ece', '#0092ff', '#EC4899', '#F43F5E', '#F59E0B', '#10B981'];

// Get currency settings from localStorage
const authData = JSON.parse(localStorage.getItem("authData"));
const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

const CustomTable = ({ data, columns, summary }) => {
  // Calculate totals for summary row if needed
  const summaryRow = summary || columns.reduce((acc, column) => {
    if (column.dataIndex && column.isSummable) {
      acc[column.dataIndex] = data.reduce((sum, item) => sum + (item[column.dataIndex] || 0), 0);
    }
    return acc;
  }, {});

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
                key={column.key || column.dataIndex}
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
                  key={column.key || column.dataIndex}
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
        {summary && (
          <tfoot>
            <tr style={{
              borderTop: '2px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              {columns.map(column => {
                if (column.dataIndex && summaryRow[column.dataIndex] !== undefined) {
                  return (
                    <td
                      key={column.key || column.dataIndex}
                      style={{
                        padding: '12px 16px',
                        textAlign: column.align || 'left',
                        fontWeight: 600,
                        color: column.summaryColor || '#0092ff'
                      }}
                    >
                      {column.summaryRender ?
                        column.summaryRender(summaryRow[column.dataIndex]) :
                        summaryRow[column.dataIndex]}
                    </td>
                  );
                }
                return (
                  <td
                    key={column.key || column.dataIndex}
                    style={{
                      padding: '12px 16px',
                      textAlign: column.align || 'left',
                      fontWeight: column.isTotal ? 600 : 'normal'
                    }}
                  >
                    {column.isTotal ? 'Total' : ''}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

const ReportsTeam = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment().endOf('month')]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [period, setPeriod] = useState('last30days');

  useEffect(() => {
    fetchAnalyticsData();
  }, [period, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      let params = { period };

      if (period === 'custom') {
        const [startDate, endDate] = dateRange;
        params = {
          ...params,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        };
      }

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/staff`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error fetching team analytics data:', error);
      message.error('Failed to fetch team analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    if (dates) {
      setDateRange(dates);
      setPeriod('custom');
    } else {
      setDateRange([moment().startOf('month'), moment().endOf('month')]);
      setPeriod('thismonth');
    }
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    // Set default date ranges for each period
    switch (value) {
      case 'today':
        setDateRange([moment(), moment()]);
        break;
      case 'yesterday':
        setDateRange([moment().subtract(1, 'days'), moment().subtract(1, 'days')]);
        break;
      case 'last7days':
        setDateRange([moment().subtract(7, 'days'), moment()]);
        break;
      case 'last30days':
        setDateRange([moment().subtract(30, 'days'), moment()]);
        break;
      case 'thisweek':
        setDateRange([moment().startOf('week'), moment().endOf('week')]);
        break;
      case 'thismonth':
        setDateRange([moment().startOf('month'), moment().endOf('month')]);
        break;
      case 'lastmonth':
        setDateRange([moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]);
        break;
      default:
        // For custom, keep the existing range
        break;
    }
  };

  const disabledDate = (current) => {
    return current && current > moment().endOf('day');
  };

  const formatStaffPerformanceData = () => {
    if (!analyticsData?.staffPerformance) return [];
    return analyticsData.staffPerformance.map((staff, index) => ({
      ...staff,
      key: index,
      revenue: staff.totalRevenue,
      rank: index + 1
    }));
  };

  const calculatePerformanceScore = (staff) => {
    // Simple scoring based on orders and revenue (adjust weights as needed)
    const maxOrders = Math.max(...analyticsData.staffPerformance.map(s => s.ordersProcessed), 1);
    const maxRevenue = Math.max(...analyticsData.staffPerformance.map(s => s.totalRevenue), 1);

    const ordersScore = (staff.ordersProcessed / maxOrders) * 50;
    const revenueScore = (staff.totalRevenue / maxRevenue) * 50;

    return Math.round(ordersScore + revenueScore);
  };

  const StaffTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          background: '#fff',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p className="label" style={{
            marginBottom: '8px',
            fontWeight: '600',
            color: '#111827'
          }}>{`${payload[0].payload.staffName}`}</p>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#0092ff',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Orders: </span>
            <span style={{ color: '#0b0b0bff', fontWeight: '600', marginLeft: '4px' }}>{payload[0].value}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#005ece',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Revenue: </span>
            <span style={{ color: '#0b0b0bff', fontWeight: '600', marginLeft: '4px' }}>{currencySymbol}{payload[1].value.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const staffColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      render: (rank) => (
        <Badge
          count={rank}
          style={{
            backgroundColor: rank === 1 ? '#F59E0B' : rank === 2 ? '#9CA3AF' : rank === 3 ? '#B45309' : '#E5E7EB',
            color: rank <= 3 ? '#fff' : '#6b7280'
          }}
        />
      ),
      width: 80,
      align: 'center'
    },
    {
      title: 'Staff Member',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (text) => (
        <Text strong style={{ color: '#111827' }} className="text-dark">{text}</Text>
      )
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (_, record) => {
        const score = calculatePerformanceScore(record);
        return (
          <div style={{ width: '150px' }}>
            <Progress
              percent={score}
              strokeColor={
                score >= 80 ? '#10B981' :
                  score >= 50 ? '#F59E0B' : '#F43F5E'
              }
              format={percent => `${percent}%`}
              size="small"
            />
          </div>
        );
      },
      sorter: (a, b) =>
        calculatePerformanceScore(a) - calculatePerformanceScore(b),
      align: 'center'
    },
    {
      title: 'Orders Processed',
      dataIndex: 'ordersProcessed',
      key: 'ordersProcessed',
      render: (text) => (
        <Tag color="#0092ff" style={{ fontWeight: 500 }}>
          {text}
        </Tag>
      ),
      sorter: (a, b) => a.ordersProcessed - b.ordersProcessed,
      align: 'center',
      isSummable: true
    },
    {
      title: 'Revenue Generated',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (text) => (
        <Text strong style={{ color: '#10B981' }}>
          {currencySymbol}{text.toFixed(2)}
        </Text>
      ),
      summaryRender: (value) => (
        <Text strong style={{ color: '#0092ff' }}>
          {currencySymbol}{value.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.revenue - b.revenue,
      align: 'right',
      isSummable: true
    }
  ];

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
          Team Analytics
        </Title>
        <Button
          type="primary"
          onClick={fetchAnalyticsData}
          loading={loading}
          icon={<SyncOutlined spin={loading} />}
          style={{
            fontWeight: '500',
            background: '#0092ff',
            border: 'none',
            boxShadow: '0 1px 3px rgba(16, 148, 185, 0.3)',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Added Period Selection Card */}
      <Card
        className="card bg-white text-light"
        style={{ marginBottom: '24px', borderRadius: '12px' }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }} className="text-dark">Period</Text>
              <Select
                style={{ width: '100%' }}
                value={period}
                onChange={handlePeriodChange}
              >
                <Option value="today">Today</Option>
                <Option value="yesterday">Yesterday</Option>
                <Option value="last7days">Last 7 Days</Option>
                <Option value="last30days">Last 30 Days</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
            </div>
          </Col>

          {period === 'custom' && (
            <Col xs={24} md={8}>
              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ display: 'block', marginBottom: '8px' }} className="text-dark">Date Range</Text>
                <RangePicker
                  style={{
                    width: '100%',
                    backgroundColor: 'white',
                  }}
                  inputStyle={{
                    color: 'black',
                    backgroundColor: 'white',
                  }}
                  onChange={handleDateChange}
                  disabledDate={disabledDate}
                />
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 0',
          background: '#fff',
          borderRadius: '12px'
        }} className="card bg-white text-light">
          <Spin size="large" tip="Loading team analytics..." />
        </div>
      )}

      {analyticsData && !loading && (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={8}>
              <Card
                className="card bg-white text-light"
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: '#ECFDF5',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <TeamOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Staff</Text>
                    <Title level={3} style={{ margin: 0 }}>{analyticsData.totalStaff}</Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Active Staff</Text>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#0092ff'
                  }}>
                    {analyticsData.activeStaff}
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card
                className="card bg-white text-light"
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: '#ECFDF5',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <StarOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Top Performer</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analyticsData.staffPerformance[0]?.staffName || 'N/A'}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Revenue Generated</Text>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#0092ff',
                    marginTop: '4px'
                  }}>
                    {currencySymbol}{analyticsData.staffPerformance[0]?.totalRevenue.toFixed(2) || '0.00'}
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card
                className="card bg-white text-light"
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: '#ECFDF5',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <ShoppingCartOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Orders Processed</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analyticsData.staffPerformance.reduce((sum, staff) => sum + staff.ordersProcessed, 0)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Total Revenue</Text>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#0092ff',
                    marginTop: '4px'
                  }}>
                    {currencySymbol}{analyticsData.staffPerformance.reduce((sum, staff) => sum + staff.totalRevenue, 0).toFixed(2)}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Staff Performance</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
                extra={
                  <Tag color="#0092ff">
                    {analyticsData.startDate ? moment(analyticsData.startDate).format('MMM D') : ''} -{' '}
                    {analyticsData.endDate ? moment(analyticsData.endDate).format('MMM D') : ''}
                  </Tag>
                }
              >
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={formatStaffPerformanceData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="staffName"
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <Tooltip content={<StaffTooltip />} />
                    <Bar
                      yAxisId="left"
                      dataKey="ordersProcessed"
                      fill="#0092ff"
                      name="Orders Processed"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="totalRevenue"
                      fill="#005ece"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Performance Distribution</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={formatStaffPerformanceData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="totalRevenue"
                      nameKey="staffName"
                      label={({ staffName, percent }) => `${staffName}\n${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {formatStaffPerformanceData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${currencySymbol}${value.toFixed(2)}`, name]}
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={10}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Staff Performance Details</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <CustomTable
                  columns={staffColumns}
                  data={formatStaffPerformanceData()}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ReportsTeam;