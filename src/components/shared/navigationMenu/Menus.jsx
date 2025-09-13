import { Fragment, useEffect, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import getIcon from "@/utils/getIcon";

const Menus = () => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const [openSubDropdown, setOpenSubDropdown] = useState(null);
    const [activeParent, setActiveParent] = useState("");
    const [activeChild, setActiveChild] = useState("");
    const pathName = useLocation().pathname;
    const [authData, setAuthData] = useState(null);

    useEffect(() => {
        // Load auth data from localStorage
        const data = JSON.parse(localStorage.getItem('authData'));
        setAuthData(data);
    }, []);

    const handleMainMenu = (e, name) => {
        if (openDropdown === name) {
            setOpenDropdown(null);
        } else {
            setOpenDropdown(name);
        }
    };

    const handleDropdownMenu = (e, name) => {
        e.stopPropagation();
        if (openSubDropdown === name) {
            setOpenSubDropdown(null);
        } else {
            setOpenSubDropdown(name);
        }
    };

    useEffect(() => {
        if (pathName !== "/") {
            const x = pathName.split("/");
            setActiveParent(x[1]);
            setActiveChild(x[2]);
            setOpenDropdown(x[1]);
            setOpenSubDropdown(x[2]);
        } else {
            setActiveParent("dashboards");
            setOpenDropdown("dashboards");
        }
    }, [pathName]);

    // Check if menu item should be visible
    const shouldShowMenu = (menuName, subMenuName = null) => {
        if (!authData) return false;

        // Always show Help Center to everyone
        if (menuName.toLowerCase() === "help center") return true;

        // CLIENT_ADMIN can see all other menus
        if (authData.role === "CLIENT_ADMIN") return true;

        // Check tabPermissions for other menus
        const permissions = authData.tabPermissions || {};

        // Convert names to match permission keys
        const menuKey = menuName.toLowerCase().replace(/\s+/g, '_');
        const subMenuKey = subMenuName ? subMenuName.toLowerCase().replace(/\s+/g, '_') : null;

        // For main menu items with direct paths
        if (subMenuName === null) {
            return permissions[menuKey] === true;
        }

        // For dropdown menu items
        return permissions[subMenuKey] === true;
    };

    // Filter dropdown menu items based on permissions
    const getFilteredDropdownMenu = (dropdownMenu, parentName) => {
        if (!authData) return [];
        if (authData.role === "CLIENT_ADMIN") return dropdownMenu;

        return dropdownMenu.filter(item => {
            if (item.subdropdownMenu === false) {
                // For regular dropdown items
                return shouldShowMenu(parentName, item.name);
            }
            // For items with submenus (not used in current structure)
            return true;
        });
    };

    return (
        <>
            {menuList.map(({ dropdownMenu, id, name, path, icon }) => {
                // Skip rendering if menu shouldn't be shown
                if (!shouldShowMenu(name)) return null;

                const filteredDropdownMenu = getFilteredDropdownMenu(dropdownMenu, name);
                const hasDropdown = filteredDropdownMenu.length > 0;

                return (
                    <li
                        key={id}
                        onClick={(e) => handleMainMenu(e, name)}
                        className={`nxl-item ${hasDropdown ? 'nxl-hasmenu' : ''} ${activeParent === name ? "active nxl-trigger" : ""}`}
                    >
                        <Link to={path} className="nxl-link text-capitalize">
                            <span className="nxl-micon"> {getIcon(icon)} </span>
                            <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
                                {name}
                            </span>
                            {hasDropdown && (
                                <span className="nxl-arrow fs-16">
                                    <FiChevronRight />
                                </span>
                            )}
                        </Link>
                        {hasDropdown && (
                            <ul
                                className={`nxl-submenu ${openDropdown === name ? "nxl-menu-visible" : "nxl-menu-hidden"}`}
                            >
                                {filteredDropdownMenu.map(({ id, name, path, subdropdownMenu }) => {
                                    const x = name;
                                    return (
                                        <Fragment key={id}>
                                            {subdropdownMenu && subdropdownMenu.length ? (
                                                <li
                                                    className={`nxl-item nxl-hasmenu ${activeChild === name ? "active" : ""
                                                        }`}
                                                    onClick={(e) => handleDropdownMenu(e, x)}
                                                >
                                                    <Link to={path} className={`nxl-link text-capitalize`}>
                                                        <span className="nxl-mtext">{name}</span>
                                                        <span className="nxl-arrow">
                                                            <i>
                                                                {" "}
                                                                <FiChevronRight />
                                                            </i>
                                                        </span>
                                                    </Link>
                                                    {subdropdownMenu.map(({ id, name, path }) => {
                                                        return (
                                                            <ul
                                                                key={id}
                                                                className={`nxl-submenu ${openSubDropdown === x
                                                                    ? "nxl-menu-visible"
                                                                    : "nxl-menu-hidden "
                                                                    }`}
                                                            >
                                                                <li
                                                                    className={`nxl-item ${pathName === path ? "active" : ""
                                                                        }`}
                                                                >
                                                                    <Link
                                                                        className="nxl-link text-capitalize"
                                                                        to={path}
                                                                    >
                                                                        {name}
                                                                    </Link>
                                                                </li>
                                                            </ul>
                                                        );
                                                    })}
                                                </li>
                                            ) : (
                                                <li
                                                    className={`nxl-item ${pathName === path ? "active" : ""
                                                        }`}
                                                >
                                                    <Link className="nxl-link" to={path}>
                                                        {name}
                                                    </Link>
                                                </li>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </ul>
                        )}
                    </li>
                );
            })}
        </>
    );
};

export default Menus;

// Updated menuList with permission keys
export const menuList = [
    {
        id: 0,
        name: "dashboard",
        path: "/",
        icon: 'feather-airplay',
        dropdownMenu: []
    },
    {
        id: 1,
        name: "POS",
        path: "/pos",
        icon: 'feather-monitor',
        dropdownMenu: []
    },
    {
        id: 2,
        name: "Orders",
        path: "/orders",
        icon: 'feather-shopping-bag',
        dropdownMenu: []
    },
    {
        id: 3,
        name: "Products",
        path: "#",
        icon: 'feather-grid',
        dropdownMenu: [
            {
                id: 1,
                name: "Category",
                path: "/category",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Item",
                path: "/item",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Deal",
                path: "/deal",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 4,
        name: "Customers",
        path: "/customer",
        icon: 'feather-users',
        dropdownMenu: []
    },
    {
        id: 5,
        name: "Discounts",
        path: "/discount",
        icon: 'feather-send',
        dropdownMenu: []
    },
    {
        id: 6,
        name: "Marketing",
        path: "#",
        icon: 'feather-mail',
        dropdownMenu: [
            {
                id: 1,
                name: "Email Marketing",
                path: "/marketing",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Marketing Template",
                path: "/template",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 8,
        name: "Inventory",
        path: "/inventory",
        icon: 'feather-layers',
        dropdownMenu: []
    },
    {
        id: 9,
        name: "Finance",
        path: "/finance",
        icon: 'feather-dollar-sign',
        dropdownMenu: []
    },
    {
        id: 10,
        name: "Analytics",
        path: "#",
        icon: 'feather-bar-chart-2',
        dropdownMenu: [
            {
                id: 1,
                name: "Sales Analytics",
                path: "/analytics/sales",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Product Analytics",
                path: "/analytics/product",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Customer Analytics",
                path: "/analytics/customer",
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Financial Analytics",
                path: "/analytics/financial",
                subdropdownMenu: false
            },
            {
                id: 5,
                name: "Team Analytics",
                path: "/analytics/team",
                subdropdownMenu: false
            },
            {
                id: 6,
                name: "Comparison Analytics",
                path: "/analytics/comparison",
                subdropdownMenu: false
            },
            {
                id: 7,
                name: "Reports",
                path: "/reports",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 11,
        name: "Live Tracking",
        path: "/tracker",
        icon: 'feather-map-pin',
        dropdownMenu: []
    },
    {
        id: 12,
        name: "Users",
        path: "#",
        icon: 'feather-users',
        dropdownMenu: [
            {
                id: 1,
                name: "Team",
                path: "/team",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Role",
                path: "/role",
                subdropdownMenu: false
            }
        ]
    },
    {
        id: 13,
        name: "Online Store",
        path: "/Store",
        icon: 'feather-shopping-cart',
        dropdownMenu: []
    },
];