import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

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
