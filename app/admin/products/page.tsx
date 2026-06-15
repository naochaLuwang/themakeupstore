import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Eye, EyeOff, Tag, Box, MoreVertical } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ProductSearch } from "@/components/admin/product-search"
import { CategoryFilter } from "@/components/admin/category-filter"
import { revalidatePath } from "next/cache"
import { DeleteProductButton } from "@/components/admin/delete-product-button"
import { Card, CardContent } from "@/components/ui/card"

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; category?: string }>
}) {
    const { query, category } = await searchParams
    const supabase = await createClient()

    const { data: categoriesList } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")

    let dbQuery = supabase
        .from("products")
        .select(`
            *,
            product_categories!inner (
                category_id,
                categories (name)
            ),
            product_variants (id, stock)
        `)
        .order("created_at", { ascending: false })

    if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%, brand.ilike.%${query}%`)
    }

    if (category && category !== "all") {
        dbQuery = dbQuery.eq("product_categories.category_id", category)
    }

    const { data: products } = await dbQuery

    /** SERVER ACTIONS **/
    async function toggleStatus(id: string, currentStatus: string) {
        "use server"
        const supabase = await createClient()
        const newStatus = currentStatus === "active" ? "inactive" : "active"
        await supabase.from("products").update({ status: newStatus }).eq("id", id)
        revalidatePath("/admin/products")
    }

    async function deleteProduct(formData: FormData) {
        "use server"
        const id = formData.get("productId") as string
        const supabase = await createClient()
        await supabase.from("products").delete().eq("id", id)
        revalidatePath("/admin/products")
    }

    return (
        <div className="space-y-6">

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Products</h1>
                    <p className="text-sm text-slate-500">Catalog & visibility management</p>
                </div>
                <Button asChild className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                    <Link href="/admin/products/add">
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Link>
                </Button>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:flex items-center gap-3">
                <div className="w-full md:w-80">
                    <ProductSearch />
                </div>
                <div className="w-full md:w-60">
                    <CategoryFilter categories={categoriesList || []} />
                </div>
            </div>

            {/* DESKTOP DATA TABLE */}
            <div className="hidden lg:block rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-4 px-6 text-left">Product Info</th>
                            <th className="py-4 px-6 text-left">Brand</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-left">Inventory</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                        <tbody className="divide-y divide-slate-50">
                            {products?.map((product) => {
                                const totalStock = product.product_variants?.reduce((acc: number, curr: any) => acc + (curr.stock || 0), 0) || 0
                                const isActive = product.status === "active"

                                return (
                                    <tr key={product.id} className={`group hover:bg-slate-50/50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-14 w-14 relative rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0">
                                                    {product.thumbnail_url ? (
                                                        <Image fill src={product.thumbnail_url} alt={product.name} className="object-cover" />
                                                    ) : (
                                                        <Package className="h-5 w-5 m-auto absolute inset-0 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm">{product.name}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono">{product.slug}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-medium text-slate-500">{product.brand || "Generic"}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <Badge className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border-none ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {product.status}
                                            </Badge>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">{totalStock}</span>
                                                <div className={`h-1.5 w-1.5 rounded-full ${totalStock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <form action={toggleStatus.bind(null, product.id, product.status)}>
                                                    <Button variant="outline" size="icon" className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400">
                                                        {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-emerald-500" />}
                                                    </Button>
                                                </form>
                                                <Button variant="secondary" size="sm" asChild className="h-9 px-4 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200">
                                                    <Link href={`/admin/products/edit/${product.id}`}>Edit</Link>
                                                </Button>
                                                <DeleteProductButton productId={product.id} onDelete={deleteProduct} />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="lg:hidden space-y-4">
                    {products?.map((product) => {
                        const totalStock = product.product_variants?.reduce((acc: number, curr: any) => acc + (curr.stock || 0), 0) || 0
                        const isActive = product.status === "active"

                        return (
                            <Card key={product.id} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${!isActive ? 'opacity-70' : ''}`}>
                                <CardContent className="p-0">
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="h-20 w-20 relative rounded-xl border border-slate-100 bg-slate-50 overflow-hidden shrink-0">
                                            {product.thumbnail_url ? (
                                                <Image fill src={product.thumbnail_url} alt={product.name} className="object-cover" />
                                            ) : (
                                                <Package className="h-6 w-6 m-auto absolute inset-0 text-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border-none ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {product.status}
                                                </Badge>
                                                <span className="text-[10px] font-medium text-slate-400 truncate">{product.brand || "Generic"}</span>
                                            </div>
                                            <h3 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h3>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs text-slate-500">{totalStock} units</span>
                                                <span className="text-xs text-slate-500">{product.product_variants?.length || 0} variants</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 border-t border-slate-100">
                                        <form action={toggleStatus.bind(null, product.id, product.status)} className="border-r border-slate-100">
                                            <button className="w-full py-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 active:bg-slate-50 transition-colors">
                                                {isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
                                                {isActive ? 'Hide' : 'Show'}
                                            </button>
                                        </form>
                                        <Link href={`/admin/products/edit/${product.id}`} className="flex items-center justify-center py-3 text-xs font-medium text-slate-600 border-r border-slate-100 active:bg-slate-50 transition-colors">
                                            Edit
                                        </Link>
                                        <div className="flex items-center justify-center py-1">
                                            <DeleteProductButton productId={product.id} onDelete={deleteProduct} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {(!products || products.length === 0) && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">No products found</p>
                    </div>
                )}
        </div>
    )
}