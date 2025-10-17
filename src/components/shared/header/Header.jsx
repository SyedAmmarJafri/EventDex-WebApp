import { useContext, useEffect, useState } from 'react'
import { FiAlignLeft, FiMaximize, FiMinimize, FiMoon, FiSun } from "react-icons/fi";
import NotificationsModal from './NotificationsModal';
import ProfileModal from './ProfileModal';
import Support from './SearchModal';
import { NavigationContext } from '../../../contentApi/navigationProvider';

const Header = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext);
    const [navigationExpend, setNavigationExpend] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [userPermissions, setUserPermissions] = useState({
        role: '',
        permissions: []
    });

    // Check permissions on component mount
    useEffect(() => {
        const authData = JSON.parse(localStorage.getItem("authData"));
        if (authData) {
            setUserPermissions({
                role: authData.role,
                permissions: authData.permissions || []
            });
        }
    }, []);

    const handleThemeMode = (type) => {
        const isDark = type === "dark";
        setDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add("app-skin-dark");
            localStorage.setItem("skinTheme", "dark");
        } else {
            document.documentElement.classList.remove("app-skin-dark");
            localStorage.setItem("skinTheme", "light");
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const newWindowWidth = window.innerWidth;
            setIsMobile(newWindowWidth <= 1024);

            if (newWindowWidth <= 1024) {
                document.documentElement.classList.remove('minimenu');
                const downNav = document.querySelector('.navigation-down-1600');
                if (downNav) downNav.style.display = 'none';
            } else if (newWindowWidth >= 1025 && newWindowWidth <= 1400) {
                // Restore the saved navigation state for medium screens
                const savedNavState = localStorage.getItem("navigationExpend");
                if (savedNavState === "true") {
                    document.documentElement.classList.remove('minimenu');
                    setNavigationExpend(true);
                } else {
                    document.documentElement.classList.add('minimenu');
                    setNavigationExpend(false);
                }

                const upNav = document.querySelector('.navigation-up-1600');
                const downNav = document.querySelector('.navigation-down-1600');
                if (upNav) upNav.style.display = 'none';
                if (downNav) downNav.style.display = 'block';
            } else {
                document.documentElement.classList.remove('minimenu');
                const upNav = document.querySelector('.navigation-up-1600');
                const downNav = document.querySelector('.navigation-down-1600');
                if (upNav) upNav.style.display = 'block';
                if (downNav) downNav.style.display = 'none';
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        const savedSkinTheme = localStorage.getItem("skinTheme");
        if (savedSkinTheme) {
            handleThemeMode(savedSkinTheme);
        }

        // Load navigation state from localStorage
        const savedNavState = localStorage.getItem("navigationExpend");
        if (savedNavState !== null) {
            setNavigationExpend(savedNavState === "true");
            if (savedNavState === "true") {
                document.documentElement.classList.remove('minimenu');
            } else {
                document.documentElement.classList.add('minimenu');
            }
        }

        // Check if we're already in fullscreen mode
        const checkFullScreen = () => {
            setIsFullScreen(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
        };

        document.addEventListener('fullscreenchange', checkFullScreen);
        document.addEventListener('webkitfullscreenchange', checkFullScreen);
        document.addEventListener('mozfullscreenchange', checkFullScreen);
        document.addEventListener('MSFullscreenChange', checkFullScreen);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('fullscreenchange', checkFullScreen);
            document.removeEventListener('webkitfullscreenchange', checkFullScreen);
            document.removeEventListener('mozfullscreenchange', checkFullScreen);
            document.removeEventListener('MSFullscreenChange', checkFullScreen);
        };
    }, []);

    const handleNavigationExpendUp = (e, param) => {
        e.preventDefault();
        if (param === "show") {
            setNavigationExpend(true);
            document.documentElement.classList.remove('minimenu');
            localStorage.setItem("navigationExpend", "true");
        } else {
            setNavigationExpend(false);
            document.documentElement.classList.add('minimenu');
            localStorage.setItem("navigationExpend", "false");
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement &&
            !document.webkitFullscreenElement &&
            !document.mozFullScreenElement &&
            !document.msFullscreenElement) {
            // Enter fullscreen
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }

            document.documentElement.classList.add("fsh-infullscreen");
            document.body.classList.add("full-screen-helper");
            setIsFullScreen(true);
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }

            document.documentElement.classList.remove("fsh-infullscreen");
            document.body.classList.remove("full-screen-helper");
            setIsFullScreen(false);
        }
    };

    return (
        <header className="nxl-header">
            <div className="header-wrapper">
                <div className="header-left d-flex align-items-center gap-4">
                    <a
                        href="#"
                        className="nxl-head-mobile-toggler"
                        onClick={(e) => {
                            e.preventDefault();
                            setNavigationOpen(true);
                        }}
                        id="mobile-collapse"
                    >
                        <div className={`hamburger hamburger--arrowturn ${navigationOpen ? "is-active" : ""}`}>
                            <div className="hamburger-box">
                                <div className="hamburger-inner"></div>
                            </div>
                        </div>
                    </a>
                </div>
                <div className="header-right ms-auto">
                    <div className="d-flex justify-content-end align-items-center w-100">
                        <ProfileModal />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;