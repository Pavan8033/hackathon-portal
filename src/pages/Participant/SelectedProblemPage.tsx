import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  X,
  AlertCircle,
  CheckCircle2,
  FileCode,
  Lock,
  Compass,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import {
  getDocumentTypeInfo,
  formatFileSize,
  formatSelectionDateTime,
} from '../../utils/formatters';
import type { ProblemRecord, TeamSelection } from '../../types';

export const SelectedProblemPage: React.FC = () => {
  const { team } = useAuth();
  const [selection, setSelection] = useState<TeamSelection | null>(null);
  const [problem, setProblem] = useState<ProblemRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // PDF modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

  useEffect(() => {
    const loadSelectedData = async () => {
      setIsLoading(true);
      if (!team?.teamId) {
        setIsLoading(false);
        return;
      }

      try {
        const currentSel = await SelectionService.getSelectionForTeam(team.teamId);
        setSelection(currentSel);

        const problemId = currentSel?.problemId || team?.selectedProblemId;
        if (problemId) {
          const prob = await ProblemService.getProblemById(problemId, { forParticipant: true });
          setProblem(prob);
        }
      } catch (err) {
        console.error('[SelectedProblemPage] Error loading selected problem:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSelectedData();
  }, [team?.teamId, team?.selectedProblemId]);

  const docInfo = problem ? getDocumentTypeInfo(problem.fileName, problem.fileType) : null;
  const isPdf = docInfo?.type === 'PDF';
  const isWord = docInfo?.type === 'Word';
  const isExcel = docInfo?.type === 'Excel';
  const formattedTime = formatSelectionDateTime(selection?.selectedAt || team?.selectionDate);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#164A36] border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Loading Team Challenge...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Section 14: NO PROBLEM SELECTED State
  if (!selection && !team?.selectedProblemId) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
        <Navbar />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Compass className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block mb-1">
            Official Challenge Allocation
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight uppercase">
            NO PROBLEM SELECTED
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#4B5563] leading-relaxed max-w-md">
            Your team has not selected a problem statement yet. Explore the officially released challenges and lock in your challenge.
          </p>

          <div className="mt-8">
            <Button
              to="/participant/problems"
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              className="font-bold shadow-xs"
            >
              EXPLORE PROBLEMS →
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Navigation Breadcrumbs */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/participant"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#164A36] hover:text-[#0E3324] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <Link to="/participant" className="hover:text-[#164A36]">Dashboard</Link>
            <span>/</span>
            <span className="font-semibold text-[#111827]">Selected Challenge</span>
          </div>
        </div>

        {/* Locked Challenge Hero Banner */}
        <div className="bg-white rounded-2xl border border-[#D5E6DB] p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#F3F4F6]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#164A36] bg-[#EEF5F0] px-3 py-1.5 rounded-lg border border-[#D5E6DB]">
                {problem?.problemId || selection?.problemId}
              </span>
              {problem?.category && (
                <Badge variant="subtle" size="md">
                  {problem.category}
                </Badge>
              )}
              {problem?.difficulty && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                  {problem.difficulty}
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs text-[#164A36] font-bold bg-[#EEF5F0] px-3 py-1.5 rounded-lg border border-[#D5E6DB]">
              <Lock className="w-3.5 h-3.5 text-[#164A36]" />
              <span>OFFICIAL SELECTION LOCKED</span>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight uppercase leading-tight">
              {problem?.title || selection?.problemTitle}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-[#4B5563] leading-relaxed">
              {problem?.description}
            </p>
          </div>

          {/* Allocation Telemetry */}
          <div className="mt-8 pt-6 border-t border-[#F3F4F6] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
              <span className="font-bold text-[#667085] uppercase tracking-wider block text-[10px]">
                Committed Team
              </span>
              <span className="font-bold text-[#111827] text-sm mt-0.5 block truncate">
                {team?.teamName} ({team?.teamId})
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
              <span className="font-bold text-[#667085] uppercase tracking-wider block text-[10px]">
                Selected Timestamp
              </span>
              <span className="font-medium text-[#111827] text-sm mt-0.5 block">
                {formattedTime.combined}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
              <span className="font-bold text-[#667085] uppercase tracking-wider block text-[10px]">
                Selection Status
              </span>
              <span className="font-bold text-[#164A36] text-sm mt-0.5 block flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#164A36]" />
                CONFIRMED & LOCKED
              </span>
            </div>
          </div>
        </div>

        {/* Technical Requirements & Deliverables */}
        {problem && (
          <div className="space-y-6">
            {/* Overview & Deliverables */}
            {problem.expectedSolution && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>EXPECTED SOLUTION & DELIVERABLES</span>
                </h3>
                <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB] text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                  {problem.expectedSolution}
                </div>
              </div>
            )}

            {/* Suggested Tech Stack */}
            {problem.technologies && problem.technologies.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                  <FileCode className="w-4 h-4" />
                  <span>SUGGESTED TECH STACK / FRAMEWORKS</span>
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {problem.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-[#EEF5F0] text-xs font-bold text-[#164A36] border border-[#D5E6DB]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Constraints */}
            {problem.constraints && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>TECHNICAL CONSTRAINTS & LIMITS</span>
                </h3>
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                  {problem.constraints}
                </div>
              </div>
            )}

            {/* Official Attached Document */}
            {problem.fileName && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                  OFFICIAL PROBLEM DOCUMENT
                </h3>

                <div className="p-6 rounded-2xl bg-[#F7F5EF]/80 border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 shadow-xs text-[#164A36]">
                      {isPdf ? (
                        <FileText className="w-7 h-7 text-rose-600 stroke-[1.75]" />
                      ) : isWord ? (
                        <FileText className="w-7 h-7 text-blue-600 stroke-[1.75]" />
                      ) : isExcel ? (
                        <FileSpreadsheet className="w-7 h-7 text-emerald-600 stroke-[1.75]" />
                      ) : (
                        <FileCheck className="w-7 h-7 text-[#164A36] stroke-[1.75]" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${docInfo?.badgeClass}`}>
                          {docInfo?.type}
                        </span>
                        <span className="text-xs text-[#667085]">
                          Official specification attachment
                        </span>
                      </div>

                      <h4 className="font-bold text-sm sm:text-base text-[#111827] break-all">
                        {problem.fileName}
                      </h4>

                      <p className="text-xs text-[#667085]">
                        Size: {formatFileSize(problem.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {isPdf && (
                      <button
                        type="button"
                        onClick={() => setIsPdfModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36] shadow-2xs transition-colors"
                      >
                        <Eye className="w-4 h-4 text-[#164A36]" />
                        <span>PREVIEW DOCUMENT</span>
                      </button>
                    )}

                    {problem.fileUrl && (
                      <a
                        href={problem.fileUrl}
                        download={problem.fileName}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324] shadow-2xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>DOWNLOAD DOCUMENT</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* PDF Viewer Modal */}
      {isPdfModalOpen && problem?.fileUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`bg-white rounded-2xl w-full flex flex-col shadow-2xl border border-[#E5E7EB] overflow-hidden transition-all duration-200 ${
              isPdfFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl h-[88vh]'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F7F5EF]">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-rose-600" />
                <span className="text-sm font-bold text-[#111827] truncate max-w-md">
                  {problem.fileName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={problem.fileUrl}
                  download={problem.fileName}
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsPdfFullscreen((prev) => !prev)}
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white hidden sm:block"
                >
                  {isPdfFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPdfModalOpen(false);
                    setIsPdfFullscreen(false);
                  }}
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#2C3437] relative flex items-center justify-center">
              <iframe
                src={`${problem.fileUrl}#toolbar=1&navpanes=0`}
                title={problem.title}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
