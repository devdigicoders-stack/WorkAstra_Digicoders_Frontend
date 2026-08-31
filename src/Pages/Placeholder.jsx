import React from 'react';
import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';

const Placeholder = () => {
    const location = useLocation();
    
    // Convert pathname to a readable title (e.g. /employee-id-gen -> Employee Id Gen)
    const pageName = location.pathname
        .replace('/', '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'This Page';

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] bg-slate-50/50 rounded-2xl border border-slate-100 m-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Hammer size={32} className="text-blue-500 animate-bounce" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Hello! 👋</h1>
            <p className="text-slate-500 text-center max-w-md">
                The <span className="font-semibold text-slate-700">{pageName}</span> page is currently under construction. Please check back later once it's built!
            </p>
        </div>
    );
};

export default Placeholder;
