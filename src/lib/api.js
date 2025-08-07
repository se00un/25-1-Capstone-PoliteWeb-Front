// src/lib/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
console.log("API_BASE:", API_BASE);  
const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(config => {
  console.log("요청 URL:", config.baseURL + config.url);
  return config;
});

export default api;