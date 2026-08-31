import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { LogOut } from "lucide-react";
import { authlogout } from "../modules/auth/services/authService";

function OnboardingLayout() {
    const { user, setUser } = useStore();

    if (!user) return <Navigate to="/auth/login" replace />;

    // If user is already approved, send them to dashboard
    if (user.onboardingStatus === "approved") {
        return <Navigate to="/" replace />;
    }

    const handleLogout = async () => {
        try {
            await authlogout();
        } catch (e) {
            console.error(e);
        }
        setUser(null);
        localStorage.removeItem("token"); // or whatever logic you use to clear session
        window.location.href = "/auth/login";
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="w-20"></div> {/* spacer for centering */}
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Workastra</h1>
                <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition"
                >
                    <LogOut size={18} /> Logout
                </button>
            </header>
            <main className="flex-1 overflow-y-auto no-scrollbar">
                <Outlet />
            </main>
        </div>
    );
}

export default OnboardingLayout;
