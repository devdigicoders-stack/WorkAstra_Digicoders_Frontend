import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, X, Pencil, Trash2, Eye, User, Send, MessageSquare, ChevronLeft, ChevronRight, Upload, Settings, FileText, Calendar, IndianRupee, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { useStore } from "../../../context/StoreContext";
import { fetchUsers } from "../../employee/services/UserService.jsx";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, addCommunication, getFieldConfig } from "../services/leadService";
import LeadCommunication from "../components/LeadCommunication.jsx";
import LeadHistory from "../components/LeadHistory.jsx";
import LeadImport from "../components/LeadImport.jsx";
import LeadFieldManager from "../components/LeadFieldManager.jsx";
import QuoteForm from "../components/QuoteForm.jsx";
import QuotePreview from "../components/QuotePreview.jsx";
import LeadMeetings from "../components/LeadMeetings.jsx";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtUS = (raw = "") => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const digits = (v = "") => v.replace(/\D/g, "");
const extractPhone = (raw) => digits(raw).slice(-10);

const PAGE_SIZE = 20;

const STATUSES = ["New Lead", "Contacted", "Meeting Scheduled", "Proposal Sent",
    "Sent to Project Team", "Project Done", "On Hold", "Cancelled"];

const STATUS_COLORS = {
    "New Lead":             "bg-blue-50 text-blue-700 border-blue-200",
    "Contacted":            "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Meeting Scheduled":    "bg-purple-50 text-purple-700 border-purple-200",
    "Proposal Sent":        "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Sent to Project Team": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Project Done":         "bg-green-50 text-green-700 border-green-200",
    "On Hold":              "bg-orange-50 text-orange-700 border-orange-200",
    "Cancelled":            "bg-red-50 text-red-700 border-red-200",
};

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const customFieldsToObject = (customFields) => {
    if (!customFields) return {};
    if (typeof customFields.get === "function") {
        return Object.fromEntries(customFields.entries());
    }
    if (typeof customFields === "object") return { ...customFields };
    return {};
};

const formDataFromLead = (lead, customFields) => {
    const stored = customFieldsToObject(lead.customFields);
    const formData = {
        contactNumber: fmtUS(lead.contactNumber || ""),
        orgName: lead.orgName || "",
        address: lead.address || "",
        contactPerson: lead.contactPerson || "",
        email: lead.email || "",
        status: lead.status || "New Lead",
        dealPrice: lead.dealPrice || "",
        assignedTo: lead.assignedTo?._id || lead.assignedTo || "",
        companyId: lead.companyId?._id || lead.companyId || "",
    };
    customFields.forEach((f) => {
        formData[f.key] = stored[f.key] ?? "";
    });
    return formData;
};

const mergeLeadRefresh = (prev, next) => {
    if (!next) return prev;
    return {
        ...prev,
        ...next,
        communications: next.communications ?? prev?.communications ?? [],
        history: next.history ?? prev?.history ?? [],
        customFields: next.customFields ?? prev?.customFields,
    };
};

const leadSnapshotFromForm = (form, base, users, customFields) => {
    const assignedUser = users.find((u) => u._id === form.assignedTo);
    const baseCustom = customFieldsToObject(base.customFields);
    const customFieldsMerged = { ...baseCustom };
    customFields.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(form, f.key)) {
            customFieldsMerged[f.key] = form[f.key] ?? "";
        }
    });
    return {
        ...base,
        contactNumber: digits(form.contactNumber) || base.contactNumber,
        orgName: form.orgName?.trim() || base.orgName,
        address: form.address ?? base.address,
        contactPerson: form.contactPerson ?? base.contactPerson,
        email: form.email ?? base.email,
        status: form.status || base.status,
        dealPrice: form.dealPrice ? Number(form.dealPrice) : base.dealPrice,
        companyId: form.companyId || base.companyId,
        assignedTo: assignedUser
            ? { _id: assignedUser._id, firstName: assignedUser.firstName, lastName: assignedUser.lastName }
            : form.assignedTo || base.assignedTo,
        customFields: customFieldsMerged,
    };
};

// ─── Inline communication form for new lead ───────────────────────────────────
const NewLeadCommForm = ({ comm, onChange }) => (
    <div>
        <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={14} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">Add Communication</span>
            <span className="text-[10px] text-gray-400">(optional)</span>
        </div>
        <div className="space-y-2">
            <input
                value={comm.subject}
                onChange={e => onChange({ ...comm, subject: e.target.value })}
                placeholder="Subject (optional)"
                className={inp}
            />
            <textarea
                value={comm.description}
                onChange={e => onChange({ ...comm, description: e.target.value })}
                placeholder="Description…"
                rows={4}
                className={inp}
            />
        </div>
    </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
const LeadModal = ({ isOpen, onClose, initial, onSubmit, saving, users, currentUserId, onLeadUpdate, customFields, isSuperAdmin, companies, defaultCompanyId }) => {
    const emptyForm = useCallback(() => {
        const base = {
            contactNumber: "", orgName: "", address: "", contactPerson: "",
            email: "", status: "New Lead", dealPrice: "", assignedTo: currentUserId || "",
            companyId: defaultCompanyId || "",
        };
        customFields.forEach(f => { base[f.key] = ""; });
        return base;
    }, [currentUserId, customFields, defaultCompanyId]);

    const [form, setForm] = useState(emptyForm);
    const [viewMode, setViewMode] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [matchedLead, setMatchedLead] = useState(null);
    const [fullLead, setFullLead] = useState(null);
    const [newComm, setNewComm] = useState({ subject: "", description: "" });
    const [rightTabActive, setRightTabActive] = useState("communication"); // communication | quotes | history
    const [selectedQuotePreview, setSelectedQuotePreview] = useState(null);
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) { setMatchedLead(null); setFullLead(null); return; }
        if (initial) {
            setViewMode(true);
            setFullLead(null);
            getLeadById(initial._id)
                .then(r => {
                    const lead = r.lead || null;
                    setFullLead(lead);
                    if (lead) setForm(formDataFromLead(lead, customFields));
                })
                .catch(() => {});
        } else {
            setForm(emptyForm());
            setNewComm({ subject: "", description: "" });
            setViewMode(false);
            setMatchedLead(null);
            setFullLead(null);
        }
    }, [isOpen, initial, emptyForm, customFields]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleContactNumber = (raw) => {
        const d = extractPhone(raw);
        set("contactNumber", fmtUS(d));
        if (d.length === 10 && !initial) {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => autoPopulate(d), 400);
        }
    };

    const modalUsers = useMemo(() => {
        if (!isSuperAdmin || !form.companyId) return users;
        return users.filter(u => {
            const uComp = u.companyId?._id || u.companyId;
            return uComp === form.companyId;
        });
    }, [users, isSuperAdmin, form.companyId]);

    const autoPopulate = async (d) => {
        try {
            setLookupLoading(true);
            const params = { search: d, limit: 1 };
            if (isSuperAdmin && form.companyId) {
                params.companyId = form.companyId;
            }
            const res = await getLeads(params);
            const leads = res?.leads || [];
            const match = leads.find(l => digits(l.contactNumber || "") === d);
            if (match) {
                setMatchedLead(match);
                getLeadById(match._id)
                    .then((r) => {
                        const lead = r.lead || null;
                        setFullLead(lead);
                        if (lead) setForm(formDataFromLead(lead, customFields));
                    })
                    .catch(() => {});
                toast.info("Existing lead found — will update on save");
            } else {
                setMatchedLead(null);
                setFullLead(null);
            }
        } catch { /* silent */ } finally { setLookupLoading(false); }
    };

    const handleSubmit = async () => {
        if (!digits(form.contactNumber)) return toast.error("Contact number is required");
        if (!form.orgName.trim()) return toast.error("Organisation name is required");

        const payload = {
            contactNumber: digits(form.contactNumber),
            orgName: form.orgName.trim(),
            address: form.address,
            contactPerson: form.contactPerson,
            email: form.email,
            status: form.status,
            dealPrice: form.dealPrice ? Number(form.dealPrice) : 0,
            assignedTo: form.assignedTo || null,
            ...(isSuperAdmin && form.companyId ? { companyId: form.companyId } : {}),
            customFields: {},
        };
        customFields.forEach((f) => {
            if (Object.prototype.hasOwnProperty.call(form, f.key)) {
                payload.customFields[f.key] = form[f.key] ?? "";
            }
        });

        const result = await onSubmit(payload, matchedLead?._id || null, newComm);
        if (result?.updated && result.lead) {
            setFullLead((prev) => mergeLeadRefresh(prev, result.lead));
            setForm(formDataFromLead(result.lead, customFields));
            onLeadUpdate?.(result.lead);
        }
    };

    const handleCommAdded = useCallback((comm) => {
        setFullLead(prev => prev
            ? { ...prev, communications: [...(prev.communications || []), comm] }
            : prev
        );
        onLeadUpdate?.();
    }, [onLeadUpdate]);

    const isEdit = !!initial;
    const isExisting = isEdit || !!matchedLead;
    const activeLead = fullLead || initial || matchedLead;
    const communications = fullLead?.communications || [];
    const history = fullLead?.history || [];
    const activeLeadId = initial?._id || matchedLead?._id;

    /** Live lead for quote preview — reflects form while editing, saved lead after update */
    const quoteLead = useMemo(() => {
        if (!isOpen || !isExisting || !activeLead) return null;
        if (viewMode) return activeLead;
        return leadSnapshotFromForm(form, activeLead, users, customFields);
    }, [isOpen, isExisting, activeLead, viewMode, form, users, customFields]);

    if (!isOpen) return null;

    // Render custom field based on type
    const renderCustomField = (field, isViewMode = false) => {
        const value = isViewMode 
            ? (activeLead?.customFields?.get?.(field.key) || activeLead?.customFields?.[field.key] || "")
            : (form[field.key] || "");
        
        if (isViewMode) {
            return (
                <div key={field.key}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{field.label}</p>
                    <p className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
                </div>
            );
        }

        return (
            <div key={field.key} className={field.type === "date" ? "" : "sm:col-span-1"}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "text" && (
                    <input value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)}
                        placeholder={field.label} className={inp} />
                )}
                {field.type === "number" && (
                    <input type="number" value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)}
                        placeholder={field.label} className={inp} />
                )}
                {field.type === "date" && (
                    <input type="date" value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} className={inp} />
                )}
                {field.type === "dropdown" && (
                    <select value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} className={inp}>
                        <option value="">— Select —</option>
                        {(field.options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
            <div className="relative w-full max-w-6xl max-h-[94vh] sm:h-[calc(100vh-32px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 shrink-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 pr-2">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {viewMode ? (activeLead?.orgName || "Lead Details") : isEdit ? "Edit Lead" : "New Lead"}
                        </h2>
                        {isExisting && activeLead?.status && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${STATUS_COLORS[activeLead.status] || ""}`}>
                                {activeLead.status}
                            </span>
                        )}
                        {matchedLead && !isEdit && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                Existing — will update
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {isEdit && viewMode && (
                            <button onClick={() => setViewMode(false)}
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition cursor-pointer active:scale-95">
                                <Pencil size={12} /> Edit
                            </button>
                        )}
                        {isEdit && !viewMode && (
                            <button onClick={() => setViewMode(true)}
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition cursor-pointer active:scale-95">
                                <Eye size={12} /> View
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer" title="Close (Esc)">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">

                    {/* LEFT */}
                    <div className="flex flex-col w-full lg:w-1/2 lg:border-r border-gray-100 overflow-visible lg:overflow-y-auto">
                        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5">
                            {viewMode ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-3.5 sm:gap-y-4">
                                    {[
                                        { label: "Contact Number",    value: fmtUS(activeLead?.contactNumber || "") },
                                        { label: "Organisation Name", value: activeLead?.orgName },
                                        ...((activeLead?.companyId?.name || (companies && companies.find(c => c._id === (activeLead?.companyId?._id || activeLead?.companyId))?.name)) ? [{
                                            label: "Company",
                                            value: activeLead?.companyId?.name || companies?.find(c => c._id === (activeLead?.companyId?._id || activeLead?.companyId))?.name
                                        }] : []),
                                        { label: "Address",           value: activeLead?.address },
                                        { label: "Contact Person",    value: activeLead?.contactPerson },
                                        { label: "Email",             value: activeLead?.email },
                                        { label: "Status",            value: activeLead?.status },
                                        ...(activeLead?.dealPrice > 0 ? [{ label: "Deal Close Price", value: `₹${Number(activeLead.dealPrice).toLocaleString("en-IN")}` }] : []),
                                        {
                                            label: "Assigned To",
                                            value: activeLead?.assignedTo
                                                ? `${activeLead.assignedTo.firstName} ${activeLead.assignedTo.lastName}`
                                                : null,
                                        },
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                                            <p className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
                                        </div>
                                    ))}
                                    {/* Render custom fields in view mode */}
                                    {customFields.map(field => renderCustomField(field, true))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Contact Number <span className="text-red-500">*</span>
                                            {lookupLoading && <span className="text-blue-500 ml-1 font-normal">looking up…</span>}
                                        </label>
                                        <input value={form.contactNumber} onChange={e => handleContactNumber(e.target.value)}
                                            placeholder="10-digit number" className={inp} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Organisation Name <span className="text-red-500">*</span>
                                        </label>
                                        <input value={form.orgName} onChange={e => set("orgName", e.target.value)}
                                            placeholder="Company / org name" className={inp} />
                                    </div>
                                   
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Legal Name</label>
                                        <input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)}
                                            placeholder="Name of contact" className={inp} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                                            placeholder="email@example.com" className={inp} />
                                    </div>
                                     <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                                        <input value={form.address} onChange={e => set("address", e.target.value)}
                                            placeholder="Full address" className={inp} />
                                    </div>
                                    {/* Render custom fields in edit mode */}
                                    {customFields.map(field => renderCustomField(field, false))}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                        <select value={form.status} onChange={e => set("status", e.target.value)} className={inp}>
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    {(form.status === "Project Done" || form.status === "Sent to Project Team") && (
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                                                <IndianRupee size={12} /> Deal Close Price (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                type="number"
                                                min="0"
                                                value={form.dealPrice || ""} 
                                                onChange={e => set("dealPrice", e.target.value)}
                                                placeholder="e.g. 50000" 
                                                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-emerald-50/40 font-semibold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                                            />
                                        </div>
                                    )}
                                    {isSuperAdmin && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                                            <select
                                                value={form.companyId || ""}
                                                onChange={e => {
                                                    set("companyId", e.target.value);
                                                    set("assignedTo", "");
                                                }}
                                                className={inp}
                                            >
                                                <option value="">— Select Company —</option>
                                                {companies.map(c => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                                        <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} className={inp}>
                                            <option value="">— Unassigned —</option>
                                            {modalUsers.map(u => (
                                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                </div>
                            )}
                        </div>

                        {!viewMode && (
                            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex justify-end gap-2.5 sm:gap-3 shrink-0 bg-gray-50/50">
                                <button onClick={onClose}
                                    className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl hover:bg-gray-100 transition active:scale-95 cursor-pointer">
                                    Cancel
                                </button>
                                <button onClick={handleSubmit} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-60 transition active:scale-95 cursor-pointer shadow-xs">
                                    {saving ? "Saving…" : isExisting ? "Update Lead" : "Create Lead"}
                                    {!isExisting && newComm.description && <Send size={13} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT */}
                    <div className="flex flex-col w-full lg:w-1/2 overflow-visible lg:overflow-hidden border-t lg:border-t-0 border-gray-100">
                        {isExisting ? (
                            <>
                                {/* Tabs */}
                                <div className="px-4 sm:px-6 pt-3 sm:pt-5 border-b border-gray-100 flex gap-3 sm:gap-4 overflow-x-auto shrink-0 scrollbar-none">
                                    {[
                                        { key: "communication", label: "Communication" },
                                        { key: "meetings",      label: "Meetings", icon: Calendar },
                                        { key: "quotes",        label: "Quotes",  icon: FileText },
                                        { key: "history",       label: "History" },
                                    ].map(({ key, label, icon: Icon }) => (
                                        <button key={key}
                                            onClick={() => setRightTabActive(key)}
                                            className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 cursor-pointer ${
                                                rightTabActive === key
                                                    ? "border-blue-600 text-blue-600"
                                                    : "border-transparent text-gray-500 hover:text-gray-900"
                                            }`}>
                                            {Icon && <Icon size={13} />} {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-visible lg:overflow-y-auto">
                                    {rightTabActive === "communication" && (
                                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
                                            <LeadCommunication
                                                leadId={activeLeadId}
                                                communications={communications}
                                                onAdded={handleCommAdded}
                                            />
                                        </div>
                                    )}
                                    {rightTabActive === "meetings" && (
                                        <div className="px-4 sm:px-6 py-4 sm:py-5">
                                            <LeadMeetings leadId={activeLeadId} />
                                        </div>
                                    )}
                                    {rightTabActive === "quotes" && (
                                        <div className="px-4 sm:px-6 py-4 sm:py-5 min-h-[350px] sm:min-h-[400px]">
                                            {!selectedQuotePreview ? (
                                                <QuoteForm
                                                    leadId={activeLeadId}
                                                    lead={quoteLead}
                                                    companyId={quoteLead?.companyId?._id || quoteLead?.companyId || fullLead?.companyId?._id || fullLead?.companyId}
                                                    onOpenPreview={(q) => setSelectedQuotePreview(q)}
                                                    editQuote={quoteToEdit}
                                                    onEditConsumed={() => setQuoteToEdit(null)}
                                                />
                                            ) : (
                                                <QuotePreview
                                                    quote={selectedQuotePreview}
                                                    lead={quoteLead}
                                                    onClose={() => setSelectedQuotePreview(null)}
                                                    onUpdated={(q) => setSelectedQuotePreview(q)}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {rightTabActive === "history" && (
                                        <div className="px-4 sm:px-6 py-4 sm:py-5">
                                            <LeadHistory history={history} users={users} />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="px-4 sm:px-6 py-4 sm:py-5">
                                <NewLeadCommForm comm={newComm} onChange={setNewComm} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Pagination bar ───────────────────────────────────────────────────────────
const Pagination = ({ page, total, limit, onChange }) => {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return null;
    const from = (page - 1) * limit + 1;
    const to   = Math.min(page * limit, total);
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-b-xl">
            <span className="text-xs text-gray-500">{from}–{to} of {total.toLocaleString()} leads</span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(page - 1)} disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600">
                    <ChevronLeft size={15} />
                </button>
                <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
                <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600">
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const Leads = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const isAdmin = user?.role?.name === "admin" || isSuperAdmin;
    const canCreate = isAdmin || user?.role?.permissions?.includes("CREATE_LEAD");
    const canWrite = isAdmin || user?.role?.permissions?.some(p => ["CREATE_LEAD", "UPDATE_LEAD"].includes(p));
    const canDelete = isAdmin || user?.role?.permissions?.includes("DELETE_LEAD");

    const [leads, setLeads]       = useState([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [search, setSearch]     = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [users, setUsers]       = useState([]);
    const [saving, setSaving]     = useState(false);
    const [loading, setLoading]   = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [customFields, setCustomFields] = useState([]);
    const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterAssignedTo, setFilterAssignedTo] = useState("");
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const searchDebounce          = useRef(null);

    // Load Companies for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    const load = useCallback(async (pg, q, status, assignedTo, compId) => {
        try {
            setLoading(true);
            const params = { page: pg, limit: PAGE_SIZE };
            if (q) params.search = q;
            if (status) params.status = status;
            if (assignedTo) params.assignedTo = assignedTo;
            if (isSuperAdmin) {
                params.companyId = compId || "all";
            }
            const res = await getLeads(params);
            setLeads(res?.leads || []);
            setTotal(res?.total || 0);
        } catch { toast.error("Failed to load leads"); }
        finally { setLoading(false); }
    }, [isSuperAdmin]);

    useEffect(() => {
        load(page, search, filterStatus, filterAssignedTo, selectedCompany);
    }, [page, search, filterStatus, filterAssignedTo, selectedCompany, load]);

    useEffect(() => {
        fetchUsers().then(r => setUsers(r.users || [])).catch(() => {});
        getFieldConfig().then(r => setCustomFields(r.fields || [])).catch(() => {});
    }, []);

    const filteredUsers = useMemo(() => {
        if (!isSuperAdmin || !selectedCompany || selectedCompany === "all") return users;
        return users.filter(u => {
            const uComp = u.companyId?._id || u.companyId;
            return uComp === selectedCompany;
        });
    }, [users, isSuperAdmin, selectedCompany]);

    const handleSearchInput = (val) => {
        setSearchInput(val);
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            setPage(1);
            setSearch(val);
        }, 400);
    };

    const handlePageChange = (pg) => { setPage(pg); };

    const handleFilterChange = (status, assignedTo) => {
        setFilterStatus(status);
        setFilterAssignedTo(assignedTo);
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilterStatus("");
        setFilterAssignedTo("");
        setSelectedCompany("");
        setPage(1);
    };

    const openNew  = () => { setSelected(null); setModalOpen(true); };
    const openView = (lead) => { setSelected(lead); setModalOpen(true); };
    const close    = () => { setModalOpen(false); setSelected(null); };

    const handleSubmit = async (form, matchedId, newComm) => {
        try {
            const isDone = form.status === "Project Done" || form.status === "Sent to Project Team";
            if (isDone && (!form.dealPrice || Number(form.dealPrice) <= 0)) {
                const { value: price, isDismissed } = await Swal.fire({
                    title: 'Deal Close Price',
                    html: `Please enter the deal close price for <b>${form.orgName}</b>.<br/><span style="font-size: 12px; color: #6b7280;">A project will be created with this price.</span>`,
                    input: 'number',
                    inputLabel: 'Deal Close Price (₹)',
                    inputPlaceholder: 'e.g. 50000',
                    inputAttributes: { min: '0', step: '100' },
                    showCancelButton: true,
                    confirmButtonText: 'Save & Create Project',
                    confirmButtonColor: '#10B981',
                    cancelButtonText: 'Cancel',
                    inputValidator: (value) => {
                        if (!value || Number(value) <= 0) {
                            return 'Please enter a valid deal close price!';
                        }
                    }
                });
                if (isDismissed || !price) {
                    return null;
                }
                form.dealPrice = Number(price);
            }

            setSaving(true);
            const existingId = selected?._id || matchedId;
            if (existingId) {
                await updateLead(existingId, form);
                const refreshed = await getLeadById(existingId);
                const lead = refreshed.lead;
                if (lead) setSelected(lead);
                toast.success("Lead updated");
                load(page, search, filterStatus, filterAssignedTo, selectedCompany);
                return { updated: true, lead };
            }
            const res = await createLead(form);
            const createdId = res.lead?._id;
            if (createdId && newComm?.description?.trim()) {
                await addCommunication(createdId, {
                    subject: newComm.subject?.trim() || "Note",
                    description: newComm.description.trim(),
                });
            }
            toast.success("Lead created");
            close();
            load(page, search, filterStatus, filterAssignedTo, selectedCompany);
            return { created: true };
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save lead");
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteLead(id);
            toast.success("Lead deleted");
            setDeleteConfirmId(null);
            const newPage = leads.length === 1 && page > 1 ? page - 1 : page;
            setPage(newPage);
            load(newPage, search, filterStatus, filterAssignedTo, selectedCompany);
        } catch { toast.error("Failed to delete lead"); }
    };

    return (
        <div className="p-3 sm:p-6 bg-gray-50 min-h-screen max-w-full overflow-x-hidden">
            <div className="flex flex-col gap-3.5 sm:gap-4 mb-5 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Leads</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            {total > 0 ? `${total.toLocaleString()} total leads` : "Track and manage sales leads"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <input
                            value={searchInput}
                            onChange={e => handleSearchInput(e.target.value)}
                            placeholder="Search leads…"
                            className="flex-1 sm:w-52 min-w-[130px] px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                        />
                        {isAdmin && (
                            <button onClick={() => setFieldManagerOpen(true)}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs cursor-pointer">
                                <Settings size={14} /> <span className="whitespace-nowrap">Manage Fields</span>
                            </button>
                        )}
                        {canCreate && (
                            <button onClick={() => setImportOpen(true)}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs cursor-pointer">
                                <Upload size={14} /> <span className="whitespace-nowrap">Import CSV</span>
                            </button>
                        )}
                        {canCreate && (
                            <button onClick={openNew}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs cursor-pointer">
                                <Plus size={15} /> <span className="whitespace-nowrap">New Lead</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">Filters:</span>

                    {/* Super Admin Company Filter */}
                    {isSuperAdmin && (
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
                            <Building2 size={14} className="text-blue-600 shrink-0" />
                            <select
                                value={selectedCompany}
                                onChange={e => {
                                    setSelectedCompany(e.target.value);
                                    setFilterAssignedTo("");
                                    setPage(1);
                                }}
                                className="bg-transparent text-xs sm:text-sm font-medium text-gray-700 outline-none cursor-pointer pr-1"
                            >
                                <option value="">🏢 All Companies</option>
                                {companies.map(c => (
                                    <option key={c._id} value={c._id}>
                                        🏢 {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <select
                        value={filterStatus}
                        onChange={e => handleFilterChange(e.target.value, filterAssignedTo)}
                        className="flex-1 sm:flex-initial text-xs sm:text-sm border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700 shadow-2xs cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {isAdmin && (
                        <select
                            value={filterAssignedTo}
                            onChange={e => handleFilterChange(filterStatus, e.target.value)}
                            className="flex-1 sm:flex-initial text-xs sm:text-sm border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700 shadow-2xs cursor-pointer"
                        >
                            <option value="">All Assigned To</option>
                            {filteredUsers.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    )}

                    {(filterStatus || filterAssignedTo || (isSuperAdmin && selectedCompany)) && (
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <User size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">{search ? "No leads match your search" : "No leads yet"}</p>
                    {!search && <p className="text-gray-400 text-sm mt-1">Add your first lead to get started</p>}
                </div>
            ) : (
                <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs sm:text-sm min-w-[720px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Contact Number", "Organisation", "Contact Person", "Status", "Assigned To", "Action"].map(h => (
                                        <th key={h} className={`px-4 py-3 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === "Action" ? "text-center" : "text-left"}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leads.map(lead => (
                                    <tr key={lead._id} className="hover:bg-gray-50 transition group">
                                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{fmtUS(lead.contactNumber || "")}</td>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            <div className="font-semibold text-gray-900">{lead.orgName}</div>
                                            {isSuperAdmin && lead.companyId?.name && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded font-normal mt-0.5">
                                                    <Building2 size={10} className="text-blue-500" />
                                                    {lead.companyId.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.contactPerson || "—"}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap ${STATUS_COLORS[lead.status] || ""}`}>
                                                {lead.status}
                                            </span>
                                            {lead.dealPrice > 0 && (
                                                <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                                                    ₹{Number(lead.dealPrice).toLocaleString("en-IN")}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                            {lead.assignedTo && typeof lead.assignedTo === "object"
                                                ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                                                : lead.assignedTo
                                                    ? (users.find(u => u._id === lead.assignedTo?.toString())
                                                        ? `${users.find(u => u._id === lead.assignedTo?.toString()).firstName} ${users.find(u => u._id === lead.assignedTo?.toString()).lastName}`
                                                        : <span className="text-gray-300">—</span>)
                                                    : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {deleteConfirmId === lead._id ? (
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <span className="text-[10px] text-red-600 font-medium">Delete?</span>
                                                    <button onClick={() => handleDelete(lead._id)}
                                                        className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition cursor-pointer">Yes</button>
                                                    <button onClick={() => setDeleteConfirmId(null)}
                                                        className="px-2 py-1 text-[10px] bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 active:scale-95 transition cursor-pointer">No</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 transition justify-center">
                                                    <button onClick={() => openView(lead)}
                                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition active:scale-95 cursor-pointer"
                                                        title="View Lead Details">
                                                        <Eye size={13} />
                                                    </button>
                                                    {canWrite && (
                                                        <button onClick={() => { setSelected(lead); setModalOpen(true); }}
                                                            className="p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition active:scale-95 cursor-pointer"
                                                            title="Edit Lead">
                                                            <Pencil size={13} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button onClick={() => setDeleteConfirmId(lead._id)}
                                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition active:scale-95 cursor-pointer"
                                                            title="Delete Lead">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} total={total} limit={PAGE_SIZE} onChange={handlePageChange} />
                </div>
            )}

            <LeadModal
                isOpen={modalOpen}
                onClose={close}
                initial={selected}
                onSubmit={handleSubmit}
                saving={saving}
                users={users}
                currentUserId={user?._id}
                onLeadUpdate={(lead) => {
                    if (lead) setSelected(lead);
                    load(page, search, filterStatus, filterAssignedTo, selectedCompany);
                }}
                customFields={customFields}
                isSuperAdmin={isSuperAdmin}
                companies={companies}
                defaultCompanyId={selectedCompany && selectedCompany !== "all" ? selectedCompany : (user?.companyId?._id || user?.company || "")}
            />

            <LeadFieldManager
                isOpen={fieldManagerOpen}
                onClose={() => setFieldManagerOpen(false)}
                onSave={() => {
                    getFieldConfig().then(r => setCustomFields(r.fields || [])).catch(() => {});
                    load(page, search, filterStatus, filterAssignedTo, selectedCompany);
                }}
            />

            <LeadImport
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                onDone={() => { setPage(1); load(1, search, filterStatus, filterAssignedTo, selectedCompany); }}
                customFields={customFields}
            />
        </div>
    );
};

export default Leads;
