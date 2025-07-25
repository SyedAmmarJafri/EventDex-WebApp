import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import ReportsSales from "../pages/reports-sales";
import AccountSetting from "../pages/account-setting";
import ReportsProducts from "../pages/reports-products";
import ReportsCustomer from "../pages/reports-customer";
import ReportsFinancial from "../pages/reports-financial";
import ReportsTeam from "../pages/reports-team";
import ReportsComparison from "../pages/reports-comparison";
import Reports from "../pages/reports";
import LoginCover from "../pages/login-cover";
import Categorylist from "../pages/category";
import Itemlist from "../pages/item";
import Inventorylist from "../pages/inventory";
import Deallist from "../pages/deal";
import Orderlist from "../pages/order";
import Customerlist from "../pages/customer";
import Templatelist from "../pages/template";
import Discountlist from "../pages/discount";
import Marketinglist from "../pages/marketing";
import RoleList from "../pages/role";
import TeamList from "../pages/team";
import FinanceList from "../pages/finance";
import Tracker from "../pages/tracker";
import PosList from "../pages/posList";
import LayoutSetting from "../layout/layoutSetting";
import StoreSettings from "../pages/store-setting";
import LayoutAuth from "../layout/layoutAuth";
import ResetCover from "../pages/reset-cover";
import ChangeCover from "../pages/change-cover";
import ErrorCover from "../pages/error-cover";
import OtpCover from "../pages/otp-cover";
import MaintenanceCover from "../pages/maintenance-cover";
import HelpKnowledgebase from "../pages/help-knowledgebase";

// Authentication check function
const checkAuth = () => {
    try {
        const authDataString = localStorage.getItem('authData');
        if (!authDataString) return false;
        const authData = JSON.parse(authDataString);
        return !!authData.token;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
};

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
    if (!checkAuth()) {
        return <Navigate to="/authentication/login/cover" replace />;
    }
    return children;
};

// Public Route Wrapper Component (for auth pages)
const PublicRoute = ({ children }) => {
    if (checkAuth()) {
        // Redirect to home if user is already authenticated
        return <Navigate to="/" replace />;
    }
    return children;
};

export const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <RootLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "/",
                element: <Home />
            },
            {
                path: "/pos",
                element: <PosList />
            },
            {
                path: "/account",
                element: <AccountSetting />
            },
            {
                path: "/analytics/sales",
                element: <ReportsSales />
            },
            {
                path: "/analytics/product",
                element: <ReportsProducts />
            },
            {
                path: "/analytics/customer",
                element: <ReportsCustomer />
            },
            {
                path: "/analytics/financial",
                element: <ReportsFinancial />
            },
            {
                path: "/analytics/team",
                element: <ReportsTeam />
            },
            {
                path: "/analytics/comparison",
                element: <ReportsComparison />
            },
            {
                path: "/reports",
                element: <Reports />
            },
            {
                path: "/category/list",
                element: <Categorylist />
            },
            {
                path: "/item/list",
                element: <Itemlist />
            },
            {
                path: "/inventory/list",
                element: <Inventorylist />
            },
            {
                path: "/deal/list",
                element: <Deallist />
            },
            {
                path: "/orders/list",
                element: <Orderlist />
            },
            {
                path: "/customer/list",
                element: <Customerlist />
            },
            {
                path: "/marketing/list",
                element: <Marketinglist />
            },
            {
                path: "/template/list",
                element: <Templatelist />
            },
            {
                path: "/discount/list",
                element: <Discountlist />
            },
            {
                path: "/role/list",
                element: <RoleList />
            },
            {
                path: "/team/list",
                element: <TeamList />
            },
            {
                path: "/finance",
                element: <FinanceList />
            },
            {
                path: "/tracker",
                element: <Tracker />
            },
            {
                path: "/help/knowledgebase",
                element: <HelpKnowledgebase />
            },
        ]
    },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <LayoutSetting />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "/Store/settings",
                element: <StoreSettings />
            }
        ]
    },
    {
        path: "/",
        element: <LayoutAuth />,
        children: [
            {
                path: "/authentication/login/cover",
                element: (
                    <PublicRoute>
                        <LoginCover />
                    </PublicRoute>
                )
            },
            {
                path: "/authentication/reset/cover",
                element: (
                    <PublicRoute>
                        <ResetCover />
                    </PublicRoute>
                )
            },
            {
                path: "/authentication/ChangeForm/cover",
                element: (
                    <PublicRoute>
                        <ChangeCover />
                    </PublicRoute>
                )
            },
            {
                path: "/authentication/404/cover",
                element: <ErrorCover />
            },
            {
                path: "/authentication/verify/cover",
                element: (
                    <PublicRoute>
                        <OtpCover />
                    </PublicRoute>
                )
            },
            {
                path: "/authentication/maintenance/cover",
                element: <MaintenanceCover />
            },
        ]
    },
    {
        path: "*",
        element: <Navigate to="/authentication/404/cover" replace />
    }
]);