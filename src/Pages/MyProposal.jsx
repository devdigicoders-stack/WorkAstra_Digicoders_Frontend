import React from "react";
import { useStore } from "../context/StoreContext";
import { FileText, AlertCircle } from "lucide-react";

const MyProposal = () => {
    const { user } = useStore();

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">My Final Proposal</h1>
                    <p className="text-gray-500 text-sm mt-1">View and download your finalized project proposal.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-sm">
                    {user?.finalProposal?.url ? (
                        <div className="flex flex-col items-center text-center max-w-md mx-auto">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <FileText size={40} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Project Proposal Document</h2>
                            <p className="text-gray-500 text-sm mb-8">
                                This document contains all the finalized details, scope, and terms of your project. 
                                Please keep it for your records.
                            </p>
                            
                            <a 
                                href={user.finalProposal.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition shadow-sm"
                            >
                                <FileText size={18} />
                                View Full Document
                            </a>
                            
                            <p className="text-xs text-gray-400 mt-6">
                                Uploaded securely via Workastra
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
                            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">No Proposal Found</h2>
                            <p className="text-gray-500 text-sm">
                                We haven't uploaded a final proposal to your account yet. 
                                Please contact your project manager if you believe this is an error.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyProposal;
