import React, { useState, useEffect } from "react";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { toast } from "react-toastify";
import { Users, CheckCircle, Calendar, Target, Filter, RefreshCw, BarChart2, Download } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
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
    
    // Date Filters
    const [dateRange, setDateRange] = useState("this_month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    // History
    const [historyData, setHistoryData] = useState([]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            let params = {};
            
            if (dateRange === "custom" && startDate && endDate) {
                params = { startDate, endDate };
            } else if (dateRange === "today") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                params = { startDate: start.toISOString(), endDate: end.toISOString() };
            } else if (dateRange === "this_week") {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const start = new Date(now.setDate(diff));
                start.setHours(0, 0, 0, 0);
                params = { startDate: start.toISOString(), endDate: new Date().toISOString() };
            } else if (dateRange === "this_month") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                params = { startDate: start.toISOString(), endDate: now.toISOString() };
            } else if (dateRange === "last_month") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                params = { startDate: start.toISOString(), endDate: end.toISOString() };
            } else if (dateRange === "this_year") {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1);
                params = { startDate: start.toISOString(), endDate: now.toISOString() };
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
    }, [dateRange, startDate, endDate]); // eslint-disable-line

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
        link.setAttribute("download", `Performance_Report_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{canViewAll ? "Team Performance Report" : "My Performance"}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track task completion, attendance, and overall scores</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                        <Filter size={15} className="text-gray-500" />
                        <select 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value)}
                            className="text-sm focus:outline-none bg-transparent"
                        >
                            <option value="today">Daily (Today)</option>
                            <option value="this_week">Weekly (This Week)</option>
                            <option value="this_month">Monthly (This Month)</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_year">Yearly (This Year)</option>
                            <option value="all_time">All Time</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {dateRange === "custom" && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500">to</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <button 
                        onClick={fetchReport} 
                        className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg transition"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    
                    {canViewAll && (
                        <button 
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    )}
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
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800">
                                {canViewAll ? "Leaderboard" : "My Detailed Metrics"}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                    <tr>
                                        {canViewAll && <th className="px-6 py-4">Developer</th>}
                                        <th className="px-6 py-4 text-center">Tasks Assigned</th>
                                        <th className="px-6 py-4 text-center">Completed</th>
                                        <th className="px-6 py-4 text-center">Completion %</th>
                                        <th className="px-6 py-4 text-center">Attendance %</th>
                                        <th className="px-6 py-4 text-center">Late Days</th>
                                        <th className="px-6 py-4 text-right">Score</th>
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
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                                                            <div className="flex items-center gap-3">
                                                                {dev.profilePic ? (
                                                                    <img src={dev.profilePic} alt={dev.name} className="w-8 h-8 rounded-full object-cover border" />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200">
                                                                        {dev.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <span className="flex items-center gap-1.5">
                                                                    {dev.name}
                                                                    {badge && <span className="text-lg leading-none">{badge}</span>}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-center text-gray-600">{dev.tasksAssigned}</td>
                                                    <td className="px-6 py-4 text-center font-medium text-green-600">{dev.tasksCompleted}</td>
                                                    <td className="px-6 py-4 text-center">
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
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={dev.attendanceRate >= 80 ? 'text-green-600' : 'text-red-600'}>
                                                            {dev.attendanceRate}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-red-500">{dev.daysLate}</td>
                                                    <td className="px-6 py-4 text-right">
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
        </div>
    );
};

export default PerformanceReport;
