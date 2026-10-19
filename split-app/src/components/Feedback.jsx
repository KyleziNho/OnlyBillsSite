// Notes to Kyle, the same as the app's "Made by Kyle": his face, a line about who he is,
// a box and an optional way to reply. Written to the Firestore `feedback` collection
// (create-only, see SplitSwift/firebase/firestore.rules).
import { useState } from 'react';
import { feedbackDoc, MAX_CONTACT, MAX_MESSAGE } from '../lib/feedback.js';
import { Sheet } from './Sheet.jsx';
import { Button } from './Glass.jsx';

function MakerFace({ size = 56 }) {
  return <img className="maker-face" src="maker-face.jpg" alt="" width={size} height={size} style={{ width: size, height: size }} />;
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
          <h2>got it, thanks!</h2>
          <p>{contact.trim() ? 'i’ll get back to you soon!' : 'i really appreciate you taking the time to share your thoughts.'}</p>
        </div>
      ) : (
        <form id="feedback-form" className="feedback-form" onSubmit={send}>
          <img className="maker-hero" src="maker-pub.jpg" alt="Kyle, on the right, with a mate at the pub" width="1200" height="1600" />
          <div className="maker-intro">
            <div>
              <h2>hey there!</h2>
              <p>i’m kyle, a student at bath - onlybills is a little project of mine. any feedback really helps!</p>
            </div>
          </div>
          <label className="sr-only" htmlFor="feedback-message">Your message</label>
          <textarea id="feedback-message" className="field feedback-message" rows={5} maxLength={MAX_MESSAGE}
            placeholder="your message..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <label className="sr-only" htmlFor="feedback-contact">email or number (optional)</label>
          <input id="feedback-contact" className="field" type="text" inputMode="email" autoComplete="email" maxLength={MAX_CONTACT}
            placeholder="email or number (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
          <p className="feedback-hint">it’s private, only i see it</p>
          {state === 'failed' && <p className="feedback-error" role="alert">Couldn’t send that. Check your connection and try again.</p>}
        </form>
      )}
    </Sheet>
  );
}
