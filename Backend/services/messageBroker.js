const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://prism:prism@localhost:5672';
const REQUEST_QUEUE = 'comparison.requests';
const RESULT_QUEUE = 'comparison.results';

let channel = null;

async function connect() {
  const connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue(REQUEST_QUEUE, { durable: true });
  await channel.assertQueue(RESULT_QUEUE, { durable: true });

  console.log('✅ RabbitMQ connected');
  return channel;
}

function publishJob(job) {
  // job = { jobId, url, userId }
  channel.sendToQueue(
    REQUEST_QUEUE,
    Buffer.from(JSON.stringify(job)),
    { persistent: true }
  );
}

function consumeResults(handler) {
  // handler = async (result) => { ... }
  channel.consume(RESULT_QUEUE, async (msg) => {
    if (!msg) return;
    const result = JSON.parse(msg.content.toString());
    await handler(result);
    channel.ack(msg);
  });
}

module.exports = { connect, publishJob, consumeResults };
