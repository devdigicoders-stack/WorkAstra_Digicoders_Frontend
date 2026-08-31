import React, { useEffect, useState } from "react";
import { getOnboardingRequests, approveOnboarding, rejectOnboarding } from "../../../services/onboardingService";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Eye, FileText, Download, X, User, Phone, MapPin, Briefcase, Users, Link, Loader2 } from "lucide-react";
import { FaReact } from "react-icons/fa";
import { useStore } from "../../../context/StoreContext";
import Swal from "sweetalert2";

const getDynamicUrl = (dbUrl) => {
    if (!dbUrl) return "";
    if (dbUrl.includes("localhost:8008")) {
        const relativePath = dbUrl.split("localhost:8008")[1];
        const baseUrl = import.meta.env.VITE_BASE_URL || "";
        return `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${relativePath}`;
    }
    return dbUrl;
};

export default function AdminApprovals() {
    const { user } = useStore();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [basicSalary, setBasicSalary] = useState("");
    const [isApproving, setIsApproving] = useState(false);

    const fetchRequests = async () => {
        try {
            const data = await getOnboardingRequests();
            setRequests(data.requests || []);
        } catch (error) {
            toast.error("Failed to fetch pending requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async () => {
        if (!basicSalary || basicSalary <= 0) {
            return toast.error("Please enter a valid CTC / Basic Salary");
        }
        setIsApproving(true);
        try {
            await approveOnboarding(selectedRequest._id, Number(basicSalary));
            toast.success("Employee Approved & Offer Letter Sent!");
            setSelectedRequest(null);
            fetchRequests();
        } catch (error) {
            console.error("Full approval error:", error);
            console.log("Error Response Data:", error?.response?.data);
            toast.error(error?.response?.data?.message || "Failed to approve");
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to reject this application?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, reject it!"
        });

        if (!result.isConfirmed) return;

        try {
            await rejectOnboarding(selectedRequest._id);
            toast.success("Application Rejected Successfully.");
            setSelectedRequest(null);
            fetchRequests();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to reject");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading requests...</div>;

    const filteredRequests = requests.filter(r => {
        if (activeTab === "pending") return r.status === "submitted";
        if (activeTab === "approved") return r.status === "approved";
        if (activeTab === "rejected") return r.status === "rejected";
        return false;
    });

    return (
        <div className="p-6 w-full h-full">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Onboarding Approvals</h1>
            
            <div className="inline-flex bg-gray-100/80 p-1.5 rounded-2xl mb-8 border border-gray-200 shadow-inner">
                <button 
                    onClick={() => setActiveTab("pending")}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === "pending" ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                >
                    Pending Approvals
                </button>
                <button 
                    onClick={() => setActiveTab("approved")}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === "approved" ? "bg-white text-green-600 shadow-sm ring-1 ring-gray-200/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                >
                    Approved
                </button>
                <button 
                    onClick={() => setActiveTab("rejected")}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === "rejected" ? "bg-white text-red-600 shadow-sm ring-1 ring-gray-200/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                >
                    Rejected
                </button>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500 border border-gray-100">
                    No {activeTab} onboarding requests found.
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="py-4 px-6 font-semibold text-sm text-gray-600">Candidate Name</th>
                                    <th className="py-4 px-6 font-semibold text-sm text-gray-600">Contact Details</th>
                                    <th className="py-4 px-6 font-semibold text-sm text-gray-600">Experience</th>
                                    <th className="py-4 px-6 font-semibold text-sm text-gray-600">Status</th>
                                    <th className="py-4 px-6 font-semibold text-sm text-gray-600 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRequests.map(req => (
                                    <tr key={req._id} className="hover:bg-gray-50/50 transition">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                    {req.user?.firstName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{req.user?.firstName} {req.user?.lastName}</p>
                                                    {req.linkedInProfile && <a href={req.linkedInProfile} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"><Link size={10}/> LinkedIn</a>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-medium text-gray-800">{req.user?.email}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{req.user?.phone || req.alternateMobile}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                                                {req.yearsOfExperience} {req.yearsOfExperience == 1 ? "Year" : "Years"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button 
                                                onClick={() => setSelectedRequest(req)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                                            >
                                                <Eye size={16} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Application Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-gray-50 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/20">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10 relative">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg ring-4 ring-blue-50 transform rotate-3 hover:rotate-0 transition-all">
                                    <FaReact size={32} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight capitalize">
                                        {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                                    </h2>
                                    <p className="text-sm font-medium text-gray-500 mt-0.5">{selectedRequest.user?.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8 no-scrollbar">
                            
                            {/* Personal Details Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><User size={18} strokeWidth={2.5}/></div>
                                    <h3 className="font-bold text-gray-800 text-lg">Personal Details</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Phone</p><p className="font-semibold text-gray-800">{selectedRequest.user?.phone || selectedRequest.alternateMobile || 'Not Provided'}</p></div>
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Alt Mobile</p><p className="font-semibold text-gray-800">{selectedRequest.alternateMobile || 'Not Provided'}</p></div>
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Gender</p><p className="font-semibold text-gray-800 capitalize">{selectedRequest.user?.gender || 'Not Provided'}</p></div>
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Experience</p><p className="font-semibold text-gray-800">{selectedRequest.yearsOfExperience || 0} Years</p></div>
                                        
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Date of Birth</p><p className="font-semibold text-gray-800">{selectedRequest.user?.dateOfBirth ? new Date(selectedRequest.user.dateOfBirth).toLocaleDateString() : 'Not Provided'}</p></div>
                                        <div className="col-span-3"><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">LinkedIn</p>
                                            {selectedRequest.linkedInProfile ? (
                                                <a href={selectedRequest.linkedInProfile} target="_blank" className="font-semibold text-blue-600 hover:underline break-all">{selectedRequest.linkedInProfile}</a>
                                            ) : <p className="font-semibold text-gray-800">Not Provided</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2 mb-2"><MapPin size={14}/> Current Address</p>
                                            <p className="font-medium text-gray-800 text-sm leading-relaxed">{selectedRequest.currentAddress || 'Not Provided'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2 mb-2"><MapPin size={14}/> Permanent Address</p>
                                            <p className="font-medium text-gray-800 text-sm leading-relaxed">{selectedRequest.permanentAddress || 'Not Provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents Grid */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><FileText size={18} strokeWidth={2.5}/></div>
                                    <h3 className="font-bold text-gray-800 text-lg">Uploaded Documents</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {[
                                            { label: "Latest CV", doc: selectedRequest.cvFile },
                                            { label: "Aadhar Front", doc: selectedRequest.aadharFront },
                                            { label: "Aadhar Back", doc: selectedRequest.aadharBack },
                                            { label: "PAN Card", doc: selectedRequest.panCard },
                                            { label: "Bank Passbook", doc: selectedRequest.bankPassbook },
                                            { label: "Passport Photo", doc: selectedRequest.passportPhoto },
                                            { label: "Full Size Photo", doc: selectedRequest.fullSizePhoto },
                                            { label: "10th Marksheet", doc: selectedRequest.highSchoolCertificate },
                                            { label: "12th Marksheet", doc: selectedRequest.intermediateCertificate },
                                            { label: "Diploma", doc: selectedRequest.diplomaCertificate },
                                            { label: "Graduation", doc: selectedRequest.graduationCertificate },
                                            { label: "Offer Letter", doc: selectedRequest.previousCompany?.offerLetterFile },
                                            { label: "Exp Letter", doc: selectedRequest.previousCompany?.experienceLetterFile },
                                            { label: "Relieving Letter", doc: selectedRequest.previousCompany?.relievingLetterFile },
                                            { label: "Salary Slips", doc: selectedRequest.previousCompany?.salarySlipsFile }
                                        ].filter(item => item.doc && item.doc.url).length > 0 ? (
                                            [
                                                { label: "Latest CV", doc: selectedRequest.cvFile },
                                                { label: "Aadhar Front", doc: selectedRequest.aadharFront },
                                                { label: "Aadhar Back", doc: selectedRequest.aadharBack },
                                                { label: "PAN Card", doc: selectedRequest.panCard },
                                                { label: "Bank Passbook", doc: selectedRequest.bankPassbook },
                                                { label: "Passport Photo", doc: selectedRequest.passportPhoto },
                                                { label: "Full Size Photo", doc: selectedRequest.fullSizePhoto },
                                                { label: "10th Marksheet", doc: selectedRequest.highSchoolCertificate },
                                                { label: "12th Marksheet", doc: selectedRequest.intermediateCertificate },
                                                { label: "Diploma", doc: selectedRequest.diplomaCertificate },
                                                { label: "Graduation", doc: selectedRequest.graduationCertificate },
                                                { label: "Offer Letter", doc: selectedRequest.previousCompany?.offerLetterFile },
                                                { label: "Exp Letter", doc: selectedRequest.previousCompany?.experienceLetterFile },
                                                { label: "Relieving Letter", doc: selectedRequest.previousCompany?.relievingLetterFile },
                                                { label: "Salary Slips", doc: selectedRequest.previousCompany?.salarySlipsFile }
                                            ].map((item, idx) => item.doc?.url && (
                                                <a key={idx} href={getDynamicUrl(item.doc.url)} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-purple-50 hover:border-purple-300 hover:shadow-md transition-all group text-center aspect-square">
                                                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                        <FileText className="text-purple-500" size={20}/>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-purple-800 leading-tight">{item.label}</span>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-8 text-center text-gray-400 font-medium">No documents uploaded</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Previous Employment */}
                            {selectedRequest.yearsOfExperience > 0 && selectedRequest.previousCompany && selectedRequest.previousCompany.name && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 text-orange-700 rounded-lg"><Briefcase size={18} strokeWidth={2.5}/></div>
                                        <h3 className="font-bold text-gray-800 text-lg">Previous Employment</h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                                        <div className="col-span-2"><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Company Name</p><p className="font-semibold text-gray-800 text-base">{selectedRequest.previousCompany.name}</p></div>
                                        <div className="col-span-2"><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Designation</p><p className="font-semibold text-gray-800 text-base">{selectedRequest.previousCompany.designation}</p></div>
                                        
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Joining Date</p><p className="font-medium text-gray-800">{selectedRequest.previousCompany.dateOfJoining ? new Date(selectedRequest.previousCompany.dateOfJoining).toLocaleDateString() : 'N/A'}</p></div>
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Last Day</p><p className="font-medium text-gray-800">{selectedRequest.previousCompany.dateOfLastWorkingDay ? new Date(selectedRequest.previousCompany.dateOfLastWorkingDay).toLocaleDateString() : 'N/A'}</p></div>
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Employee ID</p><p className="font-medium text-gray-800">{selectedRequest.previousCompany.employeeId || 'N/A'}</p></div>
                                        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Last Salary</p><p className="font-bold text-green-600">₹ {selectedRequest.previousCompany.lastSalary || '0'}</p></div>
                                        
                                        <div className="col-span-4 mt-2 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                            <p className="text-orange-800 text-xs font-bold uppercase tracking-wider mb-2">HR Contact Info</p>
                                            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                                                <p><span className="text-gray-500 font-medium">Name:</span> <span className="font-semibold">{selectedRequest.previousCompany.hrName || 'N/A'}</span></p>
                                                <p><span className="text-gray-500 font-medium">Phone:</span> <span className="font-semibold">{selectedRequest.previousCompany.hrContact || 'N/A'}</span></p>
                                                <p><span className="text-gray-500 font-medium">Email:</span> <span className="font-semibold">{selectedRequest.previousCompany.hrEmail || 'N/A'}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Background References */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-teal-100 text-teal-700 rounded-lg"><Users size={18} strokeWidth={2.5}/></div>
                                    <h3 className="font-bold text-gray-800 text-lg">Background References</h3>
                                </div>
                                <div className="p-6">
                                    <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Personal References</h4>
                                    {selectedRequest.personalReferences && selectedRequest.personalReferences.filter(r => r.name).length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                            {selectedRequest.personalReferences.filter(r => r.name).map((ref, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-bold">{ref.name.charAt(0)}</div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 leading-none">{ref.name}</p>
                                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={10}/> {ref.mobile}</p>
                                                        </div>
                                                    </div>
                                                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">{ref.relation}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic mb-8">No personal references provided.</p>
                                    )}

                                    {selectedRequest.yearsOfExperience > 0 && (
                                        <>
                                            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Professional References</h4>
                                            {selectedRequest.professionalReferences && selectedRequest.professionalReferences.filter(r => r.name).length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedRequest.professionalReferences.filter(r => r.name).map((ref, idx) => (
                                                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">{ref.name.charAt(0)}</div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 leading-none">{ref.name}</p>
                                                                <p className="text-xs text-gray-600 mt-1 font-medium">{ref.designation} <span className="text-gray-400 font-normal">at</span> <span className="text-indigo-600">{ref.company}</span></p>
                                                                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><Phone size={10}/> {ref.mobile}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">No professional references provided.</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                        </div>
                        {/* Approval Footer */}
                        {selectedRequest.status === "submitted" && (
                            <div className="px-6 py-5 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-lg">Final Decision</h3>
                                    <p className="text-sm text-gray-500">Entering CTC will auto-generate Salary Structure & send Offer Letter.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                    <div className="relative w-full sm:w-48 md:w-56">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₹</span>
                                        <input 
                                            type="number" 
                                            value={basicSalary}
                                            onChange={e => setBasicSalary(e.target.value)}
                                            placeholder="Monthly CTC"
                                            className="pl-9 pr-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 w-full transition-all outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button 
                                            onClick={handleReject}
                                            className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 md:py-3 px-6 rounded-xl transition-all flex items-center justify-center transform hover:-translate-y-0.5"
                                        >
                                            <XCircle size={20} className="mr-2" /> Reject
                                        </button>
                                        <button 
                                            onClick={handleApprove}
                                            disabled={isApproving}
                                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-bold py-2.5 md:py-3 px-6 rounded-xl shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center transform hover:-translate-y-0.5 disabled:transform-none"
                                        >
                                            {isApproving ? (
                                                <><Loader2 size={20} className="mr-2 animate-spin" /> Approving...</>
                                            ) : (
                                                <><CheckCircle size={20} className="mr-2" /> Approve</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
