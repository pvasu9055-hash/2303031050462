const Log = require('./logger');

Log("backend", "info", "service", "Testing logger setup - first log entry").then(() => {
  console.log("Test complete");
});