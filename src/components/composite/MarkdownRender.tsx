import type { ElementType } from "react";
import type { Components, Options } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import CodeEditor from "@/components/composite/CodeEditor";
import { Checkbox, cn } from "@/components/ui";
import type { SupportedLanguages } from "@/types";

type ExtendedComponents = Components & Record<string, ElementType>;

interface MarkdownRenderProps {
  content: string;
  remarkPlugins?: Plugin[];
  rehypePlugins?: Plugin[];
  components?: Partial<ExtendedComponents>;
  copyToClipboard?: boolean;
}

type CodeNode = {
  lang?: string | null;
  meta?: string | null;
  data?: {
    hProperties?: Record<string, unknown>;
  };
};

const attachCodeMetaPlugin: Plugin = () => (tree) => {
  visit(tree, "code", (node: unknown) => {
    const codeNode = node as CodeNode;
    if (!codeNode.meta) {
      return;
    }

    if (!codeNode.data) {
      codeNode.data = {};
    }

    const data = codeNode.data;
    if (!data.hProperties) {
      data.hProperties = {};
    }

    const hProperties = data.hProperties;
    hProperties["data-meta"] = codeNode.meta;
  });
};

export default function MarkdownRender({
  content,
  remarkPlugins = [],
  rehypePlugins = [],
  components = {},
  copyToClipboard,
  ...props
}: MarkdownRenderProps & Readonly<Options>) {
  const allRemarkPlugins = [remarkGfm, attachCodeMetaPlugin, ...remarkPlugins];
  const allRehypePlugins = [rehypeRaw, ...rehypePlugins];
  const isTaskList = (className?: string) => className?.includes("contains-task-list") ?? false;
  const isTaskListItem = (className?: string) => className?.includes("task-list-item") ?? false;

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
        className="w-full max-w-full overflow-x-auto rounded-md border border-border bg-card"
        style={{ whiteSpace: "pre", overflowX: "auto" }}
      >
        {children}
      </div>
    ),

    code: ({ className, children, node, ...props }) => {
      const isInline = !className || !/^language-/.test(className);
      if (isInline) {
        return (
          <code
            {...props}
            className="w-full max-w-full overflow-x-auto rounded border border-border bg-secondary px-1 py-0.5 text-foreground"
            style={{ whiteSpace: "pre", overflowX: "auto" }}
          >
            {children}
          </code>
        );
      }
      const match = /language-([\w-]+)/.exec(className ?? "");
      const language = match?.[1] as SupportedLanguages;
      const meta =
        typeof node?.properties?.["data-meta"] === "string" ? node.properties["data-meta"] : "";
      return (
        <CodeEditor
          readOnly={true}
          value={String(children).replace(/\n$/, "")}
          language={language}
          meta={meta}
          copyToClipboard={copyToClipboard}
          allowFolding={false}
        />
      );
    },

    h2: ({ ...props }) => <h2 {...props} className="text-2xl font-bold text-foreground/80" />,
    h3: ({ ...props }) => <h3 {...props} className="text-xl font-bold text-foreground/80" />,
    h4: ({ ...props }) => <h4 {...props} className="text-lg font-bold text-foreground/80" />,
    h5: ({ ...props }) => <h5 {...props} className="text-base font-bold text-foreground/80" />,
    h6: ({ ...props }) => <h6 {...props} className="text-sm font-bold text-foreground/80" />,
    input: ({ className, checked, disabled, type, ...props }) => {
      if (type !== "checkbox") {
        return <input className={className} type={type} disabled={disabled} {...props} />;
      }

      return (
        <Checkbox
          aria-label={checked ? "Снять задачу" : "Отметить задачу"}
          checked={checked === true}
          className={cn("mr-2 inline-flex align-[-0.1em]", className)}
          disabled={disabled ?? true}
          tabIndex={-1}
        />
      );
    },
    ul: ({ className, ...props }) => (
      <ul
        {...props}
        className={cn(
          isTaskList(className)
            ? "list-none space-y-1 pl-0"
            : "list-disc space-y-1 pl-6 text-foreground/85 marker:text-foreground/55",
          className,
        )}
      />
    ),
    ol: ({ className, ...props }) => (
      <ol
        {...props}
        className={cn(
          isTaskList(className)
            ? "list-none space-y-1 pl-0"
            : "list-decimal space-y-1 pl-6 text-foreground/85 marker:text-muted-foreground",
          className,
        )}
      />
    ),
    li: ({ className, ...props }) => (
      <li
        {...props}
        className={cn(
          isTaskListItem(className)
            ? "list-none pl-0 text-foreground/80"
            : "pl-1 text-foreground/85",
          className,
        )}
      />
    ),

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
    p: ({ ...props }) => <p {...props} className="text-foreground/80" />,
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
