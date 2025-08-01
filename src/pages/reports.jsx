import React, { useState, useEffect } from 'react';
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
import { BASE_URL } from '/src/constants.js';
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
  const [iframeHeight, setIframeHeight] = useState(600);

  useEffect(() => {
    const handleResize = () => {
      // Adjust height based on window size
      const newHeight = window.innerWidth < 768 ? 400 : 600;
      setIframeHeight(newHeight);
    };

    // Set initial height
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${period === 'custom' ? 'custom_range' : period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
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
                    style={{
                      width: '100%',
                      color: '#0092ff',
                      border: '1px solid #0092ff',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 146, 255, 0.05)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      minHeight: '2.875rem',
                      ':hover': {
                        borderColor: '#007acc',
                        backgroundColor: 'rgba(0, 146, 255, 0.08)'
                      },
                      ':focus': {
                        borderColor: '#0092ff',
                        boxShadow: '0 0 0 0.25rem rgba(0, 146, 255, 0.2)',
                        outline: 'none',
                        backgroundColor: 'rgba(0, 146, 255, 0.05)'
                      }
                    }}
                    dropdownStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #0092ff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 146, 255, 0.15)'
                    }}
                    value={reportType}
                    onChange={handleReportTypeChange}
                    suffixIcon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="#0092ff"
                        style={{ marginRight: '8px' }}
                      >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                      </svg>
                    }
                  >
                    <Option
                      value="financial"
                      style={{
                        color: '#000000ff',
                        fontSize: '0.9rem',
                        padding: '0.5rem 1rem',
                        ':hover': {
                          backgroundColor: 'rgba(0, 146, 255, 0.08)'
                        }
                      }}
                    >
                      Financial
                    </Option>
                    <Option
                      value="dashboard"
                      style={{
                        color: '#000000ff',
                        fontSize: '0.9rem',
                        padding: '0.5rem 1rem',
                        ':hover': {
                          backgroundColor: 'rgba(0, 146, 255, 0.08)'
                        }
                      }}
                    >
                      Dashboard
                    </Option>
                    <Option
                      value="products"
                      style={{
                        color: '#000000ff',
                        fontSize: '0.9rem',
                        padding: '0.5rem 1rem',
                        ':hover': {
                          backgroundColor: 'rgba(0, 146, 255, 0.08)'
                        }
                      }}
                    >
                      Products
                    </Option>
                    <Option
                      value="sales"
                      style={{
                        color: '#000000ff',
                        fontSize: '0.9rem',
                        padding: '0.5rem 1rem',
                        ':hover': {
                          backgroundColor: 'rgba(0, 146, 255, 0.08)'
                        }
                      }}
                    >
                      Sales
                    </Option>
                    <Option
                      value="customers"
                      style={{
                        color: '#000000ff',
                        fontSize: '0.9rem',
                        padding: '0.5rem 1rem',
                        ':hover': {
                          backgroundColor: 'rgba(0, 146, 255, 0.08)'
                        }
                      }}
                    >
                      Customers
                    </Option>
                  </Select>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }} className="text-dark">Period</Text>
                  <Select
                    style={{
                      width: '100%',
                      color: '#0092ff',
                      border: '1px solid #0092ff',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 146, 255, 0.05)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      minHeight: '2.875rem',
                      ':hover': {
                        borderColor: '#007acc',
                        backgroundColor: 'rgba(0, 146, 255, 0.08)'
                      },
                      ':focus': {
                        borderColor: '#0092ff',
                        boxShadow: '0 0 0 2px rgba(0, 146, 255, 0.2)',
                        outline: 'none'
                      }
                    }}
                    dropdownStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #0092ff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 146, 255, 0.15)',
                      padding: '8px 0'
                    }}
                    value={period}
                    onChange={handlePeriodChange}
                    suffixIcon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="#0092ff"
                        style={{ marginRight: '8px' }}
                      >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                      </svg>
                    }
                  >
                    <Option
                      value="today"
                      style={{
                        color: '#000000ff',
                        fontSize: '0.9rem',
                        padding: '8px 16px',
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
                        fontSize: '0.9rem',
                        padding: '8px 16px',
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
                        fontSize: '0.9rem',
                        padding: '8px 16px',
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
                        fontSize: '0.9rem',
                        padding: '8px 16px',
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
                        fontSize: '0.9rem',
                        padding: '8px 16px',
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
                        lineHeight: '1.5',
                        minHeight: '2.875rem',
                      }}
                      inputStyle={{
                        color: '#006bb3',
                        fontSize: '0.9rem'
                      }}
                      popupStyle={{
                        border: '1px solid #0092ff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 146, 255, 0.15)'
                      }}
                      onChange={handleDateRangeChange}
                      disabledDate={(current) => current && current > dayjs().endOf('day')}
                    />
                  </div>
                </Col>
              )}
            </Row>

            <Space
              style={{
                marginTop: '24px',
                width: '100%',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
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
                  padding: '0 16px',
                  height: '40px',
                  width: '100%',
                  maxWidth: '200px'
                }}
              >
                <span className="responsive-text">Download CSV</span>
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
                  padding: '0 16px',
                  height: '40px',
                  width: '100%',
                  maxWidth: '200px'
                }}
              >
                <span className="responsive-text">Generate PDF</span>
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
              <div style={{
                marginTop: '24px',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  overflow: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px'
                }}>
                  <iframe
                    src={pdfUrl}
                    style={{
                      width: '100%',
                      height: `1200px`,
                      border: 'none',
                    }}
                    title="Analytics Report"
                  />
                </div>
                <div style={{
                  textAlign: 'right',
                  marginTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Text className="text-dark" style={{ fontSize: '12px' }}>
                    Scroll horizontally to view full document
                  </Text>
                  <Button
                    type="link"
                    href={pdfUrl}
                    target="_blank"
                    download={`${reportType}_report_${period === 'custom' ? 'custom_range' : period}.pdf`}
                    style={{ fontWeight: 500 }}
                  >
                    <DownloadOutlined /> Download PDF
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <style>{`
        @media (max-width: 768px) {
          .responsive-text {
            display: none;
          }
          .ant-btn .anticon {
            margin-right: 0 !important;
          }
        }
        @media (max-width: 576px) {
          .pdf-container {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportsTeam;