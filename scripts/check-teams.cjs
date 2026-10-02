const fs = require('fs');
const content = fs.readFileSync('./src/data/alphaTeamsRoster.ts', 'utf8');
const lines = content.split('\n');
const items = [];
let current = {};
for (const line of lines) {
  const tm = line.match(/"teamId":\s*"([^"]+)"/);
  if (tm) {
    current = { teamId: tm[1] };
  }
  const nm = line.match(/"teamName":\s*"([^"]+)"/);
  if (nm && current) {
    current.teamName = nm[1];
  }
  const lm = line.match(/"teamLeadName":\s*"([^"]+)"/);
  if (lm && current) {
    current.teamLeadName = lm[1];
    items.push(current);
  }
}

console.log('Total items in alphaTeamsRoster:', items.length);

function normalizeId(id) {
  if (!id) return '';
  const clean = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = clean.match(/^([a-z]+)0*(\d+)$/);
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  return clean;
}

const seen = new Map();
items.forEach((item, index) => {
  const nid = normalizeId(item.teamId);
  if (seen.has(nid)) {
    console.log(`COLLISION at index ${index}: Team ID "${item.teamId}" (Name: ${item.teamName}) collides with index ${seen.get(nid).index}: Team ID "${seen.get(nid).item.teamId}" (Name: ${seen.get(nid).item.teamName}) -> normalized to "${nid}"`);
  } else {
    seen.set(nid, { index, item });
  }
});

console.log('Unique normalized count:', seen.size);
for (let i = 1; i <= 60; i++) {
  const padded = 'ALPHA-' + String(i).padStart(3, '0');
  const found = items.find(it => it.teamId === padded);
  if (!found) {
    console.log('MISSING:', padded);
  }
}
