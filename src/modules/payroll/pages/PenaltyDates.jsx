import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Plus, Trash2, CalendarX, Calendar, X } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../../services/axios";

const PenaltyDates = () => {
    const [penaltyDates, setPenaltyDates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ date: "", reason: "", penaltyMultiplier: 2 });

    const fetchDates = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/penalty-dates");
            if (res.data.success) setPenaltyDates(res.data.penaltyDates);
        } catch (e) {
            toast.error("Failed to load penalty dates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDates(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.date || !form.reason || !form.penaltyMultiplier) {
            return toast.error("Please fill all fields");
        }
        try {
            const res = await api.post("/api/penalty-dates", form);
            if (res.data.success) {
                toast.success("Penalty date added!");
                setShowForm(false);
                setForm({ date: "", reason: "", penaltyMultiplier: 2 });
                fetchDates();
            }
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to add penalty date");
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Delete Penalty Date?",
            text: "This will remove the penalty for this date.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it",
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/api/penalty-dates/${id}`);
            toast.success("Deleted successfully");
            fetchDates();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-100">
                <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5 sm:mt-0">
                        <CalendarX className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800">Penalty Dates</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                            Agar employee in dino par absent hua (bina paid leave ke), toh penalty lagegi
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer w-full sm:w-auto shrink-0"
                >
                    {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{showForm ? "Cancel" : "Add Penalty Date"}</span>
                </button>
            </div>

            {/* Add Form Container */}
            {showForm && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 sm:p-6 shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm sm:text-base font-bold text-rose-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            Add New Penalty Date
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="text-rose-400 hover:text-rose-600 p-1 rounded-lg transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date *</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition text-slate-800"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Company Annual Event"
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition text-slate-800 placeholder:text-slate-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Penalty Multiplier *</label>
                                <select
                                    value={form.penaltyMultiplier}
                                    onChange={(e) => setForm({ ...form, penaltyMultiplier: Number(e.target.value) })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition text-slate-800"
                                >
                                    <option value={2}>2x (2 din ki salary kategi)</option>
                                    <option value={3}>3x (3 din ki salary kategi)</option>
                                    <option value={4}>4x (4 din ki salary kategi)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
                            >
                                Save Penalty Date
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Section */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                </div>
            ) : penaltyDates.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
                    <CalendarX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm sm:text-base font-semibold text-slate-700 mb-1">No Penalty Dates</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Koi penalty date set nahi ki gayi hai.</p>
                </div>
            ) : (
                <>
                    {/* Mobile Card View (< md) */}
                    <div className="md:hidden space-y-3">
                        {penaltyDates.map((pd) => (
                            <div
                                key={pd._id}
                                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3 hover:border-slate-300 transition"
                            >
                                {/* Card Top: Date & Delete button */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Date</span>
                                            <span className="text-sm font-bold text-slate-900 font-mono">{pd.date}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(pd._id)}
                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-lg transition active:scale-95 cursor-pointer"
                                        title="Delete Penalty Date"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Card Middle: Reason */}
                                <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs">
                                    <span className="text-slate-400 font-medium block text-[11px] mb-0.5">Reason</span>
                                    <span className="font-semibold text-slate-800">{pd.reason}</span>
                                </div>

                                {/* Card Bottom: Penalty Multiplier badge */}
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-slate-500 font-medium">Deduction Rule</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        {pd.penaltyMultiplier}x deduction
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-rose-50/60 border-b border-rose-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Reason</th>
                                    <th className="p-4 text-center">Penalty</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {penaltyDates.map((pd) => (
                                    <tr key={pd._id} className="hover:bg-slate-50/60 transition">
                                        <td className="p-4 font-semibold text-slate-900 font-mono">{pd.date}</td>
                                        <td className="p-4 text-slate-700">{pd.reason}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                {pd.penaltyMultiplier}x deduction
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(pd._id)}
                                                className="inline-flex items-center justify-center p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-lg transition active:scale-95 cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default PenaltyDates;
