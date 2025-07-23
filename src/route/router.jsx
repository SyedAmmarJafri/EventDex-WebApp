import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import ReportsSales from "../pages/reports-sales";
import AccountSetting from "../pages/account-setting";
import ReportsProducts from "../pages/reports-products";
import ReportsCustomer from "../pages/reports-customer";
import AppsChat from "../pages/apps-chat";
import LayoutApplications from "../layout/layoutApplications";
import AppsEmail from "../pages/apps-email";
import ReportsFinancial from "../pages/reports-financial";
import ReportsTeam from "../pages/reports-team";
import ReportsComparison from "../pages/reports-comparison";
import Reports from "../pages/reports";
import LoginCover from "../pages/login-cover";
import AppsTasks from "../pages/apps-tasks";
import AppsNotes from "../pages/apps-notes";
import AppsCalender from "../pages/apps-calender";
import AppsStorage from "../pages/apps-storage";
import Categorylist from "../pages/category";
import Itemlist from "../pages/item";
import Inventorylist from "../pages/inventory";
import Deallist from "../pages/deal";
import Orderlist from "../pages/order";
import Customerlist from "../pages/customer";
import Templatelist from "../pages/template";
import Discountlist from "../pages/discount";
import Marketinglist from "../pages/marketing";
import CustomersList from "../pages/customers-list";
import LeadsList from "../pages/leadsList";
import RoleList from "../pages/role";
import TeamList from "../pages/team";
import FinanceList from "../pages/finance";
import PosList from "../pages/posList";
import CustomersView from "../pages/customers-view";
import CustomersCreate from "../pages/customers-create";
import LeadsView from "../pages/leads-view";
import LeadsCreate from "../pages/leads-create";
import PaymentList from "../pages/payment-list";
import PaymentView from "../pages/payment-view/";
import PaymentCreate from "../pages/payment-create";
import ProjectsList from "../pages/projects-list";
import ProjectsView from "../pages/projects-view";
import ProjectsCreate from "../pages/projects-create";
import SettingsGaneral from "../pages/settings-ganeral";
import LayoutSetting from "../layout/layoutSetting";
import SettingsSeo from "../pages/settings-seo";
import SettingsTags from "../pages/settings-tags";
import SettingsEmail from "../pages/settings-email";
import SettingsTasks from "../pages/settings-tasks";
import SettingsLeads from "../pages/settings-leads";
import SettingsMiscellaneous from "../pages/settings-miscellaneous";
import SettingsRecaptcha from "../pages/settings-recaptcha";
import SettingsLocalization from "../pages/settings-localization";
import SettingsCustomers from "../pages/settings-customers";
import SettingsGateways from "../pages/settings-gateways";
import SettingsFinance from "../pages/settings-finance";
import SettingsSupport from "../pages/settings-support";
import LayoutAuth from "../layout/layoutAuth";
import ResetCover from "../pages/reset-cover";
import ChangeCover from "../pages/change-cover";
import ErrorCover from "../pages/error-cover";
import OtpCover from "../pages/otp-cover";
import MaintenanceCover from "../pages/maintenance-cover";
import HelpKnowledgebase from "../pages/help-knowledgebase";
import WidgetsLists from "../pages/widgets-lists";
import WidgetsTables from "../pages/widgets-tables";
import WidgetsCharts from "../pages/widgets-charts";
import WidgetsStatistics from "../pages/widgets-statistics";
import WidgetsMiscellaneous from "../pages/widgets-miscellaneous";

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
                path: "/payment/list",
                element: <PaymentList />
            },
            {
                path: "/payment/view",
                element: <PaymentView />
            },
            {
                path: "/payment/create",
                element: <PaymentCreate />
            },
            {
                path: "/customers/list",
                element: <CustomersList />
            },
            {
                path: "/customers/view",
                element: <CustomersView />
            },
            {
                path: "/customers/create",
                element: <CustomersCreate />
            },
            {
                path: "/leads/list",
                element: <LeadsList />
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
                path: "/leads/view",
                element: <LeadsView />
            },
            {
                path: "/leads/create",
                element: <LeadsCreate />
            },
            {
                path: "/projects/list",
                element: <ProjectsList />
            },
            {
                path: "/projects/view",
                element: <ProjectsView />
            },
            {
                path: "/projects/create",
                element: <ProjectsCreate />
            },
            {
                path: "/widgets/lists",
                element: <WidgetsLists />
            },
            {
                path: "/widgets/tables",
                element: <WidgetsTables />
            },
            {
                path: "/widgets/charts",
                element: <WidgetsCharts />
            },
            {
                path: "/widgets/statistics",
                element: <WidgetsStatistics />
            },
            {
                path: "/widgets/miscellaneous",
                element: <WidgetsMiscellaneous />
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
                <LayoutApplications />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "/applications/chat",
                element: <AppsChat />
            },
            {
                path: "/applications/email",
                element: <AppsEmail />
            },
            {
                path: "/applications/tasks",
                element: <AppsTasks />
            },
            {
                path: "/applications/notes",
                element: <AppsNotes />
            },
            {
                path: "/applications/calender",
                element: <AppsCalender />
            },
            {
                path: "/applications/storage",
                element: <AppsStorage />
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
                path: "/settings/ganeral",
                element: <SettingsGaneral />
            },
            {
                path: "/Store/settings",
                element: <SettingsSeo />
            },
            {
                path: "/settings/tags",
                element: <SettingsTags />
            },
            {
                path: "/settings/email",
                element: <SettingsEmail />
            },
            {
                path: "/settings/tasks",
                element: <SettingsTasks />
            },
            {
                path: "/settings/leads",
                element: <SettingsLeads />
            },
            {
                path: "/settings/Support",
                element: <SettingsSupport />
            },
            {
                path: "/settings/finance",
                element: <SettingsFinance />
            },
            {
                path: "/settings/gateways",
                element: <SettingsGateways />
            },
            {
                path: "/settings/customers",
                element: <SettingsCustomers />
            },
            {
                path: "/settings/localization",
                element: <SettingsLocalization />
            },
            {
                path: "/settings/recaptcha",
                element: <SettingsRecaptcha />
            },
            {
                path: "/settings/miscellaneous",
                element: <SettingsMiscellaneous />
            },
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