import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { getCompanyAttendance, getTeamAttendance } from "../../attendance/services/attendanceService";
import { BarChart2, Users, CalendarDays, Wallet, Download, PieChart as PieChartIcon } from "lucide-react";

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

const fmtHours = (h) => {
    if (!h && h !== 0) return "—";
    const sign = h < 0 ? "-" : "";
    const absH = Math.abs(h);
    const totalMins = Math.round(absH * 60);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    if (hh === 0) return `${sign}${mm}m`;
    if (mm === 0) return `${sign}${hh}h`;
    return `${sign}${hh}h ${mm}m`;
};

const AttendanceReport = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin || permissions.includes("VIEW_ALL_ATTENDANCES");
    
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterType, setFilterType] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [companyRecords, setCompanyRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);

    const loadCompanyRecords = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterType === 'month') {
                params.month = month;
            } else {
                if (startDate && endDate) {
                    params.startDate = startDate;
                    params.endDate = endDate;
                } else {
                    params.month = month; // fallback
                }
            }
            const d = isAdmin
                ? await getCompanyAttendance(params)
                : await getTeamAttendance(params);
            setCompanyRecords(d.records || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, month, filterType, startDate, endDate]);

    useEffect(() => {
        loadCompanyRecords();
    }, [loadCompanyRecords]);

    const lateRecs  = companyRecords.filter(r => r.status === "late");
    const earlyRecs = companyRecords.filter(r => r.status === "early-leave");
    const absentRecs= companyRecords.filter(r => r.status === "absent");
    const presentRecs = companyRecords.filter(r => r.status === "present" || r.status === "regularized");
    const halfDayRecs = companyRecords.filter(r => r.status === "half-day");

    const pieData = [
        { name: 'Present', value: presentRecs.length, color: '#10B981' }, // emerald-500
        { name: 'Late', value: lateRecs.length, color: '#F59E0B' }, // amber-500
        { name: 'Half Day', value: halfDayRecs.length, color: '#3B82F6' }, // blue-500 (changed from orange)
        { name: 'Early Leave', value: earlyRecs.length, color: '#8B5CF6' }, // violet-500
        { name: 'Absent', value: absentRecs.length, color: '#EF4444' } // red-500
    ].filter(d => d.value > 0);
    
    const byEmp = {};
    companyRecords.forEach(r => {
        const id = r.userId?._id; if (!id) return;
        if (!byEmp[id]) byEmp[id] = { user: r.userId, records: [], present:0, late:0, half:0, early:0, absent:0, total:0, totalHours: 0 };
        byEmp[id].total++;
        byEmp[id].totalHours += (r.workHours || 0);
        byEmp[id].records.push(r);
        if (r.status==="present" || r.status==="regularized") byEmp[id].present++;
        if (r.status==="late") byEmp[id].late++;
        if (r.status==="half-day") byEmp[id].half++;
        if (r.status==="early-leave") byEmp[id].early++;
        if (r.status==="absent") byEmp[id].absent++;
    });
    const empStats = Object.values(byEmp).map(e => {
        const attended = e.present + e.half + e.late + e.early;
        e.attendancePercent = e.total > 0 ? Math.round((attended / e.total) * 100) : 0;
        return e;
    }).sort((a,b)=>(b.late+b.early+b.absent)-(a.late+a.early+a.absent));
    
    const handleExportReport = () => {
        const headers = ["Employee","Code","Present","Half Day","Late Days","Early Leave","Absent Days","Total Records","Total Hours"];
        const rows = empStats.map(e => [`${e.user?.firstName} ${e.user?.lastName}`,e.user?.employeeCode||"",e.present,e.half,e.late,e.early,e.absent,e.total,fmtHours(e.totalHours)]);
        exportToCSV([headers,...rows],`attendance_report_${month}.csv`);
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
                <p className="text-sm text-gray-500 mt-1">Detailed monthly analytics for employee attendance</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Monthly Attendance Report</h2>
                        <p className="text-sm text-gray-500 mt-1">Overview of employee attendance</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="month">By Month</option>
                            <option value="custom">Date Range</option>
                        </select>

                        {filterType === 'month' ? (
                            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                <span className="text-gray-400">to</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                            </div>
                        )}
                        <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium transition shadow-sm">
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-gray-400">Loading records...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-yellow-600 mb-1 tracking-wide">Late Arrivals</p>
                                    <p className="text-3xl font-bold text-yellow-800">{lateRecs.length}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-yellow-600 shadow-sm border border-yellow-100"><CalendarDays size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-purple-600 mb-1 tracking-wide">Early Departures</p>
                                    <p className="text-3xl font-bold text-purple-800">{earlyRecs.length}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-purple-600 shadow-sm border border-purple-100"><CalendarDays size={26} /></div>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition duration-300">
                                <div>
                                    <p className="text-sm font-semibold text-red-600 mb-1 tracking-wide">Total Absences</p>
                                    <p className="text-3xl font-bold text-red-800">{absentRecs.length}</p>
                                </div>
                                <div className="p-3.5 bg-white/60 backdrop-blur-sm rounded-full text-red-600 shadow-sm border border-red-100"><CalendarDays size={26} /></div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Pie Chart */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
                                <h3 className="text-sm font-bold text-slate-800 mb-6 tracking-wide uppercase flex items-center gap-2">
                                    <PieChartIcon size={16} className="text-blue-500" />
                                    Attendance Distribution
                                </h3>
                                <div className="h-64">
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={65}
                                                    outerRadius={95}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                    cornerRadius={6}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                    itemStyle={{ fontWeight: '600' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available to chart</div>
                                    )}
                                </div>
                            </div>

                            {/* Bar Chart (Top Absentees/Late) */}
                            <div className="border border-gray-100 bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 opacity-50"></div>
                                <h3 className="text-sm font-bold text-slate-800 mb-6 tracking-wide uppercase flex items-center gap-2">
                                    <BarChart2 size={16} className="text-amber-500" />
                                    Top Irregularities (Late + Absent)
                                </h3>
                                <div className="h-64">
                                    {empStats.filter(e => e.late > 0 || e.absent > 0).length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={empStats.filter(e => e.late > 0 || e.absent > 0).slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="user.firstName" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}/>
                                                <Bar dataKey="late" name="Late Days" stackId="a" fill="#F59E0B" radius={[0, 0, 4, 4]} barSize={40} />
                                                <Bar dataKey="absent" name="Absent Days" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No irregularities found</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                            <th className="px-5 py-4 text-left font-semibold">Employee</th>
                                            <th className="px-5 py-4 text-left font-semibold">Present</th>
                                            <th className="px-5 py-4 text-left font-semibold">Half Day</th>
                                            <th className="px-5 py-4 text-left font-semibold">Late</th>
                                            <th className="px-5 py-4 text-left font-semibold">Early Leave</th>
                                            <th className="px-5 py-4 text-left font-semibold">Absent</th>
                                            <th className="px-5 py-4 text-left font-semibold">Total Days</th>
                                            <th className="px-5 py-4 text-left font-semibold">Total Hours</th>
                                            <th className="px-5 py-4 text-left font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {empStats.map((e, idx) => (
                                            <tr key={idx} className={`border-t border-gray-100 transition cursor-pointer ${e.attendancePercent < 75 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50/50'}`} onClick={() => setSelectedEmp(e)}>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                            {e.user?.firstName?.[0]}{e.user?.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="font-semibold text-gray-800">{e.user?.firstName} {e.user?.lastName}</p>
                                                                <span title={`Attendance: ${e.attendancePercent}%`} className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                                    e.attendancePercent >= 90 ? 'text-emerald-700 bg-emerald-100' : 
                                                                    e.attendancePercent >= 75 ? 'text-amber-700 bg-amber-100' : 
                                                                    'text-red-700 bg-red-100'
                                                                }`}>
                                                                    {e.attendancePercent}%
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-400">{e.user?.employeeCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{e.present}</span></td>
                                                <td className="px-5 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{e.half}</span></td>
                                                <td className="px-5 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{e.late}</span></td>
                                                <td className="px-5 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">{e.early}</span></td>
                                                <td className="px-5 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{e.absent}</span></td>
                                                <td className="px-5 py-4 font-medium text-gray-600">{e.total}</td>
                                                <td className="px-5 py-4 font-bold text-gray-900">{fmtHours(e.totalHours)}</td>
                                                <td className="px-5 py-4">
                                                    <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition" onClick={(ev) => { ev.stopPropagation(); setSelectedEmp(e); }}>View</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {empStats.length === 0 && (
                                            <tr><td colSpan="9" className="px-5 py-8 text-center text-gray-500">No attendance data found for {month}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Employee Daily Detail Modal */}
            {selectedEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedEmp(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{selectedEmp.user?.firstName} {selectedEmp.user?.lastName} - Daily Attendance</h2>
                                <p className="text-sm text-gray-500">{month}</p>
                            </div>
                            <button onClick={() => setSelectedEmp(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                        <tr>
                                            <th className="px-5 py-3 text-left font-semibold">Date</th>
                                            <th className="px-5 py-3 text-left font-semibold">Status</th>
                                            <th className="px-5 py-3 text-left font-semibold">Check In</th>
                                            <th className="px-5 py-3 text-left font-semibold">Check Out</th>
                                            <th className="px-5 py-3 text-left font-semibold">Work Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...selectedEmp.records].sort((a,b) => new Date(a.date) - new Date(b.date)).map((r, i) => (
                                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                                                <td className="px-5 py-3 font-medium text-gray-800">{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                                                        ${r.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 
                                                          r.status === 'late' ? 'bg-amber-100 text-amber-800' : 
                                                          r.status === 'half-day' ? 'bg-blue-100 text-blue-800' :
                                                          r.status === 'early-leave' ? 'bg-violet-100 text-violet-800' :
                                                          'bg-red-100 text-red-800'}`}>
                                                        {r.status.replace('-', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</td>
                                                <td className="px-5 py-3 text-gray-600">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</td>
                                                <td className="px-5 py-3 font-semibold text-gray-800">{fmtHours(r.workHours)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;
