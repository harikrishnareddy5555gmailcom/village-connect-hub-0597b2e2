import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Users, Settings, MessageSquare,
  Briefcase, Calendar, AlertTriangle, Building2,
  LogOut, MapPin, BarChart3, Globe,
  Menu, X, DollarSign, BookUser, Sun, Moon, ShieldAlert,
  BookHeart, Vote, CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { useTheme } from '@/contexts/ThemeContext';
import varadayapalliLogo from '@/assets/varadayapalli-logo.png';
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
  { to: '/stats', icon: <BarChart3 size={18} />, label: 'Village Stats', labelTe: 'గ్రామ గణాంకాలు' },
  { to: '/memories', icon: <BookHeart size={18} />, label: 'Memories', labelTe: 'జ్ఞాపకాలు' },
  { to: '/polls', icon: <Vote size={18} />, label: 'Polls', labelTe: 'ఓటింగ్' },
  { to: '/discussions', icon: <MessageSquare size={18} />, label: 'Discussions', labelTe: 'చర్చలు' },
  { to: '/events', icon: <Calendar size={18} />, label: 'Events', labelTe: 'కార్యక్రమాలు' },
  { to: '/complaints', icon: <AlertTriangle size={18} />, label: 'Complaints', labelTe: 'ఫిర్యాదులు' },
  { to: '/businesses', icon: <Building2 size={18} />, label: 'Business Directory', labelTe: 'వ్యాపారాలు' },
  { to: '/projects', icon: <Briefcase size={18} />, label: 'Projects', labelTe: 'ప్రాజెక్టులు' },
  { to: '/teams', icon: <Users size={18} />, label: 'Teams', labelTe: 'బృందాలు' },
  { to: '/map', icon: <MapPin size={18} />, label: 'Village Map', labelTe: 'గ్రామ పటం' },
  { to: '/donations', icon: <DollarSign size={18} />, label: 'Donations', labelTe: 'విరాళాలు' },
  { to: '/members', icon: <BookUser size={18} />, label: 'Members', labelTe: 'సభ్యులు' },
  { to: '/games', icon: <Globe size={18} />, label: 'Games', labelTe: 'ఆటలు' },
  { to: '/profile', icon: <Users size={18} />, label: 'My Profile', labelTe: 'నా ప్రొఫైల్' },
];

const adminNavItems: NavItem[] = [
  { to: '/admin', icon: <BarChart3 size={18} />, label: 'Admin Dashboard', labelTe: 'అడ్మిన్ డాష్‌బోర్డ్', adminOnly: true },
  { to: '/admin/users', icon: <Users size={18} />, label: 'Manage Users', labelTe: 'యూజర్లు', adminOnly: true },
  { to: '/admin/audit', icon: <ShieldAlert size={18} />, label: 'Audit Log', labelTe: 'ఆడిట్ లాగ్', adminOnly: true },
  { to: '/admin/payment', icon: <CreditCard size={18} />, label: 'Payment Settings', labelTe: 'పేమెంట్', adminOnly: true },
  { to: '/admin/villages', icon: <Globe size={18} />, label: 'Villages', labelTe: 'గ్రామాలు', superAdminOnly: true },
  { to: '/admin/settings', icon: <Settings size={18} />, label: 'Settings', labelTe: 'సెట్టింగ్స్', adminOnly: true },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile, onClose }) => {
  const { profile, role, signOut } = useAuth();
  const { currentVillage } = useVillage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const handleSignOut = async () => {
    await signOut();
    if (onClose) onClose();
  };

  return (
    <div className={cn("flex flex-col h-full", "bg-sidebar text-sidebar-foreground")}>
      {/* Header */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={varadayapalliLogo} alt="Varadayapalli" className="w-11 h-11 rounded-xl object-contain bg-white/10 p-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight text-sidebar-foreground truncate">వరదయపల్లి</p>
            <p className="text-[11px] text-sidebar-foreground/70 truncate">Varadayapalli</p>
          </div>
          {mobile ? (
            <button onClick={onClose} className="ml-auto text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <X size={18} />
            </button>
          ) : (
            <div className="ml-auto">
              <NotificationsBell />
            </div>
          )}
        </div>
      </div>

      {/* Village Info */}
      {currentVillage && (
        <div className="mx-3 my-2 px-3 py-1.5 bg-sidebar-accent rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-sidebar-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{currentVillage.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{currentVillage.district}, {currentVillage.state}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
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
            {adminNavItems
              .filter(item => !item.superAdminOnly || role === 'super_admin')
              .map((item) => (
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
      <div className="px-2 py-2 border-t border-sidebar-border space-y-1">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-xs font-medium"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {profile && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs flex-shrink-0">
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
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Map page needs overflow-hidden so the map can fill the exact remaining height
  const isMapPage = location.pathname === '/map';

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
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm flex-shrink-0" style={{ position: 'relative', zIndex: 20 }}>
          <button onClick={() => setSidebarOpen(true)} className="text-foreground/70 hover:text-foreground">
            <Menu size={22} />
          </button>
          <img src={varadayapalliLogo} alt="Varadayapalli" className="w-7 h-7 rounded-lg object-contain" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground leading-tight">వరదయపల్లి</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Varadayapalli</p>
          </div>
          <button
            onClick={toggleTheme}
            className="text-foreground/70 hover:text-foreground p-1"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationsBell />
        </header>

        {/* Page Content */}
        <main className={cn(
          "flex-1 min-h-0",
          isMapPage ? "overflow-hidden flex flex-col" : "overflow-y-auto"
        )} style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};
