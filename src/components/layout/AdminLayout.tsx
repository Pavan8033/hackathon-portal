import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  CheckSquare,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  description,
  actionButton,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Release Control', href: '/admin/release-control', icon: Radio },
    { label: 'Problem Statements', href: '/admin/problems', icon: FileText },
    { label: 'Participants', href: '/admin/participants', icon: Users },
    { label: 'Team Selections', href: '/admin/selections', icon: CheckSquare },
    { label: 'Announcements', href: '/admin/announcements', icon: Bell },
    { label: 'Data Integrity', href: '/admin/data-integrity', icon: ShieldAlert },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F5EF] flex flex-col">
      {/* Admin Top Bar per Part 12 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36]"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Logo size="md" showSubtitle subtitle="Organizer Operations" />
          </div>

          <div className="flex items-center gap-3">
            {/* Admin Profile */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#EEF5F0] border border-[#D5E6DB]">
              <span className="w-2 h-2 rounded-full bg-[#164A36]" />
              <span className="text-xs font-semibold text-[#164A36]">
                {admin?.email || 'admin@hackathon.org'}
              </span>
            </div>

            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#164A36] px-2.5 py-1.5 rounded-lg hover:bg-[#EEF5F0] transition-colors"
              title="Preview Public Landing Page"
            >
              <span>View Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Logout per Part 12 */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-[#667085]" />}
              className="bg-white"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Desktop Sidebar per Part 12 */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider px-3 mb-2">
              Management
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150',
                      isActive
                        ? 'bg-[#164A36] text-white shadow-xs'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF5F0]'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-[#667085]')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 mt-4 border-t border-[#F3F4F6]">
              <div className="px-3 py-2 rounded-xl bg-[#F7F5EF] text-[11px] text-[#667085]">
                <div className="font-bold text-[#111827] mb-0.5">Firebase Live Ready</div>
                <div>Connected to Project Storage & Database rules.</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex bg-black/40 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl animate-fade-in">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                  <Logo size="sm" showSubtitle subtitle="Operations" />
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-md text-[#667085] hover:text-[#111827]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5 mt-6">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === '/admin'
                        ? location.pathname === '/admin'
                        : location.pathname.startsWith(item.href);

                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors',
                          isActive
                            ? 'bg-[#164A36] text-white shadow-xs'
                            : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF5F0]'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB]">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={handleLogout}
                  leftIcon={<LogOut className="w-4 h-4 text-[#667085]" />}
                  className="bg-white"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {(title || actionButton) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E5E7EB]">
              <div>
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 text-sm text-[#667085] leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              {actionButton && <div className="shrink-0">{actionButton}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};
