import React, { useState, useEffect } from 'react';
import { assetService } from '../../../services/assetService';
import { assetTypeService } from '../../../services/assetTypeService';
import { ENDPOINTS } from '../../../services/endpoints';
import api from '../../../services/axios';
import { Plus, Edit, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import CrudModal from '../../../Components/CrudModal';

const Assets = () => {
    const [assets, setAssets] = useState([]);
    const [users, setUsers] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    
    const [currentAsset, setCurrentAsset] = useState(null);

    useEffect(() => {
        fetchAssets();
        fetchUsers();
        fetchAssetTypes();
    }, []);

    const fetchAssetTypes = async () => {
        try {
            const res = await assetTypeService.getAssetTypes();
            if (res.success) setAssetTypes(res.assetTypes || []);
        } catch (error) {
            console.error('Failed to fetch asset types', error);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const data = await assetService.getAssets();
            if (data.success) {
                setAssets(data.assets);
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
                setUsers(res.data.users);
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
                const res = await assetService.createAsset(formData);
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

    return (
        <div className="p-6 h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Company Assets</h1>
                    <p className="text-sm text-gray-500">Manage all hardware and software assets</p>
                </div>
                <button 
                    onClick={() => handleOpenAssetModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={18} /> Add New Asset
                </button>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Serial No.</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Assigned To</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading assets...</td>
                                </tr>
                            ) : assets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No assets found. Create one to get started!</td>
                                </tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-800">{asset.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{asset.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                                                {asset.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{asset.serialNumber || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                asset.status === 'Available' ? 'bg-green-100 text-green-700' :
                                                asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {asset.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                        {asset.assignedTo.firstName[0]}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">Not Assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 flex items-center justify-end gap-3">
                                            {asset.status === 'Available' ? (
                                                <button onClick={() => handleOpenAssignModal(asset)} className="text-blue-500 hover:text-blue-700 p-1" title="Assign to Employee">
                                                    <UserPlus size={18} />
                                                </button>
                                            ) : asset.status === 'Assigned' ? (
                                                <button onClick={() => handleUnassignAsset(asset._id)} className="text-orange-500 hover:text-orange-700 p-1" title="Unassign">
                                                    <UserMinus size={18} />
                                                </button>
                                            ) : null}
                                            
                                            <button onClick={() => handleOpenAssetModal(asset)} className="text-gray-400 hover:text-gray-600 p-1" title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteAsset(asset._id)} className="text-red-400 hover:text-red-600 p-1" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CrudModal
                isOpen={isAssetModalOpen}
                onClose={() => setIsAssetModalOpen(false)}
                title={currentAsset ? 'Edit Asset' : 'Add New Asset'}
                onSubmit={handleSaveAsset}
                loading={loading}
                initialData={currentAsset ? {
                    name: currentAsset.name,
                    type: currentAsset.type,
                    serialNumber: currentAsset.serialNumber,
                    description: currentAsset.description
                } : {}}
                fields={[
                    { name: "name", label: "Asset Name", type: "text" },
                    { 
                        name: "type", 
                        label: "Asset Type", 
                        type: "select", 
                        options: assetTypes.map(t => ({ value: t.name, label: t.name }))
                    },
                    { name: "serialNumber", label: "Serial Number / IMEI", type: "text" },
                    { name: "description", label: "Description / Notes", type: "text", fullWidth: true }
                ]}
            />

            <CrudModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title={`Assign ${currentAsset?.name}`}
                onSubmit={handleAssignAsset}
                loading={loading}
                initialData={{ userId: currentAsset?.assignedTo?._id || '' }}
                fields={[
                    { 
                        name: "userId", 
                        label: "Select Employee", 
                        type: "select", 
                        fullWidth: true,
                        options: users.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.email})` })) 
                    }
                ]}
            />

        </div>
    );
};

export default Assets;
