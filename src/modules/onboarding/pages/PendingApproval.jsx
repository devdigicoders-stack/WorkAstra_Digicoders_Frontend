import React from "react";
import { CheckCircle, Clock } from "lucide-react";
import { useStore } from "../../../context/StoreContext";
import { Navigate } from "react-router-dom";

export default function PendingApproval() {
    const { user, setUser } = useStore();

    const isSuperAdmin = user?.role?.name === "super_admin";
    if (isSuperAdmin) {
        return <div className="p-10 text-center font-bold">Super Admin does not require onboarding. <a href="/" className="text-blue-500 underline">Go to Dashboard</a></div>;
    }
    if (user?.onboardingStatus === "approved") {
        return <Navigate to="/" replace />;
    }
    if (user?.onboardingStatus === "pending_form") {
        return <Navigate to="/onboarding" replace />;
    }

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full text-center relative overflow-hidden border border-gray-100">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock size={40} className="text-blue-500 animate-pulse" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                    Thank you for submitting your onboarding details. Your application is currently under review by the HR department. 
                    You will receive an Offer Letter email once it is approved, and then you will be able to access the dashboard.
                </p>
                
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-8 flex items-start text-left">
                    <CheckCircle className="text-orange-500 mt-0.5 shrink-0" size={18} />
                    <p className="text-sm text-orange-800 ml-3">
                        <strong>Status:</strong> Pending Approval<br/>
                        Please wait for the Admin to verify your documents and set your Salary Structure.
                    </p>
                </div>
                
                <button onClick={handleLogout} className="text-gray-500 hover:text-gray-800 font-medium transition text-sm">
                    Log out for now
                </button>
            </div>
        </div>
    );
}
