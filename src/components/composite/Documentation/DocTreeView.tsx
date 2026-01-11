import { useEffect, useState } from "react";
import { useDocsStore } from "@/stores/docsStore";
import type { DocTreeNode } from "@/types";

interface DocTreeViewProps {
  docId: number;
}

interface TreeNodeProps {
  node: DocTreeNode;
  docId: number;
  level: number;
}

function TreeNode({ node, docId, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const { loadDocEntry, loadDocChildren } = useDocsStore();

  const hasChildren = node.hasChildren;
  const isLoaded = node.children && node.children.length > 0;
  const indent = level * 16;

  const handleClick = async () => {
    if (hasChildren) {
      const nextExpanded = !isExpanded;
      setIsExpanded(nextExpanded);

      if (nextExpanded && !isLoaded) {
        setIsLoadingChildren(true);
        await loadDocChildren(docId, node.path);
        setIsLoadingChildren(false);
      }
    }

    if (node.hasContent) {
      loadDocEntry(docId, node.path);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left px-4 py-2 hover:bg-neutral-800 transition-colors flex items-center gap-2 text-sm"
        style={{ paddingLeft: `${indent + 16}px` }}
      >
        {hasChildren && (
          <span className="text-neutral-500 text-[10px] w-3 text-center">
            {isLoadingChildren ? "⋯" : isExpanded ? "▼" : "▶"}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span
          className={`${node.hasContent ? "text-neutral-200" : "text-neutral-500 font-medium"}`}
        >
          {node.title}
        </span>
        {node.entryType && (
          <span className="text-[10px] text-neutral-600 uppercase tracking-tighter">
            {node.entryType}
          </span>
        )}
      </button>
      {hasChildren && isExpanded && isLoaded && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} docId={docId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocTreeView({ docId }: DocTreeViewProps) {
  const { docTree, isLoading, loadDocTree } = useDocsStore();

  useEffect(() => {
    loadDocTree(docId);
  }, [docId, loadDocTree]);

  if (isLoading && docTree.length === 0) {
    return <div className="p-4 text-center text-neutral-500 text-sm">Загрузка...</div>;
  }

  if (docTree.length === 0) {
    return <div className="p-4 text-center text-neutral-500 text-sm">Нет доступных разделов</div>;
  }

  return (
    <div className="py-2">
      {docTree.map((node) => (
        <TreeNode key={node.path} node={node} docId={docId} level={0} />
      ))}
    </div>
  );
}
