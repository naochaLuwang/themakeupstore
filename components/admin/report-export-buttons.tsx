"use client"

import { FileSpreadsheet, FileText } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export function ReportExportButtons({ data, type = "velocity" }: { data: any[], type?: "velocity" | "revenue" }) {

    const exportExcel = () => {
        const reportData = type === "revenue"
            ? data.map(o => {
                const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
                return {
                    "Date": new Date(o.created_at).toLocaleDateString(),
                    "Customer": profile?.full_name || "Guest User",
                    "Order Status": o.status,
                    "Payment Status": o.payment_status, // Add this
                    "Total Amount": Number(o.total || 0)
                }
            })
            : data.map(item => ({
                "Product": item.name,
                "Current Stock": item.currentStock,
                "Units Sold": item.unitsSold,
                "Status": item.unitsSold > item.currentStock ? "Refill" : "Stable"
            }));

        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report Data");
        XLSX.writeFile(workbook, `${type}-audit-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(`${type.toUpperCase()} AUDIT`, 14, 15);

        const headers = type === "revenue"
            ? [['Date', 'Customer', 'Status', 'Total']]
            : [['Product', 'Stock', 'Sold', 'Status']];

        const body = type === "revenue"
            ? data.map(o => {
                const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
                return [
                    new Date(o.created_at).toLocaleDateString(),
                    profile?.full_name || "Guest",
                    o.status,
                    `Rs. ${o.total}`
                ]
            })
            : data.map(i => [i.name, i.currentStock, i.unitsSold, i.unitsSold > i.currentStock ? "Refill" : "Stable"]);

        autoTable(doc, {
            startY: 25,
            head: headers,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0] }
        });
        doc.save(`${type}-report.pdf`);
    }

    return (
        <div className="flex gap-1">
            <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-colors">
                <FileSpreadsheet className="w-3 h-3" /> Excel
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-[9px] font-black uppercase border border-red-100 hover:bg-red-100 transition-colors">
                <FileText className="w-3 h-3" /> PDF
            </button>
        </div>
    )
}