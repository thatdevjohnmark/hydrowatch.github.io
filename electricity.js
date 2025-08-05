// Electricity Dashboard Functions
// Clean version without debugging code

// Utility Functions
function parseElectricityCSV(text) {
  try {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines.shift().split(',').map(h => h.trim());
    
    const validRows = lines
      .filter(line => line.trim() !== '')
      .map((line, index) => {
        try {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((header, i) => {
            obj[header] = values[i] !== undefined ? values[i] : "";
          });
          
          // Handle different date formats
          let monthStr = obj['Month'] || obj['month'];
          if (!monthStr) return null;
          
          if (!/^\d{2}-\d{4}$/.test(monthStr)) {
            const dateMatch = monthStr.match(/(\d{1,2})[/-](\d{4})/);
            if (dateMatch) {
              monthStr = `${dateMatch[1].padStart(2, '0')}-${dateMatch[2]}`;
            } else {
              return null;
            }
          }
          
          // Parse numeric values - handle comma-separated numbers
          const parseNumber = (value) => {
            if (!value || value.trim() === '') return null;
            const cleanValue = value.replace(/,/g, '');
            const parsed = parseFloat(cleanValue);
            return isNaN(parsed) ? null : parsed;
          };
          
          const powerConsumption = parseNumber(obj['Power Consumption'] || obj['power consumption']);
          const electricityReading = parseNumber(obj['Electricity Reading'] || obj['electricity reading']);
          const costImpact = parseNumber(obj['Cost Impact'] || obj['cost impact']);
          const powerGenerationCost = parseNumber(obj['Power Generation Cost'] || obj['power generation cost']);
          
          return {
            Month: monthStr,
            PowerConsumption: powerConsumption,
            ElectricityReading: electricityReading,
            CostImpact: costImpact,
            PowerGenerationCost: powerGenerationCost,
            dataType: 'electricity'
          };
        } catch (error) {
          return null;
        }
      })
      .filter(row => row !== null);
    
    return validRows;
  } catch (error) {
    return [];
  }
}

// Function to update the electricity dashboard card
function updateElectricityDashboardCard(selectedMonth = null) {
  // Get electricity data from the global allData (if available)
  let electricityData = [];
  if (typeof allData !== 'undefined') {
    electricityData = allData.filter(row => row.dataType === 'electricity');
  }
  
  // Filter by selected month if specified
  if (selectedMonth) {
    electricityData = electricityData.filter(row => row.Month === selectedMonth);
  }
  
  // Get the data for the selected month (or latest if no month selected)
  let selectedElectricityData = null;
  
  if (electricityData.length > 0) {
    if (selectedMonth) {
      selectedElectricityData = electricityData[0];
    } else {
      // Get the latest entry by month
      selectedElectricityData = electricityData.reduce((latest, current) => {
        const currentMonthNum = parseMonthNum(current.Month);
        const latestMonthNum = parseMonthNum(latest.Month);
        return currentMonthNum > latestMonthNum ? current : latest;
      });
    }
  }
  
  // Get previous month data for trend calculation
  let previousMonthData = null;
  if (selectedElectricityData && typeof allData !== 'undefined') {
    const previousData = getPreviousMonthData(allData, selectedElectricityData.Month, 'electricity');
    if (previousData.length > 0) {
      previousMonthData = previousData[0];
    }
  }
  
  // Update dashboard elements
  const monthElement = document.getElementById('dashboard-month');
  const powerConsumptionElement = document.getElementById('dashboard-power-consumption');
  const electricityReadingElement = document.getElementById('dashboard-electricity-reading');
  const costImpactElement = document.getElementById('dashboard-cost-impact');
  const powerGenerationCostElement = document.getElementById('dashboard-power-generation-cost');
  
  if (selectedElectricityData) {
    // Update month
    if (monthElement) {
      monthElement.textContent = monthToWord(selectedElectricityData.Month);
    }
    
    // Update power consumption with trend
    if (powerConsumptionElement) {
      const powerConsumption = selectedElectricityData.PowerConsumption;
      const previousPowerConsumption = previousMonthData ? previousMonthData.PowerConsumption : null;
      const trend = calculateTrend(powerConsumption, previousPowerConsumption);
      
      if (powerConsumption !== null && powerConsumption !== undefined) {
        powerConsumptionElement.innerHTML = `
          <div class="flex items-center justify-center space-x-2">
            <span>${formatNumber(powerConsumption)} kWh</span>
            <span class="${trend.color} text-lg font-bold">${trend.arrow}</span>
            ${trend.percentage > 0 ? `<span class="text-xs ${trend.color}">${trend.percentage}%</span>` : ''}
          </div>
        `;
      } else {
        powerConsumptionElement.textContent = 'N/A';
      }
    }
    
    // Update electricity reading
    if (electricityReadingElement) {
      const electricityReading = selectedElectricityData.ElectricityReading;
      if (electricityReading !== null && electricityReading !== undefined) {
        electricityReadingElement.textContent = formatNumber(electricityReading);
      } else {
        electricityReadingElement.textContent = 'N/A';
      }
    }
    
    // Update cost impact with trend
    if (costImpactElement) {
      const costImpact = selectedElectricityData.CostImpact;
      const previousCostImpact = previousMonthData ? previousMonthData.CostImpact : null;
      const trend = calculateTrend(costImpact, previousCostImpact);
      
      if (costImpact !== null && costImpact !== undefined) {
        costImpactElement.innerHTML = `
          <div class="flex items-center justify-center space-x-2">
            <span>₱${formatNumber(costImpact)}</span>
            <span class="${trend.color} text-lg font-bold">${trend.arrow}</span>
            ${trend.percentage > 0 ? `<span class="text-xs ${trend.color}">${trend.percentage}%</span>` : ''}
          </div>
        `;
      } else {
        costImpactElement.textContent = 'N/A';
      }
    }
    
    // Update power generation cost
    if (powerGenerationCostElement) {
      const powerGenerationCost = selectedElectricityData.PowerGenerationCost;
      if (powerGenerationCost !== null && powerGenerationCost !== undefined) {
        powerGenerationCostElement.textContent = `₱${formatNumber(powerGenerationCost)}`;
      } else {
        powerGenerationCostElement.textContent = 'N/A';
      }
    }
  } else {
    // Clear all elements if no data
    if (monthElement) monthElement.textContent = 'N/A';
    if (powerConsumptionElement) powerConsumptionElement.textContent = 'N/A';
    if (electricityReadingElement) electricityReadingElement.textContent = 'N/A';
    if (costImpactElement) costImpactElement.textContent = 'N/A';
    if (powerGenerationCostElement) powerGenerationCostElement.textContent = 'N/A';
  }
}

// Helper function to convert month string to word
function monthToWord(monthStr) {
  if (!monthStr) return 'N/A';
  
  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const match = monthStr.match(/(\d{1,2})-\d{4}/);
  if (match) {
    const monthNum = parseInt(match[1]);
    return monthNames[monthNum] || 'Unknown';
  }
  
  return monthStr;
}

// Helper function to parse month number
function parseMonthNum(monthStr) {
  if (!monthStr) return 0;
  
  const match = monthStr.match(/(\d{1,2})-\d{4}/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return 0;
}

// Helper function to format numbers
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return 'N/A';
  }
  
  // Handle decimal numbers properly
  if (num % 1 !== 0) {
    return num.toFixed(2);
  }
  
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Fetch and display electricity data from Google Sheets CSV
const ELECTRICITY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrGNK29KMXQ_o2K1raxL4Q2ody_TQv1zw3HKFXY_WuVHVSwnu0gaqeoU15nh7-wngu1oXI2rpIZxJn/pub?output=csv';

let electricityData = [];

// Initialize electricity dashboard when DOM is loaded
window.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for the main script to load data
  setTimeout(() => {
    updateElectricityDashboardCard();
  }, 1000);
});

// Export functions for use in main script
window.updateElectricityDashboardCard = updateElectricityDashboardCard;
window.parseElectricityCSV = parseElectricityCSV;