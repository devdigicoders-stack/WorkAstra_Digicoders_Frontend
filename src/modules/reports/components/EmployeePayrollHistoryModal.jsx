import React, { useState, useEffect, useMemo } from "react";
import { 
    X, Download, Eye, Calendar, Building2, User, ChevronDown, 
    ChevronUp, FileText, CheckCircle2, Clock, AlertCircle, 
    RefreshCw, Filter, Banknote, CreditCard, ShieldCheck
} from "lucide-react";
import { getPayrollRuns } from "../../payroll/services/payrollService";
import PayslipPrint from "../../payroll/pages/PayslipPrint";
import { getImageUrl } from "../../../utils/imageUtils";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const monthLabel = (m) => {
    if (!m) return "";
    const [y, mo] = m.split("-");
    return new Date(y, mo - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const STATUS_BADGE = {
    paid: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Paid" },
    approved: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Approved" },
    draft: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Draft" },
};

const exportToCSV = (rows, filename) => {
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

const EmployeePayrollHistoryModal = ({ employee, onClose, company }) => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters
    const [selectedYear, setSelectedYear] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [searchMonth, setSearchMonth] = useState("");
    
    // Payslip modal state
    const [activePayslipRun, setActivePayslipRun] = useState(null);
    
    // Expanded row for breakdown
    const [expandedRow, setExpandedRow] = useState(null);

    const empId = employee?._id || employee?.userId?._id || employee?.userId;
    const empDetails = employee?.userId || employee;

    useEffect(() => {
        if (!empId) return;
        fetchEmployeePayroll();
    }, [empId]);

    const fetchEmployeePayroll = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getPayrollRuns({ userId: empId });
            if (res.success) {
                // Sort runs in descending order by month (e.g. 2026-11, 2026-10, 2026-09...)
                const sorted = (res.runs || []).sort((a, b) => (b.month || "").localeCompare(a.month || ""));
                setRuns(sorted);
            } else {
                setError(res.message || "Failed to load payroll history");
            }
        } catch (err) {
            console.error("Error fetching employee payroll runs:", err);
            setError(err.message || "Failed to load payroll history");
        } finally {
            setLoading(false);
        }
    };

    // Extract available years from records
    const availableYears = useMemo(() => {
        const years = new Set();
        runs.forEach(r => {
            if (r.month && r.month.includes("-")) {
                years.add(r.month.split("-")[0]);
            }
        });
        const currentYear = new Date().getFullYear().toString();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [runs]);

    // Filtered runs
    const filteredRuns = useMemo(() => {
        return runs.filter(r => {
            // Year filter
            if (selectedYear !== "all") {
                if (!r.month || !r.month.startsWith(selectedYear)) return false;
            }
            // Status filter
            if (selectedStatus !== "all") {
                if (r.status !== selectedStatus) return false;
            }
            // Search month name or YYYY-MM
            if (searchMonth.trim()) {
                const term = searchMonth.trim().toLowerCase();
                const mLabel = monthLabel(r.month).toLowerCase();
                const rawMonth = (r.month || "").toLowerCase();
                if (!mLabel.includes(term) && !rawMonth.includes(term)) return false;
            }
            return true;
        });
    }, [runs, selectedYear, selectedStatus, searchMonth]);

    // KPI summaries for filtered runs
    const summary = useMemo(() => {
        const totalGross = filteredRuns.reduce((sum, r) => sum + (Number(r.grossEarnings) || 0), 0);
        const totalDeductions = filteredRuns.reduce((sum, r) => sum + (Number(r.totalDeductions) || 0), 0);
        const totalNet = filteredRuns.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);
        const totalLopDays = filteredRuns.reduce((sum, r) => sum + (Number(r.lopDays) || 0), 0);
        return {
            count: filteredRuns.length,
            totalGross,
            totalDeductions,
            totalNet,
            totalLopDays
        };
    }, [filteredRuns]);

    // Export handler
    const handleExportCSV = () => {
        const headers = [
            "Month",
            "Month Name",
            "Employee Name",
            "Employee Code",
            "Department",
            "Designation",
            "Total Working Days",
            "Present Days",
            "Absent Days",
            "Half Days",
            "Paid Leave Days",
            "LOP Days",
            "Gross Earnings (INR)",
            "Total Deductions (INR)",
            "LOP Deduction (INR)",
            "Net Salary (INR)",
            "Status",
            "Approved At",
            "Paid At"
        ];

        const empName = `${empDetails?.firstName || ""} ${empDetails?.lastName || ""}`.trim();
        const empCode = empDetails?.employeeCode || "";
        const deptName = empDetails?.department?.name || "";
        const desigName = empDetails?.designation?.name || "";

        const rows = filteredRuns.map(r => [
            r.month || "",
            monthLabel(r.month),
            empName,
            empCode,
            deptName,
            desigName,
            r.totalWorkingDays || 0,
            r.presentDays || 0,
            r.absentDays || 0,
            r.halfDays || 0,
            r.paidLeaveDays || 0,
            r.lopDays || 0,
            r.grossEarnings || 0,
            r.totalDeductions || 0,
            r.lopDeduction || 0,
            r.netSalary || 0,
            (r.status || "").toUpperCase(),
            r.approvedAt ? new Date(r.approvedAt).toLocaleDateString("en-IN") : "",
            r.paidAt ? new Date(r.paidAt).toLocaleDateString("en-IN") : ""
        ]);

        const filename = `Payroll_History_${empCode || empName.replace(/\s+/g, '_')}_${selectedYear}.csv`;
        exportToCSV([headers, ...rows], filename);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
                    
                    {/* Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0 border-2 border-white/20">
                                {empDetails?.profilePic?.url ? (
                                    <img 
                                        src={getImageUrl(empDetails.profilePic.url)} 
                                        alt="profile" 
                                        className="w-full h-full rounded-full object-cover" 
                                    />
                                ) : (
                                    <span>{empDetails?.firstName?.[0]}{empDetails?.lastName?.[0]}</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                                        {empDetails?.firstName} {empDetails?.lastName}
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                                        {empDetails?.employeeCode || "N/A"}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-indigo-200/80 mt-0.5 flex flex-wrap items-center gap-2">
                                    <span>{empDetails?.department?.name || "Department N/A"}</span>
                                    <span>•</span>
                                    <span>{empDetails?.designation?.name || "Designation N/A"}</span>
                                    {empDetails?.joiningDate && (
                                        <>
                                            <span>•</span>
                                            <span>Joined: {new Date(empDetails.joiningDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchEmployeePayroll}
                                disabled={loading}
                                className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
                                title="Refresh History"
                            >
                                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Filter & Export Bar */}
                    <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <Filter size={14} className="text-indigo-600" /> Filters:
                            </div>

                            {/* Year Filter */}
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="text-xs sm:text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700 shadow-sm"
                            >
                                <option value="all">All Years</option>
                                {availableYears.map(yr => (
                                    <option key={yr} value={yr}>Year {yr}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="text-xs sm:text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700 shadow-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="paid">Paid</option>
                                <option value="approved">Approved</option>
                                <option value="draft">Draft</option>
                            </select>

                            {/* Month search */}
                            <input
                                type="text"
                                placeholder="Search month (e.g. Nov, 2026-10)..."
                                value={searchMonth}
                                onChange={(e) => setSearchMonth(e.target.value)}
                                className="text-xs sm:text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 shadow-sm min-w-[190px]"
                            />

                            {(selectedYear !== "all" || selectedStatus !== "all" || searchMonth) && (
                                <button
                                    onClick={() => {
                                        setSelectedYear("all");
                                        setSelectedStatus("all");
                                        setSearchMonth("");
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        {/* Export CSV Button */}
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredRuns.length === 0}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition shrink-0 ${
                                filteredRuns.length === 0 
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                            title="Download CSV report of filtered payroll runs"
                        >
                            <Download size={15} /> Export Filtered CSV ({filteredRuns.length})
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
                                <p className="text-sm text-gray-500 font-medium">Loading employee payroll history...</p>
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 my-6">
                                <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-red-700">{error}</p>
                                <button
                                    onClick={fetchEmployeePayroll}
                                    className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Summary KPIs */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                    <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payrolls</p>
                                        <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{summary.count} Months</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Records in current filter</p>
                                    </div>
                                    <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm">
                                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Net Payout</p>
                                        <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">{fmt(summary.totalNet)}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Take-home total</p>
                                    </div>
                                    <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm">
                                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Total Gross</p>
                                        <p className="text-xl sm:text-2xl font-bold text-indigo-800 mt-1">{fmt(summary.totalGross)}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Gross earned</p>
                                    </div>
                                    <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm">
                                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Deductions</p>
                                        <p className="text-xl sm:text-2xl font-bold text-red-700 mt-1">{fmt(summary.totalDeductions)}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{summary.totalLopDays} LOP days total</p>
                                    </div>
                                </div>

                                {/* Month-wise List / Table */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                            <Calendar size={16} className="text-indigo-600" />
                                            Month-wise Payroll Records ({filteredRuns.length})
                                        </h3>
                                        <span className="text-xs text-gray-500">Sorted newest to oldest</span>
                                    </div>

                                    {filteredRuns.length === 0 ? (
                                        <div className="p-12 text-center text-gray-400">
                                            <FileText size={36} className="mx-auto mb-2 text-gray-300" />
                                            <p className="font-medium text-gray-600">No payroll records match the selected filters.</p>
                                            <p className="text-xs text-gray-400 mt-1">Try selecting another year or resetting the filters.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {filteredRuns.map((r, idx) => {
                                                const isExpanded = expandedRow === r._id;
                                                const badge = STATUS_BADGE[r.status] || STATUS_BADGE.draft;
                                                const earnings = r.components?.filter(c => c.type === "earning") || [];
                                                const deductions = r.components?.filter(c => c.type === "deduction") || [];

                                                return (
                                                    <div key={r._id || idx} className="hover:bg-slate-50/60 transition">
                                                        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            {/* Month & Attendance Info */}
                                                            <div className="flex items-start sm:items-center gap-3 min-w-[220px]">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex flex-col items-center justify-center font-bold shrink-0">
                                                                    <span className="text-[10px] uppercase leading-none text-indigo-500">
                                                                        {new Date((r.month || "") + "-01").toLocaleString("en-IN", { month: "short" })}
                                                                    </span>
                                                                    <span className="text-xs leading-tight">
                                                                        {(r.month || "").split("-")[0]?.slice(-2)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                                                                        {monthLabel(r.month)}
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                                                                            {badge.label}
                                                                        </span>
                                                                    </h4>
                                                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                                                        <span>Work Days: <strong className="text-gray-700">{r.totalWorkingDays}</strong></span>
                                                                        <span>•</span>
                                                                        <span>Present: <strong className="text-gray-700">{r.presentDays}</strong></span>
                                                                        {r.lopDays > 0 ? (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span className="text-red-600 font-semibold">LOP: {r.lopDays} d</span>
                                                                            </>
                                                                        ) : null}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Financial Figures */}
                                                            <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                                                                <div>
                                                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Gross</p>
                                                                    <p className="text-sm font-semibold text-gray-700">{fmt(r.grossEarnings)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Deductions</p>
                                                                    <p className="text-sm font-semibold text-red-500">- {fmt(r.totalDeductions)}</p>
                                                                </div>
                                                                <div className="min-w-[100px]">
                                                                    <p className="text-[11px] text-gray-400 uppercase font-semibold">Net Salary</p>
                                                                    <p className="text-base sm:text-lg font-bold text-emerald-600">{fmt(r.netSalary)}</p>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                                                                <button
                                                                    onClick={() => setActivePayslipRun(r)}
                                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg text-xs font-semibold shadow-sm transition"
                                                                    title="View and print/download payslip for this month"
                                                                >
                                                                    <Eye size={14} /> View Payslip
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpandedRow(isExpanded ? null : r._id)}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-xs font-medium transition"
                                                                    title="Toggle itemized salary breakdown"
                                                                >
                                                                    {isExpanded ? "Hide" : "Details"}
                                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Expandable Breakdown Drawer */}
                                                        {isExpanded && (
                                                            <div className="bg-slate-50 border-t border-gray-100 p-4 sm:p-5 text-xs animate-fade-in">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    {/* Earnings Components */}
                                                                    <div className="bg-white rounded-xl p-4 border border-gray-200/70 shadow-sm">
                                                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                                                                            <span className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">Earnings Breakdown</span>
                                                                            <span className="text-emerald-600 font-bold">{fmt(r.grossEarnings)}</span>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            {earnings.length === 0 ? (
                                                                                <p className="text-gray-400 italic">No specific earnings items</p>
                                                                            ) : (
                                                                                earnings.map((c, i) => (
                                                                                    <div key={i} className="flex justify-between text-gray-600">
                                                                                        <span>{c.name}</span>
                                                                                        <span className="font-medium text-gray-800">{fmt(c.amount)}</span>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Deductions Components */}
                                                                    <div className="bg-white rounded-xl p-4 border border-gray-200/70 shadow-sm">
                                                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                                                                            <span className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">Deductions Breakdown</span>
                                                                            <span className="text-red-500 font-bold">- {fmt(r.totalDeductions)}</span>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            {deductions.length === 0 ? (
                                                                                <p className="text-gray-400 italic">No deductions applied</p>
                                                                            ) : (
                                                                                deductions.map((c, i) => (
                                                                                    <div key={i} className="flex justify-between text-gray-600">
                                                                                        <span>{c.name}</span>
                                                                                        <span className="font-medium text-red-500">- {fmt(c.amount)}</span>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Approval & Footer Info */}
                                                                <div className="mt-3 pt-3 border-t border-gray-200/70 flex flex-wrap items-center justify-between gap-2 text-gray-500 text-[11px]">
                                                                    <div className="flex items-center gap-3">
                                                                        {r.approvedBy && (
                                                                            <span>Approved by: <strong className="text-gray-700">{r.approvedBy.firstName} {r.approvedBy.lastName}</strong></span>
                                                                        )}
                                                                        {r.approvedAt && (
                                                                            <span>on {new Date(r.approvedAt).toLocaleDateString("en-IN")}</span>
                                                                        )}
                                                                        {r.paidAt && (
                                                                            <span>• Paid on: {new Date(r.paidAt).toLocaleDateString("en-IN")}</span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setActivePayslipRun(r)}
                                                                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                                                    >
                                                                        <FileText size={12} /> Print Full Salary Slip
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
                        <p className="text-xs text-gray-500">
                            Showing <strong className="text-gray-700">{filteredRuns.length}</strong> of <strong className="text-gray-700">{runs.length}</strong> total payroll months
                        </p>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-semibold transition"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>

            {activePayslipRun && (
                <PayslipPrint 
                    run={activePayslipRun} 
                    company={company} 
                    onClose={() => setActivePayslipRun(null)} 
                />
            )}
        </>
    );
};

export default EmployeePayrollHistoryModal;
