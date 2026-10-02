export interface StatItem {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface NavLinkItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface HowItWorksStep {
  stepNumber: string;
  title: string;
  description: string;
}

export interface PortalFeature {
  id: string;
  title: string;
  description: string;
  iconName?: string;
}

export interface ContactInfo {
  email: string;
  supportHours: string;
  venue: string;
  dates: string;
}

export interface HackathonConfig {
  hackathonName: string;
  hackathonYear: string;
  hackathonTagline: string;
  organizationName: string;
  universityName: string;
  edition: string;
  hero: {
    eyebrow: string;
    headingPart1: string;
    headingPart2: string;
    headingHighlight: string;
    supportingText: string;
    primaryCtaText: string;
    secondaryCtaText: string;
  };
  statistics: StatItem[];
  navigationLinks: NavLinkItem[];
  howItWorksSteps: HowItWorksStep[];
  whyPortalFeatures: PortalFeature[];
  releaseBanner: {
    title: string;
    description: string;
    status: string;
    releaseDateText: string;
  };
  contactInformation: ContactInfo;
}

export interface EventConfig {
  eventName: string;
  clubName: string;
  clubLogo?: string;
  eventBanner?: string;
  problemSelectionLimit: number;
  edition?: string;
  academicYear?: string;
  tagline?: string;
  description?: string;
  contactEmail?: string;
  supportHours?: string;
  venue?: string;
  dates?: string;
  createdAt?: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// Team & Participant Data Model (Parts 3, 5, 7, 10)
// -------------------------------------------------------------
export type TeamStatus = 'active' | 'inactive';

export interface TeamRecord {
  teamId: string;
  teamName: string;
  teamLeadName: string;
  teamLeadRegistrationNumber?: string;
  credentialHash?: string;
  teamMembers: string[];
  email: string;
  phone: string;
  status: TeamStatus;
  college?: string;
  selectedProblemId?: string;
  selectedProblemTitle?: string;
  selectionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedTeamRow {
  rowNumber: number;
  teamId: string;
  teamName: string;
  teamLeadName: string;
  teamLeadRegistrationNumber: string;
  password?: string;
  members: string[];
  email: string;
  phone: string;
  college?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportValidationSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  validTeams: ParsedTeamRow[];
  invalidTeams: ParsedTeamRow[];
  duplicateNames: string[];
}

export interface ParsedProblemRow {
  rowNumber: number;
  problemId: string;
  title: string;
  description: string;
  category: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  expectedSolution?: string;
  evaluationCriteria?: string;
  technologies?: string[];
  constraints?: string;
  teamSize?: string;
  additionalNotes?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportProblemSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  validProblems: ParsedProblemRow[];
  invalidProblems: ParsedProblemRow[];
  duplicateIds: string[];
}

// -------------------------------------------------------------
// Problem Statement Data Model (Parts 14, 15, 16, 17, 18, 19)
// -------------------------------------------------------------
export type ProblemStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type ProblemDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProblemRecord {
  problemId: string;
  title: string;
  description: string;
  category: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  status: ProblemStatus;
  createdAt: string;
  updatedAt: string;
  releaseAt?: string;
  createdBy?: string;
  expectedSolution?: string;
  evaluationCriteria?: string;
  technologies?: string[];
  constraints?: string;
  teamSize?: string;
  additionalNotes?: string;
  selectedCount?: number;
}

export interface ProblemInput {
  problemId: string;
  title: string;
  description: string;
  category: string;
  difficulty: ProblemDifficulty;
  tags?: string[];
  status: ProblemStatus;
  releaseDate?: string;
  releaseTime?: string;
  expectedSolution?: string;
  evaluationCriteria?: string;
  technologies?: string[];
  constraints?: string;
  teamSize?: string;
  additionalNotes?: string;
}

// -------------------------------------------------------------
// Authentication Session & Roles (Part 2, 11)
// -------------------------------------------------------------
export type UserRole = 'admin' | 'team';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export interface AuthSession {
  role: UserRole;
  team?: TeamRecord;
  admin?: AdminUser;
}

// -------------------------------------------------------------
// Step 6 & 7: Selection, Audit, and Settings Models
// -------------------------------------------------------------
export interface TeamSelection {
  teamId: string;
  teamName: string;
  teamLeadName?: string;
  teamLeadRegistrationNumber?: string;
  problemId: string;
  problemTitle: string;
  category?: string;
  selectedAt: string; // ISO 8601 string
  selectedBy: string; // Authenticated User / Team Lead
  status: 'CONFIRMED';
}

export type AuditActionType =
  | 'RESET_SELECTION'
  | 'MANUAL_ASSIGNMENT'
  | 'SESSION_RESET'
  | 'CLOSE_SELECTION'
  | 'OPEN_SELECTION'
  | 'UPDATE_SETTINGS'
  | 'CREATE_SELECTION'
  | 'PROBLEM_CREATED'
  | 'PROBLEM_EDITED'
  | 'PROBLEM_PUBLISHED'
  | 'PROBLEM_UNPUBLISHED'
  | 'PROBLEM_ARCHIVED'
  | 'PROBLEM_DELETED'
  | 'PROBLEMS_IMPORTED'
  | 'TEAM_IMPORTED'
  | 'TEAM_DEACTIVATED'
  | 'ANNOUNCEMENT_CREATED'
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'ANNOUNCEMENT_ARCHIVED'
  | 'ANNOUNCEMENT_DELETED'
  | 'BULK_RELEASE'
  | 'DATA_CLEANUP';

export interface AuditLogRecord {
  id: string;
  action: AuditActionType;
  teamId?: string;
  teamName?: string;
  oldProblemId?: string;
  adminId: string;
  timestamp: string;
  reason?: string;
  details?: string;
  target?: string;
}

export interface PortalSettings {
  allowMultipleTeamsPerProblem: boolean;
  problemSelectionLimit: number; // default 2 (or N configured by admin)
  isSelectionOpen: boolean;
  selectionDeadline?: string; // ISO 8601 or empty
  globalReleaseDate?: string; // YYYY-MM-DD
  globalReleaseTime?: string; // HH:mm
  globalReleaseStatus?: 'NOT_STARTED' | 'LIVE' | 'CLOSED';
  updatedAt?: string;
  updatedBy?: string;
}

// -------------------------------------------------------------
// Step 8: Announcement System Data Models
// -------------------------------------------------------------
export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  publishDate: string; // ISO 8601
  expiryDate?: string; // ISO 8601 optional
  status: AnnouncementStatus;
  target?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementInput {
  title: string;
  message: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishDate?: string;
  expiryDate?: string;
  target?: string;
}

export interface AdminDashboardStats {
  totalTeams: number;
  totalProblems: number;
  publishedProblems: number;
  teamsWithSelection: number;
  teamsWithoutSelection: number;
  selectionRate: number; // 0 to 100 percentage
}

export interface RecentActivityItem {
  id: string;
  type: 'SELECTION' | 'PUBLICATION' | 'REGISTRATION' | 'RESET';
  title: string;
  description: string;
  timestamp: string;
  teamId?: string;
  teamName?: string;
  problemId?: string;
}
