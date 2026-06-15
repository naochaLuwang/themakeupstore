import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import Image from "next/image"
import { Plus, Pencil, ImageIcon, LinkIcon } from "lucide-react"
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
        <div className="space-y-6">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Categories</h1>
                    <p className="text-sm text-slate-500">Manage your product hierarchy and banners.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-md">
                    <div className="w-full">
                        <SearchInput placeholder="Search categories..." />
                    </div>
                    <Button asChild className="w-full sm:w-auto rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                        <Link href="/admin/categories/add">
                            <Plus className="w-4 h-4 mr-2" /> Add New
                        </Link>
                    </Button>
                </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100">
                            <TableHead className="w-[100px] py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Image</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Name</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Slug</TableHead>
                            <TableHead className="py-4 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Parent</TableHead>
                            <TableHead className="py-4 px-6 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</TableHead>
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
                                <TableCell className="py-4 px-6">
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                                        {cat.image_url ? (
                                            <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 font-semibold text-slate-900">
                                    {cat.name}
                                </TableCell>
                                <TableCell className="py-4 px-6 text-slate-500 text-sm">
                                    {cat.slug}
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    {cat.parent?.name ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                            {cat.parent.name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="icon" asChild className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400">
                                            <Link href={`/admin/categories/${cat.id}`}><LinkIcon className="w-4 h-4" /></Link>
                                        </Button>
                                        <Button variant="outline" size="icon" asChild className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400">
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
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No categories found</p>
                    </div>
                )}
                {categories?.map((cat) => (
                    <Card key={cat.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex items-center p-4 gap-4">
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                    {cat.image_url ? (
                                        <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-slate-400" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-slate-900 truncate">{cat.name}</h3>
                                        {cat.parent?.name && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">{cat.parent.name}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{cat.slug}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                                <Link href={`/admin/categories/${cat.id}`} className="py-3 flex justify-center items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                    <LinkIcon className="w-3.5 h-3.5" /> View
                                </Link>
                                <Link href={`/admin/categories/edit/${cat.id}`} className="py-3 flex justify-center items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
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