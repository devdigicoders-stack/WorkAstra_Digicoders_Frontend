import React, { useEffect, useState } from 'react';
import { getAllPolicies, createOrUpdatePolicy, deletePolicy } from '../../../services/policyService';
import { fetchAllCompaniesList } from '../../company/services/companyService';
import { useStore } from '../../../context/StoreContext';
import { FileText, Save, Plus, File, Trash, Edit3, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const ManagePolicies = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";

    const [policies, setPolicies] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [companyFilter, setCompanyFilter] = useState("");
    const [targetCompanyId, setTargetCompanyId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    
    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isSuperAdmin) {
            fetchAllCompaniesList()
                .then(res => setCompanies(res?.companies || []))
                .catch(err => console.error("Failed to load companies:", err));
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchPolicies(true);
    }, [user, companyFilter]);

    const fetchPolicies = async (autoSelect = true) => {
        try {
            setLoading(true);
            const compParam = isSuperAdmin ? (companyFilter || "all") : (user?.companyId?._id || "");
            const data = await getAllPolicies(compParam);
            if (data.success) {
                setPolicies(data.policies || []);
                if (autoSelect) {
                    if (data.policies?.length > 0) {
                        selectPolicy(data.policies[0]);
                    } else {
                        handleAddNew();
                    }
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to load policies");
        } finally {
            setLoading(false);
        }
    };

    const selectPolicy = (policy) => {
        setSelectedPolicy(policy);
        setTitle(policy.title);
        setContent(policy.content);
        setTargetCompanyId(policy.companyId?._id || policy.companyId || "");
    };

    const handleAddNew = () => {
        setSelectedPolicy(null);
        setTitle('');
        setContent('');
        setTargetCompanyId(companyFilter || "");
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            return toast.error("Title and content are required");
        }

        try {
            setSaving(true);
            const payload = {
                title,
                content,
                companyId: isSuperAdmin ? (targetCompanyId || null) : (user?.companyId?._id || null)
            };
            const data = await createOrUpdatePolicy(payload);
            if (data.success) {
                toast.success(data.message);
                await fetchPolicies(false); // Refresh the list without auto-selecting
                handleAddNew(); // Clear the form
            }
        } catch (error) {
            toast.error(error.message || "Failed to save policy");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (policyId, e) => {
        e.stopPropagation();
        
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to delete this policy? This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        });

        if (!result.isConfirmed) return;
        
        try {
            const data = await deletePolicy(policyId);
            if (data.success) {
                toast.success(data.message);
                if (selectedPolicy?._id === policyId) {
                    handleAddNew();
                }
                fetchPolicies(false);
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete policy");
        }
    };

    return (
        <div className="p-4 md:p-6 w-full h-full flex flex-col">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Edit3 className="text-blue-600" /> Manage Privacy and Policy
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Create or update company policies and NDAs</p>
                </div>
                <button 
                    onClick={handleAddNew}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm"
                >
                    <Plus size={16} /> New Policy
                </button>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-0">
                {/* Editor */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
                    <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Policy Title</label>
                                <input 
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Non-Disclosure Agreement (NDA)"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 bg-white"
                                />
                            </div>

                            {/* Company assignment for Super Admin */}
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <Building2 size={13} className="text-indigo-600" /> Applicable Company
                                    </label>
                                    <select
                                        value={targetCompanyId}
                                        onChange={(e) => setTargetCompanyId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 bg-white cursor-pointer"
                                    >
                                        <option value="">🌐 Global Policy (Applies to All Companies)</option>
                                        {companies.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                🏢 {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm disabled:opacity-70 shadow-sm self-end"
                        >
                            <Save size={16} /> {saving ? "Saving..." : selectedPolicy ? "Update Policy" : "Publish Policy"}
                        </button>
                    </div>
                    
                    <div className="flex-1 p-4 md:p-6 flex flex-col min-h-[400px] prose prose-sm max-w-none prose-blue">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Policy Content (Rich Text)</label>
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            placeholder="Write the full policy content here..."
                            style={{ height: '300px', paddingBottom: '40px' }}
                        />
                    </div>
                </div>

                {/* List of existing policies */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Existing Policies</h2>
                            <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">{policies.length}</span>
                        </div>
                        {isSuperAdmin && companies.length > 0 && (
                            <div className="relative min-w-[200px]">
                                <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={companyFilter}
                                    onChange={(e) => setCompanyFilter(e.target.value)}
                                    className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white font-medium text-gray-700 cursor-pointer"
                                    title="Filter Policies by Company"
                                >
                                    <option value="">All Companies ({companies.length})</option>
                                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {loading ? (
                            <div className="col-span-full animate-pulse space-y-2">
                                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                            </div>
                        ) : policies.length === 0 ? (
                            <p className="col-span-full text-sm text-gray-500 px-2 text-center py-6">No policies created yet.</p>
                        ) : (
                            policies.map(policy => (
                                <button
                                    key={policy._id}
                                    onClick={() => selectPolicy(policy)}
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
                                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                                        <span>Updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                        <span
                                            onClick={(e) => handleDelete(policy._id, e)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                            title="Delete Policy"
                                        >
                                            <Trash size={14} />
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ManagePolicies;
