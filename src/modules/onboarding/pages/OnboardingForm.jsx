import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useStore } from "../../../context/StoreContext";
import { submitOnboarding } from "../../../services/onboardingService";
import { toast } from "react-toastify";
import { ChevronRight, ChevronLeft, Upload, CheckCircle2, User, FileText, Users, Briefcase } from "lucide-react";

const InputField = ({ label, desc, required, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-gray-700 flex items-center gap-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {desc && <p className="text-[10px] text-gray-400 mt-[-4px]">{desc}</p>}
        {children}
    </div>
);

export default function OnboardingForm() {
    const { user, setUser } = useStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const isSuperAdmin = user?.role?.name === "super_admin";
    if (isSuperAdmin) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="bg-white p-10 rounded-2xl shadow-xl text-center font-bold text-gray-800">Super Admin does not require onboarding. <br/><a href="/" className="inline-block mt-4 text-white bg-black px-6 py-2 rounded-full hover:bg-gray-800 transition">Go to Dashboard</a></div></div>;
    if (user?.onboardingStatus === "approved") return <Navigate to="/" replace />;
    if (user?.onboardingStatus === "pending_approval") return <Navigate to="/onboarding/pending" replace />;

    const [formData, setFormData] = useState({
        email: user?.email || "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        phone: user?.phone || "",
        alternateMobile: "",
        dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
        isDobDifferent: false,
        aadharDateOfBirth: "",
        gender: user?.gender || "",
        linkedInProfile: "",
        permanentAddress: "",
        currentAddress: "",
        yearsOfExperience: "",
        personalReferences: [
            { name: "", mobile: "", relation: "" },
            { name: "", mobile: "", relation: "" }
        ],
        previousCompany: {
            name: "", designation: "", website: "", dateOfJoining: "", dateOfLastWorkingDay: "",
            employeeId: "", hrName: "", hrContact: "", hrEmail: "", officialEmail: "",
            address: "", phone: "", reasonForLeaving: "", lastSalary: "", linkedInProfile: ""
        },
        professionalReferences: [
            { name: "", mobile: "", designation: "", company: "" },
            { name: "", mobile: "", designation: "", company: "" }
        ]
    });

    const [files, setFiles] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Validation for specific fields
        if (name === "firstName" || name === "lastName") {
            newValue = value.replace(/[^a-zA-Z\s]/g, ""); // Allow only alphabets and spaces
        } else if (name === "phone" || name === "alternateMobile") {
            newValue = value.replace(/[^0-9]/g, "").slice(0, 10); // Allow only numbers and max 10 digits
        }

        setFormData({ ...formData, [name]: newValue });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10485760) {
                toast.error(`File size is too large! Maximum allowed size is 10 MB. (Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
                e.target.value = "";
                return;
            }
            setFiles({ ...files, [e.target.name]: file });
        }
    };

    const handleNestedChange = (category, index, field, value) => {
        const newData = { ...formData };
        let newValue = value;

        // Validation for nested fields
        if (["name", "relation", "designation", "hrName"].includes(field)) {
            newValue = value.replace(/[^a-zA-Z\s]/g, ""); // Allow only alphabets and spaces
        } else if (["mobile", "phone", "hrContact"].includes(field)) {
            newValue = value.replace(/[^0-9]/g, "").slice(0, 10); // Allow only numbers and max 10 digits
        }

        if (index !== null) newData[category][index][field] = newValue;
        else newData[category][field] = newValue;
        
        setFormData(newData);
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (currentStep !== 4) {
            nextStep();
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            
            Object.keys(formData).forEach(key => {
                if (["personalReferences", "professionalReferences", "previousCompany"].includes(key)) {
                    data.append(key, JSON.stringify(formData[key]));
                } else {
                    data.append(key, formData[key]);
                }
            });

            Object.keys(files).forEach(key => {
                if (files[key]) data.append(key, files[key]);
            });

            await submitOnboarding(data);
            toast.success("Application submitted successfully!");
            setUser({ ...user, onboardingStatus: "pending_approval" });
            navigate("/onboarding/pending");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit form");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, name: "Personal", icon: User },
        { id: 2, name: "Documents", icon: FileText },
        { id: 3, name: "References", icon: Users },
        { id: 4, name: "Experience", icon: Briefcase }
    ];


    const inputClasses = "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 shadow-sm transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none placeholder-gray-400";
    
    return (
        <div className="min-h-screen bg-[#F5F5F7] py-12 px-4 font-sans selection:bg-black selection:text-white">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Employment Onboarding</h1>
                    <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
                        Please provide accurate information for your employment profile and background verification. Ensure all uploaded documents are clear and valid.
                    </p>
                </div>

                {/* Rejected Alert */}
                {user?.onboardingStatus === "rejected" && (
                    <div className="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-200 mb-8 flex items-start sm:items-center gap-4 animate-in fade-in zoom-in duration-500 shadow-sm">
                        <div className="p-2 bg-red-100 rounded-full shrink-0 mt-1 sm:mt-0">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-red-800 text-lg">Onboarding Rejected</p>
                            <p className="text-sm mt-0.5 opacity-90">Your previous submission was rejected by the administration. Please review your details and re-submit the form.</p>
                        </div>
                    </div>
                )}

                {/* Form Container */}
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
                    
                    {/* Progress Bar */}
                    <div className="px-8 pt-8 pb-4 border-b border-gray-100 bg-white/50 backdrop-blur-xl sticky top-0 z-20">
                        <div className="flex justify-between items-center relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full overflow-hidden -z-10">
                                <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} />
                            </div>
                            
                            {steps.map((step) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;
                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-2 relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-[2px] z-10 ${
                                            isCompleted ? "bg-blue-600 border-blue-600 text-white" :
                                            isActive ? "bg-white border-blue-600 text-blue-600 shadow-md scale-110" :
                                            "bg-white border-gray-300 text-gray-400"
                                        }`}>
                                            {isCompleted ? <CheckCircle2 size={20} strokeWidth={3} /> : <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />}
                                        </div>
                                        <span className={`text-[11px] font-semibold tracking-wide uppercase transition-colors bg-white px-1 z-10 ${
                                            isActive ? "text-blue-600" : isCompleted ? "text-gray-800" : "text-gray-500"
                                        }`}>
                                            {step.name}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 sm:p-12">
                        <div className="min-h-[400px]">
                            {/* STEP 1: PERSONAL DETAILS */}
                            {currentStep === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField label="Email ID" required><input required type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} placeholder="john.doe@example.com"/></InputField>
                                        <InputField label="First Name" required><input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={inputClasses} placeholder="John"/></InputField>
                                        <InputField label="Last Name" required><input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputClasses} placeholder="Doe"/></InputField>
                                        <InputField label="Mobile Number" required><input required type="tel" minLength={10} maxLength={10} name="phone" value={formData.phone} onChange={handleChange} className={inputClasses} placeholder="e.g. 9876543210"/></InputField>
                                        <InputField label="Alternate Mobile"><input type="tel" minLength={10} maxLength={10} name="alternateMobile" value={formData.alternateMobile} onChange={handleChange} className={inputClasses} placeholder="Optional"/></InputField>
                                        
                                        <div className="md:col-span-2 space-y-4 border border-gray-200 p-5 rounded-2xl bg-white shadow-sm">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" name="isDobDifferent" checked={formData.isDobDifferent} onChange={(e) => setFormData({ ...formData, isDobDifferent: e.target.checked })} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-gray-800">Is your Real Date of Birth different from your Aadhar Card Date of Birth?</span>
                                            </label>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                <InputField label={formData.isDobDifferent ? "Real Date Of Birth" : "Date Of Birth (As per Aadhar)"} required>
                                                    <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputClasses} />
                                                </InputField>
                                                
                                                {formData.isDobDifferent && (
                                                    <div className="animate-in fade-in zoom-in duration-300">
                                                        <InputField label="Aadhar Card Date Of Birth" required>
                                                            <input required type="date" name="aadharDateOfBirth" value={formData.aadharDateOfBirth} onChange={handleChange} className={inputClasses} />
                                                        </InputField>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <InputField label="Gender" required>
                                            <select required name="gender" value={formData.gender} onChange={handleChange} className={`${inputClasses} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center] bg-[size:16px]`}>
                                                <option value="" disabled>Select Gender</option><option value="male">Male</option><option value="female">Female</option>
                                            </select>
                                        </InputField>
                                        <InputField label="LinkedIn Profile"><input type="url" name="linkedInProfile" value={formData.linkedInProfile} onChange={handleChange} className={inputClasses} placeholder="https://linkedin.com/in/johndoe"/></InputField>
                                        
                                        <div className="md:col-span-2 space-y-6 mt-4 pt-6 border-t border-gray-100">
                                            <InputField label="Permanent Address" required desc="Street Address, City, District, State, Pincode">
                                                <textarea required name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} rows="2" className={`${inputClasses} resize-none`} placeholder="Enter full permanent address..."></textarea>
                                            </InputField>
                                            <InputField label="Current Address" required desc="Street Address, City, District, State, Pincode">
                                                <textarea required name="currentAddress" value={formData.currentAddress} onChange={handleChange} rows="2" className={`${inputClasses} resize-none`} placeholder="Enter full current address..."></textarea>
                                            </InputField>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: DOCUMENTS */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-8">
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                            Upload 1 supported file (PDF/Image) per field. Max 10 MB. Merge multiple pages into a single PDF.
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { name: "cvFile", label: "Latest Resume / CV", req: true },
                                            { name: "aadharFront", label: "Aadhar Card (Front)", req: true },
                                            { name: "aadharBack", label: "Aadhar Card (Back)", req: true },
                                            { name: "panCard", label: "PAN Card", req: true },
                                            { name: "bankPassbook", label: "Bank Account Passbook/Cheque", req: true },
                                            { name: "highSchoolCertificate", label: "High School (10th) Marksheet", req: true },
                                            { name: "intermediateCertificate", label: "Intermediate (12th) Marksheet", req: false },
                                            { name: "diplomaCertificate", label: "Diploma Certificate (If any)", req: false },
                                            { name: "graduationCertificate", label: "Graduation Certificate", req: false },
                                            { name: "passportPhoto", label: "Passport Size Photo", req: true, imgOnly: true },
                                            { name: "fullSizePhoto", label: "Full Size Photo", req: true, imgOnly: true }
                                        ].map((f) => (
                                            <div key={f.name} className="group relative border border-gray-200 rounded-2xl p-4 transition-all hover:border-black hover:shadow-sm bg-white">
                                                <div className="flex flex-col h-full justify-between">
                                                    <div>
                                                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                            {f.label} {f.req && <span className="text-red-500">*</span>}
                                                        </label>
                                                        {f.desc && <p className="text-xs text-gray-500 mt-1">{f.desc}</p>}
                                                    </div>
                                                    <div className="mt-4 relative">
                                                        <input type="file" name={f.name} onChange={handleFileChange} required={f.req} accept={f.imgOnly ? "image/*" : ".pdf,.jpg,.jpeg,.png"} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Choose file" />
                                                        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl group-hover:bg-gray-100 transition-colors">
                                                            <Upload size={16} className="text-gray-400 group-hover:text-black transition-colors" />
                                                            <span className="text-xs font-medium text-gray-500 truncate group-hover:text-black">
                                                                {files[f.name] ? files[f.name].name : "Click to browse or drag file"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: REFERENCES */}
                            {currentStep === 3 && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
                                    
                                    <div className="space-y-6">
                                        <div className="border-b border-gray-100 pb-2">
                                            <h3 className="text-lg font-bold text-gray-900">Personal References</h3>
                                            <p className="text-sm text-gray-500">Two personal contacts for background verification.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {[0, 1].map((idx) => (
                                                <div key={`personal-${idx}`} className="space-y-5 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                                    <h4 className="text-sm font-bold tracking-wide text-gray-900 uppercase">Reference {idx + 1}</h4>
                                                    <InputField label="Name" required><input required type="text" value={formData.personalReferences[idx].name} onChange={(e) => handleNestedChange("personalReferences", idx, "name", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Mobile" required><input required type="tel" minLength={10} maxLength={10} value={formData.personalReferences[idx].mobile} onChange={(e) => handleNestedChange("personalReferences", idx, "mobile", e.target.value)} className={inputClasses} placeholder="e.g. 9876543210" /></InputField>
                                                    <InputField label="Relation" required><input required type="text" value={formData.personalReferences[idx].relation} onChange={(e) => handleNestedChange("personalReferences", idx, "relation", e.target.value)} className={inputClasses} /></InputField>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="border-b border-gray-100 pb-2">
                                            <h3 className="text-lg font-bold text-gray-900">Professional References</h3>
                                            <p className="text-sm text-gray-500">Two professional contacts (ex-managers, colleagues).</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {[0, 1].map((idx) => (
                                                <div key={`prof-${idx}`} className="space-y-5 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                                    <h4 className="text-sm font-bold tracking-wide text-gray-900 uppercase">Reference {idx + 1}</h4>
                                                    <InputField label="Name" required><input required type="text" value={formData.professionalReferences[idx].name} onChange={(e) => handleNestedChange("professionalReferences", idx, "name", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Mobile" required><input required type="tel" minLength={10} maxLength={10} value={formData.professionalReferences[idx].mobile} onChange={(e) => handleNestedChange("professionalReferences", idx, "mobile", e.target.value)} className={inputClasses} placeholder="e.g. 9876543210" /></InputField>
                                                    <InputField label="Designation" required><input required type="text" value={formData.professionalReferences[idx].designation} onChange={(e) => handleNestedChange("professionalReferences", idx, "designation", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Company Name" required><input required type="text" value={formData.professionalReferences[idx].company} onChange={(e) => handleNestedChange("professionalReferences", idx, "company", e.target.value)} className={inputClasses} /></InputField>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* STEP 4: EXPERIENCE */}
                            {currentStep === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 relative overflow-hidden space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-gray-900">Experience Type <span className="text-red-500">*</span></label>
                                            <div className="flex items-center gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input required type="radio" name="experienceType" value="fresher" checked={formData.yearsOfExperience === "0"} onChange={() => setFormData({ ...formData, yearsOfExperience: "0" })} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                                                    <span className="text-gray-700 font-medium">Fresher</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input required type="radio" name="experienceType" value="experienced" checked={formData.yearsOfExperience !== "" && formData.yearsOfExperience !== "0"} onChange={() => setFormData({ ...formData, yearsOfExperience: "0.5" })} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                                                    <span className="text-gray-700 font-medium">Experienced</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.yearsOfExperience !== "" && formData.yearsOfExperience !== "0" && (
                                            <div className="animate-in fade-in zoom-in duration-300">
                                                <InputField label="Total Years Of Experience" required>
                                                    <select required name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} className={`${inputClasses} md:w-1/2 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:calc(100%-12px)_center] bg-[size:16px]`}>
                                                        <option value="" disabled>Select Experience</option>
                                                        <option value="0.5">6 Months</option>
                                                        <option value="1">1 Year</option>
                                                        <option value="2">2 Years</option>
                                                        <option value="3">3 Years</option>
                                                        <option value="4">4 Years</option>
                                                        <option value="5">5 Years</option>
                                                        <option value="6">6 Years</option>
                                                        <option value="7">7 Years</option>
                                                        <option value="8">8 Years</option>
                                                        <option value="9">9 Years</option>
                                                        <option value="10">10 Years</option>
                                                        <option value="10+">More than 10 Years</option>
                                                    </select>
                                                </InputField>
                                            </div>
                                        )}
                                    </div>

                                    {Number(formData.yearsOfExperience) > 0 && (
                                        <div className="space-y-10 mt-10">
                                            <div className="space-y-6">
                                                <h4 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Previous Company Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <InputField label="Company Name"><input type="text" value={formData.previousCompany.name} onChange={(e) => handleNestedChange("previousCompany", null, "name", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Designation"><input type="text" value={formData.previousCompany.designation} onChange={(e) => handleNestedChange("previousCompany", null, "designation", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Website" required><input required type="url" value={formData.previousCompany.website} onChange={(e) => handleNestedChange("previousCompany", null, "website", e.target.value)} className={inputClasses} placeholder="https://..."/></InputField>
                                                    <InputField label="Date of Joining"><input type="date" value={formData.previousCompany.dateOfJoining} onChange={(e) => handleNestedChange("previousCompany", null, "dateOfJoining", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Last Working Day"><input type="date" value={formData.previousCompany.dateOfLastWorkingDay} onChange={(e) => handleNestedChange("previousCompany", null, "dateOfLastWorkingDay", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Employee ID"><input type="text" value={formData.previousCompany.employeeId} onChange={(e) => handleNestedChange("previousCompany", null, "employeeId", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="HR/Manager Name"><input type="text" value={formData.previousCompany.hrName} onChange={(e) => handleNestedChange("previousCompany", null, "hrName", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="HR/Manager Contact"><input type="text" value={formData.previousCompany.hrContact} onChange={(e) => handleNestedChange("previousCompany", null, "hrContact", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="HR/Manager Email"><input type="email" value={formData.previousCompany.hrEmail} onChange={(e) => handleNestedChange("previousCompany", null, "hrEmail", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Company Official Email"><input type="email" value={formData.previousCompany.officialEmail} onChange={(e) => handleNestedChange("previousCompany", null, "officialEmail", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Company Phone"><input type="text" value={formData.previousCompany.phone} onChange={(e) => handleNestedChange("previousCompany", null, "phone", e.target.value)} className={inputClasses} /></InputField>
                                                    <InputField label="Last In-Hand Salary" required desc="Monthly salary"><input required type="number" value={formData.previousCompany.lastSalary} onChange={(e) => handleNestedChange("previousCompany", null, "lastSalary", e.target.value)} className={inputClasses} /></InputField>
                                                    <div className="lg:col-span-3">
                                                        <InputField label="Company Address">
                                                            <textarea value={formData.previousCompany.address} onChange={(e) => handleNestedChange("previousCompany", null, "address", e.target.value)} rows="2" className={`${inputClasses} resize-none`}></textarea>
                                                        </InputField>
                                                    </div>
                                                    <div className="lg:col-span-3">
                                                        <InputField label="Reason for Leaving">
                                                            <textarea value={formData.previousCompany.reasonForLeaving} onChange={(e) => handleNestedChange("previousCompany", null, "reasonForLeaving", e.target.value)} rows="2" className={`${inputClasses} resize-none`}></textarea>
                                                        </InputField>
                                                    </div>
                                                    <div className="lg:col-span-3">
                                                        <InputField label="Company LinkedIn"><input type="url" value={formData.previousCompany.linkedInProfile} onChange={(e) => handleNestedChange("previousCompany", null, "linkedInProfile", e.target.value)} className={inputClasses} /></InputField>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6 pt-6 border-t border-gray-100">
                                                <h4 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Experience Documents</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {[
                                                        { name: "offerLetterFile", label: "Last Job Offer Letter" },
                                                        { name: "experienceLetterFile", label: "Experience Letter" },
                                                        { name: "relievingLetterFile", label: "Relieving Letter" },
                                                        { name: "salarySlipsFile", label: "Salary Slips (Last 3 Months)", desc: "Create a single PDF" }
                                                    ].map(f => (
                                                        <div key={f.name} className="group relative border border-gray-200 rounded-2xl p-4 transition-all hover:border-black hover:shadow-sm bg-white">
                                                            <div className="flex flex-col h-full justify-between">
                                                                <div>
                                                                    <label className="text-sm font-semibold text-gray-900">{f.label}</label>
                                                                    {f.desc && <p className="text-[10px] text-gray-500 mt-1">{f.desc}</p>}
                                                                </div>
                                                                <div className="mt-4 relative">
                                                                    <input type="file" name={f.name} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Choose file" />
                                                                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl group-hover:bg-gray-100 transition-colors">
                                                                        <Upload size={16} className="text-gray-400 group-hover:text-black transition-colors" />
                                                                        <span className="text-xs font-medium text-gray-500 truncate group-hover:text-black">
                                                                            {files[f.name] ? files[f.name].name : "Browse file"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between">
                            <button type="button" onClick={prevStep} disabled={currentStep === 1} className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                                <ChevronLeft size={18} /> Back
                            </button>

                            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-md transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0">
                                {loading ? "Processing..." : currentStep === 4 ? "Submit Application" : "Save & Continue"}
                                {currentStep !== 4 && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="text-center mt-8 text-sm text-gray-400 font-medium pb-12">
                    Secured via 256-bit encryption. Your data is safe.
                </div>
            </div>
        </div>
    );
}
