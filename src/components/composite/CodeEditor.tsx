import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { EditorState } from "@codemirror/state";
import { materialDark } from "@fsegurai/codemirror-theme-material-dark";
import { basicSetup, EditorView } from "codemirror";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import type { SupportedLanguages } from "@/types";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: SupportedLanguages;
  readOnly?: boolean;
  copyToClipboard?: boolean;
  fontSize?: number;
}

const bashLang = StreamLanguage.define(shell);

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
  readOnly = false,
  copyToClipboard = false,
  fontSize = 14,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const theme = EditorView.theme({
      ".cm-content, .cm-gutterElement": {
        fontSize: `${fontSize}px`,
      },
    });

    const extensions = [
      basicSetup,
      getLangExtension(language),
      theme,
      materialDark,
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

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
  }, [fontSize, language, readOnly]);

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
    <div ref={editorRef} className="w-full h-full relative group">
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
