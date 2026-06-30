const axios = require('axios');

const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzAzMDMxMDUwNDYyQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsImV4cCI6MTc4MjgwOTExOCwiaWF0IjoxNzgyODA4MjE4LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYTUzMjVmNDYtZGI5ZC00ZmUxLWIwZTctNzUwMWE5YmYzM2MwIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicHJua2V5IHNyaXZhc3UiLCJzdWIiOiI3MGNlYWFkOC03OTNiLTQ1ZDMtYjA5YS0yZjRkOTBiYmU0NWYifSwiZW1haWwiOiIyMzAzMDMxMDUwNDYyQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsIm5hbWUiOiJwcm5rZXkgc3JpdmFzdSIsInJvbGxObyI6IjIzMDMwMzEwNTA0NjIiLCJhY2Nlc3NDb2RlIjoiY0pxYUVCIiwiY2xpZW50SUQiOiI3MGNlYWFkOC03OTNiLTQ1ZDMtYjA5YS0yZjRkOTBiYmU0NWYiLCJjbGllbnRTZWNyZXQiOiJlVG5BZWZkVU5oQlZXQ1VUIn0.J2WgdL0_SIa2AV23T8cGpdyvQFGCpRPPWTjYvZU74wc";
async function Log(stack, level, packageName, message) {
  try {
    const response = await axios.post(
      LOG_API_URL,
      {
        stack: stack,
        level: level,
        package: packageName,
        message: message
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    console.log("Log created:", response.data.logID);
  } catch (err) {
    console.error("Logging failed:", err.message);
  }
}

module.exports = Log;