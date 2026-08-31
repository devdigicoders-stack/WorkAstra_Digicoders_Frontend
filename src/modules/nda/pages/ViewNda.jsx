import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../../../context/StoreContext";
import { FileText, Edit3, X, CheckCircle, Search } from "lucide-react";
import { toast } from "react-toastify";
import SignatureCanvas from "react-signature-canvas";
import { getAllNdas, signNda, getMySignatures } from "../../../services/ndaService";
import DOMPurify from 'dompurify';
import ClientMyNda from "./ClientMyNda";

const ViewNda = () => {
    const { user } = useStore();
    const [ndas, setNdas] = useState([]);
    const [mySignatures, setMySignatures] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // View State
    const [selectedNda, setSelectedNda] = useState(null);
    
    // Signature Pad State
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [signaturePreview, setSignaturePreview] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const sigPadRef = useRef(null);

    // If role is Client, show their specific My NDA view
    if (user?.role?.name?.toLowerCase() === "client") {
        return <ClientMyNda />;
    }

    useEffect(() => {
        fetchData();
    }, [user?.companyId]);

    const getDocumentUrl = (url) => {
        if (!url) return "";
        let baseUrl = import.meta.env.VITE_BASE_URL?.replace(/\/$/, '') || "";
        
        let finalUrl = url;
        if (url.startsWith("http://localhost:8008")) {
            finalUrl = url.replace("http://localhost:8008", baseUrl);
        } else if (url.startsWith("/")) {
            finalUrl = `${baseUrl}${url}`;
        }
        
        // Force HTTPS if it's hitting the live Render backend
        if (finalUrl.includes('onrender.com') && finalUrl.startsWith('http://')) {
            finalUrl = finalUrl.replace('http://', 'https://');
        }
        
        return finalUrl;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ndasRes, sigsRes] = await Promise.all([
                getAllNdas(user?.companyId?._id || ""),
                getMySignatures()
            ]);
            
            if (ndasRes.success) setNdas(ndasRes.ndas);
            if (sigsRes.success) {
                setMySignatures(sigsRes.signatures.map(s => s.ndaId?._id || s.ndaId));
            }
        } catch (error) {
            toast.error(error.message || "Failed to fetch NDAs");
        } finally {
            setLoading(false);
        }
    };

    const handleClearSignature = () => {
        sigPadRef.current?.clear();
    };

    const handleSaveSignature = () => {
        if (sigPadRef.current?.isEmpty()) {
            return toast.error("Please provide a signature first");
        }
        
        const signatureBase64 = sigPadRef.current.getCanvas().toDataURL("image/png");
        setSignaturePreview(signatureBase64);
        setShowSignaturePad(false);
    };

    const confirmAndUploadSignature = async () => {
        if (!signaturePreview) return;
        
        try {
            setIsSigning(true);
            const res = await signNda(selectedNda._id, signaturePreview);
            if (res.success) {
                toast.success("NDA Signed Successfully!");
                setSignaturePreview(null);
                fetchData(); // refresh to update UI status
            }
        } catch (error) {
            toast.error(error.message || "Failed to save signature");
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full space-y-8 h-[calc(100vh-64px)] overflow-y-auto">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Non-Disclosure Agreements</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and sign your pending NDAs</p>
                </div>
            </div>

            {/* List / View Section */}
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
                        <div className="flex flex-col gap-8">
                            {/* Document List */}
                            <div className="w-full">
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
                                                        <CheckCircle size={16} className="text-green-500" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/50">
                                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${isSigned ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                        {isSigned ? "Signed" : "Pending Signature"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Document Viewer */}
                            <div className="w-full border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm bg-white">
                                {selectedNda ? (
                                    <>
                                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                            <h3 className="text-lg font-bold text-gray-900">{selectedNda.title}</h3>
                                            {mySignatures.includes(selectedNda._id) ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                                    <CheckCircle size={12} /> Already Signed
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                    Requires Signature
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[500px] bg-gray-50 flex flex-col items-center justify-center">
                                            {selectedNda.document?.url ? (
                                                selectedNda.document.url.includes('/image/upload/') || selectedNda.document.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                    <img src={getDocumentUrl(selectedNda.document.url)} alt="NDA Document" className="max-w-full shadow-sm rounded-lg border border-gray-200" />
                                                ) : (
                                                    <iframe 
                                                        src={`${getDocumentUrl(selectedNda.document.url)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                                                        title="NDA Document" 
                                                        className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg shadow-sm bg-white"
                                                    />
                                                )
                                            ) : (
                                                <p className="text-gray-500">No document attached.</p>
                                            )}
                                        </div>
                                        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                                            {mySignatures.includes(selectedNda._id) ? (
                                                <button disabled className="px-6 py-2.5 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                                                    Document Signed
                                                </button>
                                            ) : signaturePreview ? (
                                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-end">
                                                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-3">
                                                        <span className="text-xs text-gray-500 font-medium">Your Signature:</span>
                                                        <img src={signaturePreview} alt="Preview" className="h-8 object-contain" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setSignaturePreview(null);
                                                                setShowSignaturePad(true);
                                                            }}
                                                            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition"
                                                        >
                                                            Redraw
                                                        </button>
                                                        <button 
                                                            onClick={confirmAndUploadSignature}
                                                            disabled={isSigning}
                                                            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow disabled:opacity-70"
                                                        >
                                                            {isSigning ? "Uploading..." : "Confirm & Upload"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setShowSignaturePad(true)}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow"
                                                >
                                                    <Edit3 size={16} /> Draw Signature
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                        <Search size={48} className="mb-4 opacity-20" />
                                        <p>Select an NDA from the list to read and sign.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Signature Canvas Modal */}
            {showSignaturePad && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Digital Signature</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Please sign below to agree to the terms.</p>
                            </div>
                            <button onClick={() => setShowSignaturePad(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-gray-50/50">
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden relative">
                                <SignatureCanvas 
                                    ref={sigPadRef} 
                                    canvasProps={{ className: 'w-full h-48 cursor-crosshair' }} 
                                />
                                <button 
                                    onClick={handleClearSignature}
                                    className="absolute top-2 right-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition"
                                >
                                    Clear
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                By signing, you acknowledge that you have read and agree to the terms of the Non-Disclosure Agreement.
                            </p>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                            <button 
                                onClick={() => setShowSignaturePad(false)}
                                className="px-5 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveSignature}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-sm hover:shadow"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewNda;
