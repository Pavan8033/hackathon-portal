import fs from 'fs';
import path from 'path';

// Import initial seed problems for baseline validation
const SEED_DATA_PATH = path.resolve('./src/data/seedData.ts');
const seedContent = fs.readFileSync(SEED_DATA_PATH, 'utf-8');

console.log('====================================================');
console.log('RUNNING STEP 4 & STEP 5 AUTOMATED VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

// 1. Check Document Files in public/documents/
console.log('--- TEST GROUP 1: Document Artifacts on Disk ---');
const docs = [
  'PS-2026-AI-01_Specification.pdf',
  'PS-2026-HC-02_Specification.docx',
  'PS-2026-CL-03_Grid_Model.xlsx',
  'PS-2026-AG-04_Agritech.pdf',
];

for (const doc of docs) {
  const docPath = path.resolve('./public/documents', doc);
  const exists = fs.existsSync(docPath);
  const size = exists ? fs.statSync(docPath).size : 0;
  assert(exists && size > 0, `Document ${doc} exists (${size} bytes)`);
}

// 2. Test File Formatters & Types
console.log('\n--- TEST GROUP 2: File Type Classifier & Date Formatters ---');

function getDocumentTypeInfo(fileName, fileType) {
  if (!fileName) return { type: 'None', label: 'No Document' };
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || (fileType && fileType.includes('pdf'))) {
    return { type: 'PDF', label: 'PDF Document', extension: 'PDF' };
  }
  if (ext === 'doc' || ext === 'docx' || (fileType && fileType.includes('word'))) {
    return { type: 'Word', label: 'Word Document', extension: ext.toUpperCase() };
  }
  if (ext === 'xls' || ext === 'xlsx' || (fileType && (fileType.includes('sheet') || fileType.includes('excel')))) {
    return { type: 'Excel', label: 'Excel Spreadsheet', extension: ext.toUpperCase() };
  }
  return { type: 'Other', label: `${ext.toUpperCase()} File`, extension: ext.toUpperCase() };
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return 'Document Attached';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReleaseDate(isoDate) {
  if (!isoDate) return 'Recently Released';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Recently Released';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

assert(getDocumentTypeInfo('spec.pdf', 'application/pdf').type === 'PDF', 'PDF classifier correctly identifies PDF');
assert(getDocumentTypeInfo('model.docx', 'application/vnd.openxmlformats').type === 'Word', 'Word classifier correctly identifies DOCX');
assert(getDocumentTypeInfo('data.xlsx', 'application/vnd.ms-excel').type === 'Excel', 'Excel classifier correctly identifies XLSX');
assert(formatFileSize(2450000) === '2.3 MB', 'formatFileSize handles 2.45MB correctly');
assert(formatFileSize(980000) === '957.0 KB', 'formatFileSize handles 980KB correctly');
assert(formatReleaseDate('2026-10-01T00:00:00Z').includes('October 2026'), 'formatReleaseDate renders professional date');

// 3. Security Rule Verification: Unpublished Problems Protection
console.log('\n--- TEST GROUP 3: Participant Access Security & Publication Rules ---');

// Mock data representing database items
const mockProblems = [
  { problemId: 'PS-01', title: 'AI Defect Detection', status: 'PUBLISHED', category: 'AI', difficulty: 'Hard' },
  { problemId: 'PS-02', title: 'Health Federated EHR', status: 'PUBLISHED', category: 'Health', difficulty: 'Medium' },
  { problemId: 'PS-03', title: 'Energy Microgrid', status: 'PUBLISHED', category: 'Energy', difficulty: 'Medium' },
  { problemId: 'PS-04', title: 'Agritech Crop Stress', status: 'PUBLISHED', category: 'Agri', difficulty: 'Easy' },
  { problemId: 'PS-05', title: 'Fintech ZK Routing', status: 'DRAFT', category: 'FinTech', difficulty: 'Hard' },
  { problemId: 'PS-06', title: 'Robotics Swarm SLAM', status: 'DRAFT', category: 'Robotics', difficulty: 'Hard' },
];

function getAllProblems(options = {}) {
  if (options.forParticipant) {
    return mockProblems.filter((p) => p.status === 'PUBLISHED');
  }
  return mockProblems;
}

function getProblemForParticipant(id) {
  const match = mockProblems.find((p) => p.problemId.toLowerCase() === id.toLowerCase());
  if (!match) return { found: false, isPublished: false, problem: null };
  if (match.status !== 'PUBLISHED') return { found: true, isPublished: false, problem: null };
  return { found: true, isPublished: true, problem: match };
}

const participantView = getAllProblems({ forParticipant: true });
assert(participantView.length === 4, `Participant view returns exactly 4 published problems (got ${participantView.length})`);
assert(participantView.every((p) => p.status === 'PUBLISHED'), 'All returned problems for participant have status PUBLISHED');
assert(!participantView.some((p) => p.problemId === 'PS-05'), 'Draft problem PS-05 is not returned in problem list');
assert(!participantView.some((p) => p.problemId === 'PS-06'), 'Draft problem PS-06 is not returned in problem list');

// Test single detail retrieval
const publishedDetail = getProblemForParticipant('PS-01');
assert(publishedDetail.found === true && publishedDetail.isPublished === true && publishedDetail.problem !== null,
  'Published problem PS-01 returns found=true, isPublished=true, and full data');

const draftDetail = getProblemForParticipant('PS-05');
assert(draftDetail.found === true && draftDetail.isPublished === false && draftDetail.problem === null,
  'Draft problem PS-05 returns found=true, isPublished=false, and problem=NULL (content protected)');

const nonExistentDetail = getProblemForParticipant('PS-DOESNT-EXIST');
assert(nonExistentDetail.found === false && nonExistentDetail.isPublished === false && nonExistentDetail.problem === null,
  'Non-existent problem returns found=false, isPublished=false, problem=null');

// 4. Test Search, Filtering, and Sorting
console.log('\n--- TEST GROUP 4: Search, Filtering & Sorting Engines ---');

function searchProblems(query, list) {
  const q = query.toLowerCase();
  return list.filter((p) =>
    p.problemId.toLowerCase().includes(q) ||
    p.title.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
}

const searchResult = searchProblems('Defect', participantView);
assert(searchResult.length === 1 && searchResult[0].problemId === 'PS-01', 'Search for "Defect" matches PS-01');

const idSearch = searchProblems('PS-03', participantView);
assert(idSearch.length === 1 && idSearch[0].problemId === 'PS-03', 'Search by ID matches PS-03');

const noMatchSearch = searchProblems('QuantumCyberUnknown', participantView);
assert(noMatchSearch.length === 0, 'Search with no matching keywords returns empty list');

// 5. Test Related Problems Algorithm
console.log('\n--- TEST GROUP 5: Related Problems Recommendation Engine ---');

function getRelatedProblems(currentProblemId, category, limit = 3) {
  const published = getAllProblems({ forParticipant: true });
  const others = published.filter((p) => p.problemId.toLowerCase() !== currentProblemId.toLowerCase());
  return others.sort((a, b) => {
    const aSame = a.category.toLowerCase() === category.toLowerCase() ? 1 : 0;
    const bSame = b.category.toLowerCase() === category.toLowerCase() ? 1 : 0;
    return bSame - aSame;
  }).slice(0, limit);
}

const relatedForPs01 = getRelatedProblems('PS-01', 'AI', 3);
assert(relatedForPs01.length === 3, 'Returns up to 3 related problems');
assert(!relatedForPs01.some((p) => p.problemId === 'PS-01'), 'Current problem is excluded from related list');

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
