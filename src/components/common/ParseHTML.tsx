import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
const ParseHTML = ({ markdown }: { markdown: string }) => {
  const processedMarkdown = markdown
    ? markdown
        .replace(/\\n/g, "\n")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/<think>[\s\S]*$/g, "")
        .replace(/<response>[\s\S]*?<\/response>/gi, "")
        .replace(/<response>[\s\S]*$/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
        .replace(/\bon\w+\s*=/gi, "data-removed=")
    : "";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      className="prose break-words markdown"
      components={{
        ul: ({ node, ...props }) => (
          <ul
            style={{
              display: "block",
              listStyleType: "disc",
            }}
            {...props}
          />
        ),
        ol: ({ node, ...props }) => (
          <ol
            style={{
              display: "block",
              listStyleType: "decimal",
            }}
            {...props}
          />
        ),
        li: ({ node, ...props }) => (
          <li style={{ margin: "6px 0" }} {...props} />
        ),
        a: ({ node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-secondary-900 underline"
          />
        ),
        cite: ({ node, ...props }) => (
          <sup
            className="inline-flex items-center justify-center text-[10px] font-semibold text-primary bg-primary/10 rounded-full min-w-[16px] h-4 px-1 ml-0.5 -top-1 relative select-none"
            {...props}
          />
        ),
      }}
    >
      {processedMarkdown}
    </ReactMarkdown>
  );
};

export default ParseHTML;
