const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const comparisonQueue = new Queue('comparisons', { connection });

async function addComparisonJob({ jobId, url, userId }) {
  await comparisonQueue.add('compare', { jobId, url, userId }, { jobId });
}

module.exports = { comparisonQueue, addComparisonJob };
