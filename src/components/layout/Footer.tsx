import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[#E5E7EB] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Left Column: Logo & Tagline */}
          <div className="max-w-sm">
            <Logo size="md" showSubtitle subtitle="Official Problem Portal" />
            <p className="mt-3 text-sm text-[#667085] leading-relaxed">
              {HACKATHON_CONFIG.hackathonTagline}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#667085]">
              <span className="w-2 h-2 rounded-full bg-[#164A36]" />
              <span>{HACKATHON_CONFIG.organizationName}</span>
            </div>
          </div>

          {/* Right Column: Navigation Links */}
          <div className="flex flex-wrap gap-8 sm:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3">
                Navigation
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/participant/problems"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Problems
                  </Link>
                </li>
                <li>
                  <a
                    href="#timeline"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Timeline
                  </a>
                </li>
                <li>
                  <a
                    href="#guidelines"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Guidelines
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3">
                Portals
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/login"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Team Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/participant"
                    className="text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    Team Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/login"
                    className="inline-flex items-center gap-1.5 text-[#667085] hover:text-[#164A36] transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Organizer Portal</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#667085]">
          <p>© {HACKATHON_CONFIG.hackathonYear} {HACKATHON_CONFIG.hackathonName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1 text-[#164A36]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Innovation Track</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
