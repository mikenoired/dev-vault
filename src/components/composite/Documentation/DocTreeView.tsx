import { useEffect, useRef, useState } from "react";
import { useDocsStore } from "@/stores/docsStore";
import { useTabsStore } from "@/stores/tabsStore";
import type { DocTreeNode } from "@/types";

interface DocTreeViewProps {
  docId: number;
}

interface TreeNodeProps {
  node: DocTreeNode;
  docId: number;
  level: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
}

const TreeNode = ({ node, docId, level, expandedPaths, onToggleExpand }: TreeNodeProps) => {
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const { loadDocChildren } = useDocsStore();
  const { openDocEntryTab, tabs, activeTabId } = useTabsStore();

  const hasChildren = node.hasChildren;
  const isLoaded = node.children && node.children.length > 0;
  const isExpanded = expandedPaths.has(node.path);
  const indent = level * 16;

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isActive =
    activeTab?.type === "docEntry" && activeTab.docId === docId && activeTab.docPath === node.path;

  const handleClick = async () => {
    if (hasChildren) {
      const nextExpanded = !isExpanded;
      onToggleExpand(node.path);

      if (nextExpanded && !isLoaded) {
        setIsLoadingChildren(true);
        await loadDocChildren(docId, node.path);
        setIsLoadingChildren(false);
      }
    }

    if (node.hasContent) {
      openDocEntryTab(docId, node.path, node.title);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 text-sm ${
          isActive ? "bg-accent/50 border-l-2 border-primary" : ""
        }`}
        style={{ paddingLeft: `${indent + 16}px` }}
      >
        {hasChildren && (
          <span className="text-muted-foreground text-[10px] w-3 text-center">
            {isLoadingChildren ? "⋯" : isExpanded ? "▼" : "▶"}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span
          className={`${node.hasContent ? "text-foreground" : "text-muted-foreground font-medium"}`}
        >
          {node.title}
        </span>
        {node.entryType && (
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-tighter">
            {node.entryType}
          </span>
        )}
      </button>
      {hasChildren && isExpanded && isLoaded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              docId={docId}
              level={level + 1}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DocTreeView = ({ docId }: DocTreeViewProps) => {
  const { docTree, isLoading, loadDocTree, loadDocChildren } = useDocsStore();
  const { tabs, activeTabId } = useTabsStore();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const prevDocIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevDocIdRef.current !== docId) {
      loadDocTree(docId);
      setExpandedPaths(new Set());
      prevDocIdRef.current = docId;
    }
  }, [docId, loadDocTree]);

  const activeTab = tabs.find(
    (t) => t.id === activeTabId && t.type === "docEntry" && t.docId === docId,
  );

  const findPathToNode = (
    nodes: DocTreeNode[],
    targetPath: string,
    currentPath: string[] = [],
  ): string[] | null => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.path];
      if (node.path === targetPath) {
        return newPath;
      }
      if (node.children && node.children.length > 0) {
        const result = findPathToNode(node.children, targetPath, newPath);
        if (result) return result;
      }
    }
    return null;
  };

  const isNodeChildrenLoaded = (nodes: DocTreeNode[], path: string): boolean => {
    for (const node of nodes) {
      if (node.path === path) {
        return node.children && node.children.length > 0;
      }
      if (node.children && node.children.length > 0) {
        const found = isNodeChildrenLoaded(node.children, path);
        if (found) return found;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!activeTab?.docPath || docTree.length === 0) return;

    const pathToActive = findPathToNode(docTree, activeTab.docPath);
    if (pathToActive) {
      setExpandedPaths((prevExpanded) => {
        const newExpandedPaths = new Set(prevExpanded);
        let needsUpdate = false;

        for (let i = 0; i < pathToActive.length - 1; i++) {
          const parentPath = pathToActive[i];
          if (!newExpandedPaths.has(parentPath)) {
            newExpandedPaths.add(parentPath);
            needsUpdate = true;
          }

          if (!isNodeChildrenLoaded(docTree, parentPath)) {
            loadDocChildren(docId, parentPath).catch((error) => {
              console.error(`Failed to load children for ${parentPath}:`, error);
            });
          }
        }

        return needsUpdate ? newExpandedPaths : prevExpanded;
      });
    }
  }, [activeTab?.docPath, docTree, docId, loadDocChildren]);

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  if (isLoading && docTree.length === 0) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Загрузка...</div>;
  }

  if (docTree.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">Нет доступных разделов</div>
    );
  }

  return (
    <div className="py-2">
      {docTree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          docId={docId}
          level={0}
          expandedPaths={expandedPaths}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
};
