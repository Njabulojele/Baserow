import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-6 border border-[#2f3e46] rounded-lg">
            <table className="w-full text-left border-collapse" {...props} />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th
            className="border-b border-[#2f3e46] bg-[#1a252f] p-3 font-mono text-xs uppercase tracking-widest text-[#a9927d]"
            {...props}
          />
        ),
        td: ({ node, ...props }) => (
          <td
            className="border-b border-[#2f3e46] p-3 text-sm text-gray-300"
            {...props}
          />
        ),
        a: ({ node, ...props }) => (
          <a
            className="text-blu hover:underline hover:text-blu/80 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        h1: ({ node, ...props }) => (
          <h1
            className="text-2xl font-bold font-mono text-white mt-8 mb-4 border-b border-[#2f3e46] pb-2"
            {...props}
          />
        ),
        h2: ({ node, ...props }) => (
          <h2
            className="text-xl font-bold font-mono text-white mt-6 mb-3"
            {...props}
          />
        ),
        h3: ({ node, ...props }) => (
          <h3
            className="text-lg font-bold font-mono text-white mt-4 mb-2"
            {...props}
          />
        ),
        li: ({ node, ...props }) => (
          <li className="my-1 text-gray-300" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside my-4 text-gray-300" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol
            className="list-decimal list-inside my-4 text-gray-300"
            {...props}
          />
        ),
        p: ({ node, ...props }) => (
          <p className="my-4 leading-relaxed text-gray-300" {...props} />
        ),
        pre: ({ node, ...props }) => (
          <pre
            className="bg-[#1a252f] border border-[#2f3e46] rounded-md p-4 overflow-x-auto my-4 text-xs font-mono text-gray-300"
            {...props}
          />
        ),
        code: ({ node, inline, ...props }: any) => {
          if (inline) {
            return (
              <code
                className="bg-[#1a252f] text-[#a9927d] px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              />
            );
          }
          return <code {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
