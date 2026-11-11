import { createClient } from "@/utils/supabase/server"
import CategoryRuleRow from "./CategoryRuleRow"

export default async function WholesaleCategoriesPage() {
    const supabase = await createClient()

    // 1. Fetch only Child Categories (those that HAVE a parent)
    const { data: categories } = await supabase
        .from('categories')
        .select(`
        id, 
        name, 
        parent_id,
        category_wholesale_rules (
            id,
            discount_percentage,
            min_order_quantity,
            is_active
        )
    `)
        .not('parent_id', 'is', null) // Only sub-categories
        .order('name')



    return (
        <div className="p-8 max-w-5xl mx-auto">
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded">Admin</span>
                </div>
                <h1 className="text-slate-900 text-2xl font-black tracking-tight">Wholesale Pricing Rules</h1>
                <p className="text-slate-500 mt-2">
                    Managing <strong>{categories?.length}</strong> sub-categories.
                    Rules set here apply to all products assigned to these categories.
                </p>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto min-w-0 max-w-full">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="p-6 text-xs font-semibold text-slate-500 tracking-normal">Sub-Category</th>
                            <th className="p-6 text-xs font-semibold text-slate-500 tracking-normal">Discount (%)</th>
                            <th className="p-6 text-xs font-semibold text-slate-500 tracking-normal">MOQ</th>
                            <th className="p-6 text-xs font-semibold text-slate-500 tracking-normal">Active</th>
                            <th className="p-6 text-xs font-semibold text-slate-500 tracking-normal text-right">Update</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {categories?.map((cat) => (
                            <CategoryRuleRow key={cat.id} category={cat} />
                        ))}
                    </tbody>
                </table>

                {categories?.length === 0 && (
                    <div className="p-20 text-center text-slate-500 font-medium">
                        No sub-categories found. Ensure your categories have a Parent ID assigned.
                    </div>
                )}
            </div>
        </div>
    )
}