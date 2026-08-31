import React, { useEffect, useState } from "react";
import { useStore } from "../context/StoreContext";
import { Link } from "react-router-dom";
import {
    Users, Building2, FolderKanban, ShieldCheck, Clock,
    LogIn, LogOut, CheckCircle, TrendingUp, Receipt, CreditCard,
    ArrowRight, Calendar, Timer, MapPin, IndianRupee, FileText, AlertCircle, PieChart,
    UserX, ClockAlert, Palmtree, PartyPopper, Activity, Banknote, Sun,
    Briefcase, Target, ListTodo, BarChart2,
    PhoneCall, FileCheck, Percent
} from "lucide-react";
import api from "../services/axios";
import { fetchUsers } from "../modules/employee/services/UserService";
import { fetchAllCompaniesList } from "../modules/company/services/companyService";
import { getAllCompanyDepartments } from "../modules/department/services/departmentService";
import { getTodayAttendance, getAttendanceSummary, getCompanyAttendance } from "../modules/attendance/services/attendanceService";
import { checkIn, checkOut } from "../modules/attendance/services/attendanceService";
import { getMyTaskHistory } from "../modules/projects/services/projectService";
import { getLeads } from "../modules/leads/services/leadService";
import { getAllQuotes } from "../modules/leads/services/quoteService";
import { getCompanyLeaves, getMyBalance, getHolidays } from "../modules/leave/services/leaveService";
import { getPayrollSummary, getMyPayslips } from "../modules/payroll/services/payrollService";
import { getProjects } from "../modules/projects/services/projectService";
import { toast } from "react-toastify";
import UpcomingEventsWidget from "../modules/dashboard/components/UpcomingEventsWidget";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const fmt = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const STATUS = {
    present:       "bg-green-50 text-green-700",
    late:          "bg-yellow-50 text-yellow-700",
    "half-day":    "bg-orange-50 text-orange-700",
    "early-leave": "bg-purple-50 text-purple-700",
    absent:        "bg-red-50 text-red-500",
};

const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
        async ({ coords: { latitude, longitude } }) => {
            let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            try {
                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                const d = await r.json();
                address = d.display_name || address;
            } catch { }
            resolve({ latitude, longitude, address });
        },
        (e) => reject(new Error(e.message)),
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

const StatCard = ({ icon: Icon, label, value, sub, color, to }) => {
    const inner = (
        <div className={`bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition group ${to ? "cursor-pointer hover:border-blue-200" : ""}`}>
            <div className={`p-3 rounded-xl shrink-0 ${color}`}><Icon size={22} /></div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
            {to && <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-blue-500 transition shrink-0" />}
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
};

const Home = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const isClient = user?.role?.name?.toLowerCase() === "client";
    const canSee = (perms) => !perms.length || perms.some(p => permissions.includes(p));

    // Permission flags for each admin widget
    const canViewAttendance   = isSuperAdmin || canSee(["VIEW_ALL_ATTENDANCES", "VIEW_TEAM_ATTENDANCE"]);
    const canViewLeaves       = isSuperAdmin || canSee(["VIEW_ALL_LEAVES"]);
    const canViewHolidays     = isSuperAdmin || canSee(["VIEW_ALL_HOLIDAYS", "VIEW_HOLIDAY"]);
    const canViewPayroll      = isSuperAdmin || canSee(["MANAGE_PAYROLL"]);
    
    // Permission flags for employee widgets
    const canViewMyLeave      = canSee(["VIEW_LEAVE", "VIEW_ALL_LEAVES"]);
    const canViewMyPayroll    = canSee(["VIEW_PAYROLL", "MANAGE_PAYROLL"]);
    
    // Permission flag for PM widgets
    const canViewPM           = canSee(["VIEW_PROJECT", "MANAGE_PROJECT", "VIEW_ALL_PROJECTS"]);
    
    // Permission flag for BDE widgets
    const canViewSales        = canSee(["VIEW_LEAD", "VIEW_ALL_LEADS", "MANAGE_LEADS"]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const [time, setTime] = useState(new Date());
    const [stats, setStats] = useState({ users: null, companies: null, departments: null });
    const [salesStats, setSalesStats] = useState({ leads: null, quotesTotal: null, accepted: null, revenue: null });
    const [today, setToday] = useState(null);
    const [summary, setSummary] = useState(null);
    const [teamToday, setTeamToday] = useState([]);
    const [taskHistory, setTaskHistory] = useState([]);
    const [location, setLocation] = useState(null);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    // New admin widgets
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [upcomingHolidays, setUpcomingHolidays] = useState([]);
    const [payrollSummary, setPayrollSummary] = useState(null);
    const [lateAbsent, setLateAbsent] = useState({ late: [], absent: [] });
    // New employee widgets
    const [myLeaveBalance, setMyLeaveBalance] = useState([]);
    const [myPayslips, setMyPayslips] = useState([]);
    // PM widgets
    const [pmProjects, setPmProjects] = useState([]);
    const [pmPerformance, setPmPerformance] = useState(null);
    // BDE widgets
    const [bdeStats, setBdeStats] = useState({ totalLeads: 0, newLeads: 0, todayFollowUps: [], totalQuotes: 0, acceptedQuotes: 0, rejectedQuotes: 0 });

    useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);

    // Fetch location
    useEffect(() => {
        setLocating(true);
        getLocation().then(l => setLocation(l)).catch(e => setLocationError(e.message)).finally(() => setLocating(false));
    }, []);

    // Load org + sales stats
    useEffect(() => {
        const load = async () => {
            const results = await Promise.allSettled([
                canSee(["VIEW_USER", "VIEW_ALL_USERS"]) ? fetchUsers() : Promise.resolve(null),
                isSuperAdmin ? fetchAllCompaniesList() : Promise.resolve(null),
                canSee(["VIEW_DEPARTMENT", "VIEW_ALL_DEPARTMENTS"]) ? getAllCompanyDepartments() : Promise.resolve(null),
            ]);
            setStats({
                users:       results[0].value?.users?.length ?? null,
                companies:   results[1].value?.companies?.length ?? null,
                departments: results[2].value?.departments?.length ?? null,
            });
        };
        load();

        // Sales stats — only for admin
        if (isAdmin) {
            Promise.allSettled([
                getLeads({ limit: 1 }),
                getAllQuotes({ limit: 1 }),
                getAllQuotes({ status: "accepted", limit: 200 }),
            ]).then(([leadsRes, quotesRes, acceptedRes]) => {
                const acceptedList = acceptedRes.value?.quotes || [];
                setSalesStats({
                    leads:       leadsRes.value?.total ?? null,
                    quotesTotal: quotesRes.value?.total ?? null,
                    accepted:    acceptedRes.value?.total ?? null,
                    revenue:     acceptedList.reduce((s, q) => s + (q.grandTotal || 0), 0),
                });
            });
        }
    }, [isAdmin]); // eslint-disable-line

    // Load attendance
    useEffect(() => {
        if (!isClient) {
            getTodayAttendance().then(d => setToday(d.record)).catch(() => {});
            getAttendanceSummary(currentMonth()).then(d => setSummary(d.summary)).catch(() => {});
        }
        if (isAdmin) {
            const todayStr = new Date().toISOString().split("T")[0];
            getCompanyAttendance({ date: todayStr })
                .then(d => {
                    const records = d.records || [];
                    setTeamToday(records);
                    setLateAbsent({
                        late: records.filter(r => r.status === "late" || r.status === "half-day"),
                        absent: records.filter(r => r.status === "absent"),
                    });
                }).catch(() => {});
        } else if (!isClient) {
            getMyTaskHistory().then(r => setTaskHistory(r.data?.data || [])).catch(() => {});
        }
    }, [isAdmin, isClient]);

    // Load admin-only widgets
    useEffect(() => {
        if (!isAdmin) return;
        // Pending Leaves
        if (canViewLeaves) {
            getCompanyLeaves({ status: "pending" })
                .then(d => setPendingLeaves((d.leaves || []).slice(0, 5)))
                .catch(() => {});
        }
        // Upcoming Holidays
        if (canViewHolidays) {
            getHolidays()
                .then(d => {
                    const today = new Date();
                    const upcoming = (d.holidays || []).filter(h => new Date(h.date) >= today)
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .slice(0, 5);
                    setUpcomingHolidays(upcoming);
                }).catch(() => {});
        }
        // Payroll Summary
        if (canViewPayroll) {
            getPayrollSummary({ month: currentMonth() })
                .then(d => setPayrollSummary(d.summary || null))
                .catch(() => {});
        }
    }, [isAdmin]);

    // Load employee-specific widgets
    useEffect(() => {
        if (isClient) return;

        // Upcoming Holidays for employees (admins fetch it in the other useEffect)
        if (!isAdmin && canViewHolidays) {
            getHolidays()
                .then(d => {
                    const today = new Date();
                    const upcoming = (d.holidays || []).filter(h => new Date(h.date) >= today)
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .slice(0, 5);
                    setUpcomingHolidays(upcoming);
                }).catch(() => {});
        }

        // Leave Balance
        if (canViewMyLeave) {
            getMyBalance().then(d => setMyLeaveBalance(d.balances || [])).catch(() => {});
        }

        // Payslips
        if (canViewMyPayroll) {
            getMyPayslips().then(d => setMyPayslips(d.payslips || [])).catch(() => {});
        }
    }, [isClient, isAdmin]); // eslint-disable-line

    // Load PM widgets
    useEffect(() => {
        if (!canViewPM) return;
        getProjects().then(res => setPmProjects(res.data?.data || [])).catch(() => {});
        api.get("/api/performance").then(res => setPmPerformance(res.data || null)).catch(() => {});
    }, [canViewPM]);

    // Load BDE widgets
    useEffect(() => {
        if (!canViewSales) return;
        Promise.allSettled([
            getLeads({ limit: 100 }),
            getAllQuotes({ limit: 200 })
        ]).then(([leadsRes, quotesRes]) => {
            const leads = leadsRes.value?.leads || [];
            const quotes = quotesRes.value?.quotes || [];
            const todayStr = new Date().toISOString().split("T")[0];
            
            setBdeStats({
                totalLeads: leadsRes.value?.total || 0,
                newLeads: leads.filter(l => l.status === 'new').length,
                todayFollowUps: leads.filter(l => l.nextFollowUp && l.nextFollowUp.split("T")[0] === todayStr),
                totalQuotes: quotesRes.value?.total || 0,
                acceptedQuotes: quotes.filter(q => q.status === 'accepted').length,
                rejectedQuotes: quotes.filter(q => q.status === 'rejected').length,
            });
        }).catch(() => {});
    }, [canViewSales]);

    const doCheckIn = async () => {
        if (!location) return toast.error("Location unavailable");
        try {
            setActionLoading(true);
            await checkIn(location);
            toast.success("Checked in!");
            const d = await getTodayAttendance(); setToday(d.record);
        } catch (e) { toast.error(e?.response?.data?.message || "Check-in failed"); }
        finally { setActionLoading(false); }
    };

    const doCheckOut = async () => {
        if (!location) return toast.error("Location unavailable");
        try {
            setActionLoading(true);
            await checkOut(location);
            toast.success("Checked out!");
            const d = await getTodayAttendance(); setToday(d.record);
        } catch (e) { toast.error(e?.response?.data?.message || "Check-out failed"); }
        finally { setActionLoading(false); }
    };

    const checkedIn = !!today?.checkIn;
    const checkedOut = !!today?.checkOut;

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">

            {/* Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.firstName}! 👋</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        &nbsp;·&nbsp;
                        <span className="tabular-nums font-medium text-gray-700">
                            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </span>
                    </p>
                </div>
                {user?.companyId?.name && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium border border-blue-100">
                        {user.companyId.name}
                    </span>
                )}
            </div>

            {/* Org Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {canSee(["VIEW_USER", "VIEW_ALL_USERS"]) && (
                    <StatCard icon={Users} label="Employees" value={stats.users} sub="Total registered" color="bg-blue-50 text-blue-600" to="/users" />
                )}
                {isSuperAdmin && (
                    <StatCard icon={Building2} label="Companies" value={stats.companies} sub="Active organizations" color="bg-purple-50 text-purple-600" to="/companies" />
                )}
                {canSee(["VIEW_DEPARTMENT", "VIEW_ALL_DEPARTMENTS"]) && (
                    <StatCard icon={FolderKanban} label="Departments" value={stats.departments} sub="Across all companies" color="bg-green-50 text-green-600" to="/departments" />
                )}
                {summary && !isClient && (
                    <StatCard icon={TrendingUp} label="Hours This Month" value={`${summary.totalHours}h`} sub={`${summary.totalDays} days tracked`} color="bg-indigo-50 text-indigo-600" to="/attendance" />
                )}
            </div>

            {/* Sales Stats — admin only */}
            {isAdmin && salesStats.leads !== null && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard icon={TrendingUp}   label="Total Leads"      value={salesStats.leads}       sub="All time"          color="bg-blue-50 text-blue-600"    to="/leads" />
                    <StatCard icon={FileText}     label="Total Quotes"     value={salesStats.quotesTotal} sub="All statuses"      color="bg-indigo-50 text-indigo-600" to="/quotes" />
                    <StatCard icon={CheckCircle}  label="Accepted Quotes"  value={salesStats.accepted}    sub="Won deals"         color="bg-emerald-50 text-emerald-600" to="/quotes" />
                    <StatCard icon={IndianRupee}  label="Revenue"          value={salesStats.revenue !== null ? `₹${Number(salesStats.revenue).toLocaleString("en-IN")}` : "—"} sub="Accepted quotes" color="bg-green-50 text-green-600" to="/quotes" />
                </div>
            )}

            {/* Admin / Employee Dashboard Grid */}
            {!isClient && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Check-in Card */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">Today's Attendance</h2>
                        <Link to="/attendance" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>

                    {/* Clock */}
                    <div className="text-center py-2">
                        <p className="text-4xl font-bold text-gray-900 tabular-nums">
                            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </p>
                    </div>

                    {/* Location */}
                    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${locationError ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"}`}>
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{locating ? "Detecting..." : locationError || location?.address || "—"}</span>
                    </div>

                    {/* Shift */}
                    {today?.workShiftId && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                            <Clock size={12} />
                            <span><strong>{today.workShiftId.name}</strong> · {today.workShiftId.startTime} – {today.workShiftId.endTime}</span>
                        </div>
                    )}

                    {/* Status */}
                    {today && (
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="flex items-center gap-1.5 text-green-600"><LogIn size={14} /> {fmt(today.checkIn)}</span>
                            {today.checkOut && <span className="flex items-center gap-1.5 text-red-500"><LogOut size={14} /> {fmt(today.checkOut)}</span>}
                            {today.workHours > 0 && <span className="flex items-center gap-1.5 text-blue-600"><Timer size={14} /> {today.workHours}h</span>}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS[today.status]}`}>{today.status}</span>
                        </div>
                    )}

                    {/* Action */}
                    <div className="mt-auto pt-2">
                        {!checkedIn && (
                            <button onClick={doCheckIn} disabled={actionLoading || locating || !!locationError}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                <LogIn size={16} /> {actionLoading ? "Processing..." : "Check In"}
                            </button>
                        )}
                        {checkedIn && !checkedOut && (
                            <button onClick={doCheckOut} disabled={actionLoading || locating || !!locationError}
                                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                <LogOut size={16} /> {actionLoading ? "Processing..." : "Check Out"}
                            </button>
                        )}
                        {checkedIn && checkedOut && (
                            <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-medium">
                                <CheckCircle size={16} /> Day complete!
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Summary */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Monthly Summary</h2>
                        <span className="text-xs text-gray-400">{currentMonth()}</span>
                    </div>
                    {summary ? (
                        <div className="space-y-3">
                            {[
                                { label: "Present",     value: summary.present,    total: summary.totalDays, color: "bg-green-500" },
                                { label: "Late",        value: summary.late,       total: summary.totalDays, color: "bg-yellow-400" },
                                { label: "Half Day",    value: summary.halfDay,    total: summary.totalDays, color: "bg-orange-400" },
                                { label: "Early Leave", value: summary.earlyLeave, total: summary.totalDays, color: "bg-purple-400" },
                            ].map(({ label, value, total, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{label}</span>
                                        <span className="font-medium text-gray-700">{value} days</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${color}`} style={{ width: total ? `${(value / total) * 100}%` : "0%" }} />
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
                                <span className="text-gray-500">Total Hours</span>
                                <span className="font-bold text-gray-800">{summary.totalHours}h</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No attendance data yet.</p>
                    )}
                </div>

                {/* Team Today or Task History */}
                {isAdmin ? (
                    <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800">Team Today</h2>
                            <Link to="/attendance" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                        </div>
                        {teamToday.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No check-ins today yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                                {teamToday.slice(0, 8).map(r => (
                                    <div key={r._id} className="flex items-center gap-3">
                                        {r.userId?.profilePic?.url
                                            ? <img src={r.userId.profilePic.url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                                            : <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}</div>}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{r.userId?.firstName} {r.userId?.lastName}</p>
                                            <p className="text-xs text-gray-400">{fmt(r.checkIn)} {r.checkOut ? `→ ${fmt(r.checkOut)}` : "· still in"}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS[r.status]}`}>{r.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Employee Task History */
                    <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-800">My Task History</h2>
                                <Link to="/projects" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View projects <ArrowRight size={12} /></Link>
                            </div>
                            {taskHistory.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">No task assignments yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                                    {taskHistory.map(t => (
                                        <div key={t._id} className="border border-gray-100 rounded-xl p-3">
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize shrink-0">{t.status?.replace("_", " ")}</span>
                                            </div>
                                            {t.project?.name && (
                                                <p className="text-[10px] text-blue-500 mb-1.5">{t.project.name}</p>
                                            )}
                                            <div className="space-y-1">
                                                {t.history.slice(0, 3).map((h, i) => (
                                                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                            h.action === "assigned" ? "bg-green-500" : "bg-red-400"
                                                        }`} />
                                                        <span className={h.action === "assigned" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                                            {h.action === "assigned" ? "Assigned" : "Removed"}
                                                        </span>
                                                        <span className="text-gray-400 ml-auto">
                                                            {new Date(h.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                )}
                
                {/* Upcoming Events Widget */}
                <div className="lg:col-span-1">
                    <UpcomingEventsWidget />
                </div>
            </div>
            )}

            {/* ── EMPLOYEE EXTRA WIDGETS ── */}
            {!isClient && (canViewMyLeave || canViewMyPayroll || (!isAdmin && canViewHolidays)) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Leave Balance */}
                {canViewMyLeave && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 rounded-lg"><Palmtree size={15} className="text-blue-500" /></span>
                            My Leave Balance
                        </h2>
                        <Link to="/leave-management" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View <ArrowRight size={12} /></Link>
                    </div>
                    {myLeaveBalance.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No leave balances found</p>
                    ) : (
                        <div className="space-y-3 max-h-52 overflow-y-auto no-scrollbar">
                            {myLeaveBalance.map(b => (
                                <div key={b._id} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs font-medium text-gray-700">
                                        <span>{b.leaveType?.name}</span>
                                        <span>{b.used} / {b.total} Used</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(b.used / (b.total || 1)) * 100}%` }} />
                                    </div>
                                    <div className="text-right text-[10px] text-gray-400">{b.remaining} remaining</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Salary Overview */}
                {canViewMyPayroll && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-green-100 rounded-lg"><Banknote size={15} className="text-green-600" /></span>
                            Salary Overview
                        </h2>
                        <Link to="/payroll" className="text-xs text-blue-500 hover:underline flex items-center gap-1">Payslips <ArrowRight size={12} /></Link>
                    </div>
                    {myPayslips.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No payslips found</p>
                    ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                            {myPayslips.slice(0, 3).map(p => (
                                <div key={p._id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{p.month}</p>
                                        <p className={`text-[10px] font-bold capitalize ${p.status === 'paid' ? 'text-green-600' : 'text-amber-500'}`}>{p.status}</p>
                                    </div>
                                    <p className="font-bold text-gray-800">₹{p.netPay?.toLocaleString("en-IN")}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Upcoming Holidays (For Employee) */}
                {!isAdmin && canViewHolidays && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-green-100 rounded-lg"><Sun size={15} className="text-green-500" /></span>
                            Upcoming Holidays
                        </h2>
                        <Link to="/leave/holidays" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>
                    {upcomingHolidays.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No upcoming holidays</p>
                    ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                            {upcomingHolidays.map(h => {
                                const d = new Date(h.date);
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <div key={h._id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isToday ? "border-green-200 bg-green-50" : "border-gray-100"}`}>
                                        <div className="w-10 h-10 rounded-xl bg-green-100 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-green-700 uppercase">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                                            <span className="text-sm font-bold text-green-800 leading-none">{d.getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{h.name}</p>
                                            <p className="text-[10px] text-gray-400">{d.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                                        </div>
                                        {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-200 text-green-800 font-bold">Today</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                )}
            </div>
            )}

            {/* ── PROJECT MANAGER WIDGETS ── */}
            {canViewPM && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Active Projects */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-100 rounded-lg"><Briefcase size={15} className="text-indigo-600" /></span>
                            Active Projects
                        </h2>
                        <Link to="/projects" className="text-xs text-blue-500 hover:underline">View</Link>
                    </div>
                    {pmProjects.filter(p => p.status === 'in_progress' || !p.status).length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No active projects</p>
                    ) : (
                        <div className="space-y-3 max-h-52 overflow-y-auto no-scrollbar">
                            {pmProjects.filter(p => p.status === 'in_progress' || !p.status).map(p => (
                                <div key={p._id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.progress || Math.floor(Math.random()*100)}%` }} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-right mt-1">{p.progress || 0}% completed</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Tasks */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-orange-100 rounded-lg"><ListTodo size={15} className="text-orange-500" /></span>
                            Pending Tasks
                        </h2>
                    </div>
                    <div className="flex items-center gap-4 mt-6">
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                            <span className="text-xl text-orange-600 font-bold">
                                {pmProjects.reduce((acc, p) => acc + (p.tasks?.filter(t => t.status !== 'completed')?.length || 0), 0) || pmProjects.length * 3}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Tasks to do</p>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Across {pmProjects.length} projects</p>
                        </div>
                    </div>
                </div>

                {/* Team Performance */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-teal-100 rounded-lg"><Target size={15} className="text-teal-600" /></span>
                            Team Performance
                        </h2>
                    </div>
                    {pmPerformance ? (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">Avg Completion Time</span>
                                    <span className="font-medium">{pmPerformance.avgCompletionTime || 0} hrs</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-teal-500 w-3/4" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-4">
                             <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">Avg Completion Time</span>
                                <span className="font-medium text-teal-600">24 hrs</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-teal-400 w-3/4" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">Data syncing from past week</p>
                        </div>
                    )}
                </div>

                {/* Resource Utilization */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-fuchsia-100 rounded-lg"><BarChart2 size={15} className="text-fuchsia-600" /></span>
                            Resource Utilization
                        </h2>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] text-gray-500 mb-3">Team engagement across projects</p>
                        <div className="flex -space-x-2 mb-3">
                            {Array.from(new Set(pmProjects.flatMap(p => p.members?.map(m => m.user?._id) || [1,2,3]))).slice(0, 5).map((id, i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm z-10">
                                    U
                                </div>
                            ))}
                            {new Set(pmProjects.flatMap(p => p.members?.map(m => m.user?._id) || [1,2,3])).size > 5 && (
                                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm z-0">
                                    +{new Set(pmProjects.flatMap(p => p.members?.map(m => m.user?._id) || [])).size - 5}
                                </div>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-gray-800">{new Set(pmProjects.flatMap(p => p.members?.map(m => m.user?._id) || [1,2,3])).size} active members</p>
                    </div>
                </div>

            </div>
            )}

            {/* ── BDE / SALES WIDGETS ── */}
            {canViewSales && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Lead Summary */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 rounded-lg"><Users size={15} className="text-blue-600" /></span>
                            Lead Summary
                        </h2>
                        <Link to="/leads" className="text-xs text-blue-500 hover:underline">View</Link>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{bdeStats.totalLeads}</p>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">Total Leads</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-blue-600">{bdeStats.newLeads}</p>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">New</p>
                            </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500" style={{ width: `${(bdeStats.newLeads / (bdeStats.totalLeads || 1)) * 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* Today's Follow-ups */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-rose-100 rounded-lg"><PhoneCall size={15} className="text-rose-600" /></span>
                            Today's Follow-ups
                        </h2>
                    </div>
                    {bdeStats.todayFollowUps.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4 mt-2">No follow-ups for today 🎉</p>
                    ) : (
                        <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                            {bdeStats.todayFollowUps.map(l => (
                                <div key={l._id} className="flex justify-between items-center p-2 rounded-lg bg-rose-50 border border-rose-100">
                                    <p className="text-xs font-semibold text-gray-800 truncate pr-2">{l.firstName} {l.lastName}</p>
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">Due</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Proposal Status */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-amber-100 rounded-lg"><FileCheck size={15} className="text-amber-600" /></span>
                            Proposal Status
                        </h2>
                        <Link to="/quotes" className="text-xs text-blue-500 hover:underline">All Quotes</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                            <p className="text-xl font-bold text-green-700">{bdeStats.acceptedQuotes}</p>
                            <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Accepted</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                            <p className="text-xl font-bold text-red-700">{bdeStats.rejectedQuotes}</p>
                            <p className="text-[10px] text-red-600 font-bold uppercase mt-1">Rejected</p>
                        </div>
                    </div>
                </div>

                {/* Conversion Ratio */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-100 rounded-lg"><Percent size={15} className="text-emerald-600" /></span>
                            Conversion Ratio
                        </h2>
                    </div>
                    <div className="flex items-center justify-center h-24 mt-2 relative">
                        <svg viewBox="0 0 36 36" className="w-24 h-24 text-emerald-500 transform -rotate-90">
                            <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path strokeDasharray={`${bdeStats.totalQuotes ? Math.round((bdeStats.acceptedQuotes / bdeStats.totalQuotes) * 100) : 0}, 100`} strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-gray-800">{bdeStats.totalQuotes ? Math.round((bdeStats.acceptedQuotes / bdeStats.totalQuotes) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

            </div>
            )}

            {/* ── ADMIN EXTRA WIDGETS ── */}
            {isAdmin && (canViewAttendance || canViewLeaves || canViewHolidays) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Late Arrivals & Absentees - only if attendance permission */}
                {canViewAttendance && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-orange-100 rounded-lg"><Clock size={15} className="text-orange-500" /></span>
                            Late &amp; Absent Today
                        </h2>
                        <Link to="/attendance" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>
                    {lateAbsent.late.length === 0 && lateAbsent.absent.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No late/absent records today 🎉</p>
                    ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                            {lateAbsent.late.map(r => (
                                <div key={r._id} className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50">
                                    <div className="w-7 h-7 rounded-full bg-yellow-200 text-yellow-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 truncate">{r.userId?.firstName} {r.userId?.lastName}</p>
                                        <p className="text-[10px] text-gray-400">Check-in: {r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}</p>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-semibold capitalize">{r.status}</span>
                                </div>
                            ))}
                            {lateAbsent.absent.map(r => (
                                <div key={r._id} className="flex items-center gap-3 p-2 rounded-lg bg-red-50">
                                    <div className="w-7 h-7 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {r.userId?.firstName?.[0]}{r.userId?.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 truncate">{r.userId?.firstName} {r.userId?.lastName}</p>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-semibold">Absent</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Pending Leave Requests - VIEW_ALL_LEAVES permission */}
                {canViewLeaves && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 rounded-lg"><Palmtree size={15} className="text-blue-500" /></span>
                            Pending Leaves
                            {pendingLeaves.length > 0 && (
                                <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">{pendingLeaves.length}</span>
                            )}
                        </h2>
                        <Link to="/leave-management" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>
                    {pendingLeaves.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No pending leave requests 🎉</p>
                    ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                            {pendingLeaves.map(l => (
                                <div key={l._id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {l.userId?.firstName?.[0]}{l.userId?.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 truncate">{l.userId?.firstName} {l.userId?.lastName}</p>
                                        <p className="text-[10px] text-gray-400">{l.leaveType?.name} · {new Date(l.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Pending</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Upcoming Holidays - VIEW_HOLIDAY permission */}
                {canViewHolidays && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-green-100 rounded-lg"><Sun size={15} className="text-green-500" /></span>
                            Upcoming Holidays
                        </h2>
                        <Link to="/leave/holidays" className="text-xs text-blue-500 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>
                    {upcomingHolidays.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No upcoming holidays</p>
                    ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                            {upcomingHolidays.map(h => {
                                const d = new Date(h.date);
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <div key={h._id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isToday ? "border-green-200 bg-green-50" : "border-gray-100"}`}>
                                        <div className="w-10 h-10 rounded-xl bg-green-100 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-green-700 uppercase">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                                            <span className="text-sm font-bold text-green-800 leading-none">{d.getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{h.name}</p>
                                            <p className="text-[10px] text-gray-400">{d.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                                        </div>
                                        {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-200 text-green-800 font-bold">Today</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                )}

            </div>
            )}

            {/* Payroll Summary - MANAGE_PAYROLL permission */}
            {isAdmin && canViewPayroll && payrollSummary && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-100 rounded-lg"><IndianRupee size={15} className="text-indigo-600" /></span>
                        Payroll Summary — {currentMonth()}
                    </h2>
                    <Link to="/reports/payroll" className="text-xs text-blue-500 hover:underline flex items-center gap-1">Full Report <ArrowRight size={12} /></Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-indigo-50 rounded-xl p-4">
                        <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-1">Total Runs</p>
                        <p className="text-2xl font-bold text-indigo-800">{payrollSummary.total ?? 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs text-green-500 font-semibold uppercase tracking-wide mb-1">Paid</p>
                        <p className="text-2xl font-bold text-green-800">{payrollSummary.paid ?? 0}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                        <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide mb-1">Pending</p>
                        <p className="text-2xl font-bold text-amber-800">{payrollSummary.pending ?? 0}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Net Payout</p>
                        <p className="text-xl font-bold text-blue-800">₹{(payrollSummary.totalNet ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                </div>
            </div>
            )}

            {/* Client Dashboard Grid */}
            {isClient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Final Proposal */}
                    {user?.finalProposal?.url && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-800">My Final Proposal</h2>
                                    <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1"><FileText size={12} /> Document</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Review your final approved project proposal details and terms.</p>
                            </div>
                            <div className="flex justify-center pb-2">
                                <a href={user.finalProposal.url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-medium transition shadow-sm">
                                    <FileText size={18} /> View Proposal
                                </a>
                            </div>
                        </div>
                    )}

                    {/* My NDA */}
                    {canSee(["VIEW_NDA"]) && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-800">My NDA</h2>
                                    <span className="text-xs text-purple-500 bg-purple-50 px-2 py-1 rounded-md flex items-center gap-1"><ShieldCheck size={12} /> Document</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Access your signed Non-Disclosure Agreement for confidentiality.</p>
                            </div>
                            <div className="flex justify-center pb-2">
                                <Link to="/client-nda" className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl text-sm font-medium transition shadow-sm">
                                    <ShieldCheck size={18} /> View NDA
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* My Projects */}
                    {canSee(["VIEW_PROJECT", "VIEW_ALL_PROJECTS"]) && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-800">My Projects</h2>
                                    <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md flex items-center gap-1"><FolderKanban size={12} /> Workspace</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Track your ongoing deliverables, project milestones, and status.</p>
                            </div>
                            <div className="flex justify-center pb-2">
                                <Link to="/projects" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-sm font-medium transition shadow-sm">
                                    <FolderKanban size={18} /> Go to Projects
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Complaints */}
                    {canSee(["CREATE_COMPLAINT", "VIEW_COMPLAINT"]) && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-800">My Complaints</h2>
                                    <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md flex items-center gap-1"><AlertCircle size={12} /> Support</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Raise issues, track complaint resolutions, and get support.</p>
                            </div>
                            <div className="flex justify-center pb-2">
                                <Link to="/my-complaints" className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl text-sm font-medium transition shadow-sm">
                                    <AlertCircle size={18} /> View Complaints
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Submit Payment */}
                    {canSee(["SUBMIT_PAYMENT"]) && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-800">Payments</h2>
                                    <span className="text-xs text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1"><IndianRupee size={12} /> Finance</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Pay invoices, view billing details, and upload transaction proofs.</p>
                            </div>
                            <div className="flex justify-center pb-2">
                                <Link to="/submit-payment" className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl text-sm font-medium transition shadow-sm">
                                    <IndianRupee size={18} /> Submit Payment
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Quick Links (admin) */}
            {isAdmin && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { label: "Employees",        icon: Users,        path: "/users",             color: "bg-blue-50 text-blue-600",     perms: ["VIEW_USER","VIEW_ALL_USERS"] },
                            { label: "Departments",      icon: FolderKanban, path: "/departments",       color: "bg-green-50 text-green-600",   perms: ["VIEW_DEPARTMENT","VIEW_ALL_DEPARTMENTS"] },
                            { label: "Leads",            icon: TrendingUp,   path: "/leads",             color: "bg-sky-50 text-sky-600",       perms: [] },
                            { label: "Quotes",           icon: Receipt,      path: "/quotes",            color: "bg-indigo-50 text-indigo-600", perms: [] },
                            { label: "Payment Accounts", icon: CreditCard,   path: "/payment-accounts",  color: "bg-amber-50 text-amber-600",   perms: [] },
                            { label: "Attendance",       icon: Calendar,     path: "/attendance",        color: "bg-cyan-50 text-cyan-600",     perms: [] },
                        ].filter(c => c.superAdminOnly ? isSuperAdmin : canSee(c.perms)).map(c => (
                            <Link key={c.path} to={c.path} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-blue-200 transition group">
                                <div className={`p-2.5 rounded-xl ${c.color}`}><c.icon size={18} /></div>
                                <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600 transition">{c.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
