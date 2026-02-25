"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { deleteCategory } from "@/app/actions/categories"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteCategoryButtonProps {
    id: string
    name: string
    isMobile?: boolean // Prop added for mobile responsiveness
}

export function DeleteCategoryButton({ id, name, isMobile }: DeleteCategoryButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        const res = await deleteCategory(id)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(`${name} deleted successfully`)
        }
        setLoading(false)
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {isMobile ? (
                    /* MOBILE STYLE: Full-width button for the card grid */
                    <button className="w-full py-3 flex justify-center items-center gap-2 text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                    </button>
                ) : (
                    /* DESKTOP STYLE: Compact icon button for the table */
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                )}
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl border-slate-200 shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black text-slate-900">
                        Delete Category?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500">
                        Are you sure you want to delete <span className="font-bold text-slate-900">"{name}"</span>? 
                        This action cannot be undone and may affect products currently assigned to this category.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 mt-4">
                    <AlertDialogCancel className="rounded-xl border-slate-200 font-bold">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="rounded-xl bg-red-500 hover:bg-red-600 font-bold"
                    >
                        Confirm Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}