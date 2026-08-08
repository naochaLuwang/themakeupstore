"use client"

import { FileDown } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Capacitor } from "@capacitor/core"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

interface ReceiptProps {
    order: {
        id: string;
        total: number;
        status: string;
        payment_status: string;
        created_at: string;
        profiles: any;
    }
}

export function ReceiptButton({ order }: ReceiptProps) {
    const generateReceipt = async () => {
        const doc = new jsPDF();
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        const customerName = profile?.full_name || "Guest User";

        // Header
        doc.setFontSize(20);
        doc.text("INVOICE", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Order ID: #${order.id.toUpperCase()}`, 14, 30);
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 14, 35);

        // Billing Info
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text("Billed To:", 14, 50);
        doc.setFontSize(10);
        doc.text(customerName, 14, 55);

        // Table
        autoTable(doc, {
            startY: 65,
            head: [['Description', 'Status', 'Total']],
            body: [
                ['Order Purchase', order.status.toUpperCase(), `INR ${order.total}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0] }
        });

        // Summary
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Amount: INR ${order.total}`, 14, finalY);
        doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 14, finalY + 7);

        doc.save(`Receipt-${order.id.slice(0, 8)}.pdf`);

        if (Capacitor.isNativePlatform()) {
            const fileName = `Receipt-${order.id.slice(0, 8)}.pdf`
            const pdfBase64 = doc.output("datauristring").split(",")[1]
            try {
                await Filesystem.writeFile({
                    path: `Download/${fileName}`,
                    data: pdfBase64,
                    directory: Directory.External,
                })
                await Share.share({ title: fileName, url: `file://${fileName}`, dialogTitle: "Save Receipt" })
            } catch (e) {
                console.error("File save error:", e)
            }
        }
    };

    return (
        <button
            onClick={generateReceipt}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
        >
            <FileDown className="w-4 h-4" />
        </button>
    );
}