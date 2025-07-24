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
  Divider,
  Tag
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
  Cell,
  LineChart,
  Line
} from 'recharts';
import moment from 'moment';
import axios from 'axios';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  ArrowUpOutlined,
  SyncOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const COLORS = ['#005ece', '#0092ff', '#EC4899', '#F43F5E', '#F59E0B', '#10B981'];

// Get currency settings from localStorage
const authData = JSON.parse(localStorage.getItem("authData"));
const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

const ReportsSales = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      const [startDate, endDate] = dateRange;
      const params = {
        period: 'custom',
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD')
      };

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/sales`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error fetching sales analytics data:', error);
      message.error('Failed to fetch sales analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    if (dates) {
      setDateRange(dates);
    } else {
      setDateRange([moment().subtract(7, 'days'), moment()]);
    }
  };

  const disabledDate = (current) => {
    return current && current > moment().endOf('day');
  };

  const formatDailySalesData = () => {
    if (!analyticsData?.dailySalesBreakdown) return [];
    return Object.entries(analyticsData.dailySalesBreakdown).map(([date, revenue]) => ({
      date: moment(date).format('MMM D'),
      revenue,
      key: date
    }));
  };

  const formatPaymentMethodData = () => {
    if (!analyticsData?.salesByPaymentMethod) return [];
    return Object.entries(analyticsData.salesByPaymentMethod).map(([name, value], index) => ({
      name,
      value,
      key: index
    }));
  };

  const formatOrderTypeData = () => {
    if (!analyticsData?.salesByOrderType) return [];
    return Object.entries(analyticsData.salesByOrderType).map(([name, value], index) => ({
      name,
      value,
      key: index
    }));
  };

  const formatHourlySalesData = () => {
    if (!analyticsData?.hourlySalesPattern) return [];
    return Object.entries(analyticsData.hourlySalesPattern).map(([hour, revenue]) => ({
      hour: `${hour}:00`,
      revenue,
      key: hour
    })).sort((a, b) => parseInt(a.key) - parseInt(b.key));
  };

  const SalesTooltip = ({ active, payload, label }) => {
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
          }}>{`${label}`}</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#0092ff',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#0092ff' }}>Revenue: </span>
            <span style={{ color: '#0092ff', fontWeight: '600', marginLeft: '4px' }}>{currencySymbol}{payload[0].value.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Table component with Bootstrap-like styling and summary row
  const CustomTable = ({ data, columns }) => {
    // Calculate total revenue for summary row
    const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);

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
            {/* Summary row */}
            <tr style={{
              borderTop: '2px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <td style={{
                padding: '12px 16px',
                fontWeight: 600,
                color: '#111827'
              }}>
                Total
              </td>
              <td style={{
                padding: '12px 16px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#0092ff'
              }}>
                {currencySymbol}{totalRevenue.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const dailySalesColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => (
        <span style={{ color: '#111827' }} className="text-dark">{text}</span>
      )
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (text) => (
        <span style={{ color: '#0092ff', fontWeight: 600 }} className="text-dark">
          {currencySymbol}{text.toFixed(2)}
        </span>
      ),
      sorter: (a, b) => a.revenue - b.revenue,
      align: 'right'
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
          Sales Analytics
        </Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            disabledDate={disabledDate}
            size="middle"
            style={{ width: '280px' }}
            allowClear={false}
            ranges={{
              'Today': [moment(), moment()],
              'This Week': [moment().startOf('week'), moment().endOf('week')],
              'This Month': [moment().startOf('month'), moment().endOf('month')],
              'Last 7 Days': [moment().subtract(7, 'days'), moment()],
            }}
          />
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
        </Space>
      </div>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 0',
          background: '#fff',
          borderRadius: '12px'
        }} className="card bg-white text-light">
          <Spin size="large" tip="Loading sales analytics..." />
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
                    background: '#E0E7FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <DollarOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Revenue</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{analyticsData.totalRevenue.toFixed(2)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpOutlined style={{ color: '#10B981', fontSize: '16px', marginRight: '8px' }} />
                  <Text className="text-dark">Compared to last period</Text>
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
                    background: '#F5F3FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <ShoppingCartOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Orders</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analyticsData.totalOrders}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpOutlined style={{ color: '#10B981', fontSize: '16px', marginRight: '8px' }} />
                  <Text className="text-dark">Compared to last period</Text>
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
                    <CreditCardOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Avg. Order Value</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{analyticsData.averageOrderValue.toFixed(2)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpOutlined style={{ color: '#10B981', fontSize: '16px', marginRight: '8px' }} />
                  <Text className="text-dark">Compared to last period</Text>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Daily Sales</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
                extra={
                  <Tag color="#0092ff">
                    {dateRange[0].format('MMM D')} - {dateRange[1].format('MMM D')}
                  </Tag>
                }
              >
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={formatDailySalesData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <Tooltip content={<SalesTooltip />} />
                    <Bar
                      dataKey="revenue"
                      fill="#0092ff"
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
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Sales by Payment Method</Text>}
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
                      data={formatPaymentMethodData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {formatPaymentMethodData().map((entry, index) => (
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

          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Sales by Order Type</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={formatOrderTypeData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {formatOrderTypeData().map((entry, index) => (
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

            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Hourly Sales Pattern</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={formatHourlySalesData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${currencySymbol}${value.toFixed(2)}`, 'Revenue']}
                      contentStyle={{
                        background: '#fff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0092ff"
                      strokeWidth={2}
                      dot={{ fill: '#0092ff', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#0092ff', strokeWidth: 2, fill: '#fff' }}
                      name="Revenue ($)"
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Daily Sales Breakdown</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <CustomTable
                  columns={dailySalesColumns}
                  data={formatDailySalesData()}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ReportsSales;