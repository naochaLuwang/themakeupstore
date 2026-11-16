'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { setCategoryVisibility } from '@/app/actions/category-visibility'
import { Button } from '@/components/ui/button'
import {
    AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export function CategoryStatusButton({ id, name, active }: { id: string; name: string; active: boolean }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const saving = useRef(false)
    const label = active ? 'Deactivate' : 'Activate'

    async function save() {
        if (saving.current) return
        saving.current = true
        setPending(true)
        setError(null)
        try {
            const result = await setCategoryVisibility(id, !active, active)
            if (result.error) { setError(result.error); return }
            toast.success(active ? `Category deactivated · ${result.products} products deactivated` : 'Category activated')
            setOpen(false)
            router.refresh()
        } catch {
            setError('Unable to confirm the update. Refresh before trying again.')
        } finally {
            saving.current = false
            setPending(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={value => { if (!saving.current) { setOpen(value); setError(null) } }}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 px-3 text-xs font-semibold" aria-label={`${label} ${name}`}>
                    {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {label}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-slate-200">
                <AlertDialogHeader>
                    <AlertDialogTitle>{label} {name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {active ? 'This category, its subcategories and their products will become inactive, including products listed in other categories.'
                            : 'Only this category will be activated. Products and subcategories stay inactive until you activate them.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending} className="rounded-xl">Cancel</AlertDialogCancel>
                    <Button onClick={save} disabled={pending} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {pending ? 'Saving…' : label}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
