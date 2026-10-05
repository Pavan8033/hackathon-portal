import * as XLSX from 'xlsx';
import type {
  ParsedTeamRow,
  ImportValidationSummary,
  ParsedProblemRow,
  ImportProblemSummary,
  ProblemDifficulty,
  ParsedCredentialRow,
  ImportCredentialSummary,
} from '../types';

export interface ParseOptions {
  existingTeamNames?: string[];
  existingTeamIds?: string[];
}

export interface ProblemParseOptions {
  existingProblemIds?: string[];
}

export class FileParserService {
  /**
   * Smart Header Detector: Finds the actual header row in a spreadsheet,
   * skipping title banners, blank lines, or metadata rows at the top.
   */
  public static extractJsonFromSheet(worksheet: XLSX.WorkSheet): Record<string, any>[] {
    const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) return [];

    let headerRowIndex = 0;
    let maxMatchCount = 0;

    // Scan up to first 15 rows for key headers
    for (let r = 0; r < Math.min(15, rawMatrix.length); r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;

      let matchCount = 0;
      for (const cell of row) {
        const k = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          k === 'teamid' ||
          k === 'teamcode' ||
          k === 'teamno' ||
          k === 'teamname' ||
          k === 'teamlead' ||
          k === 'teamleadname' ||
          k === 'leadname' ||
          k === 'leader' ||
          k === 'regno' ||
          k === 'registrationnumber' ||
          k === 'usn' ||
          k === 'rollno' ||
          k === 'member' ||
          k === 'members' ||
          k === 'teammembers' ||
          k === 'participant' ||
          k === 'participants' ||
          k === 'problemid' ||
          k === 'problemtitle' ||
          k === 'problemstatement' ||
          k === 'title' ||
          k === 'username' ||
          k === 'password'
        ) {
          matchCount += 2;
        } else if (
          k.includes('team') ||
          k.includes('lead') ||
          k.includes('reg') ||
          k.includes('member') ||
          k.includes('problem') ||
          k.includes('title') ||
          k.includes('user')
        ) {
          matchCount++;
        }
      }

      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        headerRowIndex = r;
      }
    }

    const rawHeaders = (rawMatrix[headerRowIndex] || []).map((h, colIdx) => {
      const clean = String(h || '').trim();
      return clean || `col_${colIdx}`;
    });

    // Handle duplicate header names by appending column index
    const seenHeaders = new Set<string>();
    const headers = rawHeaders.map((h, colIdx) => {
      let finalHeader = h;
      if (seenHeaders.has(finalHeader.toLowerCase())) {
        finalHeader = `${h}_${colIdx}`;
      }
      seenHeaders.add(finalHeader.toLowerCase());
      return finalHeader;
    });

    const result: Record<string, any>[] = [];
    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const rowData = rawMatrix[r];
      if (!Array.isArray(rowData)) continue;

      const obj: Record<string, any> = {};
      let hasData = false;
      headers.forEach((hdr, colIdx) => {
        const val = rowData[colIdx] !== undefined ? String(rowData[colIdx]).trim() : '';
        if (val) hasData = true;
        obj[hdr] = val;
      });

      if (hasData) {
        result.push(obj);
      }
    }

    return result;
  }

  // ==========================================================================
  // 1. PARTICIPANTS LIST PARSER (.xlsx, .xls, .csv, .pdf)
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
      rawRows = this.extractJsonFromSheet(worksheet);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      let sheetToUse = workbook.Sheets[workbook.SheetNames[0]];
      const targetSheetName = workbook.SheetNames.find((s) => {
        const lower = s.toLowerCase();
        return lower.includes('team') || lower.includes('participant') || lower.includes('roster');
      });
      if (targetSheetName && workbook.Sheets[targetSheetName]) {
        sheetToUse = workbook.Sheets[targetSheetName];
      } else {
        for (const s of workbook.SheetNames) {
          const ws = workbook.Sheets[s];
          const testRows = XLSX.utils.sheet_to_json(ws);
          if (testRows.length > 0) {
            sheetToUse = ws;
            break;
          }
        }
      }
      rawRows = this.extractJsonFromSheet(sheetToUse);
    } else if (fileExtension === 'pdf') {
      const buffer = await file.arrayBuffer();
      rawRows = await this.extractParticipantRowsFromPDF(buffer, file.name);
    }

    return this.validateAndNormalizeParticipantRows(rawRows, options);
  }

  // ==========================================================================
  // 2. PROBLEM STATEMENTS BULK PARSER (.xlsx, .xls, .csv, .pdf)
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
      rawRows = this.extractJsonFromSheet(worksheet);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = this.extractJsonFromSheet(worksheet);
    } else if (fileExtension === 'pdf') {
      const buffer = await file.arrayBuffer();
      rawRows = await this.extractProblemRowsFromPDF(buffer);
    }

    return this.validateAndNormalizeProblemRows(rawRows, options);
  }

  // ==========================================================================
  // 3. CREDENTIALS PARSER (.xlsx, .xls, .csv, .txt)
  // Format: TEAM ID (username) & REGISTRATION NUMBER (password)
  // ==========================================================================
  public static async parseCredentialsFile(
    file: File
  ): Promise<ImportCredentialSummary> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !['xlsx', 'xls', 'csv', 'txt'].includes(fileExtension)) {
      throw new Error(`Unsupported credentials file type: .${fileExtension}. Please upload .xlsx, .xls, or .csv`);
    }

    let rawRows: Record<string, any>[] = [];

    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = this.extractJsonFromSheet(worksheet);
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = this.extractJsonFromSheet(worksheet);
    }

    return this.validateAndNormalizeCredentialRows(rawRows);
  }

  private static validateAndNormalizeCredentialRows(
    rows: Record<string, any>[]
  ): ImportCredentialSummary {
    const validCredentials: ParsedCredentialRow[] = [];
    const invalidCredentials: ParsedCredentialRow[] = [];
    const duplicateIds: string[] = [];
    const seenCombos = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];

      let teamId = '';
      let registrationNumber = '';

      const entries = Object.entries(row);

      for (const [rawKey, rawVal] of entries) {
        const key = this.normalizeKey(rawKey);
        let val = String(rawVal ?? '').trim();
        if (!val) continue;

        // Clean float .0 from Excel numbers
        if (val.endsWith('.0') && /^\d+\.0$/.test(val)) {
          val = val.slice(0, -2);
        }

        if (this.isTeamIdKey(key)) {
          teamId = val;
        } else if (this.isRegKey(key) || this.isPasswordKey(key)) {
          registrationNumber = val;
        }
      }

      // Positional fallback if headers were ambiguous
      if ((!teamId || !registrationNumber) && entries.length >= 2) {
        const nonNullEntries = entries.filter(([_, v]) => String(v ?? '').trim() !== '');
        if (nonNullEntries.length >= 2) {
          if (!teamId) {
            let v0 = String(nonNullEntries[0][1] ?? '').trim();
            if (v0.endsWith('.0') && /^\d+\.0$/.test(v0)) v0 = v0.slice(0, -2);
            teamId = v0;
          }
          if (!registrationNumber) {
            let v1 = String(nonNullEntries[1][1] ?? '').trim();
            if (v1.endsWith('.0') && /^\d+\.0$/.test(v1)) v1 = v1.slice(0, -2);
            registrationNumber = v1;
          }
        }
      }

      // Skip completely empty row
      if (!teamId && !registrationNumber) {
        return;
      }

      // Validations
      if (!teamId) {
        errors.push(`Row ${rowNumber}: Missing Team ID (Username)`);
      }
      if (!registrationNumber) {
        errors.push(`Row ${rowNumber}: Missing Registration Number (Password)`);
      }

      // Check exact teamId + registrationNumber duplicates
      const comboKey = `${teamId.toLowerCase()}___${registrationNumber.toLowerCase()}`;
      if (teamId && registrationNumber && seenCombos.has(comboKey)) {
        return; // Skip duplicate identical row silently
      }
      if (teamId && registrationNumber) {
        seenCombos.add(comboKey);
      }

      const parsed: ParsedCredentialRow = {
        rowNumber,
        teamId,
        registrationNumber,
        isValid: errors.length === 0,
        errors,
      };

      if (parsed.isValid) {
        validCredentials.push(parsed);
      } else {
        invalidCredentials.push(parsed);
      }
    });

    return {
      totalRows: rows.length,
      validCount: validCredentials.length,
      invalidCount: invalidCredentials.length,
      duplicateCount: duplicateIds.length,
      validCredentials,
      invalidCredentials,
      duplicateIds,
    };
  }

  /**
   * Normalize flexible column headers (e.g. "Team ID", "team_id", "Username")
   */
  private static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private static isTeamIdKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      k.includes('lead') ||
      k.includes('member') ||
      k.includes('mail') ||
      k.includes('phone') ||
      k.includes('reg') ||
      k.includes('roll') ||
      k === 'slno' ||
      k === 'sno' ||
      k === 'srno' ||
      k === 'serialno' ||
      k === 'serialnumber' ||
      k === 'row' ||
      k === 'index'
    ) {
      return false;
    }
    return (
      k === 'teamid' ||
      k === 'id' ||
      k === 'teamcode' ||
      k === 'teamno' ||
      k === 'teamnumber' ||
      k === 'username' ||
      k === 'userid' ||
      k === 'user' ||
      k === 'loginid' ||
      k === 'teamidentifier' ||
      k === 'team'
    );
  }

  private static isTeamNameKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      k.includes('lead') ||
      k.includes('id') ||
      k.includes('reg') ||
      k.includes('roll') ||
      k.includes('member') ||
      k.includes('mail') ||
      k.includes('phone') ||
      k.includes('student') ||
      k.includes('candidate') ||
      k.includes('participant')
    ) {
      return false;
    }
    return (
      k === 'teamname' ||
      k === 'team' ||
      k === 'groupname' ||
      k === 'projectteam' ||
      k === 'projectname' ||
      k === 'projecttitle' ||
      k === 'nameofteam' ||
      k === 'teamtitle'
    );
  }

  private static isPasswordKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      k === 'password' ||
      k === 'pass' ||
      k === 'pwd' ||
      k === 'teampassword' ||
      k === 'teampass' ||
      k === 'teamkey' ||
      k === 'credential' ||
      k === 'secret' ||
      k === 'loginpassword'
    );
  }

  private static isTeamLeadKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k.includes('reg') || k.includes('roll') || k.includes('mail') || k.includes('phone') || k.includes('mobile')) {
      return false;
    }
    return (
      k === 'teamlead' ||
      k === 'teamleadname' ||
      k === 'teamleader' ||
      k === 'teamleadername' ||
      k === 'lead' ||
      k === 'leader' ||
      k === 'leadname' ||
      k === 'leadername' ||
      k === 'captain' ||
      k === 'captainname' ||
      k === 'nameoflead' ||
      k === 'nameofteamlead' ||
      k === 'nameofteamleader' ||
      k === 'studentlead' ||
      k === 'leadstudent' ||
      k === 'participantname' ||
      k === 'studentname' ||
      k === 'candidatename' ||
      k === 'nameofparticipant' ||
      k === 'nameofcandidate' ||
      k === 'leadperson' ||
      k === 'representative' ||
      k.includes('teamlead') ||
      k.includes('leadername') ||
      k.includes('leadname') ||
      k.includes('nameoflead')
    );
  }

  private static isRegKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      k.includes('registration') ||
      k.includes('regno') ||
      k.includes('regnumber') ||
      k.includes('regnum') ||
      k.includes('leadreg') ||
      k === 'reg' ||
      k.includes('rollno') ||
      k.includes('rollnum') ||
      k.includes('rollnumber') ||
      k.includes('hallticket') ||
      k === 'htno' ||
      k === 'usn' ||
      k === 'pin' ||
      k.includes('studentid') ||
      k.includes('studentno')
    );
  }

  private static isMembersKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      k.includes('email') ||
      k.includes('mail') ||
      k.includes('phone') ||
      k.includes('mobile') ||
      k.includes('contact') ||
      k.includes('reg') ||
      k.includes('roll') ||
      k.includes('type') ||
      k.includes('track') ||
      k.includes('dept') ||
      k.includes('gender') ||
      k.includes('year') ||
      k.includes('hostel') ||
      k.includes('utr') ||
      k.includes('amount') ||
      k.includes('fee') ||
      k.includes('status')
    ) {
      return false;
    }
    return (
      k.includes('member') ||
      k === 'teammembers' ||
      k === 'participants' ||
      k === 'roster' ||
      k === 'students' ||
      k.startsWith('member') ||
      k.startsWith('student') ||
      k.startsWith('participant')
    );
  }

  private static isEmailKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      k === 'email' ||
      k === 'emailid' ||
      k === 'mail' ||
      k === 'mailid' ||
      k.includes('email') ||
      k.includes('mail')
    );
  }

  private static isPhoneKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      k === 'phone' ||
      k === 'phonenumber' ||
      k.includes('contact') ||
      k.includes('mobile') ||
      k === 'mobilenumber' ||
      k === 'cell' ||
      k === 'whatsapp'
    );
  }

  private static isCollegeKey(key: string): boolean {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      k === 'college' ||
      k === 'collegename' ||
      k === 'university' ||
      k === 'institution' ||
      k === 'institutionname' ||
      k === 'institute' ||
      k === 'department' ||
      k === 'dept' ||
      k === 'school' ||
      k === 'branch'
    );
  }

  /**
   * Validate and map raw imported participant rows
   * Supports both single-row exports (with comma-separated or numbered member columns)
   * AND multi-row exports (consecutive rows belonging to the same team).
   */
  private static validateAndNormalizeParticipantRows(
    rows: Record<string, any>[],
    _options: ParseOptions
  ): ImportValidationSummary {
    const validTeams: ParsedTeamRow[] = [];
    const invalidTeams: ParsedTeamRow[] = [];
    const duplicateNames: string[] = [];

    const seenIdsInFile = new Set<string>();
    const seenNamesInFile = new Set<string>();

    // 1. Detect if data represents multi-row export or contains duplicate team keys across rows
    let hasMultiRows = false;
    const teamIdCounts = new Map<string, number>();

    for (const r of rows) {
      let tId = '';
      for (const [k, v] of Object.entries(r)) {
        const nk = this.normalizeKey(k);
        const val = String(v ?? '').trim();
        if (val && this.isTeamIdKey(nk)) {
          tId = val.toLowerCase();
          break;
        }
      }
      if (tId) {
        teamIdCounts.set(tId, (teamIdCounts.get(tId) || 0) + 1);
        if ((teamIdCounts.get(tId) || 0) > 1) {
          hasMultiRows = true;
        }
      }
    }

    const isGarbageMember = (m: string) => {
      const lm = m.toLowerCase().trim();
      return (
        !lm ||
        /^\d+$/.test(lm) ||
        lm === 'team lead' ||
        lm === 'team lead name' ||
        lm === 'lead' ||
        lm === 'leader' ||
        lm === 'members' ||
        lm === 'member' ||
        lm === 'participant institution' ||
        lm === 'institution' ||
        lm === 'college' ||
        lm === 'university' ||
        lm === 'participant' ||
        lm === 'participants' ||
        lm === 'student' ||
        lm === 'students'
      );
    };

    const sampleKeys = rows.length > 0 ? Object.keys(rows[0]).map((k) => this.normalizeKey(k)) : [];
    const hasMultiRowHeaders = sampleKeys.some(
      (k) =>
        k === 'membertype' ||
        k === 'membername' ||
        k === 'studentname' ||
        k === 'participantname' ||
        k === 'candidatename' ||
        k === 'role' ||
        k.includes('memberreg') ||
        k.includes('studentreg') ||
        k.includes('memberemail')
    );

    const hasEmptyTeamIdWithMembers = rows.some((r) => {
      let hasId = false;
      let hasMember = false;
      for (const [k, v] of Object.entries(r)) {
        const nk = this.normalizeKey(k);
        const val = String(v ?? '').trim();
        if (!val) continue;
        if (this.isTeamIdKey(nk) || this.isTeamNameKey(nk)) hasId = true;
        if (
          nk === 'studentname' ||
          nk === 'membername' ||
          nk === 'name' ||
          nk === 'participantname' ||
          this.isRegKey(nk)
        ) {
          hasMember = true;
        }
      }
      return !hasId && hasMember;
    });

    const shouldGroupMultiRow = hasMultiRows || hasMultiRowHeaders || hasEmptyTeamIdWithMembers;

    let processedRows: Record<string, any>[] = [];

    if (shouldGroupMultiRow) {
      // Intelligently group consecutive rows into unified team blocks
      const teamGroups: {
        teamId: string;
        teamName: string;
        leadName: string;
        leadReg: string;
        password: string;
        email: string;
        phone: string;
        college: string;
        members: string[];
      }[] = [];

      let currentGroup: (typeof teamGroups)[0] | null = null;
      let lastKnownTeamId = '';
      let lastKnownTeamName = '';

      rows.forEach((r, idx) => {
        let tId = '';
        let tName = '';
        let mType = '';
        let mName = '';
        let mReg = '';
        let mPass = '';
        let mEmail = '';
        let mPhone = '';
        let college = '';

        for (const [k, v] of Object.entries(r)) {
          const nk = this.normalizeKey(k);
          let val = String(v ?? '').trim();
          if (!val) continue;

          if (val.endsWith('.0') && /^\d+\.0$/.test(val)) val = val.slice(0, -2);

          if (this.isTeamIdKey(nk)) tId = val;
          else if (this.isTeamNameKey(nk)) tName = val;
          else if (nk === 'membertype' || nk === 'role') mType = val.toLowerCase();
          else if (nk === 'membername' || nk === 'studentname' || nk === 'participantname' || (nk === 'name' && !tName)) mName = val;
          else if (this.isRegKey(nk)) mReg = val;
          else if (this.isPasswordKey(nk)) mPass = val;
          else if (this.isEmailKey(nk)) mEmail = val;
          else if (this.isPhoneKey(nk)) mPhone = val;
          else if (this.isCollegeKey(nk)) college = val;
        }

        // Suppress title headers
        if (
          tId.toLowerCase() === 'team id' ||
          tId.toLowerCase() === 'teamid' ||
          (mName.toLowerCase() === 'member name' && tName.toLowerCase() === 'team name')
        ) {
          return;
        }

        // Handle merged cell / carry-forward
        if (!tId && !tName && (mName || mReg) && currentGroup) {
          tId = lastKnownTeamId;
          tName = lastKnownTeamName;
        } else if (tId) {
          lastKnownTeamId = tId;
          lastKnownTeamName = tName || lastKnownTeamName;
        }

        const normId = tId ? tId.toLowerCase() : '';
        const normName = tName ? tName.toLowerCase() : '';

        const existingGroup = teamGroups.find(
          (g) =>
            (normId && g.teamId.toLowerCase() === normId) ||
            (normName && g.teamName && g.teamName.toLowerCase() === normName)
        );

        if (existingGroup) {
          currentGroup = existingGroup;
        } else if (tId || tName || mName) {
          currentGroup = {
            teamId: tId || (tName ? `TM-${String(teamGroups.length + 1).padStart(3, '0')}` : `TM-${String(idx + 1).padStart(3, '0')}`),
            teamName: tName || (tId ? `Team ${tId}` : `Team ${teamGroups.length + 1}`),
            leadName: '',
            leadReg: '',
            password: '',
            email: '',
            phone: '',
            college: '',
            members: [],
          };
          teamGroups.push(currentGroup);
        }

        if (!currentGroup) return;

        if (tName && (!currentGroup.teamName || currentGroup.teamName.startsWith('Team TM-'))) {
          currentGroup.teamName = tName;
        }
        if (tId && (!currentGroup.teamId || currentGroup.teamId.startsWith('TM-'))) {
          currentGroup.teamId = tId;
        }

        const isLead =
          mType.includes('lead') ||
          mType.includes('captain') ||
          mType.includes('leader') ||
          (!currentGroup.leadName && currentGroup.members.length === 0);

        if (isLead) {
          if (!currentGroup.leadName && mName) currentGroup.leadName = mName;
          if (!currentGroup.leadReg && mReg) currentGroup.leadReg = mReg;
          if (!currentGroup.password && (mPass || mReg)) currentGroup.password = mPass || mReg;
          if (!currentGroup.email && mEmail) currentGroup.email = mEmail;
          if (!currentGroup.phone && mPhone) currentGroup.phone = mPhone;
          if (!currentGroup.college && college) currentGroup.college = college;
        }

        if (mName && !currentGroup.members.some((m) => m.toLowerCase() === mName.toLowerCase())) {
          currentGroup.members.push(mName);
        }
      });

      processedRows = teamGroups.map((g) => {
        const lead = g.leadName || g.members[0] || '';
        const cleanMems = g.members.filter((m) => !isGarbageMember(m));
        if (lead && !cleanMems.some((m) => m.toLowerCase() === lead.toLowerCase())) {
          cleanMems.unshift(lead);
        }

        return {
          'Team ID': g.teamId,
          'Team Name': g.teamName,
          'Team Lead': lead,
          'Registration No.': g.leadReg,
          'Password': g.password || g.leadReg,
          'Members': cleanMems.join(', '),
          'Email': g.email,
          'Phone': g.phone,
          'College': g.college,
        };
      });
    } else {
      processedRows = rows;
    }

    processedRows.forEach((row, idx) => {
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

      // Collect potential member columns
      const memberColMap = new Map<number, string>();

      for (const [rawKey, rawVal] of Object.entries(row)) {
        const key = this.normalizeKey(rawKey);
        let val = String(rawVal ?? '').trim();
        if (!val) continue;

        if (val.endsWith('.0') && /^\d+\.0$/.test(val)) {
          val = val.slice(0, -2);
        }

        if (this.isTeamIdKey(key)) {
          teamId = val;
        } else if (this.isTeamNameKey(key)) {
          teamName = val;
        } else if (this.isPasswordKey(key)) {
          password = val;
        } else if (this.isTeamLeadKey(key)) {
          teamLeadName = val;
        } else if (this.isRegKey(key)) {
          // If key is member-specific (e.g. member2regno), don't overwrite lead reg
          if (!key.startsWith('member') && !key.startsWith('student') && !key.startsWith('participant')) {
            teamLeadReg = val;
          } else if (!teamLeadReg) {
            teamLeadReg = val;
          }
        } else if (this.isEmailKey(key)) {
          if (!key.startsWith('member') && !email) {
            email = val;
          } else if (!email) {
            email = val;
          }
        } else if (this.isPhoneKey(key)) {
          if (!phone) phone = val;
        } else if (this.isCollegeKey(key)) {
          if (!college) college = val;
        } else if (this.isMembersKey(key)) {
          // Check if key has a specific number like member1, member2
          const numMatch = key.match(/\d+/);
          if (numMatch) {
            memberColMap.set(parseInt(numMatch[0], 10), val);
          } else {
            const splitMembers = val.split(/[,;\n|/]/).map((m) => m.trim()).filter(Boolean);
            members.push(...splitMembers);
          }
        }
      }

      // Add ordered member columns
      if (memberColMap.size > 0) {
        const sortedNums = Array.from(memberColMap.keys()).sort((a, b) => a - b);
        for (const num of sortedNums) {
          const mVal = memberColMap.get(num)!;
          if (mVal && !members.includes(mVal)) {
            members.push(mVal);
          }
        }
      }

      // Filter out duplicate header / title rows if present in data
      const cleanLowerId = teamId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isHeaderTitleRow =
        cleanLowerId === 'teamid' ||
        cleanLowerId === 'id' ||
        (teamLeadName.toLowerCase() === 'team lead' && teamName.toLowerCase().includes('team name'));
      if (isHeaderTitleRow) {
        return;
      }

      // Skip completely empty row in Excel
      if (!teamId && !teamName && !teamLeadName && members.length === 0 && !teamLeadReg && !password) {
        return;
      }

      // If teamId is missing, auto-fallback to teamName or generated ID
      if (!teamId && teamName) {
        teamId = `TM-${new Date().getFullYear()}-${String(rowNumber).padStart(3, '0')}`;
      } else if (!teamName && teamId) {
        teamName = `Team ${teamId}`;
      } else if (teamName.toLowerCase() === 'team name' || teamName.toLowerCase() === 'teamname') {
        teamName = `Team ${teamId}`;
      }

      // Credential resolution:
      password = (
        password ||
        teamLeadReg ||
        teamId ||
        (teamName ? `${teamName.replace(/[^a-zA-Z0-9]/g, '')}@123` : `TeamPass@${rowNumber}`)
      ).trim();

      teamLeadReg = (teamLeadReg || password || teamId).trim();

      // Clean up teamLeadName if it's the title itself
      if (
        teamLeadName.toLowerCase() === 'team lead' ||
        teamLeadName.toLowerCase() === 'team lead name' ||
        teamLeadName.toLowerCase() === 'lead' ||
        teamLeadName.toLowerCase() === 'leader'
      ) {
        teamLeadName = '';
      }

      // If teamLeadName is empty, check if members has real names
      if (!teamLeadName) {
        const realMember = members.find((m) => !isGarbageMember(m));
        if (realMember) {
          teamLeadName = realMember;
        } else {
          teamLeadName =
            teamName && !teamName.toLowerCase().startsWith('team tm-') && !teamName.toLowerCase().startsWith('team alpha-')
              ? `${teamName} Lead`
              : `Lead ${teamId}`;
        }
      }

      // Clean up members array: filter out placeholder titles or pure digit member counts
      const cleanMembers = members.filter((m) => !isGarbageMember(m));
      if (cleanMembers.length === 0 && teamLeadName) {
        cleanMembers.push(teamLeadName);
      } else if (teamLeadName && !cleanMembers.some((m) => m.toLowerCase() === teamLeadName.toLowerCase())) {
        cleanMembers.unshift(teamLeadName);
      }

      // Check duplicates within the uploaded file
      const normalizedId = teamId.toLowerCase();
      const normalizedName = teamName.toLowerCase();

      if (teamId) {
        if (seenIdsInFile.has(normalizedId)) {
          errors.push(`Row ${rowNumber}: Duplicate Team ID "${teamId}" in uploaded file`);
          duplicateNames.push(teamId);
        } else {
          seenIdsInFile.add(normalizedId);
        }
      }

      if (teamName) {
        if (seenNamesInFile.has(normalizedName)) {
          errors.push(`Row ${rowNumber}: Duplicate Team Name "${teamName}" in uploaded file`);
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
        members: cleanMembers,
        email: email || `${teamId.toLowerCase().replace(/[^a-z0-9]/g, '')}@hackathon.local`,
        phone: phone || '+91 90000 00000',
        college: college && college.toLowerCase() !== 'participant institution' ? college : 'Participant Institution',
        isValid: errors.length === 0,
        errors,
      };

      if (parsedRow.isValid) {
        validTeams.push(parsedRow);
      } else {
        invalidTeams.push(parsedRow);
      }
    });

    // Natural sort validTeams by teamId so order is crisp and predictable
    validTeams.sort((a, b) =>
      a.teamId.localeCompare(b.teamId, undefined, { numeric: true, sensitivity: 'base' })
    );

    return {
      totalRows: processedRows.length,
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

    // Natural sort problems by problemId
    validProblems.sort((a, b) =>
      a.problemId.localeCompare(b.problemId, undefined, { numeric: true, sensitivity: 'base' })
    );

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
   * Universal, resilient PDF text extractor
   * Uses pdfjs-dist with multi-tier worker fallback and visual line-coordinate awareness.
   * Preserves exact line breaks (\n) and paragraph gaps (\n\n) so multi-problem pages parse flawlessly!
   */
  public static async extractTextFromPDFBuffer(buffer: ArrayBuffer): Promise<string> {
    let fullText = '';

    // Tier 1: Try PDF.js with local / CDN worker
    try {
      const pdfjs = await import('pdfjs-dist');
      if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;
      } else {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
      });
      const pdf = await loadingTask.promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines: string[] = [];
        let currentLine = '';
        let lastY: number | null = null;

        for (const item of textContent.items as any[]) {
          const y = item.transform ? Math.round(item.transform[5]) : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
            if (currentLine.trim()) lines.push(currentLine.trim());
            currentLine = item.str || '';
          } else {
            currentLine += (currentLine ? ' ' : '') + (item.str || '');
          }
          lastY = y;
        }
        if (currentLine.trim()) lines.push(currentLine.trim());
        if (lines.length > 0) pages.push(lines.join('\n'));
      }
      fullText = pages.join('\n\n');
    } catch (tier1Err: any) {
      console.warn('[FileParserService] Tier 1 PDF.js worker failed, trying Tier 2 CDN worker:', tier1Err);
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
          isEvalSupported: false,
        });
        const pdf = await loadingTask.promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const lines: string[] = [];
          let currentLine = '';
          let lastY: number | null = null;
          for (const item of textContent.items as any[]) {
            const y = item.transform ? Math.round(item.transform[5]) : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
              if (currentLine.trim()) lines.push(currentLine.trim());
              currentLine = item.str || '';
            } else {
              currentLine += (currentLine ? ' ' : '') + (item.str || '');
            }
            lastY = y;
          }
          if (currentLine.trim()) lines.push(currentLine.trim());
          if (lines.length > 0) pages.push(lines.join('\n'));
        }
        fullText = pages.join('\n\n');
      } catch (tier2Err: any) {
        console.warn('[FileParserService] Tier 2 CDN failed, activating Tier 3 raw PDF stream decoder:', tier2Err);
      }
    }

    // Tier 3: Direct Raw PDF Binary String & Stream Extraction Fallback
    if (!fullText || fullText.trim().length < 15) {
      try {
        const bytes = new Uint8Array(buffer);
        const latin1 = new TextDecoder('latin1').decode(bytes);

        const extractedChunks: string[] = [];
        const stringLiteralRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")/g;
        let match: RegExpExecArray | null;
        while ((match = stringLiteralRegex.exec(latin1)) !== null) {
          const raw = match[1];
          const unescaped = raw
            .replace(/\\([()\\])/g, '$1')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
          if (unescaped.trim()) extractedChunks.push(unescaped.trim());
        }

        const arrayRegex = /\[((?:[^[\]]|\([^[\]]*\))*)\]\s*TJ/g;
        while ((match = arrayRegex.exec(latin1)) !== null) {
          const inner = match[1];
          const innerMatches = inner.matchAll(/\(((?:[^()\\]|\\.)*)\)/g);
          const segment: string[] = [];
          for (const im of innerMatches) {
            segment.push(im[1].replace(/\\([()\\])/g, '$1'));
          }
          if (segment.length > 0) {
            extractedChunks.push(segment.join(' '));
          }
        }

        if (extractedChunks.length > 0) {
          fullText = extractedChunks.join('\n');
        }
      } catch (rawErr) {
        console.error('[FileParserService] Raw stream extraction failed:', rawErr);
      }
    }

    return fullText;
  }

  /**
   * PDF text extractor for problem statements
   * Recognizes all structured problem statement blocks:
   * e.g. "PS-01 — Title", "WEB-PS-001 Title", "Problem 1: Title", "Challenge 1 - Title", "1. Title", etc.
   */
  private static async extractProblemRowsFromPDF(
    buffer: ArrayBuffer
  ): Promise<Record<string, any>[]> {
    const fullText = await this.extractTextFromPDFBuffer(buffer);

    if (!fullText || fullText.trim().length < 5) {
      throw new Error(
        'The uploaded PDF document contains no readable text. If this is a scanned document, please convert it to Excel (.xlsx, .xls) or CSV before uploading.'
      );
    }

    const rows: Record<string, any>[] = [];
    const normalizedText = fullText.replace(/\r\n/g, '\n');

    // Split on headers such as "PS-01", "WEB-PS-001", "Problem 1", "Challenge 1", "Track 1", "1. Title"
    const headerRegex = /(?:^|\n)\s*([A-Za-z0-9_-]*\b(?:PS|PRB|PROB|PROBLEM(?:\s*STATEMENT)?|CHALLENGE|TRACK|WEB[-_]PS|APP[-_]PS)[-_#.:\s]*\d+|\b\d{1,3}\s*[\.\)]\s*(?=[A-Z]))\s*[-—–:.]*\s*/gim;

    const matches: { rawId: string; index: number; fullMatch: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = headerRegex.exec(normalizedText)) !== null) {
      matches.push({
        rawId: m[1],
        index: m.index,
        fullMatch: m[0],
      });
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        const next = matches[i + 1];
        const chunk = normalizedText.slice(cur.index, next ? next.index : undefined).trim();

        // 1. Clean ID
        let cleanId = cur.rawId.trim().toUpperCase().replace(/[\.\)]$/, '');
        const numMatch = cleanId.match(/(\d+)/);
        const digits = numMatch ? numMatch[1] : String(i + 1);

        if (!cleanId.startsWith('WEB-') && !cleanId.startsWith('APP-') && !cleanId.startsWith('PRB-')) {
          cleanId = 'PS-' + digits.padStart(2, '0');
        }

        // 2. Separate Header Line and Remaining Body
        const firstLineBreak = chunk.indexOf('\n');
        const headerLine = firstLineBreak >= 0 ? chunk.slice(0, firstLineBreak) : chunk;
        const rest = firstLineBreak >= 0 ? chunk.slice(firstLineBreak + 1).trim() : '';

        // Extract Title
        let title = headerLine.replace(/^[A-Za-z0-9_#.:\s-]+[-—–:.]\s*/, '').trim();
        const restLines = rest.split('\n').map((l) => l.trim()).filter(Boolean);

        // If title is missing or short, check if subsequent line(s) form the full title
        if (!title || title.toUpperCase() === cleanId || title.length < 4) {
          if (
            restLines.length > 0 &&
            !restLines[0].toLowerCase().startsWith('category') &&
            !restLines[0].toLowerCase().startsWith('difficulty') &&
            !restLines[0].toLowerCase().startsWith('problem description') &&
            !restLines[0].toLowerCase().startsWith('description') &&
            !restLines[0].toLowerCase().startsWith('domain')
          ) {
            title = restLines[0];
          } else {
            title = `Problem ${cleanId}`;
          }
        } else if (
          restLines.length > 0 &&
          !restLines[0].toLowerCase().startsWith('category') &&
          !restLines[0].toLowerCase().startsWith('difficulty') &&
          !restLines[0].toLowerCase().startsWith('problem description') &&
          !restLines[0].toLowerCase().startsWith('description') &&
          !restLines[0].toLowerCase().startsWith('domain') &&
          restLines[0].length < 60 &&
          !restLines[0].endsWith('.')
        ) {
          // Wrapped title line in table cell (e.g. "CAREERGRAPH — AI-Powered" + "Skill-Gap & Career Intelligence")
          title = `${title} ${restLines[0]}`.trim();
        }

        // Clean up title noise
        title = title
          .replace(/^[-—–:]\s*/, '')
          .replace(/[-—–:]\s*$/, '')
          .replace(/\s+/g, ' ')
          .trim();

        // 3. Category
        const catMatch = chunk.match(/(?:Category|Domain|Track|Theme|Field)[:\s]+(.*?)(?=\s*Difficulty:|\s*Level:|\s*Problem Description|\s*Description:|\s*Expected|\s*Evaluation:|\n|$)/is);
        let category = catMatch ? catMatch[1].trim() : 'General Innovation';
        if (category.toLowerCase().includes('difficulty:')) {
          category = category.split(/difficulty:/i)[0].trim();
        }
        category = category.replace(/[-—–:]\s*$/, '').trim() || 'General Innovation';

        // 4. Difficulty
        const diffMatch = chunk.match(/(?:Difficulty|Level|Complexity)[:\s]+(.*?)(?=\s*Category:|\s*Problem Description|\s*Description:|\s*Suggested|\s*Evaluation:|\n|$)/is);
        let difficulty: ProblemDifficulty = 'Intermediate';
        if (diffMatch) {
          const d = diffMatch[1].trim().toLowerCase();
          if (d.includes('begin') || d.includes('easy')) difficulty = 'Beginner';
          else if (d.includes('adv') || d.includes('hard')) difficulty = 'Advanced';
          else difficulty = 'Intermediate';
        }

        // 5. Description
        const descMatch = chunk.match(/(?:Problem Description|Description|Overview|Details|Problem Summary|Scope)[:\s]*([\s\S]*?)(?=(?:Suggested Evaluation|Evaluation Criteria|Evaluation|Deliverables|Expected Deliverables|Expected Solution|Constraints|Tech Stack|Technologies|Notes|$))/i);
        let desc = descMatch ? descMatch[1].trim() : '';
        if (!desc) {
          desc = rest
            .replace(title, '')
            .replace(/(?:Category|Domain|Track|Difficulty|Level)[:\s]+[^\n]+/gi, '')
            .replace(/^(?:Problem Description|Description|Overview|Details)[:\s]*/gim, '')
            .replace(/Hackathon Problem Statement Testing Dataset\s+Page\s+\d+/gi, '')
            .replace(/Problem Statements – Master List/gi, '')
            .replace(/Total Problems:\s*\d+/gi, '')
            .replace(/Problem ID\s+Title\s+Description\s+Category.*/gi, '')
            .trim();
        }

        // Clean noise from desc
        desc = desc
          .replace(/Hackathon Problem Statement Testing Dataset\s+Page\s+\d+/gi, '')
          .replace(/Problem Statements – Master List/gi, '')
          .replace(/Total Problems:\s*\d+/gi, '')
          .replace(/Problem ID\s+Title\s+Description\s+Category.*/gi, '')
          .trim();

        // 6. Expected Solution
        const solMatch = chunk.match(/(?:Expected Solution|Deliverables|Expected Deliverables|Expected Outcome|Outcomes|Output)[:\s]+([\s\S]*?)(?=(?:Suggested Evaluation|Evaluation Criteria|Evaluation|Constraints|Tech Stack|Technologies|Notes|$))/i);
        const expectedSolution = solMatch ? solMatch[1].trim() : '';

        // 7. Evaluation Criteria
        const evalMatch = chunk.match(/(?:Suggested Evaluation Focus|Evaluation Criteria|Evaluation Focus|Evaluation|Rubric|Criteria)[:\s]+([\s\S]*?)(?=(?:Constraints|Tech Stack|Technologies|Notes|$))/i);
        const evaluationCriteria = evalMatch ? evalMatch[1].trim() : '';

        // 8. Tech Stack
        const techMatch = chunk.match(/(?:Technologies|Tech Stack|Tools|Key Technologies|Skills)[:\s]+([^\n]+)/i);
        const technologies = techMatch ? techMatch[1].split(/[,;\n]/).map((t) => t.trim()).filter(Boolean) : [];

        // 9. Constraints
        const constMatch = chunk.match(/(?:Constraints|Rules|Restrictions|Limitations)[:\s]+([^\n]+)/i);
        const constraints = constMatch ? constMatch[1].trim() : '';

        if (title && (desc || title.length > 5)) {
          rows.push({
            'Problem ID': cleanId,
            Title: title,
            Category: category,
            Difficulty: difficulty,
            Description: desc || title,
            'Expected Solution': expectedSolution,
            'Evaluation Criteria': evaluationCriteria,
            Technologies: technologies.join(', '),
            Constraints: constraints,
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
        const title = firstLine.slice(0, 120);
        const desc = lines.slice(1).join('\n') || para;
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
    const fullText = await this.extractTextFromPDFBuffer(buffer);

    if (!fullText || fullText.trim().length < 5) {
      throw new Error(
        'Failed to extract participant text from PDF. Please make sure the PDF contains selectable text or upload roster as Excel (.xlsx, .xls) or CSV.'
      );
    }

    const candidateRows: Record<string, any>[] = [];
    const lines = fullText.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l.length > 3);

    for (const line of lines) {
      if (line.includes(',') || line.includes('\t') || line.includes('|')) {
        const parts = line.split(/[,|\t]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 4) {
          candidateRows.push({
            'Team ID': parts[0],
            'Team Name': parts[1],
            'Team Lead Name': parts[2],
            'Registration No.': parts[3],
            Password: parts[3],
            'Members': parts.slice(4).join(', ') || parts[2],
          });
        } else if (parts.length === 3) {
          candidateRows.push({
            'Team ID': parts[0],
            'Team Name': parts[1],
            'Registration No.': parts[2],
            Password: parts[2],
            'Team Lead Name': parts[1],
          });
        } else if (parts.length === 2) {
          candidateRows.push({
            'Team ID': parts[0],
            'Team Name': parts[0],
            'Registration No.': parts[1],
            Password: parts[1],
          });
        }
      } else {
        const spaceMatch = line.match(/^([a-zA-Z0-9_-]+)\s+(.*?)\s+(\d{6,15})\s*(.*)$/);
        if (spaceMatch) {
          candidateRows.push({
            'Team ID': spaceMatch[1],
            'Team Name': spaceMatch[2].trim(),
            'Registration No.': spaceMatch[3].trim(),
            Password: spaceMatch[3].trim(),
            'Members': spaceMatch[4].trim() || spaceMatch[2].trim(),
          });
        }
      }
    }

    return candidateRows;
  }
}


