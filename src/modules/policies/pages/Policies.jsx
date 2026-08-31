import React, { useEffect, useState } from 'react';
import { getAllPolicies } from '../../../services/policyService';
import { useStore } from '../../../context/StoreContext';
import { FileText, ChevronDown, ChevronRight, File } from 'lucide-react';
import { toast } from 'react-toastify';

const Policies = () => {
    const { user } = useStore();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPolicy, setSelectedPolicy] = useState(null);

    useEffect(() => {
        fetchPolicies();
    }, [user]);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const data = await getAllPolicies(user?.companyId?._id);
            if (data.success) {
                setPolicies(data.policies);
                if (data.policies.length > 0) {
                    setSelectedPolicy(data.policies[0]);
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to load policies");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 w-full h-full flex flex-col">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="text-blue-600" /> View Policy
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Review the company policies and agreements</p>
                </div>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-0">
                {/* Top list of policies */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Documents</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {loading ? (
                            <div className="col-span-full animate-pulse space-y-2">
                                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                            </div>
                        ) : policies.length === 0 ? (
                            <p className="col-span-full text-sm text-gray-500 px-2 text-center mt-4">No policies found.</p>
                        ) : (
                            policies.map(policy => (
                                <button
                                    key={policy._id}
                                    onClick={() => setSelectedPolicy(policy)}
                                    className={`w-full text-left px-4 py-3 border rounded-lg text-sm flex flex-col gap-1 transition-colors ${
                                        selectedPolicy?._id === policy._id 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 font-medium">
                                        <File size={16} className={selectedPolicy?._id === policy._id ? 'text-blue-600' : 'text-gray-400'} />
                                        <span className="truncate">{policy.title}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 pl-6">Last updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Policy Content Viewer */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0 overflow-hidden mb-6">
                    {selectedPolicy ? (
                        <>
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-xl font-bold text-gray-900">{selectedPolicy.title}</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Last updated: {new Date(selectedPolicy.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div 
                                className="p-6 overflow-y-auto prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: selectedPolicy.content }}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12">
                            <FileText size={48} className="opacity-20 mb-4" />
                            <p>Select a policy to view its content</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Policies;
