import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { VillageProvider } from "@/contexts/VillageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import PendingApprovalPage from "@/pages/auth/PendingApprovalPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
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
import AuditLogPage from "@/pages/admin/AuditLogPage";
import NotFound from "@/pages/NotFound";
import MapPage from "@/pages/MapPage";
import TeamsPage from "@/pages/TeamsPage";
import VillageManagementPage from "@/pages/admin/VillageManagementPage";
import DonationsPage from "@/pages/DonationsPage";
import MembersPage from "@/pages/MembersPage";
import VillageStatsPage from "@/pages/VillageStatsPage";
import MemoriesPage from "@/pages/MemoriesPage";
import PollsPage from "@/pages/PollsPage";
import GamesPage from "@/pages/GamesPage";
import LiveScoreboardPage from "@/pages/LiveScoreboardPage";
import VillagePaymentSettingsPage from "@/pages/admin/VillagePaymentSettingsPage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000, // 5 minutes — reduces refetch churn
      gcTime: 10 * 60_000,   // 10 minutes cache
      refetchOnWindowFocus: false, // prevents unnecessary fetches on tab switch
    },
  },
});

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(120 20% 97%)" }}>
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={36} className="animate-spin" style={{ color: "hsl(142 70% 30%)" }} />
      <p style={{ color: "hsl(140 15% 45%)", fontSize: "0.875rem" }}>Loading Village Connect...</p>
    </div>
  </div>
);

// Guards as layout routes (use Outlet — avoids React Router ref warning)
function AuthGuard() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.status === "pending") return <Navigate to="/pending-approval" replace />;
  if (profile?.status === "banned" || profile?.status === "suspended") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(120 20% 97%)" }}>
        <div className="text-center p-8">
          <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚫</p>
          <h2 style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Account Suspended</h2>
          <p style={{ color: "hsl(140 15% 45%)", fontSize: "0.875rem" }}>Contact your village admin for help.</p>
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
  const { role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role !== "admin" && role !== "super_admin" && role !== "moderator") {
    return <Navigate to="/feed" replace />;
  }
  return <Outlet />;
}

function GuestGuard() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && profile?.status === "active") return <Navigate to="/feed" replace />;
  if (user && profile?.status === "pending") return <Navigate to="/pending-approval" replace />;
  return <Outlet />;
}

function ComingSoon({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p style={{ color: "hsl(140 15% 45%)" }}>This section is coming soon!</p>
      <p style={{ color: "hsl(140 15% 45%)", fontSize: "0.75rem", marginTop: "0.25rem" }}>మరింత త్వరలో అందుబాటులోకి వస్తుంది</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />

      {/* Guest-only */}
      <Route element={<GuestGuard />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Public — accessible regardless of auth state */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/live" element={<LiveScoreboardPage />} />

      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      {/* Protected — wrapped in AppLayout via AuthGuard */}
      <Route element={<AuthGuard />}>
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/discussions" element={<DiscussionsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/businesses" element={<BusinessDirectoryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/donations" element={<DonationsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/stats" element={<VillageStatsPage />} />
        <Route path="/memories" element={<MemoriesPage />} />
        <Route path="/polls" element={<PollsPage />} />
        <Route path="/games" element={<GamesPage />} />
      </Route>

      {/* Admin — also wrapped in AppLayout via AuthGuard, then AdminGuard */}
      <Route element={<AuthGuard />}>
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/audit" element={<AuditLogPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/villages" element={<VillageManagementPage />} />
          <Route path="/admin/payment" element={<VillagePaymentSettingsPage />} />
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
        <ThemeProvider>
          <AuthProvider>
            <VillageProvider>
              <AppRoutes />
            </VillageProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
