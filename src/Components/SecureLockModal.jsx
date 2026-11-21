import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { X, Lock } from 'lucide-react';
import { toast } from 'react-toastify';

const SecureLockModal = () => {
    const { verifyPin, isModalOpen, setIsModalOpen } = useSecurity();
    const [pin, setPinValue] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isModalOpen) {
            setPinValue("");
        }
    }, [isModalOpen]);

    const handlePinChange = (e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 6) setPinValue(val);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pin.length !== 6) {
            toast.error("Please enter a 6-digit PIN");
            return;
        }

        setLoading(true);
        const res = await verifyPin(pin);
        if (res.success) {
            toast.success("Unlocked!");
        } else {
            toast.error(res.message);
            setPinValue("");
        }
        setLoading(false);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        window.location.href = '/'; // Go back to home if they cancel unlocking
    };

    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">
                        Enter Security PIN
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 mb-6">
                        This module contains sensitive information. Please enter your 6-digit PIN to access.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full">
                        <input
                            type="password"
                            value={pin}
                            onChange={handlePinChange}
                            className="w-full text-center text-2xl tracking-[0.5em] font-mono border-2 border-gray-300 rounded-xl py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="••••••"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || pin.length !== 6}
                            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Verifying..." : "Unlock"}
                        </button>
                    </form>

                    <div className="mt-4 pt-3 border-t border-gray-100 w-full text-center">
                        <a
                            href="/profile?tab=payroll-pin&forgot=true"
                            onClick={() => setIsModalOpen(false)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline inline-flex items-center gap-1"
                        >
                            Forgot PIN? Reset via Email OTP
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecureLockModal;
