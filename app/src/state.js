// Leichter App-State: Profil, Onboarding-Status, Feedback-Banner, WS-Verbindung.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, wsUrl } from './api';

const AppState = createContext(null);

export function AppStateProvider({ children }) {
  const [me, setMe] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [pendingFb, setPendingFb] = useState([]);
  const [fbThanks, setFbThanks] = useState(false);
  const [wsEvent, setWsEvent] = useState(null); // letztes Live-Event (Chat/Push)
  const wsRef = useRef(null);

  // Stabile Identitäten — Konsumenten dürfen sie gefahrlos in Effect-Deps nehmen
  const reloadMe = useCallback(() => api.me().then(setMe).catch(() => {}), []);
  const reloadPendingFb = useCallback(() => api.pendingFeedback().then(setPendingFb).catch(() => {}), []);

  useEffect(() => {
    reloadMe();
    reloadPendingFb();
  }, [reloadMe, reloadPendingFb]);

  // Live-Updates (Chat-Nachrichten, Push-Stub) mit Reconnect.
  // ws:open signalisiert Konsumenten, nach einer Downtime nachzuladen.
  useEffect(() => {
    let closed = false;
    let timer = null;
    function connect() {
      if (closed) return;
      try {
        const ws = new WebSocket(wsUrl());
        wsRef.current = ws;
        ws.onopen = () => { if (!closed) setWsEvent({ type: 'ws:open', at: Date.now() }); };
        ws.onmessage = (e) => {
          if (closed) return;
          try { setWsEvent({ ...JSON.parse(e.data), at: Date.now() }); } catch {}
        };
        ws.onclose = () => { if (!closed) timer = setTimeout(connect, 3000); };
      } catch {}
    }
    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  const value = useMemo(
    () => ({ me, reloadMe, onboarded, setOnboarded, pendingFb, reloadPendingFb, fbThanks, setFbThanks, wsEvent }),
    [me, reloadMe, onboarded, pendingFb, reloadPendingFb, fbThanks, wsEvent]
  );
  return <AppState.Provider value={value}>{children}</AppState.Provider>;
}

export function useAppState() {
  return useContext(AppState);
}
