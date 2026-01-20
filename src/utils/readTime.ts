/**
 * Calculates the approximate reading time of text in Markdown format
 * @param markdown - text in Markdown format
 * @param wordsPerMinute - reading speed (words per minute), default 200
 * @returns object with reading time in minutes and number of words
 */
export default function calculateReadingTime(
  markdown: string,
  wordsPerMinute: number = 200,
): { minutes: number; words: number } {
  const safeWordsPerMinute = wordsPerMinute > 0 ? wordsPerMinute : 200;
  let text = markdown.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`[^`]+`/g, "");
  text = text.replace(/<[^>]*>/g, "");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");

  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  text = text.replace(/^>\s+/gm, "");
  text = text.replace(/^[-*_]{3,}$/gm, "");
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const minutes = Math.ceil(words / safeWordsPerMinute);

  return {
    minutes,
    words,
  };
}
