import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { EditorState } from "@codemirror/state";
import type { Command } from "@codemirror/view";
import { keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { basicSetup, EditorView, minimalSetup } from "codemirror";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { markdownLivePreview } from "@/components/composite/editor/markdownLivePreview";
import { cn } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import type { SupportedLanguages } from "@/types";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: SupportedLanguages;
  markdownViewMode?: "source" | "live";
  noteMode?: boolean;
  readOnly?: boolean;
  copyToClipboard?: boolean;
  fontSize?: number;
  allowFolding?: boolean;
}

const bashLang = StreamLanguage.define(shell);
const markdownPairChars = new Set(["*", "_", "`"]);
const markdownLinkPattern = /\[[^\]\n]+\]\([^)]+\)/g;
const darkCodeHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier], color: "#c792ea" },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: "#ff5370" },
  { tag: [tags.number, tags.integer, tags.float], color: "#f78c6c" },
  { tag: [tags.string, tags.special(tags.string)], color: "#c3e88d" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#546e7a" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#82aaff" },
  { tag: [tags.className, tags.typeName, tags.namespace], color: "#ffcb6b" },
  { tag: [tags.operator, tags.punctuation, tags.separator], color: "#89ddff" },
  { tag: [tags.propertyName, tags.attributeName], color: "#c792ea" },
  { tag: [tags.link, tags.url], color: "#80cbc4", textDecoration: "underline" },
  { tag: tags.heading, color: "#82aaff", fontWeight: "700" },
  { tag: [tags.emphasis], fontStyle: "italic" },
  { tag: [tags.strong], fontWeight: "700" },
  { tag: [tags.monospace], color: "#ffcb6b" },
]);
const lightCodeHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier], color: "#7c3aed" },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: "#be123c" },
  { tag: [tags.number, tags.integer, tags.float], color: "#c2410c" },
  { tag: [tags.string, tags.special(tags.string)], color: "#15803d" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#64748b" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#1d4ed8" },
  { tag: [tags.className, tags.typeName, tags.namespace], color: "#b45309" },
  { tag: [tags.operator, tags.punctuation, tags.separator], color: "#0f766e" },
  { tag: [tags.propertyName, tags.attributeName], color: "#7c3aed" },
  { tag: [tags.link, tags.url], color: "#0f766e", textDecoration: "underline" },
  { tag: tags.heading, color: "#1d4ed8", fontWeight: "700" },
  { tag: [tags.emphasis], fontStyle: "italic" },
  { tag: [tags.strong], fontWeight: "700" },
  { tag: [tags.monospace], color: "#b45309" },
]);

function createCodeTheme(isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        color: "var(--foreground)",
        backgroundColor: "var(--card)",
      },
      ".cm-content": {
        caretColor: "var(--foreground)",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--foreground)",
      },
      ".cm-selectionBackground, ::selection": {
        backgroundColor: isDark
          ? "color-mix(in oklab, var(--accent) 72%, transparent)"
          : "color-mix(in oklab, var(--accent) 88%, white 12%)",
      },
      ".cm-activeLine": {
        backgroundColor: isDark
          ? "color-mix(in oklab, var(--accent) 34%, transparent)"
          : "color-mix(in oklab, var(--accent) 62%, white 38%)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDark
          ? "color-mix(in oklab, var(--accent) 26%, transparent)"
          : "color-mix(in oklab, var(--accent) 48%, white 52%)",
      },
      ".cm-gutters": {
        color: "var(--muted-foreground)",
        backgroundColor: "var(--card)",
        borderRight: "1px solid var(--border)",
      },
      ".cm-scroller": {
        backgroundColor: "var(--card)",
      },
      ".cm-panels": {
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
      },
      ".cm-searchMatch, .cm-selectionMatch": {
        backgroundColor: isDark
          ? "color-mix(in oklab, var(--chart-4) 22%, transparent)"
          : "color-mix(in oklab, var(--chart-4) 42%, white 58%)",
        outline: "1px solid color-mix(in oklab, var(--chart-4) 42%, var(--border))",
      },
      ".cm-foldPlaceholder": {
        backgroundColor: "var(--secondary)",
        border: "1px solid var(--border)",
        color: "var(--muted-foreground)",
      },
    },
    { dark: isDark },
  );
}

function resolveDocumentTheme(): "light" | "dark" {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function isCursorInsideMarkdownLink(view: EditorView, cursorPos: number): boolean {
  const line = view.state.doc.lineAt(cursorPos);
  const cursorInLine = cursorPos - line.from;

  markdownLinkPattern.lastIndex = 0;
  let match = markdownLinkPattern.exec(line.text);
  while (match) {
    if (match.index !== undefined) {
      const start = match.index;
      const end = start + match[0].length;
      if (cursorInLine >= start && cursorInLine <= end) return true;
    }
    match = markdownLinkPattern.exec(line.text);
  }
  return false;
}

function selectionContainsLink(selection: string): boolean {
  if (!selection) return false;
  markdownLinkPattern.lastIndex = 0;
  return markdownLinkPattern.test(selection);
}

function applyWrap(view: EditorView, left: string, right = left): boolean {
  const selection = view.state.selection.main;
  const selected = view.state.sliceDoc(selection.from, selection.to);

  if (selection.empty) {
    if (isCursorInsideMarkdownLink(view, selection.from)) {
      return true;
    }
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: `${left}${right}` },
      selection: { anchor: selection.from + left.length },
    });
    return true;
  }

  if (selected.startsWith(left) && selected.endsWith(right)) {
    const unwrapped = selected.slice(left.length, selected.length - right.length);
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: unwrapped },
      selection: { anchor: selection.from, head: selection.from + unwrapped.length },
    });
    return true;
  }

  if (selectionContainsLink(selected)) {
    return true;
  }
  if (
    isCursorInsideMarkdownLink(view, selection.from) ||
    isCursorInsideMarkdownLink(view, selection.to)
  ) {
    return true;
  }
  if (selected.includes("*") || selected.includes("_") || selected.includes("`")) {
    return true;
  }

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: `${left}${selected}${right}` },
    selection: { anchor: selection.from + left.length, head: selection.to + left.length },
  });
  return true;
}

const toggleBold: Command = (view) => applyWrap(view, "**");
const toggleItalic: Command = (view) => applyWrap(view, "*");
const wrapLink: Command = (view) => {
  const selection = view.state.selection.main;
  const selected = view.state.sliceDoc(selection.from, selection.to);
  const label = selected.length > 0 ? selected : "text";
  const wrapped = `[${label}](https://)`;
  const urlStartOffset = wrapped.indexOf("https://");

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: wrapped },
    selection: {
      anchor: selection.from + urlStartOffset,
      head: selection.from + urlStartOffset + "https://".length,
    },
  });
  return true;
};

const pairAwareBackspace: Command = (view) => {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;

  const cursor = selection.from;
  if (cursor === 0 || cursor >= view.state.doc.length) return false;

  const prevOne = view.state.sliceDoc(cursor - 1, cursor);
  const nextOne = view.state.sliceDoc(cursor, cursor + 1);
  const prevTwo = cursor >= 2 ? view.state.sliceDoc(cursor - 2, cursor) : "";
  const nextTwo =
    cursor + 2 <= view.state.doc.length ? view.state.sliceDoc(cursor, cursor + 2) : "";

  if ((prevTwo === "**" && nextTwo === "**") || (prevTwo === "__" && nextTwo === "__")) {
    view.dispatch({
      changes: [
        { from: cursor - 1, to: cursor },
        { from: cursor, to: cursor + 1 },
      ],
      selection: { anchor: cursor - 1 },
    });
    return true;
  }

  if (prevOne === nextOne && markdownPairChars.has(prevOne)) {
    view.dispatch({
      changes: { from: cursor - 1, to: cursor + 1, insert: "" },
      selection: { anchor: cursor - 1 },
    });
    return true;
  }

  return false;
};

function noteMarkdownInputHandler(
  view: EditorView,
  from: number,
  to: number,
  text: string,
  insert: () => unknown,
): boolean {
  if (!markdownPairChars.has(text)) {
    const transaction = insert();
    if (transaction) {
      view.dispatch(transaction as Parameters<typeof view.dispatch>[0]);
      return true;
    }
    return false;
  }

  const hasSelection = from !== to;
  if (hasSelection) {
    const selected = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: `${text}${selected}${text}` },
      selection: { anchor: from + 1, head: from + 1 + selected.length },
    });
    return true;
  }

  const prevOne = from > 0 ? view.state.sliceDoc(from - 1, from) : "";
  const nextOne = from < view.state.doc.length ? view.state.sliceDoc(from, from + 1) : "";

  if ((text === "*" || text === "_") && prevOne === text && nextOne === text) {
    view.dispatch({
      changes: { from, to: from + 1, insert: text.repeat(3) },
      selection: { anchor: from + 2 },
    });
    return true;
  }

  if (nextOne === text) {
    view.dispatch({ selection: { anchor: from + 1 } });
    return true;
  }

  view.dispatch({
    changes: { from, to, insert: `${text}${text}` },
    selection: { anchor: from + 1 },
  });
  return true;
}

function getLangExtension(lang: SupportedLanguages | undefined) {
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
    case "md":
    case "markdown":
      return [markdown()];
    default:
      return [];
  }
}

export default function CodeEditor({
  value,
  onChange,
  language = "javascript",
  markdownViewMode = "source",
  noteMode = false,
  readOnly = false,
  copyToClipboard = false,
  fontSize = 14,
  allowFolding = true,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(resolveDocumentTheme);
  const effectiveFontSize = noteMode ? 16 : fontSize;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const syncTheme = () => {
      setResolvedTheme(resolveDocumentTheme());
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const themeConfig: Record<string, Record<string, string>> = {
      ".cm-content, .cm-gutterElement": {
        fontSize: `${effectiveFontSize}px`,
      },
    };

    if (noteMode) {
      const noteFontFamily =
        'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Helvetica, Arial, sans-serif';

      themeConfig["&, &.cm-focused"] = {
        background: "transparent !important",
        outline: "none !important",
        boxShadow: "none !important",
        fontFamily: noteFontFamily,
      };
      themeConfig[".cm-gutters"] = {
        display: "none",
      };
      themeConfig[".cm-scroller"] = {
        background: "transparent !important",
        outline: "none !important",
        boxShadow: "none !important",
        maxHeight: "none !important",
        overflowX: "auto",
        overflowY: "visible !important",
        fontFamily: noteFontFamily,
      };
      themeConfig[".cm-activeLine, .cm-activeLineGutter"] = {
        background: "transparent !important",
      };
      themeConfig[".cm-content"] = {
        color: "var(--foreground)",
        fontFamily: noteFontFamily,
        padding: "0",
      };
      themeConfig[".cm-content, .cm-line"] = {
        background: "transparent !important",
        fontFamily: noteFontFamily,
      };
      themeConfig[".cm-content span"] = {
        color: "inherit !important",
      };
    }

    const theme = EditorView.theme(themeConfig);
    const isDarkTheme = resolvedTheme === "dark";

    const extensions = [
      allowFolding ? basicSetup : minimalSetup,
      getLangExtension(language),
      theme,
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

    if (!noteMode) {
      extensions.push(createCodeTheme(isDarkTheme));
      extensions.push(
        syntaxHighlighting(isDarkTheme ? darkCodeHighlightStyle : lightCodeHighlightStyle),
      );
    }

    const normalizedLanguage = language?.toLowerCase();
    const isMarkdown = normalizedLanguage === "md" || normalizedLanguage === "markdown";
    if (isMarkdown && markdownViewMode === "live" && !readOnly) {
      extensions.push(markdownLivePreview());
    }

    if (noteMode && isMarkdown && !readOnly) {
      extensions.push(
        EditorView.inputHandler.of((view, from, to, text, insert) =>
          noteMarkdownInputHandler(view, from, to, text, insert),
        ),
      );
      extensions.push(
        keymap.of([
          { key: "Mod-b", run: toggleBold },
          { key: "Mod-i", run: toggleItalic },
          { key: "Mod-k", run: wrapLink },
          { key: "Backspace", run: pairAwareBackspace },
        ]),
      );
    }

    if (onChange && !readOnly) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      );
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allowFolding,
    effectiveFontSize,
    language,
    markdownViewMode,
    noteMode,
    readOnly,
    resolvedTheme,
  ]);

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
      viewRef.current.dispatch(transaction);
    }
  }, [value]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [value]);

  return (
    <div ref={editorRef} className={cn("w-full relative group", noteMode ? "h-auto" : "h-full")}>
      {copyToClipboard && (
        <Button
          className={cn(
            "absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity",
            isCopied && "opacity-100 bg-green-500 hover:bg-green-500",
          )}
          size="icon"
          variant="secondary"
          onClick={handleCopy}
        >
          {isCopied ? (
            <CheckIcon className="w-4 h-4 text-black" />
          ) : (
            <CopyIcon className="w-4 h-4 text-neutral-400" />
          )}
        </Button>
      )}
    </div>
  );
}
