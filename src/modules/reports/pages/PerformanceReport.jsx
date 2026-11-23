import React, { useState, useEffect } from "react";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { toast } from "react-toastify";
import { Users, CheckCircle, Calendar, Target, Filter, RefreshCw, BarChart2, Download, X, Folder, Clock, CheckCircle2, AlertCircle, Briefcase, Eye, Search, Layers } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { getImageUrl } from "../../../utils/imageUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const PerformanceReport = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const permissions = user?.role?.permissions || [];
    
    // Normal users can view their own, admins/super_admins or those with permission view all.
    const canViewAll = isAdmin || permissions.includes("VIEW_ALL_PERFORMANCE");

    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState([]);
    
    // Helpers for dates
    const currentMonth = () => new Date().toISOString().slice(0, 7);
    const todayDate = () => new Date().toISOString().split("T")[0];
    const firstDayOfMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    };

    // Date Filters
    const [dateRange, setDateRange] = useState("this_month");
    const [selectedMonth, setSelectedMonth] = useState(currentMonth());
    const [startDate, setStartDate] = useState(firstDayOfMonth());
    const [endDate, setEndDate] = useState(todayDate());
    
    // Modal state for viewing developer tasks & project details
    const [selectedDevModal, setSelectedDevModal] = useState(null);
    const [taskStatusFilter, setTaskStatusFilter] = useState("all"); // "all", "done", "pending"
    const [taskProjectFilter, setTaskProjectFilter] = useState("all");
    const [taskSearchQuery, setTaskSearchQuery] = useState("");

    // Sync modal with refreshed performanceData if modal is open
    useEffect(() => {
        if (selectedDevModal) {
            const updated = performanceData.find(d => String(d.userId) === String(selectedDevModal.userId));
            if (updated) setSelectedDevModal(updated);
        }
    }, [performanceData]);

    const handleOpenTaskModal = (dev, initialStatus = "all") => {
        setSelectedDevModal(dev);
        setTaskStatusFilter(initialStatus);
        setTaskProjectFilter("all");
        setTaskSearchQuery("");
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "-";
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        } catch {
            return "-";
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "done":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={11} /> Done
                    </span>
                );
            case "in_progress":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        <Clock size={11} /> In Progress
                    </span>
                );
            case "qa":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        QA Review
                    </span>
                );
            case "admin_review":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        Admin Review
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        To Do
                    </span>
                );
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case "urgent":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        Urgent
                    </span>
                );
            case "high":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                        High
                    </span>
                );
            case "medium":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Medium
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        Low
                    </span>
                );
        }
    };
    
    // History
    const [historyData, setHistoryData] = useState([]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            let params = {};
            
            if (dateRange === "specific_month" && selectedMonth) {
                params = { month: selectedMonth };
            } else if (dateRange === "custom" && startDate && endDate) {
                params = { startDate, endDate };
            } else if (dateRange === "today") {
                const today = todayDate();
                params = { startDate: today, endDate: today };
            } else if (dateRange === "this_week") {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const start = new Date(now.setDate(diff));
                params = { startDate: start.toISOString().split("T")[0], endDate: todayDate() };
            } else if (dateRange === "this_month") {
                params = { month: currentMonth() };
            } else if (dateRange === "last_month") {
                const now = new Date();
                const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthStr = `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2, "0")}`;
                params = { month: lastMonthStr };
            } else if (dateRange === "this_year") {
                const year = new Date().getFullYear();
                params = { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
            } else if (dateRange === "all_time") {
                params = { allTime: "true" };
            }

            const res = await api.get(ENDPOINTS.PERFORMANCE.GET, { params });
            if (res.data.success) {
                setPerformanceData(res.data.data);
            } else {
                toast.error(res.data.message || "Failed to load report");
            }
            
            // Fetch History (Only relevant for individual trend)
            const histRes = await api.get("/api/performance/history");
            if(histRes.data.success) {
                // Reverse the array to show chronological order (oldest to newest)
                setHistoryData(histRes.data.data.reverse());
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Error fetching performance report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [dateRange, selectedMonth, startDate, endDate]); // eslint-disable-line

    const exportToCSV = () => {
        if (!performanceData || performanceData.length === 0) {
            toast.info("No data to export");
            return;
        }
        
        const headers = ["Developer Name", "Tasks Assigned", "Tasks Completed", "Task Completion %", "Days Present", "Days Late", "Attendance %", "Overall Score"];
        const rows = performanceData.map(dev => [
            dev.name,
            dev.tasksAssigned,
            dev.tasksCompleted,
            `${dev.taskCompletionRate}%`,
            dev.daysPresent,
            dev.daysLate,
            `${dev.attendanceRate}%`,
            dev.performanceScore
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Performance_Report_${dateRange === "specific_month" ? selectedMonth : dateRange === "custom" ? `${startDate}_to_${endDate}` : dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-3 sm:p-6 bg-gray-50 min-h-screen max-w-full overflow-x-hidden">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{canViewAll ? "Team Performance Report" : "My Performance"}</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track task completion, attendance, and overall scores</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                    {/* Specific Month Selector (Outside Dropdown) */}
                    <div className={`flex items-center justify-between sm:justify-start gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-2xs transition w-full sm:w-auto ${
                        dateRange === "specific_month" ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
                    }`}>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className={dateRange === "specific_month" ? "text-indigo-600" : "text-gray-400"} />
                            <span className="text-xs font-semibold text-gray-500">Month:</span>
                        </div>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onFocus={() => setDateRange("specific_month")}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setDateRange("specific_month");
                            }}
                            className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer"
                            title="Select specific month"
                        />
                    </div>

                    {/* Date Range: From - To (Outside Dropdown) */}
                    <div className={`flex items-center justify-between sm:justify-start gap-2 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-2xs transition w-full sm:w-auto ${
                        dateRange === "custom" ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
                    }`}>
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-500">From:</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onFocus={() => setDateRange("custom")}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDateRange("custom");
                                }}
                                className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer max-w-[110px] sm:max-w-none"
                            />
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] sm:text-xs text-gray-400 font-medium">To:</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onFocus={() => setDateRange("custom")}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDateRange("custom");
                                }}
                                min={startDate || undefined}
                                className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer max-w-[110px] sm:max-w-none"
                            />
                        </div>
                    </div>

                    {/* Quick Presets Dropdown (Only Presets) */}
                    <div className={`flex items-center justify-between sm:justify-start gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-2xs transition w-full sm:w-auto ${
                        dateRange !== "specific_month" && dateRange !== "custom" ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
                    }`}>
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-gray-500" />
                            <span className="text-xs font-semibold text-gray-500 sm:hidden">Preset:</span>
                        </div>
                        <select 
                            value={dateRange === "specific_month" || dateRange === "custom" ? "" : dateRange} 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) setDateRange(val);
                            }}
                            className="text-xs font-medium text-gray-700 focus:outline-none bg-transparent cursor-pointer w-full sm:w-auto"
                        >
                            {(dateRange === "specific_month" || dateRange === "custom") && (
                                <option value="" disabled hidden>Quick Presets</option>
                            )}
                            <option value="this_month">This Month</option>
                            <option value="today">Daily (Today)</option>
                            <option value="this_week">Weekly (This Week)</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_year">Yearly (This Year)</option>
                            <option value="all_time">All Time</option>
                        </select>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Reset Button */}
                        {(dateRange === "specific_month" || dateRange === "custom") && (
                            <button
                                onClick={() => {
                                    setDateRange("this_month");
                                    setSelectedMonth(currentMonth());
                                    setStartDate(firstDayOfMonth());
                                    setEndDate(todayDate());
                                }}
                                className="px-3 py-1.5 text-xs text-gray-600 hover:text-indigo-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs cursor-pointer font-medium active:scale-95"
                                title="Reset to current month"
                            >
                                Reset
                            </button>
                        )}

                        <button 
                            onClick={fetchReport} 
                            className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>
                        
                        {canViewAll && (
                            <button 
                                onClick={exportToCSV}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                            >
                                <Download size={14} />
                                <span>Export CSV</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Performance Score Summary (For Individual) */}
                    {!canViewAll && performanceData.length > 0 && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-col items-center">
                             <h2 className="text-lg font-semibold text-gray-800 mb-2">Overall Score</h2>
                             <div className="relative flex items-center justify-center w-40 h-40">
                                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                     <path
                                         className="text-gray-200"
                                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                         fill="none"
                                         stroke="currentColor"
                                         strokeWidth="3.8"
                                     />
                                     <path
                                         className={performanceData[0].performanceScore >= 80 ? "text-green-500" : performanceData[0].performanceScore >= 50 ? "text-yellow-500" : "text-red-500"}
                                         strokeDasharray={`${performanceData[0].performanceScore}, 100`}
                                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                         fill="none"
                                         stroke="currentColor"
                                         strokeWidth="3.8"
                                     />
                                 </svg>
                                 <div className="absolute text-3xl font-bold text-gray-800">{performanceData[0].performanceScore}</div>
                             </div>
                             <p className="text-sm text-gray-500 mt-2">Target Score: 85+</p>
                        </div>
                    )}
                    
                    {/* Historical Trend Graph */}
                    {!canViewAll && historyData.length > 0 && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                             <h2 className="text-lg font-semibold text-gray-800 mb-4">6-Month Trend</h2>
                             <div className="w-full h-64">
                                 <ResponsiveContainer width="100%" height="100%">
                                     <LineChart data={historyData}>
                                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                         <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                                         <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} />
                                         <RechartsTooltip 
                                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                             formatter={(value) => [`${value} Pts`, "Score"]}
                                         />
                                         <Line 
                                             type="monotone" 
                                             dataKey="score" 
                                             stroke="#4f46e5" 
                                             strokeWidth={3}
                                             dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#4f46e5" }}
                                             activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                                         />
                                     </LineChart>
                                 </ResponsiveContainer>
                             </div>
                        </div>
                    )}

                    {/* Performance Table */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">
                                {canViewAll ? "Leaderboard" : "My Detailed Metrics"}
                            </h2>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                {performanceData.length} {performanceData.length === 1 ? "Employee" : "Employees"}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[700px]">
                                <thead className="bg-gray-50/75 text-gray-500 text-xs uppercase font-semibold">
                                    <tr>
                                        {canViewAll && <th className="px-4 sm:px-6 py-3.5 whitespace-nowrap">Developer</th>}
                                        <th className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">Tasks Assigned</th>
                                        <th className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">Completed</th>
                                        <th className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">Completion %</th>
                                        <th className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">Attendance %</th>
                                        <th className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">Late Days</th>
                                        <th className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {performanceData.length === 0 ? (
                                        <tr>
                                            <td colSpan={canViewAll ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                                                No performance data found for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        performanceData.map((dev, index) => {
                                            
                                            // Badges for top 3 (only show if viewing all)
                                            let badge = null;
                                            if (canViewAll && dev.performanceScore > 0) {
                                                if (index === 0) badge = "🥇";
                                                else if (index === 1) badge = "🥈";
                                                else if (index === 2) badge = "🥉";
                                            }

                                            return (
                                                <tr key={dev.userId} className="hover:bg-gray-50 transition group">
                                                    {canViewAll && (
                                                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-gray-800 font-medium">
                                                            <div className="flex items-center gap-3">
                                                                {dev.profilePic ? (
                                                                    <>
                                                                        <img 
                                                                            src={getImageUrl(dev.profilePic?.url || dev.profilePic)} 
                                                                            alt={dev.name} 
                                                                            className="w-8 h-8 rounded-full object-cover border" 
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.style.display = "none";
                                                                                if (e.target.nextElementSibling) {
                                                                                    e.target.nextElementSibling.style.display = "flex";
                                                                                }
                                                                            }}
                                                                        />
                                                                        <div 
                                                                            style={{ display: "none" }}
                                                                            className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200 text-xs shrink-0"
                                                                        >
                                                                            {dev.name?.charAt(0)?.toUpperCase() || "U"}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200 text-xs shrink-0">
                                                                        {dev.name?.charAt(0)?.toUpperCase() || "U"}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenTaskModal(dev, "all")}
                                                                    className="flex items-center gap-1.5 text-left font-medium text-gray-900 hover:text-indigo-600 transition cursor-pointer"
                                                                    title="Click to view developer tasks & projects"
                                                                >
                                                                    <span>{dev.name}</span>
                                                                    {badge && <span className="text-lg leading-none">{badge}</span>}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                                                        {dev.tasksAssigned > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenTaskModal(dev, "all")}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 shadow-xs transition group cursor-pointer"
                                                                title="Click to view assigned tasks and project details"
                                                            >
                                                                <span>{dev.tasksAssigned}</span>
                                                                <Eye size={12} className="text-blue-500 opacity-70 group-hover:opacity-100" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 font-medium">0</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                                                        {dev.tasksCompleted > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenTaskModal(dev, "done")}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 shadow-xs transition group cursor-pointer"
                                                                title="Click to view completed tasks"
                                                            >
                                                                <span>{dev.tasksCompleted}</span>
                                                                <CheckCircle2 size={12} className="text-emerald-600 opacity-70 group-hover:opacity-100" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 font-medium">0</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-gray-600 w-8">{dev.taskCompletionRate}%</span>
                                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${dev.taskCompletionRate >= 80 ? 'bg-green-500' : dev.taskCompletionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${dev.taskCompletionRate}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                                                        <span className={dev.attendanceRate >= 80 ? 'text-green-600' : 'text-red-600'}>
                                                            {dev.attendanceRate}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-3.5 text-center text-red-500 whitespace-nowrap">{dev.daysLate}</td>
                                                    <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                                                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dev.performanceScore >= 80 ? 'bg-green-100 text-green-800' : dev.performanceScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                             {dev.performanceScore} Pts
                                                         </span>
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

            {/* Task & Project Breakdown Modal */}
            {selectedDevModal && (() => {
                const allDevTasks = selectedDevModal.tasks || [];
                
                // Group tasks by project
                const projectStats = allDevTasks.reduce((acc, t) => {
                    const pName = t.projectName || "General / No Project";
                    if (!acc[pName]) acc[pName] = { total: 0, done: 0 };
                    acc[pName].total += 1;
                    if (t.status === "done") acc[pName].done += 1;
                    return acc;
                }, {});
                const projectList = Object.entries(projectStats).map(([name, stats]) => ({
                    name,
                    total: stats.total,
                    done: stats.done
                }));

                // Filter tasks based on filters and search
                const filteredTasks = allDevTasks.filter(t => {
                    if (taskStatusFilter === "done" && t.status !== "done") return false;
                    if (taskStatusFilter === "pending" && t.status === "done") return false;

                    if (taskProjectFilter !== "all" && (t.projectName || "General / No Project") !== taskProjectFilter) {
                        return false;
                    }

                    if (taskSearchQuery.trim()) {
                        const q = taskSearchQuery.toLowerCase();
                        const matchTitle = t.title?.toLowerCase().includes(q);
                        const matchProject = t.projectName?.toLowerCase().includes(q);
                        const matchDesc = t.description?.toLowerCase().includes(q);
                        if (!matchTitle && !matchProject && !matchDesc) return false;
                    }
                    return true;
                });

                const totalCount = allDevTasks.length;
                const completedCount = allDevTasks.filter(t => t.status === "done").length;
                const pendingCount = totalCount - completedCount;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        {/* Backdrop */}
                        <div className="absolute inset-0" onClick={() => setSelectedDevModal(null)}></div>

                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 z-10 animate-in zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                    {selectedDevModal.profilePic ? (
                                        <img 
                                            src={getImageUrl(selectedDevModal.profilePic?.url || selectedDevModal.profilePic)} 
                                            alt={selectedDevModal.name} 
                                            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-indigo-400 shrink-0" 
                                        />
                                    ) : (
                                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm sm:text-base ring-2 ring-indigo-400 shrink-0">
                                            {selectedDevModal.name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedDevModal.name}</h3>
                                            <span className="text-[11px] sm:text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 font-semibold shrink-0">
                                                Score: {selectedDevModal.performanceScore || 0} Pts
                                            </span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-indigo-200/80 mt-0.5 flex items-center gap-1.5 truncate">
                                            <span>Breakdown</span>
                                            <span>•</span>
                                            <span className="truncate">
                                                {dateRange === "specific_month" ? `Month: ${selectedMonth}` :
                                                 dateRange === "custom" ? `${startDate} to ${endDate}` :
                                                 dateRange.replace("_", " ").toUpperCase()}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedDevModal(null)}
                                    className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
                                    title="Close Modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* KPI Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 bg-gray-50 border-b border-gray-200 shrink-0">
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                                    <span className="text-[11px] sm:text-xs font-medium text-gray-500">Total Tasks</span>
                                    <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">{totalCount}</div>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                                    <span className="text-[11px] sm:text-xs font-medium text-emerald-600">Completed</span>
                                    <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5">{completedCount}</div>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs">
                                    <span className="text-[11px] sm:text-xs font-medium text-amber-600">Pending / Review</span>
                                    <div className="text-lg sm:text-xl font-bold text-amber-600 mt-0.5">{pendingCount}</div>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                                    <span className="text-[11px] sm:text-xs font-medium text-indigo-600">Projects</span>
                                    <div className="text-lg sm:text-xl font-bold text-indigo-600 mt-0.5">{projectList.length}</div>
                                </div>
                            </div>

                            {/* Projects Breakdown Pills */}
                            {projectList.length > 0 && (
                                <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 bg-white border-b border-gray-100 shrink-0 overflow-x-auto scrollbar-none">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <Briefcase size={13} className="text-indigo-600" /> Projects Contributed ({projectList.length})
                                        </span>
                                        {taskProjectFilter !== "all" && (
                                            <button 
                                                onClick={() => setTaskProjectFilter("all")}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                                            >
                                                Clear project filter
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <button
                                            onClick={() => setTaskProjectFilter("all")}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                                taskProjectFilter === "all"
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                        >
                                            <span>All Projects</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                taskProjectFilter === "all" ? "bg-indigo-700 text-white" : "bg-gray-200 text-gray-600"
                                            }`}>
                                                {totalCount}
                                            </span>
                                        </button>
                                        {projectList.map(proj => (
                                            <button
                                                key={proj.name}
                                                onClick={() => setTaskProjectFilter(taskProjectFilter === proj.name ? "all" : proj.name)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                                                    taskProjectFilter === proj.name
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <Folder size={12} className={taskProjectFilter === proj.name ? "text-white" : "text-indigo-500"} />
                                                <span>{proj.name}</span>
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                    taskProjectFilter === proj.name ? "bg-indigo-700 text-white" : "bg-indigo-50 text-indigo-700 font-semibold"
                                                }`}>
                                                    {proj.total}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Filter and Search Bar */}
                            <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                                {/* Status Tabs */}
                                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg w-full sm:w-auto">
                                    <button
                                        onClick={() => setTaskStatusFilter("all")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer flex-1 sm:flex-initial ${
                                            taskStatusFilter === "all" ? "bg-white text-gray-900 shadow-xs font-semibold" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        All ({totalCount})
                                    </button>
                                    <button
                                        onClick={() => setTaskStatusFilter("done")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer flex-1 sm:flex-initial ${
                                            taskStatusFilter === "done" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        Completed ({completedCount})
                                    </button>
                                    <button
                                        onClick={() => setTaskStatusFilter("pending")}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer flex-1 sm:flex-initial ${
                                            taskStatusFilter === "pending" ? "bg-white text-amber-700 shadow-xs font-semibold" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        Pending ({pendingCount})
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="relative w-full sm:w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search tasks or projects..."
                                        value={taskSearchQuery}
                                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                                    />
                                    {taskSearchQuery && (
                                        <button
                                            onClick={() => setTaskSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1 cursor-pointer font-bold"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tasks Table Body */}
                            <div className="flex-1 overflow-y-auto overflow-x-auto">
                                {filteredTasks.length === 0 ? (
                                    <div className="py-16 text-center text-gray-400 flex flex-col items-center">
                                        <Layers size={40} className="text-gray-300 mb-2 stroke-[1.5]" />
                                        <p className="text-sm font-medium text-gray-600">No tasks found</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {allDevTasks.length === 0 
                                                ? "No tasks have been assigned to this developer in this period." 
                                                : "Try adjusting your search or filters."}
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full text-xs text-left min-w-[580px]">
                                        <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider sticky top-0 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Task Title</th>
                                                <th className="px-4 sm:px-5 py-3 whitespace-nowrap">Project</th>
                                                <th className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">Priority</th>
                                                <th className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">Status</th>
                                                <th className="px-4 sm:px-5 py-3 text-right whitespace-nowrap">Due Date</th>
                                                <th className="px-4 sm:px-5 py-3 text-right whitespace-nowrap">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredTasks.map((task) => (
                                                <tr key={task._id} className="hover:bg-indigo-50/30 transition">
                                                    <td className="px-4 sm:px-5 py-3 font-medium text-gray-900 max-w-xs">
                                                        <div className="font-semibold text-gray-900 leading-snug">{task.title}</div>
                                                        {task.description && (
                                                            <div className="text-[11px] text-gray-400 truncate max-w-xs mt-0.5">
                                                                {task.description}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                            <Folder size={12} className="text-indigo-500" />
                                                            <span>{task.projectName || "General"}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                                                        {getPriorityBadge(task.priority)}
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                                                        {getStatusBadge(task.status)}
                                                    </td>
                                                    <td className="px-4 sm:px-5 py-3 text-right whitespace-nowrap text-gray-600">
                                                        {formatDate(task.dueDate)}
                                                    </td>
                                                    <td className="px-4 sm:px-5 py-3 text-right whitespace-nowrap text-gray-400">
                                                        {formatDate(task.createdAt)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                                <span className="text-xs text-gray-500">
                                    Showing <span className="font-semibold text-gray-800">{filteredTasks.length}</span> of <span className="font-semibold text-gray-800">{allDevTasks.length}</span> tasks
                                </span>
                                <button
                                    onClick={() => setSelectedDevModal(null)}
                                    className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition shadow-xs cursor-pointer active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default PerformanceReport;
