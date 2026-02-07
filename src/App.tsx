import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { Navigation } from "./components/layout/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";

// ==================== PAGES ====================
import Home from "./pages/Home";
import JobList from "./pages/JobList";
import JobDetail from "./pages/JobDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// ✅ CHỈ 1 PAGE PHÂN TÍCH – TỰ XỬ LÝ DEMO / PERSONAL
import JobCVMatching from "./pages/JobCVMatching";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Navigation />

          <Routes>
            {/* ================= PUBLIC ================= */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ================= JOBS ================= */}
            <Route path="/jobs" element={<JobList />} />
            <Route path="/jobs/:id" element={<JobDetail />} />

            {/* ================= ANALYSIS ================= */}
            {/* 
              Guest  -> Demo Mode
              Logged -> Personal Mode
              (Xử lý bên trong JobCVMatching)
            */}
            <Route path="/analysis" element={<JobCVMatching />} />

            {/* ================= PROFILE ================= */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ================= FALLBACK ================= */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
