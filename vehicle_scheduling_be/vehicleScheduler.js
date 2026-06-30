const axios = require('axios');
const Log = require('./logger');

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzAzMDMxMDUwNDYyQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsImV4cCI6MTc4MjgxMDk2NiwiaWF0IjoxNzgyODEwMDY2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiMTQ5OTAxYWMtOTBhYi00M2JkLWFjMDktNzZkNzcwNWMwMmY1IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicHJua2V5IHNyaXZhc3UiLCJzdWIiOiI3MGNlYWFkOC03OTNiLTQ1ZDMtYjA5YS0yZjRkOTBiYmU0NWYifSwiZW1haWwiOiIyMzAzMDMxMDUwNDYyQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsIm5hbWUiOiJwcm5rZXkgc3JpdmFzdSIsInJvbGxObyI6IjIzMDMwMzEwNTA0NjIiLCJhY2Nlc3NDb2RlIjoiY0pxYUVCIiwiY2xpZW50SUQiOiI3MGNlYWFkOC03OTNiLTQ1ZDMtYjA5YS0yZjRkOTBiYmU0NWYiLCJjbGllbnRTZWNyZXQiOiJlVG5BZWZkVU5oQlZXQ1VUIn0.m28IlDjpjTaOEHS-muvRUPjU4bsP6ZhvX0bYnOVzJXc";

const headers = { Authorization: `Bearer ${TOKEN}` };

async function getDepots() {
  await Log("backend", "info", "service", "Fetching depot data from test server");
  const res = await axios.get('http://4.224.186.213/evaluation-service/depots', { headers });
  return res.data.depots;
}

async function getVehicles() {
  await Log("backend", "info", "service", "Fetching vehicle task data from test server");
  const res = await axios.get('http://4.224.186.213/evaluation-service/vehicles', { headers });
  return res.data.vehicles;
}

// Knapsack: maximize impact within mechanicHours budget
function solveKnapsack(tasks, budget) {
  const n = tasks.length;
  const dp = Array(n + 1).fill(null).map(() => Array(budget + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { Duration, Impact } = tasks[i - 1];
    for (let w = 0; w <= budget; w++) {
      if (Duration <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - Duration] + Impact);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  let selected = [];
  let w = budget;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(tasks[i - 1]);
      w -= tasks[i - 1].Duration;
    }
  }

  return { maxImpact: dp[n][budget], selectedTasks: selected };
}

async function main() {
  try {
    await Log("backend", "info", "service", "Starting vehicle scheduling computation");

    const depots = await getDepots();
    const vehicles = await getVehicles();

    console.log("Depots:", depots);
    console.log("Number of vehicle tasks:", vehicles.length);

    for (let depot of depots) {
      const result = solveKnapsack(vehicles, depot.MechanicHours);
      console.log(`\nDepot ${depot.ID} (budget ${depot.MechanicHours}h):`);
      console.log(`Max Impact = ${result.maxImpact}`);
      console.log(`Tasks selected: ${result.selectedTasks.length}`);
    }

    await Log("backend", "info", "service", "Vehicle scheduling computation completed successfully");
  } catch (err) {
    await Log("backend", "error", "service", `Error in vehicle scheduling: ${err.message}`);
    console.error("Error:", err.message);
  }
}

main();