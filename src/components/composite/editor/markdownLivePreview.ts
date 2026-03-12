import type { Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { open } from "@tauri-apps/plugin-shell";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Checkbox } from "@/components/ui";

type DocLine = {
  from: number;
  to: number;
  text: string;
  number: number;
};

type TextRange = {
  from: number;
  to: number;
};

type PendingDecoration = {
  from: number;
  to: number;
  decoration: Decoration;
};

type FenceBlockRange = {
  startLine: number;
  endLine: number;
};

const hiddenMarkdownMarker = Decoration.replace({});
const headingLineDecorations = [
  Decoration.line({ class: "cm-md-heading cm-md-heading-1" }),
  Decoration.line({ class: "cm-md-heading cm-md-heading-2" }),
  Decoration.line({ class: "cm-md-heading cm-md-heading-3" }),
  Decoration.line({ class: "cm-md-heading cm-md-heading-4" }),
  Decoration.line({ class: "cm-md-heading cm-md-heading-5" }),
  Decoration.line({ class: "cm-md-heading cm-md-heading-6" }),
] as const;
const blockquoteLineDecoration = Decoration.line({ class: "cm-md-blockquote" });
const codeBlockLineDecoration = Decoration.line({ class: "cm-md-codeblock" });
const dividerLineDecoration = Decoration.line({ class: "cm-md-divider" });
const codeFenceLineDecoration = Decoration.line({ class: "cm-md-codefence" });
const hiddenCodeFenceDecoration = Decoration.mark({ class: "cm-md-codefence-hidden" });
const linkTextDecoration = Decoration.mark({ class: "cm-md-link-text" });
const inlineCodeDecoration = Decoration.mark({ class: "cm-md-inline-code" });
const strongTextDecoration = Decoration.mark({ class: "cm-md-strong" });
const emphasisTextDecoration = Decoration.mark({ class: "cm-md-emphasis" });
const strongEmphasisTextDecoration = Decoration.mark({ class: "cm-md-strong cm-md-emphasis" });
const taskDoneDecoration = Decoration.mark({ class: "cm-md-task-done" });
const taskCheckboxRoots = new WeakMap<HTMLElement, Root>();

const headingPattern = /^(\s{0,3})(#{1,6})(\s+)/;
const blockquotePattern = /^(\s*>+\s*)/;
const taskPattern = /^(\s*[-*+]\s+)\[( |x|X)\](\s+)/;
const fencePattern = /^\s*(`{3,})(.*)$/;
const dividerPattern = /^\s{0,3}(?:-\s*){3,}$/;
const markdownLinkPattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const inlineCodePattern = /`([^`\n]+)`/g;
const strongEmphasisStarPattern = /\*\*\*([^\n*]+)\*\*\*/g;
const strongEmphasisUnderscorePattern = /___([^\n_]+)___/g;
const strongStarPattern = /\*\*([^\n*]+)\*\*/g;
const strongUnderscorePattern = /__([^\n_]+)__/g;
const emphasisStarPattern = /(^|[^*])\*([^*\n]+)\*(?!\*)/g;
const emphasisUnderscorePattern = /(^|[^_])_([^_\n]+)_(?!_)/g;
const bareUrlPattern = /https?:\/\/[^\s<>()]+/g;

class TaskCheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly markerCharPos: number,
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return other.checked === this.checked && other.markerCharPos === this.markerCharPos;
  }

  toDOM() {
    const container = document.createElement("span");
    container.className = "cm-md-task-checkbox-host";
    container.dataset.markerCharPos = String(this.markerCharPos);
    const root = createRoot(container);
    taskCheckboxRoots.set(container, root);
    root.render(
      createElement(Checkbox, {
        "aria-label": this.checked ? "Снять задачу" : "Отметить задачу",
        checked: this.checked,
        className: "cm-md-task-checkbox align-[-0.1em]",
        tabIndex: -1,
      }),
    );
    return container;
  }

  destroy(dom: HTMLElement) {
    taskCheckboxRoots.get(dom)?.unmount();
    taskCheckboxRoots.delete(dom);
  }

  ignoreEvent() {
    return false;
  }
}

function pushDecoration(
  decorations: PendingDecoration[],
  from: number,
  to: number,
  decoration: Decoration,
) {
  if (from > to) return;
  decorations.push({ from, to, decoration });
}

function addHiddenMarker(decorations: PendingDecoration[], from: number, to: number) {
  if (from >= to) return;
  pushDecoration(decorations, from, to, hiddenMarkdownMarker);
}

function addProtectedRange(ranges: TextRange[], from: number, to: number) {
  if (from >= to) return;
  ranges.push({ from, to });
}

function isOverlapping(ranges: TextRange[], from: number, to: number): boolean {
  return ranges.some((range) => from < range.to && to > range.from);
}

function shouldHideMarkersForRange(
  isActiveLine: boolean,
  cursorPos: number,
  from: number,
  to: number,
): boolean {
  if (!isActiveLine) return true;
  return cursorPos < from || cursorPos > to;
}

function forEachRegexMatch(
  text: string,
  pattern: RegExp,
  visitor: (match: RegExpExecArray) => void,
) {
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    visitor(match);
    match = pattern.exec(text);
  }
}

function collectActiveLineNumbers(view: EditorView): Set<number> {
  const activeLine = view.state.doc.lineAt(view.state.selection.main.head).number;
  return new Set([activeLine]);
}

function getFenceMarkerLength(lineText: string): number | null {
  const match = fencePattern.exec(lineText);
  if (!match) return null;
  return match[1]?.length ?? null;
}

function collectFenceBlocks(view: EditorView): FenceBlockRange[] {
  const blocks: FenceBlockRange[] = [];
  const { doc } = view.state;
  let currentStartLine: number | null = null;
  let currentFenceLength: number | null = null;

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const fenceLength = getFenceMarkerLength(line.text);
    if (fenceLength === null) continue;

    if (currentFenceLength === null) {
      currentStartLine = lineNumber;
      currentFenceLength = fenceLength;
      continue;
    }

    if (fenceLength >= currentFenceLength) {
      blocks.push({
        startLine: currentStartLine ?? lineNumber,
        endLine: lineNumber,
      });
      currentStartLine = null;
      currentFenceLength = null;
    }
  }

  if (currentStartLine !== null) {
    blocks.push({
      startLine: currentStartLine,
      endLine: doc.lines,
    });
  }

  return blocks;
}

function getActiveFenceBlock(
  fenceBlocks: FenceBlockRange[],
  activeLineNumber: number,
): FenceBlockRange | null {
  return (
    fenceBlocks.find(
      (block) => activeLineNumber >= block.startLine && activeLineNumber <= block.endLine,
    ) ?? null
  );
}

function toggleTaskOnLine(view: EditorView, line: DocLine): boolean {
  const match = taskPattern.exec(line.text);
  if (!match) return false;

  const checkedCharPos = line.from + match[1].length + 1;
  const nextValue = match[2].toLowerCase() === "x" ? " " : "x";
  view.dispatch({
    changes: { from: checkedCharPos, to: checkedCharPos + 1, insert: nextValue },
  });
  return true;
}

function toggleTaskByMarkerPosition(view: EditorView, markerCharPos: number): boolean {
  if (markerCharPos < 0 || markerCharPos > view.state.doc.length) return false;
  const line = view.state.doc.lineAt(markerCharPos);
  return toggleTaskOnLine(view, line);
}

function toggleTaskAtCursor(view: EditorView): boolean {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  return toggleTaskOnLine(view, line);
}

function findLinkAtCursor(view: EditorView): string | null {
  const cursorPos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(cursorPos);
  const cursorInLine = cursorPos - line.from;

  let found: string | null = null;

  forEachRegexMatch(line.text, markdownLinkPattern, (match) => {
    if (found || match.index === undefined) return;

    const full = match[0];
    const label = match[1] ?? "";
    const url = match[2] ?? "";
    const start = match.index;
    const end = start + full.length;
    const labelStart = start + 1;
    const labelEnd = labelStart + label.length;
    const urlStart = labelEnd + 2;
    const urlEnd = urlStart + url.length;

    const isInsideLabel = cursorInLine >= labelStart && cursorInLine <= labelEnd;
    const isInsideUrl = cursorInLine >= urlStart && cursorInLine <= urlEnd;
    const isInsideWholeLink = cursorInLine >= start && cursorInLine <= end;

    if (isInsideLabel || isInsideUrl || isInsideWholeLink) {
      found = url;
    }
  });

  if (found) return found;

  forEachRegexMatch(line.text, bareUrlPattern, (match) => {
    if (found || match.index === undefined) return;
    const start = match.index;
    const end = start + match[0].length;
    if (cursorInLine >= start && cursorInLine <= end) {
      found = match[0];
    }
  });

  return found;
}

function openLinkAtCursor(view: EditorView): boolean {
  const link = findLinkAtCursor(view);
  if (!link) return false;
  void open(link).catch((error) => {
    console.error("Failed to open markdown link:", error);
  });
  return true;
}

function addTaskDecoration(decorations: PendingDecoration[], line: DocLine): TextRange | null {
  const match = taskPattern.exec(line.text);
  if (!match) return null;

  const indentationLength = match[1].match(/^\s*/)?.[0].length ?? 0;
  const taskMarkerFrom = line.from + indentationLength;
  const markerFrom = line.from + match[1].length;
  const markerTo = markerFrom + 3;
  const markerCharPos = markerFrom + 1;
  const checked = match[2].toLowerCase() === "x";

  pushDecoration(
    decorations,
    taskMarkerFrom,
    markerTo,
    Decoration.replace({ widget: new TaskCheckboxWidget(checked, markerCharPos) }),
  );

  const taskTextFrom = line.from + match[0].length;
  if (checked && taskTextFrom < line.to) {
    pushDecoration(decorations, taskTextFrom, line.to, taskDoneDecoration);
  }

  return { from: taskMarkerFrom, to: markerTo };
}

function addHeadingDecoration(
  decorations: PendingDecoration[],
  line: DocLine,
  hideMarkers: boolean,
) {
  const match = headingPattern.exec(line.text);
  if (!match) return;

  if (hideMarkers) {
    const hashesFrom = line.from + match[1].length;
    const hashesTo = hashesFrom + match[2].length + match[3].length;
    addHiddenMarker(decorations, hashesFrom, hashesTo);
  }

  const level = Math.min(match[2].length, headingLineDecorations.length);
  pushDecoration(decorations, line.from, line.from, headingLineDecorations[level - 1]);
}

function addBlockquoteDecoration(decorations: PendingDecoration[], line: DocLine) {
  const match = blockquotePattern.exec(line.text);
  if (!match) return;

  addHiddenMarker(decorations, line.from, line.from + match[0].length);
  pushDecoration(decorations, line.from, line.from, blockquoteLineDecoration);
}

function addDividerDecoration(
  decorations: PendingDecoration[],
  line: DocLine,
  hideMarkers: boolean,
): boolean {
  if (!dividerPattern.test(line.text)) return false;

  if (hideMarkers) {
    addHiddenMarker(decorations, line.from, line.to);
  }
  pushDecoration(decorations, line.from, line.from, dividerLineDecoration);
  return true;
}

function addInlineCodeDecorations(
  decorations: PendingDecoration[],
  line: DocLine,
  protectedRanges: TextRange[],
  isActiveLine: boolean,
  cursorPos: number,
) {
  forEachRegexMatch(line.text, inlineCodePattern, (match) => {
    if (match.index === undefined) return;
    const full = match[0];
    const content = match[1] ?? "";
    const from = line.from + match.index;
    const to = from + full.length;
    if (isOverlapping(protectedRanges, from, to)) return;
    const shouldHideMarkers = shouldHideMarkersForRange(isActiveLine, cursorPos, from, to);

    if (shouldHideMarkers) {
      addHiddenMarker(decorations, from, from + 1);
      addHiddenMarker(decorations, to - 1, to);
    }
    if (content.length > 0) {
      pushDecoration(decorations, from + 1, to - 1, inlineCodeDecoration);
    }
    addProtectedRange(protectedRanges, from, to);
  });
}

function addLinkDecorations(
  decorations: PendingDecoration[],
  line: DocLine,
  protectedRanges: TextRange[],
  isActiveLine: boolean,
  cursorPos: number,
) {
  forEachRegexMatch(line.text, markdownLinkPattern, (match) => {
    if (match.index === undefined) return;
    const full = match[0];
    const label = match[1] ?? "";
    const from = line.from + match.index;
    const to = from + full.length;
    if (isOverlapping(protectedRanges, from, to)) return;
    const shouldHideMarkers = shouldHideMarkersForRange(isActiveLine, cursorPos, from, to);

    const labelFrom = from + 1;
    const labelTo = labelFrom + label.length;

    if (shouldHideMarkers) {
      addHiddenMarker(decorations, from, from + 1);
      addHiddenMarker(decorations, labelTo, to);
    }
    if (labelFrom < labelTo) {
      pushDecoration(decorations, labelFrom, labelTo, linkTextDecoration);
    }
    addProtectedRange(protectedRanges, from, to);
  });
}

function addStrongEmphasisDecorations(
  decorations: PendingDecoration[],
  line: DocLine,
  protectedRanges: TextRange[],
  pattern: RegExp,
  isActiveLine: boolean,
  cursorPos: number,
) {
  forEachRegexMatch(line.text, pattern, (match) => {
    if (match.index === undefined) return;
    const full = match[0];
    const content = match[1] ?? "";
    const from = line.from + match.index;
    const to = from + full.length;
    if (isOverlapping(protectedRanges, from, to)) return;
    const shouldHideMarkers = shouldHideMarkersForRange(isActiveLine, cursorPos, from, to);

    if (shouldHideMarkers) {
      addHiddenMarker(decorations, from, from + 3);
      addHiddenMarker(decorations, to - 3, to);
    }
    if (content.length > 0) {
      pushDecoration(decorations, from + 3, to - 3, strongEmphasisTextDecoration);
    }
    addProtectedRange(protectedRanges, from, to);
  });
}

function addStrongDecorations(
  decorations: PendingDecoration[],
  line: DocLine,
  protectedRanges: TextRange[],
  pattern: RegExp,
  isActiveLine: boolean,
  cursorPos: number,
) {
  forEachRegexMatch(line.text, pattern, (match) => {
    if (match.index === undefined) return;
    const full = match[0];
    const content = match[1] ?? "";
    const from = line.from + match.index;
    const to = from + full.length;
    if (isOverlapping(protectedRanges, from, to)) return;
    const shouldHideMarkers = shouldHideMarkersForRange(isActiveLine, cursorPos, from, to);

    if (shouldHideMarkers) {
      addHiddenMarker(decorations, from, from + 2);
      addHiddenMarker(decorations, to - 2, to);
    }
    if (content.length > 0) {
      pushDecoration(decorations, from + 2, to - 2, strongTextDecoration);
    }
    addProtectedRange(protectedRanges, from, to);
  });
}

function addEmphasisDecorations(
  decorations: PendingDecoration[],
  line: DocLine,
  protectedRanges: TextRange[],
  pattern: RegExp,
  isActiveLine: boolean,
  cursorPos: number,
) {
  forEachRegexMatch(line.text, pattern, (match) => {
    if (match.index === undefined) return;

    const markerPrefix = match[1] ?? "";
    const content = match[2] ?? "";
    const markerStart = line.from + match.index + markerPrefix.length;
    const markerEnd = markerStart + content.length + 2;
    if (isOverlapping(protectedRanges, markerStart, markerEnd)) return;
    const shouldHideMarkers = shouldHideMarkersForRange(
      isActiveLine,
      cursorPos,
      markerStart,
      markerEnd,
    );

    if (shouldHideMarkers) {
      addHiddenMarker(decorations, markerStart, markerStart + 1);
      addHiddenMarker(decorations, markerEnd - 1, markerEnd);
    }
    if (content.length > 0) {
      pushDecoration(decorations, markerStart + 1, markerEnd - 1, emphasisTextDecoration);
    }
    addProtectedRange(protectedRanges, markerStart, markerEnd);
  });
}

function buildLivePreviewDecorations(view: EditorView): DecorationSet {
  const decorations: PendingDecoration[] = [];
  const cursorPos = view.state.selection.main.head;
  const activeLineNumber = view.state.doc.lineAt(cursorPos).number;
  const activeLineNumbers = collectActiveLineNumbers(view);
  const fenceBlocks = collectFenceBlocks(view);
  const activeFenceBlock = getActiveFenceBlock(fenceBlocks, activeLineNumber);
  const { doc } = view.state;
  let currentFenceLength: number | null = null;

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const isActiveLine = activeLineNumbers.has(line.number);
    const isInsideActiveFenceBlock =
      activeFenceBlock !== null &&
      line.number >= activeFenceBlock.startLine &&
      line.number <= activeFenceBlock.endLine;

    const fenceLength = getFenceMarkerLength(line.text);
    if (fenceLength !== null) {
      const isClosingFence = currentFenceLength !== null && fenceLength >= currentFenceLength;
      const isOpeningFence = currentFenceLength === null;

      if (!isActiveLine && !isInsideActiveFenceBlock) {
        pushDecoration(decorations, line.from, line.to, hiddenCodeFenceDecoration);
      } else {
        pushDecoration(decorations, line.from, line.from, codeFenceLineDecoration);
      }

      if (isOpeningFence) {
        currentFenceLength = fenceLength;
      } else if (isClosingFence) {
        currentFenceLength = null;
      }

      continue;
    }

    if (currentFenceLength !== null) {
      if (isInsideActiveFenceBlock) {
        pushDecoration(decorations, line.from, line.from, codeBlockLineDecoration);
      } else if (!isActiveLine) {
        pushDecoration(decorations, line.from, line.from, codeBlockLineDecoration);
      }
      continue;
    }

    if (isInsideActiveFenceBlock) {
      continue;
    }

    const protectedRanges: TextRange[] = [];

    addHeadingDecoration(decorations, line, !isActiveLine);
    if (!isActiveLine) {
      addBlockquoteDecoration(decorations, line);
    }
    if (addDividerDecoration(decorations, line, !isActiveLine)) {
      continue;
    }

    if (!isActiveLine) {
      const taskRange = addTaskDecoration(decorations, line);
      if (taskRange) {
        addProtectedRange(protectedRanges, taskRange.from, taskRange.to);
      }
    }

    addInlineCodeDecorations(decorations, line, protectedRanges, isActiveLine, cursorPos);
    addLinkDecorations(decorations, line, protectedRanges, isActiveLine, cursorPos);
    addStrongEmphasisDecorations(
      decorations,
      line,
      protectedRanges,
      strongEmphasisStarPattern,
      isActiveLine,
      cursorPos,
    );
    addStrongEmphasisDecorations(
      decorations,
      line,
      protectedRanges,
      strongEmphasisUnderscorePattern,
      isActiveLine,
      cursorPos,
    );
    addStrongDecorations(
      decorations,
      line,
      protectedRanges,
      strongStarPattern,
      isActiveLine,
      cursorPos,
    );
    addStrongDecorations(
      decorations,
      line,
      protectedRanges,
      strongUnderscorePattern,
      isActiveLine,
      cursorPos,
    );
    addEmphasisDecorations(
      decorations,
      line,
      protectedRanges,
      emphasisStarPattern,
      isActiveLine,
      cursorPos,
    );
    addEmphasisDecorations(
      decorations,
      line,
      protectedRanges,
      emphasisUnderscorePattern,
      isActiveLine,
      cursorPos,
    );
  }

  return Decoration.set(
    decorations.map(({ from, to, decoration }) => decoration.range(from, to)),
    true,
  );
}

const markdownLivePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLivePreviewDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLivePreviewDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    eventHandlers: {
      mousedown(event, view) {
        const target = event.target as HTMLElement | null;
        const checkboxHost = target?.closest(".cm-md-task-checkbox-host") as HTMLElement | null;
        if (!checkboxHost) return false;

        const markerCharPosRaw = checkboxHost.dataset.markerCharPos;
        if (!markerCharPosRaw) return false;
        const markerCharPos = Number.parseInt(markerCharPosRaw, 10);
        if (Number.isNaN(markerCharPos)) return false;

        event.preventDefault();
        return toggleTaskByMarkerPosition(view, markerCharPos);
      },
    },
  },
);

const markdownLivePreviewKeymap = keymap.of([
  {
    key: "Mod-Shift-x",
    run: toggleTaskAtCursor,
  },
  {
    key: "Mod-Enter",
    run: openLinkAtCursor,
  },
]);

export function markdownLivePreview(): Extension {
  return [markdownLivePreviewPlugin, markdownLivePreviewKeymap];
}
