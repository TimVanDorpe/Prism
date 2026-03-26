const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { addComparisonJob } = require('../services/queue');

const prisma = new PrismaClient();

async function compareArticle(req, res) {
  const { url } = req.body;
  const userId = req.user.id;

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const jobId = uuidv4();

  await prisma.comparison.create({
    data: { jobId, url, userId, status: 'pending' },
  });

  await addComparisonJob({ jobId, url, userId });

  res.status(202).json({ jobId, status: 'pending' });
}

async function getComparisonStatus(req, res) {
  const { jobId } = req.params;

  const comparison = await prisma.comparison.findUnique({
    where: { jobId },
  });

  if (!comparison) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(comparison);
}

module.exports = { compareArticle, getComparisonStatus };
