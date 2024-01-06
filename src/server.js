const mqtt = require('mqtt');
const mysql = require('mysql2');

// Load environment variables
const {
  MQTT_BROKER_URL,
  MQTT_USERNAME="",
  MQTT_PASSWORD="",
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  HUB_MQTT_TOPIC
} = process.env;

// Create a MySQL connection pool
const dbPool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});

// Create an MQTT client
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

// Connect to the MQTT broker
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Query devices from the database
  dbPool.query('SELECT * FROM mqtt_devices', (error, results) => {
    if (error) {
      console.error('Error querying devices from the database:', error);
      return;
    }

    // Subscribe to each device's MQTT topic
    results.forEach((device) => {
      const { name, type, mqtt_topic } = device;
      const deviceClient = mqtt.connect(MQTT_BROKER_URL, {
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
      });

      deviceClient.on('connect', () => {
        console.log(`Connected to MQTT broker for device ${name}`);

        // Subscribe to the device's MQTT topic
        deviceClient.subscribe(mqtt_topic);

        // Handle incoming messages for the device
        deviceClient.on('message', (topic, message) => {
          // Broadcast the message to the hub topic with device information
          const hubMessage = {
            name,
            type,
            message: message.toString(),
          };
          mqttClient.publish(HUB_MQTT_TOPIC, JSON.stringify(hubMessage));
        });
      });
    });
  });
});

// Handle MQTT connection errors
mqttClient.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

// Handle MySQL connection errors
dbPool.on('error', (error) => {
  console.error('MySQL connection error:', error);
});