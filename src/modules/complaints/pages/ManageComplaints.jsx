import React, { useEffect, useState } from "react";
import { MessageSquare, AlertCircle, Clock, CheckCircle, XCircle, MoreVertical } from "lucide-react";
import { getAllComplaints, updateComplaintStatus } from "../services/complaintService";
import { toast } from "react-toastify";

const ManageComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [newStatus, setNewStatus] = useState("accepted");

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const res = await getAllComplaints();
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
        fetchComplaints();
    }, []);

    const openActionModal = (complaint) => {
        setSelectedComplaint(complaint);
        setNewStatus(complaint.status === "pending" ? "accepted" : complaint.status);
        setReplyText(complaint.reply || "");
        setIsModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await updateComplaintStatus(selectedComplaint._id, {
                status: newStatus,
                reply: replyText
            });
            if (res.success) {
                toast.success("Complaint updated successfully");
                setIsModalOpen(false);
                fetchComplaints();
            } else {
                toast.error(res.message || "Failed to update");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
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
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Manage Complaints</h1>
                <p className="text-slate-500 text-sm mt-1">Review and resolve employee complaints</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : complaints.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No Complaints</h3>
                    <p className="text-slate-500">There are no complaints to manage at the moment.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                                    <th className="p-4">Employee</th>
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {complaints.map((complaint) => (
                                    <tr key={complaint._id} className="hover:bg-slate-50 transition">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {complaint.userId?.profilePic?.url ? (
                                                    <img src={complaint.userId.profilePic.url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                                        {complaint.userId?.firstName?.charAt(0) || "U"}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-900">{complaint.userId?.firstName} {complaint.userId?.lastName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-xs truncate" title={complaint.title}>{complaint.title}</td>
                                        <td className="p-4">{new Date(complaint.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4">{getStatusBadge(complaint.status)}</td>
                                        <td className="p-4">
                                            <button 
                                                onClick={() => openActionModal(complaint)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {isModalOpen && selectedComplaint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Review Complaint</h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    Raised by {selectedComplaint.userId?.firstName} {selectedComplaint.userId?.lastName}
                                </p>
                            </div>
                            {getStatusBadge(selectedComplaint.status)}
                        </div>
                        
                        <div className="p-6 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900 mb-2">{selectedComplaint.title}</h3>
                            <p className="text-sm text-slate-600">{selectedComplaint.description}</p>
                        </div>

                        <form onSubmit={handleUpdate} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Update Status</label>
                                    <select
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm bg-white"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reply Message</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm resize-none"
                                        placeholder="Add a reply for the employee..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
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
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageComplaints;
