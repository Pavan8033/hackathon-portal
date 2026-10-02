const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');

const excelPath = 'C:/Users/dpava/Downloads/ALPHA_Teams_Formatted.xlsx';
const wb = xlsx.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

// Sort by Team ID ascending (ALPHA-001 to ALPHA-060)
rows.sort((a, b) => {
  const getNum = (id) => {
    const m = String(id || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  };
  return getNum(a['Team ID']) - getNum(b['Team ID']);
});

const teams = rows.map((r) => {
  const teamId = String(r['Team ID'] || '').trim();
  const teamName = String(r['Team Name'] || '').trim();
  const teamLead = String(r['Team Lead'] || '').trim();
  let reg = String(r['Registration No.'] || '').trim();
  if (reg.endsWith('.0') && /^\d+\.0$/.test(reg)) reg = reg.slice(0, -2);
  const rawMembers = String(r['Members'] || '').trim();
  const otherMembers = rawMembers.split(/[,;\n]/).map(m => m.trim()).filter(Boolean);
  
  const allMembers = [];
  if (teamLead) allMembers.push(teamLead);
  for (const m of otherMembers) {
    if (m && !allMembers.some(x => x.toLowerCase() === m.toLowerCase())) {
      allMembers.push(m);
    }
  }

  const salt = 'hackathon_portal_sec_salt_v2';
  const credentialHash = crypto.createHash('sha256').update(salt + ':' + (reg || teamId).toLowerCase()).digest('hex');

  return {
    teamId,
    teamName,
    teamLeadName: teamLead,
    teamLeadRegistrationNumber: reg,
    credentialHash,
    teamMembers: allMembers,
    college: '',
    email: '',
    phone: '',
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  };
});

const tsContent = [
  "import type { TeamRecord } from '../types';",
  "",
  "/**",
  " * Official Hackathon Participant Roster (60 Teams)",
  " * Extracted from ALPHA_Teams_Formatted.xlsx",
  " * Contains full team names, team leads, registration numbers (passwords), and all enrolled members.",
  " */",
  `export const ALPHA_TEAMS_ROSTER: TeamRecord[] = ${JSON.stringify(teams, null, 2)};`,
  ""
].join('\n');

const targetPath = path.join(__dirname, '../src/data/alphaTeamsRoster.ts');
fs.writeFileSync(targetPath, tsContent, 'utf-8');
console.log(`Successfully generated ${teams.length} teams in src/data/alphaTeamsRoster.ts`);
