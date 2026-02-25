// === Bandit Class ===
class Bandit {
  constructor(numArms) {
    this.numArms = numArms;
    // Track sum of rewards and count for each arm
    this.armData = Array.from({length: numArms}, () => ({
      sum: 0,
      count: 0,
      mean: 0
    }));
  }

  pickThompson() {
    // Sample from posterior normal distribution for each arm
    const sampledMeans = this.armData.map((data, i) => {
      const mean = data.count > 0 ? data.mean : this.trueParams[i].mean / 2;
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
      const mean = data.count > 0 ? data.mean : this.trueParams[i].mean / 2;
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
  }

  getEstimatedStats() {
    return this.armData.map(data => ({
      mean: data.mean.toFixed(0),
      count: data.count
    }));
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
const trueParams = [
  { mean: 400, stddev: 150 },  // Red strategy
  { mean: 600, stddev: 150 },  // Blue strategy
  { mean: 800, stddev: 150 }   // Green strategy
];
bandit.trueParams = trueParams;

const colors = ['#dc2626','#2563eb','#16a34a'];
const colorNames = ['Red', 'Blue', 'Green'];
let armRows = [];

// === Initialize visualization rows ===
function initializeArms() {
  const armsContainer = document.getElementById('arms-container');
  armsContainer.innerHTML = ''; // Clear existing
  armRows = [];
  
  for (let i = 0; i < numArms; i++) {
    const row = document.createElement('div');
    row.className = 'arm-row';

    const label = document.createElement('div');
    label.className = 'arm-label';
    label.textContent = colorNames[i];
    row.appendChild(label);

    const trueReturn = document.createElement('div');
    trueReturn.className = 'true-return';
    trueReturn.textContent = 'True Mean: ' + trueParams[i].mean;
    row.appendChild(trueReturn);

    const estimatedProbs = document.createElement('div');
    estimatedProbs.className = 'estimated-probs';
    estimatedProbs.textContent = 'Estimated: — (0 pulls)';
    row.appendChild(estimatedProbs);

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'dots-container';
    row.appendChild(dotsContainer);

    armsContainer.appendChild(row);
    armRows.push({ row, estimatedProbs, dotsContainer });
  }
}

// === Run one step of the demo ===
function runStep(){
  const algo = document.getElementById('algorithm').value;
  let arm;
  if(algo === 'thompson') arm = bandit.pickThompson();
  else arm = bandit.pickBayesianUCB();

  const reward = Math.max(0, Math.round(normalRandom(trueParams[arm].mean, trueParams[arm].stddev)));
  bandit.update(arm, reward);

  const dot = document.createElement('div');
  dot.className = 'dot';
  dot.style.backgroundColor = colors[arm];
  dot.title = 'Reward: +' + reward + ' vaccines';
  armRows[arm].dotsContainer.appendChild(dot);

  updateEstimatedStats();
}

function updateEstimatedStats() {
  const stats = bandit.getEstimatedStats();
  armRows.forEach((armRow, i) => {
    if (stats[i].count > 0) {
      armRow.estimatedProbs.textContent = `Estimated: ${stats[i].mean} (${stats[i].count} pulls)`;
    } else {
      armRow.estimatedProbs.textContent = `Estimated: — (0 pulls)`;
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeArms);
