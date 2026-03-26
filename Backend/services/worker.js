const { Worker } = require('bullmq');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

const worker = new Worker('comparisons', async (job) => {
  const { jobId, url, userId } = job.data;

  const { data } = await axios.post(`${PYTHON_SERVICE_URL}/run-comparison`, {
    jobId, url, userId,
  });

  await prisma.comparison.update({
    where: { jobId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      originalScore: data.originalScore,
      originalLeaning: data.originalLeaning,
      originalSummary: data.originalSummary,
      relatedArticles: data.relatedArticles,
      costUsd: data.costUsd,
    },
  });
}, { connection });

worker.on('completed', (job) => {
  console.log(`✅ Comparison job ${job.data.jobId} completed`);
});

worker.on('failed', (job, err) => {
  prisma.comparison.update({
    where: { jobId: job.data.jobId },
    data: { status: 'failed', errorMessage: err.message, completedAt: new Date() },
  }).catch(() => {});
  console.error(`❌ Comparison job ${job.data.jobId} failed:`, err.message);
});

module.exports = worker;
