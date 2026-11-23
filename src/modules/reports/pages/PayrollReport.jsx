import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { getPayrollRuns } from "../../payroll/services/payrollService";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { Banknote, Users, Download, CreditCard, PieChart as PieChartIcon, Eye, TrendingUp, Building2, Calendar, FileText, X } from "lucide-react";
import PayslipPrint from "../../payroll/pages/PayslipPrint";
import EmployeePayrollHistoryModal from "../components/EmployeePayrollHistoryModal";

const exportToCSV = (rows, filename) => {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

const PayrollReport = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin || permissions.includes("MANAGE_PAYROLL");

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [runs, setRuns] = useState([]);
    const [allRuns, setAllRuns] = useState([]); // For MoM trend
    const [loading, setLoading] = useState(false);
    
    // Companies & Filters
    const [companies, setCompanies] = useState([]);
    const [companyFilter, setCompanyFilter] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    
    // Payslip Modal
    const [selectedPayslip, setSelectedPayslip] = useState(null);
    
    // Employee Payroll History Modal
    const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState(null);

    useEffect(() => {
        fetchAllCompaniesList()
            .then(res => setCompanies(res?.companies || []))
            .catch(err => console.error("Failed to load companies:", err));
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const params = { month };
            if (companyFilter) params.companyId = companyFilter;
            const allParams = {};
            if (companyFilter) allParams.companyId = companyFilter;

            const [monthData, allData] = await Promise.all([
                getPayrollRuns(params),
                getPayrollRuns(allParams) // Fetch all runs for trend chart
            ]);
            setRuns(monthData.runs || []);
            setAllRuns(allData.runs || []);
        } catch (error) {
            console.error("Error loading payroll runs:", error);
        } finally {
            setLoading(false);
        }
    }, [month, companyFilter]);

    useEffect(() => {
        if (isAdmin) loadData();
    }, [loadData, isAdmin]);

    if (!isAdmin) {
        return <div className="p-6 text-center text-red-500">You do not have permission to view this report.</div>;
    }

    // Apply Table Filters
    const filteredRuns = runs.filter(r => {
        let match = true;
        const compId = r.companyId?._id || r.companyId || r.userId?.companyId?._id || r.userId?.companyId;
        if (companyFilter && String(compId) !== String(companyFilter)) match = false;
        if (deptFilter && r.userId?.department?.name !== deptFilter) match = false;
        if (statusFilter && r.status !== statusFilter) match = false;
        return match;
    });

    // Unique Departments for filter dropdown
    const departments = [...new Set(runs.map(r => r.userId?.department?.name).filter(Boolean))];

    // --- Chart 1: Status Pie Chart ---
    const paidCount = runs.filter(r => r.status === "paid").length;
    const approvedCount = runs.filter(r => r.status === "approved").length;
    const draftCount = runs.filter(r => r.status === "draft").length;
    const pieData = [
        { name: 'Paid', value: paidCount, color: '#10B981' },
        { name: 'Approved', value: approvedCount, color: '#3B82F6' },
        { name: 'Draft', value: draftCount, color: '#F59E0B' },
    ].filter(d => d.value > 0);

    // --- Chart 2: Department-wise Expense Bar Chart ---
    const deptExpenseMap = {};
    runs.forEach(r => {
        const dName = r.userId?.department?.name || "Unassigned";
        if (!deptExpenseMap[dName]) deptExpenseMap[dName] = 0;
        deptExpenseMap[dName] += r.netSalary || 0;
    });
    const barData = Object.keys(deptExpenseMap).map(k => ({ name: k, total: deptExpenseMap[k] })).sort((a,b) => b.total - a.total);

    // --- Chart 3: Month-over-Month Trend Line Chart ---
    const trendMap = {};
    allRuns.forEach(r => {
        if (!trendMap[r.month]) trendMap[r.month] = 0;
        trendMap[r.month] += r.netSalary || 0;
    });
    // Sort chronologically and take last 6 months
    const trendData = Object.keys(trendMap)
        .sort((a, b) => a.localeCompare(b))
        .slice(-6)
        .map(k => ({ month: k, expense: trendMap[k] }));

    // Analytics Calculation for top widgets
    const totalNetPayout = runs.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);
    const totalGross = runs.reduce((acc, curr) => acc + (curr.grossEarnings || 0), 0);
    const totalDeductions = runs.reduce((acc, curr) => acc + (curr.totalDeductions || 0), 0);
    
    const handleExportReport = () => {
        const headers = ["Employee Name", "Code", "Company", "Department", "Working Days", "LOP Days", "Gross Salary", "Deductions", "Net Salary", "Status"];
        const rows = filteredRuns.map(r => [
            `${r.userId?.firstName || ""} ${r.userId?.lastName || ""}`,
            r.userId?.employeeCode || "",
            r.companyId?.name || r.userId?.companyId?.name || "",
            r.userId?.department?.name || "",
            r.totalWorkingDays || 0,
            r.lopDays || 0,
            r.grossEarnings || 0,
            r.totalDeductions || 0,
            r.netSalary || 0,
            r.status.toUpperCase()
        ]);
        exportToCSV([headers, ...rows], `payroll_report_${month}.csv`);
    };

    return (
        <div className="p-3 sm:p-6 bg-gray-50 min-h-screen max-w-full overflow-x-hidden">
            {selectedEmployeeHistory && (
                <EmployeePayrollHistoryModal
                    employee={selectedEmployeeHistory}
                    company={user?.companyId}
                    onClose={() => setSelectedEmployeeHistory(null)}
                />
            )}
            {selectedPayslip && <PayslipPrint run={selectedPayslip} company={user?.companyId} onClose={() => setSelectedPayslip(null)} />}
            
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payroll Analytics</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Detailed monthly analytics & trends for company payroll</p>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-2xs mb-6 max-w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900">Monthly Payroll Report</h2>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Select month and company to view details</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {companies.length > 0 && (
                            <div className="relative flex-1 sm:flex-initial min-w-[130px] sm:min-w-[190px]">
                                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={companyFilter}
                                    onChange={e => setCompanyFilter(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium text-gray-700 shadow-2xs"
                                    title="Filter by Company"
                                >
                                    <option value="">All Companies ({companies.length})</option>
                                    {companies.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                            className="flex-1 sm:flex-initial text-xs sm:text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs" />
                        <button onClick={handleExportReport} className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs cursor-pointer">
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Loading payroll data...</div>
                ) : (
                    <>
                        {/* Widgets */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition duration-300 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-[11px] sm:text-sm font-semibold text-blue-600 mb-0.5 sm:mb-1 tracking-wide truncate">Processed Runs</p>
                                    <p className="text-xl sm:text-3xl font-bold text-blue-800 truncate">{runs.length}</p>
                                </div>
                                <div className="p-2 sm:p-3.5 bg-white/70 backdrop-blur-xs rounded-full text-blue-600 shadow-2xs border border-blue-100 shrink-0 ml-1.5 sm:ml-2">
                                    <Users className="w-4 h-4 sm:w-6 sm:h-6" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition duration-300 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-[11px] sm:text-sm font-semibold text-green-600 mb-0.5 sm:mb-1 tracking-wide truncate">Net Payout</p>
                                    <p className="text-lg sm:text-2xl font-bold text-green-800 truncate">₹{totalNetPayout.toLocaleString()}</p>
                                </div>
                                <div className="p-2 sm:p-3.5 bg-white/70 backdrop-blur-xs rounded-full text-green-600 shadow-2xs border border-green-100 shrink-0 ml-1.5 sm:ml-2">
                                    <Banknote className="w-4 h-4 sm:w-6 sm:h-6" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition duration-300 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-[11px] sm:text-sm font-semibold text-indigo-600 mb-0.5 sm:mb-1 tracking-wide truncate">Gross Salary</p>
                                    <p className="text-lg sm:text-2xl font-bold text-indigo-800 truncate">₹{totalGross.toLocaleString()}</p>
                                </div>
                                <div className="p-2 sm:p-3.5 bg-white/70 backdrop-blur-xs rounded-full text-indigo-600 shadow-2xs border border-indigo-100 shrink-0 ml-1.5 sm:ml-2">
                                    <CreditCard className="w-4 h-4 sm:w-6 sm:h-6" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-xs transition duration-300 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-[11px] sm:text-sm font-semibold text-red-600 mb-0.5 sm:mb-1 tracking-wide truncate">Deductions</p>
                                    <p className="text-lg sm:text-2xl font-bold text-red-800 truncate">₹{totalDeductions.toLocaleString()}</p>
                                </div>
                                <div className="p-2 sm:p-3.5 bg-white/70 backdrop-blur-xs rounded-full text-red-600 shadow-2xs border border-red-100 shrink-0 ml-1.5 sm:ml-2">
                                    <Banknote className="w-4 h-4 sm:w-6 sm:h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                            
                            {/* Trend Chart */}
                            <div className="border border-gray-100 bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs lg:col-span-2 min-w-0 overflow-hidden">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-3 sm:mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <TrendingUp size={16} className="text-indigo-500 shrink-0" /> Salary Expense Trend (Last 6 Months)
                                </h3>
                                <div className="h-56 sm:h-60 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} dx={-5} tickFormatter={(v) => `₹${v/1000}k`} />
                                            <RechartsTooltip 
                                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Net Payout']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="expense" stroke="#6366f1" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Status Pie */}
                            <div className="border border-gray-100 bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs relative overflow-hidden min-w-0">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-3 sm:mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <PieChartIcon size={16} className="text-blue-500 shrink-0" /> Payroll Status
                                </h3>
                                <div className="h-56 sm:h-60 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                            <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Department Bar */}
                            <div className="border border-gray-100 bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs lg:col-span-3 min-w-0 overflow-hidden">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-3 sm:mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <Building2 size={16} className="text-emerald-500 shrink-0" /> Department-wise Expenses
                                </h3>
                                <div className="h-56 sm:h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -5, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} dx={-5} tickFormatter={(v) => `₹${v/1000}k`} />
                                            <RechartsTooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Net']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>

                        {/* Filter & Table */}
                        <div className="border border-gray-100 rounded-xl sm:rounded-2xl bg-white shadow-2xs overflow-hidden">
                            <div className="p-3.5 sm:p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-800">Employee Breakdown</h3>
                                    {companyFilter && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                            {companies.find(c => c._id === companyFilter)?.name || "Filtered"}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                                    {companies.length > 0 && (
                                        <div className="relative flex-1 sm:flex-initial min-w-[130px] sm:min-w-[170px]">
                                            <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <select
                                                value={companyFilter}
                                                onChange={e => setCompanyFilter(e.target.value)}
                                                className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white font-medium text-gray-700 cursor-pointer shadow-2xs"
                                                title="Filter by Company"
                                            >
                                                <option value="">All Companies</option>
                                                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="flex-1 sm:flex-initial text-xs sm:text-sm border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 outline-none focus:border-blue-400 bg-white font-medium text-gray-700 shadow-2xs cursor-pointer">
                                        <option value="">All Departments</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 sm:flex-initial text-xs sm:text-sm border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 outline-none focus:border-blue-400 bg-white font-medium text-gray-700 shadow-2xs cursor-pointer">
                                        <option value="">All Statuses</option>
                                        <option value="draft">Draft</option>
                                        <option value="approved">Approved</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                    {(companyFilter || deptFilter || statusFilter) && (
                                        <button
                                            onClick={() => { setCompanyFilter(""); setDeptFilter(""); setStatusFilter(""); }}
                                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                                        >
                                            <X size={12} /> Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-xs sm:text-sm text-left min-w-[780px]">
                                    <thead className="bg-gray-50/75 text-gray-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Employee</th>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Work Days</th>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">LOP</th>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Gross</th>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Deductions</th>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Net Salary</th>
                                            <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Status</th>
                                            <th className="px-4 sm:px-5 py-3 text-center whitespace-nowrap">Actions & History</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRuns.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-5 py-8 text-center text-gray-400">No records found</td>
                                            </tr>
                                        ) : (
                                            filteredRuns.map((r, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                                                        <div 
                                                            onClick={() => setSelectedEmployeeHistory(r.userId || r)}
                                                            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
                                                            title="Click to view full payroll history"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition shadow-2xs">
                                                                {r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                                                                    {r.userId?.firstName} {r.userId?.lastName}
                                                                </p>
                                                                <p className="text-[11px] text-gray-400">
                                                                    {r.userId?.employeeCode} • {r.userId?.department?.name || "No Dept"}
                                                                    {(r.companyId?.name || r.userId?.companyId?.name) ? ` • ${r.companyId?.name || r.userId?.companyId?.name}` : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-5 py-3 font-medium text-gray-600 whitespace-nowrap">{r.totalWorkingDays}</td>
                                                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                                                        {r.lopDays > 0 ? <span className="text-red-500 font-bold">{r.lopDays} d</span> : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-4 sm:px-5 py-3 font-medium text-gray-600 whitespace-nowrap">₹{(r.grossEarnings || 0).toLocaleString()}</td>
                                                    <td className="px-4 sm:px-5 py-3 font-medium text-red-500 whitespace-nowrap">-₹{(r.totalDeductions || 0).toLocaleString()}</td>
                                                    <td className="px-4 sm:px-5 py-3 font-bold text-gray-900 whitespace-nowrap">₹{(r.netSalary || 0).toLocaleString()}</td>
                                                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                            r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-5 py-3 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                            <button 
                                                                onClick={() => setSelectedEmployeeHistory(r.userId || r)}
                                                                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200/80 rounded-lg text-xs font-semibold transition shadow-2xs active:scale-95 cursor-pointer"
                                                                title="View Month-wise Payroll History"
                                                            >
                                                                <Eye size={13} /> View History
                                                            </button>
                                                            <button 
                                                                onClick={() => setSelectedPayslip(r)}
                                                                className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Print / Download This Month's Payslip"
                                                            >
                                                                <FileText size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PayrollReport;
