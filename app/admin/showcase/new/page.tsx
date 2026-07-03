import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { ShowcaseForm } from "../showcase-form"

export default function NewShowcasePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/showcase"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">New Showcase Item</h1>
                    <p className="text-sm text-slate-500">Add an item to the &quot;Steal the Show&quot; section</p>
                </div>
            </div>
            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <ShowcaseForm />
            </div>
        </div>
    )
}
