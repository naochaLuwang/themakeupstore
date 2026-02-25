// "use client"

// import { useState, useTransition } from "react"
// import { Search, PackagePlus, CheckSquare, Loader2 } from "lucide-react"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { toast } from "sonner"

// interface AddProductSidebarProps {
//     allProducts: any[]
//     categoryName: string
//     linkProductAction: (formData: FormData) => Promise<void>
//     linkMultipleAction: (ids: string[]) => Promise<void>
// }

// export function AddProductSidebar({
//     allProducts,
//     categoryName,
//     linkProductAction,
//     linkMultipleAction
// }: AddProductSidebarProps) {
//     const [searchTerm, setSearchTerm] = useState("")
//     const [isPending, startTransition] = useTransition()

//     // Client-side filter
//     const filteredProducts = allProducts.filter((p) =>
//         p.name.toLowerCase().includes(searchTerm.toLowerCase())
//     )

//     const handleLinkAll = () => {
//         const ids = filteredProducts.map(p => p.id)
//         startTransition(async () => {
//             try {
//                 await linkMultipleAction(ids)
//                 setSearchTerm("")
//                 toast.success(`Added ${ids.length} products to ${categoryName}`)
//             } catch (err) {
//                 toast.error("Failed to link products")
//             }
//         })
//     }

//     return (
//         <div className="p-6 border rounded-lg bg-slate-50 space-y-4 sticky top-6">
//             <h3 className="font-semibold flex items-center gap-2 text-slate-800">
//                 <PackagePlus className="w-4 h-4 text-blue-600" /> Add to {categoryName}
//             </h3>

//             <div className="relative">
//                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
//                 <Input
//                     placeholder="Search products..."
//                     className="pl-9 bg-white border-slate-200"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                 />
//             </div>

//             {/* Bulk Action UI */}
//             {searchTerm && filteredProducts.length > 1 && (
//                 <div className="p-3 bg-blue-50 border border-blue-100 rounded-md animate-in fade-in slide-in-from-top-2">
//                     <p className="text-xs text-blue-700 mb-2 font-medium">
//                         Found {filteredProducts.length} matching products
//                     </p>
//                     <Button
//                         variant="default"
//                         size="sm"
//                         className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
//                         onClick={handleLinkAll}
//                         disabled={isPending}
//                     >
//                         {isPending ? (
//                             <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
//                         ) : (
//                             <CheckSquare className="w-3.5 h-3.5 mr-2" />
//                         )}
//                         Link all results
//                     </Button>
//                 </div>
//             )}

//             <form action={linkProductAction} className="space-y-3 pt-2">
//                 <div className="space-y-1">
//                     <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Single Selection</label>
//                     <select
//                         name="productId"
//                         className="w-full p-2 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
//                         required
//                     >
//                         <option value="">
//                             {filteredProducts.length > 0 ? "Choose a product..." : "No results found"}
//                         </option>
//                         {filteredProducts.map(p => (
//                             <option key={p.id} value={p.id}>{p.name}</option>
//                         ))}
//                     </select>
//                 </div>

//                 <Button
//                     type="submit"
//                     className="w-full"
//                     disabled={filteredProducts.length === 0 || isPending}
//                 >
//                     {isPending ? "Processing..." : "Link Product"}
//                 </Button>
//             </form>
//         </div>
//     )
// }

"use client"

import { useState, useTransition } from "react"
import { Search, PackagePlus, CheckSquare, Loader2, Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface AddProductSidebarProps {
    allProducts: any[]
    categoryName: string
    linkProductAction: (formData: FormData) => Promise<void>
    linkMultipleAction: (ids: string[]) => Promise<void>
}

export function AddProductSidebar({
    allProducts,
    categoryName,
    linkProductAction,
    linkMultipleAction
}: AddProductSidebarProps) {
    const [open, setOpen] = useState(false)
    const [selectedId, setSelectedId] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [isPending, startTransition] = useTransition()

    // Filter products for the Bulk Action count
    const filteredProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSingleLink = async () => {
        if (!selectedId) return

        const formData = new FormData()
        formData.append("productId", selectedId)

        startTransition(async () => {
            try {
                await linkProductAction(formData)
                setSelectedId("")
                toast.success("Product linked successfully")
            } catch (err) {
                toast.error("Failed to link product")
            }
        })
    }

    const handleLinkAll = () => {
        const ids = filteredProducts.map(p => p.id)
        startTransition(async () => {
            try {
                await linkMultipleAction(ids)
                setSearchTerm("")
                toast.success(`Added ${ids.length} products to ${categoryName}`)
            } catch (err) {
                toast.error("Failed to link products")
            }
        })
    }

    return (
        <div className="p-5 lg:p-6 border border-slate-200 rounded-3xl bg-white space-y-5 lg:sticky lg:top-6 shadow-sm">
            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-900 rounded-lg text-white">
                        <PackagePlus className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-900 text-sm lg:text-base tracking-tight uppercase">
                        Assign Items
                    </h3>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-9">
                    {categoryName}
                </p>
            </div>

            {/* Selection UI */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">
                        Choose Product
                    </label>

                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full h-12 justify-between rounded-xl border-slate-200 bg-white px-4 text-sm font-medium shadow-none hover:bg-slate-50 transition-all"
                            >
                                {selectedId
                                    ? allProducts.find((p) => p.id === selectedId)?.name
                                    : "Search product catalog..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-slate-200 shadow-2xl overflow-hidden" align="start">
                            <Command className="bg-white">
                                <CommandInput
                                    placeholder="Type to search..."
                                    className="h-12 border-none focus:ring-0"
                                    onValueChange={setSearchTerm}
                                />
                                <CommandList className="max-h-[300px] no-scrollbar">
                                    <CommandEmpty className="py-6 text-center text-xs text-slate-400">No results found.</CommandEmpty>
                                    <CommandGroup>
                                        {allProducts.map((product) => (
                                            <CommandItem
                                                key={product.id}
                                                value={product.name}
                                                onSelect={() => {
                                                    setSelectedId(product.id)
                                                    setOpen(false)
                                                }}
                                                className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-slate-50"
                                            >
                                                <span className="font-semibold text-slate-800 text-xs">{product.name}</span>
                                                <Check className={cn("h-4 w-4 text-black", selectedId === product.id ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                <Button
                    onClick={handleSingleLink}
                    className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-black font-bold transition-all shadow-lg shadow-black/5"
                    disabled={!selectedId || isPending}
                >
                    {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Plus className="w-4 h-4 mr-2" />
                    )}
                    Link Selected
                </Button>
            </div>

            {/* Bulk Action UI - Re-styled for Luxury */}
            {searchTerm && filteredProducts.length > 1 && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Match Found
                            </p>
                        </div>
                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-100">
                            {filteredProducts.length} items
                        </span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white border-slate-200 text-slate-900 hover:bg-slate-900 hover:text-white rounded-xl h-10 font-bold text-xs"
                        onClick={handleLinkAll}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : "Add All Results"}
                    </Button>
                </div>
            )}

            <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Real-time Sync Active
            </p>
        </div>
    )
}