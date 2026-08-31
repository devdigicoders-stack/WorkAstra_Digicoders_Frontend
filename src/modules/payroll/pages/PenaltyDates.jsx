import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Plus, Trash2, CalendarX } from "lucide-react";
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
        <div style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <CalendarX size={24} color="#ef4444" />
                    <div>
                        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Penalty Dates</h2>
                        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                            Agar employee in dino par absent hua (bina paid leave ke), toh penalty lagegi
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}
                >
                    <Plus size={16} /> Add Penalty Date
                </button>
            </div>

            {showForm && (
                <div style={{ background: "#fff7f7", border: "1px solid #fecaca", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                    <h3 style={{ marginTop: 0, color: "#dc2626" }}>
                        <AlertTriangle size={16} style={{ marginRight: "6px" }} />
                        Add New Penalty Date
                    </h3>
                    <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: "12px", alignItems: "end" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>Date *</label>
                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} required />
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>Reason *</label>
                            <input type="text" placeholder="e.g. Company Annual Event" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} required />
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>Penalty Multiplier *</label>
                            <select value={form.penaltyMultiplier} onChange={e => setForm({ ...form, penaltyMultiplier: Number(e.target.value) })}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}>
                                <option value={2}>2x (2 din ki salary kategi)</option>
                                <option value={3}>3x (3 din ki salary kategi)</option>
                                <option value={4}>4x (4 din ki salary kategi)</option>
                            </select>
                        </div>
                        <button type="submit" style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 20px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Save
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: "center", color: "#6b7280" }}>Loading...</p>
            ) : penaltyDates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>
                    <CalendarX size={48} style={{ marginBottom: "12px", opacity: 0.5 }} />
                    <p>Koi penalty date set nahi ki gayi hai.</p>
                </div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                    <thead>
                        <tr style={{ background: "#fef2f2" }}>
                            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", color: "#374151", fontWeight: 700 }}>Date</th>
                            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", color: "#374151", fontWeight: 700 }}>Reason</th>
                            <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#374151", fontWeight: 700 }}>Penalty</th>
                            <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#374151", fontWeight: 700 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {penaltyDates.map((pd, i) => (
                            <tr key={pd._id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{pd.date}</td>
                                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pd.reason}</td>
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                    <span style={{ background: "#fee2e2", color: "#dc2626", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 700 }}>
                                        {pd.penaltyMultiplier}x deduction
                                    </span>
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                    <button onClick={() => handleDelete(pd._id)}
                                        style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", color: "#ef4444" }}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default PenaltyDates;
