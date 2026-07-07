import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL: API_BASE });

// Use sessionStorage (per-window) rather than localStorage (shared across all
// tabs/windows of the profile). This lets you run the rider in one window and
// the driver in another simultaneously without their tokens clobbering each
// other.
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    sessionStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    sessionStorage.removeItem('token');
  }
}

const existing = sessionStorage.getItem('token');
if (existing) setAuthToken(existing);
