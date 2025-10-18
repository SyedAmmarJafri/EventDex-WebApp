import { Fragment, useEffect, useState } from "react";
import {
  FiChevronRight,
  FiHome,
  FiCalendar,
  FiGrid,
  FiTag,
  FiList,
  FiUsers,
  FiGift,
  FiDollarSign,
  FiBarChart2,
  FiFileText,
  FiKey,
  FiUserPlus, // Added for registration participants
} from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import EventsDropdown from "./EventsDropdown"; // Import the dropdown component

// Icon map — reference by the 'icon' key in menuList
const ICONS = {
  dashboard: <FiHome />,
  events: <FiCalendar />,
  modules: <FiGrid />,
  category: <FiTag />,
  "sub category": <FiList />,
  participants: <FiUserPlus />, // Changed from FiUsers to FiUserPlus for registrations
  sponsor: <FiGift />,
  finance: <FiDollarSign />,
  analytics: <FiBarChart2 />,
  reports: <FiFileText />,
  users: <FiUsers />,
  team: <FiUsers />,
  role: <FiKey />,
  userplus: <FiUserPlus />,
};

export const menuList = [
  {
    id: 0,
    name: "dashboard",
    path: "/",
    icon: "dashboard",
    dropdownMenu: [],
  },
  {
    id: 5,
    name: "Events",
    path: "/discount",
    icon: "events",
    dropdownMenu: [],
  },
  {
    id: 3,
    name: "Modules",
    path: "#",
    icon: "modules",
    dropdownMenu: [
      {
        id: 1,
        name: "Category",
        path: "/category",
        icon: "category",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Sub Category",
        path: "/item",
        icon: "sub category",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 4,
    name: "Participants",
    path: "/customer",
    icon: "participants",
    dropdownMenu: [],
  },
  {
    id: 6,
    name: "Event Sponsors",
    path: "/deal",
    icon: "sponsor",
    dropdownMenu: [],
  },
  {
    id: 9,
    name: "Finance",
    path: "/finance",
    icon: "finance",
    dropdownMenu: [],
  },
  {
    id: 10,
    name: "Analytics",
    path: "#",
    icon: "analytics",
    dropdownMenu: [
     
      {
        id: 1,
        name: "Reports",
        path: "/reports",
        icon: "reports",
        subdropdownMenu: false,
      }
    ],
  },
  {
    id: 12,
    name: "Users",
    path: "#",
    icon: "users",
    dropdownMenu: [
      {
        id: 1,
        name: "Team",
        path: "/team",
        icon: "team",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Role",
        path: "/role",
        icon: "role",
        subdropdownMenu: false,
      },
    ],
  },
];

const Menus = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openSubDropdown, setOpenSubDropdown] = useState(null);
  const [activeParent, setActiveParent] = useState("");
  const [activeChild, setActiveChild] = useState("");
  const pathName = useLocation().pathname;
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    // Load auth data from localStorage
    const data = JSON.parse(localStorage.getItem("authData"));
    setAuthData(data);
  }, []);

  const normalize = (s = "") => String(s).toLowerCase().replace(/\/+$/, "");

  const findActiveFromPath = (pathname) => {
    const normalizedPath = normalize(pathname === "" ? "/" : pathname);

    if (normalizedPath === "/" || normalizedPath === "") {
      const dash = menuList.find((m) => normalize(m.path) === "/");
      if (dash) return { parentName: dash.name, childName: "" };
    }
    for (const menu of menuList) {
      if (menu.path && menu.path !== "#" && normalize(menu.path) === normalizedPath) {
        return { parentName: menu.name, childName: "" };
      }
    }
    for (const menu of menuList) {
      if (menu.dropdownMenu && menu.dropdownMenu.length) {
        for (const child of menu.dropdownMenu) {
          if (child.path && normalize(child.path) === normalizedPath) {
            return { parentName: menu.name, childName: child.name };
          }
          if (child.subdropdownMenu && Array.isArray(child.subdropdownMenu)) {
            for (const sub of child.subdropdownMenu) {
              if (normalize(sub.path) === normalizedPath) {
                return { parentName: menu.name, childName: child.name };
              }
            }
          }
        }
      }
    }
    return { parentName: "", childName: "" };
  };

  useEffect(() => {
    const { parentName, childName } = findActiveFromPath(pathName);
    if (parentName) {
      setActiveParent(parentName);
      setOpenDropdown(parentName);
    } else {
      setActiveParent("");
      setOpenDropdown(null);
    }
    if (childName) {
      setActiveChild(childName);
      setOpenSubDropdown(childName);
    } else {
      setActiveChild("");
      setOpenSubDropdown(null);
    }
  }, [pathName]);

  const handleMainMenu = (e, name, path) => {
    if (openDropdown === name) setOpenDropdown(null);
    else setOpenDropdown(name);
    setActiveParent(name);
    if (path && path !== "#") {
      setActiveChild("");
      setOpenSubDropdown(null);
    }
  };

  const handleDropdownMenu = (e, parentName, name) => {
    e.stopPropagation();
    if (openSubDropdown === name) setOpenSubDropdown(null);
    else setOpenSubDropdown(name);
    setActiveParent(parentName);
    setActiveChild(name);
    setOpenDropdown(parentName);
  };

  const shouldShowMenu = (menuName, subMenuName = null) => {
    if (!authData) return false;
    if (menuName.toLowerCase() === "help center") return true;
    if (authData.role === "PATRON") return true;
    const permissions = authData.tabPermissions || {};
    const menuKey = menuName.toLowerCase().replace(/\s+/g, "_");
    const subMenuKey = subMenuName ? subMenuName.toLowerCase().replace(/\s+/g, "_") : null;
    if (subMenuName === null) {
      return permissions[menuKey] === true;
    }
    return permissions[subMenuKey] === true;
  };

  const getFilteredDropdownMenu = (dropdownMenu, parentName) => {
    if (!authData) return [];
    if (authData.role === "PATRON") return dropdownMenu;
    return dropdownMenu.filter((item) => {
      if (item.subdropdownMenu === false) {
        return shouldShowMenu(parentName, item.name);
      }
      return true;
    });
  };

  const isActiveParent = (menuName) => normalize(menuName) === normalize(activeParent);

  return (
    <>
      <div className="events-dropdown-wrapper" style={{ padding: "10px 15px" }}>
        <EventsDropdown />
      </div>

      {menuList.map(({ dropdownMenu, id, name, path, icon }) => {
        if (!shouldShowMenu(name)) return null;

        const filteredDropdownMenu = getFilteredDropdownMenu(dropdownMenu, name);
        const hasDropdown = filteredDropdownMenu.length > 0;

        return (
          <li
            key={id}
            onClick={(e) => handleMainMenu(e, name, path)}
            className={`nxl-item ${hasDropdown ? "nxl-hasmenu" : ""} ${isActiveParent(name) ? "active nxl-trigger" : ""}`}
          >
            <Link
              to={path || "#"}
              className="nxl-link text-capitalize"
              onClick={(e) => {
                if (path === "#" || path === undefined) e.preventDefault();
                else {
                  setActiveParent(name);
                  setActiveChild("");
                  setOpenDropdown(name);
                  setOpenSubDropdown(null);
                }
              }}
            >
              <span className="nxl-micon" style={{ minWidth: 20, display: "inline-flex", alignItems: "center" }}>
                {ICONS[icon?.toLowerCase()] || ICONS[name.toLowerCase()] || <FiGrid />}
              </span>
              <span className="nxl-mtext" style={{ paddingLeft: "8px" }}>
                {name}
              </span>
              {hasDropdown && (
                <span className="nxl-arrow fs-16">
                  <FiChevronRight />
                </span>
              )}
            </Link>

            {hasDropdown && (
              <ul className={`nxl-submenu ${openDropdown === name ? "nxl-menu-visible" : "nxl-menu-hidden"}`}>
                {filteredDropdownMenu.map((child) => {
                  const childName = child.name;
                  const childPath = child.path;
                  const childIconKey = child.icon || childName.toLowerCase();

                  return (
                    <Fragment key={child.id}>
                      {child.subdropdownMenu && child.subdropdownMenu.length ? (
                        <li
                          className={`nxl-item nxl-hasmenu ${normalize(activeChild) === normalize(childName) ? "active" : ""}`}
                          onClick={(e) => handleDropdownMenu(e, name, childName)}
                        >
                          <Link to={childPath} className={`nxl-link text-capitalize`}>
                            <span className="nxl-micon" style={{ minWidth: 18, display: "inline-flex", alignItems: "center" }}>
                              {ICONS[childIconKey] || <FiList />}
                            </span>
                            <span className="nxl-mtext">{childName}</span>
                            <span className="nxl-arrow">
                              <i>
                                <FiChevronRight />
                              </i>
                            </span>
                          </Link>

                          {child.subdropdownMenu.map((sub) => (
                            <ul
                              key={sub.id}
                              className={`nxl-submenu ${openSubDropdown === childName ? "nxl-menu-visible" : "nxl-menu-hidden "}`}
                            >
                              <li
                                className={`nxl-item ${normalize(pathName) === normalize(sub.path) ? "active" : ""}`}
                                onClick={() => {
                                  setActiveParent(name);
                                  setActiveChild(childName);
                                  setOpenDropdown(name);
                                  setOpenSubDropdown(childName);
                                }}
                              >
                                <Link className="nxl-link text-capitalize" to={sub.path}>
                                  {sub.name}
                                </Link>
                              </li>
                            </ul>
                          ))}
                        </li>
                      ) : (
                        <li
                          className={`nxl-item ${normalize(pathName) === normalize(childPath) ? "active" : ""}`}
                          onClick={() => {
                            setActiveParent(name);
                            setActiveChild(childName);
                            setOpenDropdown(name);
                            setOpenSubDropdown(null);
                          }}
                        >
                          <Link className="nxl-link" to={childPath}>
                            <span className="nxl-micon" style={{ minWidth: 18, display: "inline-flex", alignItems: "center" }}>
                              {ICONS[childIconKey] || <FiList />}
                            </span>
                            <span style={{ paddingLeft: 8 }}>{childName}</span>
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