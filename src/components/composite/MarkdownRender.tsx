import type { ElementType } from "react";
import type { Components, Options } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Plugin } from "unified";
import type { SupportedLanguages } from "@/types";
import CodeEditor from "./CodeEditor";

type ExtendedComponents = Components & Record<string, ElementType>;

interface MarkdownRenderProps {
  content: string;
  remarkPlugins?: Plugin[];
  rehypePlugins?: Plugin[];
  components?: Partial<ExtendedComponents>;
  copyToClipboard?: boolean;
}

export default function MarkdownRender({
  content,
  remarkPlugins = [],
  rehypePlugins = [],
  components = {},
  copyToClipboard,
  ...props
}: MarkdownRenderProps & Readonly<Options>) {
  const allRemarkPlugins = [remarkGfm, ...remarkPlugins];
  const allRehypePlugins = [rehypeRaw, ...rehypePlugins];

  const allComponents: ExtendedComponents = {
    a: ({ ...props }) => (
      <a
        {...props}
        className={`${props.className ? `${props.className} ` : ""}text-blue-400 underline`}
        style={{ color: "#60a5fa" }}
      >
        {props.children}
      </a>
    ),

    pre: ({ children }) => (
      <div
        className="w-full max-w-full overflow-x-auto rounded-md border border-neutral-800"
        style={{ whiteSpace: "pre", overflowX: "auto" }}
      >
        {children}
      </div>
    ),

    code: ({ className, children, ...props }) => {
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
          copyToClipboard={copyToClipboard}
        />
      );
    },

    h2: ({ ...props }) => <h2 {...props} className="text-2xl font-bold" />,
    h3: ({ ...props }) => <h3 {...props} className="text-xl font-bold" />,
    h4: ({ ...props }) => <h4 {...props} className="text-lg font-bold" />,
    h5: ({ ...props }) => <h5 {...props} className="text-base font-bold" />,
    h6: ({ ...props }) => <h6 {...props} className="text-sm font-bold" />,

    table: ({ ...props }) => (
      <table
        {...props}
        className="table-auto border border-neutral-800 rounded-lg overflow-hidden"
        style={{ borderCollapse: "separate", borderSpacing: 0 }}
      />
    ),
    tbody: ({ ...props }) => (
      <tbody {...props} className="border-collapse border border-neutral-800" />
    ),
    thead: ({ ...props }) => (
      <thead {...props} className="border-collapse border border-neutral-800 rounded-t-lg" />
    ),
    tr: ({ ...props }) => <tr {...props} className="border border-neutral-800 p-2" />,
    td: ({ ...props }) => <td {...props} className="border-r border-neutral-800 p-2" />,
    th: ({ ...props }) => <th {...props} className="border-r border-neutral-800 p-2" />,
    ...components,
  };

  return (
    <Markdown
      remarkPlugins={allRemarkPlugins}
      rehypePlugins={allRehypePlugins}
      components={allComponents}
      {...props}
    >
      {content}
    </Markdown>
  );
}
