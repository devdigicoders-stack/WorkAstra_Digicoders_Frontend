import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Building2, UserCircle, Plus, X } from "lucide-react";
import ClientDrawer from "../components/ClientDrawer";
import { fetchClients, createUser, fetchUsers } from "../../employee/services/UserService";
import { fetchRoles, getAllRolesForAdmin, getRolesByCompany } from "../../roles/service/RoleService";
import { fetchAllCompaniesList } from "../../company/services/companyService";
import { getShiftsByCompany } from "../../workshift/services/workShiftService";
import { getStatusesByCompany } from "../../employmentStatus/services/employmentStatusService";
import { getDepartmentsByCompany } from "../../department/services/departmentService";
import { useStore } from "../../../context/StoreContext";
import { toast } from "react-toastify";
import { getImageUrl } from "../../../utils/imageUtils";

const StatCard = ({ icon, label, value, iconBg, iconColor }) => (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const ClientDirectory = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const permissions = user?.role?.permissions || [];
    const hasPermission = (perm) => permissions.includes(perm);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    const [open, setOpen] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [roles, setRoles] = useState([]);
    const [modalRoles, setModalRoles] = useState([]);
    const [modalShifts, setModalShifts] = useState([]);
    const [modalStatuses, setModalStatuses] = useState([]);
    const [modalCompanyUsers, setModalCompanyUsers] = useState([]);
    const [modalDepartments, setModalDepartments] = useState([]);
    const [drawerLoading, setDrawerLoading] = useState(false);

    useEffect(() => {
        loadClients();
        loadRoles();
        loadCompanies();
    }, []);

    const isSuperAdmin = user?.role?.name === "super_admin";

    const loadRoles = async () => {
        try {
            const res = isSuperAdmin ? await getAllRolesForAdmin() : await fetchRoles();
            setRoles(res.data || []);
        } catch (err) { console.error(err); }
    };

    const loadCompanies = async () => {
        try {
            const data = await fetchAllCompaniesList();
            setCompanies(data.companies || []);
        } catch (err) { console.error(err); }
    };

    const handleFieldChange = async (name, value, formData) => {
        if (name === "companyId") {
            try {
                const [rolesRes, shiftsRes, statusesRes, usersRes, deptsRes] = await Promise.all([
                    getRolesByCompany(value),
                    getShiftsByCompany(value),
                    getStatusesByCompany(value),
                    fetchUsers(),
                    getDepartmentsByCompany(value),
                ]);
                setModalRoles(rolesRes.data || []);
                setModalShifts(shiftsRes.data || []);
                setModalStatuses(statusesRes.employmentStatuses || []);
                setModalCompanyUsers((usersRes.users || []).filter(u => u.companyId?._id === value || u.companyId === value));
                setModalDepartments(deptsRes.departments || []);
                return { ...formData, companyId: value, role: "", workShift: "", reportingTo: "", employmentStatus: "", department: "" };
            } catch (err) {
                console.error(err);
            }
        }
        return { ...formData, [name]: value };
    };

    const handleCreate = async (data) => {
        if (!hasPermission("Create_USER")) return;
        try {
            setDrawerLoading(true);
            let payload = data;
            if (data.finalProposal instanceof File) {
                payload = new FormData();
                Object.keys(data).forEach(key => {
                    if (data[key] !== undefined && data[key] !== null) {
                        payload.append(key, data[key]);
                    }
                });
            }
            const res = await createUser(payload);
            if (res.success) {
                toast.success(res.message || "Client created successfully");
                loadClients();
                setOpen(false);
            } else {
                const errorMsg = Array.isArray(res.errors) ? res.errors.join(", ") : res.message;
                toast.error(errorMsg || "Failed to create client");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Failed to create client");
        } finally {
            setDrawerLoading(false);
        }
    };

    const loadClients = async () => {
        try {
            setLoading(true);
            const res = await fetchClients();
            if (res.success) {
                setClients(res.users);
            }
        } catch (error) {
            console.error("Error loading clients:", error);
            toast.error("Failed to load clients");
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.companyId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-3 sm:p-6 md:p-8 w-full space-y-4 sm:space-y-6 md:space-y-8 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Clients Directory</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage and view all your clients</p>
                </div>
                {hasPermission("Create_USER") && (
                    <button
                        onClick={() => setOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm shadow-indigo-200 cursor-pointer"
                    >
                        <Plus size={18} />
                        <span>Add Client</span>
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Search & Filters */}
                <div className="p-3 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/50">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search clients by name, email or company..."
                            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-2xs bg-white outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 self-end sm:self-auto font-medium">
                        {filteredClients.length} {filteredClients.length === 1 ? "Client" : "Clients"}
                    </span>
                </div>

                {/* Content: Loading / Empty / Responsive Cards / Desktop Table */}
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">Loading clients...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">No clients found</p>
                        {searchQuery && <p className="text-xs text-gray-400">Try adjusting your search query</p>}
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards View (< md) */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {filteredClients.map((client) => {
                                const avatarUrl = client.profilePic?.url || (typeof client.profilePic === "string" ? client.profilePic : null);
                                return (
                                    <div key={client._id} className="p-4 hover:bg-indigo-50/20 transition flex flex-col gap-3">
                                        {/* Row 1: Avatar, Name, Status */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {avatarUrl ? (
                                                    <img src={getImageUrl(avatarUrl)} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                                        {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                                        {client.firstName} {client.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{client.role?.name || "Client"}</p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                client.status === "active" ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                                            }`}>
                                                {client.status?.toUpperCase() || "ACTIVE"}
                                            </span>
                                        </div>

                                        {/* Row 2: Contact & Company Box */}
                                        <div className="bg-gray-50/80 rounded-xl p-3 text-xs text-gray-600 space-y-1.5 border border-gray-100">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-gray-400">Email:</span>
                                                <span className="font-medium text-gray-800 truncate">{client.email || "—"}</span>
                                            </div>
                                            {client.phone && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-gray-400">Phone:</span>
                                                    <span className="font-medium text-gray-800">{client.phone}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-gray-400">Company:</span>
                                                <span className="font-medium text-gray-800 inline-flex items-center gap-1 truncate">
                                                    <Building2 size={12} className="text-gray-400 shrink-0" />
                                                    {client.companyId?.name || "N/A"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 3: Action */}
                                        <button 
                                            onClick={() => navigate(`/users/${client._id}`)}
                                            className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                        >
                                            <UserCircle size={15} /> View Profile
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 font-semibold text-gray-600 text-sm tracking-wider uppercase">Client</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm tracking-wider uppercase">Contact</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm tracking-wider uppercase">Company</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm tracking-wider uppercase">Status</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm tracking-wider uppercase text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredClients.map((client) => {
                                        const avatarUrl = client.profilePic?.url || (typeof client.profilePic === "string" ? client.profilePic : null);
                                        return (
                                            <tr key={client._id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {avatarUrl ? (
                                                            <img src={getImageUrl(avatarUrl)} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm">
                                                                {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                                {client.firstName} {client.lastName}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{client.role?.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-gray-700 font-medium">{client.email}</p>
                                                    <p className="text-xs text-gray-500">{client.phone || "No phone"}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <Building2 size={16} className="text-gray-400" />
                                                        {client.companyId?.name || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        client.status === "active" ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                                                    }`}>
                                                        {client.status?.toUpperCase() || "ACTIVE"}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => navigate(`/users/${client._id}`)}
                                                        className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 ml-auto cursor-pointer"
                                                    >
                                                        <UserCircle size={16} /> View Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <ClientDrawer
                isOpen={open}
                onClose={() => setOpen(false)}
                initialData={null}
                companies={companies}
                roles={modalRoles}
                onSubmit={handleCreate}
                onCompanyChange={handleFieldChange}
                loading={drawerLoading}
            />
        </div>
    );
};

export default ClientDirectory;
