import React, { useEffect, useState } from "react";
import api from "../../../services/axios";
import { toast } from "react-toastify";
import { Download, FileText, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { Navigate } from "react-router-dom";
import OfferLetterViewer from "../../employee/components/OfferLetterViewer";

export default function OfferLetter({ userId = null, standalone = true }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const { user: currentUser } = useStore();

    const isSuperAdmin = currentUser?.role?.name === "super_admin";
    const isAdmin = currentUser?.role?.name === "admin" || isSuperAdmin;

    // Only redirect if accessed as standalone employee page and user is admin without explicit userId
    if (standalone && !userId && isAdmin) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        const fetchOfferLetter = async () => {
            try {
                const endpoint = userId 
                    ? `/api/onboarding/user-offer-letter/${userId}` 
                    : "/api/onboarding/my-offer-letter";
                const res = await api.get(endpoint);
                setData(res.data);
            } catch (error) {
                toast.error("Failed to load offer letter");
            } finally {
                setLoading(false);
            }
        };
        fetchOfferLetter();
    }, [userId]);

    const handleDownload = async () => {
        const toastId = toast.loading("Generating PDF, please wait...");
        try {
            const endpoint = userId 
                ? `/api/onboarding/user-offer-letter/${userId}/download`
                : "/api/onboarding/my-offer-letter/download";
            const res = await api.get(endpoint, {
                responseType: "blob"
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            const empName = data?.user?.firstName || currentUser?.firstName || "Employee";
            link.setAttribute("download", `Offer_Letter_${empName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.update(toastId, { render: "PDF Downloaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error("Download Offer Letter Error:", error);
            toast.update(toastId, { render: "Failed to download PDF", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    if (loading) return (
        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            Loading Offer Letter...
        </div>
    );
    
    if (!data) return (
        <div className="p-12 text-center text-red-500 font-semibold">
            Offer Letter not available.
        </div>
    );

    const { user, company, ctc } = data;
    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const joinDate = new Date(user.dateOfJoining || Date.now()).toLocaleDateString('en-US', dateOptions);

    return (
        <div className="p-4 sm:p-8 w-full min-h-screen bg-gray-50/70 flex flex-col items-center justify-center max-w-full overflow-x-hidden">
            {/* Offer Letter Main Action Card */}
            <div className={`bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 sm:p-10 w-full text-center transition-all ${showPreview ? "max-w-4xl" : "max-w-xl"}`}>
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
                    <FileText size={32} />
                </div>
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-xs font-semibold mb-3">
                    <CheckCircle2 size={13} /> Official Offer Letter
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {standalone ? "My Offer Letter" : `${user.firstName}'s Offer Letter`}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mb-6">
                    {company?.name ? `${company.name} • Official Employment Appointment` : "Official employment offer letter"}
                </p>

                {/* Candidate & Job Summary Box */}
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 text-left space-y-2.5 mb-6 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Employee Name:</span>
                        <span className="font-semibold text-gray-900">{user.firstName} {user.lastName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Designation:</span>
                        <span className="font-semibold text-gray-900">{user.designation?.name || user.role?.name || "Developer"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Date of Joining:</span>
                        <span className="font-semibold text-gray-900">{joinDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-gray-500">Monthly Remuneration:</span>
                        <span className="font-bold text-emerald-700">₹{ctc ? Number(ctc).toLocaleString("en-IN") : "0"}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col sm:flex-row gap-3">
                    <button 
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-3 rounded-xl font-semibold transition active:scale-95 text-sm cursor-pointer"
                    >
                        {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                        {showPreview ? "Hide Preview" : "View Offer Letter"}
                    </button>
                    <button 
                        type="button"
                        onClick={handleDownload}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition active:scale-95 text-sm shadow-sm hover:shadow cursor-pointer"
                    >
                        <Download size={18} /> Download Official PDF
                    </button>
                </div>

                {/* Live PDF Preview */}
                {showPreview && (
                    <div className="mt-8 pt-6 border-t border-gray-100 text-left">
                        <OfferLetterViewer
                            userId={userId}
                            myOfferLetter={!userId}
                            employeeName={`${user.firstName} ${user.lastName}`}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
