const XLSX = require('xlsx');

// Let's test reading ALPHA_Teams_Formatted.xlsx
const wb = XLSX.readFile('C:/Users/dpava/Downloads/ALPHA_Teams_Formatted.xlsx');
const ws = wb.Sheets['Teams'];
const rows = XLSX.utils.sheet_to_json(ws);
console.log('Total rows in ALPHA_Teams_Formatted.xlsx:', rows.length);
console.log('Sample row 0:', rows[0]);
console.log('Row for ALPHA-004:', rows.find(r => r['Team ID'] === 'ALPHA-004'));
