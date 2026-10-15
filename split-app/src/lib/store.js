// Firestore access, lazy-loaded so the shell (and every demo) paints before the
// SDK arrives. Writes are expressed with portable sentinels and translated here.
//
// Guests only ever write what the deployed rules allow for them:
//   items.*, guests.{gid}, paid.{gid}, paidAmount.{gid} (+ updatedAt stamp)
// Never `locked`, `status`, `closedAt`, `expiresAt` — those are the host's.

export const DELETE = Symbol('delete');
export const NOW = Symbol('serverTimestamp');

let loading = null;
export const loadFirestore = () => {
  if (!loading) {
    loading = Promise.all([import('../firebase.js'), import('firebase/firestore')])
      .then(([{ db }, fs]) => ({ db, ...fs }));
  }
  return loading;
};

const translate = (value, fs) => {
  if (value === DELETE) return fs.deleteField();
  if (value === NOW) return fs.serverTimestamp();
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v, fs)]));
  }
  return value;
};

export const fetchShared = async (id) => {
  const fs = await loadFirestore();
  const snap = await fs.getDoc(fs.doc(fs.db, 'sharedReceipts', id));
  return snap.exists() ? snap.data() : null;
};

/** onSnapshot with metadata so we can tell "offline, from cache" apart. */
export const subscribeShared = (id, onData, onError) => {
  let unsub = () => {};
  let cancelled = false;
  loadFirestore().then((fs) => {
    if (cancelled) return;
    unsub = fs.onSnapshot(
      fs.doc(fs.db, 'sharedReceipts', id),
      { includeMetadataChanges: true },
      (snap) => onData(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites }),
      onError,
    );
  }).catch(onError);
  return () => { cancelled = true; unsub(); };
};

export const updateShared = async (id, fields) => {
  const fs = await loadFirestore();
  const payload = translate({ ...fields, updatedAt: NOW }, fs);
  return fs.updateDoc(fs.doc(fs.db, 'sharedReceipts', id), payload);
};
