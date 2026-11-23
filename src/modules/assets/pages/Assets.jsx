import React, { useState, useEffect } from 'react';
import { assetService } from '../../../services/assetService';
import { assetTypeService } from '../../../services/assetTypeService';
import { fetchAllCompaniesList } from '../../company/services/companyService';
import { useStore } from '../../../context/StoreContext';
import { ENDPOINTS } from '../../../services/endpoints';
import api from '../../../services/axios';
import { Plus, Edit, Trash2, UserPlus, UserMinus, Building2, Search, Monitor } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import CrudModal from '../../../Components/CrudModal';

const Assets = () => {
    const { user } = useStore();
    const isSuperAdmin = (user?.role?.name || user?.role || "").toString().toLowerCase() === "super_admin";

    const [assets, setAssets] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [companyFilter, setCompanyFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    
    const [currentAsset, setCurrentAsset] = useState(null);

    // Load companies for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchAssets();
        fetchUsers();
        fetchAssetTypes();
    }, [user, companyFilter]);

    const fetchAssetTypes = async () => {
        try {
            const res = await assetTypeService.getAssetTypes(isSuperAdmin ? companyFilter : "");
            if (res.success) setAssetTypes(res.assetTypes || []);
        } catch (error) {
            console.error('Failed to fetch asset types', error);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const compParam = isSuperAdmin ? (companyFilter || "all") : (user?.companyId?._id || user?.companyId || "");
            const data = await assetService.getAssets(compParam);
            if (data.success) {
                setAssets(data.assets || []);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch assets');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            // Re-using axios directly for getting all users
            const res = await api.get(ENDPOINTS.USER.GET_ALL);
            if (res.data.success) {
                setUsers(res.data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const handleOpenAssetModal = (asset = null) => {
        setCurrentAsset(asset);
        setIsAssetModalOpen(true);
    };

    const handleSaveAsset = async (formData) => {
        try {
            if (currentAsset) {
                const res = await assetService.updateAsset(currentAsset._id, formData);
                if (res.success) toast.success('Asset updated successfully');
            } else {
                const payload = {
                    ...formData,
                    companyId: isSuperAdmin ? (formData.companyId || companyFilter || null) : (user?.companyId?._id || user?.companyId)
                };
                const res = await assetService.createAsset(payload);
                if (res.success) toast.success('Asset created successfully');
            }
            setIsAssetModalOpen(false);
            fetchAssets();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving asset');
        }
    };

    const handleDeleteAsset = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await assetService.deleteAsset(id);
                if (res.success) {
                    toast.success('Asset deleted successfully');
                    fetchAssets();
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error deleting asset');
            }
        }
    };

    const handleOpenAssignModal = (asset) => {
        setCurrentAsset(asset);
        setIsAssignModalOpen(true);
    };

    const handleAssignAsset = async (formData) => {
        try {
            const res = await assetService.assignAsset(currentAsset._id, formData.userId);
            if (res.success) {
                toast.success('Asset assigned successfully');
                setIsAssignModalOpen(false);
                fetchAssets();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning asset');
        }
    };

    const handleUnassignAsset = async (id) => {
        const result = await Swal.fire({
            title: 'Unassign Asset?',
            text: "Are you sure you want to unassign this asset from the employee?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f97316',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Unassign'
        });

        if (result.isConfirmed) {
            try {
                const res = await assetService.unassignAsset(id);
                if (res.success) {
                    toast.success('Asset unassigned successfully');
                    fetchAssets();
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error unassigning asset');
            }
        }
    };

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = !searchQuery || 
            asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.type?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCompany = !isSuperAdmin || !companyFilter || companyFilter === "all" || (
            (typeof asset.companyId === 'object' ? asset.companyId?._id : asset.companyId) === companyFilter
        );
        return matchesSearch && matchesCompany;
    });

    const assignableUsers = users.filter(u => {
        if (!currentAsset) return true;
        const assetCompId = typeof currentAsset.companyId === 'object' ? currentAsset.companyId?._id : currentAsset.companyId;
        if (!assetCompId) return true;
        const userCompId = typeof u.companyId === 'object' ? u.companyId?._id : u.companyId;
        return !userCompId || userCompId === assetCompId;
    });

    return (
        <div className="p-3 sm:p-6 lg:p-8 min-h-screen max-w-full overflow-x-hidden flex flex-col space-y-4 sm:space-y-6 bg-gray-50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xs border border-gray-100">
                <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <Monitor size={22} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Company Assets</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage all hardware and software assets across your organization</p>
                    </div>
                </div>
                <button 
                    onClick={() => handleOpenAssetModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer shrink-0"
                >
                    <Plus size={16} /> <span>Add New Asset</span>
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
                <div className="relative w-full md:w-80">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by asset name, type, serial..."
                        className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white transition shadow-2xs"
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
                    {/* Company Filter for Super Admin */}
                    {isSuperAdmin && companies.length > 0 && (
                        <div className="relative w-full sm:w-auto min-w-[200px]">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium text-gray-700 shadow-2xs"
                                title="Filter by Company"
                            >
                                <option value="">All Companies ({companies.length})</option>
                                {companies.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 font-medium whitespace-nowrap bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-center sm:text-left">
                        Total: <span className="font-bold text-gray-800">{filteredAssets.length}</span> {filteredAssets.length === 1 ? "Asset" : "Assets"}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left min-w-[760px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                                {isSuperAdmin && (
                                    <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Company</th>
                                )}
                                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Serial No.</th>
                                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Assigned To</th>
                                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                        Loading assets...
                                    </td>
                                </tr>
                            ) : filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-400">
                                        <Monitor size={40} className="mx-auto text-gray-200 mb-2" />
                                        No assets found{companyFilter ? " for this company" : ""}.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => (
                                    <tr key={asset._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                                            <p className="font-semibold text-gray-800">{asset.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{asset.description || '-'}</p>
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    asset.companyId?.name
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {asset.companyId?.name || "Global / Unassigned"}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                                            <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                                                {asset.type}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3.5 text-sm text-gray-600 font-mono text-xs whitespace-nowrap">{asset.serialNumber || '-'}</td>
                                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                asset.status === 'Available' ? 'bg-green-100 text-green-700' :
                                                asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                                                asset.status === 'In Repair' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                                            {asset.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {asset.assignedTo.firstName?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-800 block leading-tight">
                                                            {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{asset.assignedTo.email}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Not Assigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                {asset.status === 'Available' ? (
                                                    <button 
                                                        onClick={() => handleOpenAssignModal(asset)} 
                                                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition active:scale-95 cursor-pointer" 
                                                        title="Assign to Employee"
                                                    >
                                                        <UserPlus size={16} />
                                                    </button>
                                                ) : asset.status === 'Assigned' ? (
                                                    <button 
                                                        onClick={() => handleUnassignAsset(asset._id)} 
                                                        className="text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition active:scale-95 cursor-pointer" 
                                                        title="Unassign Asset"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                ) : null}
                                                
                                                <button 
                                                    onClick={() => handleOpenAssetModal(asset)} 
                                                    className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition active:scale-95 cursor-pointer" 
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteAsset(asset._id)} 
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition active:scale-95 cursor-pointer" 
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Asset Modal */}
            <CrudModal
                isOpen={isAssetModalOpen}
                onClose={() => setIsAssetModalOpen(false)}
                title={currentAsset ? 'Edit Asset' : 'Add New Asset'}
                onSubmit={handleSaveAsset}
                loading={loading}
                initialData={currentAsset ? {
                    name: currentAsset.name,
                    companyId: currentAsset.companyId?._id || currentAsset.companyId || '',
                    type: currentAsset.type,
                    serialNumber: currentAsset.serialNumber,
                    description: currentAsset.description
                } : {
                    companyId: companyFilter || ''
                }}
                fields={[
                    { name: "name", label: "Asset Name", type: "text", required: true },
                    ...(isSuperAdmin ? [{
                        name: "companyId",
                        label: "Company",
                        type: "select",
                        searchable: true,
                        placeholder: "Search company...",
                        options: companies.map(c => ({ value: c._id, label: c.name }))
                    }] : []),
                    { 
                        name: "type", 
                        label: "Asset Type", 
                        type: "select", 
                        searchable: true,
                        placeholder: "Search asset type...",
                        options: assetTypes.map(t => ({ value: t.name, label: t.name }))
                    },
                    { name: "serialNumber", label: "Serial Number / IMEI", type: "text" },
                    { name: "description", label: "Description / Notes", type: "text", fullWidth: true }
                ]}
            />

            {/* Assign Asset Modal */}
            <CrudModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title={`Assign ${currentAsset?.name || 'Asset'}`}
                onSubmit={handleAssignAsset}
                loading={loading}
                initialData={{ userId: currentAsset?.assignedTo?._id || '' }}
                fields={[
                    { 
                        name: "userId", 
                        label: "Select Employee", 
                        type: "select", 
                        searchable: true,
                        placeholder: "Type employee name or email to search...",
                        fullWidth: true,
                        options: assignableUsers.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.email})` })) 
                    }
                ]}
            />

        </div>
    );
};

export default Assets;
