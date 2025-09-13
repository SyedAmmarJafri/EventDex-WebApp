import { useState, useEffect } from 'react';
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
  Badge,
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
  Cell,
} from 'recharts';
import moment from 'moment';
import axios from 'axios';
import {
  TagOutlined,
  SyncOutlined,
  FireOutlined,
  TrophyOutlined,
  DownOutlined,
  CalendarOutlined,
  CloseCircleOutlined
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

const ReportsProducts = () => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('last30days');
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [analyticsData, setAnalyticsData] = useState(null);

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

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/products`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error fetching product analytics data:', error);
      message.error('Failed to fetch product analytics data');
    } finally {
      setLoading(false);
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
      default:
        // For custom, keep the existing range
        break;
    }
  };

  const getTopCategoryByUnits = () => {
    if (!analyticsData?.categoryPerformance) return null;

    // Sort by totalQuantitySold in descending order
    const sorted = [...analyticsData.categoryPerformance].sort(
      (a, b) => b.totalQuantitySold - a.totalQuantitySold
    );

    return sorted[0] || null;
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setDateRange(dates);
    } else {
      // Reset to default when cleared
      setDateRange([moment().subtract(7, 'days'), moment()]);
      setPeriod('last7days');
    }
  };

  const disabledDate = (current) => {
    return current && current > moment().endOf('day');
  };

  const formatTopSellingData = () => {
    if (!analyticsData?.topSellingProducts) return [];
    return analyticsData.topSellingProducts.map((product, index) => ({
      ...product,
      key: index,
      revenue: product.revenue,
      rank: index + 1
    }));
  };

  const formatCategoryPerformanceData = () => {
    if (!analyticsData?.categoryPerformance) return [];
    return analyticsData.categoryPerformance
      .filter(category => category.totalQuantitySold > 0)
      .map((category, index) => ({
        ...category,
        key: index,
        totalRevenue: category.totalRevenue,
        categoryName: category.categoryName || `Category ${category.categoryId.slice(-4)}`
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
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#0092ff',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Quantity: </span>
            <span style={{ color: '#6b7280', fontWeight: '600', marginLeft: '4px' }}>{payload[0].value}</span>
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
            <span style={{ color: '#6b7280', fontWeight: '600', marginLeft: '4px' }}>{currencySymbol}{payload[1].value.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const topSellingColumns = [
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
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      render: (text) => (
        <Text strong style={{ color: '#111827' }} className="text-dark">{text}</Text>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantitySold',
      key: 'quantitySold',
      render: (text) => (
        <Tag color="#0092ff" style={{ fontWeight: 500 }}>
          {text}
        </Tag>
      ),
      sorter: (a, b) => a.quantitySold - b.quantitySold,
      align: 'center',
      isSummable: true
    },
    {
      title: 'Revenue',
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

  const categoryColumns = [
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (text) => (
        <Text strong style={{ color: '#111827' }}>{text}</Text>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'totalQuantitySold',
      key: 'totalQuantitySold',
      render: (text) => (
        <Tag color="geekblue" style={{ fontWeight: 500 }}>
          {text}
        </Tag>
      ),
      sorter: (a, b) => a.totalQuantitySold - b.totalQuantitySold,
      align: 'center',
      isSummable: true
    },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
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
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
      align: 'right',
      isSummable: true
    }
  ];

  const stockItemColumns = [
    {
      title: 'Product',
      dataIndex: 'itemName',
      key: 'itemName',
      render: (text) => (
        <Text style={{ color: '#111827' }} className="text-dark">{text}</Text>
      )
    },
    {
      title: 'Stock Level',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (text, record) => (
        <div>
          <Progress
            percent={(text / record.threshold) * 100}
            status={text === 0 ? 'exception' : text < record.threshold ? 'active' : 'normal'}
            strokeColor={text === 0 ? '#F43F5E' : text < record.threshold ? '#F59E0B' : '#10B981'}
            showInfo={false}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px'
          }}>
            <Text className="text-dark">{text} in stock</Text>
            <Text className="text-dark">Threshold: {record.threshold}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        record.currentStock === 0 || record.currentStock < record.threshold ? (
          <Tag
            color={record.currentStock === 0 ? '#000000ff' : '#d30700ff'}
          >
            {record.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
          </Tag>
        ) : '-'
      )
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
          Product Analytics
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
            boxShadow: '0 1px 3px rgba(0, 146, 255, 0.3)',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Period Selection Card */}
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
                style={{
                  width: '100%',
                  border: '1px solid #0092ff',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 146, 255, 0.05)',
                  height: '40px',
                  color: '#0092ff',
                  fontSize: '14px'
                }}
                dropdownStyle={{
                  border: '1px solid #0092ff',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 146, 255, 0.15)',
                  padding: '8px 0'
                }}
                value={period}
                onChange={handlePeriodChange}
                suffixIcon={
                  <DownOutlined style={{
                    color: '#0092ff',
                    fontSize: '12px'
                  }} />
                }
              >
                <Option
                  value="today"
                  style={{
                    color: '#000000ff',
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    ':hover': {
                      backgroundColor: 'rgba(0, 146, 255, 0.08)'
                    }
                  }}
                >
                  Today
                </Option>
                <Option
                  value="yesterday"
                  style={{
                    color: '#000000ff',
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    ':hover': {
                      backgroundColor: 'rgba(0, 146, 255, 0.08)'
                    }
                  }}
                >
                  Yesterday
                </Option>
                <Option
                  value="last7days"
                  style={{
                    color: '#000000ff',
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    ':hover': {
                      backgroundColor: 'rgba(0, 146, 255, 0.08)'
                    }
                  }}
                >
                  Last 7 Days
                </Option>
                <Option
                  value="last30days"
                  style={{
                    color: '#000000ff',
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    ':hover': {
                      backgroundColor: 'rgba(0, 146, 255, 0.08)'
                    }
                  }}
                >
                  Last 30 Days
                </Option>
                <Option
                  value="custom"
                  style={{
                    color: '#000000ff',
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    ':hover': {
                      backgroundColor: 'rgba(0, 146, 255, 0.08)'
                    }
                  }}
                >
                  Custom Range
                </Option>
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
                    border: '1px solid #0092ff',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 146, 255, 0.05)',
                    height: '40px'
                  }}
                  inputStyle={{
                    color: '#006bb3',
                    fontSize: '14px',
                    backgroundColor: 'transparent'
                  }}
                  popupStyle={{
                    border: '1px solid #0092ff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 146, 255, 0.15)'
                  }}
                  suffixIcon={
                    <CalendarOutlined style={{
                      color: '#0092ff',
                      fontSize: '16px'
                    }} />
                  }
                  onChange={handleDateRangeChange}
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
          <Spin size="large" tip="Loading product analytics..." />
        </div>
      )}

      {analyticsData && !loading && (
        <>
          {/* Summary Cards */}
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
                    background: '#F5F3FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <TagOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Active Products</Text>
                    <Title level={3} style={{ margin: 0 }}>{analyticsData.totalActiveProducts}</Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Text className="text-dark">Out of Stock</Text>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: '#0092ff'
                    }}>
                      {analyticsData.totalOutOfStockProducts}
                    </div>
                  </div>
                  <div>
                    <Text className="text-dark">Low Stock</Text>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: '#0092ff'
                    }}>
                      {analyticsData.lowStockItems?.length || 0}
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
                    background: '#F5F3FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <FireOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Top Selling Product</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analyticsData.topSellingProducts[0]?.productName || 'N/A'}
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
                    {currencySymbol}{analyticsData.topSellingProducts[0]?.revenue.toFixed(2) || '0.00'}
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
                    background: '#F5F3FF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }} className="card bg-white text-light">
                    <TrophyOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Top Category</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {getTopCategoryByUnits()?.categoryName || 'N/A'}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Total Units Sold</Text>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#0092ff',
                    marginTop: '4px'
                  }}>
                    {getTopCategoryByUnits()?.totalQuantitySold || 0}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Top Selling Products</Text>}
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
                    data={formatTopSellingData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="productName"
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
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      yAxisId="left"
                      dataKey="quantitySold"
                      fill="#0092ff"
                      name="Quantity Sold"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="revenue"
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
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Category Performance</Text>}
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
                      data={formatCategoryPerformanceData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="totalQuantitySold"
                      nameKey="categoryName"
                      label={({ categoryName, percent }) => `${categoryName}\n${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {formatCategoryPerformanceData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} units`, name]}
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

          {/* Tables Row */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Top Products</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <CustomTable
                  columns={topSellingColumns}
                  data={formatTopSellingData()}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Stock Status</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <CustomTable
                  columns={stockItemColumns}
                  data={analyticsData.lowStockItems?.length > 0 ?
                    [...analyticsData.lowStockItems, ...(analyticsData.outOfStockItems || [])] :
                    (analyticsData.outOfStockItems || [])}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ReportsProducts;