// API-Client. Demo-Auth: fester Nutzer u_anna (Produktion: echte Auth-Session).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export const USER_ID = 'u_anna';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': USER_ID,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('/users/me'),
  saveHobbies: (hobbies) => request('/users/me/hobbies', { method: 'PUT', body: { hobbies } }),
  events: (category) => request(`/events${category && category !== 'alle' ? `?category=${category}` : ''}`),
  event: (id) => request(`/events/${id}`),
  createEvent: (payload) => request('/events', { method: 'POST', body: payload }),
  join: (id) => request(`/events/${id}/join`, { method: 'POST' }),
  cancelPreview: (id) => request(`/events/${id}/cancel-preview`),
  cancel: (id) => request(`/events/${id}/cancel`, { method: 'POST' }),
  pendingFeedback: () => request('/feedback/pending'),
  sendFeedback: (payload) => request('/feedback', { method: 'POST', body: payload }),
  chats: () => request('/chats'),
  thread: (seriesId) => request(`/chats/${seriesId}/messages`),
  sendMessage: (seriesId, text) =>
    request(`/chats/${seriesId}/messages`, { method: 'POST', body: { text } }),
  markRead: (seriesId) => request(`/chats/${seriesId}/read`, { method: 'POST' }),
  verification: () => request('/verification'),
  matches: () => request('/matches'),
  suggestions: () => request('/users/me/suggestions'),
  badges: () => request('/users/me/badges'),
  saveAvailability: (payload) => request('/users/me/availability', { method: 'PUT', body: payload }),
  block: (userId) => request('/blocks', { method: 'POST', body: { userId } }),
  report: (payload) => request('/reports', { method: 'POST', body: payload }),
};

// Mini-Datenhook: lädt beim Mount und bei deps-Wechsel, mit reload().
// Sequenz-Token entwertet überholte Antworten (z. B. schneller Filterwechsel),
// damit eine langsame alte Antwort nie eine neuere überschreibt.
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const seq = useRef(0);
  useEffect(() => () => { alive.current = false; }, []);
  const load = useCallback(() => {
    const token = ++seq.current;
    const fresh = () => alive.current && seq.current === token;
    setLoading(true);
    return fn()
      .then((d) => fresh() && (setData(d), setError(null)))
      .catch((e) => fresh() && setError(e))
      .finally(() => fresh() && setLoading(false));
    // Generischer Datenhook: Deps kommen bewusst vom Aufrufer
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

// Live-Updates (Chat, Push-Stub) über WebSocket
export function wsUrl() {
  return `${BASE.replace(/^http/, 'ws')}/ws?userId=${USER_ID}`;
}
