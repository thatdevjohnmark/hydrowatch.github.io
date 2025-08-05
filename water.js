// Water Usage Monitoring Script
// Extracted from script.js

// Utility Functions
function parseWaterCSV(text) {
  try {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    const headers = lines.shift().split(',').map(h => h.trim());
    let dataType = 'unknown';
    if (headers.some(h => h.toLowerCase().includes('name')) && headers.some(h => h.toLowerCase().includes('month')) && headers.some(h => h.toLowerCase().includes('usage'))) {
      dataType = 'water';
    }
    const validRows = lines
      .filter(line => line.trim() !== '')
      .map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, i) => obj[header] = values[i] ?? "");
        if (dataType === 'water') {
          let monthStr = obj.Month;
          if (!/^\d{1,2}-\d{4}$/.test(monthStr)) {
            const dateMatch = monthStr.match(/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
              monthStr = `${dateMatch[1].padStart(2, '0')}-${dateMatch[2]}`;
            } else {
              return null;
            }
          }
          const usage = parseInt(obj.Usage);
          if (isNaN(usage)) return null;
          return {
            Name: obj.Name,
            Month: monthStr,
            Usage: usage < 0 ? null : usage,
            dataType: 'water'
          };
        }
        return null;
      })
      .filter(row => row !== null);
    return validRows;
  } catch (error) {
    return [];
  }
}

// Add other water-specific rendering and filter functions as needed.
// This is a skeleton; you can copy the rest of the water logic from script.js as needed.