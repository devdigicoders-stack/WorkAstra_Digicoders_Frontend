import React, { useState, useEffect } from 'react';
import { assetTypeService } from '../../../services/assetTypeService';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Plus, Edit, Trash2, HardDrive } from 'lucide-react';
import CrudModal from '../../../Components/CrudModal';

const AssetTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentType, setCurrentType] = useState(null);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await assetTypeService.getAssetTypes();
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
            if (currentType) {
                const res = await assetTypeService.updateAssetType(currentType._id, formData);
                if (res.success) {
                    toast.success("Asset type updated successfully");
                    fetchTypes();
                    setIsModalOpen(false);
                }
            } else {
                const res = await assetTypeService.createAssetType(formData);
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

    return (
        <div className="p-6 h-full flex flex-col space-y-6 bg-gray-50">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <HardDrive size={24} className="text-blue-600" />
                        Asset Types
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage dynamic asset types for your organization</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus size={18} /> Add Asset Type
                </button>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Asset Type Name</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Description</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Loading asset types...</td>
                                </tr>
                            ) : types.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No asset types found. Create one!</td>
                                </tr>
                            ) : (
                                types.map((type) => (
                                    <tr key={type._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-800">{type.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {type.description || <span className="text-gray-400 italic">No description</span>}
                                        </td>
                                        <td className="px-6 py-4 flex items-center justify-end gap-3">
                                            <button onClick={() => handleOpenModal(type)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(type._id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={16} />
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
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentType ? 'Edit Asset Type' : 'Add Asset Type'}
                onSubmit={handleSubmit}
                initialData={currentType ? {
                    name: currentType.name,
                    description: currentType.description
                } : {}}
                fields={[
                    { name: "name", label: "Asset Type Name (e.g. Laptop, Monitor)", type: "text" },
                    { name: "description", label: "Description (Optional)", type: "text", fullWidth: true }
                ]}
            />
        </div>
    );
};

export default AssetTypes;
