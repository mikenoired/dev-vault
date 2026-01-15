import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const bashLang = StreamLanguage.define(shell);

function getLangExtension(lang: string | undefined) {
  if (!lang) return [];
  switch (lang.toLowerCase()) {
    case "js":
    case "jsx":
    case "javascript":
    case "ts":
    case "tsx":
    case "typescript":
      return [
        javascript({
          jsx: true,
          typescript: true,
        }),
      ];
    case "py":
    case "python":
      return [python()];
    case "rs":
    case "rust":
      return [rust()];
    case "bash":
    case "sh":
      return [bashLang];
    default:
      return [];
  }
}

const CodeMirrorView = ({ code, language }: { code: string; language?: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const theme = EditorView.theme({
      ".cm-content, .cm-gutterElement": {
        fontSize: "14px",
      },
    });

    const extensions = [
      basicSetup,
      oneDark,
      theme,
      ...getLangExtension(language),
      EditorView.editable.of(false),
    ];

    new EditorView({
      doc: code,
      extensions,
      parent: ref.current,
    });
  }, [code, language]);
  return <div ref={ref} className="rounded-md border border-neutral-800 overflow-hidden text-xs" />;
};

const contentProcessor = (content: string) => {
  let result = content.replace(/^\s*# .*(\r?\n)?/, "");
  result = result.replace(/^([^\n]+)\n=+\s*(\r?\n)?/m, "");
  return result;
};

export default function DocRender({ content }: { content: string }) {
  const processedContent = contentProcessor(content);

  return (
    <div className="prose prose-invert prose-neutral max-w-[65ch] mx-auto text-neutral-300 leading-relaxed whitespace-pre-wrap">
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
                className="w-full max-w-full overflow-x-auto rounded-md border border-neutral-800 my-4"
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
            const language = match?.[1];
            return (
              <CodeMirrorView code={String(children).replace(/\n$/, "")} language={language} />
            );
          },
          h2: ({ node, ...props }) => <h2 {...props} className="text-2xl font-bold" />,
          h3: ({ node, ...props }) => <h3 {...props} className="text-xl font-bold" />,
          h4: ({ node, ...props }) => <h4 {...props} className="text-lg font-bold" />,
          h5: ({ node, ...props }) => <h5 {...props} className="text-base font-bold" />,
          h6: ({ node, ...props }) => <h6 {...props} className="text-sm font-bold" />,
          table: ({ node, ...props }) => (
            <table {...props} className="table-auto border-collapse border border-neutral-800" />
          ),
          tbody: ({ node, ...props }) => (
            <tbody {...props} className="border-collapse border border-neutral-800" />
          ),
          tr: ({ node, ...props }) => <tr {...props} className="border-b border-neutral-800 p-2" />,
          td: ({ node, ...props }) => <td {...props} className="border-r border-neutral-800 p-2" />,
          th: ({ node, ...props }) => <th {...props} className="border-r border-neutral-800 p-2" />,
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}
