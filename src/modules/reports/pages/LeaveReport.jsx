import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
    Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { getCompanyLeaves } from "../../leave/services/leaveService";
import { 
    Calendar, CheckCircle, XCircle, Clock, Download, 
    PieChart as PieChartIcon, BarChart2, CalendarDays, Printer, 
    Eye, X as CloseIcon, AlertCircle, Building2, Search, Filter, 
    RotateCcw, Table, LayoutGrid, User, ShieldCheck, ChevronRight, FileSpreadsheet
} from "lucide-react";

const exportToCSV = (rows, filename) => {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

const MONTH_NAMES = [
    { num: "01", short: "Jan", full: "January" },
    { num: "02", short: "Feb", full: "February" },
    { num: "03", short: "Mar", full: "March" },
    { num: "04", short: "Apr", full: "April" },
    { num: "05", short: "May", full: "May" },
    { num: "06", short: "Jun", full: "June" },
    { num: "07", short: "Jul", full: "July" },
    { num: "08", short: "Aug", full: "August" },
    { num: "09", short: "Sep", full: "September" },
    { num: "10", short: "Oct", full: "October" },
    { num: "11", short: "Nov", full: "November" },
    { num: "12", short: "Dec", full: "December" },
];

const LeaveReport = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin || permissions.includes("VIEW_ALL_LEAVES");

    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [selectedMonth, setSelectedMonth] = useState(""); // "" = All Months, "01".."12"
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // View Switcher: "summary" | "matrix"
    const [activeView, setActiveView] = useState("matrix");

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [modalMonthFilter, setModalMonthFilter] = useState(""); // inside modal filter

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getCompanyLeaves({ year });
            setLeaves(response.leaves || []);
        } catch (error) {
            console.error("Error loading leaves:", error);
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        if (isAdmin) loadData();
    }, [loadData, isAdmin]);

    // Unique Departments List for Filter Dropdown
    const departments = useMemo(() => {
        const depts = new Set();
        leaves.forEach(l => {
            const d = l.userId?.department?.name;
            if (d) depts.add(d);
        });
        return Array.from(depts).sort();
    }, [leaves]);

    // Reset All Filters
    const handleResetFilters = () => {
        setSelectedMonth("");
        setDepartmentFilter("");
        setStatusFilter("");
        setSearchQuery("");
    };

    const isFiltered = Boolean(selectedMonth || departmentFilter || statusFilter || searchQuery);

    if (!isAdmin) {
        return <div className="p-6 text-center text-red-500 font-medium">You do not have permission to view this report.</div>;
    }

    // Filter leaves for KPIs and Charts based on current filters
    const filteredLeaves = leaves.filter(l => {
        if (statusFilter && l.status !== statusFilter) return false;
        if (selectedMonth) {
            const m = l.fromDate ? l.fromDate.split("-")[1] : "";
            if (m !== selectedMonth) return false;
        }
        if (departmentFilter) {
            const dName = l.userId?.department?.name || "Unassigned";
            if (dName !== departmentFilter) return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const fullName = `${l.userId?.firstName || ""} ${l.userId?.lastName || ""}`.toLowerCase();
            const code = (l.userId?.employeeCode || "").toLowerCase();
            if (!fullName.includes(q) && !code.includes(q)) return false;
        }
        return true;
    });

    // --- KPIs ---
    const totalDays = filteredLeaves.reduce((acc, curr) => acc + (curr.days || 0), 0);
    const approvedDays = filteredLeaves.filter(l => l.status === "approved").reduce((acc, curr) => acc + (curr.days || 0), 0);
    const approvedCount = filteredLeaves.filter(l => l.status === "approved").length;
    const pendingCount = filteredLeaves.filter(l => l.status === "pending").length;
    const rejectedCount = filteredLeaves.filter(l => l.status === "rejected").length;
    const paidLeaveDays = filteredLeaves.filter(l => l.status === "approved" && (l.leaveTypeId?.isPaid ?? true)).reduce((acc, curr) => acc + (curr.days || 0), 0);
    const unpaidLeaveDays = filteredLeaves.filter(l => l.status === "approved" && l.leaveTypeId?.isPaid === false).reduce((acc, curr) => acc + (curr.days || 0), 0);

    // --- Chart 1: Leave Type Distribution (Pie Chart) ---
    const leaveTypeMap = {};
    filteredLeaves.forEach(l => {
        const typeName = l.leaveTypeId?.name || "Other";
        if (!leaveTypeMap[typeName]) leaveTypeMap[typeName] = 0;
        leaveTypeMap[typeName] += (l.days || 0);
    });
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    const pieData = Object.keys(leaveTypeMap).map((k, i) => ({ 
        name: k, 
        value: leaveTypeMap[k],
        color: colors[i % colors.length]
    })).filter(d => d.value > 0);

    // --- Chart 2: Monthly Leave Trend (Bar Chart for the Year) ---
    const monthlyTrendMap = {
        "01": 0, "02": 0, "03": 0, "04": 0, "05": 0, "06": 0,
        "07": 0, "08": 0, "09": 0, "10": 0, "11": 0, "12": 0
    };
    
    // For annual trend, take year leaves matching status, dept, and search
    leaves.filter(l => {
        if (statusFilter && l.status !== statusFilter) return false;
        if (departmentFilter) {
            const dName = l.userId?.department?.name || "Unassigned";
            if (dName !== departmentFilter) return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const fullName = `${l.userId?.firstName || ""} ${l.userId?.lastName || ""}`.toLowerCase();
            const code = (l.userId?.employeeCode || "").toLowerCase();
            if (!fullName.includes(q) && !code.includes(q)) return false;
        }
        return true;
    }).forEach(l => {
        if (l.fromDate) {
            const m = l.fromDate.split("-")[1];
            if (monthlyTrendMap[m] !== undefined) {
                monthlyTrendMap[m] += (l.days || 0);
            }
        }
    });

    const barData = MONTH_NAMES.map(m => ({
        month: m.short,
        num: m.num,
        days: monthlyTrendMap[m.num] || 0,
        isSelected: selectedMonth === m.num
    }));

    // --- Chart 3: Department-Wise Leaves ---
    const deptMap = {};
    filteredLeaves.forEach(l => {
        const deptName = l.userId?.department?.name || "Unassigned";
        if (!deptMap[deptName]) deptMap[deptName] = 0;
        deptMap[deptName] += (l.days || 0);
    });
    const deptData = Object.keys(deptMap).map(k => ({
        department: k,
        days: deptMap[k]
    })).sort((a, b) => b.days - a.days);

    // --- Aggregated Employee Data with Monthly Breakdown (for Summary & Grid Matrix) ---
    const employeeData = useMemo(() => {
        const map = {};

        leaves.forEach(l => {
            const empId = l.userId?._id;
            if (!empId) return;

            if (!map[empId]) {
                map[empId] = {
                    user: l.userId,
                    totalApps: 0,
                    totalDays: 0,
                    approvedDays: 0,
                    pendingDays: 0,
                    rejectedDays: 0,
                    monthlyDays: {
                        "01": 0, "02": 0, "03": 0, "04": 0, "05": 0, "06": 0,
                        "07": 0, "08": 0, "09": 0, "10": 0, "11": 0, "12": 0
                    },
                    monthlyLeaves: {
                        "01": [], "02": [], "03": [], "04": [], "05": [], "06": [],
                        "07": [], "08": [], "09": [], "10": [], "11": [], "12": []
                    },
                    leaveTypesMap: {},
                    leavesList: []
                };
            }

            // Check if status filter matches for counting
            const matchesStatus = !statusFilter || l.status === statusFilter;
            const matchesMonth = !selectedMonth || (l.fromDate && l.fromDate.split("-")[1] === selectedMonth);

            if (matchesStatus) {
                const m = l.fromDate ? l.fromDate.split("-")[1] : null;
                if (m && map[empId].monthlyDays[m] !== undefined) {
                    map[empId].monthlyDays[m] += (l.days || 0);
                    map[empId].monthlyLeaves[m].push(l);
                }

                // If also matches month filter (or month filter is all), accumulate into totals
                if (matchesMonth) {
                    map[empId].totalApps++;
                    map[empId].totalDays += (l.days || 0);
                    if (l.status === 'approved') map[empId].approvedDays += (l.days || 0);
                    if (l.status === 'pending') map[empId].pendingDays += (l.days || 0);
                    if (l.status === 'rejected') map[empId].rejectedDays += (l.days || 0);
                }
            }

            // Keep full record in leavesList for ledger
            map[empId].leavesList.push(l);

            // Leave types map
            const tName = l.leaveTypeId?.name || "Other";
            if (!map[empId].leaveTypesMap[tName]) {
                map[empId].leaveTypesMap[tName] = { days: 0, isPaid: l.leaveTypeId?.isPaid ?? true };
            }
            map[empId].leaveTypesMap[tName].days += (l.days || 0);
        });

        let list = Object.values(map);

        // Filter by Department
        if (departmentFilter) {
            list = list.filter(e => (e.user?.department?.name || "Unassigned") === departmentFilter);
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(e => {
                const name = `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.toLowerCase();
                const code = (e.user?.employeeCode || "").toLowerCase();
                return name.includes(q) || code.includes(q);
            });
        }

        // If a month is selected, sort by that month's days, else by totalDays
        return list.sort((a, b) => {
            if (selectedMonth) {
                return (b.monthlyDays[selectedMonth] || 0) - (a.monthlyDays[selectedMonth] || 0);
            }
            return b.totalDays - a.totalDays;
        });
    }, [leaves, statusFilter, selectedMonth, departmentFilter, searchQuery]);

    // Top 5 Absent Employees (based on current filter)
    const topAbsent = useMemo(() => {
        return employeeData
            .filter(e => (selectedMonth ? (e.monthlyDays[selectedMonth] || 0) : e.totalDays) > 0)
            .slice(0, 5);
    }, [employeeData, selectedMonth]);

    // Export Handler: Exports either Summary or Full Monthly Grid
    const handleExportReport = () => {
        if (activeView === "matrix") {
            const headers = [
                "Employee Code", "Employee Name", "Department",
                ...MONTH_NAMES.map(m => m.short),
                "Total Days", "Approved Days"
            ];
            const rows = employeeData.map(e => [
                e.user?.employeeCode || "",
                `${e.user?.firstName || ""} ${e.user?.lastName || ""}`,
                e.user?.department?.name || "N/A",
                ...MONTH_NAMES.map(m => e.monthlyDays[m.num] || 0),
                e.totalDays,
                e.approvedDays
            ]);
            exportToCSV([headers, ...rows], `Leave_Monthly_Matrix_${year}.csv`);
        } else {
            const headers = ["Employee Code", "Employee Name", "Department", "Total Applications", "Total Days Applied", "Approved Days"];
            const rows = employeeData.map(e => [
                e.user?.employeeCode || "",
                `${e.user?.firstName || ""} ${e.user?.lastName || ""}`,
                e.user?.department?.name || "N/A",
                e.totalApps,
                e.totalDays,
                e.approvedDays
            ]);
            exportToCSV([headers, ...rows], `Leave_Summary_${year}${selectedMonth ? `_${selectedMonth}` : ""}.csv`);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const openEmployeeModal = (emp, initialMonth = "") => {
        setSelectedEmployee(emp);
        setModalMonthFilter(initialMonth || selectedMonth || "");
    };

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-screen print:bg-white print:p-0 space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <CalendarDays className="w-7 h-7 text-indigo-600" /> Advanced Leave Analytics
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 font-medium">
                        Detailed month-wise trends, employee monthly matrix grid & leave ledgers ({year})
                    </p>
                </div>

                {/* Print & Export Actions */}
                <div className="flex items-center gap-2.5">
                    <button 
                        onClick={handlePrint} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
                    >
                        <Printer size={15} className="text-slate-500" /> Print Report
                    </button>
                    <button 
                        onClick={handleExportReport} 
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
                    >
                        <Download size={15} /> Export {activeView === "matrix" ? "Matrix CSV" : "Summary CSV"}
                    </button>
                </div>
            </div>

            {/* Filter Toolbar Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 print:hidden">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    
                    {/* Left: Search Box */}
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search employee by name or code (e.g. DCT-10)..."
                            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <CloseIcon size={14} />
                            </button>
                        )}
                    </div>

                    {/* Right: Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        
                        {/* Year Dropdown */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                            <Calendar size={14} className="text-slate-500" />
                            <select 
                                value={year} 
                                onChange={e => setYear(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none cursor-pointer"
                            >
                                {[0, 1, 2, 3].map(i => {
                                    const y = new Date().getFullYear() - i;
                                    return <option key={y} value={y}>{y}</option>;
                                })}
                            </select>
                        </div>

                        {/* Month Filter Dropdown */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                            <span className="text-xs font-semibold text-slate-500">Month:</span>
                            <select 
                                value={selectedMonth} 
                                onChange={e => setSelectedMonth(e.target.value)}
                                className={`bg-transparent text-xs sm:text-sm font-bold outline-none cursor-pointer ${selectedMonth ? 'text-indigo-600 font-extrabold' : 'text-slate-800'}`}
                            >
                                <option value="">All Months (Full Year)</option>
                                {MONTH_NAMES.map(m => (
                                    <option key={m.num} value={m.num}>{m.num} - {m.full}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department Dropdown */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                            <Building2 size={14} className="text-slate-500" />
                            <select 
                                value={departmentFilter} 
                                onChange={e => setDepartmentFilter(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer max-w-[140px] truncate"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Dropdown */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                            <Filter size={14} className="text-slate-500" />
                            <select 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        {/* Reset Filter Button */}
                        {isFiltered && (
                            <button 
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition"
                                title="Reset all active filters"
                            >
                                <RotateCcw size={13} /> Reset
                            </button>
                        )}

                    </div>
                </div>

                {/* Filter Active Pills Bar */}
                {isFiltered && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Active Filters:</span>
                        {selectedMonth && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                Month: {MONTH_NAMES.find(m => m.num === selectedMonth)?.full}
                                <CloseIcon size={12} className="cursor-pointer hover:text-indigo-900" onClick={() => setSelectedMonth("")} />
                            </span>
                        )}
                        {departmentFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                Dept: {departmentFilter}
                                <CloseIcon size={12} className="cursor-pointer hover:text-blue-900" onClick={() => setDepartmentFilter("")} />
                            </span>
                        )}
                        {statusFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 capitalize">
                                Status: {statusFilter}
                                <CloseIcon size={12} className="cursor-pointer hover:text-amber-900" onClick={() => setStatusFilter("")} />
                            </span>
                        )}
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-300">
                                Search: "{searchQuery}"
                                <CloseIcon size={12} className="cursor-pointer hover:text-slate-900" onClick={() => setSearchQuery("")} />
                            </span>
                        )}
                        <span className="ml-auto text-slate-400 font-medium">
                            Showing {employeeData.length} employees ({filteredLeaves.length} leave records)
                        </span>
                    </div>
                )}
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <h1 className="text-3xl font-bold text-slate-900">Leave Analytics Report</h1>
                <p className="text-gray-500 mt-2">Year: {year} {selectedMonth ? `| Month: ${MONTH_NAMES.find(m => m.num === selectedMonth)?.full}` : ""} | DigiCoders Workastra Dashboard</p>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-medium">Loading leave analytics data...</p>
                </div>
            ) : (
                <>
                    {/* KPI Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* Total Leave Days */}
                        <div className="bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                                        Total Leave Days {selectedMonth ? `(${MONTH_NAMES.find(m => m.num === selectedMonth)?.short})` : `(${year})`}
                                    </p>
                                    <p className="text-3xl font-black text-slate-900 mt-1">{totalDays}</p>
                                    <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-500">
                                        <span>Paid: <strong className="text-emerald-700">{paidLeaveDays}d</strong></span>
                                        <span>•</span>
                                        <span>LOP: <strong className="text-rose-700">{unpaidLeaveDays}d</strong></span>
                                    </div>
                                </div>
                                <div className="p-3 bg-indigo-100/70 text-indigo-600 rounded-xl shadow-xs">
                                    <CalendarDays size={22} />
                                </div>
                            </div>
                        </div>

                        {/* Approved Days */}
                        <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Approved Leaves</p>
                                    <p className="text-3xl font-black text-slate-900 mt-1">{approvedDays} <span className="text-sm font-semibold text-slate-500">Days</span></p>
                                    <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                                        {approvedCount} applications approved
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-100/70 text-emerald-600 rounded-xl shadow-xs">
                                    <CheckCircle size={22} />
                                </div>
                            </div>
                        </div>

                        {/* Pending Approvals */}
                        <div className="bg-gradient-to-br from-amber-50/80 to-white border border-amber-100 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending Review</p>
                                    <p className="text-3xl font-black text-slate-900 mt-1">{pendingCount}</p>
                                    <p className="text-[11px] text-amber-700 font-semibold mt-2">
                                        Action required by HR/Admin
                                    </p>
                                </div>
                                <div className="p-3 bg-amber-100/70 text-amber-600 rounded-xl shadow-xs">
                                    <Clock size={22} />
                                </div>
                            </div>
                        </div>

                        {/* Rejected Requests */}
                        <div className="bg-gradient-to-br from-rose-50/80 to-white border border-rose-100 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Rejected Leaves</p>
                                    <p className="text-3xl font-black text-slate-900 mt-1">{rejectedCount}</p>
                                    <p className="text-[11px] text-rose-700 font-semibold mt-2">
                                        Declined applications
                                    </p>
                                </div>
                                <div className="p-3 bg-rose-100/70 text-rose-600 rounded-xl shadow-xs">
                                    <XCircle size={22} />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Charts Section: Monthly Trend & Top Absentees */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Monthly Trend Chart */}
                        <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                                        <BarChart2 size={16} className="text-indigo-600" /> Monthly Leave Trend (Jan - Dec {year})
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Click any bar to filter that month</p>
                                </div>
                                {selectedMonth && (
                                    <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                                        Active: {MONTH_NAMES.find(m => m.num === selectedMonth)?.full}
                                    </span>
                                )}
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={barData} 
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        onClick={(e) => {
                                            if (e && e.activePayload && e.activePayload[0]) {
                                                const clickedNum = e.activePayload[0].payload.num;
                                                setSelectedMonth(selectedMonth === clickedNum ? "" : clickedNum);
                                            }
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={6} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                        <RechartsTooltip 
                                            cursor={{fill: '#f8fafc'}}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg">
                                                            <p className="font-bold">{d.month} {year}</p>
                                                            <p className="text-indigo-300 font-extrabold text-sm mt-0.5">{d.days} Days Applied</p>
                                                            <p className="text-[10px] text-slate-400 mt-1">Click bar to filter table</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar 
                                            dataKey="days" 
                                            radius={[6, 6, 0, 0]} 
                                            maxBarSize={44}
                                            cursor="pointer"
                                        >
                                            {barData.map((entry, index) => (
                                                <Cell 
                                                    key={`bar-${index}`} 
                                                    fill={entry.isSelected ? "#4f46e5" : selectedMonth ? "#c7d2fe" : "#6366f1"} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top 5 Absent Employees Alert */}
                        <div className="border border-rose-100 bg-rose-50/20 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-rose-800 mb-1 tracking-wide uppercase flex items-center gap-2">
                                    <AlertCircle size={16} /> Top 5 Highest Absentees
                                </h3>
                                <p className="text-xs text-slate-500 mb-4 font-medium">
                                    {selectedMonth ? `In ${MONTH_NAMES.find(m => m.num === selectedMonth)?.full}` : `Overall in ${year}`}
                                </p>
                                <div className="space-y-3">
                                    {topAbsent.length === 0 ? (
                                        <div className="text-center py-8 text-xs text-slate-400">No absentee records found</div>
                                    ) : (
                                        topAbsent.map((emp, idx) => {
                                            const days = selectedMonth ? (emp.monthlyDays[selectedMonth] || 0) : emp.totalDays;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => openEmployeeModal(emp)}
                                                    className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-100 shadow-xs hover:border-rose-300 transition cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition">
                                                            {emp.user?.firstName?.[0]}{emp.user?.lastName?.[0]}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition">
                                                                {emp.user?.firstName} {emp.user?.lastName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                {emp.user?.department?.name || 'No Dept'} • {emp.user?.employeeCode || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 pl-2">
                                                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                                            {days}d
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Secondary Visuals: Leave Types Pie & Dept Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Leave Types Breakdown Pie */}
                        <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                <PieChartIcon size={16} className="text-blue-500" /> Leave Types Breakdown {selectedMonth ? `(${MONTH_NAMES.find(m => m.num === selectedMonth)?.short})` : ""}
                            </h3>
                            <div className="h-60">
                                {pieData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">No leave type data available</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={pieData} 
                                                cx="50%" 
                                                cy="45%" 
                                                innerRadius={50} 
                                                outerRadius={75} 
                                                paddingAngle={3} 
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Department Wise Leaves */}
                        <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                <Building2 size={16} className="text-emerald-600" /> Department-Wise Leaves
                            </h3>
                            <div className="h-60">
                                {deptData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">No department data available</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                                            <YAxis type="category" dataKey="department" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#334155'}} width={110} />
                                            <RechartsTooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            />
                                            <Bar dataKey="days" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* MAIN TABLE SECTION WITH VIEW SWITCHER */}
                    <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
                        
                        {/* Table Header & View Switcher Toolbar */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                    {activeView === "matrix" ? (
                                        <>
                                            <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> 
                                            Month-Wise Employee Leave Grid (Jan – Dec {year})
                                        </>
                                    ) : (
                                        <>
                                            <Table className="w-5 h-5 text-indigo-600" /> 
                                            Employee Leave Summary Breakdown
                                        </>
                                    )}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeView === "matrix" 
                                        ? "Showing monthly distribution of leaves for each employee across all 12 months." 
                                        : "Showing total applications, applied days, and approved days."}
                                </p>
                            </div>

                            {/* View Switcher Toggle Buttons */}
                            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl self-start md:self-auto">
                                <button
                                    onClick={() => setActiveView("matrix")}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        activeView === "matrix" 
                                            ? "bg-white text-indigo-600 shadow-xs" 
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <FileSpreadsheet size={14} /> Monthly Grid (Jan-Dec)
                                </button>
                                <button
                                    onClick={() => setActiveView("summary")}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        activeView === "summary" 
                                            ? "bg-white text-indigo-600 shadow-xs" 
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Table size={14} /> Summary View
                                </button>
                            </div>
                        </div>

                        {/* TABLE 1: MONTHLY GRID MATRIX VIEW (Jan - Dec) */}
                        {activeView === "matrix" ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse min-w-[950px]">
                                    <thead>
                                        <tr className="bg-slate-100/80 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                            <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-100 z-10">Employee</th>
                                            <th className="py-3 px-3 min-w-[120px]">Department</th>
                                            {MONTH_NAMES.map(m => (
                                                <th 
                                                    key={m.num} 
                                                    className={`py-3 px-2 text-center min-w-[48px] ${selectedMonth === m.num ? 'bg-indigo-50 text-indigo-700 font-black' : ''}`}
                                                >
                                                    {m.short}
                                                </th>
                                            ))}
                                            <th className="py-3 px-3 text-center min-w-[80px] bg-slate-100">Total</th>
                                            <th className="py-3 px-3 text-right min-w-[70px] print:hidden">Ledger</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {employeeData.length === 0 ? (
                                            <tr>
                                                <td colSpan="16" className="py-12 text-center text-slate-400 text-sm">
                                                    No employee leave records found matching current filters
                                                </td>
                                            </tr>
                                        ) : (
                                            employeeData.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-indigo-50/30 transition">
                                                    
                                                    {/* Employee Sticky Column */}
                                                    <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-indigo-50/30 z-10 border-r border-slate-100">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {e.user?.firstName?.[0]}{e.user?.lastName?.[0]}
                                                            </div>
                                                            <div className="truncate min-w-0">
                                                                <p className="font-bold text-slate-900 truncate">
                                                                    {e.user?.firstName} {e.user?.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-mono">
                                                                    {e.user?.employeeCode || "N/A"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Department */}
                                                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[130px]">
                                                        {e.user?.department?.name || "Unassigned"}
                                                    </td>

                                                    {/* 12 Month Cells */}
                                                    {MONTH_NAMES.map(m => {
                                                        const days = e.monthlyDays[m.num] || 0;
                                                        const isSelectedCol = selectedMonth === m.num;
                                                        return (
                                                            <td 
                                                                key={m.num} 
                                                                className={`py-2.5 px-2 text-center ${isSelectedCol ? 'bg-indigo-50/50' : ''}`}
                                                            >
                                                                {days > 0 ? (
                                                                    <button
                                                                        onClick={() => openEmployeeModal(e, m.num)}
                                                                        className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[11px] font-black bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/80 transition active:scale-95 shadow-2xs"
                                                                        title={`Click to view ${days} days leave in ${m.full}`}
                                                                    >
                                                                        {days}d
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-300 font-normal">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Total Days Column */}
                                                    <td className="py-2.5 px-3 text-center bg-slate-50/50">
                                                        <span className="font-black text-slate-900 text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200">
                                                            {e.totalDays}d
                                                        </span>
                                                    </td>

                                                    {/* Ledger Eye Action Button */}
                                                    <td className="py-2.5 px-3 text-right print:hidden">
                                                        <button 
                                                            onClick={() => openEmployeeModal(e)}
                                                            className="p-1.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition active:scale-95 shadow-2xs"
                                                            title="View Detailed Leave Ledger"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                    </td>

                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* TABLE 2: SUMMARY VIEW */
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/80 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                            <th className="py-3 px-4">Employee</th>
                                            <th className="py-3 px-4">Department</th>
                                            <th className="py-3 px-4 text-center">Applications</th>
                                            <th className="py-3 px-4 text-center">Total Days Applied</th>
                                            <th className="py-3 px-4 text-center">Approved Days</th>
                                            <th className="py-3 px-4 text-center">Pending Review</th>
                                            <th className="py-3 px-4 text-right print:hidden">Ledger</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {employeeData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="py-12 text-center text-slate-400 text-sm">
                                                    No employee leave records found matching current filters
                                                </td>
                                            </tr>
                                        ) : (
                                            employeeData.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-indigo-50/30 transition">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {e.user?.firstName?.[0]}{e.user?.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900">
                                                                    {e.user?.firstName} {e.user?.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-mono">
                                                                    {e.user?.employeeCode || "N/A"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 font-semibold">
                                                        {e.user?.department?.name || "Unassigned"}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                                                        {e.totalApps}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                                                        {e.totalDays} Days
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                            {e.approvedDays} Days
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {e.pendingDays > 0 ? (
                                                            <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                                {e.pendingDays} Days
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right print:hidden">
                                                        <button 
                                                            onClick={() => openEmployeeModal(e)}
                                                            className="p-1.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition active:scale-95 shadow-2xs"
                                                            title="View Detailed Leave Ledger"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </>
            )}

            {/* SMART EMPLOYEE DEEP-DIVE MODAL */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm print:hidden animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/30">
                                    {selectedEmployee.user?.firstName?.[0]}{selectedEmployee.user?.lastName?.[0]}
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                        {selectedEmployee.user?.firstName} {selectedEmployee.user?.lastName}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200 font-mono">
                                            {selectedEmployee.user?.employeeCode || "No Code"}
                                        </span>
                                        <span>•</span>
                                        <span>Dept: <strong className="text-slate-700">{selectedEmployee.user?.department?.name || "Unassigned"}</strong></span>
                                        <span>•</span>
                                        <span>Year: <strong className="text-slate-700">{year}</strong></span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedEmployee(null)} 
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
                            >
                                <CloseIcon size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
                            
                            {/* Monthly Breakdown Interactive Strip */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Month-by-Month Distribution ({year})
                                </p>
                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                                    {MONTH_NAMES.map(m => {
                                        const d = selectedEmployee.monthlyDays[m.num] || 0;
                                        const isSelected = modalMonthFilter === m.num;
                                        return (
                                            <button
                                                key={m.num}
                                                onClick={() => setModalMonthFilter(isSelected ? "" : m.num)}
                                                className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center ${
                                                    isSelected 
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
                                                        : d > 0 
                                                            ? 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border-indigo-200' 
                                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}
                                            >
                                                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                    {m.short}
                                                </span>
                                                <span className={`text-xs font-black mt-0.5 ${isSelected ? 'text-white' : d > 0 ? 'text-indigo-700' : 'text-slate-300'}`}>
                                                    {d > 0 ? `${d}d` : "—"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Leave Type Summary Cards */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600">Leave Categories:</span>
                                    {Object.keys(selectedEmployee.leaveTypesMap).length === 0 ? (
                                        <span className="text-xs text-slate-400">No leaves applied yet</span>
                                    ) : (
                                        Object.entries(selectedEmployee.leaveTypesMap).map(([type, info], i) => (
                                            <span 
                                                key={i} 
                                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                                                    info.isPaid 
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                                }`}
                                            >
                                                <span>{type}:</span>
                                                <strong className="font-black">{info.days}d</strong>
                                                <span className="text-[10px] opacity-75 font-normal">({info.isPaid ? 'Paid' : 'LOP'})</span>
                                            </span>
                                        ))
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-700">
                                    Total: <strong className="text-indigo-700 font-black">{selectedEmployee.totalDays} Days</strong>
                                </div>
                            </div>

                            {/* Ledger Filter Header */}
                            <div className="flex items-center justify-between pt-1">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {modalMonthFilter 
                                        ? `Ledger Entries for ${MONTH_NAMES.find(m => m.num === modalMonthFilter)?.full}` 
                                        : "All Leave Ledger Records"}
                                </h4>
                                {modalMonthFilter && (
                                    <button 
                                        onClick={() => setModalMonthFilter("")} 
                                        className="text-xs text-indigo-600 hover:underline font-bold"
                                    >
                                        Show All Months
                                    </button>
                                )}
                            </div>

                            {/* Leave Applications List */}
                            <div className="space-y-3">
                                {(() => {
                                    const list = selectedEmployee.leavesList
                                        .filter(l => {
                                            if (modalMonthFilter) {
                                                const m = l.fromDate ? l.fromDate.split("-")[1] : "";
                                                if (m !== modalMonthFilter) return false;
                                            }
                                            return true;
                                        })
                                        .sort((a,b) => new Date(b.fromDate) - new Date(a.fromDate));

                                    if (list.length === 0) {
                                        return (
                                            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
                                                No leave applications in {modalMonthFilter ? MONTH_NAMES.find(m => m.num === modalMonthFilter)?.full : "this period"}
                                            </div>
                                        );
                                    }

                                    return list.map((leave, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-indigo-200 transition">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-sm text-slate-900">
                                                        {leave.leaveTypeId?.name || "Leave"}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                                                        leave.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 
                                                        'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {leave.status}
                                                    </span>
                                                    {leave.leaveTypeId?.isPaid === false && (
                                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-200">
                                                            Loss of Pay
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                                        {leave.days} {leave.days === 1 ? 'Day' : 'Days'}
                                                    </span>
                                                    {leave.isHalfDay && (
                                                        <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                            Half Day
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-600 space-y-1.5">
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                    <Calendar size={13} className="text-indigo-600" />
                                                    <span>{new Date(leave.fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                                    <span>→</span>
                                                    <span>{new Date(leave.toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                                </div>
                                                {leave.reason && (
                                                    <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 italic">
                                                        "{leave.reason}"
                                                    </p>
                                                )}
                                                {leave.approvedBy && (
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        Reviewed by: <strong className="text-slate-600">{leave.approvedBy.firstName} {leave.approvedBy.lastName}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">
                                Total {selectedEmployee.leavesList.length} applications recorded
                            </span>
                            <button 
                                onClick={() => setSelectedEmployee(null)} 
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                            >
                                Close Ledger
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default LeaveReport;
