import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Select,
  message,
  Spin,
  Typography,
  Space,
  DatePicker
} from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import axios from 'axios';
import { BASE_URL } from '/src/paths.js';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const ReportsTeam = () => {
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [reportType, setReportType] = useState('financial');
  const [period, setPeriod] = useState('today');
  const [dateRange, setDateRange] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const generateReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      let params = { reportType };

      if (period === 'custom' && dateRange) {
        params.startDate = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(dateRange[1]).format('YYYY-MM-DD');
      } else {
        params.period = period;
      }

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/export/pdf`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

    } catch (error) {
      console.error('Error generating PDF report:', error);
      message.error('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      setCsvLoading(true);
      const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;

      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      let params = { reportType };

      if (period === 'custom' && dateRange) {
        params.startDate = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(dateRange[1]).format('YYYY-MM-DD');
      } else {
        params.period = period;
      }

      const response = await axios.get(`${BASE_URL}/api/client-admin/analytics/export/csv`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      // Create download link for CSV
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${period === 'custom' ? 'custom_range' : period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      message.success('CSV file downloaded successfully');

    } catch (error) {
      console.error('Error downloading CSV:', error);
      message.error('Failed to download CSV file');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleReportTypeChange = (value) => {
    setReportType(value);
    setPdfUrl(null);
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    setPdfUrl(null);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    setPdfUrl(null);
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <Title level={3} style={{
        margin: 0,
        marginBottom: '24px',
        fontWeight: 600,
        color: '#111827'
      }}>
        Analytics Reports
      </Title>

      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card
            className="card bg-white text-light"
            title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Generate Report</Text>}
            bordered={false}
            style={{
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }} className="text-dark">Report Type</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={reportType}
                    onChange={handleReportTypeChange}
                  >
                    <Option value="financial">Financial</Option>
                    <Option value="dashboard">Dashboard</Option>
                    <Option value="products">Products</Option>
                    <Option value="sales">Sales</Option>
                    <Option value="customers">Customers</Option>
                  </Select>
                </div>
              </Col>

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
                      style={{ width: '100%'}}
                      onChange={handleDateRangeChange}
                      disabledDate={(current) => current && current > dayjs().endOf('day')}
                    />
                  </div>
                </Col>
              )}
            </Row>

            <Space style={{ marginTop: '24px', width: '100%', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={downloadCSV}
                loading={csvLoading}
                size="large"
                disabled={period === 'custom' && !dateRange}
                style={{
                  fontWeight: '500',
                  background: '#00a46dff',
                  border: 'none',
                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                  padding: '0 24px',
                  height: '40px'
                }}
              >
                Download CSV
              </Button>

              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={generateReport}
                loading={loading}
                size="large"
                disabled={period === 'custom' && !dateRange}
                style={{
                  fontWeight: '500',
                  background: '#0092ff',
                  border: 'none',
                  boxShadow: '0 1px 3px rgba(16, 148, 185, 0.3)',
                  padding: '0 24px',
                  height: '40px'
                }}
              >
                Generate PDF
              </Button>
            </Space>

            {loading && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
              }}>
                <Spin size="large" tip="Generating PDF report..." />
              </div>
            )}

            {csvLoading && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
              }}>
                <Spin size="large" tip="Preparing CSV download..." />
              </div>
            )}

            {pdfUrl && !loading && (
              <div style={{ marginTop: '24px', borderRadius: '8px' }}>
                <iframe
                  src={pdfUrl}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  title="Analytics Report"
                />
                <div style={{ textAlign: 'right', marginTop: '16px' }}>
                  <Button
                    type="link"
                    href={pdfUrl}
                    target="_blank"
                    download={`${reportType}_report_${period === 'custom' ? 'custom_range' : period}.pdf`}
                    style={{ fontWeight: 500 }}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportsTeam;