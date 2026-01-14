import { Toaster } from "sonner";
import { MainLayout } from "@/components/layouts/MainLayout";
import { useExternalLinks } from "@/hooks/useExternalLinks";

function App() {
  useExternalLinks();
  return (
    <>
      <Toaster />
      <MainLayout />
    </>
  );
}

export default App;
