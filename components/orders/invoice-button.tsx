"use client"

import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Capacitor } from "@capacitor/core"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

export function InvoiceButton({ order }: { order: any }) {
    const [loading, setLoading] = useState(false)

    const generateInvoice = async () => {
        setLoading(true)
        const doc = new jsPDF()

        // --- CALCULATION LOGIC (Matching your UI) ---
        const subtotalMRP = order.order_items.reduce((acc: number, item: any) =>
            acc + (Number(item.mrp || item.unit_price) * item.quantity), 0)

        const subtotalActual = order.order_items.reduce((acc: number, item: any) =>
            acc + (Number(item.unit_price) * item.quantity), 0)

        const productSavings = subtotalMRP - subtotalActual
        const promoDiscount = Number(order.promo_discount_amount) || 0
        const totalSavings = productSavings + promoDiscount
        const shipping = Number(order.shipping_price) || 0

        // --- BRANDING & HEADER ---
        doc.setFont("helvetica", "bold")
        doc.setFontSize(24)
        doc.text("THE MAKEUP STORE", 14, 25)

        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100)
        doc.text("WANGKHEI, MANIPUR", 14, 30)
        doc.text("Kontha khabam mayai leikai Imphal, 795002", 14, 34)
        doc.text("Phone: 6909013764 | makeupstorewangkhei.com", 14, 38)

        doc.setFontSize(40)
        doc.setTextColor(240) // Very light gray
        doc.setFont("helvetica", "bold")
        doc.text("INVOICE", 120, 35)

        // --- ORDER & SHIPPING INFO ---
        doc.setTextColor(0)
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.text("BILL TO:", 14, 55)
        doc.text("ORDER INFO:", 120, 55)

        doc.setFont("helvetica", "normal")
        const addr = order.shipping_address
        doc.text(`${addr.full_name.toUpperCase()}`, 14, 60)
        doc.text(`${addr.street}`, 14, 64)
        doc.text(`${addr.city}, PIN: ${addr.pincode}`, 14, 68)
        doc.text(`Phone: ${addr.phone}`, 14, 72)

        doc.text(`Ref ID: #${order.id.slice(0, 8).toUpperCase()}`, 120, 60)
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 120, 64)
        doc.text(`Method: ${order.payment_method.toUpperCase()}`, 120, 68)
        doc.text(`Status: ${order.payment_status.toUpperCase()}`, 120, 72)

        // --- ITEMS TABLE ---
        autoTable(doc, {
            startY: 85,
            head: [['DESCRIPTION', 'MRP', 'DISC.', 'QTY', 'AMOUNT']],
            body: order.order_items.map((item: any) => {
                const mrp = Number(item.mrp || item.unit_price)
                const rate = Number(item.unit_price)
                const disc = mrp > rate ? `${Math.round(((mrp - rate) / mrp) * 100)}%` : '-'
                return [
                    { content: `${item.product_name}\n${item.variant_title || ''}`, styles: { fontStyle: 'bold' } },
                    `INR ${mrp}`,
                    disc,
                    item.quantity,
                    `INR ${rate * item.quantity}`
                ]
            }),
            headStyles: { fillColor: [0, 0, 0], fontSize: 8, cellPadding: 4 },
            bodyStyles: { fontSize: 8, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'right' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'right' }
            },
            theme: 'striped'
        })

        // --- TOTALS SECTION ---
        const finalY = (doc as any).lastAutoTable.finalY + 15
        const rightAlignX = 196

        doc.setFontSize(9)
        doc.setTextColor(100)

        doc.text("Subtotal (MRP):", 130, finalY)
        doc.text(`INR ${subtotalMRP.toLocaleString()}`, rightAlignX, finalY, { align: 'right' })

        if (productSavings > 0) {
            doc.text("Item Discounts:", 130, finalY + 6)
            doc.text(`-INR ${productSavings.toLocaleString()}`, rightAlignX, finalY + 6, { align: 'right' })
        }

        // Mid-Subtotal Line
        doc.setDrawColor(200)
        doc.line(130, finalY + 9, 196, finalY + 9)
        doc.setTextColor(0)
        doc.setFont("helvetica", "bold")
        doc.text("Subtotal:", 130, finalY + 14)
        doc.text(`INR ${subtotalActual.toLocaleString()}`, rightAlignX, finalY + 14, { align: 'right' })

        doc.setFont("helvetica", "normal")
        doc.setTextColor(100)
        doc.text("Shipping Cost:", 130, finalY + 20)
        doc.text(`INR ${shipping.toLocaleString()}`, rightAlignX, finalY + 20, { align: 'right' })

        if (promoDiscount > 0) {
            doc.setTextColor(34, 197, 94) // Emerald Green
            doc.text(`Promo (${order.promo_code}):`, 130, finalY + 26)
            doc.text(`-INR ${promoDiscount.toLocaleString()}`, rightAlignX, finalY + 26, { align: 'right' })
        }

        // Final Total Box
        const boxY = promoDiscount > 0 ? finalY + 32 : finalY + 26
        doc.setFillColor(0, 0, 0)
        doc.rect(130, boxY, 66, 12, 'F')
        doc.setTextColor(255)
        doc.setFontSize(11)
        doc.text("NET PAYABLE:", 135, boxY + 8)
        doc.text(`INR ${Number(order.total).toLocaleString()}`, 192, boxY + 8, { align: 'right' })

        // --- FOOTER ---
        doc.setTextColor(150)
        doc.setFontSize(7)
        doc.text("THANK YOU FOR SHOPPING WITH THE MAKEUP STORE", 105, 280, { align: 'center' })
        doc.text("Authorized computer generated invoice. No signature required.", 105, 284, { align: 'center' })

        doc.save(`Invoice_TMS_${order.id.slice(0, 8).toUpperCase()}.pdf`)

        if (Capacitor.isNativePlatform()) {
            const fileName = `Invoice_TMS_${order.id.slice(0, 8).toUpperCase()}.pdf`
            const pdfBase64 = doc.output("datauristring").split(",")[1]
            try {
                await Filesystem.writeFile({
                    path: `Download/${fileName}`,
                    data: pdfBase64,
                    directory: Directory.External,
                })
                await Share.share({ title: fileName, url: `file://${fileName}`, dialogTitle: "Save Invoice" })
            } catch (e) {
                console.error("File save error:", e)
            }
        }

        setLoading(false)
    }

    return (
        <Button
            onClick={generateInvoice}
            disabled={loading}
            variant="outline"
            className="rounded-none border-black hover:bg-black hover:text-white text-[10px] font-bold uppercase tracking-widest h-10 px-6 transition-all"
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-2" />}
            Download PDF
        </Button>
    )
}