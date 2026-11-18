import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Dimensions for A4 at 96 DPI
const A4_W_PX = 794;
const A4_H_PX = 1123;

const loadImageAsDataUrl = async (src) => {
    if (!src) return null;
    if (src.startsWith('data:')) return src;
    try {
        const abs = src.startsWith('http')
            ? src
            : `${window.location.origin}${src.startsWith('/') ? '' : '/'}${src}`;
        const res = await fetch(abs, { mode: 'cors' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

const getLogoDataUrl = async (companyIconUrl) => {
    // 1. First priority: offerlatter.png from public
    let data = await loadImageAsDataUrl('/offerlatter.png');
    if (data) return data;

    // 2. Second: user.companyId?.icon?.url
    if (companyIconUrl) {
        data = await loadImageAsDataUrl(companyIconUrl);
        if (data) return data;
    }

    // 3. Fallbacks
    data = await loadImageAsDataUrl('/logo1.png');
    if (data) return data;

    data = await loadImageAsDataUrl('/DigiCoders Transparent Logo (2).png');
    if (data) return data;

    return '/offerlatter.png';
};

const numberToWords = (num) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
};

export const generateSalarySlipsClientPDF = async ({ user, resignation, payrollRuns }) => {
    const employeeName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const employeeId = user.employeeCode || 'N/A';
    const designation = user.designation?.name || user.role?.name || 'Employee';
    const companyName = user.companyId?.name || 'DigiCoders Technologies Pvt. Ltd.';

    // Preload logo (offerlatter.png) and stamp
    const [logoDataUrl, stampDataUrl] = await Promise.all([
        getLogoDataUrl(user.companyId?.icon?.url),
        loadImageAsDataUrl('/themas.png')
    ]);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${A4_W_PX}px`;
    container.style.background = '#ffffff';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    try {
        const runsToProcess = payrollRuns && payrollRuns.length > 0 ? payrollRuns : [{
            month: new Date().toISOString().slice(0, 7),
            components: [{ name: 'Basic', type: 'earning', amount: 0 }],
            grossEarnings: 0,
            totalDeductions: 0,
            netSalary: 0
        }];

        for (let i = 0; i < runsToProcess.length; i++) {
            const run = runsToProcess[i];
            const [year, monthStr] = run.month.split('-');
            const dateObj = new Date(year, Number(monthStr) - 1);
            const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
            const displayMonthYear = `${monthName} ${year}`;
            const shortDisplayMonthYear = `${monthName}-${year}`;

            const earnings = run.components?.filter(c => c.type === 'earning') || [];
            const getComponentAmount = (arr, nameKeywords) => {
                const comp = arr.find(c => nameKeywords.some(kw => c.name.toLowerCase().includes(kw)));
                return comp ? comp.amount.toFixed(2) : '0.00';
            };

            const basic = getComponentAmount(earnings, ['basic']);
            const hra = getComponentAmount(earnings, ['hra', 'house rent']);
            const conveyance = getComponentAmount(earnings, ['conveyance', 'transport']);
            const medical = getComponentAmount(earnings, ['medical']);
            const special = getComponentAmount(earnings, ['special']);
            const incentives = getComponentAmount(earnings, ['incentive', 'bonus']);

            const grossEarningsStr = run.grossEarnings > 0 ? run.grossEarnings.toFixed(2) : '0.00';
            const totalDeductionsStr = run.totalDeductions > 0 ? run.totalDeductions.toFixed(2) : '0.00';
            const netSalaryStr = run.netSalary > 0 ? run.netSalary.toFixed(2) : '0.00';

            const words = numberToWords(Math.floor(run.netSalary || 0));
            const netSalaryWords = words ? `${words.charAt(0).toUpperCase() + words.slice(1)} Rupees Only/-` : 'Zero Rupees Only/-';

            const logoHtml = `<div style="width: 100%; display: flex; justify-content: center; align-items: center; text-align: center; margin-bottom: 10px;">
                <img src="${logoDataUrl || '/offerlatter.png'}" alt="DigiCoders Logo" style="height: 65px; max-width: 280px; display: block; margin: 0 auto; object-fit: contain;" />
            </div>`;

            const stampHtml = stampDataUrl
                ? `<img src="${stampDataUrl}" style="width: 180px; height: auto; margin-bottom: 0px; object-fit: contain;" />`
                : `<div style="width: 100px; height: 100px; border: 2px solid #555; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #555; font-weight: bold; font-size: 11px; transform: rotate(-15deg); margin: 0 auto 10px auto; text-align: center; line-height: 1.3; opacity: 0.7;">${companyName.replace(/ /g, '<br>')}<br>(Placeholder)</div>`;

            container.innerHTML = `
                <div style="width: ${A4_W_PX}px; min-height: ${A4_H_PX}px; padding: 60px 80px; box-sizing: border-box; background: #fff; font-family: Arial, sans-serif; color: #000; position: relative;">
                    <div style="text-align: center; margin-bottom: 10px;">
                        ${logoHtml}
                    </div>
                    
                    <div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 30px;">
                        Pay Slip for the Month – ${displayMonthYear}
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; width: 40%;">Name of the Employee</td>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">${employeeName}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px;">Employee ID</td>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">${employeeId}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px;">Designation</td>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">${designation}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px;">Salary for the month of</td>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">${shortDisplayMonthYear}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 9px 10px; background-color: #fff; font-weight: bold; width: 35%; text-align: left;">Particulars</th>
                                <th style="border: 1px solid #000; padding: 9px 10px; background-color: #fff; font-weight: bold; width: 25%; text-align: left;">Gross Salary</th>
                                <th style="border: 1px solid #000; padding: 9px 10px; background-color: #fff; font-weight: bold; width: 20%; text-align: left;">Earnings</th>
                                <th style="border: 1px solid #000; padding: 9px 10px; background-color: #fff; font-weight: bold; width: 20%; text-align: left;">Deductions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">Basic</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${grossEarningsStr}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${basic !== '0.00' ? basic : grossEarningsStr}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">0.00</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">HRA</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;"></td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${hra}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">0.00</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">Conveyance Allowance</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;"></td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${conveyance}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">0.00</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">Medical Allowance</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;"></td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${medical}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">0.00</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">Special Allowance</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;"></td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${special}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">0.00</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">Incentives</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;"></td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${incentives}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">0.00</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">Amount in Rs</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${grossEarningsStr}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${grossEarningsStr}</td>
                                <td style="border: 1px solid #000; padding: 9px 10px;">${totalDeductionsStr}</td>
                            </tr>
                            <tr>
                                <td colspan="3" style="border: 1px solid #000; padding: 9px 10px; text-align: right; font-weight: bold;">Net Salary</td>
                                <td style="border: 1px solid #000; padding: 9px 10px; font-weight: bold;">${netSalaryStr} INR</td>
                            </tr>
                            <tr>
                                <td colspan="4" style="border: 1px solid #000; padding: 9px 10px; text-align: center; font-weight: bold; text-transform: capitalize;">Net Salary: ${netSalaryWords}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 40px; display: flex; justify-content: flex-end; text-align: center; padding-right: 20px;">
                        <div style="width: 200px;">
                            ${stampHtml}
                            <div style="font-weight: bold; font-size: 14px;">Authorized Signatory</div>
                        </div>
                    </div>
                </div>
            `;

            // Wait for paint
            await new Promise((resolve) => setTimeout(resolve, 80));

            const canvas = await html2canvas(container.firstElementChild, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: A4_W_PX,
                windowWidth: A4_W_PX,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);

            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }

        const fileName = `${employeeName.replace(/\s+/g, '_')}_3Months_Salary_Slip.pdf`;
        pdf.save(fileName);
        return true;
    } finally {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
};

export const generateExperienceLetterClientPDF = async ({ user, resignation }) => {
    const startDate = user.joiningDate ? new Date(user.joiningDate) : new Date(user.createdAt || Date.now());
    const endDate = resignation.approvedLastWorkingDay ? new Date(resignation.approvedLastWorkingDay) : (resignation.requestedLastWorkingDay ? new Date(resignation.requestedLastWorkingDay) : new Date());

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'long' });
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    months -= startDate.getMonth();
    months += endDate.getMonth();
    if (months <= 0) months = 1;

    let durationText = `${months < 10 ? '0' + months : months} months`;
    if (months >= 12) {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (remainingMonths === 0) {
            durationText = `${years < 10 ? '0' + years : years} years`;
        } else {
            durationText = `${years < 10 ? '0' + years : years} years and ${remainingMonths < 10 ? '0' + remainingMonths : remainingMonths} months`;
        }
    }

    const employeeName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const designation = user.designation?.name || user.role?.name || 'Employee';
    const companyName = user.companyId?.name || 'DigiCoders Technologies Private Limited';

    // Preload logo (offerlatter.png) and stamp
    const [logoDataUrl, stampDataUrl] = await Promise.all([
        getLogoDataUrl(user.companyId?.icon?.url),
        loadImageAsDataUrl('/themas.png')
    ]);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${A4_W_PX}px`;
    container.style.background = '#ffffff';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    try {
        const logoHtml = `<div style="width: 100%; display: flex; justify-content: center; align-items: center; text-align: center; margin-bottom: 15px;">
            <img src="${logoDataUrl || '/offerlatter.png'}" alt="DigiCoders Logo" style="height: 65px; max-width: 280px; display: block; margin: 0 auto; object-fit: contain;" />
        </div>`;

        const stampHtml = stampDataUrl
            ? `<img src="${stampDataUrl}" style="width: 180px; height: auto; margin-bottom: 0px; object-fit: contain;" />`
            : `<div style="width: 120px; height: 120px; border: 2px solid #555; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #555; font-weight: bold; font-size: 12px; transform: rotate(-15deg); margin-bottom: 10px; text-align: center; line-height: 1.3; opacity: 0.7;">${companyName.replace(/ /g, '<br>')}<br>(Placeholder)</div>`;

        container.innerHTML = `
            <div style="width: ${A4_W_PX}px; min-height: ${A4_H_PX}px; padding: 60px 80px; box-sizing: border-box; background: #fff; font-family: Arial, sans-serif; color: #000; position: relative;">
                <div style="text-align: center; margin-bottom: 20px;">
                    ${logoHtml}
                </div>
                <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">
                    Experience Letter
                </div>
                <div style="text-align: justify; font-size: 14.5px; line-height: 1.6;">
                    <p style="margin-bottom: 20px;">This is to certify that <span style="font-weight: bold;">${employeeName}</span>, has worked as <span style="font-weight: bold;">${designation}</span> with this company for the period of <span style="font-weight: bold;">${durationText}</span> from <span style="font-weight: bold;">${formattedStartDate}</span> to <span style="font-weight: bold;">${formattedEndDate}</span>.</p>
                
                    <p style="margin-bottom: 20px;">During his tenure she/he was responsible for monitoring day to day functions of the Project, supervising and guiding the project team, monitoring and evaluating the progress. She/he was actively involved in the day-to-day administration of the activities, appraisal of team performance, coordinating and managing the overall performance of the team. She/he was also responsible for managing the Projects and Supervised the Complete Project. Her/his technical skill and performance is to the best of our satisfaction.</p>
                
                    <p style="margin-bottom: 20px;">We are sure she/he will perform her/his duties with this experience in her/his future jobs and we are happy to recommend her/him for any responsible position in relevant field. We wish her/him all the best.</p>
                
                    <div style="margin-top: 30px; font-size: 14px; line-height: 1.5;">
                        Company Name – ${companyName}<br>
                        Designation – ${designation}
                    </div>
                
                    <div style="margin-top: 20px; font-size: 14px; line-height: 1.5;">
                        Experience:<br>
                        Start date – ${formattedStartDate}<br>
                        End Date – ${formattedEndDate}
                    </div>
                </div>
            
                <div style="margin-top: 35px; display: flex; justify-content: flex-end; text-align: right; position: relative;">
                    <div style="text-align: center; width: 250px;">
                        ${stampHtml}
                        <div style="font-weight: bold; font-size: 15px; margin-bottom: 5px; margin-top: 5px;">Mr. Himanshu Kashyap</div>
                        <div style="font-weight: bold; font-size: 15px;">Manager</div>
                    </div>
                </div>
            </div>
        `;

        await new Promise((resolve) => setTimeout(resolve, 80));

        const canvas = await html2canvas(container.firstElementChild, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: A4_W_PX,
            windowWidth: A4_W_PX,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

        const fileName = `${employeeName.replace(/\s+/g, '_')}_Experience_Letter.pdf`;
        pdf.save(fileName);
        return true;
    } finally {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
};
