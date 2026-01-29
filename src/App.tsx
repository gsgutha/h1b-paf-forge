import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreatePAF from "./pages/CreatePAF";
import EditPAF from "./pages/EditPAF";
import GeneratedPAFs from "./pages/GeneratedPAFs";
import Lookup from "./pages/Lookup";
import AdminImport from "./pages/AdminImport";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/create" element={<CreatePAF />} />
          <Route path="/edit/:id" element={<EditPAF />} />
          <Route path="/generated-pafs" element={<GeneratedPAFs />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/admin/import" element={<AdminImport />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
