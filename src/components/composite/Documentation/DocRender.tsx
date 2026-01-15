import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import MarkdownRender from "@/components/composite/MarkdownRender";
import AdmonitionBlock from "../AdmonitionBlock";

const contentProcessor = (content: string) => {
  let result = content.replace(/^\s*# .*(\r?\n)?/, "");
  result = result.replace(/^([^\n]+)\n=+\s*(\r?\n)?/m, "");

  const admonitions = [
    "secondary",
    "info",
    "success",
    "danger",
    "note",
    "tip",
    "warning",
    "important",
    "caution",
  ];
  admonitions.forEach((admonition) => {
    result = result.replace(new RegExp(`^::: +${admonition}`, "gm"), `:::${admonition}`);
  });
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
  const processedContent = contentProcessor(content);

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
