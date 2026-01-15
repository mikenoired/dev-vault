import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SupportedLanguages } from "@/types";
import CodeEditor from "./CodeEditor";

export default function MarkdownRender({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, ...props }) => (
          <a
            {...props}
            className={`${props.className ? `${props.className} ` : ""}text-blue-400 underline`}
            style={{ color: "#60a5fa" }}
          >
            {props.children}
          </a>
        ),
        pre({ children }) {
          return (
            <div
              className="w-full max-w-full overflow-x-auto rounded-md border border-neutral-800"
              style={{ whiteSpace: "pre", overflowX: "auto" }}
            >
              {children}
            </div>
          );
        },
        code({ node, className, children, ...props }) {
          const isInline = !className || !/^language-/.test(className);
          if (isInline) {
            return (
              <code
                {...props}
                className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-300 w-full max-w-full overflow-x-auto"
                style={{ whiteSpace: "pre", overflowX: "auto" }}
              >
                {children}
              </code>
            );
          }
          const match = /language-(\w+)/.exec(className ?? "");
          const language = match?.[1] as SupportedLanguages;
          return (
            <CodeEditor
              readOnly={true}
              value={String(children).replace(/\n$/, "")}
              language={language}
            />
          );
        },
        h2: ({ node, ...props }) => <h2 {...props} className="text-2xl font-bold" />,
        h3: ({ node, ...props }) => <h3 {...props} className="text-xl font-bold" />,
        h4: ({ node, ...props }) => <h4 {...props} className="text-lg font-bold" />,
        h5: ({ node, ...props }) => <h5 {...props} className="text-base font-bold" />,
        h6: ({ node, ...props }) => <h6 {...props} className="text-sm font-bold" />,
        table: ({ node, ...props }) => (
          <table
            {...props}
            className="table-auto border border-neutral-800 rounded-lg overflow-hidden"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          />
        ),
        tbody: ({ node, ...props }) => (
          <tbody {...props} className="border-collapse border border-neutral-800" />
        ),
        thead: ({ node, ...props }) => (
          <thead {...props} className="border-collapse border border-neutral-800 rounded-t-lg" />
        ),
        tr: ({ node, ...props }) => <tr {...props} className="border border-neutral-800 p-2" />,
        td: ({ node, ...props }) => <td {...props} className="border-r border-neutral-800 p-2" />,
        th: ({ node, ...props }) => <th {...props} className="border-r border-neutral-800 p-2" />,
      }}
    >
      {content}
    </Markdown>
  );
}
