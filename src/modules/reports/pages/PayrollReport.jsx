import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { getPayrollRuns } from "../../payroll/services/payrollService";
import { Banknote, Users, Download, CreditCard, PieChart as PieChartIcon, Eye, TrendingUp, Building2 } from "lucide-react";
import PayslipPrint from "../../payroll/pages/PayslipPrint";

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
    
    // Filters
    const [deptFilter, setDeptFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    
    // Payslip Modal
    const [selectedPayslip, setSelectedPayslip] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [monthData, allData] = await Promise.all([
                getPayrollRuns({ month }),
                getPayrollRuns({}) // Fetch all runs for trend chart
            ]);
            setRuns(monthData.runs || []);
            setAllRuns(allData.runs || []);
        } catch (error) {
            console.error("Error loading payroll runs:", error);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        if (isAdmin) loadData();
    }, [loadData, isAdmin]);

    if (!isAdmin) {
        return <div className="p-6 text-center text-red-500">You do not have permission to view this report.</div>;
    }

    // Apply Table Filters
    const filteredRuns = runs.filter(r => {
        let match = true;
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
    const totalDeductions = runs.reduce((acc, curr) => acc + (curr.totalDeductions || 0) + (curr.lopDeduction || 0), 0);
    
    const handleExportReport = () => {
        const headers = ["Employee Name", "Code", "Department", "Working Days", "LOP Days", "Gross Salary", "Deductions", "Net Salary", "Status"];
        const rows = filteredRuns.map(r => [
            `${r.userId?.firstName || ""} ${r.userId?.lastName || ""}`,
            r.userId?.employeeCode || "",
            r.userId?.department?.name || "",
            r.totalWorkingDays || 0,
            r.lopDays || 0,
            r.grossEarnings || 0,
            (r.totalDeductions || 0) + (r.lopDeduction || 0),
            r.netSalary || 0,
            r.status.toUpperCase()
        ]);
        exportToCSV([headers, ...rows], `payroll_report_${month}.csv`);
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            {selectedPayslip && <PayslipPrint run={selectedPayslip} onClose={() => setSelectedPayslip(null)} />}
            
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Payroll Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Detailed monthly analytics & trends for company payroll</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Monthly Payroll Report</h2>
                        <p className="text-sm text-gray-500 mt-1">Select a month to view details</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium transition shadow-sm">
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-gray-400">Loading payroll data...</div>
                ) : (
                    <>
                        {/* Widgets */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-blue-600 mb-1 tracking-wide">Processed Runs</p>
                                    <p className="text-3xl font-bold text-blue-800">{runs.length}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-blue-600 shadow-sm border border-blue-100"><Users size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-green-600 mb-1 tracking-wide">Net Payout</p>
                                    <p className="text-2xl font-bold text-green-800">₹{totalNetPayout.toLocaleString()}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-green-600 shadow-sm border border-green-100"><Banknote size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-indigo-600 mb-1 tracking-wide">Gross Salary</p>
                                    <p className="text-2xl font-bold text-indigo-800">₹{totalGross.toLocaleString()}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-indigo-600 shadow-sm border border-indigo-100"><CreditCard size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-red-600 mb-1 tracking-wide">Deductions</p>
                                    <p className="text-2xl font-bold text-red-800">₹{totalDeductions.toLocaleString()}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-red-600 shadow-sm border border-red-100"><Banknote size={26} /></div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            
                            {/* Trend Chart */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm lg:col-span-2">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <TrendingUp size={16} className="text-indigo-500" /> Salary Expense Trend (Last 6 Months)
                                </h3>
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dx={-10} tickFormatter={(v) => `₹${v/1000}k`} />
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
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <PieChartIcon size={16} className="text-blue-500" /> Payroll Status
                                </h3>
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                            <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Department Bar */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm lg:col-span-3">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <Building2 size={16} className="text-emerald-500" /> Department-wise Expenses
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dx={-10} tickFormatter={(v) => `₹${v/1000}k`} />
                                            <RechartsTooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Net']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>

                        {/* Filter & Table */}
                        <div className="border border-gray-100 rounded-2xl bg-white shadow-sm">
                            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50 rounded-t-2xl">
                                <h3 className="font-bold text-gray-800">Employee Breakdown</h3>
                                <div className="flex flex-wrap gap-3">
                                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400">
                                        <option value="">All Departments</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400">
                                        <option value="">All Statuses</option>
                                        <option value="draft">Draft</option>
                                        <option value="approved">Approved</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-gray-500 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="px-5 py-3">Employee</th>
                                            <th className="px-5 py-3">Work Days</th>
                                            <th className="px-5 py-3">LOP</th>
                                            <th className="px-5 py-3">Gross</th>
                                            <th className="px-5 py-3">Deductions</th>
                                            <th className="px-5 py-3">Net Salary</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3 text-center">Payslip</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredRuns.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-5 py-8 text-center text-gray-400">No records found</td>
                                            </tr>
                                        ) : (
                                            filteredRuns.map((r, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800">{r.userId?.firstName} {r.userId?.lastName}</p>
                                                                <p className="text-[11px] text-gray-400">{r.userId?.employeeCode} • {r.userId?.department?.name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-gray-600">{r.totalWorkingDays}</td>
                                                    <td className="px-5 py-3">
                                                        {r.lopDays > 0 ? <span className="text-red-500 font-bold">{r.lopDays} d</span> : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-gray-600">₹{(r.grossEarnings || 0).toLocaleString()}</td>
                                                    <td className="px-5 py-3 font-medium text-red-500">-₹{((r.totalDeductions || 0) + (r.lopDeduction || 0)).toLocaleString()}</td>
                                                    <td className="px-5 py-3 font-bold text-gray-900">₹{(r.netSalary || 0).toLocaleString()}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                            r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <button 
                                                            onClick={() => setSelectedPayslip(r)}
                                                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition"
                                                            title="View Payslip"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
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
