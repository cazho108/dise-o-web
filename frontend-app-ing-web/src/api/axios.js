import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const instance = axios.create({ 
  baseURL: `${apiBaseUrl}/api`,
  timeout: 15000,  
  headers: {
    'Content-Type': 'application/json',
  },   
});
export default instance;