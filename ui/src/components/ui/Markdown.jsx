import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Rendered document (Lora body, Manrope headings). HTML comments of the generator header are dropped. */
export function Markdown({ text }) {
  const clean = String(text ?? '').replace(/<!--[\s\S]*?-->\n?/g, '');
  return (
    <div className="prose-document">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean}</ReactMarkdown>
    </div>
  );
}
