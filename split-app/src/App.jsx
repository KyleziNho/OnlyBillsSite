// OnlyBills guest bill pages (onlybills.app/split/?id=…).
// v1 docs (static snapshot shares) → StaticBill. v2 docs (schemaVersion 2) → LiveBill.
import { useCallback, useEffect, useState } from 'react';
import { cleanVenueName } from './lib/format.js';
import { fetchShared } from './lib/store.js';
import { LoadingPage, StatePage } from './components/Chrome.jsx';
import { Button } from './components/Glass.jsx';
import { RefreshIcon } from './components/Icons.jsx';
import LiveBill from './screens/LiveBill.jsx';
import StaticBill from './screens/StaticBill.jsx';

// Demo fixtures only load when asked for — they never ship in the main path.
const loadDemo = () => import('./demoData.js');

const setTitle = (storeName) => {
  document.title = storeName ? `${cleanVenueName(storeName)} · OnlyBills` : 'Your share · OnlyBills';
};

const preselect = (people, who) => {
  if (who == null || !people) return null;
  const asIndex = Number(who);
  if (who !== '' && Number.isInteger(asIndex) && people[asIndex]) return asIndex;
  const idx = people.findIndex((p) => (p.name || '').toLowerCase() === String(who).toLowerCase());
  return idx >= 0 ? idx : null;
};

const GET_APP = (
  <a className="text-btn" href="https://apps.apple.com/app/onlybills" target="_blank" rel="noopener noreferrer">Get OnlyBills for iPhone</a>
);

export default function App() {
  const [page, setPage] = useState({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setPage({ state: 'loading' }); setAttempt((a) => a + 1); }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const demo = params.get('demo');
    const state = params.get('state');
    const go = (p) => { if (!cancelled) setPage(p); };

    const run = async () => {
      if (demo === 'loading') return;
      if (demo === 'notfound' || demo === 'error' || demo === 'offline') { go({ state: demo }); return; }
      if (demo === '2') {
        const { LIVE_STATES } = await loadDemo();
        const fixture = (LIVE_STATES[state] || LIVE_STATES.claiming)();
        setTitle(fixture.data.storeName);
        go({ state: 'live', id: `demo-${state || 'claiming'}`, data: fixture.data, demo: fixture });
        return;
      }
      if (demo === '1' || (!id && import.meta.env.DEV)) {
        const { DEMO_DATA } = await loadDemo();
        setTitle(DEMO_DATA.storeName);
        go({ state: 'static', data: DEMO_DATA, person: preselect(DEMO_DATA.people, params.get('person')), sheet: state });
        return;
      }
      if (!id) { go({ state: 'notfound', reason: 'nolink' }); return; }

      try {
        const data = await fetchShared(id);
        if (!data) { go({ state: 'notfound' }); return; }
        setTitle(data.storeName);
        if (data.schemaVersion === 2) go({ state: 'live', id, data });
        else go({ state: 'static', data, person: preselect(data.people, params.get('person')) });
      } catch (e) {
        console.error(e);
        go({ state: navigator.onLine === false || e?.code === 'unavailable' ? 'offline' : 'error' });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [attempt]);

  // Came back online on the offline page → try again by itself.
  useEffect(() => {
    if (page.state !== 'offline' || new URLSearchParams(window.location.search).get('demo')) return undefined;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [page.state, retry]);

  switch (page.state) {
    case 'loading':
      return <LoadingPage />;
    case 'notfound':
      return (
        <StatePage art="receipts" title={page.reason === 'nolink' ? 'No bill here yet' : 'We can’t find this bill'}
          body={page.reason === 'nolink'
            ? 'Open the link or scan the QR code from whoever paid to see your share.'
            : 'The link may be mistyped, or the bill was taken down. Ask whoever shared it to send it again.'}
          secondary={GET_APP} />
      );
    case 'offline':
      return (
        <StatePage art="receipts" title="You’re offline"
          body="Connect to Wi-Fi or mobile data and the bill will open by itself."
          action={<Button tone="accent" onClick={retry} icon={<RefreshIcon size={18} strokeWidth={2.4} />}>Try again</Button>} />
      );
    case 'error':
      return (
        <StatePage art="receipts" title="Couldn’t open this bill"
          body="Something went wrong on our side. Give it another go in a moment."
          action={<Button tone="accent" onClick={retry} icon={<RefreshIcon size={18} strokeWidth={2.4} />}>Try again</Button>}
          secondary={GET_APP} />
      );
    case 'live':
      return <LiveBill docId={page.id} initialData={page.data} demo={page.demo || null} />;
    default:
      return <StaticBill data={page.data} initialPerson={page.person} initialSheet={page.sheet} />;
  }
}
