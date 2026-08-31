import React, { useState, useEffect } from 'react';
import api from '../../../services/axios';
import { ENDPOINTS } from '../../../services/endpoints';
import { Cake, Award, Calendar, User as UserIcon } from 'lucide-react';
import { toast } from 'react-toastify';

const UpcomingEventsWidget = () => {
    const [activeTab, setActiveTab] = useState('birthdays');
    const [events, setEvents] = useState({ birthdays: [], anniversaries: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get(ENDPOINTS.USER.UPCOMING_EVENTS);
            if (res.data.success) {
                setEvents({
                    birthdays: res.data.upcomingBirthdays,
                    anniversaries: res.data.upcomingAnniversaries
                });
            }
        } catch (error) {
            console.error("Failed to fetch upcoming events", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const options = { day: 'numeric', month: 'short' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const isToday = (dateString) => {
        const d = new Date(dateString);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    };

    const currentList = activeTab === 'birthdays' ? events.birthdays : events.anniversaries;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    Upcoming Events
                </h3>
            </div>
            
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => setActiveTab('birthdays')}
                    className={`flex-1 py-2 text-[13px] font-semibold flex justify-center items-center gap-1.5 transition-colors ${activeTab === 'birthdays' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Cake size={14} /> Birthdays
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">{events.birthdays.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('anniversaries')}
                    className={`flex-1 py-2 text-[13px] font-semibold flex justify-center items-center gap-1.5 transition-colors ${activeTab === 'anniversaries' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Award size={14} /> Anniversaries
                    <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full">{events.anniversaries.length}</span>
                </button>
            </div>

            <div className="flex-1 p-2 overflow-y-auto max-h-[300px] min-h-[200px]">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : currentList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
                        {activeTab === 'birthdays' ? <Cake size={40} className="opacity-20 mb-2" /> : <Award size={40} className="opacity-20 mb-2" />}
                        <p className="text-xs font-medium">No upcoming events in next 30 days</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {currentList.map((item, index) => {
                            const today = isToday(item.date);
                            return (
                                <div key={index} className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${today ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-100 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white'}`}>
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        {item.user.profilePic?.url ? (
                                            <img src={item.user.profilePic.url} alt={item.user.firstName} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-white shadow-sm text-gray-500 font-bold text-xs">
                                                {item.user.firstName[0]}
                                            </div>
                                        )}
                                        {today && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 border border-white"></span>
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[13px] font-bold text-gray-900 truncate leading-tight">{item.user.firstName} {item.user.lastName}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Calendar size={10} className={today ? "text-orange-500" : "text-gray-400"} />
                                            <span className={`text-[10px] font-medium ${today ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
                                                {today ? 'Today' : formatDate(item.date)}
                                            </span>
                                            {activeTab === 'anniversaries' && (
                                                <>
                                                    <span className="mx-1 text-gray-300">•</span>
                                                    <span className="text-[9px] font-semibold text-purple-600 bg-purple-100 px-1 py-0.5 rounded">
                                                        {item.years} {item.years === 1 ? 'yr' : 'yrs'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingEventsWidget;
