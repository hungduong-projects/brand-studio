import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { tickets } from './data';

export type Outcome = { by: 'deskhand' | 'you'; at: string; kind: 'sent' | 'handled' };

const start: Record<string, Outcome> = {
  '2285': { by: 'deskhand', kind: 'sent', at: '08:02' },
  '2279': { by: 'deskhand', kind: 'sent', at: '07:35' },
  '2270': { by: 'deskhand', kind: 'sent', at: '07:04' },
};

type Store = {
  outcomes: Record<string, Outcome>;
  waiting: typeof tickets;
  sent: typeof tickets;
  /** Resolves when the reply is sent. Rejects once after "Fail the next send" is switched on. */
  send: (id: string) => Promise<void>;
  markHandled: (id: string) => void;
  failNext: boolean;
  setFailNext: (on: boolean) => void;
  reset: () => void;
};

const Context = createContext<Store | null>(null);
const now = () => new Date().toTimeString().slice(0, 5);

/** Demo state in memory. A real app would call the Deskhand API here. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [outcomes, setOutcomes] = useState(start);
  const [failNext, setFailNext] = useState(false);

  const send = useCallback(async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 900));
    if (failNext) { setFailNext(false); throw new Error('The payment service did not answer.'); }
    setOutcomes(o => ({ ...o, [id]: { by: 'you', kind: 'sent', at: now() } }));
  }, [failNext]);

  const value = useMemo<Store>(() => ({
    outcomes,
    waiting: tickets.filter(t => !outcomes[t.id]),
    sent: tickets.filter(t => outcomes[t.id]?.kind === 'sent').sort((a, b) => outcomes[b.id].at.localeCompare(outcomes[a.id].at)),
    send,
    markHandled: id => setOutcomes(o => ({ ...o, [id]: { by: 'you', kind: 'handled', at: now() } })),
    failNext,
    setFailNext,
    reset: () => { setOutcomes(start); setFailNext(false); },
  }), [outcomes, send, failNext]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('useStore needs StoreProvider');
  return store;
}
