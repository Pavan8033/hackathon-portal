import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';

export const TeamLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginTeam } = useAuth();
  const { eventConfig } = useEvent();

  const [teamIdentifier, setTeamIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginTeam(teamIdentifier.trim(), password.trim(), rememberMe);

    if (result.success) {
      const from = (location.state as any)?.from?.pathname || '/participant';
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#164A36] hover:text-[#0E3324] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing Page</span>
        </Link>
        <span className="text-xs font-mono text-[#667085] uppercase tracking-wider hidden sm:inline">
          {eventConfig.eventName} • Team Access
        </span>
      </div>

      {/* Main Login Container */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-10 shadow-xs relative">
          {/* Logo & Heading */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              {eventConfig.clubLogo ? (
                <img
                  src={eventConfig.clubLogo}
                  alt={eventConfig.clubName}
                  className="h-16 w-16 object-contain rounded-xl border border-[#E5E7EB] p-1 bg-white"
                />
              ) : (
                <Logo size="lg" asLink={false} />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight uppercase">
              TEAM LOGIN
            </h1>
            <p className="mt-2 text-sm text-[#667085] leading-relaxed">
              Sign in to <strong>{eventConfig.eventName}</strong> using your official team credentials.
            </p>
            {eventConfig.clubName && (
              <span className="inline-block mt-1 text-xs font-semibold text-[#164A36] bg-[#EEF5F0] px-2.5 py-0.5 rounded-full border border-[#D5E6DB]">
                Organized by {eventConfig.clubName}
              </span>
            )}
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="teamIdentifier"
                className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-2"
              >
                Team ID (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  id="teamIdentifier"
                  type="text"
                  required
                  value={teamIdentifier}
                  onChange={(e) => {
                    setTeamIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. TM-101 or Team Name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36] transition-colors"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#667085]">
                Enter the exact Team ID provided in your registration credentials.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your team password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#667085] hover:text-[#111827]"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Credentials */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#164A36] border-[#E5E7EB] focus:ring-[#164A36]"
                />
                <span className="text-[#4B5563] font-medium">Remember session</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-semibold text-[#164A36] hover:text-[#0E3324] transition-colors"
              >
                Forgot credentials?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting || !teamIdentifier.trim() || !password.trim()}
              className="mt-2 font-semibold shadow-xs"
            >
              {isSubmitting ? 'Authenticating Team...' : 'LOGIN'}
            </Button>
          </form>
        </div>

        {/* Organizer Switch */}
        <div className="text-center mt-6">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#164A36] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Are you a hackathon organizer? Switch to Admin Login</span>
          </Link>
        </div>
      </div>

      {/* Forgot Credentials Modal per Part 8 */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl max-w-sm w-full p-6 text-center relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#111827]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-[#111827] tracking-tight">
              Team Credentials Reset
            </h3>

            {/* Exact text required in Part 8: "Please contact the hackathon organizers to reset your credentials." */}
            <p className="mt-3 text-sm text-[#4B5563] leading-relaxed">
              Please contact the hackathon organizers to reset your credentials.
            </p>

            <div className="mt-4 p-3 rounded-lg bg-[#F7F5EF] text-xs text-[#667085] text-left">
              <p>
                <strong>Desk Email:</strong> {HACKATHON_CONFIG.contactInformation.email}
              </p>
              <p className="mt-1">
                <strong>Hours:</strong> {HACKATHON_CONFIG.contactInformation.supportHours}
              </p>
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setShowForgotModal(false)}
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-[#667085]">
        © {HACKATHON_CONFIG.hackathonYear} {HACKATHON_CONFIG.hackathonName}. Problem Statement Release Portal.
      </div>
    </div>
  );
};
