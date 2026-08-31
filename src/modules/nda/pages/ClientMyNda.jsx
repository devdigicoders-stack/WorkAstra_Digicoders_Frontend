import React, { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { toast } from "react-toastify";
import { getMySignatures } from "../../../services/ndaService";
import ClientNdaPage from "../../onboarding/pages/ClientNdaPage";

const ClientMyNda = () => {
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyNda();
    }, []);

    const fetchMyNda = async () => {
        try {
            setLoading(true);
            const res = await getMySignatures();
            if (res.success && res.signatures && res.signatures.length > 0) {
                const clientSig = res.signatures.find(s => !s.ndaId) || res.signatures[0];
                setSignature(clientSig);
            }
        } catch (error) {
            toast.error(error.message || "Failed to fetch your NDA");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!signature || !signature.signedDocumentUrl) {
        return <ClientNdaPage inPanel={true} />;
    }

    const docUrl = signature.signedDocumentUrl;

    let finalDocUrl = docUrl;
    if (finalDocUrl && finalDocUrl.includes('onrender.com') && finalDocUrl.startsWith('http://')) {
        finalDocUrl = finalDocUrl.replace('http://', 'https://');
    }

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] bg-white w-full">
            {/* Header Area */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">My Signed NDA</h2>
                        <p className="text-xs text-gray-500 mt-1">Signed on: {new Date(signature.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <a
                    href={finalDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                    <Download size={16} />
                    <span className="hidden sm:inline">Download</span>
                </a>
            </div>

            {/* Document Viewer Area */}
            <div className="flex-1 w-full bg-gray-100 p-0 md:p-4">
                <iframe 
                    src={`${finalDocUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    className="w-full h-full border border-gray-200 shadow-sm bg-white"
                    title="Signed NDA"
                ></iframe>
            </div>
        </div>
    );
};

export default ClientMyNda;
