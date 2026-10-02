import * as XLSX from 'xlsx';
import type {
  ParsedTeamRow,
  ImportValidationSummary,
  ParsedProblemRow,
  ImportProblemSummary,
  ProblemDifficulty,
} from '../types';

export interface ParseOptions {
  existingTeamNames?: string[];
  existingTeamIds?: string[];
}

export interface ProblemParseOptions {
  existingProblemIds?: string[];
}

export class FileParserService {
  // ==========================================================================
  // 1. PARTICIPANTS LIST PARSER (.xlsx, .xls, .csv, .pdf)
  // Columns: Team ID (username), Team Name, Password, (Lead Name, Email, etc.)
  // ==========================================================================
  public static async parseParticipantFile(
    file: File,
    options: ParseOptions = {}
  ): Promise<ImportValidationSummary> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !['xlsx', 'xls', 'csv', 'txt', 'pdf'].includes(fileExtension)) {
      throw new Error(`Unsupported file type: .${fileExtension}. Please upload .xlsx, .xls, .csv, or .pdf`);
    }

    let rawRows: Record<string, any>[] = [];

    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    } else if (fileExtension === 'pdf') {
      const buffer = await file.arrayBuffer();
      rawRows = await this.extractParticipantRowsFromPDF(buffer, file.name);
    }

    return this.validateAndNormalizeParticipantRows(rawRows, options);
  }

  // ==========================================================================
  // 2. PROBLEM STATEMENTS BULK PARSER (.xlsx, .xls, .csv, .pdf)
  // Columns: Problem ID, Title, Description, Category, Difficulty, Tags, etc.
  // ==========================================================================
  public static async parseProblemFile(
    file: File,
    options: ProblemParseOptions = {}
  ): Promise<ImportProblemSummary> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !['xlsx', 'xls', 'csv', 'txt', 'pdf'].includes(fileExtension)) {
      throw new Error(`Unsupported file type: .${fileExtension}. Please upload .xlsx, .xls, .csv, or .pdf`);
    }

    let rawRows: Record<string, any>[] = [];

    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    } else if (fileExtension === 'pdf') {
      const buffer = await file.arrayBuffer();
      rawRows = await this.extractProblemRowsFromPDF(buffer);
    }

    return this.validateAndNormalizeProblemRows(rawRows, options);
  }

  /**
   * Normalize flexible column headers (e.g. "Team ID", "team_id", "Username")
   */
  private static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Validate and map raw imported participant rows
   */
  private static validateAndNormalizeParticipantRows(
    rows: Record<string, any>[],
    options: ParseOptions
  ): ImportValidationSummary {
    const validTeams: ParsedTeamRow[] = [];
    const invalidTeams: ParsedTeamRow[] = [];
    const duplicateNames: string[] = [];

    const seenIdsInFile = new Set<string>();
    const seenNamesInFile = new Set<string>();
    const existingNames = new Set(
      (options.existingTeamNames || []).map((n) => n.trim().toLowerCase())
    );
    const existingIds = new Set(
      (options.existingTeamIds || []).map((id) => id.trim().toLowerCase())
    );

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];

      let teamId = '';
      let teamName = '';
      let password = '';
      let teamLeadName = '';
      let teamLeadReg = '';
      let email = '';
      let phone = '';
      let college = '';
      const members: string[] = [];

      for (const [rawKey, rawVal] of Object.entries(row)) {
        const key = this.normalizeKey(rawKey);
        const val = String(rawVal || '').trim();
        if (!val) continue;

        if (
          key === 'teamid' ||
          key === 'id' ||
          key === 'teamcode' ||
          key === 'username' ||
          key === 'userid' ||
          key === 'user'
        ) {
          teamId = val;
        } else if (key === 'teamname' || key === 'team' || key === 'name') {
          teamName = val;
        } else if (
          key === 'password' ||
          key === 'pass' ||
          key === 'pwd' ||
          key === 'teampassword' ||
          key === 'teampass' ||
          key === 'teamkey' ||
          key === 'credential'
        ) {
          password = val;
        } else if (
          key === 'teamleadname' ||
          key === 'teamlead' ||
          key === 'leadname' ||
          key === 'leader' ||
          key === 'leadername'
        ) {
          teamLeadName = val;
        } else if (
          key === 'teamleadregistrationnumber' ||
          key === 'leadregno' ||
          key === 'registrationnumber' ||
          key === 'regno' ||
          key === 'regnumber' ||
          key === 'leadreg'
        ) {
          teamLeadReg = val;
        } else if (key.includes('member') || key === 'teammembers') {
          const splitMembers = val.split(/[,;\n]/).map((m) => m.trim()).filter(Boolean);
          members.push(...splitMembers);
        } else if (key === 'email' || key === 'leademail' || key === 'contactemail') {
          email = val;
        } else if (key === 'phone' || key === 'contact' || key === 'mobile') {
          phone = val;
        } else if (key === 'college' || key === 'university' || key === 'institution') {
          college = val;
        }
      }

      // If teamId is missing, auto-fallback to teamName or generated ID
      if (!teamId && teamName) {
        teamId = `TM-${new Date().getFullYear()}-${String(rowNumber).padStart(3, '0')}`;
      } else if (!teamName && teamId) {
        teamName = `Team ${teamId}`;
      }

      // If password column was empty, check if teamLeadReg was provided
      if (!password && teamLeadReg) {
        password = teamLeadReg;
      }
      if (!teamLeadReg && password) {
        teamLeadReg = password;
      }

      // Validation
      if (!teamId && !teamName) {
        errors.push(`Row ${rowNumber}: Missing Team ID and Team Name`);
      }
      if (!password) {
        errors.push(`Row ${rowNumber}: Missing Password credential for team`);
      }

      if (!teamLeadName) {
        teamLeadName = teamName ? `${teamName} Lead` : 'Team Lead';
      }

      if (members.length === 0 && teamLeadName) {
        members.push(teamLeadName);
      } else if (teamLeadName && !members.includes(teamLeadName)) {
        members.unshift(teamLeadName);
      }

      // Check duplicates
      const normalizedId = teamId.toLowerCase();
      const normalizedName = teamName.toLowerCase();

      if (teamId) {
        if (seenIdsInFile.has(normalizedId)) {
          errors.push(`Row ${rowNumber}: Duplicate Team ID "${teamId}" in uploaded file`);
          duplicateNames.push(teamId);
        } else if (existingIds.has(normalizedId)) {
          errors.push(`Row ${rowNumber}: Team ID "${teamId}" already exists in the system`);
          duplicateNames.push(teamId);
        } else {
          seenIdsInFile.add(normalizedId);
        }
      }

      if (teamName) {
        if (seenNamesInFile.has(normalizedName)) {
          errors.push(`Row ${rowNumber}: Duplicate Team Name "${teamName}" in uploaded file`);
          duplicateNames.push(teamName);
        } else if (existingNames.has(normalizedName)) {
          errors.push(`Row ${rowNumber}: Team "${teamName}" already exists in the system`);
          duplicateNames.push(teamName);
        } else {
          seenNamesInFile.add(normalizedName);
        }
      }

      const parsedRow: ParsedTeamRow = {
        rowNumber,
        teamId,
        teamName,
        teamLeadName,
        teamLeadRegistrationNumber: teamLeadReg,
        password,
        members,
        email: email || `${teamId.toLowerCase().replace(/[^a-z0-9]/g, '')}@hackathon.local`,
        phone: phone || '+91 90000 00000',
        college: college || 'Participant Institution',
        isValid: errors.length === 0,
        errors,
      };

      if (parsedRow.isValid) {
        validTeams.push(parsedRow);
      } else {
        invalidTeams.push(parsedRow);
      }
    });

    return {
      totalRows: rows.length,
      validCount: validTeams.length,
      invalidCount: invalidTeams.length,
      duplicateCount: duplicateNames.length,
      validTeams,
      invalidTeams,
      duplicateNames,
    };
  }

  /**
   * Validate and map raw imported problem statement rows
   */
  private static validateAndNormalizeProblemRows(
    rows: Record<string, any>[],
    options: ProblemParseOptions
  ): ImportProblemSummary {
    const validProblems: ParsedProblemRow[] = [];
    const invalidProblems: ParsedProblemRow[] = [];
    const duplicateIds: string[] = [];

    const seenIdsInFile = new Set<string>();
    const existingIds = new Set(
      (options.existingProblemIds || []).map((id) => id.trim().toLowerCase())
    );

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];

      let problemId = '';
      let title = '';
      let description = '';
      let category = '';
      let difficulty: ProblemDifficulty = 'Intermediate';
      const tags: string[] = [];
      let expectedSolution = '';
      let evaluationCriteria = '';
      let technologies: string[] = [];
      let constraints = '';
      let teamSize = '2-4 Members';
      let additionalNotes = '';

      for (const [rawKey, rawVal] of Object.entries(row)) {
        const key = this.normalizeKey(rawKey);
        const val = String(rawVal || '').trim();
        if (!val) continue;

        if (
          key === 'problemid' ||
          key === 'id' ||
          key === 'code' ||
          key === 'psid' ||
          key === 'ps' ||
          key === 'trackid' ||
          key === 'number' ||
          key === 'no'
        ) {
          problemId = val.toUpperCase();
        } else if (
          key === 'title' ||
          key === 'problemtitle' ||
          key === 'problemstatement' ||
          key === 'name' ||
          key === 'challenge'
        ) {
          title = val;
        } else if (
          key === 'description' ||
          key === 'problemdescription' ||
          key === 'details' ||
          key === 'problem' ||
          key === 'desc' ||
          key === 'summary' ||
          key === 'overview'
        ) {
          description = val;
        } else if (
          key === 'category' ||
          key === 'domain' ||
          key === 'track' ||
          key === 'field' ||
          key === 'area' ||
          key === 'theme'
        ) {
          category = val;
        } else if (key === 'difficulty' || key === 'level' || key === 'complexity') {
          const lower = val.toLowerCase();
          if (lower.includes('begin') || lower.includes('easy')) {
            difficulty = 'Beginner';
          } else if (lower.includes('adv') || lower.includes('hard')) {
            difficulty = 'Advanced';
          } else {
            difficulty = 'Intermediate';
          }
        } else if (key === 'tags' || key === 'keywords' || key === 'topics') {
          const splitTags = val.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
          tags.push(...splitTags);
        } else if (
          key === 'expectedsolution' ||
          key === 'solution' ||
          key === 'deliverables' ||
          key === 'outcomes'
        ) {
          expectedSolution = val;
        } else if (
          key === 'evaluationcriteria' ||
          key === 'evaluation' ||
          key === 'criteria' ||
          key === 'rubric'
        ) {
          evaluationCriteria = val;
        } else if (
          key === 'technologies' ||
          key === 'techstack' ||
          key === 'tools' ||
          key === 'skills'
        ) {
          technologies = val.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
        } else if (key === 'constraints' || key === 'rules' || key === 'restrictions') {
          constraints = val;
        } else if (key === 'teamsize' || key === 'members') {
          teamSize = val;
        } else if (key === 'additionalnotes' || key === 'notes' || key === 'remarks') {
          additionalNotes = val;
        }
      }

      // Auto-assign problem ID if missing
      if (!problemId && title) {
        problemId = `PS-${String(rowNumber - 1).padStart(2, '0')}`;
      }

      // Default category if not given
      if (!category) {
        category = 'General Innovation';
      }

      if (tags.length === 0) {
        tags.push(category);
      }

      // Validation
      if (!title) {
        errors.push(`Row ${rowNumber}: Missing Problem Statement Title`);
      }
      if (!description) {
        errors.push(`Row ${rowNumber}: Missing Problem Description`);
      }

      // Check duplicates
      const normalizedId = problemId.toLowerCase();
      if (problemId) {
        if (seenIdsInFile.has(normalizedId)) {
          errors.push(`Row ${rowNumber}: Duplicate Problem ID "${problemId}" in uploaded file`);
          duplicateIds.push(problemId);
        } else if (existingIds.has(normalizedId)) {
          errors.push(`Row ${rowNumber}: Problem ID "${problemId}" already exists in database`);
          duplicateIds.push(problemId);
        } else {
          seenIdsInFile.add(normalizedId);
        }
      }

      const parsedProblem: ParsedProblemRow = {
        rowNumber,
        problemId,
        title,
        description,
        category,
        difficulty,
        tags,
        expectedSolution,
        evaluationCriteria,
        technologies,
        constraints,
        teamSize,
        additionalNotes,
        isValid: errors.length === 0,
        errors,
      };

      if (parsedProblem.isValid) {
        validProblems.push(parsedProblem);
      } else {
        invalidProblems.push(parsedProblem);
      }
    });

    return {
      totalRows: rows.length,
      validCount: validProblems.length,
      invalidCount: invalidProblems.length,
      duplicateCount: duplicateIds.length,
      validProblems,
      invalidProblems,
      duplicateIds,
    };
  }

  /**
   * PDF text extractor for problem statements
   * Recognizes structured problem statement blocks:
   * e.g. "PS-01 — Title", "Problem 1: Title", "PS-01: Title", etc.
   */
  private static async extractProblemRowsFromPDF(
    buffer: ArrayBuffer
  ): Promise<Record<string, any>[]> {
    let fullText = '';

    try {
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = typeof window !== 'undefined'
          ? `${window.location.origin}/pdf.worker.min.js`
          : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        pages.push(text);
      }
      fullText = pages.join('\n\n');
    } catch (primaryErr: any) {
      console.warn('[FileParserService] Local PDF worker failed, trying CDN fallback:', primaryErr);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
        });
        const pdf = await loadingTask.promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pages.push(textContent.items.map((item: any) => item.str || '').join(' '));
        }
        fullText = pages.join('\n\n');
      } catch (fallbackErr: any) {
        console.error('[FileParserService] PDF extraction failed completely:', fallbackErr);
        throw new Error(
          'Failed to extract text from the PDF document. Please make sure the PDF has selectable text (not scanned images), or upload as Excel (.xlsx, .xls) or CSV.'
        );
      }
    }

    if (!fullText || fullText.trim().length < 10) {
      throw new Error(
        'The uploaded PDF document contains no readable text. If this is a scanned document, please convert it to Excel or CSV before uploading.'
      );
    }

    const rows: Record<string, any>[] = [];
    const normalizedText = fullText.replace(/\r\n/g, '\n');

    // Split on headers such as "PS-01 — Title", "PS-01: Title", "Problem 1: Title", "Challenge 1 - Title"
    const headerRegex = /(?:^|\n|\s{2,})(PS[-_\s]*\d+|Problem\s*(?:Statement)?\s*[-#:]?\s*\d+|Challenge\s*[-#:]?\s*\d+)\s*[-—–:]\s*/gi;

    const matches: { idStr: string; index: number; fullMatch: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = headerRegex.exec(normalizedText)) !== null) {
      matches.push({
        idStr: m[1],
        index: m.index,
        fullMatch: m[0],
      });
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        const next = matches[i + 1];
        const chunk = normalizedText.slice(cur.index, next ? next.index : undefined).trim();

        const psIdMatch = chunk.match(/^(?:PS[-_\s]*(\d+)|Problem\s*(?:Statement)?\s*(\d+)|Challenge\s*(\d+))\s*[-—–:]\s*/i);
        const num = psIdMatch ? (psIdMatch[1] || psIdMatch[2] || psIdMatch[3]) : String(i + 1);
        const cleanId = 'PS-' + num.padStart(2, '0');

        const contentAfterId = chunk.replace(/^(?:PS[-_\s]*\d+|Problem\s*(?:Statement)?\s*\d+|Challenge\s*\d+)\s*[-—–:]\s*/i, '');

        // Extract Title
        const titleMatch = contentAfterId.match(/^(.*?)(?=\s*Category:|\s*Difficulty:|\s*Problem Description|\s*Description:|\s*Track:|$)/is);
        let title = titleMatch ? titleMatch[1].trim() : `Problem ${cleanId}`;
        title = title.replace(/[-—–:]\s*$/, '').trim();

        // Extract Category
        const catMatch = contentAfterId.match(/(?:Category|Domain|Track|Theme)[:\s]+(.*?)(?=\s*Difficulty:|\s*Level:|\s*Problem Description|\s*Description:|$)/is);
        const category = catMatch ? catMatch[1].trim() : 'General Innovation';

        // Extract Difficulty
        const diffMatch = contentAfterId.match(/(?:Difficulty|Level|Complexity)[:\s]+(.*?)(?=\s*Problem Description|\s*Description:|\s*Suggested Evaluation Focus:|\s*Evaluation:|$)/is);
        let difficulty: ProblemDifficulty = 'Intermediate';
        if (diffMatch) {
          const d = diffMatch[1].trim().toLowerCase();
          if (d.includes('begin') || d.includes('easy')) difficulty = 'Beginner';
          else if (d.includes('adv') || d.includes('hard')) difficulty = 'Advanced';
          else difficulty = 'Intermediate';
        }

        // Extract Description
        const descMatch = contentAfterId.match(/(?:Problem Description|Description)[:\s]*(.*?)(?=\s*(?:Suggested Evaluation Focus|Evaluation Criteria|Evaluation|Constraints|Deliverables):|$)/is);
        let desc = descMatch ? descMatch[1].trim() : '';
        if (!desc) {
          desc = contentAfterId
            .replace(title, '')
            .replace(/(?:Category|Domain|Track)[:\s]+[^\n]+/i, '')
            .replace(/(?:Difficulty|Level)[:\s]+[^\n]+/i, '')
            .trim();
        }

        // Extract Evaluation Criteria
        const evalMatch = contentAfterId.match(/(?:Suggested Evaluation Focus|Evaluation Criteria|Evaluation Focus|Criteria)[:\s]+(.*?)$/is);
        const evaluationCriteria = evalMatch ? evalMatch[1].trim() : '';

        if (title && (desc || title.length > 5)) {
          rows.push({
            'Problem ID': cleanId,
            Title: title,
            Category: category,
            Difficulty: difficulty,
            Description: desc || title,
            'Evaluation Criteria': evaluationCriteria,
          });
        }
      }
    } else {
      // Fallback: split by double line breaks or numbered paragraphs
      const paragraphs = normalizedText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      let problemIndex = 1;
      for (const para of paragraphs) {
        const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        const firstLine = lines[0];
        let title = firstLine.slice(0, 100);
        let desc = lines.slice(1).join(' ') || para;
        let category = 'General Innovation';

        const catMatch = para.match(/(?:category|domain|track|theme)[:\s]+([^\n.,;]+)/i);
        if (catMatch && catMatch[1]) {
          category = catMatch[1].trim();
        }

        rows.push({
          'Problem ID': `PS-${String(problemIndex).padStart(2, '0')}`,
          Title: title,
          Description: desc,
          Category: category,
          Difficulty: 'Intermediate',
        });
        problemIndex++;
      }
    }

    return rows;
  }

  /**
   * PDF text extractor for participant rosters
   */
  private static async extractParticipantRowsFromPDF(
    buffer: ArrayBuffer,
    _filename: string
  ): Promise<Record<string, any>[]> {
    let fullText = '';

    try {
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = typeof window !== 'undefined'
          ? `${window.location.origin}/pdf.worker.min.js`
          : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        pages.push(text);
      }
      fullText = pages.join('\n');
    } catch (primaryErr: any) {
      console.warn('[FileParserService] Participant PDF worker fallback:', primaryErr);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
        });
        const pdf = await loadingTask.promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pages.push(textContent.items.map((item: any) => item.str || '').join(' '));
        }
        fullText = pages.join('\n');
      } catch (fallbackErr: any) {
        throw new Error(
          'Failed to extract participant text from PDF. Please upload roster as Excel (.xlsx, .xls) or CSV.'
        );
      }
    }

    const candidateRows: Record<string, any>[] = [];
    const lines = fullText.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l.length > 5);

    for (const line of lines) {
      if (line.includes(',') || line.includes('\t') || line.includes('|')) {
        const parts = line.split(/[,|\t]/).map((p) => p.trim());
        if (parts.length >= 3) {
          candidateRows.push({
            'Team ID': parts[0],
            'Team Name': parts[1],
            Password: parts[2],
            'Team Lead Name': parts[3] || 'Team Lead',
          });
        } else if (parts.length === 2) {
          candidateRows.push({
            'Team Name': parts[0],
            Password: parts[1],
          });
        }
      }
    }

    return candidateRows;
  }
}

