import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { VillageProvider } from "@/contexts/VillageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import PendingApprovalPage from "@/pages/auth/PendingApprovalPage";
import FeedPage from "@/pages/FeedPage";
import ProfilePage from "@/pages/ProfilePage";
import ComplaintsPage from "@/pages/ComplaintsPage";
import EventsPage from "@/pages/EventsPage";
import BusinessDirectoryPage from "@/pages/BusinessDirectoryPage";
import ProjectsPage from "@/pages/ProjectsPage";
import DiscussionsPage from "@/pages/DiscussionsPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// ── Layout routes (use Outlet, compatible with React Router refs) ──

function AuthGuard() {
  const { user, profile, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Village Connect...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.status === "pending") return <Navigate to="/pending-approval" replace />;
  if (profile?.status === "banned" || profile?.status === "suspended") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8">
          <p className="text-2xl mb-3">🚫</p>
          <h2 className="font-bold text-xl text-foreground mb-2">Account Suspended</h2>
          <p className="text-muted-foreground text-sm">Contact your village admin for help.</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function AdminGuard() {
  const { role } = useAuth();
  if (role !== "admin" && role !== "super_admin" && role !== "moderator") {
    return <Navigate to="/feed" replace />;
  }
  return <Outlet />;
}

function GuestGuard() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile?.status === "active") return <Navigate to="/feed" replace />;
  if (user && profile?.status === "pending") return <Navigate to="/pending-approval" replace />;
  return <Outlet />;
}

function ComingSoon({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground">This section is coming soon!</p>
      <p className="text-xs text-muted-foreground mt-1">మరింత త్వరలో అందుబాటులోకి వస్తుంది</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />

      {/* Guest-only routes */}
      <Route element={<GuestGuard />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      {/* Protected routes (wrapped in AppLayout via AuthGuard) */}
      <Route element={<AuthGuard />}>
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/discussions" element={<DiscussionsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/businesses" element={<BusinessDirectoryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/map" element={<ComingSoon title="Village Map" emoji="🗺️" />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Admin-only nested routes */}
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <VillageProvider>
            <AppRoutes />
          </VillageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
