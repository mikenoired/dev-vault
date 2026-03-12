import type { ElementType } from "react";
import type { Components, Options } from "react-markdown";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Plugin } from "unified";
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
          isTaskList(className) ? "list-none space-y-1 pl-0" : "list-disc pl-6",
          className,
        )}
      />
    ),
    ol: ({ className, ...props }) => (
      <ol
        {...props}
        className={cn(
          isTaskList(className) ? "list-none space-y-1 pl-0" : "list-decimal pl-6",
          className,
        )}
      />
    ),
    li: ({ className, ...props }) => (
      <li
        {...props}
        className={cn(
          isTaskListItem(className) ? "list-none pl-0 text-foreground/80" : undefined,
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
