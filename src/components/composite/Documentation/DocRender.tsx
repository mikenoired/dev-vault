import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";

function getLangExtension(lang: string | undefined) {
  if (!lang) return [];
  switch (lang.toLowerCase()) {
    case "js":
    case "jsx":
    case "javascript":
      return [javascript()];
    case "py":
    case "python":
      return [python()];
    case "rs":
    case "rust":
      return [rust()];
    default:
      return [];
  }
}

const CodeMirrorView = ({ code, language }: { code: string; language?: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Clear any previous editor
    ref.current.innerHTML = "";

    const extensions = [
      basicSetup,
      oneDark,
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
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className={`${props.className ? `${props.className} ` : ""}text-blue-400 underline`}
              style={{ color: "#60a5fa" }} // just in case prose overrides
            >
              {props.children}
            </a>
          ),
          // We replace <pre> to ensure correct max width and no overflow
          pre({ node, className, children, ...props }) {
            return (
              <div
                className="w-full max-w-full overflow-x-auto rounded-md border border-neutral-800 my-4"
                style={{ whiteSpace: "pre", overflowX: "auto" }}
              >
                {/* Ensure inner <code> is rendered and styled appropriately with no-break */}
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
            // Since <pre> will now always wrap this, just insert CodeMirrorView
            return (
              <CodeMirrorView code={String(children).replace(/\n$/, "")} language={language} />
            );
          },
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}
