import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import { CheckCircle2, Download } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import api from "../../../services/axios";
import { getClientNdaTemplate, getMySignatures } from "../../../services/ndaService";
import { getFileUrl } from "../../../utils/imageUtils";

const ClientNdaPage = ({ inPanel = false }) => {
    const { user, setUser } = useStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [signedData, setSignedData] = useState(null);
    const [templateUrl, setTemplateUrl] = useState("");
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [signatureData, setSignatureData] = useState(null);
    const sigCanvas = useRef({});

    useEffect(() => {
        initPage();
    }, []);

    const initPage = async () => {
        try {
            setLoading(true);

            // 1. Check if client has already signed their NDA
            try {
                const sigRes = await getMySignatures();
                if (sigRes?.success && sigRes?.signatures?.length > 0) {
                    const foundSig = sigRes.signatures.find(s => s.signedDocumentUrl) || sigRes.signatures[0];
                    if (foundSig && foundSig.signedDocumentUrl) {
                        setSignedData(foundSig);
                        setLoading(false);
                        return;
                    }
                }
            } catch (sigErr) {
                console.error("Error checking existing signature:", sigErr);
            }

            // 2. If not signed, fetch the active client NDA template
            const res = await getClientNdaTemplate();
            if (res.success && res.nda?.document?.url) {
                setTemplateUrl(getFileUrl(res.nda.document.url));
            } else {
                // No active Client NDA found — auto-skip silently and go to dashboard
                try {
                    const skipRes = await api.post("/api/nda/client/skip");
                    if (skipRes.data.success) {
                        setUser({ ...user, clientNdaStatus: "skipped" });
                    }
                } catch (skipErr) {
                    console.error("Auto-skip failed:", skipErr);
                }
                navigate("/", { replace: true });
                return;
            }
        } catch (error) {
            console.error("Failed to fetch NDA template:", error);
            navigate("/", { replace: true });
            return;
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        try {
            setLoading(true);
            const response = await api.post("/api/nda/client/skip");
            if (response.data.success) {
                toast.success("NDA Skipped");
                setUser({ ...user, clientNdaStatus: "skipped" });
                navigate("/");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to skip NDA");
        } finally {
            setLoading(false);
        }
    };

    const handleSignSubmit = async () => {
        if (sigCanvas.current.isEmpty()) {
            return toast.error("Please provide a signature first");
        }

        try {
            setLoading(true);
            const base64Data = sigCanvas.current.getCanvas().toDataURL("image/png");
            setSignatureData(base64Data);
            
            const response = await api.post("/api/nda/client/send-otp");
            if (response.data.success) {
                toast.success(response.data.message || "OTP sent to your email");
                setShowSignaturePad(false);
                setShowOtpModal(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyAndSubmitSignature = async () => {
        if (!otp || otp.length < 6) {
            return toast.error("Please enter a valid OTP");
        }

        try {
            setLoading(true);
            const signatureBase64 = signatureData;
            
            const response = await api.post("/api/nda/client/sign", { signatureBase64, otp });
            if (response.data.success) {
                toast.success("NDA Signed Successfully!");
                setUser({ ...user, clientNdaStatus: "signed" });
                setShowOtpModal(false);
                if (response.data.signedDocumentUrl) {
                    setSignedData({
                        signedDocumentUrl: response.data.signedDocumentUrl,
                        createdAt: new Date()
                    });
                } else {
                    navigate("/");
                }
            }
        } catch (error) {
            console.error("FULL ERROR DETAILS:", error);
            console.error("ERROR RESPONSE:", error.response);
            
            toast.error(error.response?.data?.message || "Failed to sign NDA or Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const clearSignature = () => {
        sigCanvas.current.clear();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    if (signedData) {
        const signedUrl = getFileUrl(signedData.signedDocumentUrl);
        return (
            <div className={`${inPanel ? 'h-full bg-white flex flex-col' : 'min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4'}`}>
                <div className={`w-full ${inPanel ? 'flex-1' : 'max-w-4xl bg-white rounded-lg shadow-lg'} overflow-hidden flex flex-col`}>
                    <div className="bg-emerald-600 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                                <CheckCircle2 size={24} className="text-emerald-100" /> Non-Disclosure Agreement (NDA)
                            </h1>
                            <p className="text-emerald-100 text-xs sm:text-sm mt-1">
                                ✓ Document Signed & Stamped on {new Date(signedData.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <a
                            href={signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-sm shrink-0"
                        >
                            <Download size={16} /> Download Signed NDA
                        </a>
                    </div>

                    <div className="p-6 flex-1 flex flex-col bg-gray-100">
                        {/* PDF Viewer for Signed PDF */}
                        <div className="w-full h-[65vh] bg-white border border-gray-300 rounded-md shadow-inner overflow-hidden mb-6">
                            <iframe 
                                src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                className="w-full h-full"
                                title="Client Signed NDA Document"
                            ></iframe>
                        </div>

                        {/* Actions for Signed view */}
                        <div className="bg-white p-5 rounded-md shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span>Your signature is permanently stamped on this document.</span>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <a
                                    href={signedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 w-full sm:w-auto shadow"
                                >
                                    <Download size={16} /> Download Copy
                                </a>
                                {!inPanel && (
                                    <button
                                        onClick={() => navigate("/")}
                                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition w-full sm:w-auto"
                                    >
                                        Go to Dashboard
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!templateUrl && !loading) {
        // No NDA — already redirected in fetchTemplate
        return null;
    }

    return (
        <div className={`${inPanel ? 'h-full bg-white flex flex-col' : 'min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4'}`}>
            <div className={`w-full ${inPanel ? 'flex-1' : 'max-w-4xl bg-white rounded-lg shadow-lg'} overflow-hidden flex flex-col`}>
                <div className="bg-indigo-600 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white text-center">Non-Disclosure Agreement (NDA)</h1>
                    <p className="text-indigo-100 text-center text-sm mt-1">Please review and sign the document below</p>
                </div>

                <div className="p-6 flex-1 flex flex-col bg-gray-100">
                    {/* PDF Viewer */}
                    <div className="w-full h-[60vh] bg-white border border-gray-300 rounded-md shadow-inner overflow-hidden mb-6">
                        <iframe 
                            src={`${getFileUrl(templateUrl)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            className="w-full h-full"
                            title="Client NDA Document"
                        ></iframe>
                    </div>

                    {/* Actions */}
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            {!inPanel && (
                                <button 
                                    onClick={handleSkip}
                                    disabled={loading}
                                    className="px-8 py-3 text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 rounded-lg font-medium transition-colors w-full sm:w-auto"
                                >
                                    {loading ? "Processing..." : "Skip for Now"}
                                </button>
                            )}
                            <button 
                                onClick={() => setShowSignaturePad(true)}
                                disabled={loading}
                                className="px-8 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors w-full sm:w-auto shadow-md"
                            >
                                Sign NDA
                            </button>
                        </div>
                    </div>

                    {/* Signature Modal */}
                    {showSignaturePad && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 transition-all">
                            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg relative animate-fade-in-up">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center border-b pb-3">Sign Your NDA</h3>
                                
                                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6 overflow-hidden w-full h-[200px]">
                                    <SignatureCanvas 
                                        ref={sigCanvas} 
                                        canvasProps={{ 
                                            className: 'sigCanvas w-full h-full touch-none cursor-crosshair' 
                                        }} 
                                    />
                                </div>
                                
                                <div className="flex flex-wrap justify-end gap-3 w-full">
                                    <button 
                                        onClick={clearSignature}
                                        className="px-4 py-2 text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-md transition-colors font-medium mr-auto"
                                    >
                                        Clear
                                    </button>
                                    <button 
                                        onClick={() => setShowSignaturePad(false)}
                                        className="px-5 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 rounded-md transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSignSubmit}
                                        disabled={loading}
                                        className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md shadow transition-colors font-medium flex items-center justify-center min-w-[120px]"
                                    >
                                        {loading ? (
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : "Send OTP"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OTP Modal */}
                    {showOtpModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 transition-all">
                            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm relative animate-fade-in-up">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">Verify Signature</h3>
                                <p className="text-sm text-gray-500 text-center mb-6">Enter the 6-digit code sent to your email to confirm your signature.</p>
                                
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter OTP"
                                    maxLength="6"
                                    className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                                />
                                
                                <div className="flex gap-3 w-full">
                                    <button 
                                        onClick={() => setShowOtpModal(false)}
                                        className="flex-1 px-5 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 rounded-md transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={verifyAndSubmitSignature}
                                        disabled={loading}
                                        className="flex-1 px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow transition-colors font-medium flex items-center justify-center"
                                    >
                                        {loading ? "Verifying..." : "Verify & Submit"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientNdaPage;
