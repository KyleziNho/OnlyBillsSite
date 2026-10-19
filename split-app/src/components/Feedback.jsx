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

/** "Made with ♥ by Kyle · Say hi" at the foot of the page; opens the note. */
export function MakerNote({ screen }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="maker-line" onClick={() => setOpen(true)}>
        <MakerFace size={20} />
        <span>Made with <span className="maker-heart" aria-hidden="true">♥</span> by Kyle · Say hi</span>
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
          <h2>Thank you!</h2>
          <p>{contact.trim() ? 'It’s with me now, and I’ll get back to you.' : 'It’s with me now. Notes like this are how OnlyBills gets better.'}</p>
        </div>
      ) : (
        <form id="feedback-form" className="feedback-form" onSubmit={send}>
          <div className="maker-intro">
            <MakerFace size={56} />
            <div>
              <h2>Hi, I’m Kyle</h2>
              <p>I’m an MSc Computer Science student at Bath and I built OnlyBills on my own. Tell me what’s confusing, what’s broken, or what you’d love next. I read every message.</p>
            </div>
          </div>
          <label className="sr-only" htmlFor="feedback-message">Your message</label>
          <textarea id="feedback-message" className="field feedback-message" rows={5} maxLength={MAX_MESSAGE}
            placeholder="What’s on your mind?" value={message} onChange={(e) => setMessage(e.target.value)} />
          <label className="sr-only" htmlFor="feedback-contact">Email or number, if you’d like a reply</label>
          <input id="feedback-contact" className="field" type="text" inputMode="email" autoComplete="email" maxLength={MAX_CONTACT}
            placeholder="Email or number, if you’d like a reply" value={contact} onChange={(e) => setContact(e.target.value)} />
          <p className="feedback-hint">Optional. Only I see it.</p>
          {state === 'failed' && <p className="feedback-error" role="alert">Couldn’t send that. Check your connection and try again.</p>}
        </form>
      )}
    </Sheet>
  );
}
