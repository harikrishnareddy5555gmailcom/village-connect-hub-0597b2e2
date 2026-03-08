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
import AdminDashboard from "@/pages/admin/AdminDashboard";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

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

import React from "react";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <VillageProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/pending-approval" element={<PendingApprovalPage />} />

              {/* Protected Routes */}
              <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
              <Route path="/discussions" element={<ProtectedRoute><ComingSoon title="Discussions" emoji="💬" /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><ComingSoon title="Events" emoji="📅" /></ProtectedRoute>} />
              <Route path="/complaints" element={<ProtectedRoute><ComingSoon title="Complaints" emoji="⚠️" /></ProtectedRoute>} />
              <Route path="/businesses" element={<ProtectedRoute><ComingSoon title="Business Directory" emoji="🏪" /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><ComingSoon title="Village Projects" emoji="🏗️" /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><ComingSoon title="Village Map" emoji="🗺️" /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ComingSoon title="My Profile" emoji="👤" /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><ComingSoon title="User Management" emoji="👥" /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute adminOnly><ComingSoon title="Settings" emoji="⚙️" /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </VillageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const ComingSoon: React.FC<{ title: string; emoji: string }> = ({ title, emoji }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
    <div className="text-6xl mb-4">{emoji}</div>
    <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground">This section is coming soon!</p>
    <p className="text-xs text-muted-foreground mt-1">మరింత త్వరలో అందుబాటులోకి వస్తుంది</p>
  </div>
);

export default App;
