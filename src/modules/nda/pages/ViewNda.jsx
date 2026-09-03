import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../../../context/StoreContext";
import { FileText, Edit3, X, CheckCircle, Search, UserCheck, Users, Download, ArrowRight, ArrowLeft, ShieldCheck, Eye, Eraser, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import SignatureCanvas from "react-signature-canvas";
import { getAllNdas, signNda, getMySignatures } from "../../../services/ndaService";
import ClientMyNda from "./ClientMyNda";

const ViewNda = () => {
    const { user } = useStore();
    const [ndas, setNdas] = useState([]);
    const [mySignatures, setMySignatures] = useState([]);
    const [signaturesMap, setSignaturesMap] = useState({});
    const [loading, setLoading] = useState(true);
    
    // View State
    const [selectedNda, setSelectedNda] = useState(null);
    
    // Multi-Step Signing Modal State
    const [showSigningModal, setShowSigningModal] = useState(false);
    const [signingStep, setSigningStep] = useState(1); // 1: Employee Details, 2: Witness Details, 3: Signature
    const [isSigning, setIsSigning] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const sigPadRef = useRef(null);

    // Form Details
    const [employeeForm, setEmployeeForm] = useState({
        fullName: "",
        fatherName: "",
        employeeId: "",
        designation: "",
        phone: "",
        email: "",
        address: ""
    });

    const [witnessForm, setWitnessForm] = useState({
        fullName: "",
        address: "",
        phone: "",
        role: ""
    });

    const companyIdStr = typeof user?.companyId === "object" ? user?.companyId?._id : user?.companyId;

    useEffect(() => {
        fetchData();
    }, [companyIdStr]);

    // Initialize Employee form when user data is loaded
    useEffect(() => {
        if (user) {
            setEmployeeForm({
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                fatherName: "",
                employeeId: user.employeeCode || `EMP-${user._id?.toString().slice(-4)}`,
                designation: user.designation?.name || user.designation?.title || "Software Engineer",
                phone: user.phone || "",
                email: user.email || "",
                address: user.address || ""
            });
        }
    }, [user]);

    // If role is Client, show their specific My NDA view (placed after all hooks)
    if (user?.role?.name?.toLowerCase() === "client") {
        return <ClientMyNda />;
    }

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

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ndasRes, sigsRes] = await Promise.all([
                getAllNdas(companyIdStr || ""),
                getMySignatures()
            ]);
            
            if (ndasRes.success) {
                setNdas(ndasRes.ndas);
                if (ndasRes.ndas.length > 0 && !selectedNda) {
                    setSelectedNda(ndasRes.ndas[0]);
                }
            }
            if (sigsRes.success) {
                const sigIds = [];
                const map = {};
                sigsRes.signatures.forEach(s => {
                    const id = s.ndaId?._id || s.ndaId;
                    if (id) {
                        sigIds.push(id);
                        map[id] = s;
                    }
                });
                setMySignatures(sigIds);
                setSignaturesMap(map);
            }
        } catch (error) {
            toast.error(error.message || "Failed to fetch NDAs");
        } finally {
            setLoading(false);
        }
    };

    const openSigningModal = () => {
        // Reset form & state
        setSigningStep(1);
        setAgreedToTerms(false);
        setShowSigningModal(true);
    };

    const handleClearSignature = () => {
        sigPadRef.current?.clear();
    };

    const handleNextStep = () => {
        if (signingStep === 1) {
            if (!employeeForm.fullName.trim()) return toast.error("Full Name is required");
            if (!employeeForm.employeeId.trim()) return toast.error("Employee ID is required");
            if (!employeeForm.designation.trim()) return toast.error("Designation is required");
            if (!employeeForm.phone.trim()) return toast.error("Mobile Number is required");
            if (!employeeForm.email.trim()) return toast.error("Email is required");
            if (!employeeForm.address.trim()) return toast.error("Address is required");
            setSigningStep(2);
        } else if (signingStep === 2) {
            if (!witnessForm.fullName.trim()) return toast.error("Witness Full Name is required");
            if (!witnessForm.address.trim()) return toast.error("Witness Address is required");
            if (!witnessForm.phone.trim()) return toast.error("Witness Mobile is required");
            if (!witnessForm.role.trim()) return toast.error("Witness Department / Role is required");
            setSigningStep(3);
        }
    };

    const handleFinalSubmit = async () => {
        if (sigPadRef.current?.isEmpty()) {
            return toast.error("Please provide your digital signature on canvas");
        }
        if (!agreedToTerms) {
            return toast.error("Please check the declaration checkbox to confirm");
        }

        const signatureBase64 = sigPadRef.current.getCanvas().toDataURL("image/png");

        try {
            setIsSigning(true);
            const payload = {
                signatureBase64,
                employeeDetails: employeeForm,
                witnessDetails: witnessForm
            };

            const res = await signNda(selectedNda._id, payload);
            if (res.success) {
                toast.success("NDA Signed & Stamped Successfully!");
                setShowSigningModal(false);
                await fetchData();
            }
        } catch (error) {
            toast.error(error.message || "Failed to sign NDA");
        } finally {
            setIsSigning(false);
        }
    };

    const isCurrentSigned = selectedNda && mySignatures.includes(selectedNda._id);
    const currentSignatureObj = selectedNda ? signaturesMap[selectedNda._id] : null;
    const documentDisplayUrl = (isCurrentSigned && currentSignatureObj?.signedDocumentUrl)
        ? getDocumentUrl(currentSignatureObj.signedDocumentUrl)
        : getDocumentUrl(selectedNda?.document?.url);

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Non-Disclosure Agreements</h1>
                        <p className="text-sm text-gray-500 mt-0.5">DigiCoders Technologies Private Limited - Official NDA System</p>
                    </div>
                </div>

                {selectedNda && isCurrentSigned && currentSignatureObj?.signedDocumentUrl && (
                    <a
                        href={getDocumentUrl(currentSignatureObj.signedDocumentUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-semibold transition"
                    >
                        <Download size={16} /> Download Signed NDA (PDF)
                    </a>
                )}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-3">
                    <FileText size={18} className="text-blue-600" />
                    <h2 className="text-base font-semibold text-gray-800">NDA Documents</h2>
                </div>

                <div className="p-4 md:p-6">
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
                            ))}
                        </div>
                    ) : ndas.length === 0 ? (
                        <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-2xl">
                            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-500">No NDAs found for your company.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Document Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ndas.map((n) => {
                                    const isSigned = mySignatures.includes(n._id);
                                    return (
                                        <div 
                                            key={n._id} 
                                            onClick={() => setSelectedNda(n)}
                                            className={`border rounded-xl p-4 cursor-pointer transition-all ${
                                                selectedNda?._id === n._id 
                                                    ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500" 
                                                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 shadow-sm"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-lg ${selectedNda?._id === n._id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <h3 className={`font-medium text-sm ${selectedNda?._id === n._id ? "text-blue-900" : "text-gray-800"}`}>
                                                        {n.title}
                                                    </h3>
                                                </div>
                                                {isSigned ? (
                                                    <CheckCircle size={16} className="text-emerald-500" />
                                                ) : (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/50">
                                                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${isSigned ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                                                    {isSigned ? "Signed & Stamped" : "Action Required"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Document Viewer */}
                            <div className="border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm bg-white">
                                {selectedNda ? (
                                    <>
                                        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{selectedNda.title}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {isCurrentSigned ? "Signed digital copy with DigiCoders seal & Gopal Sir's signature" : "Please review all terms carefully before digitally signing"}
                                                </p>
                                            </div>

                                            {isCurrentSigned ? (
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                                                    <CheckCircle size={14} className="text-emerald-600" /> Stamped & Signed
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                                                    Pending Signature
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 md:p-6 flex-1 min-h-[600px] bg-gray-100 flex flex-col items-center justify-center">
                                            {documentDisplayUrl ? (
                                                <iframe 
                                                    src={`${documentDisplayUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} 
                                                    title="NDA Document" 
                                                    className="w-full h-[700px] border border-gray-300 rounded-xl shadow bg-white"
                                                />
                                            ) : (
                                                <p className="text-gray-500">No document attached.</p>
                                            )}
                                        </div>

                                        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
                                            <div className="text-xs text-gray-500">
                                                {isCurrentSigned ? (
                                                    <span>NDA has been signed and validated. All intellectual property terms apply.</span>
                                                ) : (
                                                    <span>Signing will automatically insert your details, Gopal Sir's sign, and company seal.</span>
                                                )}
                                            </div>

                                            <div>
                                                {isCurrentSigned ? (
                                                    <button disabled className="px-6 py-2.5 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                                                        Already Signed
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={openSigningModal}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow"
                                                    >
                                                        <Edit3 size={16} /> Fill Details & Sign NDA
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                        <Search size={48} className="mb-4 opacity-20" />
                                        <p>Select an NDA from the list to view and sign.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Multi-Step Signing Modal */}
            {showSigningModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">NDA Digital Execution</h3>
                                    <p className="text-xs text-gray-500">DigiCoders Technologies Private Limited</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSigningModal(false)} 
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Stepper Indicator */}
                        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between text-xs font-medium">
                            <div className={`flex items-center gap-2 ${signingStep >= 1 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${signingStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</span>
                                <span>Employee Details</span>
                            </div>
                            <div className="h-0.5 flex-1 bg-gray-200 mx-3"></div>
                            <div className={`flex items-center gap-2 ${signingStep >= 2 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${signingStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</span>
                                <span>Witness Details</span>
                            </div>
                            <div className="h-0.5 flex-1 bg-gray-200 mx-3"></div>
                            <div className={`flex items-center gap-2 ${signingStep >= 3 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${signingStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>3</span>
                                <span>Digital Signature</span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
                            {/* Step 1: Employee Form */}
                            {signingStep === 1 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                                        ✨ These details will be automatically stamped on <strong>Page 1</strong> and <strong>Page 9</strong> of the official NDA. Please review or edit if necessary.
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name (Mr./Ms.) *</label>
                                            <input 
                                                type="text" 
                                                value={employeeForm.fullName}
                                                onChange={(e) => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. Kiran Maddheshiya"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Father / Guardian Name (S/o / D/o)</label>
                                            <input 
                                                type="text" 
                                                value={employeeForm.fatherName}
                                                onChange={(e) => setEmployeeForm({ ...employeeForm, fatherName: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. Father's Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Employee ID *</label>
                                            <input 
                                                type="text" 
                                                value={employeeForm.employeeId}
                                                onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. EMP-1024"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Designation *</label>
                                            <input 
                                                type="text" 
                                                value={employeeForm.designation}
                                                onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. Full Stack Developer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number *</label>
                                            <input 
                                                type="text" 
                                                value={employeeForm.phone}
                                                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. 9876543210"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Email ID *</label>
                                            <input 
                                                type="email" 
                                                value={employeeForm.email}
                                                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. employee@digicoders.in"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Address *</label>
                                        <textarea 
                                            rows={2}
                                            value={employeeForm.address}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                                            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            placeholder="e.g. Sector O, Aliganj, Lucknow, Uttar Pradesh - 226024"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Witness Form */}
                            {signingStep === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-900">
                                        ✍️ Please provide witness details who can attest to your NDA execution. These will be stamped on <strong>Page 9</strong>.
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Witness Full Name *</label>
                                            <input 
                                                type="text" 
                                                value={witnessForm.fullName}
                                                onChange={(e) => setWitnessForm({ ...witnessForm, fullName: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. Amit Verma"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Witness Mobile Number *</label>
                                            <input 
                                                type="text" 
                                                value={witnessForm.phone}
                                                onChange={(e) => setWitnessForm({ ...witnessForm, phone: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. 9123456780"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Witness Department / Designation / Role *</label>
                                        <input 
                                            type="text" 
                                            value={witnessForm.role}
                                            onChange={(e) => setWitnessForm({ ...witnessForm, role: e.target.value })}
                                            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. Senior HR Manager / Tech Lead / Colleague"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Witness Address *</label>
                                        <textarea 
                                            rows={2}
                                            value={witnessForm.address}
                                            onChange={(e) => setWitnessForm({ ...witnessForm, address: e.target.value })}
                                            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            placeholder="e.g. Indira Nagar, Lucknow, Uttar Pradesh"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Signature Canvas */}
                            {signingStep === 3 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-700 block">Draw Your Digital Signature *</label>
                                            <span className="text-[11px] text-gray-400">This signature will appear on the corner of every page and in the signature box.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                type="button" 
                                                onClick={handleClearSignature}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-medium transition"
                                                title="Erase / Clear signature"
                                            >
                                                <Eraser size={14} /> Erase / Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden relative shadow-inner">
                                        <SignatureCanvas 
                                            ref={sigPadRef} 
                                            penColor="#0a2540"
                                            canvasProps={{ className: 'w-full h-44 cursor-crosshair bg-slate-50/30' }} 
                                        />
                                        <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-gray-300 font-medium select-none">
                                            Sign here ✍️
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={agreedToTerms}
                                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-600 leading-relaxed">
                                                I hereby acknowledge that I have read, understood, and agreed to all 9 pages of the <strong>DigiCoders Technologies Private Limited Non-Disclosure & Confidentiality Agreement</strong>.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex items-center justify-between">
                            {signingStep > 1 ? (
                                <button 
                                    onClick={() => setSigningStep(signingStep - 1)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {signingStep < 3 ? (
                                <button 
                                    onClick={handleNextStep}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow hover:shadow-md"
                                >
                                    Next <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleFinalSubmit}
                                    disabled={isSigning}
                                    className="flex items-center gap-2 px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-md hover:shadow-lg disabled:opacity-60"
                                >
                                    {isSigning ? (
                                        <span>Stamping & Signing...</span>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} /> Submit & Sign NDA
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewNda;
