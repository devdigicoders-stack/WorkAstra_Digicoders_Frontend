import React, { useEffect, useState } from "react";
import { Upload, FileImage, CreditCard, Send, CheckCircle, Clock, XCircle, FileText, AlertCircle, FolderKanban } from "lucide-react";
import { getUpiDetails, submitPayment, getMyPayments } from "../services/paymentService";
import { getProjects } from "../../projects/services/projectService";
import { toast } from "react-toastify";
import QRCode from "react-qr-code";

const SubmitPayment = () => {
    const [upiDetails, setUpiDetails] = useState({ upiId: "", payeeName: "" });
    const [payments, setPayments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        amount: "",
        transactionId: "",
        remark: "",
        projectId: "",
        screenshot: null
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [qrRes, payRes, projRes] = await Promise.all([
                getUpiDetails().catch(e => null),
                getMyPayments().catch(e => null),
                getProjects().catch(e => null)
            ]);

            if (qrRes && qrRes.success) setUpiDetails(qrRes.upiDetails);
            if (payRes && payRes.success) setPayments(payRes.payments);
            if (projRes && projRes.data) {
                const list = Array.isArray(projRes.data) ? projRes.data : (projRes.data.data || []);
                setProjects(list);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, screenshot: e.target.files[0] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.transactionId || !formData.screenshot) {
            toast.error("Amount, Transaction ID, and Screenshot are required");
            return;
        }

        try {
            setSubmitting(true);
            const formDataObj = new FormData();
            formDataObj.append("amount", formData.amount);
            formDataObj.append("transactionId", formData.transactionId);
            formDataObj.append("remark", formData.remark);
            if (formData.projectId) {
                formDataObj.append("projectId", formData.projectId);
            }
            formDataObj.append("screenshot", formData.screenshot);

            const res = await submitPayment(formDataObj);
            if (res.success) {
                toast.success("Payment submitted successfully");
                setFormData({ amount: "", transactionId: "", remark: "", projectId: "", screenshot: null });
                fetchData();
            } else {
                toast.error(res.message || "Submission failed");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "approved": return <CheckCircle className="w-5 h-5 text-green-500" />;
            case "rejected": return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    const upiString = upiDetails.upiId ? `upi://pay?pa=${upiDetails.upiId}&pn=${upiDetails.payeeName || 'Workastra'}&cu=INR` : '';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Submit Payment</h1>
                <p className="text-slate-500 text-sm mt-1">Scan the QR code and submit your payment details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left side: QR Code and form */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" /> Payment Details
                    </h2>

                    {upiDetails.upiId ? (
                        <div className="flex flex-col items-center mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <QRCode value={upiString} size={180} />
                            </div>
                            <div className="mt-4 text-center">
                                <p className="font-semibold text-slate-800">{upiDetails.payeeName || "Workastra"}</p>
                                <p className="text-sm text-slate-500 font-medium tracking-wide mt-1">{upiDetails.upiId}</p>
                            </div>
                            <p className="text-slate-400 text-xs mt-4 text-center">Scan this QR code using any UPI app</p>
                        </div>
                    ) : (
                        <div className="mb-8 bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-800 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> No payment QR code has been set by the admin yet.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
                            <select
                                name="projectId"
                                value={formData.projectId}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm bg-white"
                            >
                                <option value="">-- General Payment / No Project --</option>
                                {projects.map((proj) => (
                                    <option key={proj._id} value={proj._id}>
                                        {proj.name} {proj.price ? `(Deal: ₹${Number(proj.price).toLocaleString("en-IN")})` : ""}
                                    </option>
                                ))}
                            </select>
                            {formData.projectId && (
                                <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex flex-wrap items-center justify-between gap-2">
                                    {(() => {
                                        const sel = projects.find(p => p._id === formData.projectId);
                                        if (!sel) return null;
                                        const pr = Number(sel.price) || 0;
                                        const rc = Number(sel.receivedAmount) || 0;
                                        const du = Math.max(0, pr - rc);
                                        return (
                                            <>
                                                <span>Price: <strong>₹{pr.toLocaleString("en-IN")}</strong></span>
                                                <span className="text-emerald-700">Paid: <strong>₹{rc.toLocaleString("en-IN")}</strong></span>
                                                <span className="text-amber-700">Due: <strong>₹{du.toLocaleString("en-IN")}</strong></span>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (₹)</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID / UTR</label>
                            <input
                                type="text"
                                name="transactionId"
                                value={formData.transactionId}
                                onChange={handleChange}
                                placeholder="Enter transaction ID"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Remark (Optional)</label>
                            <input
                                type="text"
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder="Add a note"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Screenshot</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-slate-50 relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    required
                                />
                                <div className="space-y-1 text-center">
                                    <FileImage className="mx-auto h-8 w-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    <div className="flex text-sm text-slate-600 justify-center">
                                        <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                            {formData.screenshot ? formData.screenshot.name : "Upload a file"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">PNG, JPG up to 10MB</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" /> Submit Payment
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right side: Payment History */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" /> Payment History
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">You haven't submitted any payments yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {payments.map(payment => (
                                <div key={payment._id} className="p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition bg-white flex items-start gap-4">
                                    <div className="shrink-0 pt-1">
                                        {getStatusIcon(payment.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-semibold text-slate-900 text-sm">₹{payment.amount}</p>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize 
                                                ${payment.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                                  payment.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {payment.status}
                                            </span>
                                        </div>
                                        {payment.projectId && (
                                            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-1">
                                                <FolderKanban className="w-3.5 h-3.5" />
                                                <span className="truncate">{payment.projectId.name}</span>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 truncate">Txn ID: {payment.transactionId}</p>
                                        {payment.remark && <p className="text-xs text-slate-600 mt-1 italic">"{payment.remark}"</p>}
                                        <p className="text-[10px] text-slate-400 mt-2">{new Date(payment.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubmitPayment;
