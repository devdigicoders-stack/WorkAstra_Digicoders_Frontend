import { createBrowserRouter } from "react-router-dom";
import Home from "../Pages/Home";
import Settings from "../Pages/Settings";
import AssetTypes from "../modules/assets/pages/AssetTypes";
import Profile from "../Pages/Profile";
import WebLayout from "../layout/WebLayout";
import Login from "../modules/auth/pages/Login";
import AuthLayout from "../layout/AuthLayout";
import Role from "../modules/roles/pages/Role";
import Company from "../modules/company/pages/Company";
import User from "../modules/employee/pages/User";
import ClientDirectory from "../modules/clients/pages/ClientDirectory";
import EmployeeProfile from "../modules/employee/pages/EmployeeProfile";
import Department from "../modules/department/pages/department";
import Attendance from "../modules/attendance/pages/Attendance";
import WorkShift from "../modules/workshift/pages/WorkShift";
import Notifications from "../modules/notifications/pages/Notifications";
import EmploymentStatus from "../modules/employmentStatus/pages/EmploymentStatus";
import LeaveManagement from "../Pages/LeaveManagement";
import AssignLeave from "../modules/leave/pages/AssignLeave";
import Holiday from "../modules/leave/pages/Holiday";
import LeaveType from "../modules/leave/pages/LeaveType";
import Payroll from "../modules/payroll/pages/Payroll";
import PenaltyDates from "../modules/payroll/pages/PenaltyDates";
import Projects from "../modules/projects/pages/Projects";
import ProjectDetail from "../modules/projects/pages/ProjectDetail";
import Leads from "../modules/leads/pages/Leads";
import Meetings from "../modules/meetings/pages/Meetings";
import QuoteManagement from "../modules/quotes/pages/QuoteManagement";
import PaymentAccounts from "../modules/quotes/pages/PaymentAccounts";
import Policies from "../modules/policies/pages/Policies";
import ManagePolicies from "../modules/policies/pages/ManagePolicies";
import ViewNda from "../modules/nda/pages/ViewNda";
import ManageNda from "../modules/nda/pages/ManageNda";
import MyProposal from "../Pages/MyProposal";

// Onboarding imports
import OnboardingLayout from "../layout/OnboardingLayout";
import OnboardingForm from "../modules/onboarding/pages/OnboardingForm";
import PendingApproval from "../modules/onboarding/pages/PendingApproval";
import AdminApprovals from "../modules/onboarding/pages/AdminApprovals";

import OfferLetter from "../modules/onboarding/pages/OfferLetter";
import ClientNdaPage from "../modules/onboarding/pages/ClientNdaPage";
import MyComplaints from "../modules/complaints/pages/MyComplaints";
import ManageComplaints from "../modules/complaints/pages/ManageComplaints";
import MyTickets from "../modules/tickets/pages/MyTickets";
import ManageTickets from "../modules/tickets/pages/ManageTickets";
import SubmitPayment from "../modules/payments/pages/SubmitPayment";
import ManagePayments from "../modules/payments/pages/ManagePayments";
import AttendanceReport from "../modules/reports/pages/AttendanceReport";
import PayrollReport from "../modules/reports/pages/PayrollReport";
import LeaveReport from "../modules/reports/pages/LeaveReport";
import EmployeeReport from "../modules/reports/pages/EmployeeReport";
import SalesReport from "../modules/reports/pages/SalesReport";
import PerformanceReport from "../modules/reports/pages/PerformanceReport";
import Assets from "../modules/assets/pages/Assets";
import MyAssets from "../modules/assets/pages/MyAssets";
import MyResignation from "../modules/exit/pages/MyResignation";
import ManageResignations from "../modules/exit/pages/ManageResignations";
import ViewResignation from "../modules/exit/pages/ViewResignation";
import Placeholder from "../Pages/Placeholder";

const AppRoute = createBrowserRouter([
    {
        path: "/client-nda", element: <ClientNdaPage />
    },
    {
        path: "/auth", element: <AuthLayout />,
        children: [
            { path: "/auth/login", element: <Login /> },
        ],
    },
    {
        path: "/onboarding", element: <OnboardingLayout />,
        children: [
            { index: true, element: <OnboardingForm /> },
            { path: "pending", element: <PendingApproval /> },
        ],
    },
    {
        path: "/", element: <WebLayout />,
        children: [
            { index: true, element: <Home /> },
            { path: "/onboarding-approvals", element: <AdminApprovals /> },
            { path: "/offer-letter", element: <OfferLetter /> },
            { path: "/users", element: <User/> },
            { path: "/clients", element: <ClientDirectory /> },
            { path: "/users/:id", element: <EmployeeProfile/> },
            {path:"/companies", element: <Company/>},
            { path: "/departments", element: <Department/> },
            { path: "/attendance", element: <Attendance /> },
            { path: "/reports/attendance", element: <AttendanceReport /> },
            { path: "/reports/payroll", element: <PayrollReport /> },
            { path: "/reports/leave", element: <LeaveReport /> },
            { path: "/reports/employees", element: <EmployeeReport /> },
            { path: "/reports/sales", element: <SalesReport /> },
            { path: "/reports/performance", element: <PerformanceReport /> },
            { path: "/work-shifts", element: <WorkShift /> },
            { path: "/employment-status", element: <EmploymentStatus /> },
            { path: "/leave-management",  element: <LeaveManagement /> },
            { path: "/leave/assign",       element: <AssignLeave /> },
            { path: "/leave/holidays",     element: <Holiday /> },
            { path: "/leave/types",         element: <LeaveType /> },
            { path: "/payroll", element: <Payroll /> },
            { path: "/payroll/penalty-dates", element: <PenaltyDates /> },
            { path: "/projects", element: <Projects /> },
            { path: "/projects/:id", element: <ProjectDetail /> },
            { path: "/leads", element: <Leads /> },
            { path: "/meetings", element: <Meetings /> },
            { path: "/quotes", element: <QuoteManagement /> },
            { path: "/payment-accounts", element: <PaymentAccounts /> },
            { path: "/policies", element: <Policies /> },
            { path: "/manage-policies", element: <ManagePolicies /> },
            { path: "/nda", element: <ViewNda /> },
            { path: "/manage-nda", element: <ManageNda /> },
            { path: "/my-proposal", element: <MyProposal /> },
            { path: "/my-complaints", element: <MyComplaints /> },
            { path: "/manage-complaints", element: <ManageComplaints /> },
            { path: "/my-tickets", element: <MyTickets /> },
            { path: "/manage-tickets", element: <ManageTickets /> },
            { path: "/my-assets", element: <MyAssets /> },
            { path: "/my-resignation", element: <MyResignation /> },
            { path: "/manage-resignations", element: <ManageResignations /> },
            { path: "/manage-resignations/view", element: <ViewResignation /> },
            { path: "/submit-payment", element: <SubmitPayment /> },
            { path: "/manage-payments", element: <ManagePayments /> },
            { path: "/notifications", element: <Notifications /> },
            { path: "/settings", element: <Settings /> },
            { path: "/settings/asset-types", element: <AssetTypes /> },
            { path: "/settings/roles", element: <Role /> },
            { path: "/settings/companies", element: <Company/> },
            { path: "/settings/user", element: <User/> },
            { path: "/profile", element: <Profile /> },
            { path: "/assets", element: <Assets /> },

            { path: "/biometric", element: <Placeholder /> },
            { path: "/attendance-rules", element: <Placeholder /> },
            // { path: "/dept-reports", element: <Placeholder /> },
            { path: "*", element: <Home /> }
        ]
    },
]);

export default AppRoute;