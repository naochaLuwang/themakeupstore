// import { createClient } from "@/utils/supabase/server"
// import ProductForm from "@/components/admin/product-form"

// export default async function NewProductPage() {
//     const supabase = await createClient()

//     // Fetch categories ordered by name
//     const { data: categories, error } = await supabase
//         .from("categories")
//         .select("id, name")
//         .order("name", { ascending: true })

//     if (error) {
//         console.error("Error loading categories:", error.message)
//     }

//     return (
//         <div className="max-w-5xl mx-auto py-10 px-6">
//             {/* <div className="mb-8">
//                 <h1 className="text-3xl font-bold">Add New Product</h1>
//                 <p className="text-muted-foreground text-sm">
//                     Set up your stationery or beauty product inventory.
//                 </p>
//             </div> */}

//             {/* Pass categories as a prop to the Client Component */}
//             <ProductForm categories={categories || []} />
//         </div>
//     )
// }

import { createClient } from "@/utils/supabase/server"
import ProductForm from "@/components/admin/product-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewProductPage() {
    const supabase = await createClient()

    // Fetch categories ordered by name
    const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true })

    if (error) {
        console.error("Error loading categories:", error.message)
    }

    return (
        <div className="min-h-screen bg-slate-50/30 pb-20 lg:pb-12">
            <div className="max-w-5xl mx-auto py-6 lg:py-10 px-4 md:px-8 space-y-6">

                {/* BACK BUTTON & HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild className="rounded-xl h-10 w-10 border-slate-200 shadow-sm shrink-0">
                            <Link href="/admin/products">
                                <ChevronLeft className="w-5 h-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic text-slate-900">
                                Create Product
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                New Inventory Entry
                            </p>
                        </div>
                    </div>
                </div>

                {/* THE FORM CONTAINER */}
                <div className="bg-white lg:bg-transparent rounded-[2.5rem] lg:rounded-none p-2 md:p-0">
                    <ProductForm categories={categories || []} />
                </div>

            </div>
        </div>
    )
}