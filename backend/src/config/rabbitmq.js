const amqp = require('amqplib');

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://securedocs:securedocs_pass@127.0.0.1:5672';
    
    connection = await amqp.connect(rabbitMqUrl);
    channel = await connection.createChannel();
    
    console.log('✅ Connected to RabbitMQ');

    // Handle connection errors
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed, attempting to reconnect...');
      setTimeout(connectRabbitMQ, 5000);
    });

    return channel;
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    // Don't throw - we want the app to start even if RabbitMQ is down (graceful degradation)
    return null;
  }
};

const getChannel = () => channel;
const getConnection = () => connection;

module.exports = {
  connectRabbitMQ,
  getChannel,
  getConnection
};
