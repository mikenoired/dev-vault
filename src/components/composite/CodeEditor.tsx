import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { EditorState } from "@codemirror/state";
import type { Command } from "@codemirror/view";
import { keymap } from "@codemirror/view";
import { materialDark } from "@fsegurai/codemirror-theme-material-dark";
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
  const effectiveFontSize = noteMode ? 16 : fontSize;

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

    const extensions = [
      allowFolding ? basicSetup : minimalSetup,
      getLangExtension(language),
      materialDark,
      theme,
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

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
  }, [allowFolding, effectiveFontSize, language, markdownViewMode, noteMode, readOnly]);

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
