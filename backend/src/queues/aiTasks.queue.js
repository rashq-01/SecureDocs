const { getChannel } = require('../config/rabbitmq.js');

const AI_TASK_QUEUE = 'ai_tasks_queue';

const publishAITask = async (type, payload) => {
  try {
    const channel = getChannel();
    if (!channel) {
      console.warn(`[RabbitMQ] Channel not available. Dropping AI task of type: ${type}`);
      return false;
    }

    await channel.assertQueue(AI_TASK_QUEUE, {
      durable: true // Messages survive broker restarts
    });

    const message = {
      type,
      payload,
      requestedAt: new Date().toISOString()
    };

    // Buffer.from requires string
    const sent = channel.sendToQueue(
      AI_TASK_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    if (sent) {
      console.log(`[RabbitMQ] Published ${type} task to queue`);
    }
    return sent;
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish ${type} task:`, error);
    return false; // Crucial: don't throw, just fail gracefully so core flow continues
  }
};

module.exports = {
  AI_TASK_QUEUE,
  publishAITask
};
