import React, { useState, useEffect, useRef } from "react";
import { X, Download, PartyPopper } from "lucide-react";
import { getImageUrl } from "../utils/imageUtils";

const WishesModal = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [wishType, setWishType] = useState(null); // 'birthday' or 'anniversary'
    const cardRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let isBirthday = false;
        let isAnniversary = false;

        // Check Birthday
        if (user.dateOfBirth) {
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

    const handleDownload = async () => {
        try {
            const html2canvas = (await import("html2canvas")).default;
            if (cardRef.current) {
                const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
                const link = document.createElement("a");
                link.download = `${user?.firstName || "user"}_${wishType || "greeting"}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            }
        } catch (err) {
            console.error("Error downloading greeting card:", err);
        }
    };

    if (!isOpen || !user) return null;

    const userProfilePic = getImageUrl(user?.profilePic?.url) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstName || "") + " " + (user?.lastName || ""))}&background=random&size=300`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-fade-in">
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden animate-bounce-in max-w-4xl w-full border border-white/20">
                {/* Top Action Bar */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-20">
                    <button
                        onClick={handleDownload}
                        title="Download Greeting Card"
                        className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors backdrop-blur-md flex items-center gap-1.5 px-3 text-xs font-medium"
                    >
                        <Download size={15} /> <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        title="Close"
                        className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Direct Card Renderer (1200x800 Aspect Ratio) */}
                <div
                    ref={cardRef}
                    className="relative w-full aspect-[1200/800] bg-cover bg-center select-none overflow-hidden"
                    style={{ backgroundImage: `url('/birthday_template.png')` }}
                >
                    {/* Left text container */}
                    <div className="absolute top-[25%] left-[10%] w-[37.5%] text-center">
                        <div
                            className="font-black leading-tight text-[#2e7d32] mb-1 sm:mb-3 tracking-wide"
                            style={{
                                fontSize: "clamp(18px, 3.8vw, 48px)",
                                textShadow: "2px 2px 4px rgba(0,0,0,0.12)",
                            }}
                        >
                            {wishType === "anniversary" ? "Work Anniversary!" : "Happy Birthday!"}
                        </div>
                        <div
                            className="font-bold text-[#1b5e20] leading-tight"
                            style={{ fontSize: "clamp(15px, 3.2vw, 38px)" }}
                        >
                            {user.firstName} {user.lastName}
                        </div>
                    </div>

                    {/* Right profile picture container */}
                    <div
                        className="absolute top-[15.25%] right-[15.17%] w-[26.25%] aspect-square rounded-full overflow-hidden flex items-center justify-center bg-white shadow-xl border-2 border-white/60"
                    >
                        <img
                            src={userProfilePic}
                            alt="Profile"
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstName || "") + " " + (user?.lastName || ""))}&background=random&size=300`;
                            }}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.85); opacity: 0; }
                    60% { transform: scale(1.02); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.26, 1.55) forwards;
                }
            `}</style>
        </div>
    );
};

export default WishesModal;
