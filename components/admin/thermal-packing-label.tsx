import { Printer, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

export default function ThermalPackingLabel({ order }: { order: any }) {
    return (
        <div className="w-[101.6mm] h-[152.4mm] bg-white text-black p-4 font-sans flex flex-col">
            <style jsx global>{`
                @media print {
                    @page { size: 4in 6in; margin: 0; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
            
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter">THE MAKEUP STORE</h1>
                <p className="text-[10px] uppercase">Wangkhei Angom Leikai, Imphal</p>
            </div>

            {/* Order Meta */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter">#{order.id.slice(0, 8).toUpperCase()}</h2>
                    <p className="text-xs font-bold uppercase">{order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                </div>
                <QRCodeSVG value={`https://themakeupstorewangkhei.com/track/${order.id}`} size={60} />
            </div>

            {/* Address */}
            <div className="border p-2 mb-4">
                <p className="text-[10px] font-bold uppercase">Ship To:</p>
                <p className="text-sm font-bold uppercase">{order.shipping_address?.full_name}</p>
                <p className="text-xs">{order.shipping_address?.street}, {order.shipping_address?.area_name} - {order.shipping_address?.pincode}</p>
                <p className="text-xs font-bold mt-1">Ph: {order.shipping_address?.phone}</p>
            </div>

            {/* Items */}
            <div className="flex-1 text-[10px] overflow-hidden">
                <div className="flex font-bold border-b border-black mb-1">
                    <div className="flex-1">Item</div>
                    <div className="w-10 text-right">Qty</div>
                </div>
                {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex border-b border-dotted py-0.5">
                        <div className="flex-1 pr-2 truncate">
                            <span className="font-bold">{item.product_name}</span>
                            <span className="text-[8px] ml-1 opacity-70">[{item.variant_title}]</span>
                        </div>
                        <div className="w-10 text-right font-black">x{item.quantity}</div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t-2 border-black mt-2">
                <p className="text-[8px] font-black uppercase">Secure Packing | Authorized</p>
            </div>
        </div>
    )
}
