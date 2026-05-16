import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import Image from "next/image"
import { Plus, Pencil, ImageIcon, LinkIcon, ChevronRight, Layers } from "lucide-react"
import { DeleteCategoryButton } from "@/components/admin/delete-category-button"
import { SearchInput } from "@/components/admin/search-input"
import { Card, CardContent } from "@/components/ui/card"

export default async function CategoriesPage({ searchParams }: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q } = await searchParams
    const supabase = await createClient()
    let query = supabase
        .from("categories")
        .select("*, parent:parent_id(name)")
        .order("created_at", { ascending: false })

    if (q) {
        query = query.ilike("name", `%${q}%`)
    }

    const { data: categories } = await query

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">Categories</h1>
                    <p className="text-sm text-muted-foreground">Manage your product hierarchy and banners.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-md">
                    <div className="w-full">
                        <SearchInput placeholder="Search categories..." />
                    </div>
                    <Button asChild className="w-full sm:w-auto rounded-xl h-11 shadow-lg shadow-black/5">
                        <Link href="/admin/categories/add">
                            <Plus className="w-4 h-4 mr-2" /> Add New
                        </Link>
                    </Button>
                </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block border rounded-2xl bg-white overflow-hidden shadow-xl shadow-slate-200/50">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100">
                            <TableHead className="w-[100px] py-5 px-6 font-bold text-slate-600 uppercase text-[10px] tracking-wider">Image</TableHead>
                            <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Slug</TableHead>
                            <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Parent</TableHead>
                            <TableHead className="text-right px-6 font-bold text-slate-600 uppercase text-[10px] tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                                    No categories found.
                                </TableCell>
                            </TableRow>
                        )}
                        {categories?.map((cat) => (
                            <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                <TableCell className="px-6">
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm">
                                        {cat.image_url ? (
                                            <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold text-slate-900">
                                    {cat.name}
                                </TableCell>
                                <TableCell className="text-slate-500 font-mono text-[11px]">
                                    {cat.slug}
                                </TableCell>
                                <TableCell>
                                    {cat.parent?.name ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-tight">
                                            {cat.parent.name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="icon" asChild className="h-9 w-9 rounded-lg border-slate-200 hover:bg-black hover:text-white transition-all">
                                            <Link href={`/admin/categories/${cat.id}`}><LinkIcon className="w-4 h-4" /></Link>
                                        </Button>
                                        <Button variant="outline" size="icon" asChild className="h-9 w-9 rounded-lg border-slate-200 hover:bg-black hover:text-white transition-all">
                                            <Link href={`/admin/categories/edit/${cat.id}`}><Pencil className="w-4 h-4" /></Link>
                                        </Button>
                                        <DeleteCategoryButton id={cat.id} name={cat.name} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="lg:hidden space-y-4">
                {categories?.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                        <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No categories found</p>
                    </div>
                )}
                {categories?.map((cat) => (
                    <Card key={cat.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
                        <CardContent className="p-0">
                            <div className="flex items-center p-4 gap-4">
                                {/* Category Image */}
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 shadow-sm">
                                    {cat.image_url ? (
                                        <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-slate-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-900 truncate">{cat.name}</h3>
                                        {cat.parent?.name && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-black uppercase">
                                                <Layers className="w-2.5 h-2.5" />
                                                {cat.parent.name}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400 truncate">{cat.slug}</p>
                                </div>

                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </div>

                            {/* Mobile Action Bar */}
                            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                                <Link href={`/admin/categories/${cat.id}`} className="py-3 flex justify-center items-center gap-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                                    <LinkIcon className="w-3.5 h-3.5" /> View
                                </Link>
                                <Link href={`/admin/categories/edit/${cat.id}`} className="py-3 flex justify-center items-center gap-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </Link>
                                <div className="py-3 flex justify-center items-center">
                                    <DeleteCategoryButton id={cat.id} name={cat.name} isMobile />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}