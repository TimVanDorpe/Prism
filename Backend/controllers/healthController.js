/**
 * Health Check Controller
 * Simple endpoint to verify server is running
 */

async function getHealth(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

module.exports = {
  getHealth
};
