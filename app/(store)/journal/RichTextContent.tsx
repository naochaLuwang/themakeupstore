import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'

export default function RichTextContent({ jsonContent }: { jsonContent: any }) {
    if (!jsonContent) return null;

    const output = generateHTML(jsonContent, [StarterKit]);

    return (
        <div
            className="journal-article-content"
            dangerouslySetInnerHTML={{ __html: output }}
        />
    );
}