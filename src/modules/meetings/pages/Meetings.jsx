import React, { useState, useEffect } from "react";
import { useStore } from "../../../context/StoreContext";
import api from "../../../services/axios";
import { ENDPOINTS } from "../../../services/endpoints";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, FileText, X } from "lucide-react";

const Meetings = () => {
    const { user } = useStore();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMeeting, setSelectedMeeting] = useState(null);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const res = await api.get(ENDPOINTS.MEETING.GET_ALL);
            if (res.data.success) {
                setMeetings(res.data.meetings || []);
            }
        } catch (error) {
            toast.error("Failed to fetch meetings");
        } finally {
            setLoading(false);
        }
    };

    // Calendar Logic
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay, year, month };
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const today = () => setCurrentDate(new Date());

    const { days, firstDay, year, month } = getDaysInMonth(currentDate);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Prepare grid cells
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
        cells.push({ empty: true, key: `empty-${i}` });
    }
    for (let i = 1; i <= days; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Find meetings for this day
        const dayMeetings = meetings.filter(m => {
            if (!m.date) return false;
            const mDate = new Date(m.date);
            return mDate.getFullYear() === year && mDate.getMonth() === month && mDate.getDate() === i;
        });

        cells.push({ empty: false, day: i, dateStr, meetings: dayMeetings, key: `day-${i}` });
    }

    const getStatusColor = (status) => {
        switch(status) {
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'Rescheduled': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const isToday = (day) => {
        const now = new Date();
        return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
    };

    if (loading && meetings.length === 0) {
        return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="p-6 h-full flex flex-col space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon size={24} className="text-blue-600" />
                        Meetings Calendar
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage all your scheduled meetings.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={today} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition cursor-pointer">
                        Today
                    </button>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition cursor-pointer">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="min-w-[120px] text-center font-bold text-gray-800">
                            {monthNames[month]} {year}
                        </span>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition cursor-pointer">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {dayNames.map(day => (
                        <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-200 gap-[1px]">
                    {cells.map((cell) => (
                        <div key={cell.key} className={`bg-white min-h-[120px] p-2 transition-colors hover:bg-gray-50 flex flex-col`}>
                            {!cell.empty && (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday(cell.day) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}`}>
                                            {cell.day}
                                        </span>
                                        {cell.meetings.length > 0 && (
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                                {cell.meetings.length} mtg
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
                                        {cell.meetings.map(meeting => (
                                            <div 
                                                key={meeting._id} 
                                                onClick={() => setSelectedMeeting(meeting)}
                                                className={`text-xs p-1.5 rounded border cursor-pointer hover:opacity-80 hover:shadow-sm transition-all truncate ${getStatusColor(meeting.status)}`}
                                                title={`${meeting.time} - ${meeting.title}`}
                                            >
                                                <div className="font-bold mb-0.5">{meeting.time}</div>
                                                <div className="font-medium truncate">{meeting.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Meeting Detail Modal */}
            {selectedMeeting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedMeeting(null)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="pr-4">
                                <h2 className="text-xl font-bold text-gray-900">{selectedMeeting.title}</h2>
                                <p className="text-sm font-medium text-blue-600 mt-1">Lead: {selectedMeeting.leadId?.orgName || 'Unknown Lead'}</p>
                            </div>
                            <button onClick={() => setSelectedMeeting(null)} className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition cursor-pointer shrink-0">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <Clock size={18} className="text-blue-500" />
                                <span className="font-medium">
                                    {new Date(selectedMeeting.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} at {selectedMeeting.time}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <MapPin size={18} className="text-red-500" />
                                <span className="font-medium">{selectedMeeting.location || 'No location specified'}</span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <User size={18} className="text-purple-500" />
                                <span className="font-medium">
                                    Assigned to: {selectedMeeting.assignedTo?.firstName} {selectedMeeting.assignedTo?.lastName}
                                </span>
                            </div>

                            <div className="flex items-start gap-3 text-sm text-gray-700">
                                <FileText size={18} className="text-orange-500 mt-0.5" />
                                <div className="font-medium bg-white p-3 rounded-lg border border-gray-200 flex-1 min-h-[80px] whitespace-pre-wrap shadow-sm text-gray-600">
                                    {selectedMeeting.notes || 'No pre-meeting notes added.'}
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-200 mt-2">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedMeeting.status)}`}>
                                    Status: {selectedMeeting.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Meetings;
