import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HomePage } from '../pages/Home/HomePage';
import { TeamLoginPage } from '../pages/Login/TeamLoginPage';
import { ParticipantDashboardPage } from '../pages/Participant/ParticipantDashboardPage';
import { ProblemStatementsPage } from '../pages/Participant/ProblemStatementsPage';
import { ProblemDetailPage } from '../pages/Participant/ProblemDetailPage';
import { TeamProfilePage } from '../pages/Participant/TeamProfilePage';
import { SelectedProblemPage } from '../pages/Participant/SelectedProblemPage';
import { AdminLoginPage } from '../pages/Admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/Admin/AdminDashboardPage';
import { AdminProblemsPage } from '../pages/Admin/AdminProblemsPage';
import { AdminProblemFormPage } from '../pages/Admin/AdminProblemFormPage';
import { AdminParticipantsPage } from '../pages/Admin/AdminParticipantsPage';
import { AdminCredentialsPage } from '../pages/Admin/AdminCredentialsPage';
import { AdminTeamDetailPage } from '../pages/Admin/AdminTeamDetailPage';
import { AdminSelectionsPage } from '../pages/Admin/AdminSelectionsPage';
import { AdminAnnouncementsPage } from '../pages/Admin/AdminAnnouncementsPage';
import { AdminAnalyticsPage } from '../pages/Admin/AdminAnalyticsPage';
import { AdminSettingsPage } from '../pages/Admin/AdminSettingsPage';
import { AdminReleaseControlPage } from '../pages/Admin/AdminReleaseControlPage';
import { AdminDataIntegrityPage } from '../pages/Admin/AdminDataIntegrityPage';
import { AdminSetupPage } from '../pages/Admin/AdminSetupPage';
import { ParticipantAnnouncementsPage } from '../pages/Participant/ParticipantAnnouncementsPage';
import { GuidelinesPage } from '../pages/Guidelines/GuidelinesPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { Button } from '../components/ui/Button';

// Main Public Layout
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF] text-[#111827]">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// 404 Fallback Page
const NotFoundPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#164A36] bg-[#EEF5F0] px-3 py-1 rounded-full border border-[#D5E6DB]">
          404 Error
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-[#111827]">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-[#667085]">
          The portal route you requested does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Button to="/" variant="primary" size="md">
            Return to Landing Page
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Landing Page */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />
      <Route path="/guidelines" element={<GuidelinesPage />} />

      {/* 2. Authentication Entrypoints */}
      <Route path="/login" element={<TeamLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/setup" element={<AdminSetupPage />} />

      {/* 3. Protected Participant Routes (Part 2) */}
      <Route
        path="/participant"
        element={
          <ProtectedRoute requiredRole="team">
            <ParticipantDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/announcements"
        element={
          <ProtectedRoute requiredRole="team">
            <ParticipantAnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/problems"
        element={
          <ProtectedRoute requiredRole="team">
            <ProblemStatementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/problem/:id"
        element={
          <ProtectedRoute requiredRole="team">
            <ProblemDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/team"
        element={
          <ProtectedRoute requiredRole="team">
            <TeamProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/selected-problem"
        element={
          <ProtectedRoute requiredRole="team">
            <SelectedProblemPage />
          </ProtectedRoute>
        }
      />

      {/* 4. Protected Admin Routes (Part 2) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/release-control"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminReleaseControlPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminProblemsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems/new"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminProblemFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems/edit/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminProblemFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/participants"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminParticipantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/credentials"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminCredentialsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/participants/:teamId"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminTeamDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/selections"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminSelectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminAnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-integrity"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDataIntegrityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* 5. 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
