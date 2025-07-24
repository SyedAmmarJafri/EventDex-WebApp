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
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  PieChartOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { BASE_URL } from '/src/constants.js';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const COLORS = ['#005ece', '#0092ff', '#EC4899', '#F43F5E', '#F59E0B', '#10B981'];

// Get currency settings from localStorage
const authData = JSON.parse(localStorage.getItem("authData"));
const currencySymbol = authData?.currencySettings?.currencySymbol || '$';

const CustomTable = ({ data, columns, summary }) => {
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

const ReportsFinancial = () => {
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

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/financial`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error fetching financial analytics data:', error);
      message.error('Failed to fetch financial analytics data');
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

  const formatDailyData = () => {
    if (!analyticsData?.dailyFinancialBreakdown) return [];
    return analyticsData.dailyFinancialBreakdown.map(item => ({
      ...item,
      date: moment(item.date).format('MMM D'),
      netProfit: item.income - item.expenses - item.withdrawals
    }));
  };

  const formatExpenseCategories = () => {
    if (!analyticsData?.expenseCategories) return [];
    return Object.entries(analyticsData.expenseCategories)
      .map(([name, value], index) => ({
        name,
        value,
        key: index
      }))
      .filter(item => item.value > 0); // Only show categories with expenses
  };

  const FinancialTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const netProfit = payload[0].value - payload[1].value - (payload[2]?.value || 0);
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
              background: '#10B981',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Income: </span>
            <span style={{ color: '#0e0e0eff', fontWeight: '600', marginLeft: '4px' }}>{currencySymbol}{payload[0].value.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#F43F5E',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Expenses: </span>
            <span style={{ color: '#0e0e0eff', fontWeight: '600', marginLeft: '4px' }}>{currencySymbol}{payload[1].value.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#8B5CF6',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Withdrawals: </span>
            <span style={{ color: '#0e0e0eff', fontWeight: '600', marginLeft: '4px' }}>{currencySymbol}{payload[2]?.value.toFixed(2) || '0.00'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#6366F1',
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#6b7280' }}>Net Profit: </span>
            <span style={{
              fontWeight: '600',
              marginLeft: '4px',
              color: netProfit >= 0 ? '#10B981' : '#F43F5E'
            }}>
              {currencySymbol}{netProfit.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const dailyColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => <Text strong style={{ color: '#111827' }} className="text-dark">{text}</Text>
    },
    {
      title: 'Income',
      dataIndex: 'income',
      key: 'income',
      render: (text) => (
        <Text strong style={{ color: '#10B981' }}>
          {currencySymbol}{text.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.income - b.income,
      align: 'right',
      isSummable: true
    },
    {
      title: 'Expenses',
      dataIndex: 'expenses',
      key: 'expenses',
      render: (text) => (
        <Text strong style={{ color: '#F43F5E' }}>
          {currencySymbol}{text.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.expenses - b.expenses,
      align: 'right',
      isSummable: true
    },
    {
      title: 'Withdrawals',
      dataIndex: 'withdrawals',
      key: 'withdrawals',
      render: (text) => (
        <Text strong style={{ color: '#8B5CF6' }}>
          {currencySymbol}{text.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.withdrawals - b.withdrawals,
      align: 'right',
      isSummable: true
    },
    {
      title: 'Net Profit',
      key: 'netProfit',
      render: (_, record) => (
        <Text strong style={{
          color: record.netProfit >= 0 ? '#10B981' : '#F43F5E'
        }}>
          {currencySymbol}{record.netProfit.toFixed(2)}
        </Text>
      ),
      summaryRender: (value) => (
        <Text strong style={{
          color: value >= 0 ? '#10B981' : '#F43F5E'
        }}>
          {currencySymbol}{value.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.netProfit - b.netProfit,
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
          Financial Analytics
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
              background: '#0092ff',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0, 146, 255, 0.3)',
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
          <Spin size="large" tip="Loading financial analytics..." />
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
                    <DollarOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Income</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{analyticsData.totalIncome.toFixed(2)}
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
                    <WalletOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Total Expenses</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{analyticsData.totalExpenses.toFixed(2)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowDownOutlined style={{ color: '#F43F5E', fontSize: '16px', marginRight: '8px' }} />
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
                    <PieChartOutlined style={{ fontSize: '20px', color: '#0092ff' }} />
                  </div>
                  <div>
                    <Text className="text-dark">Net Profit</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {currencySymbol}{analyticsData.netProfit.toFixed(2)}
                    </Title>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} className="card bg-white text-light" />
                <div>
                  <Text className="text-dark">Profit Margin</Text>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '20px',
                    color: analyticsData.profitMargin >= 0 ? '#10B981' : '#F43F5E',
                    marginTop: '4px'
                  }}>
                    {analyticsData.profitMargin.toFixed(2)}%
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Daily Financial Overview</Text>}
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
                  <AreaChart
                    data={formatDailyData()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc02c2ff" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#dc02c2ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
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
                    <Tooltip content={<FinancialTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      name="Income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#F43F5E"
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      name="Expenses"
                    />
                    <Area
                      type="monotone"
                      dataKey="withdrawals"
                      stroke="#dc02c2ff"
                      fillOpacity={1}
                      fill="url(#colorWithdrawals)"
                      name="Withdrawals"
                    />
                    <Area
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#0092ff"
                      fillOpacity={1}
                      fill="url(#colorNetProfit)"
                      name="Net Profit"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className="card bg-white text-light"
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Expense Categories</Text>}
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
                      data={formatExpenseCategories()}
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
                      {formatExpenseCategories().map((entry, index) => (
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
                title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Daily Financial Breakdown</Text>}
                bordered={false}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                bodyStyle={{ padding: '16px 0' }}
              >
                <CustomTable
                  columns={dailyColumns}
                  data={formatDailyData()}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ReportsFinancial;