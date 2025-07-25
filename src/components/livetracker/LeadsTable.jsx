import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';

const RidersAndMapView = () => {
    // Sample rider data
    const riders = [
        { id: 1, name: 'John Doe', status: 'active', vehicle: 'Motorcycle', phone: '+1234567890' },
        { id: 2, name: 'Jane Smith', status: 'inactive', vehicle: 'Bicycle', phone: '+0987654321' },
        { id: 3, name: 'Mike Johnson', status: 'on-delivery', vehicle: 'Car', phone: '+1122334455' },
        { id: 4, name: 'Sarah Williams', status: 'active', vehicle: 'Motorcycle', phone: '+5566778899' },
        { id: 5, name: 'Alex Brown', status: 'active', vehicle: 'Bicycle', phone: '+6677889900' },
        { id: 6, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 7, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 8, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 9, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 10, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 11, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 12, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 13, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },
        { id: 14, name: 'Emily Davis', status: 'on-delivery', vehicle: 'Motorcycle', phone: '+3344556677' },

    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'secondary';
            case 'on-delivery':
                return 'warning';
            default:
                return 'primary';
        }
    };

    return (
        <div className="container-fluid mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Live Tracker</h4>
            </div>
            <div className="row">
                {/* Left Card - Riders List (1/3 width) */}
                <div className="col-lg-3 col-md-5 mb-4">
                    <Card className="h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Riders</h5>
                            <span className="badge bg-primary">{riders.length} riders</span>
                        </Card.Header>
                        <Card.Body style={{
                            overflowY: 'auto',
                            maxHeight: '600px',
                            scrollbarWidth: 'none',  // Firefox
                            msOverflowStyle: 'none', // IE/Edge
                        }} className="hide-scrollbar">
                            <ListGroup variant="flush">
                                {riders.map(rider => (
                                    <ListGroup.Item
                                        key={rider.id}
                                        className="d-flex justify-content-between align-items-center"
                                        action
                                    >
                                        <div>
                                            <h6 className="mb-1">{rider.name}</h6>
                                            <small className="text-muted">
                                                {rider.vehicle} • {rider.phone}
                                            </small>
                                        </div>
                                        <Badge bg={getStatusBadge(rider.status)} pill>
                                            {rider.status.replace('-', ' ')}
                                        </Badge>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </div>

                {/* Right Card - Map (2/3 width) */}
                <div className="col-lg-9 col-md-7 mb-4">
                    <Card className="h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Rider Locations</h5>
                            <div>
                                <span className="badge bg-success me-2">Active: 4</span>
                                <span className="badge bg-warning">On Delivery: 2</span>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3618.848264509226!2d67.02906507482791!3d24.903156843548814!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjTCsDU0JzExLjQiTiA2N8KwMDEnNTMuOSJF!5e0!3m2!1sen!2s!4v1753467072308!5m2!1sen!2s"
                                width="100%"
                                height="100%"
                                style={{ minHeight: '500px', border: 'none' }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Rider Locations Map"
                            ></iframe>
                        </Card.Body>
                        <Card.Footer className="text-muted">
                            <small>Real-time tracking | Last refreshed: {new Date().toLocaleTimeString()}</small>
                        </Card.Footer>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default RidersAndMapView;