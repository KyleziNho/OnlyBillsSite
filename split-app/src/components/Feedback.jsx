// Notes to Kyle, the same as the app's "Made by Kyle": his face, a line about who he is,
// a box and an optional way to reply. Written to the Firestore `feedback` collection
// (create-only, see SplitSwift/firebase/firestore.rules).
import { useState } from 'react';
import { feedbackDoc, MAX_CONTACT, MAX_MESSAGE } from '../lib/feedback.js';
import { Sheet } from './Sheet.jsx';
import { Button } from './Glass.jsx';

function MakerFace({ size = 56 }) {
  return <img className="maker-face" src="maker-face.png" alt="" width={size} height={size} style={{ width: size, height: size }} />;
}

/** "Made by Kyle" with his face at the foot of the page; opens the note. */
export function MakerNote({ screen }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="maker-line" onClick={() => setOpen(true)}>
        <MakerFace size={22} />
        <span>Made by Kyle</span>
      </button>
      <FeedbackSheet open={open} onClose={() => setOpen(false)} screen={screen} />
    </>
  );
}

function FeedbackSheet({ open, onClose, screen }) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | failed

  const close = () => {
    onClose();
    if (state === 'sent') { setMessage(''); setContact(''); setState('idle'); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() || state === 'sending') return;
    setState('sending');
    try {
      // Firebase loads on demand, as in lib/store.js, so the page's first paint stays light.
      const [{ db }, { addDoc, collection, serverTimestamp }] =
        await Promise.all([import('../firebase.js'), import('firebase/firestore')]);
      await addDoc(collection(db, 'feedback'), feedbackDoc({ message, contact, screen }, serverTimestamp()));
      setState('sent');
    } catch {
      setState('failed');
    }
  };

  const sent = state === 'sent';
  return (
    <Sheet open={open} onClose={close} className="feedback-sheet"
      footer={sent
        ? <Button tone="accent" onClick={close}>Done</Button>
        : <Button tone="accent" type="submit" form="feedback-form" disabled={!message.trim() || state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send to Kyle'}
          </Button>}>
      {sent ? (
        <div className="feedback-thanks" role="status">
          <MakerFace size={88} />
          <h2>thank you!</h2>
          <p>{contact.trim() ? 'got it, i’ll get back to you' : 'got it. this is genuinely how onlybills gets better'}</p>
        </div>
      ) : (
        <form id="feedback-form" className="feedback-form" onSubmit={send}>
          <div className="maker-intro">
            <MakerFace size={56} />
            <div>
              <h2>hey, i’m kyle</h2>
              <p>i’m doing an msc in cs at bath and made onlybills on my own. if something’s confusing or broken, or there’s something you’d want, just tell me. i read all of these</p>
            </div>
          </div>
          <label className="sr-only" htmlFor="feedback-message">Your message</label>
          <textarea id="feedback-message" className="field feedback-message" rows={5} maxLength={MAX_MESSAGE}
            placeholder="what’s up?" value={message} onChange={(e) => setMessage(e.target.value)} />
          <label className="sr-only" htmlFor="feedback-contact">email or number if you want a reply</label>
          <input id="feedback-contact" className="field" type="text" inputMode="email" autoComplete="email" maxLength={MAX_CONTACT}
            placeholder="email or number if you want a reply" value={contact} onChange={(e) => setContact(e.target.value)} />
          <p className="feedback-hint">optional, only i see it</p>
          {state === 'failed' && <p className="feedback-error" role="alert">Couldn’t send that. Check your connection and try again.</p>}
        </form>
      )}
    </Sheet>
  );
}
