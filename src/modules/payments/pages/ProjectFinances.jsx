import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
    IndianRupee, 
    FolderKanban, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Search, 
    Filter, 
    RefreshCw, 
    ExternalLink, 
    Eye, 
    X, 
    ArrowUpRight,
    TrendingUp,
    Users,
    Receipt
} from "lucide-react";
import { getProjectFinances } from "../services/paymentService";
import { getImageUrl } from "../../../utils/imageUtils";
import { toast } from "react-toastify";

const ProjectFinances = () => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        totalValuation: 0,
        totalReceived: 0,
        totalDue: 0,
        totalPendingApproval: 0,
        totalProjects: 0,
        fullyPaidProjects: 0,
        partialProjects: 0,
        unpaidProjects: 0,
    });
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedProject, setSelectedProject] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await getProjectFinances();
            if (res.success) {
                setSummary(res.summary || {});
                setProjects(res.projects || []);
            } else {
                toast.error(res.message || "Failed to load project finances");
            }
        } catch (error) {
            console.error("Error loading project finances:", error);
            toast.error(error.response?.data?.message || "Failed to load project finances");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = 
                p.name?.toLowerCase().includes(search.toLowerCase()) ||
                (p.clientIds || []).some(c => 
                    `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(search.toLowerCase()) ||
                    c.email?.toLowerCase().includes(search.toLowerCase())
                );
            const matchesStatus = statusFilter === "all" || p.paymentStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, search, statusFilter]);

    const formatCurrency = (num) => {
        return `₹${Number(num || 0).toLocaleString("en-IN")}`;
    };

    const calculatePercentage = (received, price) => {
        if (!price || price <= 0) return received > 0 ? 100 : 0;
        return Math.min(100, Math.round((received / price) * 100));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FolderKanban className="w-7 h-7 text-blue-600" /> Project Finances & Collections
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Track project deal values, received client payments, and pending dues
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
                        Refresh
                    </button>
                    <Link
                        to="/manage-payments"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-sm"
                    >
                        <Receipt className="w-4 h-4" /> Review Submissions
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Valuation */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Project Value</span>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalValuation)}</p>
                        <p className="text-xs text-slate-500 mt-1">{summary.totalProjects || 0} active/registered projects</p>
                    </div>
                </div>

                {/* Total Received */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Received (Jama)</span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalReceived)}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${calculatePercentage(summary.totalReceived, summary.totalValuation)}%` }}
                                />
                            </div>
                            <span className="text-xs font-semibold text-emerald-700">
                                {calculatePercentage(summary.totalReceived, summary.totalValuation)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Total Due */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Dues (Baki)</span>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalDue)}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {summary.partialProjects + summary.unpaidProjects} projects with pending balance
                        </p>
                    </div>
                </div>

                {/* In Review / Pending Approval */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Awaiting Approval</span>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.totalPendingApproval)}</p>
                        <p className="text-xs text-slate-500 mt-1">Payments submitted by clients waiting for admin review</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search project or client..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0">
                        <Filter className="w-3.5 h-3.5" /> Status:
                    </span>
                    {[
                        { id: "all", label: "All Projects" },
                        { id: "paid", label: "Fully Paid" },
                        { id: "partial", label: "Partially Paid" },
                        { id: "unpaid", label: "Unpaid" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                                statusFilter === tab.id
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects Finance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="p-16 text-center">
                        <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-800">No Projects Found</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {search || statusFilter !== "all" ? "Try clearing filters or search term." : "No projects registered in the company yet."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                                    <th className="p-4">Project</th>
                                    <th className="p-4">Client(s)</th>
                                    <th className="p-4">Deal Price</th>
                                    <th className="p-4">Received (Jama)</th>
                                    <th className="p-4">Due (Baki)</th>
                                    <th className="p-4">Payment Progress</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {filteredProjects.map((proj) => {
                                    const pct = calculatePercentage(proj.receivedAmount, proj.price);
                                    return (
                                        <tr key={proj._id} className="hover:bg-slate-50/80 transition">
                                            {/* Project */}
                                            <td className="p-4">
                                                <div>
                                                    <Link 
                                                        to={`/projects/${proj._id}`}
                                                        className="font-semibold text-slate-900 hover:text-blue-600 transition flex items-center gap-1.5"
                                                    >
                                                        {proj.name}
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                                                    </Link>
                                                    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full capitalize mt-1 ${
                                                        proj.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                        proj.status === 'active' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {proj.status?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Client */}
                                            <td className="p-4">
                                                {proj.clientIds && proj.clientIds.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {proj.clientIds.map((client) => (
                                                            <div key={client._id} className="flex items-center gap-2">
                                                                {client.profilePic?.url ? (
                                                                    <img src={getImageUrl(client.profilePic.url)} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                                                        {client.firstName?.charAt(0) || "C"}
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-medium text-slate-800">
                                                                    {client.firstName} {client.lastName}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No Client Assigned</span>
                                                )}
                                            </td>

                                            {/* Deal Price */}
                                            <td className="p-4">
                                                <span className="font-semibold text-slate-900">
                                                    {formatCurrency(proj.price)}
                                                </span>
                                            </td>

                                            {/* Received */}
                                            <td className="p-4">
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(proj.receivedAmount)}
                                                </span>
                                                {proj.pendingApprovalAmount > 0 && (
                                                    <p className="text-[11px] text-indigo-600 font-medium mt-0.5" title="Awaiting Admin Review">
                                                        +{formatCurrency(proj.pendingApprovalAmount)} in review
                                                    </p>
                                                )}
                                            </td>

                                            {/* Due */}
                                            <td className="p-4">
                                                <span className={`font-semibold ${proj.dueAmount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                                                    {formatCurrency(proj.dueAmount)}
                                                </span>
                                            </td>

                                            {/* Progress */}
                                            <td className="p-4 min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-300 ${
                                                                pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300"
                                                            }`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600 w-8 text-right">
                                                        {pct}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                                    proj.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                    proj.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {proj.paymentStatus === 'paid' ? 'Fully Paid' :
                                                     proj.paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedProject(proj)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-medium transition"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> History ({proj.paymentsCount || 0})
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

            {/* Payment History Modal for Selected Project */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedProject.name} - Payment History</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Total Deal: {formatCurrency(selectedProject.price)} | Received: <span className="text-emerald-600 font-semibold">{formatCurrency(selectedProject.receivedAmount)}</span> | Due: <span className="text-amber-600 font-semibold">{formatCurrency(selectedProject.dueAmount)}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-5 overflow-y-auto flex-1 space-y-3">
                            {(!selectedProject.recentPayments || selectedProject.recentPayments.length === 0) ? (
                                <div className="text-center py-10 bg-slate-50 rounded-xl">
                                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No payment records found for this project.</p>
                                </div>
                            ) : (
                                selectedProject.recentPayments.map((pay) => (
                                    <div key={pay._id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition flex items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base text-slate-900">{formatCurrency(pay.amount)}</span>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                                    pay.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                                    pay.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {pay.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Txn ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{pay.transactionId}</code></p>
                                            {pay.remark && <p className="text-xs text-slate-600 italic mt-0.5">"{pay.remark}"</p>}
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(pay.createdAt).toLocaleString()}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {pay.screenshot?.url && (
                                                <button
                                                    onClick={() => setPreviewImage(getImageUrl(pay.screenshot.url))}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-medium transition"
                                                    title="View Receipt Screenshot"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" /> Receipt
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Screenshot Preview */}
            {previewImage && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-3xl max-h-[90vh]">
                        <button
                            className="absolute -top-10 right-0 text-white hover:text-slate-300"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img src={getImageUrl(previewImage)} alt="Screenshot" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectFinances;
