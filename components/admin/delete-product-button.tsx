"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteProductButtonProps {
    productId: string
    onDelete: (formData: FormData) => Promise<void>
}

export function DeleteProductButton({ productId, onDelete }: DeleteProductButtonProps) {
    return (
        <form
            action={onDelete}
            onSubmit={(e) => {
                if (!confirm("Are you sure? This will permanently delete the product and all its variants.")) {
                    e.preventDefault()
                }
            }}
        >
            <input type="hidden" name="productId" value={productId} />
            <Button
                variant="ghost"
                size="icon"
                type="submit"
                className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </form>
    )
}