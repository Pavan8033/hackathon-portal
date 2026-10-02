const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs } = require('firebase/firestore');
const path = require('path');
const fs = require('fs');

const firebaseConfig = {
  apiKey: 'AIzaSyCMNaRkSmiS9f6kmMWlQ5051ukrLyeCFtc',
  authDomain: 'problem-statement-releas-219d6.firebaseapp.com',
  projectId: 'problem-statement-releas-219d6',
  storageBucket: 'problem-statement-releas-219d6.firebasestorage.app',
  messagingSenderId: '568366788099',
  appId: '1:568366788099:web:532e823b23d5cd7f186836'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Read generated roster
const rosterFile = path.join(__dirname, '../src/data/alphaTeamsRoster.ts');
const content = fs.readFileSync(rosterFile, 'utf-8');
const jsonMatch = content.match(/export const ALPHA_TEAMS_ROSTER: TeamRecord\[\] = (\[[\s\S]*?\]);/);
if (!jsonMatch) {
  console.error('Could not parse roster json');
  process.exit(1);
}
const roster = JSON.parse(jsonMatch[1]);
console.log(`Loaded ${roster.length} teams from roster`);

async function seed() {
  // 1. Fetch existing teams to preserve selections
  const existingTeamsMap = new Map();
  try {
    const snap = await getDocs(collection(db, 'teams'));
    snap.forEach(d => {
      existingTeamsMap.set(d.id.toLowerCase().replace(/[^a-z0-9]/g, ''), d.data());
    });
    console.log(`Found ${existingTeamsMap.size} existing teams in Firestore`);
  } catch (e) {
    console.warn('Could not read existing teams, proceeding with clean seed:', e.message);
  }

  // 2. Fetch existing teamSelections
  const selectionMap = new Map();
  try {
    const selSnap = await getDocs(collection(db, 'teamSelections'));
    selSnap.forEach(d => {
      selectionMap.set(d.id.toLowerCase().replace(/[^a-z0-9]/g, ''), d.data());
    });
    console.log(`Found ${selectionMap.size} existing teamSelections in Firestore`);
  } catch (e) {
    console.warn('Could not read existing selections:', e.message);
  }

  let seededCount = 0;
  for (const team of roster) {
    const cleanId = team.teamId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const prev = existingTeamsMap.get(cleanId) || {};
    const sel = selectionMap.get(cleanId);

    const merged = {
      teamId: team.teamId,
      teamName: team.teamName,
      teamLeadName: team.teamLeadName,
      teamLeadRegistrationNumber: team.teamLeadRegistrationNumber,
      credentialHash: team.credentialHash,
      teamMembers: team.teamMembers,
      college: team.college || prev.college || '',
      email: team.email || prev.email || '',
      phone: team.phone || prev.phone || '',
      status: 'active',
      createdAt: prev.createdAt || team.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const chosenProblemId = sel?.problemId || prev.selectedProblemId;
    if (chosenProblemId) {
      merged.selectedProblemId = chosenProblemId;
    }
    const chosenProblemTitle = sel?.problemTitle || prev.selectedProblemTitle;
    if (chosenProblemTitle) {
      merged.selectedProblemTitle = chosenProblemTitle;
    }
    const chosenDate = sel?.selectedAt || prev.selectionDate;
    if (chosenDate) {
      merged.selectionDate = chosenDate;
    }

    // Save to both 'teams' and 'participants' collections
    await setDoc(doc(db, 'teams', team.teamId), merged);
    await setDoc(doc(db, 'participants', team.teamId), merged);
    seededCount++;
    if (seededCount % 10 === 0) {
      console.log(`Seeded ${seededCount}/${roster.length} teams...`);
    }
  }

  console.log(`Successfully seeded all ${seededCount} teams to Firestore collections ('teams' and 'participants')!`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
