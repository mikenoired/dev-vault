import Markdown from "react-markdown";

const contentProcessor = (content: string) => {
  let result = content.replace(/^\s*# .*(\r?\n)?/, "");

  result = result.replace(/^([^\n]+)\n=+\s*(\r?\n)?/m, "");

  return result;
};

export default function DocRender({ content }: { content: string }) {
  const processedContent = contentProcessor(content);
  return (
    <div className="prose prose-invert prose-neutral max-w-[65ch] mx-auto text-neutral-300 leading-relaxed whitespace-pre-wrap">
      <Markdown>{processedContent}</Markdown>
    </div>
  );
}
