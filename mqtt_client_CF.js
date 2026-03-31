import mqtt from 'mqtt';
import express from 'express';
import dotenv from "dotenv";
dotenv.config();


// mqtt 브로커
const options = {
    // username: 'fanzic_mqtt',
    // password: 'voswlr2025',
    username: process.env.BROKER_USERNAME,
    password: process.env.BROKER_PASSWORD
};

const brokerUrl = process.env.BROKER_URL;
//const brokerUrl = 'mqtt://13.209.148.81:1883';  // 브로커 URL
// const brokerUrl = 'mqtt://54.180.156.166:1883';  // 브로커 URL
// const brokerUrl = 'mqtt://52.79.185.204:1883';  // 작은서버 브로커 URL

const client = mqtt.connect(brokerUrl, options);


client.on('connect', () => {
    console.log(`mqtt_client_CF::Connected to MQTT broker as client ID: ${client.options.clientId}`);
    //const subTopic = 'fan/+/+/res'; //fan/0/FANZIC_AFM0000/res
    const subTopic = 'FANZIC_CF/+/dat'; //fan/0/FANZIC_AFM0000/res
    client.subscribe(subTopic);

  });
  
  client.on('error', (err) => {
    console.error('MQTT connection error:', err);
  });
  
  export default client;