import React, { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useStore } from "../../../context/StoreContext";
import { getCompanyAttendance, getTeamAttendance } from "../../attendance/services/attendanceService";
import { BarChart2, Users, CalendarDays, Wallet, Download, PieChart as PieChartIcon, FileSpreadsheet } from "lucide-react";

const exportToCSV = (rows, filename) => {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    // UTF-8 BOM (\uFEFF) ensures proper character rendering and column recognition in Microsoft Excel
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const parts = String(dateStr).split("T")[0].split("-");
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        }
        return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
};

const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    try {
        return new Date(timeStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
        return "—";
    }
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
    
    const currentMonthStr = () => new Date().toISOString().slice(0, 7);
    const todayStr = () => new Date().toISOString().split("T")[0];
    const firstDayOfMonthStr = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

    const [month, setMonth] = useState(currentMonthStr());
    const [filterType, setFilterType] = useState('month');
    const [startDate, setStartDate] = useState(firstDayOfMonthStr());
    const [endDate, setEndDate] = useState(todayStr());
    const [companyRecords, setCompanyRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state for viewing an employee's daily detail
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalFilterType, setModalFilterType] = useState('month'); // 'month' or 'custom'
    const [modalMonth, setModalMonth] = useState(currentMonthStr());
    const [modalStartDate, setModalStartDate] = useState(firstDayOfMonthStr());
    const [modalEndDate, setModalEndDate] = useState(todayStr());
    const [modalRecords, setModalRecords] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

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
            const recs = (d.records || []).filter(r => (r.userId?.role?.name || r.userId?.role)?.toLowerCase() !== "client");
            setCompanyRecords(recs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, month, filterType, startDate, endDate]);

    useEffect(() => {
        loadCompanyRecords();
    }, [loadCompanyRecords]);

    // Sync modal when selectedEmp opens
    useEffect(() => {
        if (!selectedEmp) {
            setModalRecords([]);
            return;
        }
        setModalFilterType(filterType);
        setModalMonth(month);
        setModalStartDate(startDate || `${month}-01`);
        setModalEndDate(endDate || todayStr());
        setModalRecords(selectedEmp.records || []);
    }, [selectedEmp]); // eslint-disable-line

    const fetchModalRecords = useCallback(async () => {
        if (!selectedEmp?.user?._id) return;
        try {
            setModalLoading(true);
            const params = { userId: selectedEmp.user._id };
            if (modalFilterType === 'month') {
                params.month = modalMonth;
            } else {
                if (modalStartDate && modalEndDate) {
                    params.startDate = modalStartDate;
                    params.endDate = modalEndDate;
                } else {
                    params.month = modalMonth;
                }
            }
            const d = isAdmin
                ? await getCompanyAttendance(params)
                : await getTeamAttendance(params);
            const recs = (d.records || []).filter(r => (r.userId?.role?.name || r.userId?.role)?.toLowerCase() !== "client");
            setModalRecords(recs);
        } catch (error) {
            console.error("Modal attendance fetch error:", error);
        } finally {
            setModalLoading(false);
        }
    }, [selectedEmp, modalFilterType, modalMonth, modalStartDate, modalEndDate, isAdmin]);

    const isFirstModalMount = useRef(true);
    useEffect(() => {
        if (!selectedEmp) {
            isFirstModalMount.current = true;
            return;
        }
        if (isFirstModalMount.current) {
            isFirstModalMount.current = false;
            return;
        }
        fetchModalRecords();
    }, [modalFilterType, modalMonth, modalStartDate, modalEndDate, fetchModalRecords]);

    const handleExportModalCSV = () => {
        if (!modalRecords || modalRecords.length === 0) {
            alert("No records to export");
            return;
        }
        const empName = `${selectedEmp.user?.firstName || ""} ${selectedEmp.user?.lastName || ""}`.trim();
        const headers = ["Employee Name", "Employee Code", "Date", "Status", "Check In", "Check Out", "Work Hours"];
        const rows = [...modalRecords]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(r => [
                empName,
                selectedEmp.user?.employeeCode || "",
                formatDisplayDate(r.date),
                (r.status || "").toUpperCase(),
                formatTime(r.checkIn),
                formatTime(r.checkOut),
                fmtHours(r.workHours)
            ]);
        const periodLabel = modalFilterType === 'month' ? modalMonth : `${modalStartDate}_to_${modalEndDate}`;
        exportToCSV([headers, ...rows], `${empName.replace(/\s+/g, '_')}_Daily_Attendance_${periodLabel}.csv`);
    };

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
        if ((r.userId?.role?.name || r.userId?.role)?.toLowerCase() === "client") return;
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
        const periodLabel = filterType === 'month' ? month : `${startDate}_to_${endDate}`;
        exportToCSV([headers,...rows],`attendance_report_${periodLabel}.csv`);
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
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setFilterType('month')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                                    filterType === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                By Month
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterType('custom')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                                    filterType === 'custom' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Date Range
                            </button>
                        </div>

                        {filterType === 'month' ? (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                                <CalendarDays size={14} className="text-blue-600" />
                                <span className="text-xs font-semibold text-gray-500">Month:</span>
                                <input 
                                    type="month" 
                                    value={month} 
                                    onChange={e => setMonth(e.target.value)}
                                    className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer" 
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                                <span className="text-xs font-semibold text-gray-500">From:</span>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer" 
                                />
                                <span className="text-xs text-gray-400 font-medium">To:</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    min={startDate || undefined}
                                    className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer" 
                                />
                            </div>
                        )}
                        <button 
                            onClick={handleExportReport} 
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                            title="Download Report as Excel/CSV"
                        >
                            <Download size={14} /> Export CSV / Excel
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" onClick={() => setSelectedEmp(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shadow-xs border border-blue-200">
                                    {selectedEmp.user?.firstName?.[0]}{selectedEmp.user?.lastName?.[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-gray-900">{selectedEmp.user?.firstName} {selectedEmp.user?.lastName} - Daily Attendance</h2>
                                        {selectedEmp.user?.employeeCode && (
                                            <span className="text-xs px-2 py-0.5 bg-gray-200/70 text-gray-700 rounded-md font-medium">
                                                {selectedEmp.user?.employeeCode}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Period: <span className="font-semibold text-gray-700">{modalFilterType === 'month' ? modalMonth : `${modalStartDate} to ${modalEndDate}`}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedEmp(null)} 
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition cursor-pointer"
                                title="Close"
                            >
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>

                        {/* Modal Filter Toolbar & Actions */}
                        <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Toggle: Month Wise vs Date Range */}
                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-xs">
                                    <button
                                        type="button"
                                        onClick={() => setModalFilterType('month')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                                            modalFilterType === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Month Wise
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalFilterType('custom')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                                            modalFilterType === 'custom' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Date Range
                                    </button>
                                </div>

                                {/* Controls based on filter */}
                                {modalFilterType === 'month' ? (
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                                        <CalendarDays size={14} className="text-blue-600" />
                                        <span className="text-xs font-semibold text-gray-500">Month:</span>
                                        <input 
                                            type="month" 
                                            value={modalMonth} 
                                            onChange={e => setModalMonth(e.target.value)}
                                            className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer" 
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs">
                                        <span className="text-xs font-semibold text-gray-500">From:</span>
                                        <input 
                                            type="date" 
                                            value={modalStartDate} 
                                            onChange={e => setModalStartDate(e.target.value)}
                                            className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer" 
                                        />
                                        <span className="text-xs text-gray-400 font-medium">To:</span>
                                        <input 
                                            type="date" 
                                            value={modalEndDate} 
                                            onChange={e => setModalEndDate(e.target.value)}
                                            min={modalStartDate || undefined}
                                            className="text-xs font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer" 
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Download Excel / CSV Button */}
                            <button 
                                onClick={handleExportModalCSV}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                                title="Download employee daily attendance as Excel/CSV"
                            >
                                <Download size={14} /> Download Excel / CSV
                            </button>
                        </div>

                        {/* Quick KPI summary */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 px-5 py-3 bg-white border-b border-gray-100 text-center">
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-[11px] font-medium text-gray-500">Total</span>
                                <div className="text-base font-bold text-gray-900">{modalRecords.length}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                                <span className="text-[11px] font-medium text-emerald-700">Present</span>
                                <div className="text-base font-bold text-emerald-700">{modalRecords.filter(r => r.status === 'present' || r.status === 'regularized').length}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                                <span className="text-[11px] font-medium text-amber-700">Late</span>
                                <div className="text-base font-bold text-amber-700">{modalRecords.filter(r => r.status === 'late').length}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                                <span className="text-[11px] font-medium text-blue-700">Half Day</span>
                                <div className="text-base font-bold text-blue-700">{modalRecords.filter(r => r.status === 'half-day').length}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-red-50/60 border border-red-100">
                                <span className="text-[11px] font-medium text-red-700">Absent</span>
                                <div className="text-base font-bold text-red-700">{modalRecords.filter(r => r.status === 'absent').length}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100">
                                <span className="text-[11px] font-medium text-purple-700">Total Hours</span>
                                <div className="text-base font-bold text-purple-700">{fmtHours(modalRecords.reduce((acc, r) => acc + (r.workHours || 0), 0))}</div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="p-5 overflow-y-auto flex-1">
                            {modalLoading ? (
                                <div className="py-12 text-center text-gray-400">Loading daily attendance records...</div>
                            ) : modalRecords.length === 0 ? (
                                <div className="py-12 text-center text-gray-400">
                                    No attendance records found for this period.
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="px-5 py-3 text-left">Date</th>
                                                <th className="px-5 py-3 text-left">Status</th>
                                                <th className="px-5 py-3 text-left">Check In</th>
                                                <th className="px-5 py-3 text-left">Check Out</th>
                                                <th className="px-5 py-3 text-left">Work Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {[...modalRecords].sort((a,b) => new Date(a.date) - new Date(b.date)).map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50/60 transition">
                                                    <td className="px-5 py-3 font-medium text-gray-800">{formatDisplayDate(r.date)}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider
                                                            ${r.status === 'present' || r.status === 'regularized' ? 'bg-emerald-100 text-emerald-800' : 
                                                              r.status === 'late' ? 'bg-amber-100 text-amber-800' : 
                                                              r.status === 'half-day' ? 'bg-blue-100 text-blue-800' :
                                                              r.status === 'early-leave' ? 'bg-violet-100 text-violet-800' :
                                                              'bg-red-100 text-red-800'}`}>
                                                            {r.status.replace('-', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkIn)}</td>
                                                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkOut)}</td>
                                                    <td className="px-5 py-3 font-bold text-gray-800">{fmtHours(r.workHours)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                            <span>Showing {modalRecords.length} records</span>
                            <button
                                onClick={() => setSelectedEmp(null)}
                                className="px-4 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg font-medium text-gray-700 transition cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;
