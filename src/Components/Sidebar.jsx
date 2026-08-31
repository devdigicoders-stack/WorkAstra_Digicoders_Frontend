import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import {
    LayoutDashboard, Users, Building2, FolderKanban, ShieldCheck,
    Settings, UserCircle, LogOut, ChevronLeft, Menu, Calendar, IndianRupee, Clock, X, Bell, Briefcase, Palmtree, CalendarDays, UserCheck, FileText, Kanban, TrendingUp, Receipt, AlertCircle, PieChart, Monitor, Laptop, BarChart2,
    ChevronDown, ChevronRight, CheckCircle, Timer, Banknote, PartyPopper, HardDrive
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { authlogout } from "../modules/auth/services/authService";

const NAV = [
    {
        group: "Dashboard",
        groupIcon: LayoutDashboard,
        items: [
            { name: "Dashboard", icon: LayoutDashboard, path: "/", permissions: [] },
        ],
    },
    {
        group: "Employee Management",
        groupIcon: Users,
        items: [
            { name: "Employee Onboarding", icon: UserCheck, path: "/onboarding-approvals", permissions: ["APPROVE_ONBOARDING", "MANAGE_USER"] },
            { name: "Profile Management", icon: Users, path: "/users", permissions: ["VIEW_USER", "VIEW_ALL_USERS"] },
            { name: "Department & Designation", icon: FolderKanban, path: "/departments", permissions: ["VIEW_DEPARTMENT", "VIEW_ALL_DEPARTMENTS"] },
            { name: "Employment Status", icon: ShieldCheck, path: "/employment-status", permissions: ["VIEW_EMPLOYMENT_STATUS", "VIEW_ALL_EMPLOYMENT_STATUSES"] },
            { name: "Exit / Resignation", icon: LogOut, path: "/manage-resignations", permissions: ["MANAGE_RESIGNATIONS"] },
        ],
    },
    {
        group: "CRM & Projects",
        groupIcon: Kanban,
        items: [
            { name: "Projects", icon: Kanban, path: "/projects", permissions: ["VIEW_PROJECT", "VIEW_ALL_PROJECTS"] },
            { name: "Clients", icon: Users, path: "/clients", permissions: ["VIEW_ALL_PROJECTS"] },
            { name: "Leads", icon: TrendingUp, path: "/leads", permissions: ["VIEW_LEAD", "VIEW_ALL_LEADS"] },
            { name: "Meetings", icon: CalendarDays, path: "/meetings", permissions: ["VIEW_MEETING", "VIEW_ALL_MEETINGS"] },
            { name: "Quotes", icon: Receipt, path: "/quotes", permissions: ["VIEW_QUOTE", "VIEW_ALL_QUOTES"] },
        ],
    },
    {
        group: "Payments",
        groupIcon: Banknote,
        items: [
            { name: "Manage Payments", icon: Banknote, path: "/manage-payments", permissions: ["MANAGE_PAYMENTS"] },
            { name: "Submit Payment", icon: Receipt, path: "/submit-payment", permissions: ["SUBMIT_PAYMENT"] },
        ],
    },
    {
        group: "Payroll",
        groupIcon: IndianRupee,
        items: [
            { name: "Payroll Processing", icon: IndianRupee, path: "/payroll", permissions: ["VIEW_PAYROLL", "MANAGE_PAYROLL"] },
            { name: "Penalty Dates", icon: IndianRupee, path: "/payroll/penalty-dates", permissions: ["MANAGE_PAYROLL"] },
            { name: "Payroll Reports", icon: IndianRupee, path: "/reports/payroll", permissions: ["MANAGE_PAYROLL"] },
        ],
    },
    {
        group: "Attendance",
        groupIcon: Clock,
        items: [
            { name: "Manual Punch", icon: Clock, path: "/attendance", permissions: ["VIEW_ATTENDANCE", "VIEW_ALL_ATTENDANCES", "VIEW_TEAM_ATTENDANCE"] },
            { name: "Biometric Integration", icon: Monitor, path: "/biometric", permissions: ["MANAGE_ATTENDANCE"] },
            { name: "Shift Management", icon: Clock, path: "/work-shifts", permissions: ["VIEW_WORKSHIFT", "VIEW_ALL_WORKSHIFTS"] },
            { name: "Attendance Reports", icon: CalendarDays, path: "/reports/attendance", permissions: ["VIEW_ALL_ATTENDANCES", "VIEW_TEAM_ATTENDANCE"] },
        ],
    },
    {
        group: "Leave Management",
        groupIcon: Palmtree,
        items: [
            { name: "Leave Types", icon: FileText, path: "/leave/types", permissions: ["VIEW_LEAVE_TYPE", "VIEW_ALL_LEAVE_TYPES"] },
            { name: "Leave Application", icon: Palmtree, path: "/leave-management", permissions: ["VIEW_LEAVE", "VIEW_ALL_LEAVES"] },
            { name: "Assign Leave", icon: CalendarDays, path: "/leave/assign", permissions: ["VIEW_ALL_LEAVES", "MANAGE_LEAVE"] },
            { name: "Holiday Calendar", icon: CalendarDays, path: "/leave/holidays", permissions: ["VIEW_HOLIDAY", "VIEW_ALL_HOLIDAYS"] },
            { name: "Leave Reports", icon: Palmtree, path: "/reports/leave", permissions: ["VIEW_ALL_LEAVES"] },
        ],
    },
    {
        group: "Communication",
        groupIcon: Bell,
        items: [
            { name: "Employee Notifications", icon: Bell, path: "/notifications", permissions: [] },
        ],
    },
    {
        group: "Company Docs",
        groupIcon: FolderKanban,
        items: [
            { name: "HR Policies", icon: ShieldCheck, path: "/manage-policies", permissions: ["MANAGE_POLICY"] },
            { name: "View Policy", icon: FileText, path: "/policies", permissions: ["VIEW_POLICY"] },
            { name: "NDA Management", icon: ShieldCheck, path: "/manage-nda", permissions: ["MANAGE_NDA"] },
            { name: "View NDA", icon: FileText, path: "/nda", permissions: ["VIEW_NDA"], hideForClient: true },
        ],
    },
    {
        group: "Settings",
        groupIcon: Settings,
        items: [
            { name: "General Settings", icon: Settings, path: "/settings", permissions: [] },
            { name: "Asset Types", icon: HardDrive, path: "/settings/asset-types", permissions: ["VIEW_ASSET_TYPE", "MANAGE_ASSET_TYPE"] },
            { name: "Role Based Access", icon: ShieldCheck, path: "/settings/roles", permissions: ["VIEW_ROLE", "VIEW_ALL_ROLES"] },
            { name: "Departments", icon: FolderKanban, path: "/departments", permissions: ["VIEW_DEPARTMENT", "VIEW_ALL_DEPARTMENTS"] },
            { name: "Companies", icon: Building2, path: "/companies", superAdminOnly: true },
        ],
    },
    {
        group: "My Workspace",
        groupIcon: Briefcase,
        items: [
            { name: "My Offer Letter", icon: FileText, path: "/offer-letter", permissions: [], hideForAdmin: true, hideForClient: true },
            { name: "My NDA", icon: FileText, path: "/nda", permissions: [], clientOnly: true },
            { name: "My Proposal", icon: FileText, path: "/my-proposal", permissions: [], clientOnly: true },
            { name: "My Complaints", icon: AlertCircle, path: "/my-complaints", permissions: ["CREATE_COMPLAINT", "VIEW_COMPLAINT"], hideForSuperAdmin: true },
            { name: "Manage Complaints", icon: AlertCircle, path: "/manage-complaints", permissions: ["MANAGE_COMPLAINT"] },
            { name: "My Tickets", icon: AlertCircle, path: "/my-tickets", permissions: ["RAISE_TICKET", "VIEW_TICKET"], hideForSuperAdmin: true },
            { name: "Manage Tickets", icon: AlertCircle, path: "/manage-tickets", permissions: ["MANAGE_TICKET"] },
            { name: "My Assets", icon: Laptop, path: "/my-assets", permissions: [], hideForClient: true },
            { name: "Manage Assets", icon: Monitor, path: "/assets", permissions: ["MANAGE_ASSETS"] },
            { name: "My Resignation", icon: LogOut, path: "/my-resignation", permissions: [], hideForClient: true, requireNoticePeriod: true },
        ],
    },
    {
        group: "Reports",
        groupIcon: BarChart2,
        items: [
            { name: "Attendance Reports", icon: CalendarDays, path: "/reports/attendance", permissions: ["VIEW_ALL_ATTENDANCES", "VIEW_TEAM_ATTENDANCE"] },
            { name: "Leave Reports", icon: Palmtree, path: "/reports/leave", permissions: ["VIEW_ALL_LEAVES"] },
            { name: "Payroll Reports", icon: IndianRupee, path: "/reports/payroll", permissions: ["MANAGE_PAYROLL"] },
            { name: "Employee Reports", icon: Users, path: "/reports/employees", permissions: ["VIEW_ALL_USERS"] },
            { name: "Sales Reports", icon: TrendingUp, path: "/reports/sales", permissions: ["VIEW_ALL_LEADS", "MANAGE_LEADS"] },
            { name: "Performance Reports", icon: BarChart2, path: "/reports/performance", permissions: [] },
            // { name: "Department Reports", icon: FolderKanban, path: "/dept-reports", permissions: ["VIEW_ALL_DEPARTMENTS"] },
        ],
    },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const { user, logout } = useStore();
    const navigate = useNavigate();
    const { taskCommentCount } = useNotifications();
    const [collapsed, setCollapsed] = useState(false);
    const [openGroups, setOpenGroups] = useState({ 'Dashboard': true });
    const permissions = user?.role?.permissions || [];

    const toggleGroup = (group) => {
        setOpenGroups(prev => prev[group] ? {} : { [group]: true });
    };

    const handleLogout = () => { authlogout(); logout(); navigate("/auth/login"); };

    useEffect(() => { if (!user || !user.role) handleLogout(); }, [user]);
    useEffect(() => {
        const fn = (e) => { if (e.key === "Escape") setMobileOpen(false); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);

    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const isClient = user?.role?.name?.toLowerCase() === "client";
    
    const canSeeItem = (item) => {
        if (item.hideForAdmin && isAdmin) return false;
        if (item.hideForSuperAdmin && isSuperAdmin) return false;
        if (item.hideForClient && isClient) return false;
        if (item.clientOnly && !isClient) return false;
        
        // Hide if requires notice period and user is not in notice period
        if (item.requireNoticePeriod && user?.employmentStatus?.name !== "Notice Period") return false;

        if (item.superAdminOnly) return isSuperAdmin;
        if (item.adminOnly) return isAdmin;
        const perms = item.permissions || [];
        return isSuperAdmin || !perms.length || perms.some(p => permissions.includes(p));
    };
    const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
    const close = () => setMobileOpen(false);

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={close} />
            )}

            <aside className={`
                fixed top-0 left-0 z-50 h-screen flex flex-col
                bg-[#0b1121]/95 backdrop-blur-xl border-r border-white/5 text-white
                transition-all duration-300 ease-in-out shadow-2xl
                ${collapsed ? "w-[76px]" : "w-64"}
                ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                md:translate-x-0 md:static md:flex
            `}>
                {/* Logo */}
                <div className={`flex items-center h-16 px-4 border-b border-white/5 ${collapsed ? "justify-center" : "justify-between"}`}>
                    <div className="flex items-center gap-3">
                        <img 
                            src="/DigiCoders Transparent Logo (2).png" 
                            alt="DigiCoders Logo" 
                            className={`object-contain transition-all duration-300 ${collapsed ? "w-10 h-10" : "h-12"}`} 
                        />
                    </div>
                    {!collapsed && (
                        <button
                            onClick={() => window.innerWidth < 768 ? close() : setCollapsed(c => !c)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                        >
                            {window.innerWidth < 768 ? <X size={18} /> : <ChevronLeft size={18} />}
                        </button>
                    )}
                    {collapsed && (
                        <button
                            onClick={() => setCollapsed(false)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition mt-1"
                        >
                            <Menu size={18} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2 no-scrollbar">
                    {NAV.map(section => {
                        const visible = section.items.filter(canSeeItem);
                        if (!visible.length) return null;
                        const isOpen = openGroups[section.group];

                        if (visible.length === 1) {
                            const item = visible[0];
                            return (
                                <div key={section.group} className="mb-2">
                                    <NavLink to={item.path} end={true} onClick={close}
                                        className={({ isActive }) =>
                                            `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                                            ${isActive 
                                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/20" 
                                                : "text-slate-400 hover:bg-white/10 hover:text-white"
                                            } ${collapsed ? 'justify-center' : ''}`
                                        }>
                                        <item.icon size={18} className={`shrink-0 transition-transform duration-200 group-hover:scale-110`} />
                                        {!collapsed && (
                                            <span className="truncate flex-1">{item.name}</span>
                                        )}
                                        
                                        {collapsed && (
                                            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                                {item.name}
                                            </div>
                                        )}

                                        {!collapsed && item.path === "/projects" && taskCommentCount > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
                                        )}
                                        {collapsed && item.path === "/projects" && taskCommentCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />
                                        )}
                                    </NavLink>
                                </div>
                            );
                        }

                        return (
                            <div key={section.group} className="mb-2">
                                {!collapsed ? (
                                    <button 
                                        onClick={() => toggleGroup(section.group)}
                                        className="w-full flex items-center justify-between px-2 py-2 mb-1 group hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {section.groupIcon && <section.groupIcon size={16} className="text-slate-400 group-hover:text-slate-200" />}
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">
                                                {section.group}
                                            </span>
                                        </div>
                                        {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setCollapsed(false); setOpenGroups({ [section.group]: true }); }}
                                        className="group relative w-full flex justify-center items-center py-3 mb-1 hover:bg-white/10 rounded-xl transition-all duration-200"
                                    >
                                        {section.groupIcon && <section.groupIcon size={22} className={`text-slate-400 group-hover:text-white group-hover:scale-110 transition-transform ${isOpen ? 'text-blue-400' : ''}`} />}
                                        <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                                            {section.group}
                                        </div>
                                    </button>
                                )}
                                
                                {!collapsed && (
                                    <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${!isOpen ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                                        {visible.map(item => (
                                        <NavLink key={item.path} to={item.path} end={true} onClick={close}
                                            className={({ isActive }) =>
                                                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                                                ${isActive 
                                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/20" 
                                                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                                                } ${collapsed ? 'justify-center' : ''}`
                                            }>
                                            <item.icon size={18} className={`shrink-0 transition-transform duration-200 group-hover:scale-110`} />
                                            {!collapsed && (
                                                <span className="truncate flex-1">{item.name}</span>
                                            )}
                                            
                                            {/* Tooltip for collapsed state */}
                                            {collapsed && (
                                                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                                    {item.name}
                                                </div>
                                            )}

                                            {!collapsed && item.path === "/projects" && taskCommentCount > 0 && (
                                                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
                                            )}
                                            {collapsed && item.path === "/projects" && taskCommentCount > 0 && (
                                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />
                                            )}
                                        </NavLink>
                                    ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-white/5 space-y-1 bg-white/[0.02] backdrop-blur-md">
                    <NavLink to="/profile" onClick={close}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-base transition-all duration-200
                            ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}
                            ${collapsed ? 'justify-center' : ''}`
                        }>
                        <UserCircle size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                        {!collapsed && <span>Profile</span>}
                        {collapsed && <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Profile</div>}
                    </NavLink>
                    <NavLink to="/notifications" onClick={close}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-base transition-all duration-200
                            ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}
                            ${collapsed ? 'justify-center' : ''}`
                        }>
                        <Bell size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                        {!collapsed && <span>Notifications</span>}
                        {collapsed && <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Notifications</div>}
                    </NavLink>
                    <NavLink to="/settings" onClick={close}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-base transition-all duration-200
                            ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}
                            ${collapsed ? 'justify-center' : ''}`
                        }>
                        <Settings size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                        {!collapsed && <span>Settings</span>}
                        {collapsed && <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Settings</div>}
                    </NavLink>
                    <button onClick={handleLogout}
                        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-base text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200
                        ${collapsed ? 'justify-center' : ''}`}>
                        <LogOut size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                        {!collapsed && <span>Logout</span>}
                        {collapsed && <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Logout</div>}
                    </button>

                    {!collapsed && (
                        <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-black/20 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0 text-white shadow-inner">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-[10px] text-indigo-300 truncate font-semibold">{user?.role?.name?.replace('_', ' ').toUpperCase()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
