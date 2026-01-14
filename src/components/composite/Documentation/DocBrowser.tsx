import { DocTreeView } from "@/components/composite/Documentation/DocTreeView";
import { useDocsStore } from "@/stores/docsStore";

export const DocBrowser = () => {
  const { selectedDoc } = useDocsStore();

  if (!selectedDoc) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <DocTreeView docId={selectedDoc.id} />
    </div>
  );
};
