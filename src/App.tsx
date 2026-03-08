import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

// ---- Helper components defined BEFORE they are used ----

const ComingSoon: React.FC<{ title: string; emoji: string }> = ({ title, emoji }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
    <div className="text-6xl mb-4">{emoji}</div>
    <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground">This section is coming soon!</p>
    <p className="text-xs text-muted-foreground mt-1">మరింత త్వరలో అందుబాటులోకి వస్తుంది</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
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
  if (profile?.status === 'pending') return <Navigate to="/pending-approval" replace />;
  if (profile?.status === 'banned' || profile?.status === 'suspended') {
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
  if (adminOnly && role !== 'admin' && role !== 'super_admin' && role !== 'moderator') {
    return <Navigate to="/feed" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile?.status === 'active') return <Navigate to="/feed" replace />;
  if (user && profile?.status === 'pending') return <Navigate to="/pending-approval" replace />;
  return <>{children}</>;
};

// ---- AppRoutes defined BEFORE App ----
const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<Navigate to="/feed" replace />} />
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/pending-approval" element={<PendingApprovalPage />} />

    {/* Protected Routes */}
    <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
    <Route path="/discussions" element={<ProtectedRoute><DiscussionsPage /></ProtectedRoute>} />
    <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
    <Route path="/complaints" element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />
    <Route path="/businesses" element={<ProtectedRoute><BusinessDirectoryPage /></ProtectedRoute>} />
    <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
    <Route path="/map" element={<ProtectedRoute><ComingSoon title="Village Map" emoji="🗺️" /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

    {/* Admin Routes */}
    <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute adminOnly><UserManagementPage /></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

// ---- App: providers wrap the router ----
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
