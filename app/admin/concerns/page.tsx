import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import Image from "next/image"
import { Plus, Pencil } from "lucide-react"
import { SearchInput } from "@/components/admin/search-input"
import { DeleteConcernButton } from "@/components/admin/delete-concern-button"

export default async function ConcernsPage({ searchParams }: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q } = await searchParams
    const supabase = await createClient()
    let query = supabase
        .from("concerns")
        .select("*, product_concerns(count)")
        .order("name", { ascending: true })

    if (q) {
        query = query.ilike("name", `%${q}%`)
    }

    const { data: concerns } = await query

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Concerns</h1>
                    <p className="text-sm text-slate-500">Manage skin concerns and product associations.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-md">
                    <div className="w-full">
                        <SearchInput placeholder="Search concerns..." />
                    </div>
                    <Button asChild className="w-full sm:w-auto rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                        <Link href="/admin/concerns/add">
                            <Plus className="w-4 h-4 mr-1.5" />
                            New Concern
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Image</TableHead>
                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</TableHead>
                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Products</TableHead>
                            <TableHead className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!concerns || concerns.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900">No concerns found</p>
                                        <p className="text-xs text-slate-400">Create your first concern to get started.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            concerns.map((concern: any) => (
                                <TableRow key={concern.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4 px-6">
                                        {concern.image_url ? (
                                            <Image src={concern.image_url} alt={concern.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                <span className="text-xs font-bold text-slate-400">{concern.name[0]}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className="text-sm font-semibold text-slate-900">{concern.name}</span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className="text-sm text-slate-500">{concern.slug}</span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className="text-sm text-slate-500">{concern.product_concerns?.[0]?.count || 0} products</span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button asChild variant="ghost" className="rounded-lg h-9 w-9 border border-slate-200 p-0">
                                                <Link href={`/admin/concerns/edit/${concern.id}`}>
                                                    <Pencil className="w-4 h-4 text-slate-500" />
                                                </Link>
                                            </Button>
                                            <DeleteConcernButton id={concern.id} name={concern.name} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
