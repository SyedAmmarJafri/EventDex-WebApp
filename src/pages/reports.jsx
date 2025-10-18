import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Select,
  message,
  Spin,
  Typography,
  Space
} from 'antd';
import { 
  DownloadOutlined, 
  FilePdfOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { BASE_URL } from '/src/constants.js';

const { Option } = Select;
const { Title, Text } = Typography;

const ReportsTeam = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('event-analytics');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [events, setEvents] = useState([]);
  const [subdomains, setSubdomains] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSubdomain, setSelectedSubdomain] = useState(null);
  const [showPdfPage, setShowPdfPage] = useState(false);

  // Get authentication token
  const getAuthToken = () => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.token;
      } catch (error) {
        console.error('Error parsing auth data:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/events`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data && response.data.success) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Failed to fetch events');
    }
  };

  const fetchSubdomains = async (eventId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      // First fetch parent domains for the event
      const parentDomainsResponse = await axios.get(`${BASE_URL}/api/events/${eventId}/domains`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (parentDomainsResponse.data && parentDomainsResponse.data.success) {
        const parentDomains = parentDomainsResponse.data.data || [];
        
        // Then fetch all subdomains and filter by parent domains
        const subdomainsResponse = await axios.get(`${BASE_URL}/api/subdomains`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (subdomainsResponse.data && subdomainsResponse.data.success) {
          const allSubdomains = subdomainsResponse.data.data || [];
          
          // Filter subdomains that belong to the current event's parent domains
          const eventParentDomainIds = parentDomains.map(domain => domain.id);
          const eventSubdomains = allSubdomains.filter(subdomain =>
            eventParentDomainIds.includes(subdomain.parentDomainId)
          );
          
          setSubdomains(eventSubdomains);
        } else {
          setSubdomains([]);
        }
      } else {
        setSubdomains([]);
      }
    } catch (error) {
      console.error('Error fetching subdomains:', error);
      message.error('Failed to fetch subdomains');
      setSubdomains([]);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        message.error('Authentication token not found');
        return;
      }

      let endpoint = '';
      let filename = '';

      switch (reportType) {
        case 'event-analytics':
          if (!selectedEvent) {
            message.error('Please select an event');
            setLoading(false);
            return;
          }
          endpoint = `${BASE_URL}/api/analytics/event/${selectedEvent}/report/pdf`;
          filename = `Event_Analytics_${selectedEvent}.pdf`;
          break;

        case 'comprehensive-report':
          if (!selectedEvent) {
            message.error('Please select an event');
            setLoading(false);
            return;
          }
          endpoint = `${BASE_URL}/api/analytics/event/${selectedEvent}/report/comprehensive/pdf`;
          filename = `Comprehensive_Report_${selectedEvent}.pdf`;
          break;

        case 'subdomain-participants':
          if (!selectedSubdomain) {
            message.error('Please select a subdomain');
            setLoading(false);
            return;
          }
          endpoint = `${BASE_URL}/api/analytics/subdomain/${selectedSubdomain}/participants/pdf`;
          filename = `Participants_${selectedSubdomain}.pdf`;
          break;

        default:
          message.error('Invalid report type');
          setLoading(false);
          return;
      }

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setShowPdfPage(true);

    } catch (error) {
      console.error('Error generating PDF report:', error);
      message.error('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId) => {
    setSelectedEvent(eventId);
    setSelectedSubdomain(null);
    setPdfUrl(null);
    setShowPdfPage(false);
    if (eventId) {
      fetchSubdomains(eventId);
    } else {
      setSubdomains([]);
    }
  };

  const handleSubdomainChange = (subdomainId) => {
    setSelectedSubdomain(subdomainId);
    setPdfUrl(null);
    setShowPdfPage(false);
  };

  const handleReportTypeChange = (value) => {
    setReportType(value);
    setPdfUrl(null);
    setSelectedSubdomain(null);
    setShowPdfPage(false);
  };

  const goBackToReport = () => {
    setShowPdfPage(false);
  };

  const isGenerateDisabled = () => {
    switch (reportType) {
      case 'event-analytics':
      case 'comprehensive-report':
        return !selectedEvent;
      case 'subdomain-participants':
        return !selectedSubdomain;
      default:
        return true;
    }
  };

  // PDF Display Page Component
  const PdfDisplayPage = () => (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#fff'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#111827' }}>
          PDF Report - {reportType.replace('-', ' ').toUpperCase()}
        </Title>
        <Space>
          <Button
            type="default"
            onClick={goBackToReport}
            style={{ marginRight: '8px' }}
          >
            Back to Report
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={pdfUrl}
            target="_blank"
            download={`${reportType}_report.pdf`}
          >
            Download PDF
          </Button>
        </Space>
      </div>

      <div style={{
        width: '100%',
        height: 'calc(100vh - 200px)',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <iframe
          src={pdfUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Analytics Report"
        />
      </div>
    </div>
  );

  // Main Report Generator Component
  const ReportGenerator = () => (
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
        Event Analytics Reports
      </Title>

      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card
            className="card bg-white text-light"
            title={<Text strong style={{ fontSize: '16px' }} className="text-dark">Generate PDF Report</Text>}
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
                    }}
                    dropdownStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #0092ff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 146, 255, 0.15)'
                    }}
                    value={reportType}
                    onChange={handleReportTypeChange}
                  >
                    <Option value="event-analytics">Event Analytics Report</Option>
                    <Option value="comprehensive-report">Comprehensive Event Report</Option>
                    <Option value="subdomain-participants">Subdomain Participant List</Option>
                  </Select>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }} className="text-dark">Select Event</Text>
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
                      minHeight: '2.875rem'
                    }}
                    value={selectedEvent}
                    onChange={handleEventChange}
                    placeholder="Select an event"
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {events.map(event => (
                      <Option key={event.id} value={event.id}>
                        {event.title}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>

              {(reportType === 'subdomain-participants' || reportType === 'event-analytics') && (
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '8px' }} className="text-dark">
                      {reportType === 'subdomain-participants' ? 'Select Subdomain' : 'Select Subdomain'}
                    </Text>
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
                        minHeight: '2.875rem'
                      }}
                      value={selectedSubdomain}
                      onChange={handleSubdomainChange}
                      placeholder="Select a subdomain"
                      disabled={!selectedEvent}
                    >
                      {subdomains.map(subdomain => (
                        <Option key={subdomain.id} value={subdomain.id}>
                          {subdomain.name} ({subdomain.parentDomainName || subdomain.parentDomain})
                        </Option>
                      ))}
                    </Select>
                  </div>
                </Col>
              )}
            </Row>

            <div
              style={{
                marginTop: '24px',
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={generateReport}
                loading={loading}
                size="large"
                disabled={isGenerateDisabled()}
                style={{
                  fontWeight: '500',
                  background: '#0092ff',
                  border: 'none',
                  boxShadow: '0 1px 3px rgba(16, 148, 185, 0.3)',
                  padding: '0 24px',
                  height: '40px',
                  minWidth: '200px'
                }}
              >
                Generate PDF Report
              </Button>
            </div>

            {loading && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
              }}>
                <Spin size="large" tip="Generating PDF report..." />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Render either PDF page or report generator
  return showPdfPage && pdfUrl ? <PdfDisplayPage /> : <ReportGenerator />;
};

export default ReportsTeam;