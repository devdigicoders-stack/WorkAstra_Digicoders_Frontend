import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    ChevronLeft, Mail, Phone, MapPin, Building2, Briefcase, 
    CalendarDays, Clock, FileText, IndianRupee, Laptop, AlertCircle,
    MoreVertical, Target, Award, CheckCircle2, TrendingUp, Circle, ChevronDown, FolderGit2, ArrowRight, UserPlus, PalmtreeIcon, LifeBuoy, FileSignature, Download, Banknote
} from "lucide-react";
import BankDetailsComponent from "../components/BankDetailsComponent";
import { fetchUsers, fetchClients } from "../services/UserService";
import { getUserBalance } from "../../leave/services/leaveService";
import { getCompanyAttendance } from "../../attendance/services/attendanceService";
import { getOnboardingRequests } from "../../../services/onboardingService";
import { getProjects, getTasksByProject } from "../../projects/services/projectService";
import { getLeads } from "../../leads/services/leadService";
import { getTickets } from "../../tickets/services/ticketService";
import { assetService } from "../../../services/assetService";
import api from "../../../services/axios";
import { useStore } from "../../../context/StoreContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Swal from "sweetalert2";

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useStore();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [showActions, setShowActions] = useState(false);
    const [leaveData, setLeaveData] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, late: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [attendanceMonth, setAttendanceMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [onboardingData, setOnboardingData] = useState(null);

    // Projects State
    const [userProjects, setUserProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectTasks, setProjectTasks] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    // Leads State
    const [userLeads, setUserLeads] = useState([]);
    const [loadingLeads, setLoadingLeads] = useState(false);

    // Tickets State
    const [userTickets, setUserTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    // Assets State
    const [userAssets, setUserAssets] = useState([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    // NDA Signatures State
    const [employeeSignatures, setEmployeeSignatures] = useState([]);
    const [loadingSignatures, setLoadingSignatures] = useState(false);

    useEffect(() => {
        const loadEmployeeData = async () => {
            try {
                setLoading(true);
                const [resUsers, resClients] = await Promise.all([
                    fetchUsers(),
                    fetchClients()
                ]);
                const allUsers = [...(resUsers.users || []), ...(resClients.users || [])];
                const foundUser = allUsers.find(u => u._id === id);
                if (foundUser) {
                    setEmployee(foundUser);
                    
                    // Fetch dynamic Leave Data
                    try {
                        const balances = await getUserBalance(id);
                        if (balances && balances.data) {
                            const formattedLeaves = balances.data.map(l => ({
                                name: l.leaveType?.name || 'Leave',
                                Total: l.totalLeaves || 0,
                                Consumed: l.consumedLeaves || 0
                            }));
                            setLeaveData(formattedLeaves.length > 0 ? formattedLeaves : []);
                        }
                    } catch (e) { console.error("Leave error", e); }



                    // Fetch Onboarding Data
                    try {
                        const onboardingRes = await getOnboardingRequests();
                        if (onboardingRes && onboardingRes.requests) {
                            const foundOnboarding = onboardingRes.requests.find(req => 
                                req.user?._id === id || req.user === id
                            );
                            if (foundOnboarding) {
                                setOnboardingData(foundOnboarding);
                            }
                        }
                    } catch (e) { console.error("Onboarding error", e); }
                }
            } catch (err) {
                console.error("Failed to load employee data", err);
            } finally {
                setLoading(false);
            }
        };
        if (id) loadEmployeeData();
    }, [id]);

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!id) return;
            setLoadingAttendance(true);
            try {
                const attRes = await getCompanyAttendance({ month: attendanceMonth, employee: id });
                const attList = attRes?.records || attRes?.data || [];
                let present = 0, absent = 0, late = 0;
                let userAtt = [];
                
                if (attList.length > 0) {
                    userAtt = attList.filter(a => 
                        a.userId?._id === id || a.userId === id || 
                        a.employee?._id === id || a.employee === id
                    );
                    userAtt.forEach(record => {
                        const status = record.status?.toLowerCase() || '';
                        if (status === 'present' || status === 'half-day' || status === 'regularized') {
                            present++;
                            if (record.isLate) late++;
                        } else if (status === 'absent') {
                            absent++;
                        } else if (status === 'late') {
                            late++;
                            present++; // Late is generally counted as present for the pie chart
                        }
                    });
                }
                
                // Sort attendance records by date ascending
                userAtt.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                setAttendanceSummary({ present, absent, late });
                setAttendanceRecords(userAtt);
                setAttendanceData([
                    { name: "Present", value: present, color: "#22c55e" },
                    { name: "Absent", value: absent, color: "#ef4444" },
                    { name: "Late", value: late, color: "#f59e0b" },
                ]);
            } catch (e) {
                console.error("Attendance error", e);
            } finally {
                setLoadingAttendance(false);
            }
        };
        fetchAttendance();
    }, [id, attendanceMonth]);

    useEffect(() => {
        if (activeTab === "projects" && userProjects.length === 0) {
            setLoadingProjects(true);
            getProjects().then(res => {
                if (res.data?.success) {
                    const projectsList = res.data.data || res.data.projects || [];
                    const filtered = projectsList.filter(p => 
                        p.members?.some(m => m._id === id || m === id) || 
                        (p.createdBy?._id === id || p.createdBy === id)
                    );
                    setUserProjects(filtered);
                }
            }).catch(console.error).finally(() => setLoadingProjects(false));
        }

        if (activeTab === "leads" && userLeads.length === 0) {
            setLoadingLeads(true);
            getLeads().then(res => {
                if (res?.success || res?.leads) {
                    const leads = res.leads || res.data?.leads || [];
                    const filtered = leads.filter(l => 
                        l.assignedTo?._id === id || l.assignedTo === id
                    );
                    setUserLeads(filtered);
                }
            }).catch(console.error).finally(() => setLoadingLeads(false));
        }

        if (activeTab === "helpdesk" && userTickets.length === 0) {
            setLoadingTickets(true);
            getTickets().then(res => {
                if (res.data?.success || res.data?.tickets) {
                    const tickets = res.data?.tickets || [];
                    const filtered = tickets.filter(t => 
                        t.userId?._id === id || t.userId === id || 
                        t.assignedTo?._id === id || t.assignedTo === id
                    );
                    setUserTickets(filtered);
                }
            }).catch(console.error).finally(() => setLoadingTickets(false));
        }

        if (activeTab === "assets" && userAssets.length === 0) {
            setLoadingAssets(true);
            assetService.getAssets().then(res => {
                if (res.success || res.assets) {
                    const assets = res.assets || res.data?.assets || [];
                    const filtered = assets.filter(a => 
                        a.assignedTo?._id === id || a.assignedTo === id
                    );
                    setUserAssets(filtered);
                }
            }).catch(console.error).finally(() => setLoadingAssets(false));
        }

        if (activeTab === "nda_signatures" && employeeSignatures.length === 0) {
            setLoadingSignatures(true);
            api.get(`/api/nda/employee-signatures/${id}`).then(res => {
                if (res.data?.success) {
                    setEmployeeSignatures(res.data.signatures);
                }
            }).catch(console.error).finally(() => setLoadingSignatures(false));
        }
    }, [activeTab, id]);

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Loading Profile...</div>;
    if (!employee) return <div className="flex h-screen items-center justify-center text-red-500">Employee not found.</div>;

    const handleDownloadOfferLetter = async () => {
        try {
            Swal.fire({ title: 'Generating...', text: 'Please wait while we generate the offer letter PDF.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await api.get(`/api/onboarding/user-offer-letter/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${employee.firstName}_Offer_Letter.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            Swal.close();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Could not download offer letter. Make sure employee is fully approved.', 'error');
        }
    };

    const handleProjectClick = async (project) => {
        if (selectedProject?._id === project._id) {
            setSelectedProject(null); // toggle off
            return;
        }
        setSelectedProject(project);
        setProjectTasks([]);
        try {
            const res = await getTasksByProject(project._id);
            if (res.data?.success) {
                // Find tasks assigned to this specific employee within the project
                const tasksList = res.data.data || res.data.tasks || [];
                const empTasks = tasksList.filter(t => 
                    t.assignedTo?.some(u => u._id === id || u === id)
                );
                setProjectTasks(empTasks);
            }
        } catch (e) { console.error("Error fetching tasks", e); }
    };

    const TABS = [
        { id: "overview", label: "Overview", icon: Briefcase },
        { id: "personal_info", label: "Personal Info", icon: Circle },
        ...(onboardingData?.yearsOfExperience > 0 && onboardingData?.previousCompany?.name ? [{ id: "previous_company", label: "Previous Company", icon: Building2 }] : []),
        { id: "attendance", label: "Attendance", icon: Clock },
        { id: "leaves", label: "Leaves", icon: PalmtreeIcon },
        { id: "projects", label: "Projects", icon: FolderGit2 },
        { id: "leads", label: "Leads", icon: UserPlus },
        { id: "helpdesk", label: "Helpdesk", icon: LifeBuoy },
        { id: "offer_letter", label: "Offer Letter", icon: FileText },
        { id: "nda_signatures", label: "NDA Signatures", icon: FileSignature },
        { id: "payroll", label: "Payroll", icon: IndianRupee },
        { id: "bank_details", label: "Bank & UPI", icon: Banknote },
        { id: "assets", label: "Assets", icon: Laptop },
        { id: "documents", label: "Documents", icon: FileText }
    ];

    const handleAction = (action) => {
        setShowActions(false);
        Swal.fire({
            title: action,
            text: `This will open the ${action} module/modal.`,
            icon: 'info',
            confirmButtonColor: '#3b82f6'
        });
    };

    // Derived Timeline Data (Dynamic based on user)
    const timeline = employee ? [
        { date: employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A", title: "Joined Company", desc: `Started as ${employee.role?.name || 'Employee'}`, icon: Briefcase, color: "bg-blue-500" },
        { date: employee.joiningDate ? new Date(new Date(employee.joiningDate).setMonth(new Date(employee.joiningDate).getMonth() + 3)).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A", title: "Passed Probation", desc: "Estimated probation completion.", icon: CheckCircle2, color: "bg-green-500" },
    ] : [];

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-200 px-6 sm:px-10 py-6 sm:py-8 pt-6">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition">
                        <ChevronLeft size={16} /> Back to Directory
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* Profile Picture */}
                    <div className="shrink-0 relative">
                        {employee.profilePic?.url ? (
                            <img src={employee.profilePic.url} alt="Profile" className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-lg border-4 border-white" />
                        ) : (
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-4xl sm:text-5xl font-bold shadow-lg border-4 border-white">
                                {employee.firstName?.[0]}{employee.lastName?.[0]}
                            </div>
                        )}
                        <span className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${employee.isActive ? "bg-green-500" : "bg-red-500"}`}></span>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            {employee.firstName} {employee.lastName}
                        </h1>
                        <p className="text-sm font-medium text-blue-600 mt-1 uppercase tracking-wide">
                            {employee.role?.name || "Employee"} • {employee.employeeCode || "N/A"}
                        </p>
                        
                        <div className="mt-4 flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-gray-600">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Building2 size={16} className="text-gray-400" />
                                <span>{employee.department?.name || "No Department"}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Mail size={16} className="text-gray-400" />
                                <a href={`mailto:${employee.email}`} className="hover:text-blue-600 transition">{employee.email}</a>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Phone size={16} className="text-gray-400" />
                                <span>{employee.phone || "—"}</span>
                            </div>
                            {employee.currentAddress && (
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="truncate max-w-[200px]">{employee.currentAddress}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Navigation Tabs */}
                <div className="flex overflow-x-auto gap-1 mt-8 -mb-6 border-b border-gray-100 no-scrollbar">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap
                                    ${active ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                            >
                                <Icon size={16} className={active ? "text-blue-600" : "text-gray-400"} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="p-6 sm:p-10 w-full mx-auto">
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-blue-500"/> Work Details
                                </h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Company</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{employee.companyId?.name || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Employment Status</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                            <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs">
                                                {employee.employmentStatus?.name || "—"}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Joining Date</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                            {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Work Shift</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{employee.workShift?.name || "—"}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Employee Lifecycle Timeline */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-500"/> Employee Lifecycle
                                </h3>
                                <div className="space-y-6">
                                    {timeline.map((item, index) => (
                                        <div key={index} className="flex gap-4 relative">
                                            {index !== timeline.length - 1 && (
                                                <div className="absolute left-4 top-10 bottom-[-24px] w-0.5 bg-gray-100"></div>
                                            )}
                                            <div className={`w-8 h-8 rounded-full ${item.color} text-white flex items-center justify-center shrink-0 z-10 shadow-md ring-4 ring-white`}>
                                                <item.icon size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{item.date}</p>
                                                <p className="text-sm font-bold text-gray-800">{item.title}</p>
                                                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Reporting Manager */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Reporting Manager</h3>
                                {employee.reportingTo ? (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        {employee.reportingTo.profilePic?.url ? (
                                            <img src={employee.reportingTo.profilePic.url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                                {employee.reportingTo.firstName?.[0]}{employee.reportingTo.lastName?.[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{employee.reportingTo.firstName} {employee.reportingTo.lastName}</p>
                                            <p className="text-xs text-gray-500">{employee.reportingTo.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No reporting manager assigned.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "attendance" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Clock size={18} className="text-blue-500"/> Attendance Breakdown
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={attendanceData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {attendanceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Current Month Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Total Present Days</span>
                                    <span className="text-green-600 font-bold text-lg">{attendanceSummary.present}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Late Arrivals</span>
                                    <span className="text-amber-500 font-bold text-lg">{attendanceSummary.late}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Absent</span>
                                    <span className="text-red-500 font-bold text-lg">{attendanceSummary.absent}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Attendance Detailed Table */}
                        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm mt-6 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    Daily Attendance Log
                                    {loadingAttendance && <span className="text-sm font-normal text-blue-500 animate-pulse">(Loading...)</span>}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600">Filter:</span>
                                    <input 
                                        type="month" 
                                        value={attendanceMonth}
                                        onChange={(e) => setAttendanceMonth(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Check In</th>
                                            <th className="p-4">Check Out</th>
                                            <th className="p-4">Shift</th>
                                            <th className="p-4">Hours</th>
                                            <th className="p-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attendanceRecords.length > 0 ? attendanceRecords.map((record, idx) => {
                                            const formatTime = (dateStr) => {
                                                if (!dateStr) return "—";
                                                return new Date(dateStr).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
                                            };
                                            const hours = record.workHours ? `${record.workHours.toFixed(1)}h` : "—";
                                            
                                            return (
                                            <tr key={record._id || idx} className="hover:bg-gray-50 transition">
                                                <td className="p-4">
                                                    <span className="font-medium text-gray-900">
                                                        {record.date ? new Date(record.date).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-sm font-medium text-green-600">{formatTime(record.checkIn)}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-sm font-medium text-rose-500">{formatTime(record.checkOut)}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                                                        {record.workShiftId?.name || "Regular"}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm font-medium text-gray-600">
                                                    {hours}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${
                                                        record.status?.toLowerCase() === "present" ? "bg-green-100 text-green-700" :
                                                        record.status?.toLowerCase() === "absent" ? "bg-red-100 text-red-700" :
                                                        "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                        {record.status} {record.isLate ? "(Late)" : ""}
                                                    </span>
                                                </td>
                                            </tr>
                                        )}) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-500 italic">
                                                    No attendance records found for this month.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "leaves" && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <CalendarDays size={18} className="text-teal-500"/> Leave Balances
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={leaveData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                                    <Legend />
                                    <Bar dataKey="Total" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Consumed" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeTab === "projects" && (
                    <div className="space-y-6">
                        {loadingProjects ? (
                            <div className="text-center py-8 text-gray-500">Loading projects...</div>
                        ) : userProjects.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {userProjects.map(project => (
                                    <div key={project._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition">
                                        <div 
                                            className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                                            onClick={() => handleProjectClick(project)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                                    <FolderGit2 size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">{project.name}</h3>
                                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            project.status === "active" ? "bg-green-100 text-green-700" :
                                                            project.status === "completed" ? "bg-blue-100 text-blue-700" :
                                                            "bg-gray-100 text-gray-700"
                                                        }`}>
                                                            {project.status?.toUpperCase() || "ACTIVE"}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="text-gray-400 hover:text-indigo-600 transition">
                                                <ChevronDown size={20} className={`transform transition-transform ${selectedProject?._id === project._id ? "rotate-180" : ""}`} />
                                            </button>
                                        </div>

                                        {/* Tasks Dropdown for the Project */}
                                        {selectedProject?._id === project._id && (
                                            <div className="border-t border-gray-100 bg-gray-50 p-6">
                                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                    <Target size={16} className="text-rose-500" /> Assigned Tasks in this Project
                                                </h4>
                                                
                                                {projectTasks.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {projectTasks.map(task => (
                                                            <div key={task._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                <div>
                                                                    <p className="font-semibold text-gray-800 text-sm">{task.title}</p>
                                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs font-medium shrink-0">
                                                                    <span className={`px-2 py-1 rounded-md ${
                                                                        task.priority === "high" || task.priority === "urgent" ? "bg-red-50 text-red-600" : 
                                                                        task.priority === "medium" ? "bg-yellow-50 text-yellow-600" : 
                                                                        "bg-blue-50 text-blue-600"
                                                                    }`}>
                                                                        Priority: {task.priority?.toUpperCase()}
                                                                    </span>
                                                                    <span className={`px-2 py-1 rounded-md ${
                                                                        task.status === "done" ? "bg-green-50 text-green-600" : 
                                                                        task.status === "in_progress" ? "bg-purple-50 text-purple-600" : 
                                                                        "bg-gray-100 text-gray-600"
                                                                    }`}>
                                                                        {task.status?.replace("_", " ")?.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic bg-white p-4 rounded-xl border border-dashed border-gray-200">No tasks currently assigned to this employee in this project.</p>
                                                )}

                                                {project.fileBundles?.length > 0 && (
                                                    <div className="mt-8 pt-6 border-t border-gray-200">
                                                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                            <FolderGit2 size={16} className="text-blue-500" /> Project Files & Bundles
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {project.fileBundles.map(bundle => (
                                                                <div key={bundle._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                                                                    <h5 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                                                                        <FileText size={16} className="text-indigo-500" /> {bundle.name}
                                                                    </h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {bundle.files?.length > 0 ? bundle.files.map(file => (
                                                                            <a key={file._id} href={file.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition flex items-center gap-1 border border-indigo-100 shadow-sm">
                                                                                <Download size={14} /> {file.name || 'View File'}
                                                                            </a>
                                                                        )) : (
                                                                            <span className="text-xs text-gray-400 italic">No files in this bundle</span>
                                                                        )}
                                                                        
                                                                        {bundle.links?.length > 0 && bundle.links.map(link => (
                                                                            <a key={link._id} href={link.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-100 transition flex items-center gap-1 border border-teal-100 shadow-sm">
                                                                                <ArrowRight size={14} /> {link.title || 'Link'}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FolderGit2 size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No Projects</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">This employee is not part of any active projects yet.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === "leads" && (
                    <div className="space-y-6">
                        {loadingLeads ? (
                            <div className="text-center py-8 text-gray-500">Loading leads...</div>
                        ) : (
                            <>
                                {/* Leads Summary Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-xs text-gray-500 font-medium uppercase mb-1">Total Assigned</p>
                                        <p className="text-2xl font-bold text-gray-800">{userLeads.length}</p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm text-center">
                                        <p className="text-xs text-blue-600 font-medium uppercase mb-1">New Leads</p>
                                        <p className="text-2xl font-bold text-blue-700">
                                            {userLeads.filter(l => l.status === "New Lead").length}
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm text-center">
                                        <p className="text-xs text-amber-600 font-medium uppercase mb-1">In Pipeline</p>
                                        <p className="text-2xl font-bold text-amber-700">
                                            {userLeads.filter(l => ["Contacted", "Meeting Scheduled", "Proposal Sent"].includes(l.status)).length}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm text-center">
                                        <p className="text-xs text-green-600 font-medium uppercase mb-1">Converted</p>
                                        <p className="text-2xl font-bold text-green-700">
                                            {userLeads.filter(l => l.status === "Sent to Project Team" || l.status === "Project Done").length}
                                        </p>
                                    </div>
                                </div>

                                {/* Leads List */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <h3 className="text-lg font-bold text-gray-800 p-6 border-b border-gray-100 flex items-center gap-2">
                                        <UserPlus size={18} className="text-blue-500" /> Assigned Leads Directory
                                    </h3>
                                    {userLeads.length > 0 ? (
                                        <div className="divide-y divide-gray-100">
                                            {userLeads.map(lead => (
                                                <div key={lead._id} className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-base">{lead.orgName}</h4>
                                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                                            {lead.contactPerson && <span className="flex items-center gap-1"><Circle size={8} className="fill-current text-gray-300"/> {lead.contactPerson}</span>}
                                                            <span className="flex items-center gap-1"><Phone size={14} /> {lead.contactNumber}</span>
                                                            {lead.email && <span className="flex items-center gap-1"><Mail size={14} /> {lead.email}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                                            lead.status === "New Lead" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            lead.status === "Sent to Project Team" || lead.status === "Project Done" ? "bg-green-50 text-green-700 border-green-200" :
                                                            lead.status === "Cancelled" || lead.status === "On Hold" ? "bg-red-50 text-red-700 border-red-200" :
                                                            "bg-amber-50 text-amber-700 border-amber-200"
                                                        }`}>
                                                            {lead.status}
                                                        </span>
                                                        <button 
                                                            onClick={() => navigate(`/leads`)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="View in Leads Module"
                                                        >
                                                            <ArrowRight size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-gray-500">
                                            <p>No leads assigned to this employee yet.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === "helpdesk" && (
                    <div className="space-y-6">
                        {loadingTickets ? (
                            <div className="text-center py-8 text-gray-500">Loading tickets...</div>
                        ) : userTickets.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <h3 className="text-lg font-bold text-gray-800 p-6 border-b border-gray-100 flex items-center gap-2">
                                    <LifeBuoy size={18} className="text-red-500" /> IT & HR Helpdesk Tickets
                                </h3>
                                <div className="divide-y divide-gray-100">
                                    {userTickets.map(ticket => (
                                        <div key={ticket._id} className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800 text-base">{ticket.subject}</h4>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ticket.description}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                    {ticket.projectId?.name && <span>Project: {ticket.projectId.name}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                                    ticket.priority === "Urgent" || ticket.priority === "High" ? "bg-red-50 text-red-700 border-red-200" :
                                                    ticket.priority === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                                }`}>
                                                    Priority: {ticket.priority}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                                    ticket.status === "Open" ? "bg-red-50 text-red-700 border-red-200" :
                                                    ticket.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    "bg-green-50 text-green-700 border-green-200"
                                                }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <LifeBuoy size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No Tickets</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">This employee has not raised any support tickets yet.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === "offer_letter" && (
                    <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} className="text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Employee Offer Letter</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto mb-6">
                            You can download the officially generated offer letter PDF for this employee.
                        </p>
                        <button 
                            onClick={handleDownloadOfferLetter}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition flex items-center justify-center mx-auto gap-2 shadow-sm shadow-blue-500/30"
                        >
                            <Download size={18} /> Download Offer Letter
                        </button>
                    </div>
                )}

                {activeTab === "nda_signatures" && (
                    <div className="space-y-6">
                        {loadingSignatures ? (
                            <div className="text-center py-8 text-gray-500">Loading NDA Signatures...</div>
                        ) : employeeSignatures.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <h3 className="text-lg font-bold text-gray-800 p-6 border-b border-gray-100 flex items-center gap-2">
                                    <FileSignature size={18} className="text-purple-500" /> Signed NDAs
                                </h3>
                                <div className="divide-y divide-gray-100">
                                    {employeeSignatures.map(sig => (
                                        <div key={sig._id} className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800 text-base">{sig.ndaId?.title || "Unknown NDA"}</h4>
                                                <p className="text-sm text-gray-500 mt-1">Signed on: {new Date(sig.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {sig.signedDocumentUrl ? (
                                                    <a 
                                                        href={sig.signedDocumentUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition flex items-center gap-2"
                                                    >
                                                        <FileText size={16} /> View Document
                                                    </a>
                                                ) : (
                                                    <span className="px-4 py-2 bg-gray-50 text-gray-500 rounded-lg text-sm font-medium border border-gray-200">No Document</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FileSignature size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No NDA Signatures</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">This employee has not signed any NDAs yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "payroll" && (
                    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <IndianRupee size={32} className="text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Salary & Payslips</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Access salary structures, bonuses, deductions, and downloadable monthly payslips.</p>
                    </div>
                )}

                {activeTab === "personal_info" && (
                    <div className="space-y-6">
                        {onboardingData ? (
                            <>
                                {/* Personal Details */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-blue-500"/> Personal Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-y-6 gap-x-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Permanent Address</p>
                                            <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.permanentAddress || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Current Address</p>
                                            <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.currentAddress || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Alternate Mobile</p>
                                            <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.alternateMobile || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">LinkedIn Profile</p>
                                            <p className="text-sm font-medium text-gray-900 mt-1 text-blue-600">
                                                {onboardingData.linkedInProfile ? <a href={onboardingData.linkedInProfile} target="_blank" rel="noreferrer">View Profile</a> : "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Years of Experience</p>
                                            <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.yearsOfExperience !== undefined ? `${onboardingData.yearsOfExperience} years` : "—"}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                                <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">Personal Information not available.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "previous_company" && (
                    <div className="space-y-6">
                        {onboardingData?.previousCompany ? (
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <Building2 size={20} className="text-indigo-500"/> Previous Company Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-8 gap-x-6">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Company Name</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.name || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Designation</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.designation || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Employee ID</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.employeeId || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Last In-Hand Salary</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">₹ {onboardingData.previousCompany.lastSalary?.toLocaleString() || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Date of Joining</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                            {onboardingData.previousCompany.dateOfJoining ? new Date(onboardingData.previousCompany.dateOfJoining).toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Last Working Day</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                            {onboardingData.previousCompany.dateOfLastWorkingDay ? new Date(onboardingData.previousCompany.dateOfLastWorkingDay).toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Website</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1 text-blue-600">
                                            {onboardingData.previousCompany.website ? <a href={onboardingData.previousCompany.website} target="_blank" rel="noreferrer">Visit Website</a> : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">LinkedIn Profile</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1 text-blue-600">
                                            {onboardingData.previousCompany.linkedInProfile ? <a href={onboardingData.previousCompany.linkedInProfile} target="_blank" rel="noreferrer">View Profile</a> : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">HR / Manager Name</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.hrName || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">HR Contact</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.hrContact || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">HR Email</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.hrEmail || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Official Email</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.officialEmail || "—"}</p>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Company Address</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.address || "—"}</p>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Reason for Leaving</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{onboardingData.previousCompany.reasonForLeaving || "—"}</p>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-4 mt-4 border-t border-gray-100 pt-6">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-semibold">Uploaded Documents</p>
                                        <div className="flex flex-wrap gap-4">
                                            {onboardingData.previousCompany.offerLetterFile?.url && (
                                                <a href={onboardingData.previousCompany.offerLetterFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Offer Letter
                                                </a>
                                            )}
                                            {onboardingData.previousCompany.experienceLetterFile?.url && (
                                                <a href={onboardingData.previousCompany.experienceLetterFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Experience Letter
                                                </a>
                                            )}
                                            {onboardingData.previousCompany.relievingLetterFile?.url && (
                                                <a href={onboardingData.previousCompany.relievingLetterFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Relieving Letter
                                                </a>
                                            )}
                                            {onboardingData.previousCompany.salarySlipsFile?.url && (
                                                <a href={onboardingData.previousCompany.salarySlipsFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Salary Slips
                                                </a>
                                            )}
                                            {(!onboardingData.previousCompany.offerLetterFile?.url && !onboardingData.previousCompany.experienceLetterFile?.url && !onboardingData.previousCompany.relievingLetterFile?.url && !onboardingData.previousCompany.salarySlipsFile?.url) && (
                                                <span className="text-sm text-gray-500 italic">No documents uploaded.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
                                <h3 className="text-xl font-bold text-gray-800">No Onboarding Data</h3>
                                <p className="text-sm text-gray-500 mt-2">This employee has not submitted onboarding information.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "assets" && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Laptop size={18} className="text-indigo-500"/> Assigned Assets
                        </h3>
                        {loadingAssets ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : userAssets.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userAssets.map(asset => (
                                    <div key={asset._id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition bg-gray-50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                                                <Laptop size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800">{asset.name || asset.assetName}</h4>
                                                <p className="text-xs text-gray-500">{asset.category || "General"}</p>
                                            </div>
                                        </div>
                                        {asset.serialNumber && (
                                            <div className="text-sm text-gray-600 mb-1">
                                                <span className="font-medium">S/N:</span> {asset.serialNumber}
                                            </div>
                                        )}
                                        <div className="mt-3 inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md">
                                            {asset.status || "Assigned"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Laptop size={24} className="text-gray-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-700">No Assets Assigned</h4>
                                <p className="text-sm text-gray-500 mt-1">This employee currently has no company assets assigned.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "bank_details" && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <BankDetailsComponent employeeId={employee._id} isAdminView={true} />
                    </div>
                )}

                {activeTab === "documents" && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FileText size={18} className="text-orange-500"/> Uploaded Documents
                        </h3>
                        {onboardingData ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[
                                    { key: "cvFile", label: "CV / Resume" },
                                    { key: "aadharFront", label: "Aadhar Front" },
                                    { key: "aadharBack", label: "Aadhar Back" },
                                    { key: "panCard", label: "PAN Card" },
                                    { key: "bankPassbook", label: "Bank Passbook" },
                                    { key: "highSchoolCertificate", label: "10th Certificate" },
                                    { key: "intermediateCertificate", label: "12th Certificate" },
                                    { key: "graduationCertificate", label: "Graduation Certificate" }
                                ].map(doc => onboardingData[doc.key] && onboardingData[doc.key].url ? (
                                    <div key={doc.key} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition">
                                        <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-3">
                                            <FileText size={20} />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800 mb-1">{doc.label}</p>
                                        <a href={onboardingData[doc.key].url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                            View Document
                                        </a>
                                    </div>
                                ) : null)}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-gray-500">No documents found. Employee hasn't completed onboarding.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeProfile;
