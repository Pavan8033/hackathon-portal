import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, ArrowRight, Shield, LogOut } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { useAuth } from '../../context/AuthContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, team, logout } = useAuth();

  // Close menu on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  if (!isOpen) return null;

  const participantLinks = [
    { label: 'Home', href: '/participant' },
    { label: 'Problem Statements', href: '/participant/problems' },
    { label: 'My Team', href: '/participant/team' },
    { label: 'Guidelines', href: '/guidelines' },
    { label: 'Contact', href: '/#contact' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
    >
      {/* Mobile Header Bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-[#E5E7EB] bg-white">
        <Logo size="sm" showSubtitle subtitle={role === 'team' ? 'Team Portal' : 'Portal'} />
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-lg text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#164A36]"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
        <div className="space-y-4">
          {role === 'team' && team && (
            <div className="p-3.5 rounded-xl bg-[#EEF5F0]/70 border border-[#D5E6DB] mb-4">
              <span className="text-[10px] font-bold text-[#164A36] uppercase tracking-wider block">
                Logged in Team
              </span>
              <p className="text-sm font-bold text-[#111827] mt-0.5 truncate">
                {team.teamName}
              </p>
              <p className="text-[11px] font-mono text-[#667085]">
                ID: {team.teamId}
              </p>
            </div>
          )}

          <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-2">
            Navigation
          </p>

          <div className="space-y-1">
            {(role === 'team' ? participantLinks : HACKATHON_CONFIG.navigationLinks).map((link) => {
              const isInternal = link.href.startsWith('/') && !link.href.includes('#');
              return isInternal ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={onClose}
                  className="flex items-center justify-between py-3.5 text-base font-semibold text-[#111827] hover:text-[#164A36] border-b border-[#F3F4F6]"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-[#667085]" />
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center justify-between py-3.5 text-base font-semibold text-[#111827] hover:text-[#164A36] border-b border-[#F3F4F6]"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-[#667085]" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 mt-6 border-t border-[#E5E7EB] space-y-3">
          {role === 'team' ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          ) : (
            <>
              <Button
                to="/login"
                variant="primary"
                size="lg"
                fullWidth
                onClick={onClose}
              >
                TEAM LOGIN
              </Button>

              <Link
                to="/admin/login"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#667085] hover:text-[#164A36]"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Organizer / Admin Access</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
