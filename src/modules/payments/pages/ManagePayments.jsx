import React, { useEffect, useState } from "react";
import { getImageUrl } from "../../../utils/imageUtils";
import { CheckCircle, XCircle, CreditCard, ExternalLink, Image as ImageIcon, QrCode, Save, FolderKanban, Receipt } from "lucide-react";
import { getUpiDetails, updateUpiDetails, getAllPayments, updatePaymentStatus } from "../services/paymentService";
import { useStore } from "../../../context/StoreContext";
import { downloadPaymentReceiptPdf } from "../services/paymentReceiptPdfGenerator";
import { toast } from "react-toastify";
import QRCode from "react-qr-code";

const ManagePayments = () => {
    const { user } = useStore();
    const [payments, setPayments] = useState([]);
    const [upiDetails, setUpiDetails] = useState({ upiId: "", payeeName: "" });
    const [loading, setLoading] = useState(true);
    const [isSavingUpi, setIsSavingUpi] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [downloadingSlipId, setDownloadingSlipId] = useState(null);

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
                fetchData();
            } else {
                toast.error(res.message || "Failed to update status");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred");
        }
    };

    const handleDownloadSlip = async (payment) => {
        try {
            setDownloadingSlipId(payment._id);
            toast.info("Generating official Payment Slip PDF...");
            await downloadPaymentReceiptPdf(payment, user?.companyId);
            toast.success("Payment Slip downloaded successfully!");
        } catch (err) {
            console.error("PDF error:", err);
            toast.error("Failed to generate PDF slip");
        } finally {
            setDownloadingSlipId(null);
        }
    };

    const upiString = upiDetails.upiId ? `upi://pay?pa=${upiDetails.upiId}&pn=${upiDetails.payeeName || 'Workastra'}&cu=INR` : '';

    return (
        <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-8">
            <div className="mb-4 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manage Payments</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Configure UPI settings and review user payment submissions</p>
            </div>

            {/* UPI Settings Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600" /> Global UPI Configuration
                </h2>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 p-4 sm:p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="shrink-0 flex flex-col items-center">
                        <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-3 shadow-sm">
                            {upiDetails.upiId ? (
                                <QRCode value={upiString} size={110} />
                            ) : (
                                <span className="text-xs text-slate-400 text-center">Enter UPI ID<br/>to generate QR</span>
                            )}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-2 font-medium">Scan & Pay QR</span>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">UPI ID / VPA</label>
                            <input 
                                type="text"
                                value={upiDetails.upiId}
                                onChange={(e) => setUpiDetails({...upiDetails, upiId: e.target.value})}
                                placeholder="e.g. company@ybl"
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payee Name (Optional)</label>
                            <input 
                                type="text"
                                value={upiDetails.payeeName}
                                onChange={(e) => setUpiDetails({...upiDetails, payeeName: e.target.value})}
                                placeholder="e.g. Workastra Inc"
                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                            />
                        </div>
                        
                        <div className="pt-2">
                            <button 
                                onClick={handleUpiSave}
                                disabled={isSavingUpi}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-70 shadow-sm cursor-pointer"
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
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" /> Payment Submissions
                    </h2>
                    {payments.length > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {payments.length} {payments.length === 1 ? "entry" : "entries"}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                        <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-1">No Submissions</h3>
                        <p className="text-xs sm:text-sm text-slate-500">There are no payment submissions to review.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards View (< md) */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {payments.map((payment) => (
                                <div key={payment._id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                                    {/* User Row & Status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {payment.userId?.profilePic?.url ? (
                                                <img 
                                                    src={getImageUrl(payment.userId.profilePic.url)} 
                                                    alt="Profile" 
                                                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200" 
                                                />
                                            ) : (
                                                <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                                    {payment.userId?.firstName?.charAt(0) || "U"}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 text-sm truncate">
                                                    {payment.userId?.firstName} {payment.userId?.lastName}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                                            payment.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            payment.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {payment.status}
                                        </span>
                                    </div>

                                    {/* Project Info if any */}
                                    {payment.projectId && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span className="font-semibold truncate">{payment.projectId.name}</span>
                                            {payment.projectId.price ? (
                                                <span className="text-[11px] text-slate-400 ml-auto shrink-0">
                                                    ₹{Number(payment.projectId.price).toLocaleString("en-IN")}
                                                </span>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Amount & Txn ID */}
                                    <div className="flex items-center justify-between text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                                        <div>
                                            <span className="text-slate-400 text-[11px] block">Amount Paid</span>
                                            <span className="font-bold text-slate-900 text-sm">₹{payment.amount}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-slate-400 text-[11px] block">Txn / UTR</span>
                                            <span className="font-mono text-slate-600 text-xs">{payment.transactionId || "—"}</span>
                                        </div>
                                    </div>

                                    {/* Remark */}
                                    {payment.remark && (
                                        <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2 rounded border border-slate-100">
                                            "{payment.remark}"
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                        <button 
                                            onClick={() => setSelectedImage(getImageUrl(payment.screenshot?.url))}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-medium transition cursor-pointer"
                                        >
                                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Screenshot</span>
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {payment.status === 'pending' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleStatusUpdate(payment._id, 'approved')}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStatusUpdate(payment._id, 'rejected')}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                                    </button>
                                                </>
                                            ) : payment.status === 'approved' ? (
                                                <button 
                                                    onClick={() => handleDownloadSlip(payment)}
                                                    disabled={downloadingSlipId === payment._id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-60 cursor-pointer"
                                                    title="Download Payment Slip (.pdf)"
                                                >
                                                    {downloadingSlipId === payment._id ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                                            <span>Generating...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Receipt className="w-3.5 h-3.5" />
                                                            <span>Slip (PDF)</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium">Reviewed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                                        <th className="p-4">User</th>
                                        <th className="p-4">Project</th>
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
                                                        <img src={getImageUrl(payment.userId.profilePic.url)} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
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
                                                {payment.projectId ? (
                                                    <div>
                                                        <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                            <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                            {payment.projectId.name}
                                                        </p>
                                                        {payment.projectId.price ? (
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                Price: ₹{Number(payment.projectId.price).toLocaleString("en-IN")}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No Project</span>
                                                )}
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
                                                    onClick={() => setSelectedImage(getImageUrl(payment.screenshot?.url))}
                                                    className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-lg transition cursor-pointer"
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
                                                            className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition cursor-pointer"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(payment._id, 'rejected')}
                                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition cursor-pointer"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {payment.status === 'approved' && (
                                                            <button 
                                                                onClick={() => handleDownloadSlip(payment)}
                                                                disabled={downloadingSlipId === payment._id}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                                                title="Direct Download Official DigiCoders Payment Slip (.pdf)"
                                                            >
                                                                {downloadingSlipId === payment._id ? (
                                                                    <>
                                                                        <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                                                        <span>Generating...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Receipt className="w-3.5 h-3.5" />
                                                                        <span>Slip (PDF)</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                        <span className="text-xs text-slate-400">Reviewed</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="absolute -top-10 right-0 sm:right-0 text-white hover:text-slate-300 cursor-pointer p-1"
                            onClick={() => setSelectedImage(null)}
                        >
                            <XCircle className="w-7 h-7 sm:w-8 sm:h-8" />
                        </button>
                        <img 
                            src={getImageUrl(selectedImage)} 
                            alt="Payment Screenshot" 
                            className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-xl shadow-2xl" 
                        />
                        <div className="mt-3 text-center">
                            <a 
                                href={getImageUrl(selectedImage)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-2 text-white hover:text-blue-300 text-xs sm:text-sm bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/10"
                            >
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
