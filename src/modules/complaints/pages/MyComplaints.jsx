import React, { useEffect, useState } from "react";
import { Plus, MessageSquare, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { getMyComplaints, createComplaint } from "../services/complaintService";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const MyComplaints = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: "", description: "" });

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const res = await getMyComplaints();
            if (res.success) {
                setComplaints(res.complaints);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role?.name === "super_admin") {
            navigate("/");
            return;
        }
        fetchComplaints();
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await createComplaint(formData);
            if (res.success) {
                toast.success("Complaint raised successfully");
                setIsModalOpen(false);
                setFormData({ title: "", description: "" });
                fetchComplaints();
            } else {
                toast.error(res.message || "Failed to raise complaint");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "pending": return <Clock className="w-5 h-5 text-yellow-500" />;
            case "accepted": return <CheckCircle className="w-5 h-5 text-blue-500" />;
            case "rejected": return <XCircle className="w-5 h-5 text-red-500" />;
            case "resolved": return <CheckCircle className="w-5 h-5 text-green-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: "bg-yellow-100 text-yellow-800",
            accepted: "bg-blue-100 text-blue-800",
            rejected: "bg-red-100 text-red-800",
            resolved: "bg-green-100 text-green-800",
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Complaints</h1>
                    <p className="text-slate-500 text-sm mt-1">Raise and track your complaints/issues</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition shadow-sm"
                >
                    <Plus size={18} />
                    <span>Raise Complaint</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : complaints.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No Complaints Raised</h3>
                    <p className="text-slate-500">You haven't raised any complaints yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {complaints.map((complaint) => (
                        <div key={complaint._id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(complaint.status)}
                                    {getStatusBadge(complaint.status)}
                                </div>
                                <span className="text-xs text-slate-400">
                                    {new Date(complaint.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1">{complaint.title}</h3>
                            <p className="text-sm text-slate-600 line-clamp-3 mb-4">{complaint.description}</p>
                            
                            {complaint.reply && (
                                <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-xl">
                                    <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                        <MessageSquare size={12} /> Admin Reply:
                                    </p>
                                    <p className="text-sm text-slate-600">{complaint.reply}</p>
                                    {complaint.repliedAt && (
                                        <p className="text-[10px] text-slate-400 mt-2 text-right">
                                            {new Date(complaint.repliedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Raise New Complaint</h2>
                            <p className="text-slate-500 text-sm mt-1">Describe your issue in detail</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm"
                                        placeholder="Brief title of the issue"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm resize-none"
                                        placeholder="Detailed description..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyComplaints;
