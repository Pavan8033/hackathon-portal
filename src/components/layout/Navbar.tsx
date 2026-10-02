import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  LogIn,
  ChevronDown,
  LayoutDashboard,
  Users,
  LogOut,
  Shield,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { MobileMenu } from '../navigation/MobileMenu';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { role, team, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on location change
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Participant Links per Part 3
  const participantLinks = [
    { label: 'Home', href: '/participant' },
    { label: 'Announcements', href: '/participant/announcements' },
    { label: 'Problem Statements', href: '/participant/problems' },
    { label: 'My Team', href: '/participant/team' },
    { label: 'Guidelines', href: '/guidelines' },
    { label: 'Contact', href: '/#contact' },
  ];

  const teamInitials = team?.teamName
    ? team.teamName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TM';

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-200 border-b',
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-[#E5E7EB] shadow-xs py-3'
            : 'bg-[#F7F5EF]/95 backdrop-blur-sm border-[#E5E7EB]/80 py-3.5'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Left: Hackathon Logo */}
            <div className="flex items-center gap-3">
              <Link to={role === 'team' ? '/participant' : '/'}>
                <Logo size="md" showSubtitle subtitle="Problem Portal" />
              </Link>
            </div>

            {/* Center Nav Links (Desktop) */}
            <nav
              className="hidden md:flex items-center gap-1 lg:gap-2"
              aria-label="Main Navigation"
            >
              {role === 'team'
                ? participantLinks.map((link) => {
                    const isInternal = link.href.startsWith('/') && !link.href.includes('#');
                    const isActive =
                      isInternal &&
                      (link.href === '/participant'
                        ? location.pathname === '/participant'
                        : location.pathname.startsWith(link.href));

                    const linkClasses = cn(
                      'px-3.5 py-1.5 text-sm font-semibold rounded-md transition-colors duration-150',
                      isActive
                        ? 'text-[#164A36] bg-[#EEF5F0]'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF5F0]/60'
                    );

                    if (isInternal) {
                      return (
                        <Link
                          key={link.label}
                          to={link.href}
                          className={linkClasses}
                        >
                          {link.label}
                        </Link>
                      );
                    }

                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        className={linkClasses}
                      >
                        {link.label}
                      </a>
                    );
                  })
                : HACKATHON_CONFIG.navigationLinks.map((link) => {
                    const isInternal = link.href.startsWith('/') && !link.href.includes('#');
                    const isActive =
                      isInternal &&
                      (link.href === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(link.href));

                    const linkClasses = cn(
                      'px-3.5 py-1.5 text-sm font-semibold rounded-md transition-colors duration-150',
                      isActive
                        ? 'text-[#164A36] bg-[#EEF5F0]'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF5F0]/60'
                    );

                    if (isInternal) {
                      return (
                        <Link
                          key={link.label}
                          to={link.href}
                          className={linkClasses}
                        >
                          {link.label}
                        </Link>
                      );
                    }

                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        className={linkClasses}
                      >
                        {link.label}
                      </a>
                    );
                  })}
            </nav>

            {/* Far Right: Participant User Dropdown or Login CTA */}
            <div className="flex items-center gap-3">
              {role === 'team' && team ? (
                /* Participant Team Dropdown per Part 3 */
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#164A36]/30 shadow-2xs"
                    aria-expanded={dropdownOpen}
                    aria-label="Team Account Menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#164A36] text-white flex items-center justify-center font-bold text-xs tracking-wider">
                      {teamInitials}
                    </div>
                    <span className="hidden sm:inline-block text-xs font-bold text-[#111827] max-w-[130px] truncate">
                      {team.teamName}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-[#667085] transition-transform duration-200',
                        dropdownOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-[#F3F4F6]">
                        <p className="text-xs font-bold text-[#111827] truncate">
                          {team.teamName}
                        </p>
                        <p className="text-[11px] font-mono text-[#667085]">
                          ID: {team.teamId}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/participant"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#374151] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#667085]" />
                          <span>My Dashboard</span>
                        </Link>

                        <Link
                          to="/participant/team"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#374151] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                        >
                          <Users className="w-4 h-4 text-[#667085]" />
                          <span>My Team</span>
                        </Link>
                      </div>

                      <div className="border-t border-[#F3F4F6] pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : role === 'admin' ? (
                /* Admin Quick Access */
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#164A36] text-white hover:bg-[#0E3324] text-xs font-bold transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </Link>
              ) : (
                /* Public Team Login CTA */
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    to="/login"
                    variant="primary"
                    size="md"
                    rightIcon={<LogIn className="w-4 h-4 ml-0.5" />}
                    className="font-semibold shadow-xs"
                  >
                    TEAM LOGIN
                  </Button>
                </div>
              )}

              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#164A36]"
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Drawer Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
};
