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
  ResponsiveContainer
} from 'recharts';
import moment from 'moment';
import axios from 'axios';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  SyncOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

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

const ComparisonAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [currentRange, setCurrentRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [previousRange, setPreviousRange] = useState([
    moment().subtract(60, 'days'),
    moment().subtract(31, 'days')
  ]);
  const [comparisonData, setComparisonData] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('last30days');
  const [previousPeriod, setPreviousPeriod] = useState('previous30days');

  useEffect(() => {
    fetchComparisonData();
  }, [currentPeriod, previousPeriod, currentRange, previousRange]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      const params = {
        currentPeriodStart: currentRange[0].format('YYYY-MM-DD'),
        currentPeriodEnd: currentRange[1].format('YYYY-MM-DD'),
        previousPeriodStart: previousRange[0].format('YYYY-MM-DD'),
        previousPeriodEnd: previousRange[1].format('YYYY-MM-DD')
      };

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/comparison`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setComparisonData(response.data.data);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      message.error('Failed to fetch comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentPeriodChange = (value) => {
    setCurrentPeriod(value);
    switch (value) {
      case 'today':
        setCurrentRange([moment(), moment()]);
        break;
      case 'yesterday':
        setCurrentRange([moment().subtract(1, 'days'), moment().subtract(1, 'days')]);
        break;
      case 'last7days':
        setCurrentRange([moment().subtract(7, 'days'), moment()]);
        break;
      case 'last30days':
        setCurrentRange([moment().subtract(30, 'days'), moment()]);
        break;
      case 'thismonth':
        setCurrentRange([moment().startOf('month'), moment().endOf('month')]);
        break;
      case 'lastmonth':
        setCurrentRange([
          moment().subtract(1, 'month').startOf('month'),
          moment().subtract(1, 'month').endOf('month')
        ]);
        break;
      case 'custom':
        // Keep existing range
        break;
      default:
        setCurrentRange([moment().subtract(30, 'days'), moment()]);
    }
  };

  const handlePreviousPeriodChange = (value) => {
    setPreviousPeriod(value);
    switch (value) {
      case 'previousday':
        setPreviousRange([
          moment(currentRange[0]).subtract(1, 'days'),
          moment(currentRange[1]).subtract(1, 'days')
        ]);
        break;
      case 'previousweek':
        setPreviousRange([
          moment(currentRange[0]).subtract(7, 'days'),
          moment(currentRange[1]).subtract(7, 'days')
        ]);
        break;
      case 'previous30days':
        setPreviousRange([
          moment(currentRange[0]).subtract(30, 'days'),
          moment(currentRange[1]).subtract(30, 'days')
        ]);
        break;
      case 'previousmonth':
        setPreviousRange([
          moment(currentRange[0]).subtract(1, 'month'),
          moment(currentRange[1]).subtract(1, 'month')
        ]);
        break;
      case 'previousyear':
        setPreviousRange([
          moment(currentRange[0]).subtract(1, 'year'),
          moment(currentRange[1]).subtract(1, 'year')
        ]);
        break;
      case 'custom':
        // Keep existing range
        break;
      default:
        setPreviousRange([
          moment(currentRange[0]).subtract(30, 'days'),
          moment(currentRange[1]).subtract(30, 'days')
        ]);
    }
  };

  const handleCurrentDateChange = (dates) => {
    if (dates) {
      setCurrentRange(dates);
      setCurrentPeriod('custom');
    }
  };

  const handlePreviousDateChange = (dates) => {
    if (dates) {
      setPreviousRange(dates);
      setPreviousPeriod('custom');
    }
  };

  const handleComparisonTypeChange = (value) => {
    setComparisonType(value);
    if (value === 'month-over-month') {
      setCurrentPeriod('thismonth');
      setPreviousPeriod('previousmonth');
    } else if (value === 'year-over-year') {
      setCurrentPeriod('last30days');
      setPreviousPeriod('previousyear');
    }
  };

  const disabledDate = (current) => {
    return current && current > moment().endOf('day');
  };

  const formatComparisonChartData = () => {
    if (!comparisonData) return [];
    return [
      {
        name: 'Current Period',
        revenue: comparisonData.currentRevenue,
        orders: comparisonData.currentOrders,
        customers: comparisonData.currentCustomers,
        aov: comparisonData.currentAverageOrderValue
      },
      {
        name: 'Previous Period',
        revenue: comparisonData.previousRevenue,
        orders: comparisonData.previousOrders,
        customers: comparisonData.previousCustomers,
        aov: comparisonData.previousAverageOrderValue
      }
    ];
  };

  const renderChangeIndicator = (value) => {
    if (value > 0) {
      return (
        <Tag color="#00cd1fff" style={{ fontWeight: 500 }}>
          {value}%
        </Tag>
      );
    } else if (value < 0) {
      return (
        <Tag color="#cd0000ff" style={{ fontWeight: 500 }}>
          {Math.abs(value)}%
        </Tag>
      );
    } else {
      return <Tag style={{ fontWeight: 500 }}>0%</Tag>;
    }
  };

  const comparisonColumns = [
    {
      title: 'Metric',
      dataIndex: 'metric',
      key: 'metric',
      render: (text) => (
        <Text strong className="text-dark">{text}</Text>
      )
    },
    {
      title: 'Current Period',
      dataIndex: 'current',
      key: 'current',
      render: (text, record) => (
        <div>
          <Text className="text-dark">{record.isCurrency ? `${currencySymbol}${text.toFixed(2)}` : text}</Text>
        </div>
      ),
      align: 'right'
    },
    {
      title: 'Previous Period',
      dataIndex: 'previous',
      key: 'previous',
      render: (text, record) => (
        <Text className="text-dark">{record.isCurrency ? `${currencySymbol}${text.toFixed(2)}` : text}</Text>
      ),
      align: 'right'
    },
    {
      title: 'Change',
      dataIndex: 'change',
      key: 'change',
      render: (text) => renderChangeIndicator(text),
      align: 'center'
    }
  ];

  const comparisonTableData = [
    {
      key: '1',
      metric: 'Revenue',
      current: comparisonData?.currentRevenue || 0,
      previous: comparisonData?.previousRevenue || 0,
      change: comparisonData?.revenueChange || 0,
      isCurrency: true
    },
    {
      key: '2',
      metric: 'Orders',
      current: comparisonData?.currentOrders || 0,
      previous: comparisonData?.previousOrders || 0,
      change: comparisonData?.ordersChange || 0,
      isCurrency: false
    },
    {
      key: '3',
      metric: 'Customers',
      current: comparisonData?.currentCustomers || 0,
      previous: comparisonData?.previousCustomers || 0,
      change: comparisonData?.customersChange || 0,
      isCurrency: false
    },
    {
      key: '4',
      metric: 'Avg. Order Value',
      current: comparisonData?.currentAverageOrderValue || 0,
      previous: comparisonData?.previousAverageOrderValue || 0,
      change: comparisonData?.averageOrderValueChange || 0,
      isCurrency: true
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
          Performance Comparison
        </Title>
        <Space>
          <Button
            type="primary"
            onClick={fetchComparisonData}
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

      {/* Period Selection Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <Card
            className="card bg-white text-light"
            title={<Text strong className="text-dark">Current Period</Text>}
            bordered={false}
            style={{ borderRadius: '12px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: '8px' }}>
                  <Select
                    style={{ width: '100%' }}
                    value={currentPeriod}
                    onChange={handleCurrentPeriodChange}
                  >
                    <Option value="today">Today</Option>
                    <Option value="yesterday">Yesterday</Option>
                    <Option value="last7days">Last 7 Days</Option>
                    <Option value="last30days">Last 30 Days</Option>
                    <Option value="thismonth">This Month</Option>
                    <Option value="lastmonth">Last Month</Option>
                    <Option value="custom">Custom Range</Option>
                  </Select>
                </div>
              </Col>
              {currentPeriod === 'custom' && (
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: '8px' }}>
                    <RangePicker
                      style={{
                        width: '100%',
                        backgroundColor: 'white',
                      }}
                      inputStyle={{
                        color: 'black',
                        backgroundColor: 'white',
                      }}
                      onChange={handleCurrentDateChange}
                      disabledDate={disabledDate}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <div style={{ marginTop: '16px', color: '#6B7280' }} className="text-dark">
              {currentRange[0].format('MMM D, YYYY')} - {currentRange[1].format('MMM D, YYYY')}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            className="card bg-white text-light"
            title={<Text strong className="text-dark">Previous Period</Text>}
            bordered={false}
            style={{ borderRadius: '12px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: '8px' }}>
                  <Select
                    style={{ width: '100%' }}
                    value={previousPeriod}
                    onChange={handlePreviousPeriodChange}
                  >
                    <Option value="previousday">Previous Day</Option>
                    <Option value="previousweek">Previous Week</Option>
                    <Option value="previous30days">Previous 30 Days</Option>
                    <Option value="previousmonth">Previous Month</Option>
                    <Option value="previousyear">Previous Year</Option>
                    <Option value="custom">Custom Range</Option>
                  </Select>
                </div>
              </Col>
              {previousPeriod === 'custom' && (
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: '8px' }}>
                    <RangePicker
                      style={{
                        width: '100%',
                        backgroundColor: 'white',
                      }}
                      inputStyle={{
                        color: 'black',
                        backgroundColor: 'white',
                      }}
                      onChange={handlePreviousDateChange}
                      disabledDate={disabledDate}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <div style={{ marginTop: '16px', color: '#6B7280' }} className="text-dark">
              {previousRange[0].format('MMM D, YYYY')} - {previousRange[1].format('MMM D, YYYY')}
            </div>
          </Card>
        </Col>
      </Row>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 0',
          background: '#fff',
          borderRadius: '12px'
        }} className="card bg-white text-light">
          <Spin size="large" tip="Loading comparison data..." />
        </div>
      )}

      {comparisonData && !loading && (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
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
                    <DollarOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Revenue</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{comparisonData.currentRevenue.toFixed(2)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Change from previous</Text>
                  <div style={{ marginTop: '4px' }}>
                    {renderChangeIndicator(comparisonData.revenueChange)}
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
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
                    <Text className="text-dark">Orders</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {comparisonData.currentOrders}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Change from previous</Text>
                  <div style={{ marginTop: '4px' }}>
                    {renderChangeIndicator(comparisonData.ordersChange)}
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
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
                    <UserOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Customers</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {comparisonData.currentCustomers}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Change from previous</Text>
                  <div style={{ marginTop: '4px' }}>
                    {renderChangeIndicator(comparisonData.customersChange)}
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
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
                    <LineChartOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Avg. Order Value</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{comparisonData.currentAverageOrderValue.toFixed(2)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Change from previous</Text>
                  <div style={{ marginTop: '4px' }}>
                    {renderChangeIndicator(comparisonData.averageOrderValueChange)}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Comparison Overview</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <CustomTable
                  columns={comparisonColumns}
                  data={comparisonTableData}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Performance Comparison</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={formatComparisonChartData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const formattedValue = name === 'aov' ? `${currencySymbol}${value.toFixed(2)}` : value;
                        return [formattedValue, {
                          revenue: 'Revenue',
                          orders: 'Orders',
                          customers: 'Customers',
                          aov: 'Avg. Order Value'
                        }[name]];
                      }}
                      contentStyle={{
                        background: '#fff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="#0092ff"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="orders"
                      fill="#005ece"
                      name="Orders"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="customers"
                      fill="rgba(187, 0, 180, 1)"
                      name="Customers"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ComparisonAnalytics;