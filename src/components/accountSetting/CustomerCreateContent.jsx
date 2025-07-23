import React from 'react'
import TabProfile from './TabProfile'
import TabPassword from './TabPassword'
import TabConnections from './TabConnections'
import TabBillingContent from './TabBillingContent'

const CustomerCreateContent = () => {
    return (
        <div className="col-lg-12">
            <div className="card border-top-0">
                <div className="card-header p-0">
                    <ul className="nav nav-tabs flex-wrap w-100 text-center customers-nav-tabs" id="myTab" role="tablist">
                        <li className="nav-item flex-fill border-top" role="presentation">
                            <a href="$" className="nav-link active" data-bs-toggle="tab" data-bs-target="#profileTab" role="tab">Profile</a>
                        </li>
                        <li className="nav-item flex-fill border-top" role="presentation">
                            <a href="$" className="nav-link" data-bs-toggle="tab" data-bs-target="#passwordTab" role="tab">Password</a>
                        </li>
                        <li className="nav-item flex-fill border-top" role="presentation">
                            <a href="$" className="nav-link" data-bs-toggle="tab" data-bs-target="#subscriptionTab" role="tab">Subscription</a>
                        </li>
                        <li className="nav-item flex-fill border-top" role="presentation">
                            <a href="$" className="nav-link" data-bs-toggle="tab" data-bs-target="#connectionTab" role="tab">Settings</a>
                        </li>
                    </ul>
                </div>
                <div className="tab-content">
                    <TabProfile />
                    <TabPassword />
                    <div className="tab-pane fade" id="subscriptionTab" role="tabpanel">
                        <TabBillingContent />
                    </div>
                    <div className="tab-pane fade" id="connectionTab" role="tabpanel">
                        <TabConnections />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CustomerCreateContent