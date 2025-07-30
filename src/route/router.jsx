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

// Authorization check function
const checkPermission = (requiredPermission) => {
    try {
        const authDataString = localStorage.getItem('authData');
        if (!authDataString) return false;
        
        const authData = JSON.parse(authDataString);
        
        // CLIENT_ADMIN has all permissions
        if (authData.role === "CLIENT_ADMIN") return true;
        
        // Check if the required permission exists in tabPermissions
        const permissions = authData.tabPermissions || {};
        return permissions[requiredPermission] === true;
    } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
    }
};

// Enhanced Protected Route with permission check
const ProtectedRoute = ({ children, permission }) => {
    if (!checkAuth()) {
        return <Navigate to="/authentication/login/cover" replace />;
    }
    
    // If permission is required but not granted
    if (permission && !checkPermission(permission)) {
        return <Navigate to="/" replace />;
    }
    
    return children;
};

// Public Route remains the same
const PublicRoute = ({ children }) => {
    if (checkAuth()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// Permission mapping configuration
const routePermissions = {
    // Root routes
    '/': 'dashboard',
    '/pos': 'pos',
    '/account': null, // No permission required
    '/help/knowledgebase': null, // No permission required
    
    // Analytics routes
    '/analytics/sales': 'sales_analytics',
    '/analytics/product': 'product_analytics',
    '/analytics/customer': 'customer_analytics',
    '/analytics/financial': 'financial_analytics',
    '/analytics/team': 'team_analytics',
    '/analytics/comparison': 'comparison_analytics',
    '/reports': 'reports',
    
    // Product routes
    '/category/list': 'category',
    '/item/list': 'item',
    '/deal/list': 'deal',
    
    // Order/customer routes
    '/orders/list': 'orders',
    '/customer/list': 'customers',
    '/discount/list': 'discounts',
    
    // Marketing routes
    '/marketing/list': 'email_marketing',
    '/template/list': 'marketing_template',
    
    // Inventory/finance routes
    '/inventory/list': 'inventory',
    '/finance': 'finance',
    
    // Tracker route
    '/tracker': 'live_tracker',
    
    // User management routes
    '/role/list': 'role',
    '/team/list': 'team',
    
    // Store settings
    '/Store/settings': 'online_store'
};

// Helper function to get permission for a path
const getPermissionForPath = (path) => {
    return routePermissions[path] || null;
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
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/')}>
                        <Home />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pos",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/pos')}>
                        <PosList />
                    </ProtectedRoute>
                )
            },
            {
                path: "/account",
                element: <AccountSetting /> // No permission required
            },
            // Analytics routes
            {
                path: "/analytics/sales",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/analytics/sales')}>
                        <ReportsSales />
                    </ProtectedRoute>
                )
            },
            {
                path: "/analytics/product",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/analytics/product')}>
                        <ReportsProducts />
                    </ProtectedRoute>
                )
            },
            {
                path: "/analytics/customer",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/analytics/customer')}>
                        <ReportsCustomer />
                    </ProtectedRoute>
                )
            },
            {
                path: "/analytics/financial",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/analytics/financial')}>
                        <ReportsFinancial />
                    </ProtectedRoute>
                )
            },
            {
                path: "/analytics/team",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/analytics/team')}>
                        <ReportsTeam />
                    </ProtectedRoute>
                )
            },
            {
                path: "/analytics/comparison",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/analytics/comparison')}>
                        <ReportsComparison />
                    </ProtectedRoute>
                )
            },
            {
                path: "/reports",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/reports')}>
                        <Reports />
                    </ProtectedRoute>
                )
            },
            // Product routes
            {
                path: "/category/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/category/list')}>
                        <Categorylist />
                    </ProtectedRoute>
                )
            },
            {
                path: "/item/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/item/list')}>
                        <Itemlist />
                    </ProtectedRoute>
                )
            },
            {
                path: "/inventory/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/inventory/list')}>
                        <Inventorylist />
                    </ProtectedRoute>
                )
            },
            {
                path: "/deal/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/deal/list')}>
                        <Deallist />
                    </ProtectedRoute>
                )
            },
            // Order routes
            {
                path: "/orders/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/orders/list')}>
                        <Orderlist />
                    </ProtectedRoute>
                )
            },
            // Customer routes
            {
                path: "/customer/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/customer/list')}>
                        <Customerlist />
                    </ProtectedRoute>
                )
            },
            // Marketing routes
            {
                path: "/marketing/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/marketing/list')}>
                        <Marketinglist />
                    </ProtectedRoute>
                )
            },
            {
                path: "/template/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/template/list')}>
                        <Templatelist />
                    </ProtectedRoute>
                )
            },
            // Discount routes
            {
                path: "/discount/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/discount/list')}>
                        <Discountlist />
                    </ProtectedRoute>
                )
            },
            // User management routes
            {
                path: "/role/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/role/list')}>
                        <RoleList />
                    </ProtectedRoute>
                )
            },
            {
                path: "/team/list",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/team/list')}>
                        <TeamList />
                    </ProtectedRoute>
                )
            },
            // Finance route
            {
                path: "/finance",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/finance')}>
                        <FinanceList />
                    </ProtectedRoute>
                )
            },
            // Tracker route
            {
                path: "/tracker",
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/tracker')}>
                        <Tracker />
                    </ProtectedRoute>
                )
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
                element: (
                    <ProtectedRoute permission={getPermissionForPath('/Store/settings')}>
                        <StoreSettings />
                    </ProtectedRoute>
                )
            }
        ]
    },
    // Authentication routes (remain unchanged)
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