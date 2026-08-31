import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStore } from "../../../context/StoreContext";
import { getTickets, createTicket } from "../services/ticketService";
import { getProjects } from "../../projects/services/projectService";
import { toast } from "react-toastify";
import { Plus, X } from "lucide-react";

const MyTickets = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryProjectId = searchParams.get("projectId");

    const [tickets, setTickets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ projectId: "", subject: "", description: "", priority: "Medium" });

    const loadData = async () => {
        try {
            const [ticketRes, projRes] = await Promise.all([getTickets(), getProjects()]);
            setTickets(ticketRes.data.data || []);
            setProjects(projRes.data.data || []);
            
            if (queryProjectId) {
                setFormData(prev => ({ ...prev, projectId: queryProjectId }));
                setShowModal(true);
            }
        } catch (err) {
            toast.error("Failed to load data");
        }
    };

    useEffect(() => { 
        if (user?.role?.name === "super_admin") {
            navigate("/");
            return;
        }
        loadData(); 
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createTicket(formData);
            toast.success("Ticket raised successfully");
            setShowModal(false);
            setFormData({ projectId: "", subject: "", description: "", priority: "Medium" });
            loadData();
        } catch (err) {
            toast.error("Failed to raise ticket");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">My Tickets</h1>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
                    <Plus size={16} /> Raise Ticket
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map(t => (
                    <div key={t._id} className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-100 transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3 gap-2">
                            <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{t.subject}</h3>
                            <span className={`px-3 py-1 text-[11px] font-semibold rounded-full shrink-0 border ${
                                t.status === "Open" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                t.status === "In Progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                t.status === "Resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-gray-100 text-gray-600 border-gray-200"
                            }`}>
                                {t.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4 flex-1">{t.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Project</span>
                                <span className="text-xs font-semibold text-gray-700 truncate max-w-[150px]">{t.projectId?.name || "N/A"}</span>
                            </div>
                            <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
                                t.priority === "Urgent" || t.priority === "High" ? "bg-red-50 text-red-600" :
                                t.priority === "Medium" ? "bg-orange-50 text-orange-600" :
                                "bg-slate-50 text-slate-600"
                            }`}>
                                {t.priority}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">Raise a Ticket</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Select Project <span className="text-red-500">*</span></label>
                                <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">
                                    <option value="" className="text-gray-400">Choose a project...</option>
                                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Subject <span className="text-red-500">*</span></label>
                                <input required type="text" placeholder="Brief summary of your issue" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Description <span className="text-red-500">*</span></label>
                                <textarea required placeholder="Please provide detailed information about your issue..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none" rows="4"></textarea>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} 
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" 
                                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md shadow-blue-500/20">
                                    Submit Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTickets;
