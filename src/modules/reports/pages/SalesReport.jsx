import React, { useState, useEffect } from "react";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { toast } from "react-toastify";
import { Users, CheckCircle, Calendar, DollarSign, Filter, RefreshCw, BarChart2, Download } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SalesReport = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const permissions = user?.role?.permissions || [];
    const canView = isAdmin || permissions.includes("VIEW_SALES_REPORTS");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ summary: {}, bdePerformance: [] });
    
    // Date Filters
    const [dateRange, setDateRange] = useState("this_month"); // this_month, last_month, all_time, custom
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const fetchReport = async () => {
        try {
            setLoading(true);
            let params = {};
            
            if (dateRange === "custom" && startDate && endDate) {
                params = { startDate, endDate };
            } else if (dateRange === "this_month") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                params = { startDate: start.toISOString(), endDate: now.toISOString() };
            } else if (dateRange === "last_month") {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                params = { startDate: start.toISOString(), endDate: end.toISOString() };
            }

            const res = await api.get(ENDPOINTS.REPORTS.SALES, { params });
            if (res.data.success) {
                setData(res.data);
            } else {
                toast.error(res.data.message || "API returned success: false");
                console.error("API Error Response:", res.data);
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
    }, [dateRange, startDate, endDate, canView]); // eslint-disable-line

    if (!canView) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
                    <p className="text-gray-500 mt-2">You don't have permission to view sales reports.</p>
                </div>
            </div>
        );
    }

    const { summary, bdePerformance } = data;

    const exportToCSV = () => {
        if (!bdePerformance || bdePerformance.length === 0) {
            toast.info("No data to export");
            return;
        }
        
        const headers = ["BDE Name", "Leads Created", "Converted", "Conversion %", "Meetings Done", "Revenue Generated (INR)"];
        const rows = bdePerformance.map(bde => {
            const conversionRate = bde.leadsCreated > 0 ? Math.round((bde.leadsConverted / bde.leadsCreated) * 100) : 0;
            return [
                bde.name,
                bde.leadsCreated,
                bde.leadsConverted,
                `${conversionRate}%`,
                bde.meetingsDone,
                bde.revenue
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(e => e.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Sales_Report_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track BDE performance, conversions, and revenue</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                        <Filter size={15} className="text-gray-500" />
                        <select 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value)}
                            className="text-sm focus:outline-none bg-transparent"
                        >
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
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
                        
                        <button 
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalLeads || 0}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Converted Leads</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalConversions || 0}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Meetings Completed</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalMeetings || 0}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    ₹{(summary.totalRevenue || 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    {bdePerformance.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* Revenue Bar Chart */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">BDE Revenue Comparison</h2>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bdePerformance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                                            <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                            <RechartsTooltip 
                                                cursor={{fill: '#f9fafb'}}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="revenue" name="Revenue (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Conversions Pie Chart */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">Overall Funnel</h2>
                                <div className="h-72 flex flex-col items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Unconverted Leads', value: summary.totalLeads - summary.totalConversions },
                                                    { name: 'Converted Leads', value: summary.totalConversions }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#f3f4f6" />
                                                <Cell fill="#10b981" />
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300"></div>
                                            <span className="text-xs text-gray-600">Pending</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className="text-xs text-gray-600">Converted</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Performance Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800">BDE Performance</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">BDE Name</th>
                                        <th className="px-6 py-4 text-center">Leads Created</th>
                                        <th className="px-6 py-4 text-center">Converted</th>
                                        <th className="px-6 py-4 text-center">Conversion %</th>
                                        <th className="px-6 py-4 text-center">Meetings Done</th>
                                        <th className="px-6 py-4 text-right">Revenue Generated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {bdePerformance.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                No performance data found for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        bdePerformance.map((bde, index) => {
                                            const conversionRate = bde.leadsCreated > 0 
                                                ? Math.round((bde.leadsConverted / bde.leadsCreated) * 100) 
                                                : 0;

                                            // Determine badge
                                            let badge = null;
                                            if (bde.revenue > 0) {
                                                if (index === 0) badge = "🥇";
                                                else if (index === 1) badge = "🥈";
                                                else if (index === 2) badge = "🥉";
                                            }

                                            return (
                                                <tr key={bde.userId} className="hover:bg-gray-50 transition group">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                                                        <div className="flex items-center gap-3">
                                                            {bde.profilePic ? (
                                                                <img src={bde.profilePic} alt={bde.name} className="w-8 h-8 rounded-full object-cover border" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200">
                                                                    {bde.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="flex items-center gap-1.5">
                                                                    {bde.name}
                                                                    {badge && <span className="text-lg leading-none" title={`Rank #${index + 1}`}>{badge}</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-gray-600">{bde.leadsCreated}</td>
                                                    <td className="px-6 py-4 text-center text-gray-600 font-medium text-green-600">
                                                        {bde.leadsConverted}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-gray-600">{conversionRate}%</span>
                                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-blue-500 rounded-full"
                                                                    style={{ width: `${conversionRate}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-gray-600">{bde.meetingsDone}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                        ₹{bde.revenue.toLocaleString()}
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
