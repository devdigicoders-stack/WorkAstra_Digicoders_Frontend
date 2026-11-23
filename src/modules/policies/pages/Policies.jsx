import React, { useEffect, useState } from 'react';
import { getAllPolicies } from '../../../services/policyService';
import { fetchAllCompaniesList } from '../../company/services/companyService';
import { useStore } from '../../../context/StoreContext';
import { FileText, File, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';

const Policies = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";

    const [policies, setPolicies] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [companyFilter, setCompanyFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedPolicy, setSelectedPolicy] = useState(null);

    // Load companies list for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const compParam = isSuperAdmin ? (companyFilter || "all") : (user?.companyId?._id || "");
            const data = await getAllPolicies(compParam);
            if (data.success) {
                setPolicies(data.policies || []);
                if (data.policies?.length > 0) {
                    setSelectedPolicy(data.policies[0]);
                } else {
                    setSelectedPolicy(null);
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to load policies");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [user, companyFilter]);

    return (
        <div className="p-4 md:p-6 w-full h-full flex flex-col">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="text-blue-600" /> View Policy
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Review company policies and agreements</p>
                </div>

                {/* Company Filter for Super Admin */}
                {isSuperAdmin && companies.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-[220px]">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium text-gray-700 shadow-sm"
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
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-0">
                {/* Top list of policies */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Documents</h2>
                        {isSuperAdmin && companyFilter && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {companies.find(c => c._id === companyFilter)?.name || "Filtered Company"}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {loading ? (
                            <div className="col-span-full animate-pulse space-y-2">
                                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                            </div>
                        ) : policies.length === 0 ? (
                            <p className="col-span-full text-sm text-gray-500 px-2 text-center py-6">No policies found.</p>
                        ) : (
                            policies.map(policy => (
                                <button
                                    key={policy._id}
                                    onClick={() => setSelectedPolicy(policy)}
                                    className={`w-full text-left px-4 py-3 border rounded-xl text-sm flex flex-col gap-1.5 transition-all shadow-sm ${
                                        selectedPolicy?._id === policy._id 
                                        ? 'bg-blue-50/80 border-blue-300 text-blue-800 ring-2 ring-blue-500/20' 
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1 w-full">
                                        <div className="flex items-center gap-2 font-semibold truncate">
                                            <File size={16} className={selectedPolicy?._id === policy._id ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
                                            <span className="truncate">{policy.title}</span>
                                        </div>
                                        {isSuperAdmin && (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                                policy.companyId?.name
                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            }`}>
                                                {policy.companyId?.name || "Global"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pl-6 text-[10px] text-gray-400">
                                        <span>Updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                        {policy.companyId?.name && (
                                            <span className="text-gray-500 truncate max-w-[120px]">{policy.companyId.name}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Policy Content Viewer */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0 overflow-hidden mb-6">
                    {selectedPolicy ? (
                        <>
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedPolicy.title}</h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Last updated: {new Date(selectedPolicy.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    {selectedPolicy.companyId?.name ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            <Building2 size={13} /> {selectedPolicy.companyId.name}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Global Policy (All Companies)
                                        </span>
                                    )}
                                </div>
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
