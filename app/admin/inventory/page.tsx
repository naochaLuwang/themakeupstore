
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

//     // 1. Fetch all categories for the dropdown
//     const { data: categoriesData } = await supabase
//         .from("categories")
//         .select("id, name")
//         .order("name")

//     // 2. Build the Query
//     // We join product_variants -> products -> product_categories
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
//                 product_categories!inner (
//                     category_id
//                 )
//             )
//         `, { count: "exact" })

//     // 3. Apply the Many-to-Many Category Filter
//     if (category && category !== "all") {
//         dbQuery = dbQuery.eq('products.product_categories.category_id', category)
//     }

//     // 4. Apply Other Filters
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

//     if (error) console.error("Filter Error:", error.message)

//     const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

//     return (
//         <div className="flex-1 space-y-4 p-8 pt-6">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h2 className="text-3xl font-black tracking-tighter uppercase italic">Inventory</h2>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
//                         {count || 0} variants available
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-3">
//                     <CategoryFilter categories={categoriesData || []} />
//                     <StockStatusFilter />
//                     <ProductSearch />
//                 </div>
//             </div>



//             {!inventory || inventory.length === 0 ? (
//                 <div className="p-20 border-2 border-dashed rounded-[2rem] text-center bg-white">
//                     <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No data found in this category</p>
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
import { LayoutGrid, Filter } from "lucide-react"

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

    const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")

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

    if (category && category !== "all") {
        dbQuery = dbQuery.eq('products.product_categories.category_id', category)
    }

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
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 lg:pb-12">

            {/* RESPONSIVE HEADER */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase italic text-slate-900">
                            Inventory
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {count || 0} variants synced
                        </p>
                    </div>
                    {/* Mobile Only Quick Stats Icon */}
                    <div className="lg:hidden p-3 bg-slate-100 rounded-2xl">
                        <LayoutGrid className="w-5 h-5 text-slate-600" />
                    </div>
                </div>

                {/* FILTERS CONTAINER */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
                    <div className="flex-1 lg:w-64">
                        <ProductSearch />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        <div className="flex-shrink-0">
                            <CategoryFilter categories={categoriesData || []} />
                        </div>
                        <div className="flex-shrink-0">
                            <StockStatusFilter />
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="relative">
                {!inventory || inventory.length === 0 ? (
                    <div className="p-16 border-2 border-dashed rounded-[2.5rem] border-slate-200 text-center bg-white shadow-sm">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            No matching stock found
                        </p>
                    </div>
                ) : (
                    /* This component needs to handle the switch between Table (Desktop) and Cards (Mobile) */
                    <InventoryTableClient initialInventory={inventory} />
                )}
            </div>

            {/* STICKY PAGINATION FOR MOBILE EASE */}
            <div className="flex justify-center pt-4">
                <PaginationControlled totalPages={totalPages} />
            </div>
        </div>
    )
}