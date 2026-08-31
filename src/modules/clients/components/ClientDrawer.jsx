import React, { useEffect, useState } from "react";
import { X, User, Mail, Phone, Lock, Building2, Eye, EyeOff, MapPin } from "lucide-react";

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
        <div className="relative">
            {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
            {React.cloneElement(children, {
                className: `w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${Icon ? "pl-9 pr-3" : "px-3"} ${children.props.className || ""}`,
            })}
        </div>
    </div>
);

const ClientDrawer = ({ isOpen, onClose, initialData, companies, roles, onSubmit, loading, onCompanyChange }) => {
    const isEdit = !!initialData;
    const [form, setForm] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const formattedData = { ...(initialData || {}) };
        setForm(formattedData);
        setErrors({});
    }, [initialData, isOpen]);

    // Auto-select company
    useEffect(() => {
        if (!isOpen || isEdit) return;
        if (!form.companyId && companies?.length === 1) {
            handleCompanyChange(companies[0]._id);
        }
    }, [isOpen, isEdit, form.companyId, companies]);

    // Auto-select role 'client'
    useEffect(() => {
        if (!isOpen || isEdit) return;
        const clientRole = roles.find(r => r.name.toLowerCase() === "client");
        if (clientRole && form.role !== clientRole._id) {
            setForm(prev => ({ ...prev, role: clientRole._id }));
        }
    }, [isOpen, isEdit, roles, form.role]);

    const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleCompanyChange = async (value) => {
        if (onCompanyChange) {
            const updated = await onCompanyChange("companyId", value, { ...form, companyId: value, role: "" });
            setForm(updated);
        } else {
            set("companyId", value);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!form.firstName?.trim()) newErrors.firstName = "First name is required";
        if (!form.lastName?.trim()) newErrors.lastName = "Last name is required";
        if (!form.email?.trim()) newErrors.email = "Email is required";
        if (!isEdit && !form.password) newErrors.password = "Password is required";
        if (!isEdit && form.password && form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
        if (!form.companyId) newErrors.companyId = "Company is required";
        if (!form.role) newErrors.role = "Client role not found for this company. Please ensure a 'client' role exists.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(form);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-xl sm:max-w-xl bg-white h-full flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Client" : "Add Client"}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{isEdit ? "Update client details" : "Fill in required fields to create a new client"}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Personal Info */}
                    <section>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User size={13} /> Personal Information
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Field label="First Name *" icon={User}>
                                    <input type="text" value={form.firstName || ""} onChange={(e) => set("firstName", e.target.value)} placeholder="John" />
                                </Field>
                                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                            </div>
                            <div>
                                <Field label="Last Name *" icon={User}>
                                    <input type="text" value={form.lastName || ""} onChange={(e) => set("lastName", e.target.value)} placeholder="Doe" />
                                </Field>
                                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Field label="Gender">
                                <select value={form.gender || ""} onChange={(e) => set("gender", e.target.value)}>
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </Field>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Contact */}
                    <section>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Mail size={13} /> Contact Details
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Field label="Email *" icon={Mail}>
                                    <input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="client@example.com" />
                                </Field>
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>
                            <Field label="Phone" icon={Phone}>
                                <input type="text" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91 00000 00000" />
                            </Field>
                        </div>
                        <div className="mt-4">
                            <Field label="Address" icon={MapPin}>
                                <input type="text" value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="123, Street, City, State - PIN" />
                            </Field>
                        </div>
                        {!isEdit && (
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Password *</label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={form.password || ""}
                                        onChange={(e) => set("password", e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                    <button type="button" onClick={() => setShowPassword((p) => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                            </div>
                        )}
                    </section>

                    <hr className="border-gray-100" />

                    {/* Client Details */}
                    <section>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Building2 size={13} /> Client Details
                        </p>
                        <div>
                            <Field label="Company *" icon={Building2}>
                                {companies.length === 1 ? (
                                    <input type="text" readOnly value={companies[0].name} className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                                ) : (
                                    <select value={form.companyId || ""} onChange={(e) => handleCompanyChange(e.target.value)}>
                                        <option value="">Select company</option>
                                        {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                )}
                            </Field>
                            {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
                            {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Final Proposal (PDF) - Optional</label>
                            <input 
                                type="file" 
                                accept=".pdf"
                                onChange={(e) => set("finalProposal", e.target.files[0])}
                                className="w-full text-sm border border-gray-200 rounded-lg p-2"
                            />
                            {isEdit && initialData?.finalProposal?.url && (
                                <p className="text-xs text-gray-500 mt-1">Current: <a href={initialData.finalProposal.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View Document</a></p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                        {loading ? "Saving..." : isEdit ? "Update Client" : "Add Client"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientDrawer;
