import { useState, useEffect } from "react";
import { getQuoteHTML } from "../services/quoteService";

export default function QuoteDocumentView({ quote }) {
    const [html, setHtml] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!quote?._id) return;

        setLoading(true);
        getQuoteHTML(quote._id)
            .then((res) => {
                setHtml(res);
                setError("");
            })
            .catch((err) => {
                console.error("Failed to load quote HTML:", err);
                setError("Failed to load document preview. Please try again.");
            })
            .finally(() => setLoading(false));
    }, [quote?._id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-slate-50 border rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600 font-medium">Loading document preview...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 border border-red-200 rounded-xl">
                {error}
            </div>
        );
    }

    return (
        <div className="bg-slate-100 border border-slate-300 rounded-xl overflow-hidden h-[1100px] w-full shadow-inner relative flex flex-col">
            {/* Toolbar / Header */}
            <div className="bg-slate-800 text-slate-200 text-xs px-4 py-2 flex justify-between items-center shrink-0">
                <span>Document Preview (A4 Format)</span>
                <span>Exact Replica of PDF</span>
            </div>

            {/* The iframe container with flex-1 to fill the remaining height */}
            <div className="flex-1 w-full bg-slate-50 overflow-hidden">
                <iframe
                    title="Quote Preview"
                    srcDoc={html}
                    className="w-full h-full border-0"
                    style={{ backgroundColor: "white" }}
                />
            </div>
        </div>
    );
}
