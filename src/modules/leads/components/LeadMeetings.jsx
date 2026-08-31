import React, { useState, useEffect } from "react";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { toast } from "react-toastify";
import { Calendar, Clock, MapPin, Video, FileText, CheckCircle, XCircle, RefreshCw, Plus, Edit2, Trash2 } from "lucide-react";
import { useStore } from "../../../context/StoreContext";

const LeadMeetings = ({ leadId }) => {
    const { user } = useStore();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    const isAdmin = user?.role?.name === "admin" || 
                    user?.role?.name === "super_admin" || 
                    user?.role?.name === "project_manager" || 
                    user?.role?.name === "hr";
    
    const [formData, setFormData] = useState({
        title: "",
        date: "",
        time: "",
        location: "",
        notes: "",
        assignedTo: user?._id || user?.id || user?.userId || ""
    });

    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchMeetings();
        fetchUsers();
    }, [leadId]);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const res = await api.get(ENDPOINTS.MEETING.BY_LEAD(leadId));
            if (res.data.success) {
                setMeetings(res.data.meetings);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get(ENDPOINTS.USER.GET_ALL);
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post(ENDPOINTS.MEETING.CREATE, { ...formData, leadId });
            if (res.data.success) {
                toast.success("Meeting scheduled!");
                setShowForm(false);
                setFormData({ title: "", date: "", time: "", location: "", notes: "", assignedTo: user?._id || user?.id || user?.userId || "" });
                fetchMeetings();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to schedule meeting");
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const res = await api.patch(ENDPOINTS.MEETING.UPDATE(id), { status });
            if (res.data.success) {
                toast.success(`Meeting marked as ${status}`);
                fetchMeetings();
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const deleteMeeting = async (id) => {
        if (!window.confirm("Delete this meeting?")) return;
        try {
            const res = await api.delete(ENDPOINTS.MEETING.DELETE(id));
            if (res.data.success) {
                toast.success("Meeting deleted");
                fetchMeetings();
            }
        } catch (error) {
            toast.error("Failed to delete meeting");
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case "Scheduled": return "bg-blue-100 text-blue-700 border-blue-200";
            case "Completed": return "bg-green-100 text-green-700 border-green-200";
            case "Cancelled": return "bg-red-100 text-red-700 border-red-200";
            case "Rescheduled": return "bg-orange-100 text-orange-700 border-orange-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading meetings...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Meeting Records</h3>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                    {showForm ? <XCircle size={16} /> : <Plus size={16} />}
                    {showForm ? "Cancel" : "Schedule Meeting"}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Schedule New Meeting</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Title / Agenda *</label>
                            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Discovery Call" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Location / Link</label>
                            <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Zoom link or address" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                            <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        {isAdmin && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To *</label>
                                <select required value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    <option value="">Select User</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Preparation</label>
                            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Any pre-meeting notes?"></textarea>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Save Meeting</button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {meetings.length === 0 && !showForm && (
                    <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                        <Calendar size={48} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No meetings scheduled for this lead yet.</p>
                    </div>
                )}

                {meetings.map((meeting) => (
                    <div key={meeting._id} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${meeting.status === 'Completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                        <div className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-base font-bold text-gray-900">{meeting.title}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(meeting.status)}`}>
                                            {meeting.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 mb-3">
                                        <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                            <Calendar size={15} className="text-blue-500" />
                                            {new Date(meeting.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                            <Clock size={15} className="text-blue-500" />
                                            {meeting.time}
                                        </div>
                                        {meeting.location && (
                                            <div className="flex items-center gap-1.5">
                                                {meeting.location.includes("http") ? <Video size={15} className="text-gray-400" /> : <MapPin size={15} className="text-gray-400" />}
                                                {meeting.location.includes("http") ? (
                                                    <a href={meeting.location} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate max-w-[200px] inline-block">Join Link</a>
                                                ) : (
                                                    <span>{meeting.location}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {meeting.notes && (
                                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-700 flex items-start gap-2 mt-2">
                                            <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <p className="whitespace-pre-wrap">{meeting.notes}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-row sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4">
                                    <div className="text-xs text-gray-500 text-right w-full mb-1 hidden sm:block">
                                        Assigned to<br/>
                                        <span className="font-bold text-gray-900">{meeting.assignedTo?.firstName}</span>
                                    </div>
                                    
                                    {meeting.status !== 'Completed' && (
                                        <button onClick={() => updateStatus(meeting._id, 'Completed')} className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                                            <CheckCircle size={14} /> Mark Done
                                        </button>
                                    )}
                                    {meeting.status !== 'Cancelled' && (
                                        <button onClick={() => updateStatus(meeting._id, 'Cancelled')} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                                            <XCircle size={14} /> Cancel
                                        </button>
                                    )}
                                    <button onClick={() => deleteMeeting(meeting._id)} className="w-full sm:w-auto mt-auto text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 transition">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeadMeetings;
