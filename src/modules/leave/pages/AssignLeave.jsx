import { useState, useEffect, useRef } from "react";
import { Users, UserCheck, ChevronDown, Search, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useStore } from "../../../context/StoreContext";
import {
    getLeaveTypes, assignLeaveBalance, bulkAssignLeaveBalance, getUserBalance,
} from "../services/leaveService";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── Searchable Employee Dropdown ──────────────────────────────
const SearchableEmployeeSelect = ({ employees, selectedUserId, onSelect, disabled, placeholder }) => {
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
            <label className="block text-xs font-medium text-gray-500 mb-1">
                Employee <span className="text-red-500">*</span>
            </label>

            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white transition text-left ${
                    open ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                } ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "cursor-pointer"}`}
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
                    </div>
                ) : (
                    <span className="text-gray-400">{placeholder || "Select employee..."}</span>
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

                                        {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
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

const AssignLeave = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const isSuperAdmin = user?.role?.name === "super_admin";
    const canAssign     = isSuperAdmin || permissions.includes("ASSIGN_LEAVE");
    const canBulkAssign = isSuperAdmin || permissions.includes("BULK_ASSIGN_LEAVE");

    const [tab, setTab]             = useState("individual");
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [employees, setEmployees]   = useState([]);
    const [companies, setCompanies]   = useState([]);
    const [loading, setLoading]       = useState(false);

    // Individual form
    const [indForm, setIndForm] = useState({ userId: "", leaveTypeId: "", allocated: "", year: new Date().getFullYear(), companyId: "" });
    const [userBalance, setUserBalance] = useState([]);

    // Bulk form
    const [bulkForm, setBulkForm] = useState({ leaveTypeId: "", allocated: "", year: new Date().getFullYear(), companyId: "" });

    useEffect(() => {
        getLeaveTypes().then(d => setLeaveTypes(d.leaveTypes || [])).catch(() => {});
        if (isSuperAdmin) {
            api.get(ENDPOINTS.COMPANY.GET_ALL_COMPANIES).then(r => setCompanies(r.data.companies || r.data || [])).catch(() => {});
        } else {
            api.get(ENDPOINTS.USER.GET_ALL).then(r => {
                const users = r.data?.users || r.data || [];
                setEmployees(users.filter(u => u.role?.name?.trim().toLowerCase() !== "client"));
            }).catch(() => {});
        }
    }, [isSuperAdmin]);

    const handleCompanyChange = (e, formType) => {
        const cId = e.target.value;
        if (formType === "ind") {
            setIndForm(f => ({ ...f, companyId: cId, userId: "" }));
            setUserBalance([]);
        } else {
            setBulkForm(f => ({ ...f, companyId: cId }));
        }
        
        if (cId) {
            api.get(ENDPOINTS.USER.GET_ALL_BY_COMPANY(cId))
                .then(r => {
                    const users = r.data?.users || r.data || [];
                    setEmployees(users.filter(u => u.role?.name?.trim().toLowerCase() !== "client"));
                })
                .catch(() => setEmployees([]));
        } else {
            setEmployees([]);
        }
    };

    const setInd = (k, v) => setIndForm(f => ({ ...f, [k]: v }));
    const setBulk = (k, v) => setBulkForm(f => ({ ...f, [k]: v }));

    const loadUserBalance = async (userId) => {
        if (!userId) return setUserBalance([]);
        try {
            const d = await getUserBalance(userId, { year: indForm.year });
            setUserBalance(d.balances || []);
        } catch { setUserBalance([]); }
    };

    const handleIndividual = async (e) => {
        e.preventDefault();
        if (!indForm.userId || !indForm.leaveTypeId || !indForm.allocated || (isSuperAdmin && !indForm.companyId))
            return toast.error("All fields are required");
        try {
            setLoading(true);
            await assignLeaveBalance({ ...indForm, allocated: Number(indForm.allocated) });
            toast.success("Leave balance assigned successfully");
            loadUserBalance(indForm.userId);
        } catch (err) {
            toast.error(err?.message || "Failed to assign leave");
        } finally { setLoading(false); }
    };

    const handleBulk = async (e) => {
        e.preventDefault();
        if (!bulkForm.leaveTypeId || !bulkForm.allocated || (isSuperAdmin && !bulkForm.companyId))
            return toast.error("All fields are required");
        if (!window.confirm(`Assign ${bulkForm.allocated} days to ALL active employees?`)) return;
        try {
            setLoading(true);
            const res = await bulkAssignLeaveBalance({ ...bulkForm, allocated: Number(bulkForm.allocated) });
            toast.success(res.message || "Bulk assignment done");
        } catch (err) {
            toast.error(err?.message || "Failed to bulk assign");
        } finally { setLoading(false); }
    };

    if (!canAssign && !canBulkAssign)
        return (
            <div className="p-6 text-center text-gray-400 text-sm">
                You don't have permission to assign leave.
            </div>
        );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Assign Leave</h1>
                <p className="text-sm text-gray-500 mt-1">Allocate leave balance to employees</p>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl mb-6 p-1 flex gap-1 w-fit">
                {canAssign && (
                    <button onClick={() => setTab("individual")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                            ${tab === "individual" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
                        <UserCheck size={15} /> Individual
                    </button>
                )}
                {canBulkAssign && (
                    <button onClick={() => setTab("bulk")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                            ${tab === "bulk" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
                        <Users size={15} /> Bulk Assign
                    </button>
                )}
            </div>

            {/* Individual */}
            {tab === "individual" && canAssign && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Assign to Employee</h2>
                        <form onSubmit={handleIndividual} className="space-y-4">
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                                    <select value={indForm.companyId} onChange={e => handleCompanyChange(e, "ind")} className={inputCls}>
                                        <option value="">Select company</option>
                                        {companies.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Searchable Employee Selector with Live Search Bar */}
                            <SearchableEmployeeSelect
                                employees={employees}
                                selectedUserId={indForm.userId}
                                onSelect={(empId) => {
                                    setInd("userId", empId);
                                    loadUserBalance(empId);
                                }}
                                disabled={isSuperAdmin && !indForm.companyId}
                                placeholder={isSuperAdmin && !indForm.companyId ? "Select company first" : "Select employee..."}
                            />

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Leave Type</label>
                                <select value={indForm.leaveTypeId} onChange={e => setInd("leaveTypeId", e.target.value)} className={inputCls}>
                                    <option value="">Select leave type</option>
                                    {leaveTypes.map(lt => (
                                        <option key={lt._id} value={lt._id}>{lt.name} ({lt.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Days Allocated</label>
                                    <input type="number" min="0" value={indForm.allocated}
                                        onChange={e => setInd("allocated", e.target.value)}
                                        placeholder="e.g. 12" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                                    <input type="number" value={indForm.year}
                                        onChange={e => {
                                            setInd("year", e.target.value);
                                            if (indForm.userId) loadUserBalance(indForm.userId);
                                        }}
                                        className={inputCls} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm">
                                {loading ? "Assigning..." : "Assign Leave Balance"}
                            </button>
                        </form>
                    </div>

                    {/* Current balance preview */}
                    {indForm.userId && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">Current Balance ({indForm.year})</h2>
                            {userBalance.length === 0 ? (
                                <p className="text-sm text-gray-400">No balance records found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {userBalance.map(b => {
                                        const avail = b.allocated + b.carried - b.used - b.pending;
                                        return (
                                            <div key={b._id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg text-sm">
                                                <span className="font-medium text-gray-700">{b.leaveTypeId?.name}</span>
                                                <div className="flex gap-3 text-xs text-gray-500">
                                                    <span>Alloc: <strong>{b.allocated}</strong></span>
                                                    <span>Used: <strong className="text-red-600">{b.used}</strong></span>
                                                    <span>Avail: <strong className="text-green-600">{avail}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bulk */}
            {tab === "bulk" && canBulkAssign && (
                <div className="max-w-lg">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h2 className="text-base font-semibold text-gray-900 mb-1">Bulk Assign to All Employees</h2>
                        <p className="text-xs text-gray-400 mb-4">This will assign leave balance to all active employees in your company.</p>
                        <form onSubmit={handleBulk} className="space-y-4">
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                                    <select value={bulkForm.companyId} onChange={e => handleCompanyChange(e, "bulk")} className={inputCls}>
                                        <option value="">Select company</option>
                                        {companies.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Leave Type</label>
                                <select value={bulkForm.leaveTypeId} onChange={e => setBulk("leaveTypeId", e.target.value)} className={inputCls}>
                                    <option value="">Select leave type</option>
                                    {leaveTypes.map(lt => (
                                        <option key={lt._id} value={lt._id}>{lt.name} ({lt.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Days Allocated</label>
                                    <input type="number" min="0" value={bulkForm.allocated}
                                        onChange={e => setBulk("allocated", e.target.value)}
                                        placeholder="e.g. 12" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                                    <input type="number" value={bulkForm.year}
                                        onChange={e => setBulk("year", e.target.value)}
                                        className={inputCls} />
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                                ⚠ This will overwrite existing allocations for the selected leave type and year.
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm">
                                {loading ? "Assigning..." : "Bulk Assign to All Employees"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignLeave;
