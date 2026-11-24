import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Download, AlertCircle, RefreshCw } from "lucide-react";
import api from "../../../services/axios";

// Configure pdfjs worker to use local bundle or CDN fallback
try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();
} catch (e) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export default function OfferLetterViewer({ 
    userId, 
    myOfferLetter = false, 
    employeeName = "Employee" 
}) {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(() => 
        typeof window !== "undefined" ? Math.min(window.innerWidth - 32, 800) : 800
    );

    const containerRef = useRef(null);

    // Track container width for responsive scaling on mobile & desktop
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);
        const observer = new ResizeObserver(updateWidth);
        observer.observe(containerRef.current);

        return () => {
            window.removeEventListener("resize", updateWidth);
            observer.disconnect();
        };
    }, []);

    // Fetch PDF blob
    const fetchOfferLetterPdf = async () => {
        if (!userId && !myOfferLetter) return;
        setLoading(true);
        setError(null);
        try {
            const endpoint = myOfferLetter
                ? `/api/onboarding/my-offer-letter/download`
                : `/api/onboarding/user-offer-letter/${userId}/download`;

            const res = await api.get(endpoint, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            setPdfBlob(blob);
            setPdfBlobUrl(url);
        } catch (err) {
            console.error("Error loading offer letter PDF:", err);
            let message = "Could not load offer letter preview.";
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const parsed = JSON.parse(text);
                    if (parsed.message) message = parsed.message;
                } catch (_) {}
            } else if (err.response?.data?.message) {
                message = err.response.data.message;
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOfferLetterPdf();
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [userId, myOfferLetter]);

    const handleDownload = () => {
        if (!pdfBlobUrl && !pdfBlob) return;
        const link = document.createElement("a");
        link.href = pdfBlobUrl;
        const cleanName = employeeName.replace(/[^a-zA-Z0-9_-]/g, "_");
        link.setAttribute("download", `${cleanName}_Offer_Letter.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Responsive width calculation:
    // Auto-fit seamlessly on mobile screens (< 640px) and cap at standard 800px on desktop
    const getRenderWidth = () => {
        if (!containerWidth) return 600;
        const padding = containerWidth < 640 ? 16 : 48;
        const availableWidth = Math.max(containerWidth - padding, 260);
        return Math.min(availableWidth, 800);
    };

    return (
        <div className="w-full flex flex-col" ref={containerRef}>
            {/* Download Button Only */}
            <div className="flex justify-end mb-3">
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={loading || !!error}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition cursor-pointer"
                >
                    <Download size={16} />
                    <span>Download Official PDF</span>
                </button>
            </div>

            {/* Main Viewer Canvas Area */}
            <div className="bg-gray-100/80 border border-gray-200/90 rounded-2xl p-2 sm:p-6 min-h-[450px] flex flex-col items-center justify-center overflow-x-auto shadow-inner relative">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <h4 className="text-sm font-semibold text-gray-700">Loading Offer Letter Document...</h4>
                        <p className="text-xs text-gray-400 mt-1">Preparing high-resolution PDF view</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                            <AlertCircle size={28} />
                        </div>
                        <h4 className="text-base font-bold text-gray-800 mb-1">
                            Offer Letter Unavailable
                        </h4>
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={fetchOfferLetterPdf}
                            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-xl shadow cursor-pointer transition"
                        >
                            <RefreshCw size={14} /> Retry Loading
                        </button>
                    </div>
                )}

                {!loading && !error && pdfBlobUrl && (
                    <Document
                        file={pdfBlobUrl}
                        onLoadSuccess={({ numPages: total }) => setNumPages(total)}
                        loading={
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                                <span className="text-xs text-gray-500 font-medium">Rendering PDF pages...</span>
                            </div>
                        }
                        error={
                            <div className="text-center py-8 text-xs text-red-500">
                                Failed to render PDF document. Please try downloading directly.
                            </div>
                        }
                        className="flex flex-col items-center gap-6 max-w-full"
                    >
                        {Array.from(new Array(numPages || 1), (el, index) => (
                            <div
                                key={`offer_letter_page_${index + 1}`}
                                className="bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden transition-all duration-200 hover:shadow-xl max-w-full flex flex-col items-center"
                            >
                                <Page
                                    pageNumber={index + 1}
                                    width={getRenderWidth()}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    loading={
                                        <div className="w-full h-96 flex items-center justify-center text-xs text-gray-400 bg-white">
                                            Loading Page {index + 1}...
                                        </div>
                                    }
                                />
                                {numPages > 1 && (
                                    <div className="w-full bg-gray-50/90 border-t border-gray-100 py-1.5 px-4 text-center text-[11px] font-medium text-gray-400">
                                        Page {index + 1} of {numPages}
                                    </div>
                                )}
                            </div>
                        ))}
                    </Document>
                )}
            </div>
        </div>
    );
}
