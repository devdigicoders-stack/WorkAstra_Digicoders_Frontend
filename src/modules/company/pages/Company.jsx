import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import CrudModal from "../../../Components/CrudModal";
import { Plus, Pencil, Trash2, Building2, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { toast } from "react-toastify";
import Swal from 'sweetalert2';
import {
    fetchAllCompaniesForSuperAdmin, createCompanyWithAdmin,
    updateCompany, updateCompanyWithAdmin, deleteCompany, toggleCompanyStatus, uploadCompanyIcon,
} from "../services/companyService";

const Company = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";

    const [companies, setCompanies] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const iconInputRef = useRef(null);
    const [iconUploadId, setIconUploadId] = useState(null);

    const loadCompanies = async () => {
        try {
            const data = await fetchAllCompaniesForSuperAdmin();
            setCompanies(data.companies || []);
        } catch (err) { console.error(err); }
    };

    const getImageUrl = (url) => {
        if (!url) return "";
        const baseUrl = import.meta.env.VITE_BASE_URL?.replace(/\/$/, '') || "";
        if (url.startsWith("http://localhost:8008")) {
            return url.replace("http://localhost:8008", baseUrl);
        }
        if (url.startsWith("/")) {
            return `${baseUrl}${url}`;
        }
        return url;
    };

    useEffect(() => {
        if (isSuperAdmin) loadCompanies();
    }, [isSuperAdmin]);

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    const fields = [
        { name: "companyName", label: "Company Name", type: "text" },
        { name: "companyAddress", label: "Address", type: "text", fullWidth: true },
        { name: "companyDomain", label: "Domain", type: "text" },
        { name: "adminFirstName", label: "Admin First Name", type: "text" },
        { name: "adminLastName", label: "Admin Last Name", type: "text" },
        { name: "adminEmail", label: "Admin Email", type: "email" },
        { name: "adminPhone", label: "Admin Phone", type: "text" },
        { name: "adminPassword", label: "Admin Password", type: "password" },
    ];

    const getInitialData = (c) => {
        if (!c) return null;
        const admin = c.admins?.[0] || {};
        return {
            companyName: c.name || "", companyAddress: c.address || "", companyDomain: c.domain || "",
            adminFirstName: admin.firstName || "", adminLastName: admin.lastName || "",
            adminEmail: admin.email || "", adminPhone: admin.phone || "", adminPassword: "",
        };
    };

    const handleCreate = async (data) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) return toast.error("Please enter a valid email address.");
        if (!/^\d{10}$/.test(data.adminPhone)) return toast.error("Phone number must be exactly 10 digits.");
        if (!data.adminPassword || data.adminPassword.length < 6) return toast.error("Admin Password must be at least 6 characters long.");

        const toastId = toast.loading("Creating company...");
        try { setLoading(true); await createCompanyWithAdmin(data); await loadCompanies(); setOpen(false); toast.update(toastId, { render: "Company created successfully!", type: "success", isLoading: false, autoClose: 3000 }); }
        catch (err) { toast.update(toastId, { render: err?.response?.data?.message || "Failed to create company.", type: "error", isLoading: false, autoClose: 3000 }); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (data) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) return toast.error("Please enter a valid email address.");
        if (!/^\d{10}$/.test(data.adminPhone)) return toast.error("Phone number must be exactly 10 digits.");
        if (data.adminPassword && data.adminPassword.length < 6) return toast.error("Admin Password must be at least 6 characters long.");

        const toastId = toast.loading("Updating company...");
        try { setLoading(true); await updateCompanyWithAdmin(selected._id, data); await loadCompanies(); setOpen(false); toast.update(toastId, { render: "Company updated successfully!", type: "success", isLoading: false, autoClose: 3000 }); }
        catch (err) { toast.update(toastId, { render: err?.response?.data?.message || "Failed to update company.", type: "error", isLoading: false, autoClose: 3000 }); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });
        
        if (result.isConfirmed) {
            const toastId = toast.loading("Deleting company...");
            try { 
                await deleteCompany(id); 
                await loadCompanies(); 
                toast.update(toastId, { render: "Company deleted successfully!", type: "success", isLoading: false, autoClose: 3000 }); 
            } catch (err) { 
                toast.update(toastId, { render: err?.response?.data?.message || "Failed to delete company.", type: "error", isLoading: false, autoClose: 3000 }); 
            }
        }
    };

    const handleToggle = async (id) => {
        const toastId = toast.loading("Updating status...");
        try { await toggleCompanyStatus(id); await loadCompanies(); toast.update(toastId, { render: "Status updated successfully!", type: "success", isLoading: false, autoClose: 3000 }); } 
        catch (err) { toast.update(toastId, { render: err?.response?.data?.message || "Failed to update status.", type: "error", isLoading: false, autoClose: 3000 }); }
    };

    const handleIconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !iconUploadId) return;
        const toastId = toast.loading("Uploading icon...");
        try {
            await uploadCompanyIcon(iconUploadId, file);
            await loadCompanies();
            toast.update(toastId, { render: "Icon uploaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) { 
            toast.update(toastId, { render: err?.response?.data?.message || "Failed to upload icon.", type: "error", isLoading: false, autoClose: 3000 }); 
        }
        e.target.value = "";
        setIconUploadId(null);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage all registered companies and their admins.</p>
                </div>
                <button
                    onClick={() => { setSelected(null); setOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                    <Plus size={16} /> Add Company
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3 text-left">Company</th>
                            <th className="px-4 py-3 text-left">Domain</th>
                            <th className="px-4 py-3 text-left">Admin</th>
                            <th className="px-4 py-3 text-left">Created By</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {companies.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No companies found.</td></tr>
                        ) : companies.map(c => (
                            <tr key={c._id} className="hover:bg-gray-50/50 transition">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
                                            {c.icon?.url
                                                ? <img src={getImageUrl(c.icon.url)} alt="" className="w-full h-full object-cover" />
                                                : <Building2 size={16} className="text-blue-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{c.name}</p>
                                            <p className="text-xs text-gray-400">{c.address || "—"}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{c.domain || "—"}</td>
                                <td className="px-4 py-3">
                                    {c.admins?.[0] ? (
                                        <div>
                                            <p className="text-gray-800">{c.admins[0].firstName} {c.admins[0].lastName}</p>
                                            <p className="text-xs text-gray-400">{c.admins[0].email}</p>
                                        </div>
                                    ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="text-gray-400">
                                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </p>
                                        {c.updatedBy && <p className="text-gray-400 mt-0.5">Upd: {c.updatedBy.firstName} {c.updatedBy.lastName}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${c.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                                        {c.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleToggle(c._id)}
                                            className={`p-2 rounded-lg text-xs transition ${c.status ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                                            title={c.status ? "Deactivate" : "Activate"}>
                                            {c.status ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        </button>
                                        <button onClick={() => { setSelected(c); setOpen(true); }}
                                            className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition">
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => { setIconUploadId(c._id); iconInputRef.current?.click(); }}
                                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                                            title="Upload Icon">
                                            <Upload size={15} />
                                        </button>
                                        <button onClick={() => handleDelete(c._id)}
                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
            <CrudModal
                isOpen={open} onClose={() => setOpen(false)}
                title={selected ? "Edit Company" : "Add Company with Admin"}
                fields={fields} initialData={getInitialData(selected)}
                onSubmit={selected ? handleUpdate : handleCreate}
                loading={loading}
            />
        </div>
    );
};

export default Company;
