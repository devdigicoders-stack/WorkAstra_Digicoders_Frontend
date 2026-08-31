import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MapPin, Plus, Pencil, Trash2, Navigation, X, Check, Building2, Radio } from "lucide-react";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const RADIUS_OPTIONS = [
    { label: "50m (Small office)", value: 50 },
    { label: "100m (Standard)", value: 100 },
    { label: "200m (Large building)", value: 200 },
    { label: "500m (Campus)", value: 500 },
    { label: "1000m (Field staff)", value: 1000 },
    { label: "Custom", value: "custom" },
];

const emptyForm = { name: "", address: "", location: { latitude: null, longitude: null }, geofenceRadius: 100, isActive: true };

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);
    const [customRadius, setCustomRadius] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const load = async () => {
        try {
            const { data } = await api.get(ENDPOINTS.BRANCH.GET_ALL);
            setBranches(data.branches || []);
        } catch { toast.error("Failed to load branches"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditData(null);
        setForm(emptyForm);
        setCustomRadius(false);
        setShowModal(true);
    };

    const openEdit = (b) => {
        setEditData(b);
        setForm({ name: b.name, address: b.address || "", location: b.location || { latitude: null, longitude: null }, geofenceRadius: b.geofenceRadius, isActive: b.isActive });
        setCustomRadius(!RADIUS_OPTIONS.find(r => r.value === b.geofenceRadius && r.value !== "custom"));
        setShowModal(true);
    };

    const fetchLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude, longitude } }) => {
                let address = form.address;
                try {
                    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const d = await r.json();
                    address = d.display_name || address;
                } catch {}
                setForm(f => ({ ...f, location: { latitude, longitude }, address }));
                setLocating(false);
                toast.success("Location captured!");
            },
            () => { setLocating(false); toast.error("Location access denied"); }
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Branch name is required");
        setSaving(true);
        try {
            if (editData) {
                await api.put(ENDPOINTS.BRANCH.UPDATE(editData._id), form);
                toast.success("Branch updated");
            } else {
                await api.post(ENDPOINTS.BRANCH.CREATE, form);
                toast.success("Branch created");
            }
            setShowModal(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to save"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await api.delete(ENDPOINTS.BRANCH.DELETE(deleteId));
            toast.success("Branch deleted");
            setDeleteId(null);
            load();
        } catch { toast.error("Failed to delete"); }
    };

    const selectedRadiusOption = RADIUS_OPTIONS.find(r => r.value === form.geofenceRadius);

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage office locations and geofence settings</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                    <Plus size={16} /> Add Branch
                </button>
            </div>

            {/* Branch Cards */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : branches.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-400">
                    <Building2 size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No branches yet</p>
                    <p className="text-xs mt-1">Add your first branch to enable geofencing</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branches.map(b => (
                        <div key={b._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                                        <Building2 size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{b.name}</p>
                                        <p className="text-xs text-gray-400">{b.companyId?.name || ""}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                                    {b.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {b.address && (
                                <div className="flex items-start gap-2 text-xs text-gray-500 mb-2">
                                    <MapPin size={12} className="mt-0.5 shrink-0 text-gray-400" />
                                    <span className="line-clamp-2">{b.address}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${b.location?.latitude ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                                    <Radio size={11} />
                                    {b.location?.latitude ? `Geofence: ${b.geofenceRadius}m` : "No location set"}
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <button onClick={() => openEdit(b)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => setDeleteId(b._id)}
                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-base font-semibold text-gray-900">{editData ? "Edit Branch" : "Add Branch"}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Branch Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className={inputCls} placeholder="e.g. Lucknow Office" required />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Address</label>
                                <div className="flex gap-2">
                                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                        className={inputCls} placeholder="Office address" />
                                    <button type="button" onClick={fetchLocation} disabled={locating}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium whitespace-nowrap disabled:opacity-50">
                                        <Navigation size={12} /> {locating ? "..." : "Use GPS"}
                                    </button>
                                </div>
                                {form.location?.latitude && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <Check size={11} /> {form.location.latitude.toFixed(5)}, {form.location.longitude.toFixed(5)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Geofence Radius</label>
                                <select
                                    value={customRadius ? "custom" : (selectedRadiusOption ? form.geofenceRadius : "custom")}
                                    onChange={e => {
                                        if (e.target.value === "custom") { setCustomRadius(true); }
                                        else { setCustomRadius(false); setForm(f => ({ ...f, geofenceRadius: Number(e.target.value) })); }
                                    }}
                                    className={inputCls}>
                                    {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                                {customRadius && (
                                    <input type="number" min="10" max="50000"
                                        value={form.geofenceRadius}
                                        onChange={e => setForm(f => ({ ...f, geofenceRadius: Number(e.target.value) }))}
                                        className={`${inputCls} mt-2`} placeholder="Enter meters" />
                                )}
                                <p className="text-xs text-gray-400 mt-1">Employees must be within this radius to punch-in</p>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Active</p>
                                    <p className="text-xs text-gray-400">Inactive branches won't enforce geofencing</p>
                                </div>
                                <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-blue-600" : "bg-gray-300"}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                                    {saving ? "Saving..." : editData ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Branch?</h3>
                        <p className="text-sm text-gray-500 mb-5">This will remove the branch and unassign all employees from it.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
