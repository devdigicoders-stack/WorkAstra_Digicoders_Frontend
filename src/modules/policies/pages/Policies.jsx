import React, { useEffect, useState, useRef } from 'react';
import { getAllPolicies } from '../../../services/policyService';
import { fetchAllCompaniesList } from '../../company/services/companyService';
import { useStore } from '../../../context/StoreContext';
import { FileText, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';

const Policies = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const contentRef = useRef(null);

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

    const handleSelectPolicy = (policy) => {
        setSelectedPolicy(policy);
        if (window.innerWidth < 768 && contentRef.current) {
            contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [user, companyFilter]);

    return (
        <div className="p-3 sm:p-6 w-full min-h-screen max-w-full overflow-x-hidden flex flex-col bg-gray-50/50">
            {/* Header */}
            <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="text-blue-600 shrink-0" size={24} /> 
                        <span>Company Policies</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Review company policies, guidelines and agreements</p>
                </div>

                {/* Company Filter for Super Admin */}
                {isSuperAdmin && companies.length > 0 && (
                    <div className="w-full sm:w-auto min-w-[220px]">
                        <div className="relative w-full">
                            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-5 sm:gap-6 flex-1 min-h-0">
                {/* Top list of policies */}
                <div className="w-full bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-200/80 p-3.5 sm:p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider">Documents</h2>
                            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-100">{policies.length}</span>
                        </div>
                        {isSuperAdmin && companyFilter && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[150px]">
                                {companies.find(c => c._id === companyFilter)?.name || "Filtered Company"}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {loading ? (
                            <div className="col-span-full animate-pulse space-y-2 py-4">
                                <div className="h-14 bg-gray-100 rounded-xl w-full"></div>
                                <div className="h-14 bg-gray-100 rounded-xl w-full"></div>
                            </div>
                        ) : policies.length === 0 ? (
                            <div className="col-span-full py-8 text-center text-sm text-gray-500">
                                <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                                No policies found.
                            </div>
                        ) : (
                            policies.map(policy => {
                                const isSelected = selectedPolicy?._id === policy._id;
                                return (
                                    <button
                                        key={policy._id}
                                        onClick={() => handleSelectPolicy(policy)}
                                        className={`w-full text-left p-3.5 border rounded-xl text-sm flex flex-col gap-2 transition-all shadow-2xs cursor-pointer active:scale-[0.99] ${
                                            isSelected 
                                            ? 'bg-blue-50/90 border-blue-400 text-blue-900 ring-2 ring-blue-500/20' 
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 w-full">
                                            <div className="flex items-center gap-2 font-semibold truncate min-w-0">
                                                <FileText size={16} className={isSelected ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
                                                <span className="truncate text-xs sm:text-sm font-semibold text-gray-900">{policy.title}</span>
                                            </div>
                                            {isSuperAdmin && (
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                                                    policy.companyId?.name
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {policy.companyId?.name || "Global"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                                            <span>Updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                            {policy.companyId?.name && (
                                                <span className="text-gray-500 truncate max-w-[110px]">{policy.companyId.name}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Policy Content Viewer */}
                <div 
                    ref={contentRef}
                    className="w-full bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-200/80 flex flex-col min-h-0 overflow-hidden mb-6"
                >
                    {selectedPolicy ? (
                        <>
                            <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">{selectedPolicy.title}</h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Last updated: {new Date(selectedPolicy.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="shrink-0">
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
                                className="p-4 sm:p-6 overflow-y-auto prose prose-sm max-w-none text-gray-700 break-words leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: selectedPolicy.content }}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10 sm:p-14">
                            <FileText size={44} className="opacity-20 mb-3" />
                            <p className="text-sm">Select a policy above to view its content</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Policies;