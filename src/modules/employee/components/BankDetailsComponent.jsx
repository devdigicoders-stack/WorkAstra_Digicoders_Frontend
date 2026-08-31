import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { Check, X, Upload, Building, CreditCard, Banknote, ShieldAlert, Pencil } from "lucide-react";
import { getMyBankDetails, submitBankDetails, approveBankDetails, rejectBankDetails, adminEditBankDetails } from "../services/UserService";
import { useStore } from "../../../context/StoreContext";
import api from "../../../services/axios";

const BankDetailsComponent = ({ employeeId = null, isAdminView = false }) => {
    const { user: currentUser } = useStore();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [bankStatus, setBankStatus] = useState(null);
    const [bankRejectedReason, setBankRejectedReason] = useState(null);
    
    const [form, setForm] = useState({
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        accountType: "",
        branch: "",
        upiId: "",
        upiName: "",
        upiNumber: "",
        upiType: "",
    });
    const [qrCodeFile, setQrCodeFile] = useState(null);
    const [qrCodePreview, setQrCodePreview] = useState(null);

    const isReadOnly = isAdminView ? !isEditing : (bankStatus === "approved" || bankStatus === "pending");

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                let data = null;
                if (isAdminView && employeeId) {
                    const res = await api.get(`/api/user/all`);
                    const users = res.data.users || [];
                    const found = users.find(u => u._id === employeeId);
                    if (found) {
                        data = {
                            bankDetails: found.bankDetails,
                            bankStatus: found.bankStatus,
                            bankRejectedReason: found.bankRejectedReason
                        };
                    }
                } else {
                    const res = await getMyBankDetails();
                    data = res;
                }
                
                if (data && data.bankDetails) {
                    setForm({
                        accountHolderName: data.bankDetails.accountHolderName || "",
                        accountNumber: data.bankDetails.accountNumber || "",
                        ifscCode: data.bankDetails.ifscCode || "",
                        accountType: data.bankDetails.accountType || "",
                        branch: data.bankDetails.branch || "",
                        upiId: data.bankDetails.upiId || "",
                        upiName: data.bankDetails.upiName || "",
                        upiNumber: data.bankDetails.upiNumber || "",
                        upiType: data.bankDetails.upiType || "",
                    });
                    if (data.bankDetails.qrCode?.url) {
                        setQrCodePreview(data.bankDetails.qrCode.url);
                    }
                    setBankStatus(data.bankStatus);
                    setBankRejectedReason(data.bankRejectedReason);
                }
            } catch (error) {
                console.error("Error fetching bank details:", error);
                if (!isAdminView) toast.error("Failed to load bank details");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [employeeId, isAdminView]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setQrCodeFile(file);
            setQrCodePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        
        try {
            setSaving(true);
            const formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            if (qrCodeFile) formData.append("qrCode", qrCodeFile);
            
            if (isAdminView) {
                const res = await adminEditBankDetails(employeeId, formData);
                if (res.success) {
                    toast.success("Bank details updated successfully");
                    setBankStatus("approved");
                    setIsEditing(false);
                }
            } else {
                const res = await submitBankDetails(formData);
                if (res.success) {
                    toast.success("Bank details submitted for approval");
                    setBankStatus("pending");
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to submit");
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async () => {
        try {
            const res = await approveBankDetails(employeeId);
            if (res.success) {
                toast.success("Approved successfully");
                setBankStatus("approved");
            }
        } catch (e) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async () => {
        const { value: reason } = await Swal.fire({
            title: "Reject Bank Details",
            input: "textarea",
            inputLabel: "Reason for rejection",
            inputPlaceholder: "Enter reason...",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
        });
        
        if (reason !== undefined) {
            try {
                const res = await rejectBankDetails(employeeId, reason);
                if (res.success) {
                    toast.success("Rejected successfully");
                    setBankStatus("rejected");
                    setBankRejectedReason(reason);
                }
            } catch (e) {
                toast.error("Failed to reject");
            }
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Loading bank details...</div>;

    const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition disabled:bg-gray-50 disabled:text-gray-500";
    const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="max-w-4xl space-y-6">
            {/* Status Banner */}
            {bankStatus === "pending" && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl">
                    <ShieldAlert size={18} />
                    <div>
                        <p className="font-semibold text-sm">Verification Pending</p>
                        <p className="text-xs">Your bank details are under review by admin.</p>
                    </div>
                </div>
            )}
            {bankStatus === "approved" && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
                    <Check size={18} />
                    <div>
                        <p className="font-semibold text-sm">Approved ?</p>
                        <p className="text-xs">Bank details are verified and locked.</p>
                    </div>
                </div>
            )}
            {bankStatus === "rejected" && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <X size={18} />
                    <div>
                        <p className="font-semibold text-sm">Rejected ?</p>
                        <p className="text-xs">Reason: {bankRejectedReason}</p>
                    </div>
                </div>
            )}

            {/* Admin Actions */}
            {isAdminView && !isEditing && (
                <div className="flex gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    {bankStatus === "pending" && (
                        <>
                            <button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition">
                                Approve Details
                            </button>
                            <button onClick={handleReject} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition">
                                Reject Details
                            </button>
                        </>
                    )}
                    <button onClick={() => setIsEditing(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                        <Pencil size={16} /> Edit Details
                    </button>
                </div>
            )}

            {isAdminView && isEditing && (
                <div className="flex gap-3 bg-white p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium shadow-sm">
                    You are in Edit Mode. Make the required changes and click "Save Changes" below.
                    <button type="button" onClick={() => setIsEditing(false)} className="ml-auto underline hover:text-blue-900">Cancel Edit</button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                
                {/* Bank Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <Building size={16} className="text-blue-500" /> Bank Account Info
                    </h3>
                    
                    <div>
                        <label className={labelCls}>Account Holder Name</label>
                        <input name="accountHolderName" value={form.accountHolderName} onChange={handleChange} disabled={isReadOnly} required className={inputCls} placeholder="As per bank passbook" />
                    </div>
                    <div>
                        <label className={labelCls}>Account Number</label>
                        <input name="accountNumber" value={form.accountNumber} onChange={handleChange} disabled={isReadOnly} required className={inputCls} placeholder="Enter account number" />
                    </div>
                    <div>
                        <label className={labelCls}>IFSC Code</label>
                        <input name="ifscCode" value={form.ifscCode} onChange={handleChange} disabled={isReadOnly} required className={inputCls} placeholder="e.g. SBIN0001234" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Account Type</label>
                            <select name="accountType" value={form.accountType} onChange={handleChange} disabled={isReadOnly} className={inputCls}>
                                <option value="">Select Type</option>
                                <option value="savings">Savings</option>
                                <option value="current">Current</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Branch Name</label>
                            <input name="branch" value={form.branch} onChange={handleChange} disabled={isReadOnly} className={inputCls} placeholder="Branch City" />
                        </div>
                    </div>
                </div>

                {/* UPI Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <CreditCard size={16} className="text-purple-500" /> UPI Information
                    </h3>
                    
                    <div>
                        <label className={labelCls}>UPI ID</label>
                        <input name="upiId" value={form.upiId} onChange={handleChange} disabled={isReadOnly} className={inputCls} placeholder="e.g. 9876543210@ybl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>UPI App Type</label>
                            <input name="upiType" value={form.upiType} onChange={handleChange} disabled={isReadOnly} className={inputCls} placeholder="PhonePe, GPay etc." />
                        </div>
                        <div>
                            <label className={labelCls}>Linked Mobile</label>
                            <input name="upiNumber" value={form.upiNumber} onChange={handleChange} disabled={isReadOnly} className={inputCls} placeholder="10 digit number" />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Name on UPI</label>
                        <input name="upiName" value={form.upiName} onChange={handleChange} disabled={isReadOnly} className={inputCls} placeholder="e.g. Vivek Kumar" />
                    </div>
                    
                    {/* QR Code Upload */}
                    <div>
                        <label className={labelCls}>QR Code Image (Optional)</label>
                        {qrCodePreview ? (
                            <div className="relative inline-block mt-2">
                                <img src={qrCodePreview} alt="QR Code" className="w-32 h-32 object-cover border border-gray-200 rounded-xl" />
                                {!isReadOnly && (
                                    <button type="button" onClick={() => { setQrCodePreview(null); setQrCodeFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            !isReadOnly && (
                                <div onClick={() => fileInputRef.current?.click()} className="w-full mt-2 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-xs font-medium">Click to upload QR Code</span>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                </div>
                            )
                        )}
                        {isReadOnly && !qrCodePreview && (
                            <p className="text-sm text-gray-400 mt-2">No QR code uploaded.</p>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                {!isReadOnly && (
                    <div className="md:col-span-2 flex justify-end mt-4 pt-4 border-t">
                        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-xl text-sm font-medium transition disabled:opacity-50">
                            {saving ? "Submitting..." : (isAdminView ? "Save Changes" : (bankStatus === "rejected" ? "Resubmit for Approval" : "Submit for Approval"))}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default BankDetailsComponent;

