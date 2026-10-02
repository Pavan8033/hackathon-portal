import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, KeyRound, Mail, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginAdmin(email, password);

    if (result.success) {
      const from = (location.state as any)?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Invalid administrator credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar with Back to Home */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#164A36] hover:text-[#0E3324] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing Page</span>
        </Link>
        <span className="text-xs font-mono text-[#667085] uppercase tracking-wider hidden sm:inline">
          Restricted Committee Console
        </span>
      </div>

      {/* Main Admin Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-10 shadow-xs relative">
          {/* Logo & Heading per Part 11 */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mx-auto mb-4 border border-[#D5E6DB]">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight">
              ORGANIZER LOGIN
            </h1>
            <p className="mt-2 text-sm text-[#667085] leading-relaxed">
              Restricted management console for {HACKATHON_CONFIG.hackathonName} {HACKATHON_CONFIG.hackathonYear} committee members.
            </p>
          </div>

          {/* Error Message */}
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
                htmlFor="adminEmail"
                className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-2"
              >
                Organizer Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="adminEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="blacksquad8328@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36] transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="adminPassword"
                className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-2"
              >
                Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36] transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="mt-2 font-semibold shadow-xs"
            >
              {isSubmitting ? 'Verifying Credentials...' : 'Access Admin Console'}
            </Button>
          </form>

          {/* First-time Organizer Setup */}
          <div className="mt-6 pt-5 border-t border-[#F3F4F6] text-center">
            <Link
              to="/admin/setup"
              className="text-xs text-[#667085] hover:text-[#164A36] transition-colors"
            >
              First time setup? <span className="font-semibold text-[#164A36] underline">Configure Initial Admin Account</span>
            </Link>
          </div>
        </div>

        {/* Participant Switch */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-xs font-medium text-[#667085] hover:text-[#164A36] transition-colors"
          >
            Are you a participating team? Switch to Team Login
          </Link>
        </div>
      </div>

      {/* Footer minimal */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-[#667085]">
        Authorized administrative access only. System activity is logged.
      </div>
    </div>
  );
};
