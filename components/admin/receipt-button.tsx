"use client"

import { FileDown } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Capacitor } from "@capacitor/core"
import { toast } from "sonner"

interface ReceiptProps {
    order: {
        id: string;
        total: number;
        status: string;
        payment_status: string;
        created_at: string;
        profiles: { full_name?: string | null } | { full_name?: string | null }[] | null;
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
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Amount: INR ${order.total}`, 14, finalY);
        doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 14, finalY + 7);

        if (Capacitor.getPlatform() === 'android') {
            try {
                const { shareAndroidReceipt } = await import('@/lib/android-receipt')
                await shareAndroidReceipt(`Receipt-${order.id.slice(0, 8)}.pdf`, doc.output('datauristring').split(',')[1])
            } catch {
                toast.error('Unable to share the receipt. Please try again.')
            }
            return
        }

        if (Capacitor.getPlatform() === 'ios') {
            try {
                const { shareIOSReceipt } = await import('@/lib/ios-receipt')
                await shareIOSReceipt(`Receipt-${order.id.slice(0, 8)}.pdf`, doc.output('datauristring').split(',')[1])
            } catch {
                toast.error('Unable to share the receipt. Please try again.')
            }
            return
        }
        doc.save(`Receipt-${order.id.slice(0, 8)}.pdf`);
    };

    return (
        <button
            onClick={generateReceipt}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
        >
            <FileDown className="w-4 h-4 stroke-[1.5]" />
        </button>
    );
}
