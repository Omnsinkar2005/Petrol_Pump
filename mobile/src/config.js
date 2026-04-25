/**
 * App configuration.
 *
 *  ***  IMPORTANT  ***
 *  Replace LAN_IP with your laptop's LAN IP (from `ipconfig`).
 *  Your phone (running Expo Go) reaches the backend through this IP,
 *  NOT through "localhost" (localhost on the phone = the phone itself).
 *
 *  Example: 'http://192.168.1.42:5000/api'
 */

const LAN_IP = '172.25.81.192'; // <-- CHANGE THIS
const PORT = 5000;

export const API_URL = `http://${LAN_IP}:${PORT}/api`;

export const APP_NAME = 'Petrol Pump';
