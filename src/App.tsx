import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CreatePAF from "./pages/CreatePAF";
import EditPAF from "./pages/EditPAF";
import GeneratedPAFs from "./pages/GeneratedPAFs";
import Lookup from "./pages/Lookup";
import AdminImport from "./pages/AdminImport";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreatePAF /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><EditPAF /></ProtectedRoute>} />
            <Route path="/generated-pafs" element={<ProtectedRoute><GeneratedPAFs /></ProtectedRoute>} />
            <Route path="/lookup" element={<ProtectedRoute><Lookup /></ProtectedRoute>} />
            <Route path="/admin/import" element={<ProtectedRoute><AdminImport /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
