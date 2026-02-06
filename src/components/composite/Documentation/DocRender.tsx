import type { ReactNode } from "react";
import remarkDirective from "remark-directive";
import type { Plugin, Transformer } from "unified";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import AdmonitionBlock from "@/components/composite/AdmonitionBlock";
import MarkdownRender from "@/components/composite/MarkdownRender";

const processContent = (content: string) => {
  const result = content.replace(/^\s*# .*(\r?\n)?/, ""); // Remove title
  return result;
};

type DirectiveNode = {
  data?: { hName?: string; hProperties?: Record<string, unknown> };
  name?: string;
};

type AdmonitionProps = {
  children?: ReactNode;
  type?: string;
} & Record<string, unknown>;

const reactMarkdownRemarkDirective: Plugin = () => {
  const transformer: Transformer = (tree: Node) => {
    visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node: unknown) => {
      const directiveNode = node as DirectiveNode;
      const setDirectiveNodeData = () => {
        if (!directiveNode.data) directiveNode.data = {};
        return directiveNode.data;
      };
      const data = setDirectiveNodeData();
      data.hName = "admonition";
      data.hProperties = { type: directiveNode.name || "note" };
    });
  };

  return transformer;
};

export default function DocRender({ content }: { content: string }) {
  const processedContent = processContent(content);
  return (
    <div className="prose prose-invert prose-neutral max-w-[65ch] mx-auto text-neutral-300 leading-relaxed whitespace-pre-wrap">
      <MarkdownRender
        components={{
          admonition: ({ children, ...props }: AdmonitionProps) => {
            const type = props.type ?? "note";
            return <AdmonitionBlock type={type}>{children as ReactNode}</AdmonitionBlock>;
          },
        }}
        copyToClipboard={true}
        content={processedContent}
        remarkPlugins={[remarkDirective, reactMarkdownRemarkDirective]}
      />
    </div>
  );
}
