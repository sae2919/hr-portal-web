import axios from 'axios';

const axiosInstance = axios.create({
  // Crucial: Ensure your base URL includes the standard '/api' suffix 
  // so that calling '/v1/dashboard/stats' maps accurately to '/api/v1/dashboard/stats'
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api',
  withCredentials: true, 
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default axiosInstance;