import React, { useEffect, useState, useRef } from "react";
import { getImageUrl } from "../../../utils/imageUtils";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
    ChevronLeft, Mail, Phone, MapPin, Building2, Briefcase, 
    CalendarDays, Clock, FileText, IndianRupee, Laptop, AlertCircle,
    MoreVertical, Target, Award, CheckCircle2, TrendingUp, Circle, ChevronDown, FolderGit2, ArrowRight, UserPlus, PalmtreeIcon, LifeBuoy, FileSignature, Download, Banknote,
    Lock, ShieldCheck, Printer, Eye, Receipt, CreditCard, Layers, X, ExternalLink
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
import { getClientFinances } from "../../payments/services/paymentService";
import { getClientQuotes, getQuoteHTML, printPDFFromHTML } from "../../leads/services/quoteService";
import QuoteDocumentView from "../../leads/components/QuoteDocumentView";
import api from "../../../services/axios";
import { useStore } from "../../../context/StoreContext";
import { useSecurity } from "../../../context/SecurityContext";
import { PayslipModal } from "../../payroll/pages/Payroll";
import { getUserStructures, getPayrollRuns } from "../../payroll/services/payrollService";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Swal from "sweetalert2";
import OfferLetter from "../../onboarding/pages/OfferLetter";
import OfferLetterViewer from "../components/OfferLetterViewer";
import PaymentReceiptModal from "../../payments/components/PaymentReceiptModal";

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const { user: currentUser } = useStore();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(tabParam || "overview");

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);
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

    // Client Finances State
    const [clientFinances, setClientFinances] = useState(null);
    const [loadingFinances, setLoadingFinances] = useState(false);
    const [selectedFinanceProject, setSelectedFinanceProject] = useState(null);
    const [previewPaymentReceipt, setPreviewPaymentReceipt] = useState(null);
    const [officialSlipModal, setOfficialSlipModal] = useState(null);

    // Client Proposals State
    const [clientQuotes, setClientQuotes] = useState([]);
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [selectedQuoteForModal, setSelectedQuoteForModal] = useState(null);
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);

    // Payroll State
    const { isUnlocked, requestUnlock } = useSecurity();
    const [userSalaryStructures, setUserSalaryStructures] = useState([]);
    const [userPayrollRuns, setUserPayrollRuns] = useState([]);
    const [loadingPayroll, setLoadingPayroll] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState(null);

    const fmtSalary = (n) => {
        if (n === "••••••" || (typeof n === "string" && n.includes("•"))) return "••••••";
        return `₹${Number(n || 0).toLocaleString("en-IN")}`;
    };

    const fetchUserPayroll = async () => {
        try {
            setLoadingPayroll(true);
            const [structRes, runsRes] = await Promise.allSettled([
                getUserStructures(id),
                getPayrollRuns({ userId: id })
            ]);

            if (structRes.status === "fulfilled" && structRes.value?.structures) {
                setUserSalaryStructures(structRes.value.structures);
            }
            if (runsRes.status === "fulfilled" && runsRes.value?.runs) {
                setUserPayrollRuns(runsRes.value.runs);
            }
        } catch (err) {
            console.error("Payroll load error", err);
        } finally {
            setLoadingPayroll(false);
        }
    };

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
                        const balancesRes = await getUserBalance(id);
                        const rawBalances = balancesRes?.balances || balancesRes?.data || (Array.isArray(balancesRes) ? balancesRes : []);
                        const formattedLeaves = rawBalances.map(l => {
                            const name = l.leaveTypeId?.name || l.leaveType?.name || 'Leave';
                            const total = (l.allocated || 0) + (l.carried || 0) || (l.totalLeaves || 0) || (l.total || 0);
                            const consumed = l.used || l.consumedLeaves || 0;
                            const remaining = l.remaining !== undefined 
                                ? l.remaining 
                                : Math.max(0, total - consumed - (l.pending || 0));
                            return {
                                name,
                                code: l.leaveTypeId?.code || l.leaveType?.code || "",
                                Total: total,
                                Consumed: consumed,
                                Remaining: remaining,
                                isPaid: l.leaveTypeId?.isPaid,
                                allocated: l.allocated || 0,
                                carried: l.carried || 0,
                                used: consumed,
                                pending: l.pending || 0
                            };
                        });
                        setLeaveData(formattedLeaves);
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
                    const filtered = projectsList.filter(p => {
                        const isMember = p.members?.some(m => (m?._id || m)?.toString() === id?.toString());
                        const isClientOfProj = p.clientIds?.some(c => (c?._id || c)?.toString() === id?.toString());
                        const isCreator = (p.createdBy?._id || p.createdBy)?.toString() === id?.toString();
                        return isMember || isClientOfProj || isCreator;
                    });
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

        if (activeTab === "finances" && !clientFinances) {
            setLoadingFinances(true);
            getClientFinances(id).then(res => {
                if (res?.success) {
                    setClientFinances(res);
                }
            }).catch(console.error).finally(() => setLoadingFinances(false));
        }

        if (activeTab === "proposals" && clientQuotes.length === 0) {
            setLoadingQuotes(true);
            getClientQuotes(id).then(res => {
                if (res?.success) {
                    setClientQuotes(res.quotes || []);
                }
            }).catch(console.error).finally(() => setLoadingQuotes(false));
        }

        if (activeTab === "payroll") {
            fetchUserPayroll();
        }
    }, [activeTab, id, isUnlocked]);

    const isClient = (employee?.role?.name || employee?.role || "").toString().toLowerCase() === "client";

    useEffect(() => {
        if (isClient && !["overview", "projects", "finances", "proposals", "nda_signatures"].includes(activeTab)) {
            setActiveTab("overview");
        }
    }, [isClient, activeTab]);

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
            let errMsg = 'Could not download offer letter. Make sure employee is fully approved.';
            if (error.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const parsed = JSON.parse(text);
                    if (parsed.message) errMsg = parsed.message;
                } catch (_) {}
            } else if (error.response?.data?.message) {
                errMsg = error.response.data.message;
            }
            Swal.fire('Error', errMsg, 'error');
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
                const tasksList = res.data.data || res.data.tasks || [];
                const empTasks = isClient ? tasksList : tasksList.filter(t => 
                    t.assignedTo?.some(u => (u._id || u)?.toString() === id?.toString())
                );
                setProjectTasks(empTasks);
            }
        } catch (e) { console.error("Error fetching tasks", e); }
    };

    const handlePrintQuote = async (quoteId) => {
        try {
            Swal.fire({
                title: "Loading Proposal...",
                text: "Preparing document for print / PDF download.",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            const html = await getQuoteHTML(quoteId);
            Swal.close();
            await printPDFFromHTML(html);
        } catch (e) {
            console.error("Print error", e);
            Swal.fire("Error", "Could not generate proposal PDF for printing.", "error");
        }
    };

    const TABS = isClient ? [
        { id: "overview", label: "Overview", icon: Briefcase },
        { id: "projects", label: "Projects", icon: FolderGit2 },
        { id: "finances", label: "Payments & Finances", icon: IndianRupee },
        { id: "proposals", label: "Final Proposals", icon: FileText },
        { id: "nda_signatures", label: "NDA Signatures", icon: FileSignature }
    ] : [
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
                            <img src={getImageUrl(employee.profilePic.url)} alt="Profile" className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-lg border-4 border-white" />
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
                            {employee.role?.name || "Employee"}{employee.employeeCode ? ` • ${employee.employeeCode}` : ""}
                        </p>
                        
                        <div className="mt-4 flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-gray-600">
                            {employee.department?.name && (
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    <Building2 size={16} className="text-gray-400" />
                                    <span>{employee.department.name}</span>
                                </div>
                            )}
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
                    isClient ? (
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Briefcase size={20} className="text-blue-600" /> Client Overview
                                </h3>
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider">
                                    Active Client
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Client Name</p>
                                    <p className="text-base font-semibold text-gray-900 mt-1">{employee.firstName} {employee.lastName}</p>
                                </div>
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Email Address</p>
                                    <p className="text-base font-medium text-gray-900 mt-1">{employee.email || "—"}</p>
                                </div>
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Phone Number</p>
                                    <p className="text-base font-medium text-gray-900 mt-1">{employee.phone || "—"}</p>
                                </div>
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Company / Organization</p>
                                    <p className="text-base font-medium text-gray-900 mt-1">{employee.companyId?.name || "—"}</p>
                                </div>
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Current Address</p>
                                    <p className="text-base font-medium text-gray-900 mt-1">{employee.currentAddress || employee.address || "—"}</p>
                                </div>
                                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Joined / Registered Date</p>
                                    <p className="text-base font-medium text-gray-900 mt-1">
                                        {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                                            <img src={getImageUrl(employee.reportingTo.profilePic.url)} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
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
                    )
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
                    <div className="space-y-6">
                        {/* Leave Type Cards Grid */}
                        {leaveData.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {leaveData.map((l, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-gray-800 text-sm">{l.name}</span>
                                            {l.code && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-bold border border-teal-100">
                                                    {l.code}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-2xl font-bold text-gray-900">{l.Remaining}</span>
                                            <span className="text-xs text-gray-400">/ {l.Total} days remaining</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                                                style={{ width: `${l.Total > 0 ? Math.min(100, Math.round((l.Consumed / l.Total) * 100)) : 0}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] text-gray-400 mt-2">
                                            <span>Consumed: <strong>{l.Consumed}d</strong></span>
                                            {l.pending > 0 && <span className="text-amber-600 font-medium">Pending: {l.pending}d</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Chart Box */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <CalendarDays size={18} className="text-teal-500"/> Leave Balances
                            </h3>
                            {leaveData.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <PalmtreeIcon size={36} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm font-medium text-gray-600">No leave balance records found for this employee</p>
                                    <p className="text-xs text-gray-400 mt-1">Leave balances can be assigned in Leave Management &gt; Assign Leave.</p>
                                </div>
                            ) : (
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
                            )}
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
                                                    <Target size={16} className="text-rose-500" /> {isClient ? "Project Tasks & Milestones" : "Assigned Tasks in this Project"}
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
                                                    <p className="text-sm text-gray-500 italic bg-white p-4 rounded-xl border border-dashed border-gray-200">{isClient ? "No tasks currently recorded for this project." : "No tasks currently assigned to this employee in this project."}</p>
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
                                                                            <a key={file._id} href={getImageUrl(file.url)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition flex items-center gap-1 border border-indigo-100 shadow-sm">
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
                                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                                    {isClient ? "This client is not linked to any projects yet." : "This employee is not part of any active projects yet."}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "finances" && (
                    <div className="space-y-8">
                        {loadingFinances ? (
                            <div className="text-center py-12 text-gray-500 font-medium">Loading payments & finances...</div>
                        ) : (
                            <>
                                {/* 1. Finance Metric Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
                                        <div className="flex items-center justify-between opacity-90">
                                            <span className="text-xs font-semibold uppercase tracking-wider">Total Deal Value</span>
                                            <Layers size={20} />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-extrabold mt-3">
                                            ₹{(clientFinances?.summary?.totalValuation || 0).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-blue-100 mt-1 font-medium">
                                            Across {clientFinances?.summary?.totalProjects || 0} project(s)
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md">
                                        <div className="flex items-center justify-between opacity-90">
                                            <span className="text-xs font-semibold uppercase tracking-wider">Total Received (Paid)</span>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-extrabold mt-3">
                                            ₹{(clientFinances?.summary?.totalReceived || 0).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-emerald-100 mt-1 font-medium">
                                            Verified approved payments
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white shadow-md">
                                        <div className="flex items-center justify-between opacity-90">
                                            <span className="text-xs font-semibold uppercase tracking-wider">Total Remaining (Due)</span>
                                            <AlertCircle size={20} />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-extrabold mt-3">
                                            ₹{(clientFinances?.summary?.totalDue || 0).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-rose-100 mt-1 font-medium">
                                            Pending balance to receive
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
                                        <div className="flex items-center justify-between opacity-90">
                                            <span className="text-xs font-semibold uppercase tracking-wider">Under Verification</span>
                                            <Clock size={20} />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-extrabold mt-3">
                                            ₹{(clientFinances?.summary?.totalPendingApproval || 0).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-xs text-purple-100 mt-1 font-medium">
                                            Submitted & pending approval
                                        </p>
                                    </div>
                                </div>

                                {/* 2. Projects Breakdown */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                <IndianRupee size={20} className="text-blue-600" /> Project-wise Payment Status
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Detailed payment breakdown for every project linked to this client
                                            </p>
                                        </div>
                                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                            {clientFinances?.projects?.length || 0} Projects
                                        </span>
                                    </div>

                                    {clientFinances?.projects?.length > 0 ? (
                                        <div className="divide-y divide-gray-100">
                                            {clientFinances.projects.map((proj) => {
                                                const dealPrice = proj.price || 0;
                                                const received = proj.receivedAmount || 0;
                                                const due = proj.dueAmount || 0;
                                                const pct = dealPrice > 0 ? Math.min(100, Math.round((received / dealPrice) * 100)) : (received > 0 ? 100 : 0);
                                                const isExpanded = selectedFinanceProject === proj._id;

                                                return (
                                                    <div key={proj._id} className="p-6 hover:bg-slate-50/50 transition">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3">
                                                                    <h4 className="text-base font-bold text-gray-900">{proj.name}</h4>
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                                                        proj.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" :
                                                                        proj.paymentStatus === "partial" ? "bg-amber-100 text-amber-800" :
                                                                        "bg-rose-100 text-rose-800"
                                                                    }`}>
                                                                        {proj.paymentStatus === "paid" ? "Fully Paid" : proj.paymentStatus === "partial" ? "Partially Paid" : "Unpaid"}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    Project Status: <span className="font-medium text-gray-700 capitalize">{proj.status?.replace("_", " ") || "Active"}</span>
                                                                </p>
                                                            </div>

                                                            {/* Amounts */}
                                                            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center shrink-0">
                                                                <div className="bg-gray-50 px-3 sm:px-4 py-2 rounded-xl border border-gray-100">
                                                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Deal Price</p>
                                                                    <p className="text-sm sm:text-base font-bold text-gray-800 mt-0.5">₹{dealPrice.toLocaleString("en-IN")}</p>
                                                                </div>
                                                                <div className="bg-emerald-50 px-3 sm:px-4 py-2 rounded-xl border border-emerald-100">
                                                                    <p className="text-[11px] text-emerald-600 uppercase font-semibold">Paid</p>
                                                                    <p className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">₹{received.toLocaleString("en-IN")}</p>
                                                                </div>
                                                                <div className="bg-rose-50 px-3 sm:px-4 py-2 rounded-xl border border-rose-100">
                                                                    <p className="text-[11px] text-rose-600 uppercase font-semibold">Remaining Due</p>
                                                                    <p className="text-sm sm:text-base font-bold text-rose-700 mt-0.5">₹{due.toLocaleString("en-IN")}</p>
                                                                </div>
                                                            </div>

                                                            {/* Toggle Transactions Button */}
                                                            <button 
                                                                onClick={() => setSelectedFinanceProject(isExpanded ? null : proj._id)}
                                                                className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                                                            >
                                                                <Receipt size={14} />
                                                                <span>{proj.recentPayments?.length || 0} Receipts</span>
                                                                <ChevronDown size={14} className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                            </button>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="mt-4">
                                                            <div className="flex justify-between text-xs text-gray-500 font-medium mb-1">
                                                                <span>Payment Recovery</span>
                                                                <span>{pct}% Paid ({`₹${received.toLocaleString("en-IN")} / ₹${dealPrice.toLocaleString("en-IN")}`})</span>
                                                            </div>
                                                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-500 rounded-full ${
                                                                        pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gray-300"
                                                                    }`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Project Transactions Dropdown */}
                                                        {isExpanded && (
                                                            <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/70 p-4 rounded-xl">
                                                                <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                    <Receipt size={14} className="text-blue-500" /> Project Payments & Receipts
                                                                </h5>
                                                                {proj.recentPayments?.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {proj.recentPayments.map((pay) => (
                                                                            <div key={pay._id} className="bg-white p-3 rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                                        <IndianRupee size={16} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm font-bold text-gray-800">
                                                                                            ₹{Number(pay.amount || 0).toLocaleString("en-IN")}
                                                                                        </p>
                                                                                        <p className="text-xs text-gray-500">
                                                                                            Txn ID: <span className="font-mono text-gray-700">{pay.transactionId || "—"}</span> • {pay.createdAt ? new Date(pay.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-3">
                                                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                                                        pay.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                                                                                        pay.status === "pending" ? "bg-amber-100 text-amber-800" :
                                                                                        "bg-rose-100 text-rose-800"
                                                                                    }`}>
                                                                                        {pay.status?.toUpperCase() || "PENDING"}
                                                                                    </span>

                                                                                    {pay.status === "approved" && (
                                                                                        <button 
                                                                                            onClick={() => setOfficialSlipModal(pay)}
                                                                                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition flex items-center gap-1 shadow-sm"
                                                                                            title="View & Download Official DigiCoders Payment Slip"
                                                                                        >
                                                                                            <Receipt size={12} /> Slip
                                                                                        </button>
                                                                                    )}

                                                                                    {pay.screenshot?.url && (
                                                                                        <button 
                                                                                            onClick={() => setPreviewPaymentReceipt(pay)}
                                                                                            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
                                                                                            title="View Uploaded Proof Screenshot"
                                                                                        >
                                                                                            <Eye size={12} /> Proof
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-gray-400 italic">No payments uploaded for this project yet.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-gray-500 text-sm">
                                            No projects linked to this client yet.
                                        </div>
                                    )}
                                </div>

                                {/* 3. Overall Transaction History Table */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                <Receipt size={20} className="text-emerald-600" /> All Payment Transactions
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Complete timeline of all transaction slips and bank transfers submitted
                                            </p>
                                        </div>
                                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                            {clientFinances?.payments?.length || 0} Transactions
                                        </span>
                                    </div>

                                    {clientFinances?.payments?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-600">
                                                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-400 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-4">Date</th>
                                                        <th className="px-6 py-4">Project</th>
                                                        <th className="px-6 py-4">Transaction ID / UTR</th>
                                                        <th className="px-6 py-4">Amount</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4">Remark</th>
                                                        <th className="px-6 py-4 text-right">Proof</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {clientFinances.payments.map((p) => (
                                                        <tr key={p._id} className="hover:bg-gray-50/50 transition">
                                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                                                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                                                            </td>
                                                            <td className="px-6 py-4 font-semibold text-gray-800">
                                                                {p.projectId?.name || "General / Unlinked"}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-gray-700">
                                                                {p.transactionId || "—"}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                                ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                    p.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                                                                    p.status === "pending" ? "bg-amber-100 text-amber-800" :
                                                                    "bg-rose-100 text-rose-800"
                                                                }`}>
                                                                    {p.status?.toUpperCase() || "PENDING"}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                                                {p.remark || "—"}
                                                            </td>
                                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {p.status === "approved" && (
                                                                        <button 
                                                                            onClick={() => setOfficialSlipModal(p)}
                                                                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition inline-flex items-center gap-1 shadow-sm"
                                                                            title="Download Official DigiCoders Payment Slip"
                                                                        >
                                                                            <Receipt size={13} /> Official Slip
                                                                        </button>
                                                                    )}
                                                                    {p.screenshot?.url ? (
                                                                        <button 
                                                                            onClick={() => setPreviewPaymentReceipt(p)}
                                                                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition inline-flex items-center gap-1"
                                                                            title="View Uploaded Payment Proof"
                                                                        >
                                                                            <Eye size={12} /> Proof
                                                                        </button>
                                                                    ) : (
                                                                        p.status !== "approved" && <span className="text-xs text-gray-400 italic">No proof</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-gray-500 text-sm">
                                            No payment transactions recorded for this client yet.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === "proposals" && (
                    <div className="space-y-6">
                        {loadingQuotes ? (
                            <div className="text-center py-12 text-gray-500 font-medium">Loading final proposals & quotes...</div>
                        ) : clientQuotes.length > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            <FileText size={20} className="text-blue-600" /> Final Project Proposals & Quotations
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Official project proposals, scope specifications, tech stack, and financial estimates
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                                        {clientQuotes.length} Proposal(s) Available
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {clientQuotes.map((quote) => {
                                        const isExpanded = expandedQuoteId === quote._id;
                                        return (
                                            <div key={quote._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition">
                                                <div className="p-6">
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2.5">
                                                                <h4 className="text-xl font-bold text-gray-900">
                                                                    {quote.systemName || quote.title || "Project Proposal"}
                                                                </h4>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                    quote.status === "accepted" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                                                    quote.status === "sent" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                                                    "bg-gray-100 text-gray-700 border border-gray-200"
                                                                }`}>
                                                                    {quote.status === "accepted" ? "Final / Accepted" : quote.status?.toUpperCase() || "DRAFT"}
                                                                </span>
                                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                                    {quote.proposedSystemCategory || "Software"}
                                                                </span>
                                                            </div>

                                                            {quote.linkedProject && (
                                                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                                                                    <FolderGit2 size={14} className="text-blue-500" />
                                                                    Linked Active Project: <span className="font-semibold text-gray-800">{quote.linkedProject.name}</span>
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            <button 
                                                                onClick={() => setSelectedQuoteForModal(quote)}
                                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                                                            >
                                                                <Eye size={14} /> View Proposal
                                                            </button>
                                                            <button 
                                                                onClick={() => handlePrintQuote(quote._id)}
                                                                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                                                            >
                                                                <Printer size={14} /> Print / PDF
                                                            </button>
                                                            <button
                                                                onClick={() => setExpandedQuoteId(isExpanded ? null : quote._id)}
                                                                className="px-3 py-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
                                                            >
                                                                <ChevronDown size={18} className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Financial & Scope Summary */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                                                        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 text-center">
                                                            <p className="text-[11px] font-semibold uppercase text-emerald-700 tracking-wider">Grand Total</p>
                                                            <p className="text-lg sm:text-xl font-extrabold text-emerald-900 mt-0.5">
                                                                ₹{(quote.grandTotal || 0).toLocaleString("en-IN")}
                                                            </p>
                                                        </div>
                                                        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                                                            <p className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Pages / Modules Cost</p>
                                                            <p className="text-base sm:text-lg font-bold text-gray-800 mt-0.5">
                                                                ₹{(quote.totalPagesCost || 0).toLocaleString("en-IN")}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400">{quote.pages?.length || 0} modules</p>
                                                        </div>
                                                        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                                                            <p className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Other Requirements</p>
                                                            <p className="text-base sm:text-lg font-bold text-gray-800 mt-0.5">
                                                                ₹{(quote.totalRequirementsCost || 0).toLocaleString("en-IN")}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400">{quote.otherRequirements?.length || 0} items</p>
                                                        </div>
                                                        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                                                            <p className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Created Date</p>
                                                            <p className="text-sm font-semibold text-gray-800 mt-1">
                                                                {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Tech Stack */}
                                                    {quote.techStack?.length > 0 && (
                                                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                                                            <span className="text-xs font-semibold text-gray-400 mr-1">Technologies:</span>
                                                            {quote.techStack.map((tech, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                                                                    {tech.label || tech.value}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Expandable Scope Breakdown */}
                                                    {isExpanded && (
                                                        <div className="mt-5 pt-5 border-t border-gray-100 space-y-5">
                                                            {quote.pages?.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                                        <Layers size={14} className="text-blue-500" /> Proposed Modules & Pages Breakdown
                                                                    </h5>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {quote.pages.map((p, pIdx) => (
                                                                            <div key={pIdx} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                                                <div className="flex justify-between items-start">
                                                                                    <p className="font-bold text-xs text-gray-800">{p.name}</p>
                                                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                                                        ₹{(p.cost || 0).toLocaleString("en-IN")}
                                                                                    </span>
                                                                                </div>
                                                                                {p.descriptions?.length > 0 && (
                                                                                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-gray-500 list-disc list-inside">
                                                                                        {p.descriptions.map((desc, dIdx) => (
                                                                                            <li key={dIdx} className="truncate">{desc}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {quote.otherRequirements?.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                                        <Target size={14} className="text-purple-500" /> Additional Requirements & Deliverables
                                                                    </h5>
                                                                    <div className="space-y-1.5">
                                                                        {quote.otherRequirements.map((r, rIdx) => (
                                                                            <div key={rIdx} className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex items-center justify-between text-xs">
                                                                                <span className="font-medium text-gray-800">{r.requirement} {r.term ? `(${r.term})` : ""}</span>
                                                                                <span className="font-bold text-gray-900">
                                                                                    {r.priceType === "client_side" ? "Client Side" : `₹${(r.price || 0).toLocaleString("en-IN")}`}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {quote.paymentTerms && (
                                                                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                                                                    <h5 className="text-xs font-bold text-blue-900 mb-1">Payment Terms & Milestones</h5>
                                                                    <p className="text-xs text-blue-800 whitespace-pre-wrap">{quote.paymentTerms}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FileText size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No Proposal Found</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                                    No official proposal document has been generated for this client yet. Proposals can be created from the CRM & Leads section.
                                </p>
                                {userProjects.length > 0 && (
                                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 max-w-md text-left">
                                        <p className="text-xs font-bold text-blue-900 uppercase">Linked Active Projects</p>
                                        <ul className="mt-2 space-y-1 text-xs text-blue-800">
                                            {userProjects.map(p => (
                                                <li key={p._id} className="flex justify-between">
                                                    <span>• {p.name}</span>
                                                    <span className="font-semibold">₹{Number(p.price || 0).toLocaleString("en-IN")}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
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
                    <div className="space-y-6">
                        <OfferLetterViewer
                            userId={id}
                            employeeName={`${employee.firstName} ${employee.lastName}`}
                        />
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
                                                        href={getImageUrl(sig.signedDocumentUrl)} 
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
                    <div className="space-y-6">
                        {/* Top Header Card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                                    <IndianRupee size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Salary & Compensation</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Salary structure, components breakdown, and monthly payslips history.</p>
                                </div>
                            </div>
                            <div>
                                {!isUnlocked ? (
                                    <button
                                        type="button"
                                        onClick={requestUnlock}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                                    >
                                        <Lock size={13} /> Unlock Salary (Enter PIN)
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
                                        <ShieldCheck size={14} className="text-green-600" /> AES-256 Unlocked
                                    </span>
                                )}
                            </div>
                        </div>

                        {loadingPayroll ? (
                            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                Loading payroll & salary records...
                            </div>
                        ) : (
                            <>
                                {/* Active Salary Structure Card */}
                                {userSalaryStructures && userSalaryStructures.length > 0 ? (
                                    (() => {
                                        const active = userSalaryStructures.find(s => s.isActive) || userSalaryStructures[0];
                                        return (
                                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Salary Structure</h4>
                                                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                                                            Active
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Effective: <strong className="text-gray-700">{active.effectiveFrom}</strong>
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                                                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Annual CTC</p>
                                                        <p className="text-xl font-bold text-gray-900 mt-1">{fmtSalary(active.ctc)}</p>
                                                    </div>
                                                    <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4">
                                                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Monthly Basic</p>
                                                        <p className="text-xl font-bold text-gray-900 mt-1">{fmtSalary(active.basic)}</p>
                                                    </div>
                                                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                                                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Gross Earnings</p>
                                                        <p className="text-xl font-bold text-gray-900 mt-1">{fmtSalary(active.grossEarnings)}</p>
                                                    </div>
                                                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
                                                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Net Take-Home</p>
                                                        <p className="text-xl font-bold text-gray-900 mt-1">{fmtSalary(active.netSalary)}</p>
                                                    </div>
                                                </div>

                                                {active.components && active.components.length > 0 && (
                                                    <div className="pt-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Salary Components Breakdown</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            {active.components.map((comp, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                                                                    <div>
                                                                        <span className="font-semibold text-gray-800">{comp.name}</span>
                                                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${comp.type === "earning" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                                            {comp.type}
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-mono font-bold text-gray-900">
                                                                        {comp.calcType === "percentage" ? `${comp.value}%` : fmtSalary(comp.value)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                                            <IndianRupee size={22} />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-800">No Salary Structure Defined</h4>
                                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                            A salary structure has not been configured yet for this employee.
                                        </p>
                                    </div>
                                )}

                                {/* Monthly Payslips Table */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Payslips & Payroll History</h4>
                                            <p className="text-xs text-gray-400 mt-0.5">Monthly processed salaries and issued payslips.</p>
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-lg">
                                            {userPayrollRuns.length} Record{userPayrollRuns.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {userPayrollRuns.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm font-medium text-gray-600">No payslips found for this employee</p>
                                            <p className="text-xs text-gray-400 mt-1">Payslips appear here once monthly payroll is run and approved.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-wider text-gray-500 font-semibold">
                                                        <th className="px-4 py-3 text-left">Month</th>
                                                        <th className="px-4 py-3 text-center">Working / Present</th>
                                                        <th className="px-4 py-3 text-center">LOP Days</th>
                                                        <th className="px-4 py-3 text-right">Gross Salary</th>
                                                        <th className="px-4 py-3 text-right">Deductions</th>
                                                        <th className="px-4 py-3 text-right">Net Take-Home</th>
                                                        <th className="px-4 py-3 text-center">Status</th>
                                                        <th className="px-4 py-3 text-center">Payslip</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {userPayrollRuns.map(run => {
                                                        const statusCls = {
                                                            paid: "bg-green-50 text-green-700 border-green-200",
                                                            approved: "bg-blue-50 text-blue-700 border-blue-200",
                                                            draft: "bg-amber-50 text-amber-700 border-amber-200"
                                                        }[run.status] || "bg-gray-50 text-gray-700";

                                                        return (
                                                            <tr key={run._id} className="hover:bg-gray-50/60 transition">
                                                                <td className="px-4 py-3 font-semibold text-gray-800">
                                                                    {run.month}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-gray-600">
                                                                    {run.presentDays} / {run.totalWorkingDays}
                                                                </td>
                                                                <td className="px-4 py-3 text-center font-medium text-red-600">
                                                                    {run.lopDays || 0}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-gray-700 font-medium">
                                                                    {fmtSalary(run.grossEarnings)}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-red-600 font-medium">
                                                                    {fmtSalary(run.totalDeductions)}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                                    {fmtSalary(run.netSalary)}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusCls}`}>
                                                                        {run.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedPayslip(run)}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition"
                                                                        title="View / Print Payslip"
                                                                    >
                                                                        <Eye size={12} /> View Slip
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Modal for Payslip View / Print */}
                        {selectedPayslip && (
                            <PayslipModal
                                run={selectedPayslip}
                                company={employee?.companyId}
                                onClose={() => setSelectedPayslip(null)}
                            />
                        )}
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
                                                <a href={getImageUrl(onboardingData.previousCompany.offerLetterFile.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Offer Letter
                                                </a>
                                            )}
                                            {onboardingData.previousCompany.experienceLetterFile?.url && (
                                                <a href={getImageUrl(onboardingData.previousCompany.experienceLetterFile.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Experience Letter
                                                </a>
                                            )}
                                            {onboardingData.previousCompany.relievingLetterFile?.url && (
                                                <a href={getImageUrl(onboardingData.previousCompany.relievingLetterFile.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
                                                    <FileText size={16} /> Relieving Letter
                                                </a>
                                            )}
                                            {onboardingData.previousCompany.salarySlipsFile?.url && (
                                                <a href={getImageUrl(onboardingData.previousCompany.salarySlipsFile.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100 shadow-sm">
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
                                    { key: "passportPhoto", label: "Passport Photo" },
                                    { key: "fullSizePhoto", label: "Full Size Photo" },
                                    { key: "highSchoolCertificate", label: "10th Certificate" },
                                    { key: "intermediateCertificate", label: "12th Certificate" },
                                    { key: "diplomaCertificate", label: "Diploma Certificate" },
                                    { key: "graduationCertificate", label: "Graduation Certificate" },
                                    { key: "offerLetterFile", label: "Previous Offer Letter", nested: "previousCompany" },
                                    { key: "experienceLetterFile", label: "Experience Letter", nested: "previousCompany" },
                                    { key: "relievingLetterFile", label: "Relieving Letter", nested: "previousCompany" },
                                    { key: "salarySlipsFile", label: "Salary Slips", nested: "previousCompany" }
                                ].map(doc => {
                                    const docObj = doc.nested ? onboardingData[doc.nested]?.[doc.key] : onboardingData[doc.key];
                                    return docObj && docObj.url ? (
                                        <div key={doc.key} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition">
                                            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-3">
                                                <FileText size={20} />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800 mb-1">{doc.label}</p>
                                            <a href={getImageUrl(docObj.url)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                                View Document
                                            </a>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-gray-500">No documents found. Employee hasn't completed onboarding.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal 1: Payment Receipt Screenshot Preview */}
                {previewPaymentReceipt && (
                    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Payment Receipt & Proof</h4>
                                    <p className="text-xs text-gray-500">
                                        Txn ID: <span className="font-mono text-gray-700">{previewPaymentReceipt.transactionId}</span> • ₹{Number(previewPaymentReceipt.amount || 0).toLocaleString("en-IN")}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setPreviewPaymentReceipt(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-gray-900/5">
                                <img 
                                    src={getImageUrl(previewPaymentReceipt.screenshot?.url)} 
                                    alt="Payment Proof" 
                                    className="max-h-[65vh] w-auto rounded-lg shadow-md object-contain"
                                />
                            </div>
                            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                                <a 
                                    href={getImageUrl(previewPaymentReceipt.screenshot?.url)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5"
                                >
                                    <ExternalLink size={14} /> Open Full Size
                                </a>
                                <button 
                                    onClick={() => setPreviewPaymentReceipt(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal 2: Full Proposal Document View */}
                {selectedQuoteForModal && (
                    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
                        <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-blue-400" />
                                    <div>
                                        <h4 className="font-bold text-sm sm:text-base">
                                            {selectedQuoteForModal.systemName || selectedQuoteForModal.title}
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Grand Total: ₹{(selectedQuoteForModal.grandTotal || 0).toLocaleString("en-IN")} • {selectedQuoteForModal.proposedSystemCategory || "Software"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handlePrintQuote(selectedQuoteForModal._id)}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs"
                                    >
                                        <Printer size={14} /> Print / Save PDF
                                    </button>
                                    <button 
                                        onClick={() => setSelectedQuoteForModal(null)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
                                <QuoteDocumentView quote={selectedQuoteForModal} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal 3: Official DigiCoders Payment Receipt / Slip */}
                {officialSlipModal && (
                    <PaymentReceiptModal
                        payment={officialSlipModal}
                        company={currentUser?.companyId}
                        onClose={() => setOfficialSlipModal(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default EmployeeProfile;
