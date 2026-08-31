import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import axios from "axios";

const WishesModal = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [wishType, setWishType] = useState(null); // 'birthday' or 'anniversary'
    const [cardUrl, setCardUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;



        let isBirthday = false;
        let isAnniversary = false;

        // Check Birthday
        if (user.dateOfBirth) {
            // Parse from string to avoid timezone offset issues
            const dobString = typeof user.dateOfBirth === 'string' ? user.dateOfBirth.split('T')[0] : new Date(user.dateOfBirth).toISOString().split('T')[0];
            const parts = dobString.split('-');
            const dobMonth = parseInt(parts[1], 10) - 1;
            const dobDay = parseInt(parts[2], 10);

            if (dobDay === currentDay && dobMonth === currentMonth) {
                isBirthday = true;
            }
        }

        // Check Anniversary
        if (!isBirthday && user.joiningDate) { 
            const dojString = typeof user.joiningDate === 'string' ? user.joiningDate.split('T')[0] : new Date(user.joiningDate).toISOString().split('T')[0];
            const parts = dojString.split('-');
            const dojYear = parseInt(parts[0], 10);
            const dojMonth = parseInt(parts[1], 10) - 1;
            const dojDay = parseInt(parts[2], 10);

            if (dojDay === currentDay && dojMonth === currentMonth && dojYear < currentYear) {
                isAnniversary = true;
            }
        }

        if (isBirthday) {
            setWishType('birthday');
            setIsOpen(true);
        } else if (isAnniversary) {
            setWishType('anniversary');
            setIsOpen(true);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen && wishType) {
            fetchGreetingCard(wishType);
        }
    }, [isOpen, wishType]);

    const fetchGreetingCard = async (type) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token") || document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
            const response = await axios.get(`http://localhost:8008/api/user/greeting-card?type=${type}`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.data.success) {
                // Ensure the URL is absolute if it's relative
                const url = response.data.url.startsWith('http') 
                    ? response.data.url 
                    : `http://localhost:8008${response.data.url}`;
                setCardUrl(url);
            }
        } catch (error) {
            console.error("Failed to load greeting card", error);
            // Fallback just close it or handle error
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden animate-bounce-in max-w-4xl w-full">
                {/* Close button */}
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10 backdrop-blur-md"
                >
                    <X size={24} />
                </button>

                <div className="w-full flex items-center justify-center min-h-[400px] bg-gray-50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-4 text-indigo-600">
                            <Loader2 className="animate-spin" size={48} />
                            <p className="text-lg font-medium animate-pulse">Preparing your special greeting...</p>
                        </div>
                    ) : cardUrl ? (
                        <img 
                            src={cardUrl} 
                            alt={`${wishType} Greeting`} 
                            className="w-full h-auto object-contain max-h-[80vh]"
                        />
                    ) : (
                        <div className="text-center p-8">
                            <p className="text-xl text-gray-500">Could not load greeting card.</p>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.8); opacity: 0; }
                    60% { transform: scale(1.02); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.26, 1.55) forwards;
                }
            `}</style>
        </div>
    );
};

export default WishesModal;
