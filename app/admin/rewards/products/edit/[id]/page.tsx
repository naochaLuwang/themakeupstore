import { getAdminRewardProducts } from "@/app/actions/rewards-admin"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RewardProductForm } from "../../reward-product-form"

export default async function EditRewardProductPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const products = await getAdminRewardProducts()
    const product = products.find((p: any) => p.id === id)

    if (!product) notFound()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/rewards/products" className="rounded-xl h-10 w-10 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Reward Product</h1>
                    <p className="text-sm text-slate-500">{product.product_name}</p>
                </div>
            </div>
            <RewardProductForm initialData={product} />
        </div>
    )
}
