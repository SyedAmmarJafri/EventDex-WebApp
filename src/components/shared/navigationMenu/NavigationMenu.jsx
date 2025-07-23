import React, { useContext, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PerfectScrollbar from "react-perfect-scrollbar";
import Menus from './Menus';
import { NavigationContext } from '../../../contentApi/navigationProvider';

const NavigationManu = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
    const pathName = useLocation().pathname
    const [skinTheme, setSkinTheme] = useState(localStorage.getItem('skinTheme') || 'light');
    
    useEffect(() => {
        setNavigationOpen(false)
    }, [pathName])

    useEffect(() => {
        const handleStorageChange = () => {
            setSkinTheme(localStorage.getItem('skinTheme') || 'light');
        };

        // Listen for storage changes
        window.addEventListener('storage', handleStorageChange);

        // Also listen for changes within the same tab (since storage event only works across tabs)
        const intervalId = setInterval(() => {
            const currentTheme = localStorage.getItem('skinTheme') || 'light';
            if (currentTheme !== skinTheme) {
                setSkinTheme(currentTheme);
            }
        }, 200); // Check every 200ms

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
        };
    }, [skinTheme]);
    
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
                        <div style={{ height: "18px" }}></div>
                    </PerfectScrollbar>
                </div>
            </div>
            <div onClick={() => setNavigationOpen(false)} className={`${navigationOpen ? "nxl-menu-overlay" : ""}`}></div>
        </nav>
    )
}

export default NavigationManu