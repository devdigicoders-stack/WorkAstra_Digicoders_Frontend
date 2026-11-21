import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const downloadPaymentReceiptPdf = async (payment, company) => {
    if (!payment) return false;

    const receiptNo = `DC-RCP-${(payment._id || "").toString().slice(-8).toUpperCase()}`;
    const issueDate = payment.reviewedAt ? new Date(payment.reviewedAt) : new Date(payment.createdAt || Date.now());
    const formattedDate = issueDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const formattedTime = issueDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    const client = payment.userId || {};
    const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Shivam upaday";
    const clientEmail = client.email || "—";
    const clientPhone = client.phone || "—";

    const project = payment.projectId || {};
    const projectName = project.name || "Custom Project";
    const projectPrice = Number(project.price) || 0;
    const projectReceived = Number(project.receivedAmount) || Number(payment.amount) || 0;
    const projectBalance = Math.max(0, projectPrice - projectReceived);

    const verifiedBy = payment.reviewedBy 
        ? `${payment.reviewedBy.firstName || ""} ${payment.reviewedBy.lastName || ""}`.trim() 
        : "Gopal Singh";
    const verifiedDate = formattedDate;

    const transactionId = payment.transactionId || "N/A";
    const remark = payment.remark ? payment.remark.trim() : "";
    const amountFormatted = fmt(payment.amount);

    // Create a temporary hidden container with exact A4 proportions (794px x 1123px)
    const host = document.createElement("div");
    Object.assign(host.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "794px",
        height: "1123px",
        maxHeight: "1123px",
        background: "#ffffff",
        zIndex: "-1000",
        overflow: "hidden",
        boxSizing: "border-box"
    });

    host.innerHTML = `
        <div style="width:794px;height:1123px;position:relative;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-sizing:border-box;">
            
            <!-- Top-Left Green Curve Swoosh -->
            <svg viewBox="0 0 160 85" style="position:absolute;top:0;left:0;width:170px;height:90px;z-index:0;display:block;" preserveAspectRatio="none">
                <path d="M0,0 L160,0 C95,50 35,85 0,85 Z" fill="#047857" opacity="0.88" />
                <path d="M0,0 L110,0 C60,35 20,65 0,65 Z" fill="#059669" />
            </svg>

            <!-- Main Content Container -->
            <div style="padding:26px 36px 0 36px;position:relative;z-index:10;flex:1;display:flex;flex-direction:column;box-sizing:border-box;">
                
                <!-- Header: Logo & Receipt Meta -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <!-- Logo -->
                    <div style="padding-left:36px;">
                        <div style="display:flex;align-items:baseline;line-height:1;">
                            <span style="font-size:36px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">Digi</span>
                            <span style="font-size:36px;font-weight:700;color:#ea580c;line-height:1;">&#123;</span>
                            <span style="font-size:36px;font-weight:800;color:#059669;letter-spacing:-0.5px;">Coders</span>
                            <span style="font-size:36px;font-weight:700;color:#ea580c;line-height:1;">&#125;</span>
                            <span style="font-size:10px;font-weight:800;color:#0f172a;vertical-align:super;margin-left:2px;">TM</span>
                        </div>
                        <div style="font-size:11px;font-weight:700;color:#0284c7;margin-left:78px;letter-spacing:0.2px;margin-top:2px;">
                            Technologies (P) Ltd.
                        </div>
                    </div>

                    <!-- Right Title Meta -->
                    <div style="border-left:2px solid #cbd5e1;padding-left:20px;text-align:right;">
                        <div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1.1;">Payment Receipt</div>
                        <div style="font-size:13px;color:#1e293b;margin-top:5px;font-weight:500;">
                            Receipt No: <strong style="color:#0f172a;font-weight:800;">${receiptNo}</strong>
                        </div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">
                            Date: ${formattedDate}, ${formattedTime}
                        </div>
                    </div>
                </div>

                <!-- Green Divider Line -->
                <div style="border-bottom:2px solid #059669;margin-bottom:18px;"></div>

                <!-- Payment Successful Banner -->
                <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:20px;">
                    <div style="width:48px;height:48px;border-radius:50%;background:#059669;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(5,150,105,0.25);">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div style="border-left:2px solid #059669;padding-left:14px;">
                        <div style="font-size:24px;font-weight:800;color:#065f46;line-height:1.2;">Payment Successful!</div>
                        <div style="font-size:13px;color:#334155;font-weight:500;margin-top:2px;">Thank you for your payment.</div>
                    </div>
                </div>

                <!-- Info Cards: Client Details & Project Summary -->
                <div style="display:flex;gap:16px;margin-bottom:18px;">
                    
                    <!-- Client Details Card -->
                    <div style="flex:1;background:#f2faf5;border:1px solid #a7f3d0;border-radius:14px;padding:12px 16px;">
                        <div style="display:flex;align-items:center;gap:8px;color:#065f46;font-size:14px;font-weight:800;margin-bottom:10px;">
                            <div style="width:22px;height:22px;border-radius:50%;background:#059669;color:#ffffff;display:flex;align-items:center;justify-content:center;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <span>Client Details</span>
                        </div>
                        <table style="width:100%;font-size:12px;border-collapse:collapse;">
                            <tr>
                                <td style="width:34%;color:#475569;font-weight:600;padding:3px 0;">Client Name</td>
                                <td style="width:6%;color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="width:60%;color:#0f172a;font-weight:800;">${clientName}</td>
                            </tr>
                            <tr>
                                <td style="color:#475569;font-weight:600;padding:3px 0;">Email</td>
                                <td style="color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="color:#1e293b;font-weight:500;">${clientEmail}</td>
                            </tr>
                            <tr>
                                <td style="color:#475569;font-weight:600;padding:3px 0;">Contact</td>
                                <td style="color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="color:#1e293b;font-weight:500;">${clientPhone}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Project Summary Card -->
                    <div style="flex:1;background:#f2faf5;border:1px solid #a7f3d0;border-radius:14px;padding:12px 16px;">
                        <div style="display:flex;align-items:center;gap:8px;color:#065f46;font-size:14px;font-weight:800;margin-bottom:10px;">
                            <div style="width:22px;height:22px;border-radius:4px;background:#059669;color:#ffffff;display:flex;align-items:center;justify-content:center;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                            </div>
                            <span>Project Summary</span>
                        </div>
                        <table style="width:100%;font-size:12px;border-collapse:collapse;">
                            <tr>
                                <td style="width:50%;color:#475569;font-weight:600;padding:3px 0;">Project Name</td>
                                <td style="width:6%;color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="width:44%;color:#0f172a;font-weight:800;">${projectName}</td>
                            </tr>
                            <tr>
                                <td style="color:#475569;font-weight:600;padding:3px 0;">Total Project Value</td>
                                <td style="color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="color:#0f172a;font-weight:800;">${projectPrice > 0 ? fmt(projectPrice) : "—"}</td>
                            </tr>
                            <tr>
                                <td style="color:#475569;font-weight:600;padding:3px 0;">Total Received So Far</td>
                                <td style="color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="color:#047857;font-weight:800;">${projectReceived > 0 ? fmt(projectReceived) : amountFormatted}</td>
                            </tr>
                            <tr>
                                <td style="color:#475569;font-weight:600;padding:3px 0;">Remaining Balance</td>
                                <td style="color:#475569;font-weight:700;text-align:center;">:</td>
                                <td style="color:#0f172a;font-weight:800;">${projectPrice > 0 ? fmt(projectBalance) : "—"}</td>
                            </tr>
                        </table>
                    </div>

                </div>

                <!-- Breakdown Table -->
                <div style="border:1px solid #6ee7b7;border-radius:10px;overflow:hidden;margin-bottom:18px;">
                    <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
                        <thead>
                            <tr style="background:#047857;color:#ffffff;font-size:12px;font-weight:700;">
                                <th style="padding:9px 14px;border:none;">Description</th>
                                <th style="padding:9px 14px;text-align:center;border:none;">Reference / UTR ID</th>
                                <th style="padding:9px 14px;text-align:center;border:none;">Payment Mode</th>
                                <th style="padding:9px 14px;text-align:right;border:none;">Amount Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="background:#ffffff;color:#1e293b;">
                                <td style="padding:11px 14px;font-weight:600;">
                                    ${projectName ? `Project Milestone Payment – ${projectName}` : "Project Milestone Payment"}
                                    ${remark ? `<div style="font-size:11px;color:#64748b;font-weight:400;font-style:italic;margin-top:2px;">Note: ${remark}</div>` : ""}
                                </td>
                                <td style="padding:11px 14px;text-align:center;font-family:monospace;font-weight:700;color:#0f172a;font-size:13px;">
                                    ${transactionId}
                                </td>
                                <td style="padding:11px 14px;text-align:center;color:#334155;">
                                    UPI / Online Transfer
                                </td>
                                <td style="padding:11px 14px;text-align:right;font-size:15px;font-weight:800;color:#047857;">
                                    ${amountFormatted}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Amount Credited & Verified Highlight Box -->
                <div style="background:#ecfbf2;border:1.5px solid #86efac;border-radius:14px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:38px;height:38px;border-radius:50%;background:#059669;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(5,150,105,0.25);">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <div>
                            <div style="font-size:16px;font-weight:800;color:#065f46;">Amount Credited & Verified</div>
                            <div style="font-size:11px;color:#475569;margin-top:2px;font-weight:500;">
                                Verified by: <strong style="color:#0f172a;">${verifiedBy}</strong> on ${verifiedDate}
                            </div>
                        </div>
                    </div>

                    <div style="border-left:2px solid #86efac;height:40px;margin:0 12px;"></div>

                    <div style="font-size:32px;font-weight:900;color:#047857;letter-spacing:-0.5px;">
                        ${amountFormatted}
                    </div>
                </div>

                <!-- Terms & Conditions + Authorized Signatory -->
                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;">
                    <!-- Terms -->
                    <div style="max-width:440px;">
                        <div style="font-size:12px;font-weight:800;color:#065f46;margin-bottom:5px;">Terms & Conditions:</div>
                        <ol style="font-size:11px;color:#475569;margin:0;padding-left:16px;line-height:1.6;">
                            <li>This is a computer-generated receipt issued by DigiCoders Private Limited.</li>
                            <li>All payments are subject to real-time bank realization.</li>
                            <li>For any payment queries, contact us at accounts@digicoders.in.</li>
                        </ol>
                    </div>

                    <!-- Signatory -->
                    <div style="text-align:center;min-width:180px;">
                        <div style="height:44px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
                            <svg width="135" height="40" viewBox="0 0 150 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 32 C20 12, 30 8, 42 22 C48 30, 56 34, 65 24 C72 17, 80 26, 90 22 C102 18, 120 12, 142 18" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M34 24 C50 14, 68 38, 82 22" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M10 40 C45 38, 95 37, 145 39" stroke="#047857" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div style="border-top:1.5px solid #047857;width:150px;margin:2px auto 3px auto;"></div>
                        <div style="font-size:11px;font-weight:800;color:#064e3b;letter-spacing:0.5px;text-transform:uppercase;">Authorized Signatory</div>
                        <div style="font-size:10px;color:#64748b;font-weight:500;">DigiCoders Accounts & Finance</div>
                    </div>
                </div>

                <!-- Footer URL -->
                <div style="border-top:1px solid #cbd5e1;padding:8px 0;font-size:11px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;margin-top:auto;">
                    <div style="display:flex;align-items:center;gap:4px;color:#334155;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <span>www.digicoders.in</span>
                    </div>
                    <span style="color:#047857;font-weight:800;">|</span>
                    <span>DigiCoders Private Limited</span>
                </div>

            </div>

            <!-- Bottom Forest Green Waves -->
            <div style="width:794px;overflow:hidden;line-height:0;display:block;margin-top:-2px;">
                <svg viewBox="0 0 800 70" style="width:794px;height:55px;display:block;" preserveAspectRatio="none">
                    <path d="M0,35 C240,75 520,5 800,35 L800,70 L0,70 Z" fill="#047857" opacity="0.45" />
                    <path d="M0,45 C280,15 560,70 800,40 L800,70 L0,70 Z" fill="#059669" />
                </svg>
            </div>

        </div>
    `;

    document.body.appendChild(host);

    try {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 200));

        const canvas = await html2canvas(host, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 794,
            height: 1123,
            windowWidth: 794,
            windowHeight: 1123,
            logging: false
        });

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

        const safeFilename = `Payment_Receipt_${transactionId.replace(/[^a-zA-Z0-9_-]/g, "_") || receiptNo}.pdf`;
        pdf.save(safeFilename);
        return true;
    } catch (err) {
        console.error("Payment Receipt PDF generation error:", err);
        throw err;
    } finally {
        if (host && host.parentNode) {
            host.parentNode.removeChild(host);
        }
    }
};
