import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, CreditCard, ExternalLink, Image as ImageIcon, QrCode, Save } from "lucide-react";
import { getUpiDetails, updateUpiDetails, getAllPayments, updatePaymentStatus } from "../services/paymentService";
import { toast } from "react-toastify";
import QRCode from "react-qr-code";

const ManagePayments = () => {
    const [payments, setPayments] = useState([]);
    const [upiDetails, setUpiDetails] = useState({ upiId: "", payeeName: "" });
    const [loading, setLoading] = useState(true);
    const [isSavingUpi, setIsSavingUpi] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [qrRes, payRes] = await Promise.all([
                getUpiDetails().catch(e => null),
                getAllPayments().catch(e => null)
            ]);

            if (qrRes && qrRes.success) setUpiDetails(qrRes.upiDetails);
            if (payRes && payRes.success) setPayments(payRes.payments);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpiSave = async () => {
        if (!upiDetails.upiId) {
            return toast.error("UPI ID is required");
        }
        try {
            setIsSavingUpi(true);
            const res = await updateUpiDetails(upiDetails);
            if (res.success) {
                toast.success("UPI Details saved successfully!");
                setUpiDetails(res.data);
            } else {
                toast.error(res.message || "Failed to save UPI details");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setIsSavingUpi(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const res = await updatePaymentStatus(id, { status });
            if (res.success) {
                toast.success(`Payment ${status} successfully`);
                setPayments(payments.map(p => p._id === id ? { ...p, status } : p));
            } else {
                toast.error(res.message || "Failed to update status");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred");
        }
    };

    const upiString = upiDetails.upiId ? `upi://pay?pa=${upiDetails.upiId}&pn=${upiDetails.payeeName || 'Workastra'}&cu=INR` : '';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Manage Payments</h1>
                <p className="text-slate-500 text-sm mt-1">Configure UPI settings and review user payment submissions</p>
            </div>

            {/* UPI Settings Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600" /> Global UPI Configuration
                </h2>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="shrink-0 flex flex-col items-center">
                        <div className="w-36 h-36 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-3 shadow-sm">
                            {upiDetails.upiId ? (
                                <QRCode value={upiString} size={120} />
                            ) : (
                                <span className="text-xs text-slate-400 text-center">Enter UPI ID<br/>to generate QR</span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID / VPA</label>
                            <input 
                                type="text"
                                value={upiDetails.upiId}
                                onChange={(e) => setUpiDetails({...upiDetails, upiId: e.target.value})}
                                placeholder="e.g. company@ybl"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payee Name (Optional)</label>
                            <input 
                                type="text"
                                value={upiDetails.payeeName}
                                onChange={(e) => setUpiDetails({...upiDetails, payeeName: e.target.value})}
                                placeholder="e.g. Workastra Inc"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                            />
                        </div>
                        
                        <div className="pt-2">
                            <button 
                                onClick={handleUpiSave}
                                disabled={isSavingUpi}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-70"
                            >
                                {isSavingUpi ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isSavingUpi ? "Saving..." : "Save UPI Details"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Submissions Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" /> Payment Submissions
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="p-12 text-center">
                        <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No Submissions</h3>
                        <p className="text-slate-500">There are no payment submissions to review.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                                    <th className="p-4">User</th>
                                    <th className="p-4">Amount & Txn ID</th>
                                    <th className="p-4">Remark</th>
                                    <th className="p-4 text-center">Screenshot</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {payments.map((payment) => (
                                    <tr key={payment._id} className="hover:bg-slate-50 transition">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {payment.userId?.profilePic?.url ? (
                                                    <img src={payment.userId.profilePic.url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                                        {payment.userId?.firstName?.charAt(0) || "U"}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-900">{payment.userId?.firstName} {payment.userId?.lastName}</p>
                                                    <p className="text-xs text-slate-500">{new Date(payment.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-slate-900">₹{payment.amount}</p>
                                            <p className="text-xs text-slate-500">{payment.transactionId}</p>
                                        </td>
                                        <td className="p-4 max-w-[200px] truncate text-slate-500" title={payment.remark}>
                                            {payment.remark || "-"}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => setSelectedImage(payment.screenshot?.url)}
                                                className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                                                title="View Screenshot"
                                            >
                                                <ImageIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize 
                                                ${payment.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                  payment.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {payment.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleStatusUpdate(payment._id, 'approved')}
                                                        className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStatusUpdate(payment._id, 'rejected')}
                                                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">Reviewed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-screen">
                        <button 
                            className="absolute -top-10 right-0 text-white hover:text-slate-300"
                            onClick={() => setSelectedImage(null)}
                        >
                            <XCircle className="w-8 h-8" />
                        </button>
                        <img src={selectedImage} alt="Payment Screenshot" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        <div className="mt-4 text-center">
                            <a href={selectedImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white hover:text-blue-300 text-sm">
                                <ExternalLink className="w-4 h-4" /> Open original image
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePayments;
