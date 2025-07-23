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
  Progress,
  Divider,
  Badge
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
  AreaChart,
  Area
} from 'recharts';
import moment from 'moment';
import axios from 'axios';
import {
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CrownOutlined,
  SyncOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { BASE_URL } from '/src/paths.js';

const { RangePicker } = DatePicker;
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

const ReportsCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment().endOf('month')]);
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

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/customers`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error fetching customer analytics data:', error);
      message.error('Failed to fetch customer analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    if (dates) {
      setDateRange(dates);
    } else {
      setDateRange([moment().startOf('month'), moment().endOf('month')]);
    }
  };

  const disabledDate = (current) => {
    return current && current > moment().endOf('day');
  };

  const formatCustomerAcquisitionData = () => {
    if (!analyticsData?.customerAcquisitionByDate) return [];

    return Object.entries(analyticsData.customerAcquisitionByDate)
      .map(([date, count]) => ({
        date: moment(date).format('MMM DD'),
        newCustomers: count
      }))
      .sort((a, b) => moment(a.date) - moment(b.date));
  };

  const formatTopCustomersData = () => {
    if (!analyticsData?.topCustomersByRevenue) return [];

    return analyticsData.topCustomersByRevenue.map((customer, index) => ({
      ...customer,
      key: index,
      totalRevenue: customer.totalRevenue,
      rank: index + 1
    }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
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
            <span style={{ color: '#6b7280' }}>New Customers: </span>
            <span style={{
              fontWeight: '600',
              marginLeft: '4px',
              color: '#111827'
            }}>{payload[0].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const topCustomersColumns = [
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
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text, record) => (
        <div>
          <Text strong style={{ color: '#111827' }} className="text-dark">{text}</Text>
          <div style={{ color: '#6b7280', fontSize: '12px' }} className="text-dark">{record.customerEmail}</div>
        </div>
      )
    },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (text) => (
        <Text strong style={{ color: '#0092ff' }}>
          {currencySymbol}{text.toFixed(2)}
        </Text>
      ),
      summaryRender: (value) => (
        <Text strong style={{ color: '#0092ff' }}>
          {currencySymbol}{value.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
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
          Customer Analytics
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
              'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            }}
          />
          <Button
            type="primary"
            onClick={fetchAnalyticsData}
            loading={loading}
            icon={<SyncOutlined spin={loading} />}
            style={{
              fontWeight: '500',
              background: loading ? '#0092ff' : '#0092ff',
              border: 'none',
              boxShadow: '0 1px 3px rgba(99, 168, 241, 0.3)',
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
          <Spin size="large" tip="Loading customer analytics..." />
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
                    <TeamOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Customers</Text>
                    <Title level={3} style={{ margin: 0 }}>{analyticsData.totalCustomers}</Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Text className="text-dark">Active</Text>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: '#0092ff'
                    }}>
                      {analyticsData.activeCustomers}
                    </div>
                  </div>
                  <div>
                    <Text className="text-dark">New</Text>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: '#0092ff'
                    }}>
                      {analyticsData.newCustomers}
                    </div>
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
                    background: '#E0E7FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <ArrowUpOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Retention Rate</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {(analyticsData.customerRetentionRate * 100).toFixed(1)}%
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Progress
                    percent={analyticsData.customerRetentionRate * 100}
                    strokeColor="#10B981"
                    trailColor="#E5E7EB"
                    showInfo={false}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px'
                  }}>
                    <Text className="text-dark">Target: 80%</Text>
                    <Text type="secondary">
                      {analyticsData.customerRetentionRate >= 0.8 ? (
                        <span style={{ color: '#10B981' }}>On track <ArrowUpOutlined /></span>
                      ) : (
                        <span style={{ color: '#F43F5E' }}>Needs improvement <ArrowDownOutlined /></span>
                      )}
                    </Text>
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
                    background: '#E0E7FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <CrownOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Top Customer</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analyticsData.topCustomersByRevenue[0]?.customerName || 'N/A'}
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
                    {currencySymbol}{analyticsData.topCustomersByRevenue[0]?.totalRevenue.toFixed(2) || '0.00'}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={16}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Customer Acquisition</Text>}
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
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={formatCustomerAcquisitionData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorNewCustomers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0092ff" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0092ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#0092ff"
                      fillOpacity={1}
                      fill="url(#colorNewCustomers)"
                      name="New Customers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Customer Type</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'New Customers',
                          value: analyticsData.newCustomers,
                          color: '#0092ff'
                        },
                        {
                          name: 'Returning Customers',
                          value: analyticsData.totalCustomers - analyticsData.newCustomers,
                          color: '#005ece'
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                    >
                      <Cell fill="#0092ff" />
                      <Cell fill="#005ece" />
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} customers`, name]}
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

          <Card
            className="card bg-white text-light"
            title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Top Customers by Revenue</Text>}
            bordered={false}
            style={{
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            bodyStyle={{ padding: '16px 0' }}
          >
            <CustomTable
              columns={topCustomersColumns}
              data={formatTopCustomersData()}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsCustomer;