import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Trash2, Package, Tag, ArrowRight } from "lucide-react"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { AddProductSidebar } from "@/components/admin/category-add-product"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { requireAdmin } from "@/lib/admin"

interface LinkedProduct {
    id: string;
    name: string;
    brand: string | null;
}

export default async function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: category } = await supabase
        .from("categories")
        .select("name")
        .eq("id", id)
        .single()

    if (!category) notFound()

    const { data: linkedItems } = await supabase
        .from("product_categories")
        .select(`product:products (id, name, brand)`)
        .eq("category_id", id)

    const linkedProducts = (linkedItems?.map(item => item.product) as unknown as LinkedProduct[]).filter(Boolean) || []
    const linkedIds = linkedProducts.map(p => p.id)

    let availableProductsQuery = supabase.from("products").select("id, name")
    if (linkedIds.length > 0) {
        availableProductsQuery = availableProductsQuery.not("id", "in", `(${linkedIds.join(',')})`)
    }
    const { data: allProducts } = await availableProductsQuery.order("name").limit(500)

    /** SERVER ACTIONS **/
    async function linkProduct(formData: FormData) {
        "use server"
        const { supabase } = await requireAdmin()
        const productId = formData.get("productId") as string
        await supabase.from("product_categories").insert({ product_id: productId, category_id: id })
        revalidatePath(`/admin/categories/${id}`)
    }

    async function linkMultipleProducts(productIds: string[]) {
        "use server"
        const { supabase } = await requireAdmin()
        const links = productIds.map(pid => ({ product_id: pid, category_id: id }))
        await supabase.from("product_categories").insert(links)
        revalidatePath(`/admin/categories/${id}`)
    }

    async function unlinkProduct(productId: string) {
        "use server"
        const { supabase } = await requireAdmin()
        await supabase
            .from("product_categories")
            .delete()
            .match({ product_id: productId, category_id: id })
        revalidatePath(`/admin/categories/${id}`)
    }

    return (
        <div className="min-h-screen bg-slate-50/30 pb-24 lg:pb-12">
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-100 pb-6 lg:border-none">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild className="rounded-xl h-10 w-10 border-slate-200 shadow-sm shrink-0">
                            <Link href="/admin/categories"><ChevronLeft className="w-5 h-5" /></Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">{category.name}</h1>
                            <p className="text-[11px] lg:text-sm text-slate-500 uppercase font-bold tracking-wider">Inventory Management</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ASSIGNED PRODUCTS SECTION */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Package className="w-4 h-4 text-slate-400" />
                                Assigned Products
                                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full ml-1">
                                    {linkedProducts.length}
                                </span>
                            </h3>
                        </div>

                        {/* DESKTOP TABLE */}
                        <div className="hidden md:block border rounded-2xl bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b text-slate-500">
                                    <tr>
                                        <th className="p-4 font-bold uppercase text-[10px] tracking-widest px-6">Product</th>
                                        <th className="p-4 font-bold uppercase text-[10px] tracking-widest">Brand</th>
                                        <th className="p-4 text-right font-bold uppercase text-[10px] tracking-widest px-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {linkedProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4 px-6">
                                                <p className="font-bold text-slate-900">{product.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">ID: {product.id.slice(0, 8)}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    <Tag className="w-2.5 h-2.5" /> {product.brand || "UNBRANDED"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right px-6">
                                                <form action={unlinkProduct.bind(null, product.id)}>
                                                    <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                        Remove
                                                    </Button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE LIST */}
                        <div className="md:hidden space-y-3">
                            {linkedProducts.length === 0 && (
                                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Package className="w-10 h-10 mx-auto mb-2 opacity-10" />
                                    <p className="text-slate-400 text-sm">Empty Category</p>
                                </div>
                            )}
                            {linkedProducts.map((product) => (
                                <Card key={product.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{product.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                {product.brand || "No Brand"}
                                            </p>
                                        </div>
                                        <form action={unlinkProduct.bind(null, product.id)}>
                                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 text-red-500 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* SEARCHABLE SIDEBAR (Desktop: Sidebar, Mobile: Card below) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <AddProductSidebar
                                allProducts={allProducts || []}
                                categoryName={category.name}
                                linkProductAction={linkProduct}
                                linkMultipleAction={linkMultipleProducts}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}