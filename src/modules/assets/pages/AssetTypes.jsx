import React, { useState, useEffect } from 'react';
import { assetTypeService } from '../../../services/assetTypeService';
import { fetchAllCompaniesList } from '../../company/services/companyService';
import { useStore } from '../../../context/StoreContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Plus, Edit, Trash2, HardDrive, Building2, Search } from 'lucide-react';
import CrudModal from '../../../Components/CrudModal';

const AssetTypes = () => {
    const { user } = useStore();
    const isSuperAdmin = (user?.role?.name || user?.role || "").toString().toLowerCase() === "super_admin";

    const [types, setTypes] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentType, setCurrentType] = useState(null);

    // Load companies for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchTypes();
    }, [user, selectedCompany]);

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await assetTypeService.getAssetTypes(isSuperAdmin ? selectedCompany : "");
            if (res.success) setTypes(res.assetTypes || []);
        } catch (error) {
            toast.error("Failed to load asset types");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (type = null) => {
        setCurrentType(type);
        setIsModalOpen(true);
    };

    const handleSubmit = async (formData) => {
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                ...(isSuperAdmin && formData.companyId !== undefined ? { companyId: formData.companyId } : {})
            };

            if (currentType) {
                const res = await assetTypeService.updateAssetType(currentType._id, payload);
                if (res.success) {
                    toast.success("Asset type updated successfully");
                    fetchTypes();
                    setIsModalOpen(false);
                }
            } else {
                const res = await assetTypeService.createAssetType(payload);
                if (res.success) {
                    toast.success("Asset type created successfully");
                    fetchTypes();
                    setIsModalOpen(false);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will delete the asset type. It will be rejected if assets are using this type.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await assetTypeService.deleteAssetType(id);
                if (res.success) {
                    toast.success("Asset type deleted");
                    fetchTypes();
                }
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to delete");
            }
        }
    };

    const filteredTypes = types.filter(t => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const nameMatch = t.name?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        const compMatch = t.companyId?.name?.toLowerCase().includes(q);
        return nameMatch || descMatch || compMatch;
    });

    const modalFields = [
        ...(isSuperAdmin ? [{
            name: "companyId",
            label: "Company (Select or leave for Global)",
            type: "select",
            options: [
                { value: "", label: "🌐 Global / All Companies" },
                ...companies.map(c => ({ value: c._id, label: c.name }))
            ]
        }] : []),
        { name: "name", label: "Asset Type Name (e.g. Laptop, Monitor)", type: "text" },
        { name: "description", label: "Description (Optional)", type: "text", fullWidth: true }
    ];

    const modalInitialData = currentType ? {
        name: currentType.name,
        description: currentType.description,
        companyId: currentType.companyId?._id || currentType.companyId || ""
    } : {
        companyId: selectedCompany && selectedCompany !== "all" && selectedCompany !== "global" ? selectedCompany : ""
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 bg-gray-50">
            {/* Header & Controls */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <HardDrive size={22} />
                        </div>
                        Asset Types
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage dynamic asset types for your {isSuperAdmin ? "platform and companies" : "organization"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Super Admin Company Filter */}
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                            <Building2 size={16} className="text-blue-600 shrink-0" />
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer pr-2"
                            >
                                <option value="">All Companies & Global</option>
                                <option value="global">🌐 Global Types Only</option>
                                {companies.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        🏢 {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search asset types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none w-48 sm:w-56 transition-all"
                        />
                    </div>

                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={18} /> Add Asset Type
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/75 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset Type Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                {isSuperAdmin && (
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                                )}
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 4 : 3} className="px-6 py-12 text-center text-gray-400">
                                        Loading asset types...
                                    </td>
                                </tr>
                            ) : filteredTypes.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 4 : 3} className="px-6 py-12 text-center text-gray-400">
                                        No asset types found. Click "Add Asset Type" to create one!
                                    </td>
                                </tr>
                            ) : (
                                filteredTypes.map((type) => {
                                    const isGlobal = !type.companyId;
                                    const canModify = isSuperAdmin || !isGlobal;

                                    return (
                                        <tr key={type._id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-800">{type.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {type.description || <span className="text-gray-400 italic">No description</span>}
                                            </td>
                                            {isSuperAdmin && (
                                                <td className="px-6 py-4">
                                                    {type.companyId?.name ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                            <Building2 size={12} />
                                                            {type.companyId.name}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                            🌐 Global / All Companies
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                {canModify ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleOpenModal(type)} 
                                                            className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" 
                                                            title="Edit"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(type._id)} 
                                                            className="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" 
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Global (Read-Only)</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CrudModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentType ? 'Edit Asset Type' : 'Add Asset Type'}
                onSubmit={handleSubmit}
                initialData={modalInitialData}
                fields={modalFields}
            />
        </div>
    );
};

export default AssetTypes;
