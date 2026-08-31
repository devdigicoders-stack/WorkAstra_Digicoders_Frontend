import React, { useState, useEffect } from "react";
import { getTickets, updateTicketStatus } from "../services/ticketService";
import { toast } from "react-toastify";

const ManageTickets = () => {
    const [tickets, setTickets] = useState([]);

    const loadData = async () => {
        try {
            const res = await getTickets();
            setTickets(res.data.data || []);
        } catch (err) {
            toast.error("Failed to load tickets");
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleStatusChange = async (id, status) => {
        try {
            await updateTicketStatus(id, status);
            toast.success("Status updated");
            loadData();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Manage Tickets</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tickets.map(t => (
                    <div key={t._id} className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 hover:shadow-lg transition-all flex flex-col h-full relative overflow-hidden">
                        {/* Decorative Top Border */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${
                            t.priority === "Urgent" ? "bg-red-500" : t.priority === "High" ? "bg-orange-500" : t.priority === "Medium" ? "bg-blue-400" : "bg-slate-300"
                        }`} />
                        
                        <div className="flex justify-between items-start gap-4 mb-3">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 text-base line-clamp-2 mb-1">{t.subject}</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[9px] shrink-0">
                                        {t.userId?.firstName?.[0]}{t.userId?.lastName?.[0]}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">
                                        <span className="font-medium text-gray-700">{t.userId?.firstName} {t.userId?.lastName}</span>
                                    </p>
                                </div>
                            </div>
                            <select 
                                value={t.status} 
                                onChange={(e) => handleStatusChange(t._id, e.target.value)}
                                className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border-0 ring-1 focus:ring-2 focus:outline-none transition-shadow cursor-pointer ${
                                    t.status === "Open" ? "bg-blue-50 text-blue-700 ring-blue-200 focus:ring-blue-500" :
                                    t.status === "In Progress" ? "bg-amber-50 text-amber-700 ring-amber-200 focus:ring-amber-500" :
                                    t.status === "Resolved" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 focus:ring-emerald-500" :
                                    "bg-gray-100 text-gray-600 ring-gray-200 focus:ring-gray-400"
                                }`}
                            >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-4 line-clamp-3 leading-relaxed flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">{t.description}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Proj:</span>
                                <span className="text-xs font-semibold truncate max-w-[120px]">{t.projectId?.name || "N/A"}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManageTickets;
