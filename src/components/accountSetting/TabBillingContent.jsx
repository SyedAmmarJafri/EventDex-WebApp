import React from 'react'
import { FiAlertOctagon, FiCheck, FiEye, FiMoreVertical, FiSend } from 'react-icons/fi';

const TabBillingContent = ({billingHistoryshow}) => {
    // Get auth data from localStorage
    const authData = JSON.parse(localStorage.getItem("authData"));
    const subscriptionData = authData?.subscriptionPlan;
    const startDate = new Date(authData?.subscriptionStartDate);
    const endDate = new Date(authData?.subscriptionEndDate);
    
    // Calculate remaining days
    const today = new Date();
    const timeDiff = endDate - today;
    const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Check if renew button should be enabled (2 days or less remaining)
    const shouldEnableRenew = remainingDays <= 2;
    
    // Format dates for display
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };
    
    const nextPaymentDate = new Date(endDate);
    nextPaymentDate.setDate(endDate.getDate() + 1);
    
    const billingHistory = [
        { id: '#258963', date: '02 NOV, 2022', amount: '$350', status: 'Completed', statusColor: 'success' },
        { id: '#987456', date: '05 DEC, 2022', amount: '$590', status: 'Pending', statusColor: 'warning' },
        { id: '#456321', date: '31 NOV, 2022', amount: '$450', status: 'Rejected', statusColor: 'danger' },
        { id: '#357951', date: '03 JAN, 2023', amount: '$250', status: 'Completed', statusColor: 'success' },
    ];
    
    return (
        <>
            <div className="subscription-plan px-4 pt-4">
                <div className="mb-4 d-flex align-items-center justify-content-between">
                    <h5 className="fw-bold mb-0">Subscription &amp; Plan:</h5>
                    <a className="btn btn-sm btn-light-brand">
                        {remainingDays} days remaining
                    </a>
                </div>
                <SubscriptionPlan
                    planName={subscriptionData?.name || "No Plan"}
                    description={subscriptionData?.description || "No active subscription"}
                    price={`$${subscriptionData?.monthlyPrice || "0.00"}`}
                    billingCycle="Month"
                    nextPayment={formatDate(nextPaymentDate)}
                    onUpdate={() => alert('Renew Plan clicked')}
                    shouldEnableRenew={shouldEnableRenew}
                />
            </div>
        </>
    )
}

export default TabBillingContent


const SubscriptionPlan = ({ planName, description, price, billingCycle, nextPayment, onUpdate, shouldEnableRenew }) => {
    return (
        <div className="p-4 mb-4 d-xxl-flex d-xl-block d-md-flex align-items-center justify-content-between gap-4 border border-dashed border-gray-5 rounded-1">
            <div>
                <div className="fs-14 fw-bold text-dark mb-1">
                    Your current plan is <a href="#" className="badge bg-primary text-white ms-2">{planName}</a>
                </div>
                <div className="fs-12 text-muted">{description}</div>
            </div>
            <div className="my-3 my-xxl-0 my-md-3 my-md-0">
                <div className="fs-20 text-dark">
                    <span className="fw-bold">{price}</span> / <em className="fs-11 fw-medium">{billingCycle}</em>
                </div>
                <div className="fs-12 text-muted mt-1">
                    Billed Monthly / Next payment on {nextPayment} for <strong className="text-dark">{price}</strong>
                </div>
            </div>
            <div className="hstack gap-3">
                <button 
                    className={`btn ${shouldEnableRenew ? 'btn-light-brand' : 'btn-light-secondary'}`}
                    onClick={onUpdate}
                    disabled={!shouldEnableRenew}
                >
                    Renew Plan
                </button>
            </div>
        </div>
    );
};