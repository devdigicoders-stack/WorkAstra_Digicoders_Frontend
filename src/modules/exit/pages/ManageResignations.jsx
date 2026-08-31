import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resignationService } from '../../../services/resignationService';
import { toast } from 'react-toastify';
import { LogOut, Search, Filter, CheckCircle, Clock, CheckSquare, Plus, Edit, Trash2, RotateCcw, Eye, CalendarClock, FileText, User, ShieldCheck, Check, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import api from '../../../services/axios';
import { ENDPOINTS } from '../../../services/endpoints';

const ManageResignations = () => {
    const [resignations, setResignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Modal state for Clearance
    const [selectedResignation, setSelectedResignation] = useState(null);
    const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
    
    // Modal state for Admin Add Exit
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [exitReason, setExitReason] = useState("");
    const [approvedLastWorkingDay, setApprovedLastWorkingDay] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchResignations();
        fetchEmployees();
    }, []);

    const fetchResignations = async () => {
        setLoading(true);
        try {
            const data = await resignationService.getAllResignations();
            if (data.success) {
                setResignations(data.resignations);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch resignations');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get(ENDPOINTS.USER.GET_ALL);
            if (response.data.success) {
                // Filter out inactive users if needed, or keep all
                setEmployees(response.data.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const handleClearanceClick = (resignation) => {
        setSelectedResignation(resignation);
        setIsClearanceModalOpen(true);
    };

    const submitClearance = async () => {
        setActionLoading(true);
        try {
            const res = await resignationService.processClearance(selectedResignation._id);
            if (res.success) {
                toast.success(res.message);
                fetchResignations();
            }
            setIsClearanceModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Clearance failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditClick = (resignation) => {
        setSelectedResignation(resignation);
        setExitReason(resignation.reason || "");
        setApprovedLastWorkingDay(resignation.approvedLastWorkingDay ? new Date(resignation.approvedLastWorkingDay) : null);
        setIsEditModalOpen(true);
    };

    const handleRevokeClick = (resignation) => {
        setSelectedResignation(resignation);
        setIsRevokeModalOpen(true);
    };

    const handleRestoreClick = (resignation) => {
        setSelectedResignation(resignation);
        setIsRestoreModalOpen(true);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                reason: exitReason,
                approvedLastWorkingDay: approvedLastWorkingDay
            };
            const res = await resignationService.updateResignationStatus(selectedResignation._id, payload);
            if (res.success) {
                toast.success("Exit record updated successfully.");
                setIsEditModalOpen(false);
                fetchResignations();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update exit record');
        } finally {
            setActionLoading(false);
        }
    };

    const submitRevoke = async () => {
        setActionLoading(true);
        try {
            const res = await resignationService.deleteResignation(selectedResignation._id);
            if (res.success) {
                toast.success("Exit record revoked successfully.");
                setIsRevokeModalOpen(false);
                fetchResignations();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to revoke exit record');
        } finally {
            setActionLoading(false);
        }
    };

    const submitRestore = async () => {
        setActionLoading(true);
        try {
            const res = await resignationService.restoreEmployee(selectedResignation._id);
            if (res.success) {
                toast.success("Employee restored successfully.");
                setIsRestoreModalOpen(false);
                fetchResignations();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to restore employee');
        } finally {
            setActionLoading(false);
        }
    };

    const submitAdminExit = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId || !approvedLastWorkingDay) {
            toast.error("Employee and Last Working Day are required.");
            return;
        }

        setActionLoading(true);
        try {
            const payload = {
                employeeId: selectedEmployeeId,
                reason: exitReason,
                approvedLastWorkingDay: approvedLastWorkingDay
            };
            const res = await resignationService.adminSubmitExit(payload);
            if (res.success) {
                toast.success("Exit initiated successfully.");
                setIsAddModalOpen(false);
                setExitReason("");
                setSelectedEmployeeId("");
                setApprovedLastWorkingDay(null);
                fetchResignations();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate exit');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredData = resignations.filter(r => {
        const matchesSearch = (r.employeeId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               r.employeeId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "All" || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch(status) {
            case "Approved": return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Approved</span>;
            case "Pending": return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">Pending</span>;
            case "Rejected": return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">Rejected</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">{status}</span>;
        }
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-3 rounded-xl text-red-600">
                            <LogOut size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Manage Exits & Resignations</h1>
                            <p className="text-sm text-gray-500">Initiate and process employee exits</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                            />
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white w-full sm:w-auto"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Approved">Approved</option>
                                <option value="Pending">Pending (Legacy)</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <Plus size={18} /> Initiate Exit
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-4 px-6 font-semibold">Employee</th>
                                <th className="py-4 px-6 font-semibold">Department</th>
                                <th className="py-4 px-6 font-semibold">Notice Period Start Date</th>
                                <th className="py-4 px-6 font-semibold">Final Last Day</th>
                                <th className="py-4 px-6 font-semibold">Reason / Notes</th>
                                <th className="py-4 px-6 font-semibold">Status</th>
                                <th className="py-4 px-6 font-semibold">Clearance</th>
                                <th className="py-4 px-6 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-500">
                                        No exits or resignations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                                                    {item.employeeId?.profilePic?.url ? (
                                                        <img src={item.employeeId.profilePic.url} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{item.employeeId?.firstName?.[0]}{item.employeeId?.lastName?.[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.employeeId?.firstName} {item.employeeId?.lastName}</p>
                                                    <p className="text-xs text-gray-500">{item.employeeId?.employeeCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-gray-900">{item.employeeId?.department?.name || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{item.employeeId?.designation?.name || 'N/A'}</p>
                                        </td>
                                        <td className="py-4 px-6 text-sm">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-'}
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium">
                                            {item.approvedLastWorkingDay ? new Date(item.approvedLastWorkingDay).toLocaleDateString('en-GB') : (item.requestedLastWorkingDay ? new Date(item.requestedLastWorkingDay).toLocaleDateString('en-GB') : '-')}
                                        </td>
                                        <td className="py-4 px-6 text-sm">
                                            <div className="max-w-[150px] truncate" title={item.reason || item.remarks || '-'}>
                                                {item.reason || item.remarks || '-'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="py-4 px-6">
                                            {item.clearanceStatus === "Completed" ? (
                                                <span className="text-emerald-600 flex items-center gap-1 text-sm font-medium"><CheckCircle size={16}/> Cleared</span>
                                            ) : (
                                                <span className="text-amber-500 flex items-center gap-1 text-sm font-medium"><Clock size={16}/> Pending</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => navigate('/manage-resignations/view', { state: { resignation: item } })}
                                                    className="px-2 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center shadow-sm border border-gray-200"
                                                    title="View Record"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                {item.clearanceStatus === "Completed" && (
                                                    <button 
                                                        onClick={() => handleRestoreClick(item)}
                                                        className="px-2 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center shadow-sm border border-emerald-200"
                                                        title="Restore Employee"
                                                    >
                                                        <RotateCcw size={14} /> Restore
                                                    </button>
                                                )}
                                                {item.status === "Approved" && item.clearanceStatus === "Pending" && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleClearanceClick(item)}
                                                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-blue-200"
                                                            title="Process Clearance"
                                                        >
                                                            <CheckSquare size={14} /> Clearance
                                                        </button>
                                                        <button 
                                                            onClick={() => handleEditClick(item)}
                                                            className="px-2 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center shadow-sm border border-gray-200"
                                                            title="Edit Record"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRevokeClick(item)}
                                                            className="px-2 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center shadow-sm border border-red-200"
                                                            title="Revoke/Delete Record"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {/* For legacy pending records if any exist */}
                                                {item.status === "Pending" && (
                                                    <span className="text-xs text-gray-400 italic">Legacy Record</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Exit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
                        <div className="bg-red-600 p-5 text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold">Initiate Employee Exit</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:text-red-200">
                                <LogOut size={20} className="rotate-180" />
                            </button>
                        </div>
                        
                        <form onSubmit={submitAdminExit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Employee <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                    required
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.filter(e => e.isActive).map(emp => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Final Last Working Day <span className="text-red-500">*</span></label>
                                <DatePicker
                                    selected={approvedLastWorkingDay}
                                    onChange={(date) => setApprovedLastWorkingDay(date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Select the exact last working day"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none block"
                                    wrapperClassName="w-full block"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Remarks (Optional)</label>
                                <textarea
                                    value={exitReason}
                                    onChange={(e) => setExitReason(e.target.value)}
                                    rows="3"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                    placeholder="Reason for exit or any remarks for the record..."
                                ></textarea>
                            </div>
                            
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <strong>Note:</strong> Submitting this will automatically mark the exit as "Approved" and move it to the IT Clearance queue. The employee will be notified.
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                                >
                                    {actionLoading ? "Processing..." : "Initiate Exit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Clearance Modal */}
            {isClearanceModalOpen && selectedResignation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 text-white bg-blue-600">
                            <h3 className="text-lg font-bold">Process Exit Clearance</h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm font-semibold text-gray-900">{selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName}</p>
                                <p className="text-xs text-gray-500 mt-1">Final Date: {new Date(selectedResignation.approvedLastWorkingDay || selectedResignation.requestedLastWorkingDay).toLocaleDateString()}</p>
                            </div>

                            <div className="text-sm text-gray-600">
                                <p>Are you sure you want to complete the exit clearance for this employee?</p>
                                <ul className="list-disc pl-5 mt-3 space-y-1 text-red-600 font-medium">
                                    <li>Assets should be collected.</li>
                                    <li>Their account will be deactivated immediately.</li>
                                    <li>They will no longer be able to log in.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button 
                                onClick={() => setIsClearanceModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitClearance}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                {actionLoading ? "Processing..." : "Complete Clearance"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Exit Modal */}
            {isEditModalOpen && selectedResignation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
                        <div className="bg-gray-800 p-5 text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold">Edit Exit Record</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-300 hover:text-white">
                                <LogOut size={20} className="rotate-180" />
                            </button>
                        </div>
                        
                        <form onSubmit={submitEdit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600">
                                    {selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Final Last Working Day <span className="text-red-500">*</span></label>
                                <DatePicker
                                    selected={approvedLastWorkingDay}
                                    onChange={(date) => setApprovedLastWorkingDay(date)}
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-gray-500 outline-none block"
                                    wrapperClassName="w-full block"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Remarks</label>
                                <textarea
                                    value={exitReason}
                                    onChange={(e) => setExitReason(e.target.value)}
                                    rows="3"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-gray-500 outline-none resize-none"
                                ></textarea>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                                >
                                    {actionLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revoke Exit Modal */}
            {isRevokeModalOpen && selectedResignation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 text-white bg-red-600">
                            <h3 className="text-lg font-bold">Revoke Exit Record</h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800">
                                <p className="font-semibold text-sm">Warning: This action cannot be undone.</p>
                                <p className="text-xs mt-1">This will permanently delete the exit record for {selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName}.</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button 
                                onClick={() => setIsRevokeModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitRevoke}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2 bg-red-600 hover:bg-red-700"
                            >
                                {actionLoading ? "Revoking..." : "Yes, Revoke Exit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Employee Modal */}
            {isRestoreModalOpen && selectedResignation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 text-white bg-emerald-600">
                            <h3 className="text-lg font-bold">Restore Employee</h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800">
                                <p className="font-semibold text-sm">You are about to restore this employee.</p>
                                <p className="text-xs mt-1">This will reactivate the account for {selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName} and permanently delete this exit record.</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button 
                                onClick={() => setIsRestoreModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitRestore}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                            >
                                {actionLoading ? "Restoring..." : "Yes, Restore"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageResignations;
