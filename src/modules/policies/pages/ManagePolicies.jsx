import React, { useEffect, useState, useRef } from 'react';
import { getAllPolicies, createOrUpdatePolicy, deletePolicy } from '../../../services/policyService';
import { fetchAllCompaniesList } from '../../company/services/companyService';
import { useStore } from '../../../context/StoreContext';
import { FileText, Save, Plus, Trash, Edit3, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const ManagePolicies = () => {
    const { user } = useStore();
    const isSuperAdmin = user?.role?.name === "super_admin";
    const editorRef = useRef(null);

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
                        selectPolicy(data.policies[0], false);
                    } else {
                        handleAddNew(false);
                    }
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to load policies");
        } finally {
            setLoading(false);
        }
    };

    const selectPolicy = (policy, shouldScroll = true) => {
        setSelectedPolicy(policy);
        setTitle(policy.title || '');
        setContent(policy.content || '');
        setTargetCompanyId(policy.companyId?._id || policy.companyId || "");

        if (shouldScroll && window.innerWidth < 768 && editorRef.current) {
            editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleAddNew = (shouldScroll = true) => {
        setSelectedPolicy(null);
        setTitle('');
        setContent('');
        setTargetCompanyId(companyFilter || "");

        if (shouldScroll && window.innerWidth < 768 && editorRef.current) {
            editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
                handleAddNew(false); // Clear the form
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
                    handleAddNew(false);
                }
                fetchPolicies(false);
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete policy");
        }
    };

    return (
        <div className="p-3 sm:p-6 w-full min-h-screen max-w-full overflow-x-hidden flex flex-col bg-gray-50/50">
            {/* Custom Quill Mobile Styles */}
            <style>{`
                .manage-policy-quill .ql-toolbar.ql-snow {
                    border-top-left-radius: 0.75rem;
                    border-top-right-radius: 0.75rem;
                    border-color: #e5e7eb;
                    background-color: #f9fafb;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2px;
                    padding: 8px 10px;
                }
                .manage-policy-quill .ql-container.ql-snow {
                    border-bottom-left-radius: 0.75rem;
                    border-bottom-right-radius: 0.75rem;
                    border-color: #e5e7eb;
                    font-family: inherit;
                    font-size: 0.875rem;
                    background-color: #ffffff;
                }
                .manage-policy-quill .ql-editor {
                    min-height: 220px;
                    max-height: 480px;
                    overflow-y: auto;
                    font-size: 0.875rem;
                    line-height: 1.6;
                    color: #1f2937;
                }
                @media (min-width: 640px) {
                    .manage-policy-quill .ql-editor {
                        min-height: 300px;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Edit3 className="text-blue-600 shrink-0" size={24} /> 
                        <span>Manage Privacy and Policy</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Create or update company policies and NDAs</p>
                </div>
                <button 
                    onClick={() => handleAddNew(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition font-semibold text-sm shadow-xs cursor-pointer"
                >
                    <Plus size={16} /> <span>New Policy</span>
                </button>
            </div>

            <div className="flex flex-col gap-5 sm:gap-6 flex-1 min-h-0">
                {/* Editor Card */}
                <div 
                    ref={editorRef} 
                    id="policy-editor"
                    className="w-full bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-200/80 flex flex-col overflow-hidden"
                >
                    <div className="p-3.5 sm:p-5 border-b border-gray-100 bg-gray-50/70 flex flex-col md:flex-row gap-3.5 sm:gap-4 justify-between items-stretch md:items-end">
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Policy Title
                                </label>
                                <input 
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Non-Disclosure Agreement (NDA)"
                                    className="w-full px-3.5 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-sm text-gray-800 bg-white shadow-2xs"
                                />
                            </div>

                            {/* Company assignment for Super Admin */}
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Building2 size={13} className="text-indigo-600 shrink-0" /> 
                                        <span>Applicable Company</span>
                                    </label>
                                    <select
                                        value={targetCompanyId}
                                        onChange={(e) => setTargetCompanyId(e.target.value)}
                                        className="w-full px-3.5 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-sm text-gray-800 bg-white cursor-pointer shadow-2xs"
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
                            className="w-full md:w-auto flex shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition font-semibold text-xs sm:text-sm disabled:opacity-70 shadow-xs cursor-pointer"
                        >
                            <Save size={16} /> 
                            <span>{saving ? "Saving..." : selectedPolicy ? "Update Policy" : "Publish Policy"}</span>
                        </button>
                    </div>
                    
                    <div className="flex-1 p-3.5 sm:p-5 flex flex-col">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Policy Content (Rich Text)
                        </label>
                        <div className="manage-policy-quill w-full">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                placeholder="Write the full policy content here..."
                            />
                        </div>
                    </div>
                </div>

                {/* List of existing policies */}
                <div className="w-full bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-gray-200/80 p-3.5 sm:p-5 flex flex-col mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Existing Policies
                            </h2>
                            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
                                {policies.length}
                            </span>
                        </div>
                        {isSuperAdmin && companies.length > 0 && (
                            <div className="relative w-full sm:w-auto min-w-[220px]">
                                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={companyFilter}
                                    onChange={(e) => setCompanyFilter(e.target.value)}
                                    className="w-full pl-8 pr-7 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white font-medium text-gray-700 cursor-pointer shadow-2xs"
                                    title="Filter Policies by Company"
                                >
                                    <option value="">All Companies ({companies.length})</option>
                                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {loading ? (
                            <div className="col-span-full animate-pulse space-y-2 py-4">
                                <div className="h-16 bg-gray-100 rounded-xl w-full"></div>
                                <div className="h-16 bg-gray-100 rounded-xl w-full"></div>
                            </div>
                        ) : policies.length === 0 ? (
                            <div className="col-span-full py-10 text-center">
                                <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">No policies created yet.</p>
                            </div>
                        ) : (
                            policies.map(policy => {
                                const isSelected = selectedPolicy?._id === policy._id;
                                return (
                                    <div
                                        key={policy._id}
                                        onClick={() => selectPolicy(policy, true)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectPolicy(policy, true); }}
                                        className={`w-full text-left p-3.5 sm:p-4 border rounded-xl text-sm flex flex-col justify-between gap-2.5 transition-all shadow-2xs cursor-pointer select-none active:scale-[0.99] ${
                                            isSelected 
                                            ? 'bg-blue-50/90 border-blue-400 text-blue-900 ring-2 ring-blue-500/20' 
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 w-full">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-gray-900 block truncate text-xs sm:text-sm leading-snug">
                                                        {policy.title}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse"></span>
                                                            Currently Editing
                                                        </span>
                                                    )}
                                                </div>
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

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                                            <span>Updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(policy._id, e)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer active:scale-95"
                                                title="Delete Policy"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagePolicies;