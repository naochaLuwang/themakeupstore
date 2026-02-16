// import { createClient } from "@/utils/supabase/server"
// import { Badge } from "@/components/ui/badge"
// import { StockInput } from "@/components/admin/stock-input"
// import { ProductSearch } from "@/components/admin/product-search"
// import { StockStatusFilter } from "@/components/admin/inventory-filters"
// import { PaginationControlled } from "@/components/ui/pagination-controlled"
// import { Package, AlertTriangle } from "lucide-react"

// const ITEMS_PER_PAGE = 10

// export default async function InventoryPage({
//     searchParams,
// }: {
//     searchParams: Promise<{ query?: string; status?: string; page?: string }>
// }) {
//     const { query, status, page } = await searchParams
//     const supabase = await createClient()

//     const currentPage = Number(page) || 1
//     const from = (currentPage - 1) * ITEMS_PER_PAGE
//     const to = from + ITEMS_PER_PAGE - 1

//     // 1. Build Query with Join
//     // Note: products!inner is used so that filtering by product name works
//     let dbQuery = supabase
//         .from("product_variants")
//         .select(`
//       id,
//       sku,
//       title,
//       stock,
//       price,
//       products!inner (
//         name,
//         has_variants
//       )
//     `, { count: "exact" })

//     // 2. Apply Search (SKU or Product Name)
//     // Fallback logic for src/app/admin/inventory/page.tsx
//     if (query) {
//         dbQuery = dbQuery.filter('products.name', 'ilike', `%${query}%`)
//         // Note: This will act as an "AND" with the SKU if you add another filter.
//         // To keep it as an "OR", the string syntax in Step 1 is the only way.
//     }

//     // 3. Apply Stock Status Filter
//     if (status === "out") {
//         dbQuery = dbQuery.eq("stock", 0)
//     } else if (status === "low") {
//         dbQuery = dbQuery.gt("stock", 0).lte("stock", 10)
//     } else if (status === "in") {
//         dbQuery = dbQuery.gt("stock", 10)
//     }

//     // 4. Execute Query with Pagination
//     const { data: inventory, count, error } = await dbQuery
//         .order("stock", { ascending: true })
//         .range(from, to)

//     const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

//     if (error) console.error("Inventory Error:", error)

//     return (
//         <div className="flex-1 space-y-4 p-8 pt-6">
//             <div className="flex items-center justify-between">
//                 <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
//                 <div className="flex items-center gap-3">
//                     <StockStatusFilter />
//                     <ProductSearch />
//                 </div>
//             </div>

//             <div className="rounded-md border bg-white overflow-hidden">
//                 <table className="w-full text-sm">
//                     <thead className="bg-slate-50 border-b">
//                         <tr className="text-left font-medium">
//                             <th className="p-4">Product / Variant</th>
//                             <th className="p-4">SKU</th>
//                             <th className="p-4">Current Stock</th>
//                             <th className="p-4">Status</th>
//                             <th className="p-4 text-right">Quick Update</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y">
//                         {inventory?.length ? (
//                             inventory.map((item: any) => (
//                                 <tr key={item.id} className="hover:bg-slate-50/50">
//                                     <td className="p-4">
//                                         <div className="font-medium text-slate-900">
//                                             {item.products?.name}
//                                         </div>
//                                         <div className="text-xs text-muted-foreground italic">
//                                             {item.title === "Default" ? "Simple Product" : item.title}
//                                         </div>
//                                     </td>
//                                     <td className="p-4 font-mono text-xs text-slate-500">
//                                         {item.sku}
//                                     </td>
//                                     <td className="p-4">
//                                         <span className={item.stock <= 5 ? "text-red-600 font-bold" : "text-slate-700 font-medium"}>
//                                             {item.stock}
//                                         </span>
//                                     </td>
//                                     <td className="p-4">
//                                         {item.stock <= 0 ? (
//                                             <Badge variant="destructive" className="gap-1">
//                                                 <AlertTriangle className="h-3 w-3" /> Out of Stock
//                                             </Badge>
//                                         ) : item.stock <= 10 ? (
//                                             <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">
//                                                 Low Stock
//                                             </Badge>
//                                         ) : (
//                                             <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50">
//                                                 In Stock
//                                             </Badge>
//                                         )}
//                                     </td>
//                                     <td className="p-4 text-right">
//                                         <StockInput variantId={item.id} initialStock={item.stock} />
//                                     </td>
//                                 </tr>
//                             ))
//                         ) : (
//                             <tr>
//                                 <td colSpan={5} className="p-20 text-center text-muted-foreground">
//                                     <Package className="h-10 w-10 mx-auto mb-4 opacity-20" />
//                                     <p>No inventory found matching your criteria.</p>
//                                 </td>
//                             </tr>
//                         )}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination component */}
//             <PaginationControlled totalPages={totalPages} />
//         </div>
//     )
// }



// import { createClient } from "@/utils/supabase/server"
// import { ProductSearch } from "@/components/admin/product-search"
// import { StockStatusFilter } from "@/components/admin/inventory-filters"
// import { PaginationControlled } from "@/components/ui/pagination-controlled"
// import { InventoryTableClient } from "@/components/admin/inventory-table-client"
// import { CategoryFilter } from "@/components/admin/category-filter"

// const ITEMS_PER_PAGE = 10

// export default async function InventoryPage({
//     searchParams,
// }: {
//     searchParams: Promise<{ query?: string; status?: string; page?: string; category?: string }>
// }) {
//     const { query, status, page, category } = await searchParams
//     const supabase = await createClient()

//     const currentPage = Number(page) || 1
//     const from = (currentPage - 1) * ITEMS_PER_PAGE
//     const to = from + ITEMS_PER_PAGE - 1

//     // Fetch categories for the filter dropdown
//     const { data: categoriesData } = await supabase
//         .from("categories")
//         .select("id, name")
//         .order("name")

//     // The query with the explicit relationship fix
//     let dbQuery = supabase
//         .from("product_variants")
//         .select(`
//             id, 
//             sku, 
//             title, 
//             stock, 
//             price,
//             products!inner ( 
//                 name, 
//                 category_id,
//                 categories!products_category_id_fkey ( name )
//             )
//         `, { count: "exact" })

//     // Apply Filters
//     if (category && category !== "all") {
//         dbQuery = dbQuery.eq('products.category_id', category)
//     }

//     if (query) {
//         dbQuery = dbQuery.ilike('products.name', `%${query}%`)
//     }

//     if (status === "out") {
//         dbQuery = dbQuery.eq("stock", 0)
//     } else if (status === "low") {
//         dbQuery = dbQuery.gt("stock", 0).lte("stock", 10)
//     }

//     const { data: inventory, count, error } = await dbQuery
//         .order("stock", { ascending: true })
//         .range(from, to)

//     if (error) {
//         console.error("Supabase Inventory Error:", error.message)
//     }

//     const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

//     return (
//         <div className="flex-1 space-y-4 p-8 pt-6">
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                 <div>
//                     <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Inventory</h2>
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
//                         Total Records: {count || 0}
//                     </p>
//                 </div>
//                 <div className="flex flex-wrap items-center gap-3">
//                     <CategoryFilter categories={categoriesData || []} />
//                     <StockStatusFilter />
//                     <ProductSearch />
//                 </div>
//             </div>

//             {!inventory || inventory.length === 0 ? (
//                 <div className="p-20 border-2 border-dashed rounded-[2rem] text-center bg-white shadow-sm">
//                     <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching variants found</p>
//                 </div>
//             ) : (
//                 <InventoryTableClient initialInventory={inventory} />
//             )}

//             <PaginationControlled totalPages={totalPages} />
//         </div>
//     )
// }
import { createClient } from "@/utils/supabase/server"
import { ProductSearch } from "@/components/admin/product-search"
import { StockStatusFilter } from "@/components/admin/inventory-filters"
import { PaginationControlled } from "@/components/ui/pagination-controlled"
import { InventoryTableClient } from "@/components/admin/inventory-table-client"
import { CategoryFilter } from "@/components/admin/category-filter"

const ITEMS_PER_PAGE = 10

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; status?: string; page?: string; category?: string }>
}) {
    const { query, status, page, category } = await searchParams
    const supabase = await createClient()

    const currentPage = Number(page) || 1
    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    // 1. Fetch all categories for the dropdown
    const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")

    // 2. Build the Query
    // We join product_variants -> products -> product_categories
    let dbQuery = supabase
        .from("product_variants")
        .select(`
            id, 
            sku, 
            title, 
            stock, 
            price,
            products!inner ( 
                name,
                product_categories!inner (
                    category_id
                )
            )
        `, { count: "exact" })

    // 3. Apply the Many-to-Many Category Filter
    if (category && category !== "all") {
        dbQuery = dbQuery.eq('products.product_categories.category_id', category)
    }

    // 4. Apply Other Filters
    if (query) {
        dbQuery = dbQuery.ilike('products.name', `%${query}%`)
    }

    if (status === "out") {
        dbQuery = dbQuery.eq("stock", 0)
    } else if (status === "low") {
        dbQuery = dbQuery.gt("stock", 0).lte("stock", 10)
    }

    const { data: inventory, count, error } = await dbQuery
        .order("stock", { ascending: true })
        .range(from, to)

    if (error) console.error("Filter Error:", error.message)

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic">Inventory</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {count || 0} variants available
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <CategoryFilter categories={categoriesData || []} />
                    <StockStatusFilter />
                    <ProductSearch />
                </div>
            </div>



            {!inventory || inventory.length === 0 ? (
                <div className="p-20 border-2 border-dashed rounded-[2rem] text-center bg-white">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No data found in this category</p>
                </div>
            ) : (
                <InventoryTableClient initialInventory={inventory} />
            )}

            <PaginationControlled totalPages={totalPages} />
        </div>
    )
}