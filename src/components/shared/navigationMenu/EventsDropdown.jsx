import React, { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiCalendar, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { BASE_URL } from '/src/constants.js';

const EventsDropdown = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const dropdownRef = useRef(null);

    // Get authentication headers
    const getAuthHeaders = () => {
        const authData = JSON.parse(localStorage.getItem("authData"));
        return {
            'Authorization': `Bearer ${authData?.token}`,
            'Content-Type': 'application/json'
        };
    };

    // Fetch events from API
    const fetchEvents = async () => {
        try {
            setLoading(true);
            const authData = JSON.parse(localStorage.getItem("authData"));
            if (!authData?.token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`${BASE_URL}/api/events`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch events');
            }

            const data = await response.json();

            // Handle different response formats
            let eventsData = [];
            if (Array.isArray(data)) {
                eventsData = data;
            } else if (data.data && Array.isArray(data.data)) {
                eventsData = data.data;
            } else if (data.content && Array.isArray(data.content)) {
                eventsData = data.content;
            } else {
                throw new Error('Invalid data format received from server');
            }

            setEvents(eventsData);

            // Load previously selected event from localStorage or select first event by default
            const savedEventId = localStorage.getItem('eventid');
            let eventToSelect = null;

            if (savedEventId) {
                // Try to find the saved event
                eventToSelect = eventsData.find(event => event.id === savedEventId);
            }

            // If no saved event found or saved event doesn't exist, select the first event
            if (!eventToSelect && eventsData.length > 0) {
                eventToSelect = eventsData[0];
                localStorage.setItem('eventid', eventToSelect.id);
                toast.success(`Event "${eventToSelect.title}" selected by default`);
            }

            if (eventToSelect) {
                setSelectedEvent(eventToSelect);
                // Dispatch custom event for other components to listen to
                window.dispatchEvent(new CustomEvent('eventSelected', { detail: eventToSelect }));
            }

        } catch (err) {
            console.error('Error fetching events:', err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle event selection
    const handleEventSelect = (event) => {
        setSelectedEvent(event);
        localStorage.setItem('eventid', event.id);
        setIsOpen(false);
        toast.success(`Event "${event.title}" selected`);

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('eventSelected', { detail: event }));
    };

    // Clear selected event - now selects the first available event instead of clearing
    const handleResetSelection = () => {
        if (events.length > 0) {
            const firstEvent = events[0];
            setSelectedEvent(firstEvent);
            localStorage.setItem('eventid', firstEvent.id);
            setIsOpen(false);
            toast.success(`Event reset to "${firstEvent.title}"`);

            // Dispatch custom event for other components to listen to
            window.dispatchEvent(new CustomEvent('eventSelected', { detail: firstEvent }));
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch events on component mount
    useEffect(() => {
        fetchEvents();
    }, []);

    // Format date for display
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    // Check if event is active
    const isEventActive = (eventDate) => {
        try {
            return new Date(eventDate) > new Date();
        } catch (error) {
            return false;
        }
    };

    // Get available events (excluding the currently selected one)
    const getAvailableEvents = () => {
        if (!selectedEvent) return events;
        return events.filter(event => event.id !== selectedEvent.id);
    };

    const availableEvents = getAvailableEvents();

    return (
        <div className="events-dropdown-container" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <div
                className={`events-dropdown-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-content">
                    <FiCalendar className="trigger-icon" />
                    <div className="trigger-text">
                        {selectedEvent ? (
                            <>
                                <span className="event-title" style={{ color: "white" }}>
                                    {selectedEvent.title}
                                </span>
                                <span className="event-date">
                                    {formatDate(selectedEvent.eventDate)}
                                    {!isEventActive(selectedEvent.eventDate) && (
                                        <span className="status-badge expired">Expired</span>
                                    )}
                                </span>
                            </>
                        ) : (
                            <span className="placeholder">Select Event</span>
                        )}
                    </div>
                </div>
                <FiChevronDown className={`trigger-arrow ${isOpen ? 'rotate' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="events-dropdown-menu">

                    {/* Selected Event Info */}
                    {selectedEvent && (
                        <div className="selected-event-info">
                            <div className="current-label">Currently Selected:</div>
                            <div className="selected-event-details">
                                <div className="selected-event-title">{selectedEvent.title}</div>
                                <div className="selected-event-meta">
                                    <span>{formatDate(selectedEvent.eventDate)}</span>
                                    <span>{selectedEvent.venue}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="dropdown-loading">
                            <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <span>Loading events...</span>
                        </div>
                    )}

                    {/* Available Events List */}
                    {!loading && availableEvents.length > 0 && (
                        <div className="events-list">
                            <div className="available-label">Available Events:</div>
                            {availableEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className={`event-item ${!isEventActive(event.eventDate) ? 'expired' : ''}`}
                                    onClick={() => handleEventSelect(event)}
                                >
                                    <div className="event-info">
                                        <div className="event-title-line">
                                            <span className="event-title">{event.title}</span>
                                            {!isEventActive(event.eventDate) && (
                                                <span className="status-badge">Expired</span>
                                            )}
                                        </div>
                                        <div className="event-details">
                                            <span className="event-date">
                                                {formatDate(event.eventDate)}
                                            </span>
                                            <span className="event-venue">
                                                {event.venue}
                                            </span>
                                        </div>
                                    </div>
                                    <FiChevronDown className="select-arrow" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Other Events Available */}
                    {!loading && availableEvents.length === 0 && events.length > 0 && (
                        <div className="dropdown-empty">
                            <FiCheck className="empty-icon" />
                            <span>No other events available</span>
                            <div className="empty-subtext">
                                All events are currently selected
                            </div>
                        </div>
                    )}

                    {/* No Events Available At All */}
                    {!loading && events.length === 0 && (
                        <div className="dropdown-empty">
                            <FiCalendar className="empty-icon" />
                            <span>No events available</span>
                            <button
                                className="retry-btn"
                                onClick={fetchEvents}
                                type="button"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .events-dropdown-container {
                    position: relative;
                    width: 100%;
                    max-width: 280px;
                }

                .events-dropdown-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: #0092ff;
                    border: 1px solid #0092ff;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-height: 44px;
                }

                .events-dropdown-trigger:hover {
                    border-color: #0092ff;
                    background: #0092ff;
                }

                .events-dropdown-trigger.active {
                    border-color: #0092ff;
                    background: #0092ff;
                    box-shadow: 0 0 0 2px rgba(0, 146, 255, 0.1);
                }

                .trigger-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }

                .trigger-icon {
                    color: #ffffff;
                    font-size: 16px;
                    flex-shrink: 0;
                }

                .trigger-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                    flex: 1;
                }

                .event-title {
                    font-weight: 500;
                    font-size: 14px;
                    color: #ffffff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .event-date {
                    font-size: 12px;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .placeholder {
                    font-size: 14px;
                    color: #ffffff;
                }

                .trigger-arrow {
                    color: #ffffff;
                    transition: transform 0.2s ease;
                    flex-shrink: 0;
                }

                .trigger-arrow.rotate {
                    transform: rotate(180deg);
                }

                .events-dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: #ffffff;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    margin-top: 4px;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .dropdown-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    background: #f8f9fa;
                }

                .dropdown-header h6 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                }

                .reset-btn {
                    background: none;
                    border: none;
                    color: #0092ff;
                    font-size: 12px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }

                .reset-btn:hover {
                    background: #f0f8ff;
                }

                .selected-event-info {
                    padding: 12px;
                    background: #e3f2fd;
                    border-bottom: 1px solid #b3e0ff;
                    margin-bottom: 8px;
                }

                .current-label {
                    font-size: 11px;
                    color: #007acc;
                    font-weight: 600;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }

                .selected-event-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #333;
                    margin-bottom: 2px;
                }

                .selected-event-meta {
                    display: flex;
                    gap: 12px;
                    font-size: 12px;
                    color: #666;
                }

                .available-label {
                    font-size: 11px;
                    color: #666;
                    font-weight: 600;
                    text-transform: uppercase;
                    padding: 8px 12px 4px;
                    margin-bottom: 4px;
                }

                .dropdown-loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 16px 12px;
                    color: #666;
                    font-size: 14px;
                }

                .events-list {
                    padding: 4px 0;
                }

                .event-item {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    padding: 10px 12px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    border-bottom: 1px solid #f0f0f0;
                }

                .event-item:last-child {
                    border-bottom: none;
                }

                .event-item:hover {
                    background-color: #f8f9fa;
                }

                .event-item.expired {
                    opacity: 0.7;
                }

                .event-info {
                    flex: 1;
                    min-width: 0;
                }

                .event-title-line {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .event-title {
                    font-weight: 500;
                    font-size: 14px;
                    color: #333;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 0;
                }

                .event-details {
                    display: flex;
                    gap: 12px;
                    font-size: 12px;
                    color: #666;
                    flex-wrap: wrap;
                }

                .status-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    background: #ff6b6b;
                    color: white;
                    border-radius: 10px;
                    font-weight: 500;
                }

                .status-badge.expired {
                    background: #6c757d;
                }

                .select-arrow {
                    color: #0092ff;
                    font-size: 14px;
                    flex-shrink: 0;
                    margin-left: 8px;
                    opacity: 0.7;
                }

                .dropdown-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 24px 12px;
                    color: #999;
                    text-align: center;
                }

                .empty-icon {
                    font-size: 24px;
                    opacity: 0.5;
                }

                .empty-subtext {
                    font-size: 12px;
                    color: #666;
                    margin-top: -4px;
                }

                .retry-btn {
                    background: #0092ff;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    margin-top: 8px;
                }

                .retry-btn:hover {
                    background: #007acc;
                }

                /* Ensure text colors are proper in dropdown */
                .events-dropdown-menu .event-title,
                .events-dropdown-menu .event-date,
                .events-dropdown-menu .event-venue {
                    color: #333;
                }

                .events-dropdown-menu .event-details {
                    color: #666;
                }
            `}</style>
        </div>
    );
};

export default EventsDropdown;