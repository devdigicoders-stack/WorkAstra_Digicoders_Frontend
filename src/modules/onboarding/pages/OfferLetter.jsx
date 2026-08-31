import React, { useEffect, useState } from "react";
import api from "../../../services/axios";
import { toast } from "react-toastify";
import { Printer } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { Navigate } from "react-router-dom";

export default function OfferLetter() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useStore();

    const isSuperAdmin = currentUser?.role?.name === "super_admin";
    const isAdmin = currentUser?.role?.name === "admin" || isSuperAdmin;

    if (isAdmin) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        const fetchOfferLetter = async () => {
            try {
                const res = await api.get("/api/onboarding/my-offer-letter");
                setData(res.data);
            } catch (error) {
                toast.error("Failed to load offer letter");
            } finally {
                setLoading(false);
            }
        };
        fetchOfferLetter();
    }, []);

    const handleDownload = async () => {
        const toastId = toast.loading("Generating PDF, please wait...");
        try {
            const res = await api.get("/api/onboarding/my-offer-letter/download", {
                responseType: "blob"
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Offer_Letter_${currentUser?.firstName || 'Employee'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.update(toastId, { render: "PDF Downloaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error("Download Offer Letter Error:", error);
            console.log("Error Response:", error?.response);
            toast.update(toastId, { render: "Failed to download PDF", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Offer Letter...</div>;
    if (!data) return <div className="p-8 text-center text-red-500 font-bold">Offer Letter not available.</div>;

    const { user, company, ctc, basic } = data;
    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', dateOptions);
    const joinDate = new Date(user.dateOfJoining || Date.now()).toLocaleDateString('en-US', dateOptions);

    return (
        <div className="p-4 md:p-8 w-full min-h-screen bg-gray-200 flex flex-col items-center overflow-y-auto pb-24">
            {/* Toolbar */}
            <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 shrink-0 print:hidden">
                <h1 className="text-2xl font-bold text-gray-800">My Offer Letter</h1>
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-semibold transition-all"
                >
                    <Printer size={18} /> Download Official PDF
                </button>
            </div>

            {/* Page 1 */}
            <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-xl rounded-sm border border-gray-300 p-10 md:p-14 relative overflow-hidden text-gray-800 mb-8 mx-auto">
                {/* Watermark Page 1 */}
                {company?.icon?.url && (
                    <img 
                        src={company.icon.url} 
                        alt="Watermark" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.15] w-[85%] pointer-events-none"
                        style={{ zIndex: 0 }}
                    />
                )}

                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-6">
                        {company?.icon?.url ? (
                            <img src={company.icon.url} alt="Company Logo" className="h-16 mx-auto object-contain" />
                        ) : (
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{company?.name || "Company Name"}</h2>
                        )}
                    </div>
                    
                    {/* Title */}
                    <div className="text-center font-bold text-xl underline underline-offset-4 mb-12 text-black">
                        Offer Letter
                    </div>
                    
                    {/* Content */}
                    <div className="text-[14.5px] leading-relaxed text-justify space-y-3">
                        <p>Dated: {today}</p>
                        <p>Mr {user.firstName} {user.lastName}</p>
                        <p>B/o {user.address || "Address"}</p>
                        <p className="mt-3">Dear {user.firstName},</p>
                        
                        <p>
                            We are pleased to inform you that, with reference to your application and subsequent interview you had with us, we are pleased to offer you as a <strong>"{user.designation?.name || user.role?.name || 'Developer'}"</strong> at our Corporate Head Office - Lucknow, on the terms and conditions discussed and agreed by you at the time of your interview. You are requested to join us on <strong>{joinDate}</strong> as agreed by you. Your monthly remuneration will be {ctc?.toLocaleString("en-IN")} INR and Your work timings will be <strong>10:00AM to 07:00PM, Monday to Saturday</strong>. You will be on probation period for first 3 months, after serving the probation period your performance and efforts will be reviewed to continue as permanent employee in {company?.name || 'DigiCoders'}. You will also get some incentive & increment for your Better Performance.
                        </p>
                        
                        <p>
                            We Will also review your performance and work every year and you will get benefits as per them. And your salary will be revised as per performance.
                        </p>
                        
                        <p>
                            As per the acceptance of this offer letter, you will also accept the attached Working Terms and Conditions (Annexure-I) and Non-Disclosure Agreement (Annexure-II) as per the joining rules and regulation. You will serve not less than 1 month of notice period when you decide to discontinue with your role at {company?.name || 'DigiCoders'}.
                        </p>
                        
                        <p>
                            Your first salary will be credited after 45 days of working, 15 days salary will be hold for the security deposited, it will be settled with your last salary from company (FnF Settlement, 60 Days after Reliving).
                        </p>
                        
                        <p>
                            This above offer is subject to yours being medically found fit and your document and background check being found satisfactory on verification. You should have your independent movement for performing your duties hence you are required to maintain own transportation.
                        </p>
                        
                        <p>
                            Now therefore, you are requested to submit one set copies of the following documents to us at the time of your joining. You are also advised to bring originals along with the copies same will be returned immediately after our verification.
                        </p>
                        
                        <div className="ml-6 my-2 leading-loose">
                            1. Educational certificates, 2 References.<br/>
                            2. Four passport size color photographs.<br/>
                            3. Two copies of Photo ID with Address Proof.
                        </div>
                    </div>
                </div>
            </div>

            {/* Page 2 */}
            <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-xl rounded-sm border border-gray-300 p-10 md:p-14 relative overflow-hidden text-gray-800 mx-auto">
                {/* Watermark Page 2 */}
                {company?.icon?.url && (
                    <img 
                        src={company.icon.url} 
                        alt="Watermark" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.15] w-[85%] pointer-events-none"
                        style={{ zIndex: 0 }}
                    />
                )}

                <div className="relative z-10 text-[14.5px] leading-relaxed text-justify space-y-4">
                    <p className="mt-8">
                        Please sign and return to the undersigned the duplicate copy of this letter signifying your acceptance.
                    </p>
                    
                    <p>
                        We welcome you to {company?.name || 'DigiCoders'} family and look forward to a fruitful collaboration. We are confident that your contribution will take us further in our journey towards becoming world leaders. We assure you of our support for your professional development and growth.
                    </p>

                    {/* Signatures */}
                    <div className="mt-12 text-[14.5px]">
                        <p className="mb-6">Best Regards,</p>
                        <p>Manager - Human Resources</p>
                        <p className="font-bold">{company?.name || 'DigiCoders Technologies Private Limited'}</p>
                    </div>
                    
                    <div className="mt-16 text-[14.5px] flex items-end">
                        <p>
                            I, ___________________________, accept the above offer and will begin the internship position on {joinDate}.
                            <br/><br/><br/>
                            Signature_________________________.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
