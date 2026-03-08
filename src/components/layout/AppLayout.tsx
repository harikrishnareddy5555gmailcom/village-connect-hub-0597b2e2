import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Users, Settings, MessageSquare,
  Briefcase, Calendar, AlertTriangle, Building2,
  LogOut, MapPin, BarChart3,
  Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import villageConnectLogo from '@/assets/village-connect-logo.png';
import { cn } from '@/lib/utils';
import NotificationsBell from '@/components/NotificationsBell';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  labelTe: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/feed', icon: <Home size={18} />, label: 'Home Feed', labelTe: 'హోమ్ ఫీడ్' },
  { to: '/discussions', icon: <MessageSquare size={18} />, label: 'Discussions', labelTe: 'చర్చలు' },
  { to: '/events', icon: <Calendar size={18} />, label: 'Events', labelTe: 'కార్యక్రమాలు' },
  { to: '/complaints', icon: <AlertTriangle size={18} />, label: 'Complaints', labelTe: 'ఫిర్యాదులు' },
  { to: '/businesses', icon: <Building2 size={18} />, label: 'Business Directory', labelTe: 'వ్యాపారాలు' },
  { to: '/projects', icon: <Briefcase size={18} />, label: 'Projects', labelTe: 'ప్రాజెక్టులు' },
  { to: '/map', icon: <MapPin size={18} />, label: 'Village Map', labelTe: 'గ్రామ పటం' },
  { to: '/profile', icon: <Users size={18} />, label: 'My Profile', labelTe: 'నా ప్రొఫైల్' },
];

const adminNavItems: NavItem[] = [
  { to: '/admin', icon: <BarChart3 size={18} />, label: 'Admin Dashboard', labelTe: 'అడ్మిన్ డాష్‌బోర్డ్', adminOnly: true },
  { to: '/admin/users', icon: <Users size={18} />, label: 'Manage Users', labelTe: 'యూజర్లు', adminOnly: true },
  { to: '/admin/settings', icon: <Settings size={18} />, label: 'Settings', labelTe: 'సెట్టింగ్స్', adminOnly: true },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile, onClose }) => {
  const { profile, role, signOut } = useAuth();
  const { currentVillage } = useVillage();
  const location = useLocation();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const handleSignOut = async () => {
    await signOut();
    if (onClose) onClose();
  };

  return (
    <div className={cn(
      "flex flex-col h-full",
      "bg-sidebar text-sidebar-foreground"
    )}>
      {/* Header */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={villageConnectLogo} alt="Village Connect" className="w-10 h-10 rounded-xl" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight text-sidebar-foreground truncate">Village Connect</p>
            {currentVillage && (
              <p className="text-xs text-sidebar-foreground/70 truncate">{currentVillage.name}</p>
            )}
          </div>
          {mobile && (
            <button onClick={onClose} className="ml-auto text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Village Info */}
      {currentVillage && (
        <div className="mx-3 my-3 px-3 py-2 bg-sidebar-accent rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-sidebar-primary" />
            <div>
              <p className="text-xs font-semibold text-sidebar-foreground">{currentVillage.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60">{currentVillage.district}, {currentVillage.state}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={cn(
              "nav-link",
              location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                ? 'active'
                : 'text-sidebar-foreground/80'
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1.5 px-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40">
                Admin
              </p>
            </div>
            {adminNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "nav-link",
                  location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                    ? 'active'
                    : 'text-sidebar-foreground/80'
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.full_name?.charAt(0)?.toUpperCase() ?? 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile.full_name}</p>
              <p className="text-[10px] text-sidebar-foreground/60 capitalize">{role?.replace('_', ' ') ?? 'User'}</p>
            </div>
            <button onClick={handleSignOut} title="Sign Out" className="text-sidebar-foreground/50 hover:text-sidebar-foreground">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-60 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex-shrink-0 animate-slide-in-left">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground/70 hover:text-foreground"
          >
            <Menu size={22} />
          </button>
          <img src={villageConnectLogo} alt="" className="w-7 h-7" />
          <span className="font-bold text-sm text-foreground">Village Connect</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
