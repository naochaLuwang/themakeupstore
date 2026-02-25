// import { createClient } from "@/utils/supabase/server"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Plus, Package, Layers, Eye, EyeOff, Trash2 } from "lucide-react"
// import Link from "next/link"
// import Image from "next/image"
// import { ProductSearch } from "@/components/admin/product-search"
// import { CategoryFilter } from "@/components/admin/category-filter"
// import { revalidatePath } from "next/cache"
// import { DeleteProductButton } from "@/components/admin/delete-product-button"

// export default async function ProductsPage({
//     searchParams,
// }: {
//     searchParams: Promise<{ query?: string; category?: string }>
// }) {
//     const { query, category } = await searchParams
//     const supabase = await createClient()

//     // 1. Fetch Categories for the dropdown filter
//     const { data: categoriesList } = await supabase
//         .from("categories")
//         .select("id, name")
//         .order("name")

//     // 2. Build Query with !inner hint
//     // The !inner hint tells Supabase to filter the top-level rows (products) 
//     // based on the conditions applied to the joined table (product_categories).
//     let dbQuery = supabase
//         .from("products")
//         .select(`
//             *,
//             product_categories!inner (
//                 category_id,
//                 categories (name)
//             ),
//             product_variants (id, stock)
//         `)
//         .order("created_at", { ascending: false })

//     // Apply Search Query
//     if (query) {
//         dbQuery = dbQuery.or(`name.ilike.%${query}%, brand.ilike.%${query}%`)
//     }

//     // Apply Category Filter correctly using the inner joined relationship
//     if (category && category !== "all") {
//         dbQuery = dbQuery.eq("product_categories.category_id", category)
//     }

//     const { data: products, error } = await dbQuery

//     // 3. Server Action for Status Toggle
//     async function toggleStatus(id: string, currentStatus: string) {
//         "use server"
//         const supabase = await createClient()
//         const newStatus = currentStatus === "active" ? "inactive" : "active"

//         await supabase
//             .from("products")
//             .update({ status: newStatus })
//             .eq("id", id)

//         revalidatePath("/admin/products")
//     }

//     async function deleteProduct(formData: FormData) {
//         "use server"
//         const id = formData.get("productId") as string
//         const supabase = await createClient()

//         const { error } = await supabase
//             .from("products")
//             .delete()
//             .eq("id", id)

//         if (error) {
//             console.error("Delete error:", error.message)
//         }
//         revalidatePath("/admin/products")
//     }

//     return (
//         <div className="flex-col">
//             <div className="flex-1 space-y-4 p-8 pt-6">
//                 {/* Header Section */}
//                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
//                     <div>
//                         <h2 className="text-3xl font-black tracking-tighter uppercase">Products</h2>
//                         <p className="text-sm text-muted-foreground">Manage your catalog visibility and inventory.</p>
//                     </div>
//                     <Button asChild className="rounded-full px-6">
//                         <Link href="/admin/products/add">
//                             <Plus className="mr-2 h-4 w-4" /> Add Product
//                         </Link>
//                     </Button>
//                 </div>

//                 {/* Filters Section */}
//                 <div className="flex flex-wrap items-center gap-3">
//                     <div className="w-full md:w-80">
//                         <ProductSearch />
//                     </div>
//                     <div className="w-full md:w-60">
//                         <CategoryFilter categories={categoriesList || []} />
//                     </div>
//                 </div>

//                 {/* Data Table */}
//                 <div className="rounded-[2rem] border bg-white shadow-sm overflow-hidden">
//                     <table className="w-full text-sm">
//                         <thead className="bg-slate-50 border-b">
//                             <tr className="text-left font-bold text-slate-400 uppercase text-[10px] tracking-widest">
//                                 <th className="p-5">Product Info</th>
//                                 <th className="p-5">Brand</th>
//                                 <th className="p-5">Status</th>
//                                 <th className="p-5">Inventory</th>
//                                 <th className="p-5 text-right">Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-100">
//                             {products && products.length > 0 ? (
//                                 products.map((product) => {
//                                     const totalStock = product.product_variants?.reduce(
//                                         (acc: number, curr: any) => acc + (curr.stock || 0), 0
//                                     ) || 0
//                                     const variantCount = product.product_variants?.length || 0
//                                     const isActive = product.status === "active"

//                                     return (
//                                         <tr key={product.id} className={`group hover:bg-slate-50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
//                                             <td className="p-5">
//                                                 <div className="flex items-center gap-4">
//                                                     <div className="h-12 w-12 relative rounded-xl border bg-slate-100 overflow-hidden flex-shrink-0">
//                                                         {product.thumbnail_url ? (
//                                                             <Image fill src={product.thumbnail_url} alt={product.name} className="object-cover" />
//                                                         ) : (
//                                                             <Package className="h-5 w-5 m-auto absolute inset-0 text-slate-300" />
//                                                         )}
//                                                     </div>
//                                                     <div className="flex flex-col">
//                                                         <span className="font-bold text-slate-900 leading-none mb-1 text-base">
//                                                             {product.name}
//                                                         </span>
//                                                         <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
//                                                             {product.slug}
//                                                         </span>
//                                                     </div>
//                                                 </div>
//                                             </td>

//                                             <td className="p-5">
//                                                 <span className="text-slate-500 font-medium uppercase text-xs tracking-tight">
//                                                     {product.brand || "Generic"}
//                                                 </span>
//                                             </td>

//                                             <td className="p-5">
//                                                 <Badge variant={isActive ? "default" : "secondary"} className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
//                                                     {product.status}
//                                                 </Badge>
//                                             </td>

//                                             <td className="p-5">
//                                                 <div className="space-y-1">
//                                                     <div className="flex items-center gap-2">
//                                                         <span className="font-bold text-slate-900">{totalStock} units</span>
//                                                         <div className={`h-1.5 w-1.5 rounded-full ${totalStock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
//                                                     </div>
//                                                     <p className="text-[10px] text-slate-400 font-bold uppercase">
//                                                         {variantCount} Variants
//                                                     </p>
//                                                 </div>
//                                             </td>

//                                             <td className="p-5 text-right">
//                                                 <div className="flex justify-end items-center gap-2">
//                                                     <form action={toggleStatus.bind(null, product.id, product.status)}>
//                                                         <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200">
//                                                             {isActive ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-emerald-500" />}
//                                                         </Button>
//                                                     </form>
//                                                     <Button variant="secondary" size="sm" asChild className="h-9 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest">
//                                                         <Link href={`/admin/products/edit/${product.id}`}>Edit</Link>
//                                                     </Button>

//                                                     <DeleteProductButton
//                                                         productId={product.id}
//                                                         onDelete={deleteProduct}
//                                                     />
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     )
//                                 })
//                             ) : (
//                                 <tr>
//                                     <td colSpan={5} className="p-20 text-center text-slate-400 italic">
//                                         No products found matching your selection.
//                                     </td>
//                                 </tr>
//                             )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     )
// }



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
        <div className="flex-col pb-20 lg:pb-10">
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase italic text-slate-900">Products</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Catalog & Visibility Management</p>
                    </div>
                    <Button asChild className="rounded-xl h-12 px-6 bg-slate-900 text-white hover:bg-black shadow-lg shadow-black/10">
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
                <div className="hidden lg:block rounded-[2.5rem] border bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr className="text-left font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                                <th className="p-6">Product Info</th>
                                <th className="p-6">Brand</th>
                                <th className="p-6">Status</th>
                                <th className="p-6">Inventory</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {products?.map((product) => {
                                const totalStock = product.product_variants?.reduce((acc: number, curr: any) => acc + (curr.stock || 0), 0) || 0
                                const isActive = product.status === "active"

                                return (
                                    <tr key={product.id} className={`group hover:bg-slate-50/50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-14 w-14 relative rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm">
                                                    {product.thumbnail_url ? (
                                                        <Image fill src={product.thumbnail_url} alt={product.name} className="object-cover" />
                                                    ) : (
                                                        <Package className="h-5 w-5 m-auto absolute inset-0 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-base mb-0.5">{product.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{product.slug}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                                                {product.brand || "Generic"}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <Badge className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider border-none ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {product.status}
                                            </Badge>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-900 text-sm">{totalStock}</span>
                                                <div className={`h-1.5 w-1.5 rounded-full ${totalStock > 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <form action={toggleStatus.bind(null, product.id, product.status)}>
                                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50">
                                                        {isActive ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-emerald-500" />}
                                                    </Button>
                                                </form>
                                                <Button variant="secondary" size="sm" asChild className="h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-slate-100 hover:bg-slate-200">
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
                            <Card key={product.id} className={`rounded-[2rem] border-slate-100 shadow-sm overflow-hidden ${!isActive ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                <CardContent className="p-0">
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="h-20 w-20 relative rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden shrink-0 shadow-sm">
                                            {product.thumbnail_url ? (
                                                <Image fill src={product.thumbnail_url} alt={product.name} className="object-cover" />
                                            ) : (
                                                <Package className="h-6 w-6 m-auto absolute inset-0 text-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={`rounded-full px-2 py-0 text-[8px] font-black uppercase tracking-tight border-none ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                                                    {product.status}
                                                </Badge>
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">
                                                    {product.brand || "Generic"}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">{product.name}</h3>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Box className="w-3 h-3 text-slate-300" />
                                                    <span className="text-[11px] font-black text-slate-700">{totalStock} Units</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Tag className="w-3 h-3 text-slate-300" />
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{product.product_variants?.length || 0} Vars</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="grid grid-cols-3 border-t border-slate-50 bg-slate-50/50">
                                        <form action={toggleStatus.bind(null, product.id, product.status)} className="border-r border-slate-100">
                                            <button className="w-full py-3.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 active:bg-slate-100 transition-colors">
                                                {isActive ? <><EyeOff className="w-3.5 h-3.5 text-slate-400" /> Hide</> : <><Eye className="w-3.5 h-3.5 text-emerald-500" /> Show</>}
                                            </button>
                                        </form>
                                        <Link href={`/admin/products/edit/${product.id}`} className="flex items-center justify-center py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-600 border-r border-slate-100 active:bg-slate-100 transition-colors">
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
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <Package className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No items found in your catalog</p>
                    </div>
                )}
            </div>
        </div>
    )
}