import React, { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import { useStore } from "../context/StoreContext";
import { requestForToken, onMessageListener } from "../firebase";
import WishesModal from "../Components/WishesModal";
import { saveFcmTokenToBackend } from "../services/fcmService";
import { toast } from "react-toastify";

function WebLayout() {
    const { user } = useStore();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (user) {
            requestForToken().then((token) => {
                if (token) saveFcmTokenToBackend(token).catch(console.error);
            });
            onMessageListener().then(payload => {
                toast.info(`${payload.notification.title}: ${payload.notification.body}`);
            }).catch(err => console.log('failed: ', err));
        }
    }, [user]);

    if (!user) return <Navigate to="/auth/login" replace />;

    // Intercept users who haven't completed onboarding
    const roleName = user?.role?.name?.toLowerCase()?.trim();
    
    if (roleName === "client" && (!user?.clientNdaStatus || user?.clientNdaStatus === "pending")) {
        return <Navigate to="/client-nda" replace />;
    }

    const skipOnboarding = roleName === "super_admin" || roleName === "admin" || roleName === "client";
    
    if (!skipOnboarding) {
        if (user.onboardingStatus === "pending_form" || user.onboardingStatus === "rejected") {
            return <Navigate to="/onboarding" replace />;
        }
        if (user.onboardingStatus === "pending_approval") {
            return <Navigate to="/onboarding/pending" replace />;
        }
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main className="flex-1 flex flex-col min-w-0">
                <Navbar onMenuClick={() => setMobileOpen(true)} />
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <Outlet />
                </div>
            </main>
            <WishesModal user={user} />
        </div>
    );
}

export default WebLayout;
