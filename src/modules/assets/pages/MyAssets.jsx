import React, { useState, useEffect } from 'react';
import { assetService } from '../../../services/assetService';
import { toast } from 'react-toastify';
import { Monitor, Cpu, Hash, Info } from 'lucide-react';

const MyAssets = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyAssets();
    }, []);

    const fetchMyAssets = async () => {
        setLoading(true);
        try {
            const data = await assetService.getMyAssets();
            if (data.success) {
                setAssets(data.assets);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch your assets');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                <h1 className="text-2xl font-bold tracking-tight">My Assigned Assets</h1>
                <p className="text-blue-100 mt-1">Here is a list of all company hardware and software assigned to you.</p>
            </div>

            <div className="flex-1">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
                        <Monitor className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700">No Assets Assigned</h3>
                        <p className="text-gray-500 mt-1 max-w-sm">You currently do not have any company assets assigned to you. If you think this is a mistake, contact your HR or IT admin.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map((asset) => (
                            <div key={asset._id} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{asset.name}</h3>
                                        <span className="inline-block mt-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-blue-100">
                                            {asset.type}
                                        </span>
                                    </div>
                                    <div className="bg-indigo-50 p-2.5 rounded-xl">
                                        <Cpu className="w-6 h-6 text-indigo-600" />
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mt-5">
                                    <div className="flex items-start gap-3">
                                        <Hash className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">Serial Number / IMEI</p>
                                            <p className="text-sm text-gray-800 font-medium">{asset.serialNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">Description</p>
                                            <p className="text-sm text-gray-800">{asset.description || 'No description provided.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAssets;
