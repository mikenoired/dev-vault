import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import MarkdownRender from "@/components/composite/MarkdownRender";
import AdmonitionBlock from "../AdmonitionBlock";

const processContent = (content: string) => {
  const result = content.replace(/^\s*# .*(\r?\n)?/, ""); // Remove title
  return result;
};

function reactMarkdownRemarkDirective() {
  return (tree) => {
    visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node) => {
      const data = node.data || (node.data = {});
      data.hName = "admonition";
      data.hProperties = { type: node.name || "note" };
    });
  };
}

export default function DocRender({ content }: { content: string }) {
  const processedContent = processContent(content);
  return (
    <div className="prose prose-invert prose-neutral max-w-[65ch] mx-auto text-neutral-300 leading-relaxed whitespace-pre-wrap">
      <MarkdownRender
        components={{
          admonition: ({ node, children, ...props }) => {
            const type = (props as any).type ?? "note";
            return <AdmonitionBlock type={type}>{children}</AdmonitionBlock>;
          },
        }}
        content={processedContent}
        remarkPlugins={[remarkDirective, reactMarkdownRemarkDirective]}
      />
    </div>
  );
}
