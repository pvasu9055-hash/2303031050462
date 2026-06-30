const axios = require('axios');
const Log = require('./logger');

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzAzMDMxMDUwNDYyQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsImV4cCI6MTc4MjgwOTExOCwiaWF0IjoxNzgyODA4MjE4LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYTUzMjVmNDYtZGI5ZC00ZmUxLWIwZTctNzUwMWE5YmYzM2MwIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicHJua2V5IHNyaXZhc3UiLCJzdWIiOiI3MGNlYWFkOC03OTNiLTQ1ZDMtYjA5YS0yZjRkOTBiYmU0NWYifSwiZW1haWwiOiIyMzAzMDMxMDUwNDYyQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsIm5hbWUiOiJwcm5rZXkgc3JpdmFzdSIsInJvbGxObyI6IjIzMDMwMzEwNTA0NjIiLCJhY2Nlc3NDb2RlIjoiY0pxYUVCIiwiY2xpZW50SUQiOiI3MGNlYWFkOC03OTNiLTQ1ZDMtYjA5YS0yZjRkOTBiYmU0NWYiLCJjbGllbnRTZWNyZXQiOiJlVG5BZWZkVU5oQlZXQ1VUIn0.J2WgdL0_SIa2AV23T8cGpdyvQFGCpRPPWTjYvZU74wc";
const headers = { Authorization: `Bearer ${TOKEN}` };

const TYPE_WEIGHT = { "Placement": 3, "Result": 2, "Event": 1 };

async function getNotifications() {
  await Log("backend", "info", "service", "Fetching notifications from test server");
  const res = await axios.get('http://4.224.186.213/evaluation-service/notifications', { headers });
  return res.data.notifications;
}

function getTopN(notifications, n) {
  const sorted = [...notifications].sort((a, b) => {
    const weightDiff = (TYPE_WEIGHT[b.Type] || 0) - (TYPE_WEIGHT[a.Type] || 0);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.Timestamp) - new Date(a.Timestamp);
  });
  return sorted.slice(0, n);
}

async function main() {
  try {
    await Log("backend", "info", "controller", "Starting priority inbox computation");

    const notifications = await getNotifications();
    console.log("Total notifications fetched:", notifications.length);

    const n = 10; // top 10 notifications
    const topN = getTopN(notifications, n);

    console.log(`\nTop ${n} Priority Notifications:`);
    topN.forEach((notif, i) => {
      console.log(`${i + 1}. [${notif.Type}] ${notif.Message} (${notif.Timestamp})`);
    });

    await Log("backend", "info", "controller", "Priority inbox computation completed successfully");
  } catch (err) {
    await Log("backend", "error", "controller", `Error in priority inbox: ${err.message}`);
    console.error("Error:", err.message);
  }
}

main();