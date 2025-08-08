// CSV URLs for separate sheets - will be set in loadData function
let waterCsvUrl = '';
let electricityCsvUrl = '';

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let allData = [];
let uniqueNames = new Set(); // To store all unique names initially

// DOM Elements - will be initialized after DOM is loaded
let loadingSpinner;
let tableBody;
let emptyStateMessage;

// Utility Functions
function showLoading() {
  if (loadingSpinner) loadingSpinner.classList.remove('hidden');
  if (tableBody) tableBody.innerHTML = ''; // Clear table
  if (emptyStateMessage) emptyStateMessage.classList.add('hidden');
}

function hideLoading() {
  if (loadingSpinner) loadingSpinner.classList.add('hidden');
}

function showEmptyState(message) {
  if (emptyStateMessage) {
    emptyStateMessage.textContent = message;
    emptyStateMessage.classList.remove('hidden');
    feather.replace(); // Re-render feather icons for the new message
  }
}

function hideEmptyState() {
  if (emptyStateMessage) emptyStateMessage.classList.add('hidden');
}

// Trend calculation functions
function calculateTrend(currentValue, previousValue) {
  if (currentValue === null || previousValue === null || previousValue === 0) {
    return { trend: 'neutral', percentage: 0, arrow: '→', color: 'text-gray-500' };
  }
  
  const difference = currentValue - previousValue;
  const percentage = ((difference / previousValue) * 100);
  
  if (difference > 0) {
    return { 
      trend: 'up', 
      percentage: Math.abs(percentage).toFixed(1), 
      arrow: '↑', 
      color: 'text-red-500' 
    };
  } else if (difference < 0) {
    return { 
      trend: 'down', 
      percentage: Math.abs(percentage).toFixed(1), 
      arrow: '↓', 
      color: 'text-green-500' 
    };
  } else {
    return { 
      trend: 'neutral', 
      percentage: 0, 
      arrow: '→', 
      color: 'text-gray-500' 
    };
  }
}

function getPreviousMonthData(data, currentMonth, dataType = 'water') {
  const currentMonthNum = parseMonthNum(currentMonth);
  const previousMonthNum = currentMonthNum - 1;
  
  // Convert back to MM-YYYY format
  const previousMonth = `${String(Math.floor(previousMonthNum % 12) || 12).padStart(2, '0')}-${Math.floor(previousMonthNum / 12)}`;
  
  return data.filter(row => 
    row.dataType === dataType && 
    row.Month === previousMonth
  );
}

function parseCSV(text) {
  try {
    console.log('Parsing CSV, length:', text.length);
    
    if (!text || text.trim() === '') {
      console.log('Empty CSV text provided');
      return [];
    }
    
    const lines = text.trim().split('\n');
    console.log('CSV lines count:', lines.length);
    
    if (lines.length === 0) {
      console.log('No lines found in CSV');
      return [];
    }
    
    const headers = lines.shift().split(',').map(h => h.trim());
    console.log('CSV headers:', headers);
    
    if (headers.length === 0) {
      console.log('No headers found in CSV');
      return [];
    }
    
    // Check for different data types based on headers
    const hasNameHeader = headers.some(h => h.toLowerCase().includes('name'));
    const hasMonthHeader = headers.some(h => h.toLowerCase().includes('month'));
    const hasUsageHeader = headers.some(h => h.toLowerCase().includes('usage'));
    const hasReadingHeader = headers.some(h => h.toLowerCase().includes('reading'));
    const hasPowerConsumptionHeader = headers.some(h => h.toLowerCase().includes('power consumption'));
    const hasElectricityReadingHeader = headers.some(h => h.toLowerCase().includes('electricity reading'));
    const hasCostImpactHeader = headers.some(h => h.toLowerCase().includes('cost impact'));
    const hasPowerGenerationCostHeader = headers.some(h => h.toLowerCase().includes('power generation cost'));
    
    console.log('Header checks:', {
      hasNameHeader,
      hasMonthHeader,
      hasUsageHeader,
      hasReadingHeader,
      hasPowerConsumptionHeader,
      hasElectricityReadingHeader,
      hasCostImpactHeader,
      hasPowerGenerationCostHeader
    });
    
    // Determine data type
    let dataType = 'unknown';
    if (hasNameHeader && hasMonthHeader && hasUsageHeader) {
      dataType = 'water';
    } else if (hasMonthHeader && hasPowerConsumptionHeader && hasElectricityReadingHeader) {
      dataType = 'electricity';
    } else {
      console.log('CSV headers do not match expected formats');
      return [];
    }
    
    console.log('Detected data type:', dataType);
    
    const skippedRows = [];
    const validRows = lines
      .filter(line => line.trim() !== '') // Skip empty lines
      .map((line, index) => {
        try {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          // Filter out completely empty rows
          if (values.every(v => v === '')) {
            return null;
          }
          
          if (values.length < headers.length) {
            skippedRows.push(`Row ${index + 2}: Fewer columns than expected: ${line}`);
            return null;
          }
          const obj = {};
          headers.forEach((header, i) => obj[header] = values[i] ?? "");
          
          if (dataType === 'water') {
            // Parse water usage data
            if (!obj.Name || obj.Name.trim() === '') {
              return null; // Skip rows without names
            }
            
            if (!obj.Month || obj.Month.trim() === '') {
              return null; // Skip rows without months
            }
            
            console.log(`Row ${index + 2} raw data:`, { 
              Name: obj.Name, 
              Month: obj.Month, 
              Usage: obj.Usage,
              Reading: obj.Reading,
              UsageType: typeof obj.Usage,
              UsageLength: obj.Usage ? obj.Usage.length : 0
            });
            
            // Handle different month formats
            let monthStr = obj.Month;
            if (!/^\d{1,2}-\d{4}$/.test(monthStr)) {
              // Try to convert other formats to MM-YYYY
              const dateMatch = monthStr.match(/(\d{1,2})\/(\d{4})/);
              if (dateMatch) {
                monthStr = `${dateMatch[1].padStart(2, '0')}-${dateMatch[2]}`;
              } else {
                skippedRows.push(`Row ${index + 2}: Invalid Month format (must be MM-YYYY): ${obj.Month}`);
                return null;
              }
            }
            
            // Handle usage values - allow negative values but treat them as "not read yet"
            let usage = null;
            if (obj.Usage && obj.Usage.trim() !== '') {
              const parsedUsage = parseFloat(obj.Usage);
              if (!isNaN(parsedUsage)) {
                usage = parsedUsage < 0 ? null : parsedUsage; // Treat negative values as "not read yet"
              }
            }
            
            console.log(`Parsed water row ${index + 2}:`, { Name: obj.Name, Month: monthStr, Usage: usage });
            
            return {
              Name: obj.Name,
              Month: monthStr,
              Usage: usage,
              Reading: obj.Reading ? parseFloat(obj.Reading) : null,
              dataType: 'water'
            };
          } else if (dataType === 'electricity') {
            // Parse electricity data
            if (!obj.Month) {
              skippedRows.push(`Row ${index + 2}: Missing Month: ${line}`);
              return null;
            }
            
            // Handle different month formats for electricity
            let monthStr = obj.Month;
            if (!/^\d{1,2}-\d{4}$/.test(monthStr)) {
              // Try to convert other formats to MM-YYYY
              const dateMatch = monthStr.match(/(\d{1,2})\/(\d{4})/);
              if (dateMatch) {
                monthStr = `${dateMatch[1].padStart(2, '0')}-${dateMatch[2]}`;
              } else {
                skippedRows.push(`Row ${index + 2}: Invalid Month format (must be MM-YYYY): ${obj.Month}`);
                return null;
              }
            }
            
            // Parse electricity values - handle comma-separated numbers
            const parseNumber = (value) => {
              if (!value || value.trim() === '') return null;
              // Remove commas and parse
              const cleanValue = value.replace(/,/g, '');
              const parsed = parseFloat(cleanValue);
              return isNaN(parsed) ? null : parsed;
            };
            
            const powerConsumption = parseNumber(obj['Power Consumption']);
            const electricityReading = parseNumber(obj['Electricity Reading']);
            const costImpact = parseNumber(obj['Cost Impact']);
            const powerGenerationCost = parseNumber(obj['Power Generation Cost'] || obj['PowerGenerationCost']);
            
            return {
              Month: monthStr,
              PowerConsumption: powerConsumption,
              ElectricityReading: electricityReading,
              CostImpact: costImpact,
              PowerGenerationCost: powerGenerationCost,
              dataType: 'electricity'
            };
          }
          
          return null;
        } catch (error) {
          skippedRows.push(`Row ${index + 2}: Error parsing line: ${error.message}`);
          return null;
        }
      })
      .filter(row => row !== null);
    
    if (skippedRows.length > 0) {
      console.warn('Skipped rows during CSV parsing:', skippedRows);
    }
    
    console.log('Valid rows parsed:', validRows.length);
    console.log('Skipped rows count:', skippedRows.length);
    return validRows;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

function monthToWord(monthStr) {
  if (!monthStr) return "";
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const monthNum = parseInt(parts[0], 10);
  const year = parts[1];
  if (monthNum < 1 || monthNum > 12) return monthStr;
  return `${monthNames[monthNum]} ${year}`;
}

function parseMonthNum(monthStr) {
  if (!monthStr) return 0;
  const parts = monthStr.split('-');
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
    console.warn(`Invalid month format: ${monthStr}`);
    return 0;
  }
  return y * 12 + m;
}

function formatNumber(num) {
  // If num is null or 0, return "Meter not read yet"
  if (num === null || num === 0) {
    return "Meter not read yet";
  }
  // Otherwise, format the number with commas
  const numStr = num.toString();
  if (numStr.includes('.')) {
    const parts = numStr.split('.');
    const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${wholePart}.${parts[1]}`;
  }
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Table Rendering Functions
function renderTable(filteredDataForDisplay, selectedName, selectedMonthFilterValue) {
  if (!tableBody) return;
  
  // Update record count
  const recordCountElement = document.getElementById('record-count');
  if (recordCountElement) {
    const count = filteredDataForDisplay.length;
    recordCountElement.textContent = `${count} record${count !== 1 ? 's' : ''}`;
  }
  
  if (filteredDataForDisplay.length === 0) {
    showEmptyState('No water usage records found for the selected filters. Try adjusting your search!');
    return;
  }
  
  hideEmptyState();
  
  const tableHTML = filteredDataForDisplay.map(row => {
    const monthWord = monthToWord(row.Month);
    const usageFormatted = formatNumber(row.Usage);
    
    // Calculate bill amount (₱20 per cubic meter)
    let billAmount = "Meter not read yet";
    if (row.Usage != null && row.Usage !== 0) {
      const bill = (row.Usage * 20).toFixed(2);
      billAmount = formatNumber(bill);
    }
    
    // Calculate trend for usage
    const previousMonthData = getPreviousMonthData(allData, row.Month, 'water');
    const previousUsageData = previousMonthData.find(prev => prev.Name === row.Name);
    const usageTrend = calculateTrend(row.Usage, previousUsageData ? previousUsageData.Usage : null);
    
    // Calculate trend for bill
    const previousBill = previousUsageData && previousUsageData.Usage ? (previousUsageData.Usage * 20) : null;
    const currentBill = row.Usage ? (row.Usage * 20) : null;
    const billTrend = calculateTrend(currentBill, previousBill);
    
    return `
      <tr class="table-row-hover">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-8 w-8">
              <div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span class="text-sm font-medium text-white">${row.Name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div class="ml-3">
              <div class="text-sm font-medium text-gray-900">${row.Name}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${monthWord}</div>
          <div class="text-sm text-gray-500">${row.Month}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <div class="text-sm font-medium text-gray-900">${usageFormatted} m³</div>
            ${usageTrend.percentage > 0 ? `
              <span class="${usageTrend.color} text-sm font-bold">${usageTrend.arrow}</span>
              <span class="text-xs ${usageTrend.color}">${usageTrend.percentage}%</span>
            ` : ''}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <div class="text-sm font-medium text-gray-900">₱${billAmount}</div>
            ${billTrend.percentage > 0 ? `
              <span class="${billTrend.color} text-sm font-bold">${billTrend.arrow}</span>
              <span class="text-xs ${billTrend.color}">${billTrend.percentage}%</span>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  tableBody.innerHTML = tableHTML;
  feather.replace(); // Re-render feather icons
}

function renderCombinedData(filteredDataForDisplay, selectedName, selectedMonthFilterValue) {
  const combinedData = filteredDataForDisplay.filter(row => row.dataType === 'combined');
  
  // Update table headers for water usage only
  const thead = document.querySelector('thead tr');
  thead.innerHTML = `
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Name</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Month</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Water Usage (m³)</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Water Bill (PHP)</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Payment Status</th>
  `;

  let namesToRender = [];
  if (selectedName) {
      namesToRender = [selectedName];
  } else {
      namesToRender = Array.from(uniqueNames).sort();
  }

  namesToRender.forEach(name => {
      const recordsForName = combinedData
          .filter(row => row.Name === name)
          .sort((a, b) => parseMonthNum(a.Month) - parseMonthNum(b.Month));

      if (recordsForName.length > 0) {
          recordsForName.forEach(record => {
              const usage = record.Usage;
              let waterBill = "Meter not read yet";
              if (usage != null && usage !== 0) {
                  waterBill = (usage * 20).toFixed(2);
                  waterBill = formatNumber(waterBill);
              }

              const tr = document.createElement('tr');
              tr.className = "group hover:bg-blue-100 transition-colors duration-150 ease-in-out";
              
              // Determine payment status based on bill
              let paymentStatus = "Pending";
              let paymentStatusClass = "text-yellow-600";
              if (usage != null && usage !== 0) {
                paymentStatus = "Paid";
                paymentStatusClass = "text-green-600";
              }
              
              tr.innerHTML = `
                <td class="px-6 py-3 whitespace-nowrap text-gray-800 font-medium">${record.Name}</td>
                <td class="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">${monthToWord(record.Month)}</td>
                <td class="px-6 py-3 whitespace-nowrap text-blue-700 font-semibold">${formatNumber(usage)}</td>
                <td class="px-6 py-3 whitespace-nowrap text-green-700 font-semibold">${waterBill}</td>
                <td class="px-6 py-3 whitespace-nowrap ${paymentStatusClass} font-semibold">${paymentStatus}</td>
              `;
              tableBody.appendChild(tr);
          });
      } else if (!selectedName || selectedMonthFilterValue !== "") {
          const tr = document.createElement('tr');
          tr.className = "group hover:bg-blue-100 transition-colors duration-150 ease-in-out";
          const monthText = selectedMonthFilterValue ? monthToWord(selectedMonthFilterValue) : (selectedName ? 'N/A' : 'No Data');

          tr.innerHTML = `
              <td class="px-6 py-3 whitespace-nowrap text-gray-800 font-medium">${name}</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">${monthText}</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-500 italic">Meter not read yet</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-500 italic">Meter not read yet</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-500 italic">Pending</td>
          `;
          tableBody.appendChild(tr);
      }
  });
}

function renderElectricityData(filteredDataForDisplay) {
  const electricityData = filteredDataForDisplay.filter(row => row.dataType === 'electricity');
  
  // Update table headers for electricity
  const thead = document.querySelector('thead tr');
  thead.innerHTML = `
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Power Consumption (kWh)</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Electricity Reading (kWh)</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Month</th>
  `;
  
  electricityData.forEach(record => {
    const powerConsumption = record.PowerConsumption;
    const electricityReading = record['Electricity Reading'];
    const month = record.Month;

    const tr = document.createElement('tr');
    tr.className = "group hover:bg-blue-100 transition-colors duration-150 ease-in-out";
    tr.innerHTML = `
      <td class="px-6 py-3 whitespace-nowrap text-blue-700 font-semibold">${formatNumber(powerConsumption)} kWh</td>
      <td class="px-6 py-3 whitespace-nowrap text-orange-700 font-semibold">${formatNumber(electricityReading)} kWh</td>
      <td class="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">${month || 'N/A'}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderWaterData(filteredDataForDisplay, selectedName, selectedMonthFilterValue) {
  const waterData = filteredDataForDisplay.filter(row => row.dataType === 'water');
  
  // Update table headers for water
  const thead = document.querySelector('thead tr');
  thead.innerHTML = `
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Name</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Month</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Usage (Cubic Meters)</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Bill (PHP)</th>
    <th class="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider text-sm">Payment Status</th>
  `;

  let namesToRender = [];
  if (selectedName) {
      namesToRender = [selectedName];
  } else {
      namesToRender = Array.from(uniqueNames).sort();
  }

  namesToRender.forEach(name => {
      const recordsForName = waterData
          .filter(row => row.Name === name)
          .sort((a, b) => parseMonthNum(a.Month) - parseMonthNum(b.Month));

      if (recordsForName.length > 0) {
          recordsForName.forEach(record => {
              const usage = record.Usage;
              let bill = "Meter not read yet";
              if (usage != null && usage !== 0) {
                  bill = (usage * 20).toFixed(2);
                  bill = formatNumber(bill);
              }

              const tr = document.createElement('tr');
              tr.className = "group hover:bg-blue-100 transition-colors duration-150 ease-in-out";
              
              // Determine payment status based on bill
              let paymentStatus = "Pending";
              let paymentStatusClass = "text-yellow-600";
              if (usage != null && usage !== 0) {
                paymentStatus = "Paid";
                paymentStatusClass = "text-green-600";
              }
              
              tr.innerHTML = `
                <td class="px-6 py-3 whitespace-nowrap text-gray-800 font-medium">${record.Name}</td>
                <td class="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">${monthToWord(record.Month)}</td>
                <td class="px-6 py-3 whitespace-nowrap text-blue-700 font-semibold">${formatNumber(usage)}</td>
                <td class="px-6 py-3 whitespace-nowrap text-green-700 font-semibold">${bill}</td>
                <td class="px-6 py-3 whitespace-nowrap ${paymentStatusClass} font-semibold">${paymentStatus}</td>
              `;
              tableBody.appendChild(tr);
          });
      } else if (!selectedName || selectedMonthFilterValue !== "") {
          const tr = document.createElement('tr');
          tr.className = "group hover:bg-blue-100 transition-colors duration-150 ease-in-out";
          const monthText = selectedMonthFilterValue ? monthToWord(selectedMonthFilterValue) : (selectedName ? 'N/A' : 'No Data');

          tr.innerHTML = `
              <td class="px-6 py-3 whitespace-nowrap text-gray-800 font-medium">${name}</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">${monthText}</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-500 italic">Meter not read yet</td>
              <td class="px-6 py-3 whitespace-nowrap text-gray-500 italic">Meter not read yet</td>
          `;
          tableBody.appendChild(tr);
      }
  });
}

// Filter and Data Management Functions
function populateFilters(data) {
  const monthSet = new Set();
  const now = new Date(); // Using current date for months filter range
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const currentMonthNum = currentYear * 12 + currentMonth;

  // Only process water data for filters
  const waterData = data.filter(row => row.dataType === 'water');
  
  waterData.forEach(row => {
    uniqueNames.add(row.Name);
    const monthNum = parseMonthNum(row.Month);
    if (monthNum <= currentMonthNum) {
      monthSet.add(row.Month);
    }
  });

  const nameFilter = document.getElementById('nameFilter');
  const monthFilter = document.getElementById('monthFilter');
  const pieChartMonthFilter = document.getElementById('pieChartMonthFilter');
  
  if (!nameFilter || !monthFilter) {
    console.error('Filter elements not found');
    return;
  }
  
  nameFilter.innerHTML = '<option value="">All Names</option>' + Array.from(uniqueNames).sort().map(n => `<option value="${n}">${n}</option>`).join('');
  monthFilter.innerHTML = '<option value="">All Months</option>' +
    Array.from(monthSet)
      .sort((a, b) => parseMonthNum(a) - parseMonthNum(b))
      .map(m => `<option value="${m}">${monthToWord(m)}</option>`).join('');

  // Populate pie chart month filter
  if (pieChartMonthFilter) {
    const currentMonth = getCurrentMonth();
    const sortedMonths = Array.from(monthSet)
      .sort((a, b) => parseMonthNum(a) - parseMonthNum(b));
    
    // Check if current month exists in the data
    const currentMonthExists = sortedMonths.includes(currentMonth);
    
    pieChartMonthFilter.innerHTML = '<option value="">All Months</option>' +
      sortedMonths.map(m => `<option value="${m}">${monthToWord(m)}</option>`).join('');
    
    // Set current month as default if it exists in the data
    if (currentMonthExists) {
      pieChartMonthFilter.value = currentMonth;
      // Trigger the pie chart update with the default selection
      setTimeout(() => {
        if (typeof updateWaterUsagePieChart === 'function') {
          updateWaterUsagePieChart(allData);
        }
      }, 100);
    }
  }

  // Set initial month filter to the most recent month with data, not current month
  const availableMonths = Array.from(monthSet).sort((a, b) => parseMonthNum(a) - parseMonthNum(b));
  if (availableMonths.length > 0) {
    // Use the most recent month with data
    monthFilter.value = availableMonths[availableMonths.length - 1];
  } else {
    monthFilter.value = "";
  }
}

function updatePowerConsumptionCard(selectedMonth = null) {
  // Use the electricity dashboard function if available
  if (typeof updateElectricityDashboardCard === 'function') {
    updateElectricityDashboardCard(selectedMonth);
    return;
  }
  
  // Fallback to original implementation
  let electricityData = allData.filter(row => row.dataType === 'electricity');
  
  if (selectedMonth) {
    electricityData = electricityData.filter(row => row.Month === selectedMonth);
  }
  
  let selectedElectricityData = null;
  
  if (electricityData.length > 0) {
    if (selectedMonth) {
      selectedElectricityData = electricityData[0];
    } else {
      selectedElectricityData = electricityData.reduce((latest, current) => {
        const currentMonthNum = parseMonthNum(current.Month);
        const latestMonthNum = parseMonthNum(latest.Month);
        return currentMonthNum > latestMonthNum ? current : latest;
      });
    }
  }
  
  // Update dashboard elements with correct IDs
  const dashboardElements = {
    'dashboard-month': selectedElectricityData ? monthToWord(selectedElectricityData.Month) : (selectedMonth ? monthToWord(selectedMonth) : 'No data'),
    'dashboard-power-consumption': selectedElectricityData && selectedElectricityData.PowerConsumption != null ? 
      `${formatNumber(selectedElectricityData.PowerConsumption)} kWh` : 'No data',
    'dashboard-electricity-reading': selectedElectricityData && selectedElectricityData.ElectricityReading != null ? 
      `${formatNumber(selectedElectricityData.ElectricityReading)} kWh` : 'No data',
    'dashboard-cost-impact': selectedElectricityData && selectedElectricityData.CostImpact != null && selectedElectricityData.CostImpact > 0 ? 
      `₱${formatNumber(selectedElectricityData.CostImpact)}` : 'No data',
    'dashboard-power-generation-cost': selectedElectricityData && selectedElectricityData.PowerGenerationCost != null && selectedElectricityData.PowerGenerationCost > 0 ? 
      `₱${formatNumber(selectedElectricityData.PowerGenerationCost)}` : '₱0.00'
  };
  
  // Update each element
  Object.keys(dashboardElements).forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = dashboardElements[elementId];
    } else {
      console.warn(`Element not found: ${elementId}`);
    }
  });
}

function applyFilters() {
  const nameFilter = document.getElementById('nameFilter');
  const monthFilter = document.getElementById('monthFilter');
  const searchInput = document.getElementById('searchInput');
  
  if (!nameFilter || !monthFilter || !searchInput) {
    console.error('Filter elements not found');
    return;
  }
  
  const nameVal = nameFilter.value;
  const monthVal = monthFilter.value;
  const searchVal = searchInput.value.toLowerCase();

  console.log('=== FILTER DEBUG ===');
  console.log('Total allData records:', allData.length);
  console.log('Water data records:', allData.filter(row => row.dataType === 'water').length);
  console.log('Electricity data records:', allData.filter(row => row.dataType === 'electricity').length);
  console.log('Filter values:', { nameVal, monthVal, searchVal });

  let filteredData = allData.filter(row => {
    // Only process water data for now
    if (row.dataType !== 'water') return false;
    
    const matchesName = !nameVal || row.Name === nameVal;
    const matchesMonth = !monthVal || row.Month === monthVal;
    const matchesSearch = !searchVal ||
      row.Name.toLowerCase().includes(searchVal) ||
      monthToWord(row.Month).toLowerCase().includes(searchVal) ||
      // Allow searching for "meter not read yet" when usage is null or 0
      ((row.Usage === null || row.Usage === 0) && "meter not read yet".includes(searchVal)) ||
      (row.Usage != null && row.Usage !== 0 && row.Usage.toString().toLowerCase().includes(searchVal)) ||
      // Also check if bill text contains search term (e.g., "12,000.00")
      (row.Usage != null && row.Usage !== 0 && (row.Usage * 20).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",").toLowerCase().includes(searchVal));

    return matchesName && matchesMonth && matchesSearch;
  });

  console.log('Filtered data records:', filteredData.length);
  console.log('Filtered data:', filteredData);

  // If "All Months" is selected and a specific name is chosen, sort the data by month
  if (nameVal && !monthVal) {
      filteredData.sort((a, b) => parseMonthNum(a.Month) - parseMonthNum(b.Month));
  }

     renderTable(filteredData, nameVal, monthVal);
   
   // Update electricity cards when filters change
   updatePowerConsumptionCard(monthVal);
   
   // Update charts with filtered data
   if (typeof updateAllCharts === 'function') {
     updateAllCharts(allData);
   }
}

// Data Loading Functions
async function loadData() {
  showLoading();
  try {
    // Set URLs for the published CSV files from Google Sheets with cache-busting
    const timestamp = new Date().getTime();
    waterCsvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQRHMGoTcKUK_tYUBivmT1ikkldhQlB8GzFdfxinAlCxDqoTrT7BMr6moflqgdTF4N90yGlfFW72Sin/pub?output=csv&_t=${timestamp}`;
    electricityCsvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRrGNK29KMXQ_o2K1raxL4Q2ody_TQv1zw3HKFXY_WuVHVSwnu0gaqeoU15nh7-wngu1oXI2rpIZxJn/pub?output=csv&_t=${timestamp}`;

    console.log('Starting data load...');
    console.log('Water CSV URL:', waterCsvUrl);

    let waterData = [];
    let electricityData = [];

    // Load water data from Sheet1
    try {
      console.log('Fetching water data...');
      const waterRes = await fetch(waterCsvUrl);
      console.log('Water response status:', waterRes.status);
      
      if (!waterRes.ok) {
        throw new Error(`HTTP ${waterRes.status}: ${waterRes.statusText}`);
      } else {
        const waterText = await waterRes.text();
        console.log('Water CSV received, length:', waterText.length);
        console.log('First 200 characters:', waterText.substring(0, 200));
        console.log('Full water CSV content:', waterText);
        
        waterData = parseCSV(waterText);
        console.log('Parsed water data:', waterData);
        console.log('Water data count:', waterData.length);
        console.log('Water data details:', waterData.map(row => ({ Name: row.Name, Month: row.Month, Usage: row.Usage })));
      }
    } catch (waterError) {
      console.error('Failed to load water data:', waterError);
    }

    // Load electricity data from Sheet2
    try {
      const electricityRes = await fetch(electricityCsvUrl);
      
      if (!electricityRes.ok) {
        throw new Error(`HTTP ${electricityRes.status}: ${electricityRes.statusText}`);
      } else {
        const electricityText = await electricityRes.text();
        electricityData = parseCSV(electricityText);
      }
    } catch (electricityError) {
      console.error('Failed to load electricity data:', electricityError);
    }

    // Combine the data
    allData = [...waterData, ...electricityData];
    console.log('Combined data count:', allData.length);

    // Extract unique names from water data
    uniqueNames.clear();
    waterData.forEach(row => {
      if (row.Name) {
        uniqueNames.add(row.Name);
      }
    });

    console.log('Unique names found:', Array.from(uniqueNames));

    // Populate filters
    populateFilters(allData);
    populateElectricityFilters(allData);

    // Apply initial filters
    applyFilters();

    // Update electricity dashboard
    if (typeof updateElectricityDashboardCard === 'function') {
      updateElectricityDashboardCard();
    }

    // Update charts with new data
    if (typeof updateAllCharts === 'function') {
      updateAllCharts(allData);
    }

    hideLoading();
  } catch (error) {
    console.error('Error loading data:', error);
    hideLoading();
    showEmptyState('Failed to load data. Please check your internet connection and try again.');
  }
}

// Electricity Dashboard Filter Functions
function applyElectricityFilters() {
  const electricityMonthFilter = document.getElementById('electricityMonthFilter');
  const electricitySearchInput = document.getElementById('electricitySearchInput');
  
  if (!electricityMonthFilter || !electricitySearchInput) {
    console.error('Electricity filter elements not found');
    return;
  }
  
  const selectedMonth = electricityMonthFilter.value;
  const searchTerm = electricitySearchInput.value.toLowerCase();
  
  // Filter electricity data
  const electricityData = allData.filter(row => row.dataType === 'electricity');
  let filteredElectricityData = electricityData;
  
  // Apply month filter
  if (selectedMonth) {
    filteredElectricityData = filteredElectricityData.filter(row => row.Month === selectedMonth);
  }
  
  // Apply search filter
  if (searchTerm) {
    filteredElectricityData = filteredElectricityData.filter(row => {
      return (
        (row.Month && row.Month.toLowerCase().includes(searchTerm)) ||
        (row.PowerConsumption && row.PowerConsumption.toString().includes(searchTerm)) ||
        (row.ElectricityReading && row.ElectricityReading.toString().includes(searchTerm)) ||
        (row.CostImpact && row.CostImpact.toString().includes(searchTerm))
      );
    });
  }
  
  // Update electricity dashboard cards
  updateElectricityDashboardCards(filteredElectricityData);
  
  // Update electricity chart
  if (typeof updateElectricityChart === 'function') {
    updateElectricityChart(allData); // Keep using all data for chart consistency
  }
  
  // Update record count
  const recordCountElement = document.getElementById('electricity-record-count');
  if (recordCountElement) {
    recordCountElement.textContent = `${filteredElectricityData.length} records`;
  }
}

function clearElectricityFilters() {
  const electricityMonthFilter = document.getElementById('electricityMonthFilter');
  const electricitySearchInput = document.getElementById('electricitySearchInput');
  
  if (electricityMonthFilter) {
    electricityMonthFilter.value = '';
  }
  if (electricitySearchInput) {
    electricitySearchInput.value = '';
  }
  
  applyElectricityFilters();
}

function updateElectricityDashboardCards(filteredData) {
  // Update dashboard cards with filtered data
  if (filteredData.length > 0) {
    const latestData = filteredData[filteredData.length - 1];
    
    // Update Current Month
    const dashboardMonth = document.getElementById('dashboard-month');
    if (dashboardMonth && latestData.Month) {
      dashboardMonth.textContent = monthToWord(latestData.Month);
    }
    
    // Update Power Consumption
    const dashboardPowerConsumption = document.getElementById('dashboard-power-consumption');
    if (dashboardPowerConsumption && latestData.PowerConsumption !== null) {
      dashboardPowerConsumption.textContent = formatNumber(latestData.PowerConsumption) + ' kWh';
    }
    
    // Update Electricity Reading
    const dashboardElectricityReading = document.getElementById('dashboard-electricity-reading');
    if (dashboardElectricityReading && latestData.ElectricityReading !== null) {
      dashboardElectricityReading.textContent = formatNumber(latestData.ElectricityReading) + ' kWh';
    }
    
    // Update Generation Cost
    const dashboardPowerGenerationCost = document.getElementById('dashboard-power-generation-cost');
    if (dashboardPowerGenerationCost && latestData.CostImpact !== null) {
      dashboardPowerGenerationCost.textContent = '₱' + formatNumber(latestData.CostImpact);
    }
    
    // Update Cost Impact (total of filtered data)
    const dashboardCostImpact = document.getElementById('dashboard-cost-impact');
    if (dashboardCostImpact) {
      const totalCostImpact = filteredData.reduce((sum, row) => {
        return sum + (row.CostImpact || 0);
      }, 0);
      dashboardCostImpact.textContent = '₱' + formatNumber(totalCostImpact);
    }
  }
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}-${year}`;
}

function populateElectricityFilters(data) {
  const electricityData = data.filter(row => row.dataType === 'electricity');
  const monthSet = new Set();
  
  electricityData.forEach(row => {
    if (row.Month) {
      monthSet.add(row.Month);
    }
  });
  
  const electricityMonthFilter = document.getElementById('electricityMonthFilter');
  if (electricityMonthFilter) {
    const currentMonth = getCurrentMonth();
    const sortedMonths = Array.from(monthSet)
      .sort((a, b) => parseMonthNum(a) - parseMonthNum(b));
    
    // Check if current month exists in the data
    const currentMonthExists = sortedMonths.includes(currentMonth);
    
    electricityMonthFilter.innerHTML = '<option value="">All Months</option>' +
      sortedMonths.map(m => `<option value="${m}">${monthToWord(m)}</option>`).join('');
    
    // Set current month as default if it exists in the data
    if (currentMonthExists) {
      electricityMonthFilter.value = currentMonth;
      // Trigger the filter to apply the default selection
      setTimeout(() => {
        applyElectricityFilters();
      }, 100);
    }
  }
}

// Initialize the application
function init() {
  // Initialize DOM elements
  loadingSpinner = document.getElementById('loading-spinner');
  tableBody = document.getElementById('table-body');
  emptyStateMessage = document.getElementById('empty-state-message');
  
  if (!loadingSpinner || !tableBody || !emptyStateMessage) {
    console.error('Required DOM elements not found!');
    return;
  }
  
  // Initialize charts
  if (typeof initializeCharts === 'function') {
    initializeCharts();
  }
  
  loadData();
  
  // Set up event listeners for filters
  const nameFilter = document.getElementById('nameFilter');
  const monthFilter = document.getElementById('monthFilter');
  const searchInput = document.getElementById('searchInput');
  const pieChartMonthFilter = document.getElementById('pieChartMonthFilter');
  
  if (nameFilter && monthFilter && searchInput) {
    nameFilter.addEventListener('change', applyFilters);
    monthFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
  }
  
  // Set up event listener for pie chart month filter
  if (pieChartMonthFilter) {
    pieChartMonthFilter.addEventListener('change', () => {
      if (typeof updateWaterUsagePieChart === 'function') {
        updateWaterUsagePieChart(allData);
      }
    });
  }
  
  // Set up event listeners for electricity dashboard filters
  const electricityMonthFilter = document.getElementById('electricityMonthFilter');
  const electricitySearchInput = document.getElementById('electricitySearchInput');
  
  if (electricityMonthFilter && electricitySearchInput) {
    electricityMonthFilter.addEventListener('change', applyElectricityFilters);
    electricitySearchInput.addEventListener('input', applyElectricityFilters);
  }
  
  // Initialize Feather icons after a short delay to ensure DOM is ready
  setTimeout(() => {
    feather.replace();
  }, 100);
}

// Refresh data function
function refreshData() {
  console.log('Refreshing data...');
  loadData();
  
  // Refresh charts after a short delay to ensure data is loaded
  setTimeout(() => {
    if (typeof updateAllCharts === 'function') {
      updateAllCharts(allData);
    }
  }, 2000);
}

// Print Water Usage Records Function
async function printWaterUsageRecords() {
  try {
    // Show loading state
    const printButton = document.querySelector('button[onclick="printWaterUsageRecords()"]');
    const originalText = printButton.innerHTML;
    printButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm sm:text-lg"></i><span class="font-semibold">Generating PDF...</span>';
    printButton.disabled = true;

    // Get the table element
    const tableElement = document.querySelector('table');
    if (!tableElement) {
      throw new Error('Table not found');
    }

    // Create a temporary container for the PDF content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '12px';
    tempContainer.style.lineHeight = '1.4';

    // Create the PDF header
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: bold;">Hydro Watch - Water Usage Records</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
    tempContainer.appendChild(header);

    // Clone the table and style it for PDF
    const tableClone = tableElement.cloneNode(true);
    tableClone.style.width = '100%';
    tableClone.style.borderCollapse = 'collapse';
    tableClone.style.marginTop = '20px';

    // Style the table headers
    const headers = tableClone.querySelectorAll('th');
    headers.forEach(header => {
      header.style.backgroundColor = '#3b82f6';
      header.style.color = 'white';
      header.style.padding = '12px 8px';
      header.style.textAlign = 'left';
      header.style.fontWeight = 'bold';
      header.style.fontSize = '12px';
      header.style.border = '1px solid #1e40af';
    });

    // Style the table cells
    const cells = tableClone.querySelectorAll('td');
    cells.forEach(cell => {
      cell.style.padding = '8px';
      cell.style.border = '1px solid #d1d5db';
      cell.style.fontSize = '11px';
    });

    // Style table rows
    const rows = tableClone.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      if (index % 2 === 0) {
        row.style.backgroundColor = '#f9fafb';
      }
    });

    tempContainer.appendChild(tableClone);

    // Add summary information
    const summary = document.createElement('div');
    summary.style.marginTop = '20px';
    summary.style.padding = '15px';
    summary.style.backgroundColor = '#f3f4f6';
    summary.style.borderRadius = '8px';
    summary.style.fontSize = '12px';

    const waterData = allData.filter(row => row.dataType === 'water');
    const totalUsage = waterData.reduce((sum, row) => sum + (row.Usage || 0), 0);
    const totalBill = waterData.reduce((sum, row) => sum + (row.Bill || 0), 0);
    const uniqueUsers = new Set(waterData.map(row => row.Name)).size;
    const uniqueMonths = new Set(waterData.map(row => row.Month)).size;
    
    // Calculate payment status statistics
    const paidRecords = waterData.filter(row => row.Usage != null && row.Usage !== 0).length;
    const pendingRecords = waterData.filter(row => row.Usage == null || row.Usage === 0).length;

    summary.innerHTML = `
      <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Summary</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div><strong>Total Records:</strong> ${waterData.length}</div>
        <div><strong>Unique Users:</strong> ${uniqueUsers}</div>
        <div><strong>Total Usage:</strong> ${totalUsage.toFixed(2)} m³</div>
        <div><strong>Total Bill:</strong> ₱${totalBill.toFixed(2)}</div>
        <div><strong>Months Covered:</strong> ${uniqueMonths}</div>
        <div><strong>Average Usage:</strong> ${(totalUsage / waterData.length).toFixed(2)} m³</div>
        <div><strong>Paid Records:</strong> ${paidRecords}</div>
        <div><strong>Pending Records:</strong> ${pendingRecords}</div>
      </div>
    `;
    tempContainer.appendChild(summary);

    // Add to document temporarily
    document.body.appendChild(tempContainer);

    // Generate PDF
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Remove temporary container
    document.body.removeChild(tempContainer);

    // Create PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 10; // 10mm top margin

    // Add first page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }

    // Save the PDF
    const fileName = `water_usage_records_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    // Reset button
    printButton.innerHTML = originalText;
    printButton.disabled = false;

    // Show success message
    alert('PDF generated successfully! The file has been downloaded.');

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
    
    // Reset button
    const printButton = document.querySelector('button[onclick="printWaterUsageRecords()"]');
    printButton.innerHTML = originalText;
    printButton.disabled = false;
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  feather.replace();
  init();
}); 