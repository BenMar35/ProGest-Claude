import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectDetails from "./pages/ProjectDetails";
import CreateProject from "./pages/CreateProject";
import NotFound from "./pages/NotFound";
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Désactiver le rechargement au focus de la fenêtre
    },
  },
});

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray">
        <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthWrapper><Navigate to="/dashboard" replace /></AuthWrapper>} />
            <Route path="/dashboard" element={<AuthWrapper><Dashboard /></AuthWrapper>} />
            <Route path="/projects/new" element={<AuthWrapper><CreateProject /></AuthWrapper>} />
            <Route path="/projects/:id" element={<AuthWrapper><ProjectDetails /></AuthWrapper>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;