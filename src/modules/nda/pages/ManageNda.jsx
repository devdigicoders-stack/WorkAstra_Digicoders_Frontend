import React, { useState, useEffect } from "react";
import { useStore } from "../../../context/StoreContext";
import { FileText, Save, Plus, File, Edit3, ShieldCheck, X, UploadCloud, Download, Trash2, Users } from "lucide-react";
import { toast } from "react-toastify";
import { getAllNdas, createOrUpdateNda, getNdaSignatures, deleteNda, getClientNdaSignatures } from "../../../services/ndaService";

const ManageNda = () => {
    const { user } = useStore();
    const [ndas, setNdas] = useState([]);
    const [clientSignatures, setClientSignatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("employee"); // "employee" or "client"
    
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
        if (finalUrl.includes('onrender.com') && finalUrl.startsWith('http://')) {
            finalUrl = finalUrl.replace('http://', 'https://');
        }
        return finalUrl;
    };

    useEffect(() => {
        fetchNdas();
        fetchClientSignatures();
    }, [user?.companyId]);

    const fetchNdas = async () => {
        try {
            setLoading(true);
            const res = await getAllNdas(user?.companyId?._id || "", true);
            if (res.success) setNdas(res.ndas);
        } catch (error) {
            toast.error(error.message || "Failed to fetch NDAs");
        } finally {
            setLoading(false);
        }
    };

    const fetchClientSignatures = async () => {
        try {
            const res = await getClientNdaSignatures();
            if (res.success) setClientSignatures(res.signatures);
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
            if (user?.companyId?._id) formData.append("companyId", user.companyId._id);

            const res = await createOrUpdateNda(formData);
            if (res.success) {
                toast.success(res.message);
                fetchNdas();
                setTitle("");
                setTargetAudience("Employee");
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
        <div className="p-4 md:p-6 lg:p-8 w-full space-y-8 h-[calc(100vh-64px)] overflow-y-auto">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage NDA</h1>
                        <p className="text-sm text-gray-500 mt-1">Create or update Non-Disclosure Agreements</p>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex items-center bg-gray-50/80 p-1.5 rounded-xl border border-gray-100/50">
                    <button 
                        onClick={() => setActiveTab("employee")}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === "employee" ? "bg-white text-blue-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                        }`}
                    >
                        <FileText size={15} />
                        Employee NDAs
                    </button>
                    <button 
                        onClick={() => setActiveTab("client")}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === "client" ? "bg-white text-blue-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                        }`}
                    >
                        <Users size={15} />
                        Client NDAs
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-3">
                    <File size={18} className="text-blue-600" />
                    <h2 className="text-base font-semibold text-gray-800">Existing NDAs</h2>
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
                            <p className="text-gray-500">No NDAs found.</p>
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
                                                <h3 className="font-semibold text-gray-800 truncate">{n.title}</h3>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                n.targetAudience === 'Intern' ? 'bg-purple-100 text-purple-700' :
                                                n.targetAudience === 'Employee' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {n.targetAudience || 'Both'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Last updated: {new Date(n.updatedAt).toLocaleDateString()}
                                        </p>
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
                <div className="flex flex-col gap-6">
                    {/* Client NDA Templates Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-3">
                            <File size={18} className="text-blue-600" />
                            <h2 className="text-base font-semibold text-gray-800">Existing Client NDAs</h2>
                        </div>
                        <div className="p-4 md:p-6">
                            {ndas.filter(n => n.targetAudience === 'Client').length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-500">No Client NDAs found. Create one from the Employee/Intern tab by selecting "Client" audience.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                                    {ndas.filter(n => n.targetAudience === 'Client').map((n) => (
                                        <div key={n._id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white group flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                            <FileText size={16} />
                                                        </div>
                                                        <h3 className="font-semibold text-gray-800 truncate">{n.title}</h3>
                                                    </div>
                                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 shrink-0">
                                                        Client
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Last updated: {new Date(n.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
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

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                        <Users size={18} className="text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-800">Client NDA Signatures</h2>
                    </div>
                    <div className="p-4 md:p-6">
                        {clientSignatures.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-500">No client signatures yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Client</th>
                                            <th className="px-6 py-4 font-semibold">NDA Name</th>
                                            <th className="px-6 py-4 font-semibold">Email</th>
                                            <th className="px-6 py-4 font-semibold">Signed On</th>
                                            <th className="px-6 py-4 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {clientSignatures.map((sig) => (
                                            <tr key={sig._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                            {sig.userId?.firstName?.[0] || 'C'}
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            {sig.userId?.firstName} {sig.userId?.lastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-800 font-medium">{sig.ndaId?.title || 'N/A'}</td>
                                                <td className="px-6 py-4 text-gray-600">{sig.userId?.email || 'N/A'}</td>
                                                <td className="px-6 py-4 text-gray-600">{new Date(sig.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {sig.signedDocumentUrl ? (
                                                        <a
                                                            href={sig.signedDocumentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition"
                                                        >
                                                            <FileText size={14} /> View Document
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
                        )}
                    </div>
                </div>
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
                                                {sig.userId.profilePic?.url ? (
                                                    <img src={sig.userId.profilePic.url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                        {sig.userId.firstName[0]}{sig.userId.lastName[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-800">{sig.userId.firstName} {sig.userId.lastName}</p>
                                                    <p className="text-xs text-gray-500">{sig.userId.email} • Signed: {new Date(sig.signedAt || sig.createdAt).toLocaleString()}</p>
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
