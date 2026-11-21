import React, { useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useStore } from '../context/StoreContext';
import { Lock } from 'lucide-react';

const SecureRoute = ({ children }) => {
    const { isUnlocked, requestUnlock } = useSecurity();
    const { user } = useStore();

    const isSuperAdmin = user?.role?.name === "super_admin";
    const permissions = user?.role?.permissions || [];
    const isPrivilegedUser = isSuperAdmin || 
        permissions.includes("MANAGE_PAYROLL") || 
        permissions.includes("MANAGE_PAYMENTS") || 
        permissions.includes("VIEW_ALL_PROJECTS") || 
        permissions.includes("CREATE_PROJECT");

    useEffect(() => {
        // If not unlocked and user has management access, trigger the modal immediately
        if (!isUnlocked && isPrivilegedUser) {
            requestUnlock();
        }
    }, [isUnlocked, requestUnlock, isPrivilegedUser]);

    // If unlocked or if the user is just a normal employee, show the actual component
    if (isUnlocked || !isPrivilegedUser) {
        return children;
    }

    // While locked, show a placeholder
    return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 m-4">
            <div className="animate-pulse flex flex-col items-center text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Lock size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-500">Sensitive Information Locked</h3>
                <p className="text-sm mt-1">Please enter your Security PIN to view this content.</p>
            </div>
        </div>
    );
};

export default SecureRoute;
