// === Bandit Class ===
class Bandit {
  constructor(numArms) {
    this.numArms = numArms;
    // Track sum of rewards and count for each arm
    this.armData = Array.from({length: numArms}, () => ({
      sum: 0,
      count: 0,
      mean: 0,
      observations: [] // Store all observed rewards
    }));
  }

  pickThompson() {
    // Sample from posterior normal distribution for each arm
    const sampledMeans = this.armData.map((data, i) => {
      // Use uniform prior mean of 500 for all arms
      const priorMean = 500;
      const mean = data.count > 0 ? data.mean : priorMean;
      // Posterior standard deviation: use Bayesian update with normal likelihood
      // σ_posterior = σ_prior / sqrt(1 + n*σ_prior²/σ_data²)
      const posteriorVar = (this.trueParams[i].stddev ** 2) / (data.count + 1);
      const stddev = Math.sqrt(posteriorVar);
      // Sample from normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + z * stddev;
    });
    return sampledMeans.indexOf(Math.max(...sampledMeans));
  }

  pickBayesianUCB(q = 0.95) {
    const ucbValues = this.armData.map((data, i) => {
      // Use uniform prior mean of 500 for all arms
      const priorMean = 500;
      const mean = data.count > 0 ? data.mean : priorMean;
      // Posterior standard deviation with regularization
      const posteriorVar = (this.trueParams[i].stddev ** 2) / (data.count + 1);
      const stddev = Math.sqrt(posteriorVar);
      // UCB: mean + z-score * stddev
      return mean + 1.96 * stddev;
    });
    return ucbValues.indexOf(Math.max(...ucbValues));
  }

  update(arm, reward) {
    this.armData[arm].sum += reward;
    this.armData[arm].count += 1;
    this.armData[arm].mean = this.armData[arm].sum / this.armData[arm].count;
    this.armData[arm].observations.push(reward);
  }

  getEstimatedStats() {
    return this.armData.map(data => ({
      mean: data.mean.toFixed(0),
      count: data.count
    }));
  }

  getPosteriorParams() {
    return this.armData.map((data, i) => {
      // Use uniform prior mean of 500 for all arms
      const priorMean = 500;
      const mean = data.count > 0 ? data.mean : priorMean;
      const posteriorVar = (this.trueParams[i].stddev ** 2) / (data.count + 1);
      const stddev = Math.sqrt(posteriorVar);
      return { mean, stddev };
    });
  }
}

// Box-Muller transform for normal distribution
function normalRandom(mean = 0, stddev = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

// === Demo Setup ===
const numArms = 3;
const bandit = new Bandit(numArms);

// True parameters for each strategy (matching index.html)
const baseTrueParams = [
  { mean: 400, stddev: 150 },  // Red strategy
  { mean: 600, stddev: 150 },  // Blue strategy
  { mean: 800, stddev: 150 }   // Green strategy
];

function shuffleArray(values) {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseMeansFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const meansParam = params.get("means");
  if (!meansParam) return null;

  const meanValues = meansParam
    .split(",")
    .map(value => Number.parseInt(value.trim(), 10))
    .filter(value => Number.isFinite(value));

  if (meanValues.length !== baseTrueParams.length) return null;
  return meanValues;
}

function initializeTrueParams() {
  const meanValues = parseMeansFromQuery();
  const paramOrder = meanValues
    ? meanValues.map(mean => ({ mean, stddev: 150 }))
    : shuffleArray(baseTrueParams).map(param => ({ ...param }));

  return paramOrder;
}

const trueParams = initializeTrueParams();
bandit.trueParams = trueParams;

const colors = ['#dc2626','#2563eb','#16a34a'];
const colorNames = ['Red', 'Blue', 'Green'];
let armRows = [];
let beliefChart = null; // Store chart instance for smooth updates
let pullCountsChart = null; // Store pull counts chart instance

// === Initialize visualization ===
function initializeArms() {
  // Draw initial belief graph and pull counts
  drawBeliefGraph();
  drawPullCounts();
}

// === Run one step of the demo ===
function runStep(){
  const algo = document.getElementById('algorithm').value;
  let arm;
  if(algo === 'thompson') arm = bandit.pickThompson();
  else arm = bandit.pickBayesianUCB();

  const reward = Math.max(0, Math.round(normalRandom(trueParams[arm].mean, trueParams[arm].stddev)));
  bandit.update(arm, reward);

  // Removed dot display and arm row updates
  updateTotalStats();
  drawBeliefGraph();
  drawPullCounts();
}

function updateTotalStats() {
  const totalPulls = bandit.armData.reduce((sum, arm) => sum + arm.count, 0);
  const totalReward = bandit.armData.reduce((sum, arm) => sum + arm.sum, 0);
  
  document.getElementById('total-pulls').textContent = totalPulls;
  document.getElementById('total-reward').textContent = Math.round(totalReward).toLocaleString();
}

// === Draw belief distribution graph ===
function drawBeliefGraph() {
  const canvas = document.getElementById('belief-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Get posterior parameters
  const posteriors = bandit.getPosteriorParams();
  
  // X-axis range (0 to 1200 vaccines)
  const xMin = 0;
  const xMax = 1200;
  const step = 5;
  
  // Generate x values
  const xValues = [];
  for (let x = xMin; x <= xMax; x += step) {
    xValues.push(x);
  }
  
  // Create datasets for each arm
  const datasets = posteriors.map((posterior, i) => {
    const { mean, stddev } = posterior;
    
    // Generate probability density values
    const yValues = xValues.map(x => normalPDF(x, mean, stddev));
    
    return {
      label: colorNames[i],
      data: yValues,
      borderColor: colors[i],
      backgroundColor: colors[i] + '30', // Semi-transparent
      fill: true,
      tension: 0.4, // Smooth curves
      borderWidth: 3,
      pointRadius: 0, // No points on line
      pointHoverRadius: 0, // No points on hover either
      order: 1 // Draw distributions first
    };
  });
  
  // Create scatter datasets for observed data points
  const observationDatasets = bandit.armData.map((armData, i) => {
    // Create data points as {x: reward, y: 0} for each observation
    const scatterData = armData.observations.map(reward => ({
      x: reward,
      y: 0 // Place at the bottom of the chart
    }));
    
    return {
      label: `${colorNames[i]} Observations`,
      data: scatterData,
      type: 'scatter',
      backgroundColor: colors[i],
      borderColor: colors[i],
      pointStyle: 'cross',
      pointRadius: 8,
      pointHoverRadius: 10,
      pointBorderWidth: 2,
      order: 0, // Draw observations on top
      showLine: false
    };
  });
  
  // Plugin to draw vertical lines for true means
  const verticalLinePlugin = {
    id: 'verticalLines',
    afterDatasetsDraw: (chart) => {
      const ctx = chart.ctx;
      const xAxis = chart.scales.x;
      const yAxis = chart.scales.y;
      
      posteriors.forEach((posterior, i) => {
        const trueMean = trueParams[i].mean;
        const x = xAxis.getPixelForValue(trueMean);
        const yTop = yAxis.top;
        const yBottom = yAxis.bottom;
        
        ctx.save();
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBottom);
        ctx.stroke();
        ctx.restore();
      });
    }
  };
  
  // If chart exists, update it; otherwise create new
  if (beliefChart) {
    beliefChart.data.datasets = [...datasets, ...observationDatasets];
    beliefChart.update(); // Default animation mode for smooth morphing
  } else {
    beliefChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: xValues,
        datasets: [...datasets, ...observationDatasets],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'nearest',
          intersect: true,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 13,
                weight: 'bold',
                family: 'system-ui'
              },
              color: '#00628b',
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15,
              filter: function(item) {
                // Only show main distribution labels
                return !item.text.includes('Observations');
              }
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#0891b2',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              title: function(context) {
                if (context[0].dataset.label.includes('Observations')) {
                  return 'Observed Reward';
                }
                return `Vaccines: ${context[0].label}`;
              },
              label: function(context) {
                if (context.dataset.label.includes('Observations')) {
                  return `${context.dataset.label.replace(' Observations', '')}: ${Math.round(context.parsed.x)} vaccines`;
                }
                const value = context.parsed.y;
                return `${context.dataset.label}: ${(value * 1000).toFixed(3)}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: xMin,
            max: xMax,
            ticks: {
              stepSize: 200,
              color: '#666',
              font: {
                size: 12,
                family: 'system-ui'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              drawBorder: true,
            },
            title: {
              display: true,
              text: 'Vaccines Distributed',
              color: '#00628b',
              font: {
                size: 14,
                weight: 'bold',
                family: 'system-ui'
              },
              padding: 10
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#666',
              font: {
                size: 12,
                family: 'system-ui'
              },
              callback: function(value) {
                return (value * 1000).toFixed(1);
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              drawBorder: true,
            },
            title: {
              display: true,
              text: 'Probability Density (×10⁻³)',
              color: '#00628b',
              font: {
                size: 14,
                weight: 'bold',
                family: 'system-ui'
              },
              padding: 10
            }
          }
        }
      },
      plugins: [verticalLinePlugin]
    });
  }
}

// === Draw pull counts bar chart ===
function drawPullCounts() {
  const canvas = document.getElementById('pull-counts-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Get pull counts for each arm
  const pullCounts = bandit.armData.map(data => data.count);
  
  // If chart exists, update it; otherwise create new
  if (pullCountsChart) {
    pullCountsChart.data.datasets[0].data = pullCounts;
    pullCountsChart.update();
  } else {
    pullCountsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: colorNames,
        datasets: [{
          label: 'Number of Pulls',
          data: pullCounts,
          backgroundColor: colors.map(c => c + 'CC'), // Slightly transparent
          borderColor: colors,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#0891b2',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                return `Pulls: ${context.parsed.x}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: '#666',
              font: {
                size: 11,
                family: 'system-ui'
              },
              stepSize: 1
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            title: {
              display: true,
              text: 'Number of Pulls',
              color: '#00628b',
              font: {
                size: 12,
                weight: 'bold',
                family: 'system-ui'
              }
            }
          },
          y: {
            ticks: {
              color: '#00628b',
              font: {
                size: 12,
                weight: 'bold',
                family: 'system-ui'
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}

// Calculate normal probability density function
function normalPDF(x, mean, stddev) {
  const coefficient = 1 / (stddev * Math.sqrt(2 * Math.PI));
  const exponent = -((x - mean) ** 2) / (2 * stddev ** 2);
  return coefficient * Math.exp(exponent);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeArms);
