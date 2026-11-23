import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X, CalendarDays, Upload, FileText, LayoutList, Calendar, Download, Sparkles, FileDown } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { useStore } from "../../../context/StoreContext";
import {
    getHolidays, createHoliday, updateHoliday, deleteHoliday, bulkCreateHolidays, csvUploadHolidays, autoSyncIndianHolidays,
} from "../../leave/services/leaveService";

const TYPE_COLORS = {
    national:   "bg-blue-50 text-blue-700 border-blue-200",
    optional:   "bg-green-50 text-green-700 border-green-200",
    restricted: "bg-orange-50 text-orange-700 border-orange-200",
};

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const EMPTY_FORM = { name: "", date: "", description: "", type: "national" };

// ── Holiday Drawer ─────────────────────────────────────────────────────────────
const HolidayDrawer = ({ isOpen, onClose, initial, onSubmit, loading }) => {
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        setForm(initial ? { name: initial.name, date: initial.date, description: initial.description || "", type: initial.type } : EMPTY_FORM);
    }, [isOpen, initial]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = () => {
        if (!form.name.trim() || !form.date) return toast.error("Name and date are required");
        onSubmit(form);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">{initial ? "Edit Holiday" : "Add Holiday"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Holiday Name <span className="text-red-500">*</span></label>
                        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Republic Day" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Date <span className="text-red-500">*</span></label>
                        <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
                            <option value="national">National</option>
                            <option value="optional">Optional</option>
                            <option value="restricted">Restricted</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)}
                            rows={3} placeholder="Optional description" className={inputCls} />
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Saving..." : initial ? "Update" : "Add Holiday"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Sample CSV Template for Bulk Upload ───────────────────────────────────────
export const downloadHolidaySampleFormat = () => {
    const csvContent =
`name,date,type,description
Republic Day,26-01-2025,national,National Holiday
Maha Shivratri,26-02-2025,optional,Optional Holiday
Holi,14-03-2025,national,Festival of Colours
Eid-ul-Fitr,31-03-2025,national,Islamic Festival
Independence Day,15-08-2025,national,National Festival
Mahatma Gandhi Jayanti,02-10-2025,national,National Holiday
Diwali,20-10-2025,national,Festival of Lights
Christmas,25-12-2025,national,Christmas Celebration`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "holiday_bulk_upload_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Sample format file downloaded (holiday_bulk_upload_sample.csv)");
};

// ── Bulk Import Modal ──────────────────────────────────────────────────────────
const BulkModal = ({ isOpen, onClose, onSubmit, onCsvSubmit, loading }) => {
    const [tab, setTab] = useState("csv");
    const [rows, setRows] = useState([{ name: "", date: "", type: "national" }]);
    const fileRef = useRef(null);
    const [csvFile, setCsvFile] = useState(null);

    const addRow = () => setRows(r => [...r, { name: "", date: "", type: "national" }]);
    const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
    const setRow = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-900">Import Holidays</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-1 px-6 pt-4">
                    {["csv", "manual"].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                                tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}>{t === "csv" ? "CSV Upload" : "Manual Entry"}</button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {tab === "csv" ? (
                        <div className="space-y-4">
                            {/* Format Guide Card */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-blue-800 text-sm">Bulk Upload Guidelines</span>
                                    <button
                                        type="button"
                                        onClick={downloadHolidaySampleFormat}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition"
                                        title="Download Sample Format File"
                                    >
                                        <FileDown size={14} /> Download Sample CSV
                                    </button>
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Aapki CSV file me niche diye gaye columns hone chahiye. Date format <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-semibold text-blue-700">dd-mm-yyyy</code> ya <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-semibold text-blue-700">yyyy-mm-dd</code> dono chalega.
                                </p>
                                {/* Sample Table Preview */}
                                <div className="overflow-x-auto border border-blue-200 rounded-lg bg-white mt-2">
                                    <table className="w-full text-left text-[11px]">
                                        <thead className="bg-blue-100/60 text-blue-900 font-semibold border-b border-blue-200">
                                            <tr>
                                                <th className="px-2.5 py-1.5">name *</th>
                                                <th className="px-2.5 py-1.5">date *</th>
                                                <th className="px-2.5 py-1.5">type</th>
                                                <th className="px-2.5 py-1.5">description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-700">
                                            <tr>
                                                <td className="px-2.5 py-1 font-medium">Republic Day</td>
                                                <td className="px-2.5 py-1 text-gray-500">26-01-2025</td>
                                                <td className="px-2.5 py-1 text-blue-600 font-medium">national</td>
                                                <td className="px-2.5 py-1 text-gray-400">National Holiday</td>
                                            </tr>
                                            <tr>
                                                <td className="px-2.5 py-1 font-medium">Maha Shivratri</td>
                                                <td className="px-2.5 py-1 text-gray-500">26-02-2025</td>
                                                <td className="px-2.5 py-1 text-green-600 font-medium">optional</td>
                                                <td className="px-2.5 py-1 text-gray-400">Optional Holiday</td>
                                            </tr>
                                            <tr>
                                                <td className="px-2.5 py-1 font-medium">Holi</td>
                                                <td className="px-2.5 py-1 text-gray-500">14-03-2025</td>
                                                <td className="px-2.5 py-1 text-blue-600 font-medium">national</td>
                                                <td className="px-2.5 py-1 text-gray-400">Festival of Colours</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-[11px] text-gray-500 pt-1">
                                    <strong>Allowed types:</strong> national, optional, restricted (default is national).
                                </div>
                            </div>

                            {/* File Upload Area */}
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition">
                                <Upload size={28} className="mx-auto text-blue-500 mb-2" />
                                <p className="text-sm text-gray-700 font-semibold">{csvFile ? csvFile.name : "Click to select CSV file"}</p>
                                <p className="text-xs text-gray-400 mt-1">Only .csv files accepted (with headers)</p>
                                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                                    onChange={e => setCsvFile(e.target.files[0] || null)} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {rows.map((row, i) => (
                                <div key={i} className="grid grid-cols-[1fr_140px_120px_32px] gap-2 items-center">
                                    <input value={row.name} onChange={e => setRow(i, "name", e.target.value)}
                                        placeholder="Holiday name" className={inputCls} />
                                    <input type="date" value={row.date} onChange={e => setRow(i, "date", e.target.value)} className={inputCls} />
                                    <select value={row.type} onChange={e => setRow(i, "type", e.target.value)} className={inputCls}>
                                        <option value="national">National</option>
                                        <option value="optional">Optional</option>
                                        <option value="restricted">Restricted</option>
                                    </select>
                                    <button onClick={() => removeRow(i)} className="p-1.5 text-red-400 hover:text-red-600"><X size={14} /></button>
                                </div>
                            ))}
                            <button onClick={addRow} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1">+ Add Row</button>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button
                        onClick={() => tab === "csv" ? onCsvSubmit(csvFile) : onSubmit(rows)}
                        disabled={loading || (tab === "csv" && !csvFile)}
                        className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {loading ? "Importing..." : "Import Holidays"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Yearly Calendar Component ──────────────────────────────────────────────────
const YearlyCalendar = ({ year, holidays }) => {
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(year, i, 1);
        return {
            name: date.toLocaleString('default', { month: 'long' }),
            monthIndex: i,
            daysInMonth: new Date(year, i + 1, 0).getDate(),
            startDay: date.getDay()
        };
    });

    const getHoliday = (day, monthIndex) => {
        const dStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return holidays.find(h => h.date === dStr);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {months.map(m => (
                <div key={m.name} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 text-center">{m.name} {year}</h3>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className="text-[10px] font-semibold text-gray-400 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
                        {Array.from({ length: m.startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-1" />
                        ))}
                        {Array.from({ length: m.daysInMonth }, (_, i) => i + 1).map(day => {
                            const h = getHoliday(day, m.monthIndex);
                            const isToday = new Date().toDateString() === new Date(year, m.monthIndex, day).toDateString();
                            
                            let classes = "w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all ";
                            
                            if (h) {
                                if (h.type === 'national') classes += "bg-blue-100 text-blue-700 font-bold ring-1 ring-blue-300 cursor-pointer hover:bg-blue-200 ";
                                else if (h.type === 'optional') classes += "bg-green-100 text-green-700 font-bold ring-1 ring-green-300 cursor-pointer hover:bg-green-200 ";
                                else if (h.type === 'restricted') classes += "bg-orange-100 text-orange-700 font-bold ring-1 ring-orange-300 cursor-pointer hover:bg-orange-200 ";
                                else classes += "bg-gray-100 text-gray-800 font-bold ring-1 ring-gray-300 cursor-pointer hover:bg-gray-200 ";
                            } else {
                                classes += isToday ? "bg-gray-900 text-white font-bold shadow-md " : "text-gray-600 hover:bg-gray-100 ";
                            }

                            return (
                                <div key={day} className="relative group">
                                    <div className={classes}>{day}</div>
                                    {h && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-max max-w-[150px] z-10">
                                            <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 shadow-xl leading-tight">
                                                <p className="font-bold">{h.name}</p>
                                                <p className="opacity-80 capitalize">{h.type}</p>
                                            </div>
                                            <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Main Holiday Page ──────────────────────────────────────────────────────────
const Holiday = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const can = (p) => isSuperAdmin || permissions.includes(p);
    const canManage = can("Create_HOLIDAY") || can("UPDATE_HOLIDAY") || can("DELETE_HOLIDAY");

    const [holidays, setHolidays] = useState([]);
    const [year, setYear]         = useState(new Date().getFullYear());
    const [loading, setLoading]   = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [bulkOpen, setBulkOpen]     = useState(false);
    const [selected, setSelected]     = useState(null);
    const [filterType, setFilterType] = useState("all");
    const [viewMode, setViewMode]     = useState("calendar");
    const [syncing, setSyncing]       = useState(false);

    const load = async () => {
        try {
            const d = await getHolidays({ year });
            setHolidays(d.holidays || []);
        } catch { toast.error("Failed to load holidays"); }
    };

    useEffect(() => { load(); }, [year]);

    const handleCreate = async (data) => {
        try {
            setLoading(true);
            await createHoliday(data);
            toast.success("Holiday added");
            setDrawerOpen(false);
            load();
        } catch (err) { toast.error(err?.message || "Failed to add holiday"); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        try {
            setLoading(true);
            await updateHoliday(selected._id, data);
            toast.success("Holiday updated");
            setDrawerOpen(false);
            load();
        } catch (err) { toast.error(err?.message || "Failed to update holiday"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Delete this holiday?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        });
        
        if (!result.isConfirmed) return;
        
        try {
            await deleteHoliday(id);
            toast.success("Holiday deleted");
            load();
        } catch { toast.error("Failed to delete holiday"); }
    };

    const handleBulk = async (rows) => {
        const valid = rows.filter(r => r.name.trim() && r.date);
        if (!valid.length) return toast.error("Add at least one valid row");
        try {
            setLoading(true);
            const res = await bulkCreateHolidays({ holidays: valid });
            toast.success(res.message || "Holidays imported");
            setBulkOpen(false);
            load();
        } catch (err) { toast.error(err?.message || "Failed to import holidays"); }
        finally { setLoading(false); }
    };

    const handleCsvUpload = async (file) => {
        if (!file) return toast.error("Please select a CSV file");
        try {
            setLoading(true);
            const res = await csvUploadHolidays(file);
            toast.success(res.message || "Holidays imported");
            setBulkOpen(false);
            load();
        } catch (err) { toast.error(err?.response?.data?.message || err?.message || "Failed to import CSV"); }
        finally { setLoading(false); }
    };

    // Auto-sync Indian government and cultural holidays for the selected year
    const handleAutoSync = async () => {
        const confirm = await Swal.fire({
            title: `Auto-Sync Indian Holidays (${year})?`,
            text: `Kya aap ${year} ke saare Indian Government aur Cultural festivals automatically mark karna chahte hain?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Auto Sync!",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#2563eb",
        });

        if (!confirm.isConfirmed) return;

        try {
            setSyncing(true);
            const res = await autoSyncIndianHolidays({ year });
            if (res.success) {
                Swal.fire({
                    title: "Holidays Synced! 🎉",
                    text: res.message,
                    icon: "success",
                    confirmButtonColor: "#2563eb",
                });
                load();
            } else {
                toast.error(res.message || "Failed to sync holidays");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Failed to auto-sync holidays");
        } finally {
            setSyncing(false);
        }
    };

    // Download current year's holidays as CSV
    const handleDownloadCsv = () => {
        if (!holidays.length) return toast.info(`No holidays to download for year ${year}`);
        const headers = ["Holiday Name", "Date", "Day", "Type", "Description"];
        const rows = filtered.map(h => {
            const d = new Date(h.date + "T00:00:00");
            const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
            return [
                `"${(h.name || "").replace(/"/g, '""')}"`,
                h.date,
                dayName,
                h.type || "national",
                `"${(h.description || "").replace(/"/g, '""')}"`
            ];
        });
        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `holidays_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Holidays for ${year} downloaded successfully!`);
    };

    const filtered = filterType === "all" ? holidays : holidays.filter(h => h.type === filterType);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Holidays</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{canManage ? "Manage company holidays for the year" : "View upcoming company holidays"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-200/60 p-1 rounded-lg">
                        <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition flex items-center justify-center ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-800"}`} title="List View"><LayoutList size={15} /></button>
                        <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded-md transition flex items-center justify-center ${viewMode === "calendar" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-800"}`} title="Calendar View"><Calendar size={15} /></button>
                    </div>

                    {/* Year Dropdown Filter */}
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                        title="Filter by Year"
                    >
                        {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                            <option key={y} value={y}>
                                Year {y}
                            </option>
                        ))}
                    </select>

                    {/* Download Button */}
                    <button
                        onClick={handleDownloadCsv}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition shadow-sm"
                        title="Download holidays as CSV"
                    >
                        <Download size={14} /> Download
                    </button>

                    {canManage && (
                        <>
                            {/* Auto Sync Indian Holidays Button */}
                            <button
                                onClick={handleAutoSync}
                                disabled={syncing}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-green-600 hover:opacity-95 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                                title="Automatically sync Indian Government & Cultural Holidays"
                            >
                                <Sparkles size={14} /> {syncing ? "Syncing..." : "Auto Sync Indian Holidays"}
                            </button>

                            {/* Sample Format File Download for Bulk Upload */}
                            <button
                                onClick={downloadHolidaySampleFormat}
                                className="flex items-center gap-1.5 px-3 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition shadow-sm"
                                title="Download sample CSV format file for Bulk Upload"
                            >
                                <FileDown size={14} /> Sample Format
                            </button>

                            <button onClick={() => { setBulkOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition shadow-sm">
                                <Upload size={14} /> Bulk Import
                            </button>
                            <button onClick={() => { setSelected(null); setDrawerOpen(true); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
                                <Plus size={15} /> Add Holiday
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
                {["all", "national", "optional", "restricted"].map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition
                            ${filterType === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}>
                        {t}
                    </button>
                ))}
            </div>

            {/* Table or Calendar View */}
            {viewMode === "calendar" ? (
                <YearlyCalendar year={year} holidays={filtered} />
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <th className="px-4 py-3 text-left">Holiday</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Day</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Description</th>
                                {(can("UPDATE_HOLIDAY") || can("DELETE_HOLIDAY")) && (
                                    <th className="px-4 py-3 text-center">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <CalendarDays size={36} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-gray-400 text-sm">No holidays found for {year}</p>
                                    </td>
                                </tr>
                            ) : filtered.map(h => {
                                const d = new Date(h.date + "T00:00:00");
                                const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
                                const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                                return (
                                    <tr key={h._id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                    <CalendarDays size={15} />
                                                </div>
                                                <span className="font-medium text-gray-800">{h.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{dateStr}</td>
                                        <td className="px-4 py-3 text-gray-500">{dayName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium border capitalize ${TYPE_COLORS[h.type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                                {h.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{h.description || "—"}</td>
                                        {(can("UPDATE_HOLIDAY") || can("DELETE_HOLIDAY")) && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    {can("UPDATE_HOLIDAY") && (
                                                        <button onClick={() => { setSelected(h); setDrawerOpen(true); }}
                                                            className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                    {can("DELETE_HOLIDAY") && (
                                                        <button onClick={() => handleDelete(h._id)}
                                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <HolidayDrawer
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelected(null); }}
                initial={selected}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
            <BulkModal
                isOpen={bulkOpen}
                onClose={() => setBulkOpen(false)}
                onSubmit={handleBulk}
                onCsvSubmit={handleCsvUpload}
                loading={loading}
            />
        </div>
    );
};

export default Holiday;
