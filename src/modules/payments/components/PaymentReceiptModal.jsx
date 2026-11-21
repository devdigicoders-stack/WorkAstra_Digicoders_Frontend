import React, { useRef, useState } from "react";
import { 
    Printer, Download, X, Globe, User, FileText, Check, ShieldCheck, 
    ExternalLink, Image as ImageIcon 
} from "lucide-react";
import { getImageUrl } from "../../../utils/imageUtils";
import { downloadPaymentReceiptPdf } from "../services/paymentReceiptPdfGenerator";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentReceiptModal = ({ payment, onClose, company }) => {
    const printRef = useRef();
    const [isDownloading, setIsDownloading] = useState(false);

    if (!payment) return null;

    const receiptNo = `DC-RCP-${(payment._id || "").toString().slice(-8).toUpperCase()}`;
    const issueDate = payment.reviewedAt ? new Date(payment.reviewedAt) : new Date(payment.createdAt);
    const formattedDate = issueDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const formattedTime = issueDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    const client = payment.userId || {};
    const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Shivam upaday";
    const project = payment.projectId || {};
    const projectPrice = Number(project.price) || 0;
    const projectReceived = Number(project.receivedAmount) || Number(payment.amount) || 0;
    const projectBalance = Math.max(0, projectPrice - projectReceived);

    const verifiedBy = payment.reviewedBy 
        ? `${payment.reviewedBy.firstName || ""} ${payment.reviewedBy.lastName || ""}`.trim() 
        : "Gopal Singh";
    const verifiedDate = formattedDate;

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open("", "_blank", "width=850,height=950");
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Receipt - ${receiptNo}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        font-family: 'Segoe UI', Arial, -apple-system, sans-serif;
                        -webkit-font-smoothing: antialiased;
                    }
                    .a4-print-page {
                        width: 210mm;
                        height: 297mm;
                        max-height: 297mm;
                        margin: 0 auto;
                        position: relative;
                        background: #ffffff;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        overflow: hidden;
                        page-break-inside: avoid;
                        page-break-after: avoid;
                        page-break-before: avoid;
                    }
                    @media print {
                        html, body { width: 210mm; height: 297mm; }
                        .a4-print-page { width: 210mm; height: 297mm; max-height: 297mm; border: none; }
                    }
                </style>
            </head>
            <body>
                <div class="a4-print-page">
                    ${content}
                </div>
            </body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
    };

    const handleDownloadPdf = async () => {
        try {
            setIsDownloading(true);
            await downloadPaymentReceiptPdf(payment, company);
        } catch (err) {
            console.error("PDF download error:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
            {/* Top Floating Actions Bar */}
            <div className="fixed top-3 right-3 sm:top-4 sm:right-6 flex items-center gap-2 z-[110]">
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xl transition active:scale-95 disabled:opacity-75"
                    title="Direct Download Official DigiCoders Payment Receipt (.pdf)"
                >
                    <Download size={16} /> {isDownloading ? "Generating PDF..." : "Download .PDF"}
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xl transition active:scale-95"
                    title="Print or Save Receipt as Standard A4 PDF via Browser Print"
                >
                    <Printer size={16} /> Print
                </button>
                <button
                    onClick={onClose}
                    className="p-2 sm:p-2.5 bg-white/95 hover:bg-white text-gray-700 rounded-xl shadow-2xl transition active:scale-95"
                    title="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* A4 Sheet Modal Container */}
            <div className="w-full max-w-[794px] my-6 sm:my-12 transition-all">
                
                {/* Standard A4 Card Container (210mm x 297mm aspect ratio in desktop) */}
                <div 
                    ref={printRef} 
                    className="relative bg-white w-full max-w-[794px] min-h-[auto] md:min-h-[1050px] flex flex-col justify-between shadow-2xl rounded-2xl border border-emerald-200/80 overflow-hidden" 
                    style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
                >
                    
                    {/* Top-Left Green Curve Swoosh */}
                    <svg 
                        viewBox="0 0 160 85" 
                        className="absolute top-0 left-0 w-36 sm:w-44 h-20 pointer-events-none z-0" 
                        preserveAspectRatio="none"
                        style={{ display: "block" }}
                    >
                        <path d="M0,0 L160,0 C95,50 35,85 0,85 Z" fill="#047857" opacity="0.85" />
                        <path d="M0,0 L110,0 C60,35 20,65 0,65 Z" fill="#059669" />
                    </svg>

                    {/* Top Content Body */}
                    <div className="p-4 sm:p-7 md:p-9 pt-7 relative z-10 flex-1 flex flex-col">
                        
                        {/* Header: Logo and Receipt Meta */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3">
                            {/* DigiCoders Logo */}
                            <div className="pl-6 sm:pl-8">
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Digi</span>
                                    <span className="text-3xl sm:text-4xl font-bold text-orange-600 leading-none">&#123;</span>
                                    <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">Coders</span>
                                    <span className="text-3xl sm:text-4xl font-bold text-orange-600 leading-none">&#125;</span>
                                    <span className="text-[10px] font-bold text-slate-900 align-super ml-0.5">TM</span>
                                </div>
                                <div className="text-[11px] font-bold text-sky-600 ml-20 tracking-normal mt-[-2px]">
                                    Technologies (P) Ltd.
                                </div>
                            </div>

                            {/* Right Title Block */}
                            <div className="flex items-center gap-4 sm:border-l-2 sm:border-slate-300 sm:pl-6 text-left sm:text-right w-full sm:w-auto">
                                <div className="w-full sm:w-auto">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                                        Payment Receipt
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-800 mt-1 font-medium">
                                        Receipt No: <strong className="font-bold text-slate-900">{receiptNo}</strong>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Date: {formattedDate}, {formattedTime}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Thin Green Divider Line */}
                        <div className="border-b-2 border-emerald-600 mb-5"></div>

                        {/* Payment Successful Banner */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 my-4 sm:my-5">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                                <Check size={28} strokeWidth={3} className="sm:w-8 sm:h-8" />
                            </div>
                            <div className="border-l-2 border-emerald-600 pl-3 sm:pl-4">
                                <h2 className="text-xl sm:text-3xl font-extrabold text-emerald-800 leading-tight">
                                    Payment Successful!
                                </h2>
                                <p className="text-xs sm:text-base text-slate-700 font-medium mt-0.5">
                                    Thank you for your payment.
                                </p>
                            </div>
                        </div>

                        {/* Two Info Cards Grid: Client Details & Project Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
                            
                            {/* Client Details Box */}
                            <div className="bg-[#f2faf5] border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm sm:text-base mb-2.5">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                        <User size={12} strokeWidth={2.5} className="sm:w-3.5 sm:h-3.5" />
                                    </div>
                                    <span>Client Details</span>
                                </div>
                                <div className="space-y-1.5 text-xs sm:text-sm">
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-4 text-slate-700 font-medium">Client Name</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-7 font-bold text-slate-900 truncate">{clientName}</span>
                                    </div>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-4 text-slate-700 font-medium">Email</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-7 text-slate-800 font-normal truncate">{client.email || "—"}</span>
                                    </div>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-4 text-slate-700 font-medium">Contact</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-7 text-slate-800 font-normal">{client.phone || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Project Summary Box */}
                            <div className="bg-[#f2faf5] border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm sm:text-base mb-2.5">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                        <FileText size={12} strokeWidth={2.5} className="sm:w-3.5 sm:h-3.5" />
                                    </div>
                                    <span>Project Summary</span>
                                </div>
                                <div className="space-y-1.5 text-xs sm:text-sm">
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-6 text-slate-700 font-medium">Project Name</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-5 font-bold text-slate-900 truncate">
                                            {project.name || "Custom Project"}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-6 text-slate-700 font-medium">Total Project Value</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-5 font-bold text-slate-900">
                                            {projectPrice > 0 ? fmt(projectPrice) : "—"}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-6 text-slate-700 font-medium">Total Received So Far</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-5 font-bold text-emerald-700">
                                            {projectReceived > 0 ? fmt(projectReceived) : fmt(payment.amount)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                        <span className="col-span-6 text-slate-700 font-medium">Remaining Balance</span>
                                        <span className="col-span-1 text-center font-bold text-slate-700">:</span>
                                        <span className="col-span-5 font-bold text-slate-900">
                                            {projectPrice > 0 ? fmt(projectBalance) : "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Breakdown Table with Solid Emerald Header */}
                        <div className="border border-emerald-300 rounded-xl overflow-x-auto mb-5 shadow-xs">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
                                <thead>
                                    <tr className="bg-emerald-700 text-white font-bold text-xs sm:text-sm">
                                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold">Description</th>
                                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold">Reference / UTR ID</th>
                                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold">Payment Mode</th>
                                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-bold">Amount Paid</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-white hover:bg-slate-50 transition text-slate-800">
                                        <td className="py-3 px-3 sm:px-4 font-medium">
                                            {project.name ? `Project Milestone Payment – ${project.name}` : "Project Milestone Payment"}
                                            {payment.remark && (
                                                <p className="text-[11px] text-slate-400 font-normal italic mt-0.5">
                                                    Note: {payment.remark}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center font-mono font-semibold text-slate-900">
                                            {payment.transactionId}
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center text-slate-700">
                                            UPI / Online Transfer
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-right font-extrabold text-emerald-700 text-sm sm:text-base">
                                            {fmt(payment.amount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Amount Credited & Verified Highlight Box */}
                        <div className="bg-[#ecfbf2] border border-emerald-300 rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5 shadow-xs">
                            <div className="flex items-center gap-3 sm:gap-3.5">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <Check size={22} strokeWidth={3} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-lg font-extrabold text-emerald-800">
                                        Amount Credited & Verified
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 font-medium">
                                        Verified by: {verifiedBy} on {verifiedDate}
                                    </p>
                                </div>
                            </div>

                            <div className="hidden sm:block border-l-2 border-emerald-300/80 h-10 sm:h-12 mx-2"></div>

                            <div className="text-2xl sm:text-4xl font-black text-emerald-700 tracking-tight self-end sm:self-auto">
                                {fmt(payment.amount)}
                            </div>
                        </div>

                        {/* Terms & Conditions + Authorized Signatory */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 mb-4">
                            
                            {/* Terms */}
                            <div className="max-w-md">
                                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-800 mb-1.5">
                                    Terms & Conditions:
                                </h4>
                                <ol className="text-[11px] sm:text-xs text-slate-600 space-y-1 list-decimal pl-4 leading-relaxed font-normal">
                                    <li>This is a computer-generated receipt issued by DigiCoders Private Limited.</li>
                                    <li>All payments are subject to real-time bank realization.</li>
                                    <li>For any payment queries, contact us at accounts@digicoders.in.</li>
                                </ol>
                            </div>

                            {/* Signature Block */}
                            <div className="text-center min-w-[190px] self-end sm:self-auto">
                                <div className="h-12 sm:h-14 flex items-center justify-center mb-1">
                                    {/* Handwritten Signature SVG */}
                                    <svg width="140" height="44" viewBox="0 0 150 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path 
                                            d="M15 32 C20 12, 30 8, 42 22 C48 30, 56 34, 65 24 C72 17, 80 26, 90 22 C102 18, 120 12, 142 18" 
                                            stroke="#0f172a" 
                                            strokeWidth="2.4" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />
                                        <path 
                                            d="M34 24 C50 14, 68 38, 82 22" 
                                            stroke="#0f172a" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                        />
                                        <path 
                                            d="M10 40 C45 38, 95 37, 145 39" 
                                            stroke="#047857" 
                                            strokeWidth="1.4" 
                                            strokeLinecap="round" 
                                        />
                                    </svg>
                                </div>
                                <div className="border-t border-emerald-700 w-40 sm:w-44 mx-auto mb-1"></div>
                                <p className="text-xs sm:text-sm font-extrabold text-emerald-900 uppercase tracking-tight">
                                    Authorized Signatory
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                                    DigiCoders Accounts & Finance
                                </p>
                            </div>

                        </div>

                        {/* Footer Link & Company Name */}
                        <div className="flex items-center gap-3 pt-2.5 border-t border-slate-200 text-xs sm:text-sm font-bold text-slate-900 mt-auto">
                            <div className="flex items-center gap-1.5 text-slate-800">
                                <Globe size={15} className="text-emerald-700" />
                                <span>www.digicoders.in</span>
                            </div>
                            <span className="text-emerald-700 font-extrabold">|</span>
                            <span>DigiCoders Private Limited</span>
                        </div>

                    </div>

                    {/* Bottom Forest Green Waves */}
                    <div className="w-full overflow-hidden leading-none block -mt-1">
                        <svg 
                            viewBox="0 0 800 70" 
                            className="w-full h-12 sm:h-16 block pointer-events-none" 
                            preserveAspectRatio="none"
                        >
                            <path d="M0,35 C240,75 520,5 800,35 L800,70 L0,70 Z" fill="#047857" opacity="0.4" />
                            <path d="M0,45 C280,15 560,70 800,40 L800,70 L0,70 Z" fill="#059669" />
                        </svg>
                    </div>

                </div>

                {/* Optional Screenshot attachment preview on screen */}
                {payment.screenshot?.url && (
                    <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <ImageIcon size={15} className="text-emerald-600" />
                            <span>Client Uploaded Payment Screenshot Proof</span>
                        </div>
                        <a 
                            href={getImageUrl(payment.screenshot.url)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition"
                        >
                            <ExternalLink size={13} /> View Original Screenshot
                        </a>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PaymentReceiptModal;
