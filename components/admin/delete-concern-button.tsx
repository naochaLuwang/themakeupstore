"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { deleteConcern } from "@/app/actions/concerns"
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

export function DeleteConcernButton({ id, name }: { id: string, name: string }) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        const res = await deleteConcern(id)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(`"${name}" deleted`)
        }
        setLoading(false)
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl border-slate-200 shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black text-slate-900">
                        Delete Concern?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500">
                        Are you sure you want to delete <span className="font-bold text-slate-900">"{name}"</span>?
                        Products linked to this concern will not be affected.
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
