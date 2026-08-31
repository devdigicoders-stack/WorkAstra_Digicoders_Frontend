import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { fetchUsers } from "../../employee/services/UserService";
import { Users, UserCheck, UserX, Building2, Download, Printer, PieChart as PieChartIcon, BarChart2, Briefcase, Eye, X as CloseIcon, Mail, Phone, Calendar } from "lucide-react";

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

const EmployeeReport = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin || permissions.includes("VIEW_ALL_USERS");

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchUsers();
            const data = Array.isArray(response) ? response : (response.users || []);
            setEmployees(data);
        } catch (error) {
            console.error("Error loading employees:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) loadData();
    }, [loadData, isAdmin]);

    if (!isAdmin) {
        return <div className="p-6 text-center text-red-500">You do not have permission to view this report.</div>;
    }

    // Apply Filters
    const filteredEmployees = employees.filter(e => {
        let match = true;
        // Hide clients
        if (e.role?.name?.toLowerCase() === 'client') match = false;
        
        if (statusFilter === "active" && (!e.isActive || e.isDeleted)) match = false;
        if (statusFilter === "inactive" && (e.isActive && !e.isDeleted)) match = false;
        if (deptFilter && e.department?.name !== deptFilter && e.department?._id !== deptFilter) match = false;
        if (roleFilter && e.role?.name !== roleFilter) match = false;
        return match;
    });

    // --- KPIs ---
    const totalEmployees = filteredEmployees.length;
    const activeCount = filteredEmployees.filter(e => e.isActive && !e.isDeleted).length;
    const inactiveCount = filteredEmployees.filter(e => !e.isActive || e.isDeleted).length;
    
    const uniqueDepts = new Set();
    filteredEmployees.forEach(e => {
        if (e.department?.name) uniqueDepts.add(e.department.name);
    });
    const deptsCount = uniqueDepts.size;

    const allDeptNames = Array.from(new Set(employees.map(e => e.department?.name).filter(Boolean))).sort();
    const allRoleNames = Array.from(new Set(employees.map(e => e.role?.name).filter(r => r && r.toLowerCase() !== 'client'))).sort();

    // --- Chart 1: Department Distribution (Pie Chart) ---
    const deptMap = {};
    filteredEmployees.forEach(e => {
        const dName = e.department?.name || "Unassigned";
        if (!deptMap[dName]) deptMap[dName] = 0;
        deptMap[dName]++;
    });
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'];
    const pieData = Object.keys(deptMap).map((k, i) => ({ 
        name: k, 
        value: deptMap[k],
        color: colors[i % colors.length]
    })).filter(d => d.value > 0);

    // --- Chart 2: Role Distribution (Bar Chart) ---
    const roleMap = {};
    filteredEmployees.forEach(e => {
        const rName = e.role?.name || "No Role";
        if (!roleMap[rName]) roleMap[rName] = 0;
        roleMap[rName]++;
    });
    const barData = Object.keys(roleMap).sort().map((m) => ({
        role: m,
        count: roleMap[m]
    }));

    // --- Chart 3: Tenure / Experience (Bar Chart) ---
    const tenureMap = {
        "0-1 Year": 0,
        "1-3 Years": 0,
        "3-5 Years": 0,
        "5+ Years": 0
    };
    
    const currentDate = new Date();
    filteredEmployees.forEach(e => {
        if (e.joiningDate) {
            const doj = new Date(e.joiningDate);
            const diffTime = Math.abs(currentDate - doj);
            const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
            
            if (diffYears <= 1) tenureMap["0-1 Year"]++;
            else if (diffYears <= 3) tenureMap["1-3 Years"]++;
            else if (diffYears <= 5) tenureMap["3-5 Years"]++;
            else tenureMap["5+ Years"]++;
        }
    });

    const tenureData = Object.keys(tenureMap).map((k) => ({
        tenure: k,
        count: tenureMap[k]
    }));

    // --- Recent Joiners ---
    const recentJoiners = [...filteredEmployees]
        .filter(e => e.joiningDate)
        .sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate))
        .slice(0, 5);

    const handleExportReport = () => {
        const headers = ["Employee Code", "First Name", "Last Name", "Email", "Phone", "Department", "Role", "Joining Date", "Status"];
        const rows = filteredEmployees.map(e => [
            e.employeeCode || "",
            e.firstName || "",
            e.lastName || "",
            e.email || "",
            e.phone || "",
            e.department?.name || "N/A",
            e.role?.name || "N/A",
            e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : "N/A",
            e.isActive && !e.isDeleted ? "Active" : "Inactive"
        ]);
        exportToCSV([headers, ...rows], `employee_report.csv`);
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen print:bg-white print:p-0 relative">
            <div className="mb-6 print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Advanced Employee Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Workforce distribution, retention metrics, and team rosters</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6 print:border-none print:shadow-none print:p-0">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 print:hidden">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Workforce Filters</h2>
                        <p className="text-sm text-gray-500 mt-1">Refine your analytics view</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} 
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="">All Departments</option>
                            {allDeptNames.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} 
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="">All Roles</option>
                            {allRoleNames.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} 
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="all">All Statuses</option>
                            <option value="active">Active Employees</option>
                            <option value="inactive">Inactive / Past</option>
                        </select>
                        <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium transition shadow-sm">
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Print Header */}
                <div className="hidden print:block mb-8 text-center border-b pb-4">
                    <h1 className="text-3xl font-bold">Employee Analytics Report</h1>
                    <p className="text-gray-500 mt-2">Generated by DigiCoders Workastra Dashboard</p>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-gray-400">Loading workforce data...</div>
                ) : (
                    <>
                        {/* Widgets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-indigo-600 mb-1 tracking-wide print:text-black">Total Employees</p>
                                    <p className="text-3xl font-bold text-indigo-800 print:text-black">{totalEmployees}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-indigo-600 shadow-sm border border-indigo-100 print:hidden"><Users size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-emerald-600 mb-1 tracking-wide print:text-black">Active Team</p>
                                    <p className="text-2xl font-bold text-emerald-800 print:text-black">{activeCount}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-emerald-600 shadow-sm border border-emerald-100 print:hidden"><UserCheck size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-rose-600 mb-1 tracking-wide print:text-black">Inactive / Left</p>
                                    <p className="text-2xl font-bold text-rose-800 print:text-black">{inactiveCount}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-rose-600 shadow-sm border border-rose-100 print:hidden"><UserX size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm print:border-gray-300">
                                <div>
                                    <p className="text-sm font-semibold text-amber-600 mb-1 tracking-wide print:text-black">Departments</p>
                                    <p className="text-2xl font-bold text-amber-800 print:text-black">{deptsCount}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-amber-600 shadow-sm border border-amber-100 print:hidden"><Building2 size={26} /></div>
                            </div>
                        </div>

                        {/* Top Section: Tenure & Recent Joiners */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            
                            {/* Tenure Trend Chart */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm lg:col-span-2">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <Briefcase size={16} className="text-blue-500 print:hidden" /> Employee Tenure (Retention)
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={tenureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="tenure" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                            <RechartsTooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Joiners Widget */}
                            <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-emerald-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <UserCheck size={16} /> Recent Joiners
                                </h3>
                                <div className="space-y-4">
                                    {recentJoiners.length === 0 ? (
                                        <p className="text-sm text-gray-500">No recent joiners.</p>
                                    ) : (
                                        recentJoiners.map((emp, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-100 shadow-sm cursor-pointer hover:bg-emerald-50 transition" onClick={() => setSelectedEmployee(emp)}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {emp.profilePic?.url ? <img src={emp.profilePic.url} alt="Profile" className="w-full h-full rounded-full object-cover"/> : <>{emp.firstName?.[0]}{emp.lastName?.[0]}</>}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{emp.firstName} {emp.lastName}</p>
                                                        <p className="text-[10px] text-gray-500">{new Date(emp.joiningDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mid Section: Pie Chart & Role Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            
                            {/* Departments Pie */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <PieChartIcon size={16} className="text-indigo-500 print:hidden" /> Department Distribution
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

                            {/* Role Trend Chart */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase flex items-center gap-2">
                                    <BarChart2 size={16} className="text-purple-500 print:hidden" /> Role Breakdown
                                </h3>
                                <div className="h-64">
                                    {barData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                                <YAxis type="category" dataKey="role" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} width={100} />
                                                <RechartsTooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Employee Details Table */}
                        <div className="border border-gray-100 rounded-2xl bg-white shadow-sm">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800">Employee Roster</h3>
                                    <p className="text-xs text-gray-500 mt-1">Detailed list of all registered employees.</p>
                                </div>
                                <div className="text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                                    Showing {filteredEmployees.length} 
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-gray-500 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="px-5 py-3">Employee</th>
                                            <th className="px-5 py-3">Department</th>
                                            <th className="px-5 py-3">Role</th>
                                            <th className="px-5 py-3">Joining Date</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3 text-right print:hidden">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredEmployees.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-5 py-8 text-center text-gray-400">No employees found</td>
                                            </tr>
                                        ) : (
                                            filteredEmployees.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                                                {e.profilePic?.url ? (
                                                                    <img src={e.profilePic.url} alt="Profile" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <>{e.firstName?.[0]}{e.lastName?.[0]}</>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800">{e.firstName} {e.lastName}</p>
                                                                <p className="text-[11px] text-gray-400">{e.employeeCode}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">{e.department?.name || "N/A"}</td>
                                                    <td className="px-5 py-3 text-gray-600">{e.role?.name || "N/A"}</td>
                                                    <td className="px-5 py-3 text-gray-600">
                                                        {e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : "N/A"}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        {e.isActive && !e.isDeleted ? (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">Active</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-md">Inactive</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right print:hidden">
                                                        <button 
                                                            onClick={() => setSelectedEmployee(e)}
                                                            className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="View Full Profile"
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

            {/* Interactive Employee Profile Modal */}
            {selectedEmployee && (
                <div 
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden"
                    onClick={() => setSelectedEmployee(null)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
                    >
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <button 
                            onClick={() => setSelectedEmployee(null)} 
                            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 rounded-full transition-colors z-50 cursor-pointer"
                        >
                            <CloseIcon size={20} />
                        </button>
                        
                        <div className="px-6 pt-12 pb-6 relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl overflow-hidden shadow-md mb-4">
                                {selectedEmployee.profilePic?.url ? (
                                    <img src={selectedEmployee.profilePic.url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <>{selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}</>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                            <p className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-1 border border-blue-100">
                                {selectedEmployee.role?.name || "Employee"} • {selectedEmployee.employeeCode}
                            </p>
                        </div>

                        <div className="px-6 pb-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Department</p>
                                    <div className="flex items-center gap-2 text-gray-800 font-medium">
                                        <Building2 size={16} className="text-indigo-500"/>
                                        {selectedEmployee.department?.name || "N/A"}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Joined</p>
                                    <div className="flex items-center gap-2 text-gray-800 font-medium">
                                        <Calendar size={16} className="text-emerald-500"/>
                                        {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : "N/A"}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Mail size={16} className="text-gray-400 shrink-0"/>
                                    <a href={`mailto:${selectedEmployee.email}`} className="hover:text-blue-600 transition truncate">{selectedEmployee.email}</a>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Phone size={16} className="text-gray-400 shrink-0"/>
                                    <a href={`tel:${selectedEmployee.phone}`} className="hover:text-blue-600 transition">{selectedEmployee.phone || "N/A"}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeReport;
