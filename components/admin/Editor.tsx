"use client"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, Heading2, Quote } from 'lucide-react'

export default function Editor({ value, onChange }: { value: any, onChange: (val: any) => void }) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || "<p>Write your article here...</p>",

        // ADD THIS LINE TO FIX THE SSR ERROR:
        immediatelyRender: false,

        editorProps: {
            attributes: {
                class: 'prose prose-zinc dark:prose-invert max-w-none min-h-[400px] focus:outline-none p-6 bg-white dark:bg-zinc-900 rounded-b-2xl border-x border-b border-zinc-200 dark:border-zinc-800',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON())
        },
    })

    if (!editor) return null

    const MenuButton = ({ onClick, isActive, children }: any) => (
        <button
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`p-2 rounded-md transition-colors ${isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
        >
            {children}
        </button>
    )

    return (
        <div className="w-full">
            <div className="flex flex-wrap gap-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl">
                <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}><Bold size={18} /></MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}><Italic size={18} /></MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading')}><Heading2 size={18} /></MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}><List size={18} /></MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}><Quote size={18} /></MenuButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    )
}