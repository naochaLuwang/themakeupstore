"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
    Bold, Italic, List, ListOrdered,
    Underline as UnderlineIcon, Undo, Redo,
    ImageIcon, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef, useState } from 'react'
import { uploadEditorImage } from '@/app/actions/upload' // Import Action

export function RichTextEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-2xl border border-slate-100 max-w-full h-auto my-4 shadow-sm'
                },
            }),
        ],
        content: value,
        immediatelyRender: false, // FIX: Resolves the SSR Hydration Error
        editorProps: {
            attributes: {
                class: 'min-h-[200px] w-full rounded-b-2xl bg-white px-4 py-3 text-sm focus:outline-none prose prose-sm max-w-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !editor) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            // Call Server Action directly
            const data = await uploadEditorImage(formData)
            if (data.url) {
                editor.chain().focus().setImage({ src: data.url }).run()
            }
        } catch (error) {
            console.error("Upload error", error)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    if (!editor) return null

    return (
        <div className="rounded-2xl border border-slate-200 overflow-hidden focus-within:border-slate-900 transition-all bg-white shadow-sm">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
            />

            <div className="flex flex-wrap items-center gap-1 bg-slate-50/80 backdrop-blur-md p-2 border-b border-slate-200">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                >
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                >
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                >
                    <UnderlineIcon className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                >
                    <List className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                >
                    <ListOrdered className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <ToolbarButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                        <ImageIcon className="w-4 h-4" />
                    )}
                </ToolbarButton>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
                    <Undo className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
                    <Redo className="w-4 h-4" />
                </ToolbarButton>
            </div>

            <EditorContent editor={editor} />
        </div>
    )
}

function ToolbarButton({ onClick, active, disabled, children }: any) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onClick}
            className={`h-8 w-8 p-0 rounded-md transition-all ${active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'
                }`}
        >
            {children}
        </Button>
    )
}