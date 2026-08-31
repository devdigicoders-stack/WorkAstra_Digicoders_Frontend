import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { getCompanyLeaves } from "../../leave/services/leaveService";
import { Calendar, CheckCircle, XCircle, Clock, Download, PieChart as PieChartIcon, BarChart2, CalendarDays, Printer, Eye, X as CloseIcon, AlertCircle, Building2 } from "lucide-react";

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

const LeaveReport = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin || permissions.includes("VIEW_ALL_LEAVES");

    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState("");

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState(null);

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

    if (!isAdmin) {
        return <div className="p-6 text-center text-red-500">You do not have permission to view this report.</div>;
    }

    // Apply Filters
    const filteredLeaves = leaves.filter(l => {
        let match = true;
        if (statusFilter && l.status !== statusFilter) match = false;
        return match;
    });

    // --- KPIs ---
    const totalDays = filteredLeaves.reduce((acc, curr) => acc + (curr.days || 0), 0);
    const approvedCount = filteredLeaves.filter(l => l.status === "approved").length;
    const pendingCount = filteredLeaves.filter(l => l.status === "pending").length;
    const rejectedCount = filteredLeaves.filter(l => l.status === "rejected").length;

    // --- Chart 1: Leave Type Distribution (Pie Chart) ---
    const leaveTypeMap = {};
    filteredLeaves.forEach(l => {
        const typeName = l.leaveTypeId?.name || "Unknown";
        if (!leaveTypeMap[typeName]) leaveTypeMap[typeName] = 0;
        leaveTypeMap[typeName] += (l.days || 0);
    });
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const pieData = Object.keys(leaveTypeMap).map((k, i) => ({ 
        name: k, 
        value: leaveTypeMap[k],
        color: colors[i % colors.length]
    })).filter(d => d.value > 0);

    // --- Chart 2: Monthly Leave Trend (Bar Chart) ---
    const monthlyMap = {
        "01": 0, "02": 0, "03": 0, "04": 0, "05": 0, "06": 0,
        "07": 0, "08": 0, "09": 0, "10": 0, "11": 0, "12": 0
    };
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    filteredLeaves.forEach(l => {
        if (l.fromDate) {
            const m = l.fromDate.split("-")[1];
            if (monthlyMap[m] !== undefined) {
                monthlyMap[m] += (l.days || 0);
            }
        }
    });

    const barData = Object.keys(monthlyMap).sort().map((m, i) => ({
        month: monthNames[i],
        days: monthlyMap[m]
    }));

    // --- Chart 3: Department-Wise Leave Trend ---
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

    // --- Employee Table Data Aggregation ---
    const empMap = {};
    filteredLeaves.forEach(l => {
        const empId = l.userId?._id;
        if (!empId) return;
        
        if (!empMap[empId]) {
            empMap[empId] = {
                user: l.userId,
                totalApps: 0,
                totalDays: 0,
                approvedDays: 0,
                leavesList: []
            };
        }
        
        empMap[empId].totalApps++;
        empMap[empId].totalDays += (l.days || 0);
        if (l.status === 'approved') {
            empMap[empId].approvedDays += (l.days || 0);
        }
        empMap[empId].leavesList.push(l);
    });
    
    const employeeData = Object.values(empMap).sort((a, b) => b.totalDays - a.totalDays);
    
    // Top 5 Absent Employees
    const topAbsent = employeeData.slice(0, 5);

    const handleExportReport = () => {
        const headers = ["Employee Code", "Employee Name", "Department", "Total Applications", "Total Days Applied", "Approved Days"];
        const rows = employeeData.map(e => [
            e.user?.employeeCode || "",
            `${e.user?.firstName || ""} ${e.user?.lastName || ""}`,
            e.user?.department?.name || "N/A", 
            e.totalApps,
            e.totalDays,
            e.approvedDays
        ]);
        exportToCSV([headers, ...rows], `leave_report_${year}.csv`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen print:bg-white print:p-0">
            <div className="mb-6 print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Advanced Leave Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Detailed leave trends, departmental breakdown, and top absentees</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6 print:border-none print:shadow-none print:p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Yearly Leave Report</h2>
                        <p className="text-sm text-gray-500 mt-1">Select a year to view details</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={year} onChange={e => setYear(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            {[0, 1, 2, 3].map(i => {
                                const y = new Date().getFullYear() - i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} 
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition shadow-sm">
                            <Printer size={15} /> Print PDF
                        </button>
                        <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium transition shadow-sm">
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Print Header */}
                <div className="hidden print:block mb-8 text-center border-b pb-4">
                    <h1 className="text-3xl font-bold">Leave Analytics Report</h1>
                    <p className="text-gray-500 mt-2">Year: {year} | Generated by DigiCoders Workastra Dashboard</p>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-gray-400">Loading leave data...</div>
                ) : (
                    <>
                        {/* Widgets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-blue-600 mb-1 tracking-wide print:text-black">Total Leave Days</p>
                                    <p className="text-3xl font-bold text-blue-800 print:text-black">{totalDays}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-blue-600 shadow-sm border border-blue-100 print:hidden"><CalendarDays size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-emerald-600 mb-1 tracking-wide print:text-black">Approved</p>
                                    <p className="text-2xl font-bold text-emerald-800 print:text-black">{approvedCount}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-emerald-600 shadow-sm border border-emerald-100 print:hidden"><CheckCircle size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-amber-600 mb-1 tracking-wide print:text-black">Pending</p>
                                    <p className="text-2xl font-bold text-amber-800 print:text-black">{pendingCount}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-amber-600 shadow-sm border border-amber-100 print:hidden"><Clock size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-rose-600 mb-1 tracking-wide print:text-black">Rejected</p>
                                    <p className="text-2xl font-bold text-rose-800 print:text-black">{rejectedCount}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-rose-600 shadow-sm border border-rose-100 print:hidden"><XCircle size={26} /></div>
                            </div>
                        </div>

                        {/* Top Section: Monthly Trend & Top Absentees */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            
                            {/* Monthly Trend Chart */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm lg:col-span-2">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <BarChart2 size={16} className="text-indigo-500 print:hidden" /> Monthly Leave Trend (Days)
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                            <RechartsTooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="days" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top 5 Absent Employees Alert */}
                            <div className="border border-rose-100 bg-rose-50/30 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-rose-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <AlertCircle size={16} /> Top 5 Highest Absentees
                                </h3>
                                <div className="space-y-4">
                                    {topAbsent.length === 0 ? (
                                        <p className="text-sm text-gray-500">No leave records yet.</p>
                                    ) : (
                                        topAbsent.map((emp, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {emp.user?.firstName?.[0]}{emp.user?.lastName?.[0]}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{emp.user?.firstName} {emp.user?.lastName}</p>
                                                        <p className="text-[10px] text-gray-500">{emp.user?.department?.name || 'No Dept'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-bold text-rose-600">{emp.totalDays} Days</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Mid Section: Pie Chart & Dept Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            
                            {/* Leave Types Pie */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <PieChartIcon size={16} className="text-blue-500 print:hidden" /> Leave Types Breakdown
                                </h3>
                                <div className="h-64">
                                    {pieData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Department Wise Chart */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <Building2 size={16} className="text-emerald-500 print:hidden" /> Department-Wise Leaves
                                </h3>
                                <div className="h-64">
                                    {deptData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                                <YAxis type="category" dataKey="department" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#334155'}} width={90} />
                                                <RechartsTooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="days" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Employee Breakdown Table */}
                        <div className="border border-gray-100 rounded-2xl bg-white shadow-sm">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                                <h3 className="font-bold text-gray-800">Complete Employee Leave Breakdown</h3>
                                <p className="text-xs text-gray-500 mt-1">Click on an eye icon to view the detailed leave ledger for an employee.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-gray-500 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="px-5 py-3">Employee</th>
                                            <th className="px-5 py-3">Department</th>
                                            <th className="px-5 py-3">Applications</th>
                                            <th className="px-5 py-3">Total Days Applied</th>
                                            <th className="px-5 py-3">Approved Days</th>
                                            <th className="px-5 py-3 text-right print:hidden">Ledger</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {employeeData.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-5 py-8 text-center text-gray-400">No leave records found</td>
                                            </tr>
                                        ) : (
                                            employeeData.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {e.user?.firstName?.[0]}{e.user?.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800">{e.user?.firstName} {e.user?.lastName}</p>
                                                                <p className="text-[11px] text-gray-400">{e.user?.employeeCode}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">{e.user?.department?.name || "N/A"}</td>
                                                    <td className="px-5 py-3 font-medium text-gray-600">{e.totalApps}</td>
                                                    <td className="px-5 py-3 font-bold text-gray-700">{e.totalDays} Days</td>
                                                    <td className="px-5 py-3 font-bold text-emerald-600">{e.approvedDays} Days</td>
                                                    <td className="px-5 py-3 text-right print:hidden">
                                                        <button 
                                                            onClick={() => setSelectedEmployee(e)}
                                                            className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="View Leave Ledger"
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

            {/* Leave Ledger Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Leave Ledger</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    History for <span className="font-semibold text-gray-700">{selectedEmployee.user?.firstName} {selectedEmployee.user?.lastName}</span> ({year})
                                </p>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <CloseIcon size={20} />
                            </button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto bg-gray-50/30 flex-1">
                            <div className="space-y-4">
                                {selectedEmployee.leavesList.sort((a,b) => new Date(b.fromDate) - new Date(a.fromDate)).map((leave, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">{leave.leaveTypeId?.name || "Leave"}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                    ${leave.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                                      leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                                      'bg-orange-100 text-orange-700'}`}>
                                                    {leave.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                <Calendar size={14} className="inline mr-1 text-gray-400" />
                                                {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <span className="font-semibold">Reason:</span> {leave.reason || "No reason provided"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-indigo-600">{leave.days} <span className="text-sm font-normal text-gray-500">Days</span></p>
                                            {leave.isHalfDay && <p className="text-xs text-amber-600 font-medium mt-1 bg-amber-50 inline-block px-2 py-1 rounded-md">Half Day</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 flex justify-end bg-white rounded-b-2xl">
                            <button onClick={() => setSelectedEmployee(null)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveReport;
