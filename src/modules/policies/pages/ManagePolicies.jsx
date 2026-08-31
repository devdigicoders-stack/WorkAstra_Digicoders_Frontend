import React, { useEffect, useState } from 'react';
import { getAllPolicies, createOrUpdatePolicy, deletePolicy } from '../../../services/policyService';
import { useStore } from '../../../context/StoreContext';
import { FileText, Save, Plus, File, Trash, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const ManagePolicies = () => {
    const { user } = useStore();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    
    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        fetchPolicies(true);
    }, [user]);

    const fetchPolicies = async (autoSelect = true) => {
        try {
            setLoading(true);
            const data = await getAllPolicies(user?.companyId?._id);
            if (data.success) {
                setPolicies(data.policies);
                if (autoSelect) {
                    if (data.policies.length > 0) {
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
    };

    const handleAddNew = () => {
        setSelectedPolicy(null);
        setTitle('');
        setContent('');
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
                companyId: user?.companyId?._id || null
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
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                >
                    <Plus size={16} /> New Policy
                </button>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-0">
                {/* Editor */}
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
                    <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="w-full sm:w-2/3">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Policy Title</label>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Non-Disclosure Agreement (NDA)"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800"
                            />
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm disabled:opacity-70"
                        >
                            <Save size={16} /> {saving ? "Saving..." : "Save Policy"}
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
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Existing Policies</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {loading ? (
                            <div className="col-span-full animate-pulse space-y-2">
                                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                            </div>
                        ) : policies.length === 0 ? (
                            <p className="col-span-full text-sm text-gray-500 px-2 text-center mt-4">No policies created yet.</p>
                        ) : (
                            policies.map(policy => (
                                <button
                                    key={policy._id}
                                    onClick={() => selectPolicy(policy)}
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
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-gray-400 pl-6">Last updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
                                        <button 
                                            onClick={(e) => handleDelete(policy._id, e)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete Policy"
                                        >
                                            <Trash size={14} />
                                        </button>
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
