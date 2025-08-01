import React, { useContext, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PerfectScrollbar from "react-perfect-scrollbar";
import Menus from './Menus';
import { NavigationContext } from '../../../contentApi/navigationProvider';

const NavigationManu = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
    const pathName = useLocation().pathname
    const [skinTheme, setSkinTheme] = useState(localStorage.getItem('skinTheme') || 'light');
    const [showAppCard, setShowAppCard] = useState(false);

    useEffect(() => {
        setNavigationOpen(false)
    }, [pathName])

    useEffect(() => {
        // Check user role from localStorage
        const authData = localStorage.getItem('authData');
        if (authData) {
            try {
                const parsedAuthData = JSON.parse(authData);
                if (parsedAuthData.role === 'CLIENT_ADMIN') {
                    setShowAppCard(true);
                }
            } catch (error) {
                console.error('Error parsing authData:', error);
            }
        }

        const handleStorageChange = () => {
            setSkinTheme(localStorage.getItem('skinTheme') || 'light');

            // Also check for role changes
            const updatedAuthData = localStorage.getItem('authData');
            if (updatedAuthData) {
                try {
                    const parsedAuthData = JSON.parse(updatedAuthData);
                    setShowAppCard(parsedAuthData.role === 'CLIENT_ADMIN');
                } catch (error) {
                    console.error('Error parsing updated authData:', error);
                }
            } else {
                setShowAppCard(false);
            }
        };

        // Listen for storage changes
        window.addEventListener('storage', handleStorageChange);

        // Also listen for changes within the same tab (since storage event only works across tabs)
        const intervalId = setInterval(() => {
            const currentTheme = localStorage.getItem('skinTheme') || 'light';
            if (currentTheme !== skinTheme) {
                setSkinTheme(currentTheme);
            }

            // Check for role changes in the same tab
            const currentAuthData = localStorage.getItem('authData');
            if (currentAuthData) {
                try {
                    const parsedAuthData = JSON.parse(currentAuthData);
                    if (parsedAuthData.role === 'CLIENT_ADMIN' !== showAppCard) {
                        setShowAppCard(parsedAuthData.role === 'CLIENT_ADMIN');
                    }
                } catch (error) {
                    console.error('Error parsing current authData:', error);
                }
            } else if (showAppCard) {
                setShowAppCard(false);
            }
        }, 200); // Check every 200ms

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
        };
    }, [skinTheme, showAppCard]);

    return (
        <nav className={`nxl-navigation ${navigationOpen ? "mob-navigation-active" : ""}`}>
            <div className="navbar-wrapper">
                <div className="m-header">
                    <Link to="/" className="b-brand">
                        {/* Conditional logo based on theme */}
                        {skinTheme === 'light' ? (
                            <img src="/images/Merchantlify Logo 1.svg" alt="logo" className="logo logo-lg" width={220} />
                        ) : (
                            <img src="/images/Merchantlify Logo 2.svg" alt="logo" className="logo logo-lg" width={220} />
                        )}
                        <img src="/images/Merchantlify Icon.svg" alt="logo" className="logo logo-sm" />
                    </Link>
                </div>

                <div className={`navbar-content`}>
                    <PerfectScrollbar>
                        <ul className="nxl-navbar">
                            <Menus />
                        </ul>
                        {showAppCard && (
                            <div className="card text-center border-0 position-relative" style={{
                                background: 'linear-gradient(135deg, #0092ff 0%, #005ece 100%)',
                                borderRadius: '12px',
                                boxShadow: '0 3px 5px rgba(0, 0, 0, 0.16)',
                                overflow: 'hidden',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                {/* Subtle background pattern */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 20%)',
                                    pointerEvents: 'none'
                                }}></div>

                                <div className="card-body p-4 position-relative">
                                    {/* Improved typography */}
                                    <h6 className="mt-3 text-white fw-bold mb-1" style={{
                                        fontSize: '1.1rem',
                                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                    }}>Get Our Delivery App</h6>

                                    <p className="text-white opacity-85 mb-4" style={{
                                        fontSize: '0.85rem',
                                        lineHeight: '1.5',
                                        maxWidth: '240px',
                                        margin: '0 auto'
                                    }}>Fast, reliable deliveries at your fingertips</p>

                                    <button className="btn btn-outline-light w-100 py-2 mt-3 d-flex align-items-center justify-content-center" style={{
                                        borderRadius: '12px',
                                        gap: '10px',
                                        backgroundColor: '#fff',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#0c0c0cff" className="text-start" viewBox="0 0 16 16">
                                            <path d="M14.222 9.374c1.037-.61 1.037-2.137 0-2.748L11.528 5.04 8.32 8l3.207 2.96zm-3.595 2.116L7.583 8.68 1.03 14.73c.201 1.029 1.36 1.61 2.303 1.055zM1 13.396V2.603L6.846 8zM1.03 1.27l6.553 6.05 3.044-2.81L3.333.215C2.39-.341 1.231.24 1.03 1.27" />
                                        </svg>
                                        <div className="text-start" style={{ lineHeight: '1.1', color: '#0c0c0cff' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.5px' }}>GET IT ON</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Google Play</div>
                                        </div>
                                    </button>
                                    {/* App Store alternative option */}
                                    <button className="btn btn-outline-light w-100 py-2 mt-3 d-flex align-items-center justify-content-center" style={{
                                        borderRadius: '12px',
                                        gap: '10px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" className="text-start text-light" viewBox="0 0 16 16">
                                            <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
                                            <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
                                        </svg>
                                        <div className="text-start text-white" style={{ lineHeight: '1.1' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.5px' }}>Download on the</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>App Store</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </PerfectScrollbar>
                </div>
            </div>
            <div onClick={() => setNavigationOpen(false)} className={`${navigationOpen ? "nxl-menu-overlay" : ""}`}></div>
        </nav>
    )
}

export default NavigationManu