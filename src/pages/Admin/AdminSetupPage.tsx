import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, KeyRound, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';

export const AdminSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Passcode must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    const result = await AuthService.registerFirstAdmin(email, password, name || 'Hackathon Admin');

    if (result.success && result.session) {
      setSession(result.session);
      setSuccessMessage('Administrator account initialized successfully. Redirecting to console...');
      setTimeout(() => {
        navigate('/admin');
      }, 1200);
    } else {
      setErrorMessage(result.error || 'Failed to setup admin account.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#164A36] hover:text-[#0E3324] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admin Login</span>
        </Link>
        <span className="text-xs font-mono text-[#667085] uppercase tracking-wider hidden sm:inline">
          System Initialization
        </span>
      </div>

      {/* Main Setup Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-10 shadow-xs relative">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mx-auto mb-4 border border-[#D5E6DB]">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight uppercase">
              INITIAL ADMIN SETUP
            </h1>
            <p className="mt-2 text-sm text-[#667085] leading-relaxed">
              Provision the primary organizer account for {HACKATHON_CONFIG.hackathonName} {HACKATHON_CONFIG.hackathonYear}.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Organizer Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lead Organizer"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Official Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizer@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Create Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>
              <span className="text-[11px] text-[#667085] mt-1 block">
                Minimum 6 characters. Use a strong, secure passphrase.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Confirm Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="mt-4 font-semibold shadow-xs"
            >
              {isSubmitting ? 'Creating Administrator Account...' : 'Initialize Admin Account'}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/admin/login"
            className="text-xs font-medium text-[#667085] hover:text-[#164A36] transition-colors"
          >
            Already initialized? Go to Organizer Login
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full text-center text-xs text-[#667085]">
        Initial account creation is secured through Firebase Authentication.
      </div>
    </div>
  );
};
