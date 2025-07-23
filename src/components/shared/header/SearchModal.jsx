import React from 'react'
import { FiAirplay, FiChevronRight, FiCommand, FiDownload, FiFilePlus, FiSearch, FiUserPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const tags = ["Projects", "Leads", "Contacts", "Inbox", "Invoices", "Tasks", "Customers", "Notes", "Affiliate", "Storage", "Calendar"]
const recnetSearch = [
    {
        id: 1,
        search_title: "CRM dashboard redesign",
        path: "Home / project / crm",
        icon: <FiAirplay />,
        badge: "/"
    },
    {
        id: 2,
        search_title: "Create new document",
        path: "Home / tasks / docs",
        icon: <FiFilePlus />,
        badge: "N /"
    },
    {
        id: 3,
        search_title: "Invite project colleagues",
        path: "Home / project / invite",
        icon: <FiUserPlus />,
        badge: "P /"
    },

]

const SearchModal = () => {
    return (
        <div className="dropdown nxl-h-item nxl-header-search">
            <div className="nxl-head-link me-0" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                <FiSearch size={20} />
            </div>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-search-dropdown">
                <div className="input-group search-form">
                    <span className="input-group-text">
                        <i className="fs-6 text-muted"><FiSearch /></i>
                    </span>
                    <input type="text" className="form-control search-input-field" placeholder="Search...." />
                    <span className="input-group-text">
                        <button type="button" className="btn-close"></button>
                    </span>
                </div>
                <div className="search-items-wrapper">
                    <div className="dropdown-divider"></div>
                    <div className="recent-result px-4 py-2">
                        {
                            recnetSearch.map(({ search_title, id, path, icon, badge }) => <Card key={id} icon={icon} subTitle={path} title={search_title} badge={badge} isImg={false} />)
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SearchModal

const Card = ({ src, icon, title, subTitle, badge }) => {
    return (
        <div className="d-flex align-items-center justify-content-between hr-card">
            <div className="d-flex align-items-center gap-3">
                {
                    icon ?
                        <div className="avatar-text rounded">
                            {icon}
                        </div>
                        :
                        <div className="avatar-image bg-gray-200 rounded">
                            <img src={src} alt="" className="img-fluid" />
                        </div>
                }

                <div>
                    <Link to={"#"} className="font-body fw-bold d-block mb-1">{title}</Link>
                    <p className="fs-11 text-muted mb-0">{subTitle}</p>
                </div>
            </div>

        </div>
    )
}