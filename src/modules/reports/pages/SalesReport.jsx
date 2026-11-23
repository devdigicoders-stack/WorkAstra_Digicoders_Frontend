import React, { useState, useEffect } from "react";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { toast } from "react-toastify";
import {
    Users,
    CheckCircle,
    Calendar,
    DollarSign,
    Filter,
    BarChart2,
    Download,
    User,
    Building2,
    TrendingUp,
    FileText,
    Percent,
    Award,
    X,
    Search
} from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { getImageUrl } from "../../../utils/imageUtils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const currentYearNumber = new Date().getFullYear();
const YEARS = [currentYearNumber + 1, currentYearNumber, currentYearNumber - 1, currentYearNumber - 2, currentYearNumber - 3];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#ef4444'];

const SalesReport = () => {
    const { user } = useStore();
    const isSuperAdmin = (user?.role?.name || user?.role || "").toString().toLowerCase() === "super_admin";
    const isAdmin = (user?.role?.name || user?.role || "").toString().toLowerCase() === "admin" || isSuperAdmin;
    const permissions = user?.role?.permissions || [];
    const canView = isAdmin || permissions.includes("VIEW_SALES_REPORTS");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        summary: {},
        bdePerformance: [],
        leadStatusBreakdown: [],
        monthlyTrend: [],
        employees: []
    });

    // Companies for Super Admin
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");

    // Filter Type: this_month, last_month, this_quarter, this_year, monthly, yearly, custom, all_time
    const [filterType, setFilterType] = useState("this_month");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(currentYearNumber);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Specific Employee Filter
    const [selectedEmployee, setSelectedEmployee] = useState("all");
    const [employeeSearch, setEmployeeSearch] = useState("");

    // Load Companies for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    const calculateDateParams = () => {
        const params = {};

        if (filterType === "this_month") {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (filterType === "last_month") {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (filterType === "this_quarter") {
            const now = new Date();
            const qMonth = Math.floor(now.getMonth() / 3) * 3;
            const start = new Date(now.getFullYear(), qMonth, 1);
            const end = new Date(now.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (filterType === "this_year") {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (filterType === "monthly") {
            const start = new Date(selectedYear, Number(selectedMonth), 1);
            const end = new Date(selectedYear, Number(selectedMonth) + 1, 0, 23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (filterType === "yearly") {
            const start = new Date(selectedYear, 0, 1);
            const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
        } else if (filterType === "custom") {
            if (startDate && endDate) {
                params.startDate = new Date(startDate).toISOString();
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                params.endDate = e.toISOString();
            }
        }

        if (selectedEmployee && selectedEmployee !== "all") {
            params.employeeId = selectedEmployee;
        }

        if (isSuperAdmin && selectedCompany && selectedCompany !== "all") {
            params.companyId = selectedCompany;
        }

        return params;
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const params = calculateDateParams();
            const res = await api.get(ENDPOINTS.REPORTS.SALES, { params });
            if (res.data.success) {
                setData(res.data);
            } else {
                toast.error(res.data.message || "Failed to fetch sales report");
            }
        } catch (error) {
            console.error("Sales Report API Error:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to load sales report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchReport();
        }
    }, [filterType, selectedMonth, selectedYear, startDate, endDate, selectedEmployee, selectedCompany, canView]); // eslint-disable-line

    if (!canView) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-lg border border-gray-200 shadow-sm max-w-md">
                    <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
                    <p className="text-gray-500 mt-2 text-sm">You do not have permission to view sales reports.</p>
                </div>
            </div>
        );
    }

    const { summary = {}, bdePerformance = [], leadStatusBreakdown = [], monthlyTrend = [], employees = [] } = data;

    // Filtered BDE list by search query
    const filteredBDEs = bdePerformance.filter(bde => {
        const q = employeeSearch.toLowerCase().trim();
        if (!q) return true;
        return bde.name?.toLowerCase().includes(q) || bde.email?.toLowerCase().includes(q);
    });

    const activeEmployeeObj = employees.find(e => e._id === selectedEmployee);

    const exportToCSV = () => {
        if (!bdePerformance || bdePerformance.length === 0) {
            toast.info("No performance data to export");
            return;
        }

        const headers = ["Rank", "BDE Name", "Email", "Leads Created", "Converted", "Conversion %", "Meetings Done", "Revenue Generated (INR)"];
        const rows = bdePerformance.map((bde, i) => {
            const conversionRate = bde.leadsCreated > 0 ? Math.round((bde.leadsConverted / bde.leadsCreated) * 100) : 0;
            return [
                i + 1,
                `"${bde.name}"`,
                `"${bde.email || ''}"`,
                bde.leadsCreated,
                bde.leadsConverted,
                `${conversionRate}%`,
                bde.meetingsDone,
                bde.revenue
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Sales_Report_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50/60 min-h-screen space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <BarChart2 size={20} />
                        </div>
                        Sales & Revenue Reports
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Comprehensive BDE performance, deal conversions, pipeline and revenue analytics
                    </p>
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Super Admin Company Filter */}
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
                            <Building2 size={15} className="text-blue-600 shrink-0" />
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-medium text-gray-700 outline-none cursor-pointer"
                            >
                                <option value="">All Companies</option>
                                {companies.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Employee / BDE Filter */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
                        <User size={15} className="text-indigo-600 shrink-0" />
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm font-medium text-gray-700 outline-none cursor-pointer max-w-[170px] truncate"
                        >
                            <option value="all">👥 All Employees ({employees.length})</option>
                            {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Period Preset Filter */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
                        <Filter size={15} className="text-gray-500 shrink-0" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm font-semibold text-gray-800 outline-none cursor-pointer"
                        >
                            <option value="this_month">📅 This Month</option>
                            <option value="last_month">📅 Last Month</option>
                            <option value="this_quarter">📊 This Quarter</option>
                            <option value="this_year">📈 This Year ({currentYearNumber})</option>
                            <option value="monthly">🗓️ Specific Month & Year</option>
                            <option value="yearly">📆 Full Year</option>
                            <option value="custom">⏳ Custom Range</option>
                            <option value="all_time">🌐 All Time</option>
                        </select>
                    </div>

                    {/* Specific Month & Year Sub-filter */}
                    {filterType === "monthly" && (
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-sm animate-fadeIn">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-transparent text-xs font-medium text-blue-700 outline-none py-1 px-1.5"
                            >
                                {MONTH_NAMES.map((m, idx) => (
                                    <option key={idx} value={idx}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent text-xs font-medium text-blue-700 outline-none py-1 px-1.5 border-l border-gray-200"
                            >
                                {YEARS.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Specific Year Sub-filter */}
                    {filterType === "yearly" && (
                        <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-sm animate-fadeIn">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent text-xs font-semibold text-blue-700 outline-none py-1 px-2"
                            >
                                {YEARS.map(y => (
                                    <option key={y} value={y}>Year {y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Custom Date Range Inputs */}
                    {filterType === "custom" && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-blue-200 shadow-sm text-xs animate-fadeIn">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                            <span className="text-gray-400 font-medium">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                        </div>
                    )}

                    {/* Export Action */}
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm active:scale-95"
                        title="Download CSV"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Active Employee Focused Banner */}
            {selectedEmployee !== "all" && activeEmployeeObj && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-3.5 rounded-lg border border-blue-200 flex items-center justify-between shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {activeEmployeeObj.name?.charAt(0)?.toUpperCase() || "E"}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                                    Individual Focus
                                </span>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900">{activeEmployeeObj.name}</h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{activeEmployeeObj.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setSelectedEmployee("all")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition shadow-sm"
                    >
                        <X size={14} /> Show All Team
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-gray-500 mt-4">Generating sales report analytics...</p>
                </div>
            ) : (
                <>
                    {/* Summary KPI Cards (subtle border-radius) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                        {/* Total Leads */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500">Total Leads</p>
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                    <Users size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{summary.totalLeads || 0}</h3>
                            <p className="text-[11px] text-gray-400 mt-1">Pipeline leads assigned</p>
                        </div>

                        {/* Converted Deals */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-emerald-300 transition">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500">Deals Won</p>
                                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                                    <CheckCircle size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-emerald-600 mt-2">{summary.totalConversions || 0}</h3>
                            <p className="text-[11px] text-emerald-600 font-medium mt-1">Project Done status</p>
                        </div>

                        {/* Conversion Rate */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-purple-300 transition">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500">Conversion Rate</p>
                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                                    <Percent size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-purple-600 mt-2">{summary.conversionRate || 0}%</h3>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(summary.conversionRate || 0, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Meetings Completed */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 transition">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500">Meetings Done</p>
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                                    <Calendar size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{summary.totalMeetings || 0}</h3>
                            <p className="text-[11px] text-gray-400 mt-1">Client discussions held</p>
                        </div>

                        {/* Quotes Sent */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-amber-300 transition">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500">Quotes Sent</p>
                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                                    <FileText size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{summary.totalQuotesSent || 0}</h3>
                            <p className="text-[11px] text-gray-400 mt-1">Proposals delivered</p>
                        </div>

                        {/* Total Revenue */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-lg shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-blue-100">Total Revenue</p>
                                <div className="p-1.5 bg-white/10 text-white rounded-md">
                                    <DollarSign size={16} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-extrabold mt-2 tracking-tight">
                                ₹{(summary.totalRevenue || 0).toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-blue-200 mt-1">
                                Avg Deal: ₹{(summary.avgDealValue || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Monthly Performance Trend Chart */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm lg:col-span-2 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                        <TrendingUp size={17} className="text-blue-600" />
                                        Monthly Performance Trend
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Revenue generated and leads over time</p>
                                </div>
                            </div>

                            <div className="h-80 w-full pt-3">
                                {monthlyTrend.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        No monthly trend data recorded for this period.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={monthlyTrend}
                                            margin={{ top: 20, right: 25, left: 10, bottom: 25 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="month"
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                tickLine={false}
                                                axisLine={{ stroke: '#e2e8f0' }}
                                                dy={8}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => `₹${(v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)}`}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <RechartsTooltip
                                                formatter={(value, name) => name.includes("Revenue") ? [`₹${Number(value).toLocaleString()}`, name] : [value, name]}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend
                                                verticalAlign="top"
                                                align="right"
                                                wrapperStyle={{ top: -10, right: 10, paddingBottom: 12 }}
                                                iconType="circle"
                                            />
                                            <Bar
                                                yAxisId="left"
                                                dataKey="revenue"
                                                name="Revenue (₹)"
                                                fill="#3b82f6"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={45}
                                            />
                                            <Bar
                                                yAxisId="right"
                                                dataKey="leads"
                                                name="Total Leads"
                                                fill="#10b981"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={45}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Pipeline Status Breakdown (Funnel Donut Chart) */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div className="mb-2">
                                <h2 className="text-base font-bold text-gray-800">Lead Pipeline Distribution</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Status breakdown of all leads</p>
                            </div>

                            <div className="h-56 w-full my-auto">
                                {leadStatusBreakdown.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        No pipeline data available
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={leadStatusBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {leadStatusBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Status tags */}
                            <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto pt-2 border-t border-gray-100">
                                {leadStatusBreakdown.map((s, idx) => (
                                    <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                        {s.name}: <strong className="text-gray-800">{s.value}</strong>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* BDE Revenue Comparison Chart (Visible when viewing All Employees) */}
                    {selectedEmployee === "all" && bdePerformance.length > 0 && (
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-base font-bold text-gray-800 mb-0.5">BDE Revenue Leaderboard Comparison</h2>
                            <p className="text-xs text-gray-400 mb-4">Direct side-by-side revenue performance by representative</p>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={bdePerformance.slice(0, 10)}
                                        margin={{ top: 15, right: 25, left: 10, bottom: 25 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                            dy={8}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                                        />
                                        <RechartsTooltip
                                            formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="revenue" name="Revenue (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* BDE Leaderboard Performance Table */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                    <Award size={18} className="text-amber-500" />
                                    BDE & Sales Representative Breakdown
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Click any employee row to filter their individual dashboard</p>
                            </div>

                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search BDE by name..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md outline-none focus:bg-white focus:border-blue-500 w-52 transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3.5">Rank & Representative</th>
                                        <th className="px-5 py-3.5 text-center">Leads Created</th>
                                        <th className="px-5 py-3.5 text-center">Deals Won</th>
                                        <th className="px-5 py-3.5 text-center">Win Rate (%)</th>
                                        <th className="px-5 py-3.5 text-center">Meetings Done</th>
                                        <th className="px-5 py-3.5 text-right">Revenue Generated</th>
                                        <th className="px-5 py-3.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {filteredBDEs.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                                                No performance records found for the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBDEs.map((bde, index) => {
                                            const conversionRate = bde.leadsCreated > 0
                                                ? Math.round((bde.leadsConverted / bde.leadsCreated) * 100)
                                                : 0;

                                            let medal = null;
                                            if (bde.revenue > 0) {
                                                if (index === 0) medal = "🥇";
                                                else if (index === 1) medal = "🥈";
                                                else if (index === 2) medal = "🥉";
                                            }

                                            const isSelected = selectedEmployee === bde.userId;

                                            return (
                                                <tr
                                                    key={bde.userId}
                                                    onClick={() => setSelectedEmployee(bde.userId)}
                                                    className={`hover:bg-blue-50/50 transition cursor-pointer ${
                                                        isSelected ? "bg-blue-50/80 font-medium" : ""
                                                    }`}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-6 text-center text-sm font-bold text-gray-400">
                                                                {medal || `#${index + 1}`}
                                                            </span>

                                                            {bde.profilePic ? (
                                                                <img
                                                                    src={getImageUrl(bde.profilePic?.url || bde.profilePic)}
                                                                    alt={bde.name}
                                                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                                    onError={(e) => {
                                                                        e.target.style.display = "none";
                                                                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = "flex";
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div
                                                                style={{ display: bde.profilePic ? "none" : "flex" }}
                                                                className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 items-center justify-center font-bold text-xs shrink-0 border border-blue-200"
                                                            >
                                                                {bde.name?.charAt(0)?.toUpperCase() || "U"}
                                                            </div>

                                                            <div>
                                                                <p className="font-semibold text-gray-800 text-xs sm:text-sm flex items-center gap-1.5">
                                                                    {bde.name}
                                                                </p>
                                                                <p className="text-[11px] text-gray-400">{bde.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center font-medium text-gray-700">
                                                        {bde.leadsCreated}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center font-semibold text-emerald-600">
                                                        {bde.leadsConverted}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="font-semibold text-gray-700 text-xs">{conversionRate}%</span>
                                                            <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        conversionRate >= 25
                                                                            ? "bg-emerald-500"
                                                                            : conversionRate >= 10
                                                                            ? "bg-blue-500"
                                                                            : "bg-gray-400"
                                                                    }`}
                                                                    style={{ width: `${Math.min(conversionRate, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center font-medium text-gray-700">
                                                        {bde.meetingsDone}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                                                        ₹{bde.revenue.toLocaleString()}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEmployee(isSelected ? "all" : bde.userId);
                                                            }}
                                                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                                                isSelected
                                                                    ? "bg-blue-600 text-white"
                                                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                            }`}
                                                        >
                                                            {isSelected ? "Selected" : "Focus"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesReport;
