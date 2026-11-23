import React, { useState, useEffect } from "react";
import { getImageUrl } from "../../../utils/imageUtils";
import { useStore } from "../../../context/StoreContext";
import { FileText, Save, Plus, File, Edit3, ShieldCheck, X, UploadCloud, Download, Trash2, Users, Building2, Search, ExternalLink, Calendar, Mail } from "lucide-react";
import { toast } from "react-toastify";
import { getAllNdas, createOrUpdateNda, getNdaSignatures, deleteNda, getClientNdaSignatures } from "../../../services/ndaService";
import { fetchAllCompaniesList } from "../../company/services/companyService";

const ManageNda = () => {
    const { user } = useStore();
    const isSuperAdmin = (user?.role?.name || user?.role || "").toString().toLowerCase() === "super_admin";

    const [ndas, setNdas] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [companyFilter, setCompanyFilter] = useState("");
    const [targetCompanyId, setTargetCompanyId] = useState("");
    const [clientSignatures, setClientSignatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("employee"); // "employee" or "client"
    const [clientSearch, setClientSearch] = useState("");
    
    // Editor State
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [targetAudience, setTargetAudience] = useState("Employee");
    const [isSaving, setIsSaving] = useState(false);

    // Signatures Modal
    const [showSignatures, setShowSignatures] = useState(false);
    const [currentSignatures, setCurrentSignatures] = useState([]);
    const [selectedSignatureBase64, setSelectedSignatureBase64] = useState(null);
    const [currentNda, setCurrentNda] = useState(null);
    const [selectedSignatureDoc, setSelectedSignatureDoc] = useState(null);
    const [ndaToDelete, setNdaToDelete] = useState(null);

    const getDocumentUrl = (url) => {
        if (!url) return "";
        let baseUrl = import.meta.env.VITE_BASE_URL?.replace(/\/$/, '') || "";
        let finalUrl = url;
        if (url.startsWith("http://localhost:8008")) {
            finalUrl = url.replace("http://localhost:8008", baseUrl);
        } else if (url.startsWith("/")) {
            finalUrl = `${baseUrl}${url}`;
        }
        // Enforce HTTPS if current page is on HTTPS to prevent Mixed Content blocking
        if (window.location.protocol === 'https:' && finalUrl.startsWith('http://') && !finalUrl.includes('localhost')) {
            finalUrl = finalUrl.replace('http://', 'https://');
        }
        return finalUrl;
    };

    // Load companies list for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchNdas();
        fetchClientSignatures();
    }, [user?.companyId, companyFilter]);

    const fetchNdas = async () => {
        try {
            setLoading(true);
            const compParam = isSuperAdmin ? (companyFilter || "all") : (user?.companyId?._id || "");
            const res = await getAllNdas(compParam, true);
            if (res.success) setNdas(res.ndas || []);
        } catch (error) {
            toast.error(error.message || "Failed to fetch NDAs");
        } finally {
            setLoading(false);
        }
    };

    const fetchClientSignatures = async () => {
        try {
            const res = await getClientNdaSignatures();
            if (res.success) setClientSignatures(res.signatures || []);
        } catch (error) {
            console.error("Failed to fetch client signatures:", error);
        }
    };

    const handleSaveNda = async () => {
        if (!title.trim()) return toast.error("Title is required");
        
        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append("title", title);
            formData.append("targetAudience", targetAudience);
            if (file) formData.append("file", file);
            
            if (isSuperAdmin) {
                formData.append("companyId", targetCompanyId && targetCompanyId !== "global" ? targetCompanyId : "global");
            } else if (user?.companyId?._id) {
                formData.append("companyId", user.companyId._id);
            }

            const res = await createOrUpdateNda(formData);
            if (res.success) {
                toast.success(res.message);
                fetchNdas();
                setTitle("");
                setTargetAudience("Employee");
                setTargetCompanyId(companyFilter || "");
                setFile(null);
                const fileInput = document.getElementById('nda-file');
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            toast.error(error.message || "Failed to save NDA");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (n) => {
        toast.info("Cannot edit document file directly. Create a new NDA or update title & audience.");
        setTitle(n.title);
        setTargetAudience(n.targetAudience || "Employee");
        setTargetCompanyId(n.companyId?._id || n.companyId || "");
        setActiveTab("employee");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleViewSignatures = async (nda) => {
        try {
            setCurrentNda(nda);
            const res = await getNdaSignatures(nda._id);
            if (res.success) {
                setCurrentSignatures(res.signatures);
                setShowSignatures(true);
            }
        } catch (error) {
            toast.error(error.message || "Failed to fetch signatures");
        }
    };

    const handleDeleteClick = (nda) => {
        setNdaToDelete(nda);
    };

    const confirmDelete = async () => {
        if (!ndaToDelete) return;
        try {
            await deleteNda(ndaToDelete._id);
            toast.success("NDA deleted successfully");
            fetchNdas();
        } catch (error) {
            toast.error(error.message || "Failed to delete NDA");
        } finally {
            setNdaToDelete(null);
        }
    };

    return (
        <div className="p-3 sm:p-6 lg:p-8 w-full space-y-5 sm:space-y-6 min-h-screen max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xs border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <FileText size={22} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Manage NDA</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Create or update Non-Disclosure Agreements</p>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="w-full md:w-auto flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 shadow-2xs">
                    <button 
                        onClick={() => setActiveTab("employee")}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap active:scale-95 cursor-pointer ${
                            activeTab === "employee" ? "bg-white text-blue-600 shadow-xs border border-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                        }`}
                    >
                        <FileText size={15} />
                        <span>Employee NDAs</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab("client")}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap active:scale-95 cursor-pointer ${
                            activeTab === "client" ? "bg-white text-blue-600 shadow-xs border border-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                        }`}
                    >
                        <Users size={15} />
                        <span>Client NDAs</span>
                    </button>
                </div>
            </div>

            {activeTab === "employee" ? (
                <>
                    {/* Editor Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <Plus size={16} />
                            </div>
                            <h2 className="text-base font-bold text-gray-800">New / Edit NDA</h2>
                        </div>

                        <div className="p-6 md:p-8 space-y-8">
                            <div className={`grid grid-cols-1 ${isSuperAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">NDA Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Standard Employee NDA"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Target Audience <span className="text-red-500">*</span></label>
                                    <select
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white cursor-pointer"
                                    >
                                        <option value="Employee">Employees Only</option>
                                        <option value="Intern">Interns Only</option>
                                        <option value="Both">Both (Employees & Interns)</option>
                                        <option value="Client">Client</option>
                                    </select>
                                </div>
                                {isSuperAdmin && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                            <Building2 size={15} className="text-blue-600" /> Applicable Company
                                        </label>
                                        <select
                                            value={targetCompanyId}
                                            onChange={(e) => setTargetCompanyId(e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50 focus:bg-white cursor-pointer"
                                        >
                                            <option value="">Global (All Companies)</option>
                                            {companies.map((c) => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700">Upload NDA Document (PDF/Image) <span className="text-red-500">*</span></label>
                                <div className="relative w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 hover:border-blue-400 hover:bg-blue-50/50 transition-all group cursor-pointer bg-gray-50/30">
                                    <input
                                        id="nda-file"
                                        type="file"
                                        accept=".pdf,image/*,.doc,.docx"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <UploadCloud size={28} className="text-blue-500" />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-800 mb-1">
                                            {file ? file.name : "Click or drag file here to upload"}
                                        </h3>
                                        <p className="text-sm text-gray-500 max-w-sm mb-3">
                                            {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Supports PDF, DOC, DOCX, PNG, JPG formats."}
                                        </p>
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                            Max file size: 10MB
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button
                                onClick={handleSaveNda}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Save size={16} />
                                {isSaving ? "Saving..." : "Save NDA"}
                            </button>
                        </div>
                    </div>

            {/* List Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <File size={18} className="text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-800">Existing NDAs</h2>
                    </div>

                    {isSuperAdmin && companies.length > 0 && (
                        <div className="relative min-w-[220px]">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium text-gray-700 shadow-sm"
                                title="Filter by Company"
                            >
                                <option value="">All Companies ({companies.length})</option>
                                {companies.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="p-4 md:p-6">
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
                            ))}
                        </div>
                    ) : ndas.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-500">No NDAs found{isSuperAdmin && companyFilter ? " for this company" : ""}.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                            {ndas.filter(n => n.targetAudience !== 'Client').map((n) => (
                                <div key={n._id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white group flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <FileText size={16} />
                                                </div>
                                                <h3 className="font-semibold text-gray-800 truncate" title={n.title}>{n.title}</h3>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                n.targetAudience === 'Intern' ? 'bg-purple-100 text-purple-700' :
                                                n.targetAudience === 'Employee' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {n.targetAudience || 'Both'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mt-2">
                                            <p className="text-xs text-gray-400">
                                                Last updated: {new Date(n.updatedAt).toLocaleDateString()}
                                            </p>
                                            {isSuperAdmin && (
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 truncate max-w-[120px] ${
                                                    n.companyId?.name
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`} title={n.companyId?.name || "Global (All Companies)"}>
                                                    {n.companyId?.name || "Global"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                                        <button  
                                            onClick={() => handleViewSignatures(n)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-medium transition"
                                        >
                                            <ShieldCheck size={14} /> Signatures
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(n)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            </>
            ) : (
                <div className="flex flex-col gap-5 sm:gap-6">
                    {/* Client NDAs Overview KPIs */}
                    {(() => {
                        const clientNdas = ndas.filter(n => n.targetAudience === 'Client');
                        const filteredClientSignatures = clientSignatures.filter(sig => {
                            if (!clientSearch.trim()) return true;
                            const q = clientSearch.toLowerCase();
                            const name = `${sig.userId?.firstName || ''} ${sig.userId?.lastName || ''}`.toLowerCase();
                            const email = (sig.userId?.email || '').toLowerCase();
                            const title = (sig.ndaId?.title || '').toLowerCase();
                            const company = (sig.userId?.companyId?.name || '').toLowerCase();
                            return name.includes(q) || email.includes(q) || title.includes(q) || company.includes(q);
                        });

                        return (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition">
                                        <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0 border border-orange-100">
                                            <FileText size={22} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Templates</p>
                                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{clientNdas.length}</h3>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition">
                                        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                                            <ShieldCheck size={22} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Signed Documents</p>
                                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{clientSignatures.length}</h3>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                                        <div>
                                            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Create New</p>
                                            <p className="text-sm font-semibold text-white/95 mt-0.5">Draft Client NDA</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setTitle("");
                                                setTargetAudience("Client");
                                                setTargetCompanyId(companyFilter || "");
                                                setFile(null);
                                                setActiveTab("employee");
                                                window.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                            className="px-3.5 py-2 bg-white text-blue-600 hover:bg-blue-50 active:scale-95 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                                        >
                                            <Plus size={15} /> <span>Create NDA</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Client NDA Templates Section */}
                                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden">
                                    <div className="p-3.5 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-blue-100/70 text-blue-600 rounded-lg">
                                                <File size={16} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Existing Client NDAs</h2>
                                                    <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                                                        {clientNdas.length}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">Templates assigned to client audiences</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                            {isSuperAdmin && companies.length > 0 && (
                                                <div className="relative w-full sm:w-auto min-w-[200px]">
                                                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    <select
                                                        value={companyFilter}
                                                        onChange={(e) => setCompanyFilter(e.target.value)}
                                                        className="w-full pl-8 pr-7 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium text-gray-700 shadow-2xs"
                                                        title="Filter by Company"
                                                    >
                                                        <option value="">All Companies ({companies.length})</option>
                                                        {companies.map((c) => (
                                                            <option key={c._id} value={c._id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setTitle("");
                                                    setTargetAudience("Client");
                                                    setTargetCompanyId(companyFilter || "");
                                                    setFile(null);
                                                    setActiveTab("employee");
                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                }}
                                                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
                                            >
                                                <Plus size={14} /> <span>New Client NDA</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-3.5 sm:p-5">
                                        {clientNdas.length === 0 ? (
                                            <div className="text-center py-10 px-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                <FileText size={42} className="mx-auto text-gray-300 mb-3" />
                                                <h4 className="text-sm font-semibold text-gray-800">No Client NDAs Found</h4>
                                                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                                    You haven't created any client NDAs yet${isSuperAdmin && companyFilter ? " for this company" : ""}. Click the button below to draft a new client NDA.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setTitle("");
                                                        setTargetAudience("Client");
                                                        setTargetCompanyId(companyFilter || "");
                                                        setFile(null);
                                                        setActiveTab("employee");
                                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                                    }}
                                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 active:scale-95 transition shadow-xs cursor-pointer"
                                                >
                                                    <Plus size={14} /> Create Client NDA
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                {clientNdas.map((n) => (
                                                    <div key={n._id} className="border border-gray-200/80 rounded-xl p-3.5 sm:p-4 hover:shadow-xs transition-all bg-white flex flex-col justify-between gap-3 shadow-2xs">
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0 border border-orange-100">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate" title={n.title}>
                                                                        {n.title}
                                                                    </h3>
                                                                </div>
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                                                                    Client
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar size={11} className="text-gray-400" />
                                                                    {new Date(n.updatedAt).toLocaleDateString()}
                                                                </span>
                                                                {isSuperAdmin && (
                                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 truncate max-w-[120px] ${
                                                                        n.companyId?.name
                                                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    }`} title={n.companyId?.name || "Global (All Companies)"}>
                                                                        {n.companyId?.name || "Global"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="pt-2.5 border-t border-gray-100 flex items-center gap-1.5">
                                                            <button 
                                                                onClick={() => handleEdit(n)}
                                                                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-700 border border-gray-200/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                                                            >
                                                                <Edit3 size={13} /> <span>Edit</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleViewSignatures(n)}
                                                                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                                                            >
                                                                <Users size={13} /> <span>Signatures</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteClick(n)}
                                                                className="p-1.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 border border-red-200/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                                                                title="Delete NDA"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Client NDA Signatures Section */}
                                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden mb-6">
                                    <div className="p-3.5 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-blue-100/70 text-blue-600 rounded-lg">
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Client NDA Signatures</h2>
                                                    <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                                        {filteredClientSignatures.length}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">Records of all signed documents submitted by clients</p>
                                            </div>
                                        </div>

                                        {/* Search Filter */}
                                        <div className="relative w-full sm:w-auto min-w-[240px]">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                                placeholder="Search client, email, NDA..."
                                                className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium text-gray-700 shadow-2xs"
                                            />
                                            {clientSearch && (
                                                <button
                                                    onClick={() => setClientSearch("")}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3.5 sm:p-5">
                                        {clientSignatures.length === 0 ? (
                                            <div className="text-center py-12 px-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                <FileText size={42} className="mx-auto text-gray-300 mb-3" />
                                                <h4 className="text-sm font-semibold text-gray-800">No Client Signatures Yet</h4>
                                                <p className="text-xs text-gray-500 mt-1">When clients review and sign their NDA, the records and copies will appear here.</p>
                                            </div>
                                        ) : filteredClientSignatures.length === 0 ? (
                                            <div className="text-center py-10 px-4 text-gray-500 text-sm">
                                                No signatures found matching "{clientSearch}".
                                            </div>
                                        ) : (
                                            <>
                                                {/* Mobile Cards View (md:hidden) */}
                                                <div className="space-y-3 md:hidden">
                                                    {filteredClientSignatures.map((sig) => (
                                                        <div key={sig._id} className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                                                                        {sig.userId?.firstName?.[0] || 'C'}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                                                                            {sig.userId?.firstName} {sig.userId?.lastName}
                                                                        </h4>
                                                                        {sig.userId?.email && (
                                                                            <span className="text-xs text-gray-500 truncate block mt-0.5">
                                                                                {sig.userId.email}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                                                                    {new Date(sig.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>

                                                            <div className="bg-gray-50/80 rounded-lg p-2.5 border border-gray-100 flex flex-col gap-1.5 text-xs text-gray-600">
                                                                <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                                                    <FileText size={13} className="text-blue-500 shrink-0" />
                                                                    <span className="truncate">{sig.ndaId?.title || 'Standard Client NDA'}</span>
                                                                </div>
                                                                {isSuperAdmin && sig.userId?.companyId?.name && (
                                                                    <div className="flex items-center gap-1.5 text-[11px]">
                                                                        <Building2 size={12} className="text-indigo-500 shrink-0" />
                                                                        <span className="text-indigo-700 font-semibold">{sig.userId.companyId.name}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {sig.signedDocumentUrl ? (
                                                                <a
                                                                    href={sig.signedDocumentUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full py-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                                                >
                                                                    <FileText size={14} />
                                                                    <span>View Signed Document</span>
                                                                    <ExternalLink size={12} />
                                                                </a>
                                                            ) : (
                                                                <div className="text-center py-2 text-xs text-gray-400 bg-gray-50 rounded-lg border border-gray-100">
                                                                    No Document Attached
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Desktop Table View (hidden md:block) */}
                                                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
                                                    <table className="w-full text-sm text-left border-collapse">
                                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                                            <tr>
                                                                <th className="px-5 py-3.5 font-semibold">Client</th>
                                                                <th className="px-5 py-3.5 font-semibold">NDA Name</th>
                                                                <th className="px-5 py-3.5 font-semibold">Email</th>
                                                                <th className="px-5 py-3.5 font-semibold">Signed On</th>
                                                                <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {filteredClientSignatures.map((sig) => (
                                                                <tr key={sig._id} className="hover:bg-gray-50/60 transition-colors">
                                                                    <td className="px-5 py-3.5">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shrink-0">
                                                                                {sig.userId?.firstName?.[0] || 'C'}
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <span className="font-semibold text-gray-900">
                                                                                        {sig.userId?.firstName} {sig.userId?.lastName}
                                                                                    </span>
                                                                                    {isSuperAdmin && sig.userId?.companyId?.name && (
                                                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                                            {sig.userId.companyId.name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-gray-800 font-medium">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <FileText size={14} className="text-blue-500 shrink-0" />
                                                                            <span>{sig.ndaId?.title || 'N/A'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{sig.userId?.email || 'N/A'}</td>
                                                                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{new Date(sig.createdAt).toLocaleDateString()}</td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        {sig.signedDocumentUrl ? (
                                                                            <a
                                                                                href={sig.signedDocumentUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 border border-blue-200 rounded-lg text-xs font-semibold transition shadow-2xs"
                                                                            >
                                                                                <FileText size={13} />
                                                                                <span>View Document</span>
                                                                                <ExternalLink size={11} />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs">No File</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Signatures Modal */}
            {showSignatures && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">NDA Signatures</h3>
                                <p className="text-xs text-gray-500">List of users who have signed this document.</p>
                            </div>
                            <button onClick={() => setShowSignatures(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 md:p-6 overflow-y-auto flex-1">
                            {currentSignatures.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No signatures found for this NDA yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {currentSignatures.map(sig => (
                                        <div key={sig._id} className="flex flex-col sm:flex-row items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-sm transition">
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                {sig.userId?.profilePic?.url ? (
                                                    <img src={getImageUrl(sig.userId.profilePic.url)} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                        {sig.userId?.firstName?.[0] || 'U'}{sig.userId?.lastName?.[0] || ''}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-gray-800">{sig.userId?.firstName} {sig.userId?.lastName}</p>
                                                        {isSuperAdmin && sig.userId?.companyId?.name && (
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                {sig.userId.companyId.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">{sig.userId?.email} • Signed: {new Date(sig.signedAt || sig.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 sm:mt-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                                                <button 
                                                    onClick={() => setSelectedSignatureBase64(sig.signatureBase64)}
                                                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                                                >
                                                    View Signature
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedSignatureDoc(sig)}
                                                    className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition flex items-center gap-1"
                                                >
                                                    <FileText size={14} /> Signed Doc
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* View Single Signature Image Modal */}
            {selectedSignatureBase64 && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedSignatureBase64(null)}>
                    <div className="bg-white rounded-2xl p-6 shadow-2xl relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedSignatureBase64(null)} className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition">
                            <X size={16} />
                        </button>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">User Signature</h4>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-center">
                            <img src={selectedSignatureBase64} alt="Signature" className="max-w-full max-h-64 object-contain" />
                        </div>
                    </div>
                </div>
            )}

            {/* View Signed Document Modal (Visual Overlay) */}
            {selectedSignatureDoc && currentNda && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedSignatureDoc(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl relative w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 z-10">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Signed Document View</h3>
                                <p className="text-xs text-gray-500">Signed by {selectedSignatureDoc.userId.firstName} {selectedSignatureDoc.userId.lastName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedSignatureDoc.signedDocumentUrl && (
                                    <a 
                                        href={getDocumentUrl(selectedSignatureDoc.signedDocumentUrl)} 
                                        download={`Signed_NDA_${selectedSignatureDoc.userId.firstName}_${selectedSignatureDoc.userId.lastName}.pdf`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                                    >
                                        <Download size={16} /> Download PDF
                                    </a>
                                )}
                                <button onClick={() => setSelectedSignatureDoc(null)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4">
                            {selectedSignatureDoc.signedDocumentUrl ? (
                                <iframe 
                                    src={`${getDocumentUrl(selectedSignatureDoc.signedDocumentUrl)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                                    title="Signed NDA Document" 
                                    className="w-full h-full border-0 rounded-lg shadow-sm bg-white"
                                />
                            ) : currentNda.document?.url ? (
                                (currentNda.document.url.includes('/image/upload/') || currentNda.document.url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) ? (
                                    <div className="relative inline-block">
                                        <img src={getDocumentUrl(currentNda.document.url)} alt="NDA Document" className="max-w-full max-h-[80vh] shadow-sm rounded-lg" />
                                        <div className="absolute bottom-4 right-4 bg-transparent pointer-events-none">
                                            <img src={selectedSignatureDoc.signatureBase64} alt="Signature" className="h-20 object-contain mix-blend-multiply" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <p className="text-gray-500 mb-4">Note: This signature was collected before the automatic PDF stamping feature was added.</p>
                                        <iframe 
                                            src={`https://docs.google.com/gview?url=${encodeURIComponent(getDocumentUrl(currentNda.document.url))}&embedded=true`} 
                                            title="NDA Document" 
                                            className="w-full h-full border-0 rounded-lg shadow-sm bg-white"
                                        />
                                        <div className="absolute bottom-8 right-8 bg-transparent pointer-events-none">
                                            <img src={selectedSignatureDoc.signatureBase64} alt="Signature" className="h-24 object-contain mix-blend-multiply" />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <p className="text-gray-500">No document attached.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {ndaToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center transform scale-100 transition-all">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <Trash2 className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete NDA?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete <b>{ndaToDelete.title}</b>? All signed copies by users will also be permanently deleted. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={() => setNdaToDelete(null)}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageNda;
