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
                if (parsedAuthData.role === 'PATRON') {
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
                    setShowAppCard(parsedAuthData.role === 'PATRON');
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
                    if (parsedAuthData.role === 'PATRON' !== showAppCard) {
                        setShowAppCard(parsedAuthData.role === 'PATRON');
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
                    </PerfectScrollbar>
                </div>
            </div>
            <div onClick={() => setNavigationOpen(false)} className={`${navigationOpen ? "nxl-menu-overlay" : ""}`}></div>
        </nav>
    )
}

export default NavigationManu