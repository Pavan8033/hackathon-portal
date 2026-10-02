const XLSX = require('xlsx');
const crypto = require('crypto');

// Let's implement the exact logic from FileParserService
function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function isTeamIdKey(key) {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
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
    k === 'slno' ||
    k === 'sno'
  );
}

function isTeamNameKey(key) {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (k.includes('lead') || k.includes('id') || k.includes('reg') || k.includes('roll') || k.includes('member') || k.includes('mail') || k.includes('phone')) {
    return false;
  }
  return (
    k === 'teamname' ||
    k === 'team' ||
    k === 'name' ||
    k === 'groupname' ||
    k === 'projectteam' ||
    k === 'projectname' ||
    k === 'projecttitle' ||
    k === 'nameofteam' ||
    k === 'teamtitle'
  );
}

function isPasswordKey(key) {
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

function isTeamLeadKey(key) {
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
    k.includes('teamlead') ||
    k.includes('leadername') ||
    k.includes('leadname') ||
    k.includes('nameoflead')
  );
}

function isRegKey(key) {
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

function isMembersKey(key) {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (
    k.includes('email') ||
    k.includes('mail') ||
    k.includes('phone') ||
    k.includes('mobile') ||
    k.includes('contact') ||
    k.includes('reg') ||
    k.includes('roll') ||
    k.includes('lead') ||
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
    k.startsWith('student')
  );
}

const wb = XLSX.readFile('C:/Users/dpava/Downloads/ALPHA_Teams_Formatted.xlsx');
const ws = wb.Sheets['Teams'];
const rows = XLSX.utils.sheet_to_json(ws);

const parsedTeams = [];
rows.forEach((row, idx) => {
  let teamId = '';
  let teamName = '';
  let password = '';
  let teamLeadName = '';
  let teamLeadReg = '';
  const members = [];

  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = normalizeKey(rawKey);
    let val = String(rawVal ?? '').trim();
    if (!val) continue;

    if (isTeamIdKey(key)) teamId = val;
    else if (isTeamNameKey(key)) teamName = val;
    else if (isPasswordKey(key)) password = val;
    else if (isTeamLeadKey(key)) teamLeadName = val;
    else if (isRegKey(key)) teamLeadReg = val;
    else if (isMembersKey(key)) {
      const split = val.split(/[,;\n]/).map(m => m.trim()).filter(Boolean);
      members.push(...split);
    }
  }

  // Clean members and lead
  if (teamLeadName && !members.some(m => m.toLowerCase() === teamLeadName.toLowerCase())) {
    members.unshift(teamLeadName);
  }

  parsedTeams.push({
    teamId,
    teamName,
    teamLeadName,
    teamLeadRegistrationNumber: teamLeadReg,
    members
  });
});

console.log('Parsed count:', parsedTeams.length);
const alpha4 = parsedTeams.find(t => t.teamId === 'ALPHA-004');
console.log('Parsed ALPHA-004:', alpha4);
