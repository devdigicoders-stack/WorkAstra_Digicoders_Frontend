import { useState, useEffect, useRef } from "react";
import { getImageUrl } from "../../../utils/imageUtils";
import { Plus, Trash2, X, Pencil, Search, ChevronDown, Check, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
    getCompanyStructures, createSalaryStructure,
    updateSalaryStructure, deleteSalaryStructure, getUserStructures
} from "../services/payrollService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const fmt = (n) => {
    if (n === "••••••" || (typeof n === "string" && n.includes("•"))) return "••••••";
    return `₹${Number(n || 0).toLocaleString("en-IN")}`;
};

const EMPTY_COMPONENT = { name: "", type: "earning", calcType: "fixed", value: "" };

// ── Searchable Employee Dropdown ──────────────────────────────
const SearchableEmployeeSelect = ({ employees, selectedUserId, structures, onSelect, disabled }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedEmp = employees.find(e => e._id === selectedUserId);

    const filtered = employees.filter(e => {
        const name = `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
        const code = (e.employeeCode || "").toLowerCase();
        const q = search.toLowerCase().trim();
        return name.includes(q) || code.includes(q);
    });

    return (
        <div className="relative" ref={ref}>
            <label className="text-xs font-medium text-gray-600 block mb-1">
                Employee <span className="text-red-500">*</span>
            </label>

            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white transition text-left ${
                    open ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                } ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : "cursor-pointer"}`}
            >
                {selectedEmp ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {selectedEmp.firstName?.[0]}{selectedEmp.lastName?.[0]}
                        </div>
                        <span className="font-medium text-gray-800 truncate">
                            {selectedEmp.firstName} {selectedEmp.lastName}
                        </span>
                        {selectedEmp.employeeCode && (
                            <span className="text-xs text-gray-400 shrink-0">({selectedEmp.employeeCode})</span>
                        )}
                        {structures?.some(s => (s.userId?._id || s.userId) === selectedEmp._id) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 shrink-0">
                                Salary Defined
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-400">Select employee...</span>
                )}
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/70">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by employee name or code..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">
                                No employees found
                            </div>
                        ) : (
                            filtered.map(emp => {
                                const isSelected = emp._id === selectedUserId;
                                const hasStructure = structures?.some(s => (s.userId?._id || s.userId) === emp._id);

                                return (
                                    <div
                                        key={emp._id}
                                        onClick={() => {
                                            onSelect(emp._id);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        className={`px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                                            isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0">
                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-800 truncate">
                                                    {emp.firstName} {emp.lastName}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {emp.employeeCode ? `ID: ${emp.employeeCode}` : ""} {emp.department?.name ? `• ${emp.department.name}` : ""}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {hasStructure ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                                    Salary Defined
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                                    Not Defined
                                                </span>
                                            )}
                                            {isSelected && <Check size={14} className="text-blue-600" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Salary Modal ──────────────────────────────────────────────
const SalaryModal = ({ initial, employees, structures, onClose, onSaved }) => {
    const [editingStructure, setEditingStructure] = useState(initial || null);
    const [fetchingExisting, setFetchingExisting] = useState(false);

    const [form, setForm] = useState(
        initial
            ? {
                userId: initial.userId?._id || initial.userId || "",
                effectiveFrom: initial.effectiveFrom || "",
                ctc: initial.ctc ?? "",
                basic: initial.basic ?? "",
                components: initial.components ? initial.components.map(c => ({ ...c })) : [],
                remarks: initial.remarks || ""
            }
            : {
                userId: "",
                effectiveFrom: new Date().toISOString().slice(0, 10),
                ctc: "",
                basic: "",
                components: [],
                remarks: ""
            }
    );
    const [saving, setSaving] = useState(false);

    const isEditMode = !!editingStructure?._id;

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const setComp = (i, k, v) =>
        setForm(f => ({ ...f, components: f.components.map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));

    const addComp = () => setForm(f => ({ ...f, components: [...f.components, { ...EMPTY_COMPONENT }] }));
    const removeComp = (i) => setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));

    // Handle employee change with auto-fetch & pre-fill
    const handleEmployeeSelect = async (userId) => {
        setField("userId", userId);
        if (!userId) {
            setEditingStructure(null);
            return;
        }

        // 1. Check local structures list first
        const localExisting = structures?.find(s => (s.userId?._id || s.userId) === userId);
        if (localExisting) {
            setEditingStructure(localExisting);
            setForm({
                userId,
                effectiveFrom: localExisting.effectiveFrom || "",
                ctc: localExisting.ctc ?? "",
                basic: localExisting.basic ?? "",
                components: localExisting.components ? localExisting.components.map(c => ({
                    name: c.name,
                    type: c.type,
                    calcType: c.calcType,
                    value: c.value
                })) : [],
                remarks: localExisting.remarks || ""
            });
            toast.info("Existing salary structure loaded. You can edit and update it.");
            return;
        }

        // 2. Query user structure endpoint as fallback
        try {
            setFetchingExisting(true);
            const res = await getUserStructures(userId);
            const active = (res?.structures || []).find(s => s.isActive !== false) || res?.structures?.[0];
            if (active) {
                setEditingStructure(active);
                setForm({
                    userId,
                    effectiveFrom: active.effectiveFrom || "",
                    ctc: active.ctc ?? "",
                    basic: active.basic ?? "",
                    components: active.components ? active.components.map(c => ({
                        name: c.name,
                        type: c.type,
                        calcType: c.calcType,
                        value: c.value
                    })) : [],
                    remarks: active.remarks || ""
                });
                toast.info("Existing salary structure loaded. You can edit and update it.");
            } else {
                setEditingStructure(null);
                setForm(f => ({
                    ...f,
                    userId,
                    effectiveFrom: f.effectiveFrom || new Date().toISOString().slice(0, 10),
                    ctc: "",
                    basic: "",
                    components: [],
                    remarks: ""
                }));
            }
        } catch {
            setEditingStructure(null);
        } finally {
            setFetchingExisting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.userId) {
            toast.error("Please select an employee");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                userId: form.userId,
                effectiveFrom: form.effectiveFrom,
                ctc: Number(form.ctc),
                basic: Number(form.basic),
                components: form.components.map(c => ({ ...c, value: Number(c.value) })),
                remarks: form.remarks || ""
            };

            if (isEditMode) {
                await updateSalaryStructure(editingStructure._id, payload);
                toast.success("Salary structure updated successfully");
            } else {
                await createSalaryStructure(payload);
                toast.success("Salary structure created successfully");
            }
            onSaved();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to save salary structure");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEditMode ? "Edit Salary Structure" : "Define Salary Structure"}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isEditMode ? "Modify existing salary details for this employee" : "Create new monthly salary breakdown"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Employee Selector with Live Search Bar */}
                    <SearchableEmployeeSelect
                        employees={employees}
                        selectedUserId={form.userId}
                        structures={structures}
                        onSelect={handleEmployeeSelect}
                        disabled={!!initial}
                    />

                    {/* Notification Banner when existing structure is loaded */}
                    {isEditMode && (
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                                <span>
                                    <strong>Existing Salary Found:</strong> Data pre-filled below. Changes will update this employee's active salary.
                                </span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase text-[10px] shrink-0">
                                Edit Mode
                            </span>
                        </div>
                    )}

                    {fetchingExisting && (
                        <div className="text-xs text-blue-600 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                            <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            Checking existing salary structure...
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Effective From</label>
                            <input required type="date" value={form.effectiveFrom} onChange={e => setField("effectiveFrom", e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Total CTC (₹)</label>
                            <input required type="number" min="0" value={form.ctc} onChange={e => setField("ctc", e.target.value)}
                                placeholder="Annual CTC"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-600 block mb-1">Monthly Basic (₹)</label>
                            <input required type="number" min="0" value={form.basic} onChange={e => setField("basic", e.target.value)}
                                placeholder="Monthly basic pay"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    {/* Components */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Components (Allowances & Deductions)</p>
                            <button type="button" onClick={addComp}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                <Plus size={13} /> Add Component
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.components.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">No extra components added. Click "+ Add Component" for HRA, PF, etc.</p>
                            ) : (
                                form.components.map((c, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center bg-gray-50/60 p-2 rounded-lg border border-gray-100">
                                        <input placeholder="Name (e.g. HRA)" value={c.name} onChange={e => setComp(i, "name", e.target.value)}
                                            className="border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <select value={c.type} onChange={e => setComp(i, "type", e.target.value)}
                                            className="border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="earning">Earning</option>
                                            <option value="deduction">Deduction</option>
                                        </select>
                                        <select value={c.calcType} onChange={e => setComp(i, "calcType", e.target.value)}
                                            className="border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="fixed">Fixed (₹)</option>
                                            <option value="percentage">% of Basic</option>
                                        </select>
                                        <input type="number" min="0" placeholder={c.calcType === "percentage" ? "%" : "₹"} value={c.value} onChange={e => setComp(i, "value", e.target.value)}
                                            className="w-20 border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <button type="button" onClick={() => removeComp(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Message / Remarks Box */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                            Message / Remarks <span className="text-gray-400 font-normal">(Optional note or revision reason)</span>
                        </label>
                        <textarea
                            rows={2}
                            value={form.remarks || ""}
                            onChange={e => setField("remarks", e.target.value)}
                            placeholder="e.g. Annual appraisal revision, probation confirmed, salary revised effective this month..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 placeholder-gray-400"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 transition shadow-sm">
                            {saving ? "Saving..." : isEditMode ? "Update Salary" : "Save Salary"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Main DefineSalary Component ───────────────────────────────
const DefineSalary = () => {
    const [structures, setStructures] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null); // null | "create" | structure object

    const load = async () => {
        try {
            setLoading(true);
            const [sRes, uRes] = await Promise.all([
                getCompanyStructures(),
                api.get(ENDPOINTS.USER.GET_ALL).then(r => r.data),
            ]);
            setStructures(sRes.structures || []);
            // Filter out clients so only company employees are available
            const allUsers = uRes.users || uRes.data || [];
            const staff = allUsers.filter(u => u.role?.name?.trim().toLowerCase() !== "client");
            setEmployees(staff);
        } catch {
            toast.error("Failed to load salary structures");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this salary structure?")) return;
        try {
            await deleteSalaryStructure(id);
            toast.success("Deleted successfully");
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to delete");
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Active salary structures for all employees</p>
                <button onClick={() => setModal("create")}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                    <Plus size={14} /> Define Salary
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Employee</th>
                            <th className="px-4 py-3 text-left">Effective From</th>
                            <th className="px-4 py-3 text-right">Total CTC</th>
                            <th className="px-4 py-3 text-right">Monthly Basic</th>
                            <th className="px-4 py-3 text-right">Gross</th>
                            <th className="px-4 py-3 text-right">Net</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                        ) : structures.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-14 text-center text-gray-400 text-sm">
                                    No salary structures defined yet. Click "Define Salary" to add one.
                                </td>
                            </tr>
                        ) : structures.map(s => (
                            <tr key={s._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        {s.userId?.profilePic?.url
                                            ? <img src={getImageUrl(s.userId.profilePic.url)} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                                            : <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                {s.userId?.firstName?.[0]}{s.userId?.lastName?.[0]}
                                              </div>}
                                        <div>
                                            <p className="font-semibold text-gray-800">{s.userId?.firstName} {s.userId?.lastName}</p>
                                            <p className="text-xs text-gray-400">{s.userId?.employeeCode || ""}</p>
                                            {s.remarks && (
                                                <p className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1 max-w-xs" title={s.remarks}>
                                                    Note: {s.remarks}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{s.effectiveFrom}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{fmt(s.ctc)}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{fmt(s.basic)}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(s.grossEarnings)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(s.netSalary)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={() => setModal(s)}
                                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition" title="Edit">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(s._id)}
                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <SalaryModal
                    initial={modal === "create" ? null : modal}
                    employees={employees}
                    structures={structures}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
};

export default DefineSalary;
