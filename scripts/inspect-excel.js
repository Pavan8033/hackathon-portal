const XLSX = require('xlsx');

const files = [
  'C:/Users/dpava/Downloads/ALPHA_Credentials.xlsx',
  'C:/Users/dpava/Downloads/ALPHA_Teams_5_Columns.xlsx',
  'C:/Users/dpava/Downloads/ALPHA_Teams_Formatted.xlsx',
  'C:/Users/dpava/Downloads/ALPHA_Teams_Export_2026-09-23(1).xls'
];

for (const p of files) {
  try {
    const wb = XLSX.readFile(p);
    console.log('\n======================================================');
    console.log('FILE:', p);
    console.log('SHEETS:', wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log('HEADER ROW 0:', rows[0]);
    console.log('ROW 1:', rows[1]);
    console.log('ROW 2:', rows[2]);
    const alpha4 = rows.find(r => Array.isArray(r) && r.some(c => String(c).includes('004')));
    console.log('ROW WITH 004:', alpha4);
  } catch (e) {
    console.error('Error reading', p, e.message);
  }
}
