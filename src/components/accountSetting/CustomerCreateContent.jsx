import React from 'react';
import TabProfile from './TabProfile';
import TabPassword from './TabPassword';
import TabConnections from './TabConnections';
import TabBillingContent from './TabBillingContent';

const CustomerCreateContent = () => {
    // Get user permissions from authData
    const authData = JSON.parse(localStorage.getItem("authData"));
    const userRole = authData?.role || '';
    const userPermissions = authData?.permissions || [];

    // Permission checks
    const isClientAdmin = userRole === 'CLIENT_ADMIN';
    const canReadProfile = isClientAdmin || userPermissions.includes('PROFILE_UPDATE');
    const canReadPassword = isClientAdmin;
    const canReadSubscription = isClientAdmin;
    const canReadSettings = isClientAdmin ||
        userPermissions.includes('TAX_READ') ||
        userPermissions.includes('TAX_UPDATE') ||
        userPermissions.includes('CURRENCY_READ') ||
        userPermissions.includes('CURRENCY_UPDATE');

    // Filter tabs based on permissions
    const tabs = [
        {
            id: 'profileTab',
            label: 'Profile',
            component: <TabProfile />,
            show: canReadProfile
        },
        {
            id: 'passwordTab',
            label: 'Password',
            component: <TabPassword />,
            show: canReadPassword
        },
        {
            id: 'subscriptionTab',
            label: 'Subscription',
            component: <div className="tab-pane fade" id="subscriptionTab" role="tabpanel">
                <TabBillingContent />
            </div>,
            show: canReadSubscription
        },
        {
            id: 'connectionTab',
            label: 'Settings',
            component: <div className="tab-pane fade" id="connectionTab" role="tabpanel">
                <TabConnections />
            </div>,
            show: canReadSettings
        }
    ].filter(tab => tab.show);
    return (
        <div className="col-lg-12">
            <div className="card border-top-0">
                {tabs.length > 0 && (
                    <div className="card-header p-0">
                        <ul className="nav nav-tabs flex-wrap w-100 text-center customers-nav-tabs" id="myTab" role="tablist">
                            {tabs.map((tab, index) => (
                                <li key={tab.id} className="nav-item flex-fill border-top" role="presentation">
                                    <a
                                        href="$"
                                        className={`nav-link ${index === 0 ? 'active' : ''}`}
                                        data-bs-toggle="tab"
                                        data-bs-target={`#${tab.id}`}
                                        role="tab"
                                    >
                                        {tab.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="tab-content">
                    {tabs.map((tab, index) => (
                        React.cloneElement(
                            typeof tab.component === 'string' ?
                                <div>{tab.component}</div> : tab.component,
                            {
                                key: tab.id,
                                className: `tab-pane fade ${index === 0 ? 'show active' : ''}`,
                                id: tab.id,
                                role: "tabpanel"
                            }
                        )
                    ))}
                </div>
                {tabs.length === 0 && (
                    <div className="card-body">
                        <div className="alert alert-primary mb-0">
                            You don&apos;t have permission to view any tabs.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerCreateContent;