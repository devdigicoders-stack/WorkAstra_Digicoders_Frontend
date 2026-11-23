import React, { useEffect, useState } from "react";
import CrudModal from "../../../Components/CrudModal";
import { Plus, Pencil, Trash2, FolderKanban, ToggleLeft, ToggleRight, Search, Building2, X } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { getAllCompanyDepartments, createDepartment, updateDepartment, deleteDepartment, toggleDepartmentStatus } from "../services/departmentService";
import { fetchAllCompaniesList } from "../../company/services/companyService";

const Department = () => {
    const { user } = useStore();
    const permissions = user?.role?.permissions || [];
    const hasPermission = (perm) => permissions.includes(perm);

    const [departments, setDepartments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [companyFilter, setCompanyFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const res = await getAllCompanyDepartments();
            setDepartments(res?.departments || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadCompanies = async () => {
        try {
            const data = await fetchAllCompaniesList();
            setCompanies(data.companies || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { loadDepartments(); loadCompanies(); }, []);

    const fields = [
        {
            name: "companyId", label: "Company", type: "select", required: true,
            options: companies.map((c) => ({ label: c.name, value: c._id })),
        },
        { name: "name", label: "Department Name", type: "text" },
        { name: "description", label: "Description", type: "text" },
    ];

    const getInitialData = (dept) => {
        if (!dept) return { companyId: user.companyId?._id || "" };
        return { companyId: dept.companyId?._id || user.companyId?._id || "", name: dept.name, description: dept.description };
    };

    const handleCreate = async (data) => {
        if (!hasPermission("Create_DEPARTMENT")) return;
        try { setLoading(true); await createDepartment(data); await loadDepartments(); setOpen(false); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        if (!hasPermission("UPDATE_DEPARTMENT")) return;
        try { setLoading(true); await updateDepartment(selected._id, data); await loadDepartments(); setOpen(false); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!hasPermission("DELETE_DEPARTMENT")) return;
        try { await deleteDepartment(id); loadDepartments(); } catch (err) { console.error(err); }
    };

    const handleToggle = async (id) => {
        if (!hasPermission("UPDATE_DEPARTMENT")) return;
        try { await toggleDepartmentStatus(id); loadDepartments(); } catch (err) { console.error(err); }
    };

    const filteredDepartments = departments.filter((dept) => {
        const compId = dept.companyId?._id || dept.companyId;
        const matchesCompany = !companyFilter || compId === companyFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            dept.name?.toLowerCase().includes(q) ||
            dept.description?.toLowerCase().includes(q) ||
            dept.companyId?.name?.toLowerCase().includes(q);
        return matchesCompany && matchesSearch;
    });

    return (
        <div className="p-3 sm:p-6 bg-gray-50 min-h-screen max-w-full overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Departments</h1>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Manage departments across your organization.</p>
                </div>
                {hasPermission("Create_DEPARTMENT") && (
                    <button
                        onClick={() => { setSelected(null); setOpen(true); }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
                    >
                        <Plus size={16} /> <span>Add Department</span>
                    </button>
                )}
            </div>

            {/* Company & Search Filters Bar */}
            <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 mb-5 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center flex-1">
                    {/* Live Search Input */}
                    <div className="relative flex-1 w-full max-w-none sm:max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search departments..."
                            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Company Filter Dropdown */}
                    <div className="relative w-full sm:w-auto min-w-[200px]">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none cursor-pointer shadow-2xs"
                        >
                            <option value="">All Companies ({companies.length})</option>
                            {companies.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                    </div>

                    {/* Reset Button */}
                    {(companyFilter || searchQuery) && (
                        <button
                            onClick={() => { setCompanyFilter(""); setSearchQuery(""); }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                            <X size={13} /> Reset Filters
                        </button>
                    )}
                </div>

                <div className="text-xs font-medium text-gray-500 shrink-0 text-center sm:text-left">
                    Showing <span className="text-gray-900 font-semibold">{filteredDepartments.length}</span> of {departments.length} departments
                </div>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl overflow-x-auto shadow-2xs">
                <table className="w-full text-sm min-w-[680px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left whitespace-nowrap">Department</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Company</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Description</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Created By</th>
                            <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!loading && filteredDepartments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                    {searchQuery || companyFilter ? "No departments match your filters." : "No departments found."}
                                </td>
                            </tr>
                        ) : filteredDepartments.map((dept) => (
                            <tr key={dept._id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                            <FolderKanban size={16} />
                                        </div>
                                        <p className="font-medium text-gray-800">{dept.name}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{dept.companyId?.name || "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{dept.description || "—"}</td>
                                <td className="px-4 py-3 text-xs">
                                    <div>
                                        <p className="font-medium text-gray-700">
                                            {dept.createdBy ? `${dept.createdBy.firstName} ${dept.createdBy.lastName}` : "System"}
                                        </p>
                                        <p className="text-gray-400">
                                            {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </p>
                                        {dept.updatedBy && <p className="text-gray-400 mt-0.5">Upd: {dept.updatedBy.firstName} {dept.updatedBy.lastName}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${dept.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {dept.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        {hasPermission("UPDATE_DEPARTMENT") && (
                                            <>
                                                <button onClick={() => handleToggle(dept._id)}
                                                    className={`p-2 rounded-lg transition ${dept.status ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                                                    title={dept.status ? "Deactivate" : "Activate"}>
                                                    {dept.status ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                </button>
                                                <button onClick={() => { setSelected(dept); setOpen(true); }}
                                                    className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                                    <Pencil size={15} />
                                                </button>
                                            </>
                                        )}
                                        {hasPermission("DELETE_DEPARTMENT") && (
                                            <button onClick={() => handleDelete(dept._id)}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CrudModal
                isOpen={open} onClose={() => setOpen(false)}
                title={selected ? "Edit Department" : "Add Department"}
                fields={fields} initialData={getInitialData(selected)}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
        </div>
    );
};

export default Department;
