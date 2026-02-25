let round = 1;
let score = 0;
let totalRounds = 2; // Parameterized total rounds allowed

// Means and standard deviations for normally distributed rewards
const interventionParams = [
  { mean: 400, stddev: 150 },  // Intervention 1: mean 400, stddev 150
  { mean: 600, stddev: 150 },  // Intervention 2: mean 600, stddev 150
  { mean: 800, stddev: 150 }   // Intervention 3: mean 800, stddev 150
];

// Box-Muller transform to generate normally distributed random numbers
function normalRandom(mean = 0, stddev = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}


// Map keys to reel indices
const keyBindings = {
  KeyA: 0, // 'A' key for the left reel
  KeyS: 1, // 'S' key for the middle reel
  KeyD: 2  // 'D' key for the right reel
};


function pull(i) {
  if (round > totalRounds) return;

  // Generate normally distributed reward
  const { mean, stddev } = interventionParams[i];
  const reward = Math.max(0, Math.round(normalRandom(mean, stddev)));
  score += reward;

  showInterventionOverlay(i, reward);

  document.getElementById("reward").textContent = `Last reward: +${reward} vaccines`;
  document.getElementById("score").textContent = `Total vaccines: ${score}`;

  round++;
  document.getElementById("round").textContent = `Round ${Math.min(round, totalRounds)} / ${totalRounds}`;

  if (round > totalRounds) {
    setTimeout(showBayesDemo, 2500);
  }
}

function showInterventionOverlay(interventionIndex, reward) {
  const buttons = document.querySelectorAll("button");
  buttons.forEach(button => button.style.visibility = "hidden");

  // Create backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "intervention-overlay";

  const statusDiv = document.createElement("div");
  statusDiv.className = "status";
  statusDiv.textContent = "Applying intervention...";

  overlay.appendChild(statusDiv);

  // Add to DOM
  document.body.appendChild(backdrop);
  document.body.appendChild(overlay);

  // Show reward after 1.5 seconds
  setTimeout(() => {
    const rewardDiv = document.createElement("div");
    rewardDiv.className = "reward";
    rewardDiv.textContent = `+${reward} vaccines`;
    overlay.appendChild(rewardDiv);
  }, 1500);

  // Remove overlay after 2.5 seconds
  setTimeout(() => {
    backdrop.remove();
    overlay.remove();
    buttons.forEach(button => button.style.visibility = "visible");
  }, 2500);
}

function showBayesDemo() {
  const buttons = document.querySelectorAll("button");
  buttons.forEach(button => button.style.visibility = "hidden");

  // Show modal and backdrop
  document.getElementById("final-score-modal").style.display = "block";
  document.getElementById("overlay-backdrop").style.display = "block";

  // Update final score
  document.getElementById("final-score").textContent = score;
}

function goFullscreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
}

function resetGame() {
  round = 1;
  score = 0;

  // Hide modal and backdrop
  document.getElementById("final-score-modal").style.display = "none";
  document.getElementById("overlay-backdrop").style.display = "none";

  // Reset UI elements
  document.getElementById("reward").textContent = "Last reward: –";
  document.getElementById("score").textContent = "Total vaccines: 0";
  document.getElementById("round").textContent = `Round 1 / ${totalRounds}`;

  // Enable buttons
  const buttons = document.querySelectorAll("button");
  buttons.forEach(button => button.style.visibility = "visible");
}

// Add event listener for keypresses
document.addEventListener("keydown", (event) => {
  const reelIndex = keyBindings[event.code];
  if (reelIndex !== undefined) {
    pull(reelIndex);
  }
});
