// Graphs.js - Chart visualization logic for water usage and electricity data
// Using Chart.js for beautiful, interactive charts

// Chart.js CDN will be loaded in HTML
let waterUsageChart = null;
let electricityChart = null;
let waterUsagePieChart = null;

// Chart configuration and styling
const chartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#374151',
        font: {
          family: 'Inter, sans-serif',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1f2937',
      bodyColor: '#374151',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      titleFont: {
        family: 'Inter, sans-serif',
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        family: 'Inter, sans-serif',
        size: 12
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(156, 163, 175, 0.2)'
      },
      ticks: {
        color: '#6b7280',
        font: {
          family: 'Inter, sans-serif',
          size: 11
        }
      }
    },
    y: {
      grid: {
        color: 'rgba(156, 163, 175, 0.2)'
      },
      ticks: {
        color: '#6b7280',
        font: {
          family: 'Inter, sans-serif',
          size: 11
        }
      }
    }
  }
};

// Initialize charts when DOM is loaded
function initializeCharts() {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Please check the CDN link.');
    return;
  }

    // Water Usage Chart
  const waterCtx = document.getElementById('waterUsageChart');
  if (waterCtx) {
    try {
      waterUsageChart = new Chart(waterCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          ...chartConfig,
          plugins: {
            ...chartConfig.plugins,
            title: {
              display: true,
              text: 'Total Water Usage Trends (All Users Combined)',
              color: '#1f2937',
              font: {
                family: 'Inter, sans-serif',
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            ...chartConfig.scales,
            y: {
              ...chartConfig.scales.y,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Usage (m³)',
                color: '#374151',
                font: {
                  family: 'Inter, sans-serif',
                  size: 12,
                  weight: 'bold'
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error initializing water usage chart:', error);
    }
  }

  // Electricity Chart
  const electricityCtx = document.getElementById('electricityChart');
  if (electricityCtx) {
    try {
      electricityChart = new Chart(electricityCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        ...chartConfig,
        plugins: {
          ...chartConfig.plugins,
          title: {
            display: true,
            text: 'Electricity Consumption',
            color: '#1f2937',
            font: {
              family: 'Inter, sans-serif',
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          ...chartConfig.scales,
          y: {
            ...chartConfig.scales.y,
            title: {
              display: true,
              text: 'Power Consumption (kWh)',
              color: '#374151',
              font: {
                family: 'Inter, sans-serif',
                size: 12,
                weight: 'bold'
              }
            }
          }
        }
      }
    });
    } catch (error) {
      console.error('Error initializing electricity chart:', error);
    }
  }

  // Water Usage Pie Chart
  const pieCtx = document.getElementById('waterUsagePieChart');
  if (pieCtx) {
    try {
             waterUsagePieChart = new Chart(pieCtx, {
         type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
              '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
              '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
              '#F9E79F', '#A9CCE3', '#FAD7A0', '#D5A6BD', '#AED6F1'
            ],
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
                 options: {
           ...chartConfig,
           plugins: {
             ...chartConfig.plugins,
             title: {
               display: true,
               text: 'Water Usage by User',
               color: '#1f2937',
               font: {
                 family: 'Inter, sans-serif',
                 size: 16,
                 weight: 'bold'
               }
             },
             legend: {
               position: 'bottom',
               labels: {
                 padding: 20,
                 usePointStyle: true,
                 pointStyle: 'circle'
               }
             }
           },
           scales: {
             x: {
               display: false
             },
             y: {
               display: false
             }
           },
           responsive: true,
           maintainAspectRatio: false
         }
      });
    } catch (error) {
      console.error('Error initializing water usage pie chart:', error);
    }
  }
}

// Process water data for charts
function processWaterDataForCharts(data) {
  const waterData = data.filter(row => row.dataType === 'water');
  
  // Group by month and calculate total usage
  const monthlyUsage = {};
  const names = new Set();
  
  waterData.forEach(row => {
    if (row.Usage !== null && row.Usage !== 0) {
      if (!monthlyUsage[row.Month]) {
        monthlyUsage[row.Month] = {
          total: 0,
          count: 0,
          names: new Set(),
          userCount: 0
        };
      }
      monthlyUsage[row.Month].total += row.Usage;
      monthlyUsage[row.Month].count += 1;
      monthlyUsage[row.Month].names.add(row.Name);
      names.add(row.Name);
    }
  });

  // Calculate user count for each month
  Object.keys(monthlyUsage).forEach(month => {
    monthlyUsage[month].userCount = monthlyUsage[month].names.size;
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyUsage).sort((a, b) => {
    return parseMonthNum(a) - parseMonthNum(b);
  });

  // Take only the last 4 months
  const last4Months = sortedMonths.slice(-4);

  return {
    labels: last4Months.map(month => monthToWord(month)),
    data: last4Months.map(month => monthlyUsage[month].total),
    userCounts: last4Months.map(month => monthlyUsage[month].userCount),
    names: Array.from(names),
    monthlyDetails: last4Months.map(month => ({
      month: month,
      total: monthlyUsage[month].total,
      userCount: monthlyUsage[month].userCount,
      averagePerUser: monthlyUsage[month].total / monthlyUsage[month].userCount
    }))
  };
}

// Process electricity data for charts
function processElectricityDataForCharts(data) {
  const electricityData = data.filter(row => row.dataType === 'electricity');
  
  // Sort by month
  const sortedData = electricityData.sort((a, b) => {
    return parseMonthNum(a.Month) - parseMonthNum(b.Month);
  });

  return {
    labels: sortedData.map(row => monthToWord(row.Month)),
    powerConsumption: sortedData.map(row => row.PowerConsumption || 0),
    electricityReading: sortedData.map(row => row.ElectricityReading || 0),
    costImpact: sortedData.map(row => row.CostImpact || 0)
  };
}

// Update water usage chart
function updateWaterUsageChart(data) {
  if (!waterUsageChart) return;

  const processedData = processWaterDataForCharts(data);
  
  waterUsageChart.data.labels = processedData.labels;
  waterUsageChart.data.datasets = [{
    label: 'Total Water Usage (All Users)',
    data: processedData.data,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderColor: '#3b82f6',
    borderWidth: 2,
    borderRadius: 4,
    borderSkipped: false
  }];

  // Update chart title and tooltip
  waterUsageChart.options.plugins.title.text = 'Total Water Usage Trends (All Users Combined)';
  waterUsageChart.options.plugins.tooltip.callbacks = {
    label: function(context) {
      const monthIndex = context.dataIndex;
      const monthlyDetail = processedData.monthlyDetails[monthIndex];
      const totalUsage = context.parsed.y;
      
      return [
        `Total Usage: ${totalUsage.toFixed(2)} m³`,
        `Users: ${monthlyDetail.userCount}`,
        `Average per User: ${monthlyDetail.averagePerUser.toFixed(2)} m³`
      ];
    }
  };

  waterUsageChart.update();
}

// Update electricity chart
function updateElectricityChart(data) {
  if (!electricityChart) return;

  const processedData = processElectricityDataForCharts(data);
  
  electricityChart.data.labels = processedData.labels;
  electricityChart.data.datasets = [
    {
      label: 'Power Consumption',
      data: processedData.powerConsumption,
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: '#22c55e',
      borderWidth: 2,
      borderRadius: 4
    }
  ];

  electricityChart.update();
}

// Process water data for pie chart
function processWaterDataForPieChart(data, selectedMonth = '') {
  const waterData = data.filter(row => row.dataType === 'water');
  
  // Group by user and calculate total usage
  const userUsage = {};
  
  waterData.forEach(row => {
    if (row.Usage !== null && row.Usage !== 0) {
      // If a specific month is selected, only include that month
      if (selectedMonth && row.Month !== selectedMonth) {
        return;
      }
      
      if (!userUsage[row.Name]) {
        userUsage[row.Name] = {
          total: 0,
          count: 0
        };
      }
      userUsage[row.Name].total += row.Usage;
      userUsage[row.Name].count += 1;
    }
  });

  // Sort users by usage (descending)
  const sortedUsers = Object.keys(userUsage).sort((a, b) => {
    return userUsage[b].total - userUsage[a].total;
  });

  return {
    labels: sortedUsers,
    data: sortedUsers.map(user => userUsage[user].total)
  };
}

// Update water usage pie chart
function updateWaterUsagePieChart(data) {
  if (!waterUsagePieChart) return;

  // Get the selected month from the pie chart filter
  const pieChartMonthFilter = document.getElementById('pieChartMonthFilter');
  const selectedMonth = pieChartMonthFilter ? pieChartMonthFilter.value : '';

  const processedData = processWaterDataForPieChart(data, selectedMonth);
  
  waterUsagePieChart.data.labels = processedData.labels;
  waterUsagePieChart.data.datasets[0].data = processedData.data;

  waterUsagePieChart.update();
}

// Update all charts with new data
function updateAllCharts(data) {
  updateWaterUsageChart(data);
  updateElectricityChart(data);
  updateWaterUsagePieChart(data);
}

// Helper function to format month names
function monthToWord(monthStr) {
  if (!monthStr) return "";
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const monthNum = parseInt(parts[0], 10);
  const year = parts[1];
  if (monthNum < 1 || monthNum > 12) return monthStr;
  
  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  return `${monthNames[monthNum]} ${year}`;
}

// Helper function to parse month number
function parseMonthNum(monthStr) {
  if (!monthStr) return 0;
  const parts = monthStr.split('-');
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
    return 0;
  }
  return y * 12 + m;
}

// Export functions for use in main script
window.initializeCharts = initializeCharts;
window.updateAllCharts = updateAllCharts;
window.updateWaterUsageChart = updateWaterUsageChart;
window.updateElectricityChart = updateElectricityChart;
window.updateWaterUsagePieChart = updateWaterUsagePieChart; 