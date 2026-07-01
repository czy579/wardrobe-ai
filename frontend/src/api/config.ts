declare global { interface Window { __API_URL__?: string } }
export const BASE_URL = window.__API_URL__ || `http://${window.location.hostname}:8000`
