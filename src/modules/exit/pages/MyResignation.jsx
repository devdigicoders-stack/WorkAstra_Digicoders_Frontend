import React, { useState, useEffect } from 'react';
import { resignationService } from '../../../services/resignationService';
import { toast } from 'react-toastify';
import { CalendarClock, FileText, User, ShieldCheck, Check, ArrowLeft, Download, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyResignation = () => {
    const [resignation, setResignation] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMyResignation();
    }, []);

    const fetchMyResignation = async () => {
        setLoading(true);
        try {
            const data = await resignationService.getMyResignation();
            if (data.success && data.resignations.length > 0) {
                // Show the active one, or latest
                const active = data.resignations.find(r => ["Pending", "Approved"].includes(r.status));
                setResignation(active || data.resignations[0]);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch resignation data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!resignation) {
        return (
            <div className="p-4 sm:p-6 min-h-full flex flex-col items-center justify-center w-full">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
                    <div className="flex justify-center mb-4">
                        <div className="bg-gray-50 p-4 rounded-full">
                            <LogOut size={48} className="text-gray-300" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Exit Record</h2>
                    <p className="text-gray-500">You do not have any active resignation or exit record initiated at the moment.</p>
                </div>
            </div>
        );
    }

    const isApproved = resignation.status === 'Approved';
    const isRejected = resignation.status === 'Rejected';
    const isPending = resignation.status === 'Pending';
    
    // Formatting dates
    const rawDate = resignation.approvedLastWorkingDay || resignation.requestedLastWorkingDay;
    const finalDateObj = rawDate ? new Date(rawDate) : null;
    
    const formattedMainDate = finalDateObj 
        ? finalDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Pending Approval...';
        
    const formattedSubDate = finalDateObj
        ? finalDateObj.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        : 'Awaiting confirmation';

    const employee = resignation.employeeId || {};

    return (
        <div className="min-h-full w-full bg-[#f8f9fc] p-4 sm:p-6 lg:p-8 font-sans text-gray-800">
            <div className="w-full h-full flex flex-col">
                
                {/* Top Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative">
                    <div className="z-10">
                        <h1 className="text-4xl font-bold text-[#0f2830] mb-2 tracking-tight">Exit Record</h1>
                        <div className="flex items-center flex-wrap gap-3">
                            <p className="text-[#3b4c53] font-medium text-[15px]">
                                Your exit status is currently <span className={`${isApproved ? 'text-emerald-600' : isRejected ? 'text-red-600' : 'text-amber-600'} font-semibold lowercase`}>{resignation.status}</span>.
                            </p>
                            <div className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                                isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                isRejected ? 'bg-red-50 text-red-700 border border-red-100' : 
                                'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                                {isApproved && <Check size={14} strokeWidth={3} />}
                                {resignation.status}
                            </div>
                        </div>
                    </div>
                    
                    {/* Illustration - Positioning to match the exact design */}
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-4">
                        <img src="/image.png" alt="Exit Illustration" className="h-32 object-contain mix-blend-multiply" />
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8 relative z-20">
                    
                    {/* Final Last Working Day Banner */}
                    <div className="bg-[#f2fbf6] rounded-2xl p-6 md:p-8 flex items-start gap-5 mb-8 border border-[#e1f5eb]">
                        <div className="bg-white p-3.5 rounded-xl text-emerald-600 shadow-sm border border-emerald-50">
                            <CalendarClock size={32} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-emerald-700 font-bold text-[13px] tracking-[0.1em] uppercase mb-1">
                                Final Last Working Day
                            </h3>
                            <h2 className="text-[#0d6842] text-3xl md:text-[40px] font-bold tracking-tight mb-2">
                                {formattedMainDate}
                            </h2>
                            <div className="flex items-center gap-2 text-[#4f7a65] text-sm font-medium">
                                <CalendarClock size={16} />
                                <span>{formattedSubDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* Employee Details Box */}
                            <div className="bg-[#fafbfb] rounded-2xl p-6 border border-gray-100 h-auto">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="bg-[#e9f5ef] p-2 rounded-lg text-emerald-700">
                                        <User size={18} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-emerald-800 font-bold text-sm uppercase tracking-wide">Employee Details</h3>
                                </div>
                                <div className="space-y-3.5">
                                    <div className="grid grid-cols-[120px_1fr] text-[14px]">
                                        <span className="text-gray-500 font-medium">Employee ID</span>
                                        <span className="text-gray-800 font-semibold">: {employee.employeeCode || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] text-[14px]">
                                        <span className="text-gray-500 font-medium">Employee Name</span>
                                        <span className="text-gray-800 font-semibold">: {employee.firstName} {employee.lastName}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] text-[14px]">
                                        <span className="text-gray-500 font-medium">Department</span>
                                        <span className="text-gray-800 font-semibold">: {employee.department?.name || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] text-[14px]">
                                        <span className="text-gray-500 font-medium">Designation</span>
                                        <span className="text-gray-800 font-semibold">: {employee.designation?.name || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] text-[14px]">
                                        <span className="text-gray-500 font-medium">Date of Joining</span>
                                        <span className="text-gray-800 font-semibold">: {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes Box */}
                            <div className="bg-[#fafbfb] rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-[#e9f5ef] p-2 rounded-lg text-emerald-700">
                                        <FileText size={18} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-emerald-800 font-bold text-sm uppercase tracking-wide">Notes</h3>
                                </div>
                                <p className="text-gray-600 text-[14.5px] leading-relaxed">
                                    {resignation.clearanceStatus === "Completed" ? "All clearance completed." : (resignation.remarks || "No specific notes provided by the admin.")}
                                </p>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Reason for Exit Box */}
                            <div className="bg-[#fafbfb] rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-[#e9f5ef] p-2 rounded-lg text-emerald-700">
                                        <FileText size={18} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-emerald-800 font-bold text-sm uppercase tracking-wide">Reason For Exit</h3>
                                </div>
                                <p className="text-gray-800 text-[14.5px] font-medium mt-2">
                                    {resignation.reason}
                                </p>
                            </div>

                            {/* Exit Status Box */}
                            <div className="bg-[#fafbfb] rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="bg-[#e9f5ef] p-2 rounded-lg text-emerald-700">
                                        <ShieldCheck size={18} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-emerald-800 font-bold text-sm uppercase tracking-wide">Exit Status</h3>
                                </div>
                                
                                <div className={`inline-flex px-3.5 py-1.5 rounded-md text-[13px] font-bold items-center gap-1.5 mb-3 ${
                                    isApproved ? 'bg-[#e7f6ef] text-[#137a4e]' : 
                                    isRejected ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                    {isApproved && <Check size={14} strokeWidth={3} />}
                                    {resignation.status}
                                </div>
                                
                                <p className="text-gray-600 text-[14.5px]">
                                    {resignation.clearanceStatus === "Completed" 
                                        ? "Exit process has been completed." 
                                        : isApproved 
                                            ? "Exit request approved. Clearance pending." 
                                            : isPending 
                                                ? "Your exit request is under review." 
                                                : "Exit request has been rejected."}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Actions (Removed as per request) */}
            </div>
        </div>
    );
};

export default MyResignation;
