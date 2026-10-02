import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  X,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { ProblemService } from '../../services/problemService';
import { useToast } from '../../context/ToastContext';
import type { ProblemInput, ProblemStatus, ProblemDifficulty } from '../../types';

export const AdminProblemFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditing = Boolean(id);

  // Form Fields per Part 14
  const [problemId, setProblemId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Artificial Intelligence');
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>('Intermediate');
  const [status, setStatus] = useState<ProblemStatus>('DRAFT'); // Default DRAFT per Part 19
  const [releaseDate, setReleaseDate] = useState('');
  const [releaseTime, setReleaseTime] = useState('09:00');
  const [tagsInput, setTagsInput] = useState('');
  const [expectedSolution, setExpectedSolution] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [technologiesInput, setTechnologiesInput] = useState('');
  const [teamSize, setTeamSize] = useState('3-4 Members');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // File Upload State per Part 15 & 22
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultCategories = [
    'Artificial Intelligence',
    'Healthcare & MedTech',
    'Clean Energy & Climate',
    'Agritech & Food Security',
    'FinTech & Cryptography',
    'Robotics & Embedded Systems',
    'Smart Cities & Mobility',
    'Cybersecurity & Privacy',
  ];

  useEffect(() => {
    if (isEditing && id) {
      const load = async () => {
        setIsLoading(true);
        const existing = await ProblemService.getProblemById(id, { forParticipant: false });
        if (existing) {
          setProblemId(existing.problemId);
          setTitle(existing.title);
          setDescription(existing.description);
          setCategory(existing.category);
          setDifficulty(existing.difficulty);
          setStatus(existing.status);
          setTagsInput(existing.tags.join(', '));
          setExpectedSolution(existing.expectedSolution || '');
          setEvaluationCriteria(existing.evaluationCriteria || '');
          setTechnologiesInput((existing.technologies || []).join(', '));
          setTeamSize(existing.teamSize || '3-4 Members');
          setAdditionalNotes(existing.additionalNotes || '');
          if (existing.fileName) {
            setExistingFileName(existing.fileName);
          }
          if (existing.releaseAt) {
            const [d, t] = existing.releaseAt.split('T');
            setReleaseDate(d);
            if (t) setReleaseTime(t.substring(0, 5));
          }
        } else {
          showToast(`Problem "${id}" not found.`, 'error');
          navigate('/admin/problems');
        }
        setIsLoading(false);
      };
      load();
    }
  }, [id, isEditing, navigate, showToast]);

  // -------------------------------------------------------------
  // File Validation & Drag-and-Drop per Part 15 & 22
  // -------------------------------------------------------------
  const validateAndSetFile = (file: File) => {
    setFileError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];

    if (!extension || !allowed.includes(extension)) {
      setFileError('Unsupported file type. Please upload .pdf, .doc, .docx, .xls, or .xlsx');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFileError('File exceeds the maximum allowed size of 15MB.');
      return;
    }

    setUploadedFile(file);
    setExistingFileName(file.name);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setExistingFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -------------------------------------------------------------
  // Submission Handlers: Draft vs Publish (Part 19)
  // -------------------------------------------------------------
  const handleSubmit = async (targetStatus: ProblemStatus) => {
    if (!problemId.trim() || !title.trim() || !description.trim()) {
      showToast('Please fill in all required fields (Problem ID, Title, Description).', 'error');
      return;
    }

    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const technologies = technologiesInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const inputData: ProblemInput = {
      problemId: problemId.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      difficulty,
      status: targetStatus,
      tags: tags.length > 0 ? tags : [category],
      releaseDate: releaseDate || undefined,
      releaseTime: releaseTime || undefined,
      expectedSolution: expectedSolution.trim() || undefined,
      evaluationCriteria: evaluationCriteria.trim() || undefined,
      technologies: technologies.length > 0 ? technologies : undefined,
      teamSize: teamSize || undefined,
      additionalNotes: additionalNotes.trim() || undefined,
    };

    try {
      if (isEditing && id) {
        await ProblemService.updateProblem(id, inputData, uploadedFile || undefined);
        showToast(
          `Problem "${inputData.problemId}" updated successfully (${targetStatus}).`,
          'success',
          'Saved'
        );
      } else {
        await ProblemService.createProblem(inputData, uploadedFile || undefined);
        showToast(
          `Problem "${inputData.problemId}" created successfully (${targetStatus}).`,
          'success',
          'Created'
        );
      }
      navigate('/admin/problems');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save problem statement.', 'error', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-16 text-center text-sm text-[#667085]">
          Loading problem statement editor...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditing ? `Edit Challenge: ${problemId}` : 'ADD PROBLEM STATEMENT'}
      description={
        isEditing
          ? 'Modify challenge specifications and update official attached documents.'
          : 'Draft, configure and upload official hackathon challenge specifications.'
      }
      actionButton={
        <div className="flex items-center gap-2">
          <Button
            to="/admin/problems"
            variant="secondary"
            size="md"
            className="bg-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="bg-white"
          >
            {isSubmitting ? 'Saving...' : 'SAVE AS DRAFT'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            onClick={() => handleSubmit('PUBLISHED')}
          >
            {isSubmitting ? 'Publishing...' : 'PUBLISH PROBLEM'}
          </Button>
        </div>
      }
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs space-y-8">
        {/* Core Identity */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827] mb-4 pb-2 border-b border-[#F3F4F6]">
            1. Core Problem Identity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Problem ID *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={problemId}
                onChange={(e) => setProblemId(e.target.value)}
                placeholder="e.g. PS-2026-AI-01"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36] disabled:opacity-60"
              />
              <span className="text-[11px] text-[#667085] mt-1 block">
                Unique identifier used for team tracking
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Problem Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autonomous Defect Detection in Precision Aerospace Manufacturing"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Domain / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              >
                {defaultCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Release Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProblemStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              >
                <option value="DRAFT">DRAFT (Hidden from participants)</option>
                <option value="PUBLISHED">PUBLISHED (Visible to teams)</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Scope */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827] mb-4 pb-2 border-b border-[#F3F4F6]">
            2. Detailed Scope & Description
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
              Problem Description *
            </label>
            <textarea
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive technical description of the problem, background motivation, industrial context, and constraints..."
              className="w-full p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#164A36]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Expected Solution / Deliverables
              </label>
              <textarea
                rows={3}
                value={expectedSolution}
                onChange={(e) => setExpectedSolution(e.target.value)}
                placeholder="What artifacts should teams submit? e.g. Working API, model weights, UI dashboard..."
                className="w-full p-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Evaluation Criteria & Weightage
              </label>
              <textarea
                rows={3}
                value={evaluationCriteria}
                onChange={(e) => setEvaluationCriteria(e.target.value)}
                placeholder="e.g. Accuracy (40%), Real-time latency (30%), Code architecture (20%), UI (10%)..."
                className="w-full p-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Suggested Technologies (comma separated)
              </label>
              <input
                type="text"
                value={technologiesInput}
                onChange={(e) => setTechnologiesInput(e.target.value)}
                placeholder="PyTorch, OpenCV, TensorRT, React, Docker"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Tags / Keywords (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Computer Vision, Edge AI, Industrial IoT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>
          </div>
        </div>

        {/* OFFICIAL FILE UPLOAD AREA per Part 15 & 22 */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827] mb-2 pb-2 border-b border-[#F3F4F6]">
            3. Official Problem Document Attachment
          </h3>
          <p className="text-xs text-[#667085] mb-4">
            Upload the primary challenge document (.pdf, .doc, .docx, .xls, .xlsx). This file will be preserved as the official source document for registered teams.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />

          {fileError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {existingFileName ? (
            /* Selected File Display per Part 15 */
            <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#D5E6DB] text-[#164A36] flex items-center justify-center">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[#111827] text-sm break-all">
                    {existingFileName}
                  </h4>
                  <p className="text-xs text-[#667085]">
                    {uploadedFile
                      ? `New upload: ${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : 'Preserved official document attached'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white"
                >
                  Replace File
                </Button>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 text-[#667085] hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            /* Drag and Drop Area per Part 15 */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#CBD5E1] hover:border-[#164A36] rounded-2xl p-8 text-center cursor-pointer bg-[#F7F5EF]/40 hover:bg-[#EEF5F0]/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] text-[#164A36] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#111827]">
                UPLOAD PROBLEM STATEMENT
              </h4>
              <p className="text-xs text-[#667085] mt-1">
                Drag & drop your PDF, Excel, or Word document here
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-white pointer-events-none"
                >
                  Browse Files
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button
            to="/admin/problems"
            variant="secondary"
            size="md"
            className="bg-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="bg-white"
          >
            SAVE AS DRAFT
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            onClick={() => handleSubmit('PUBLISHED')}
          >
            PUBLISH PROBLEM
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};
