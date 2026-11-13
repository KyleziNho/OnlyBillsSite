// A note to Kyle as the Firestore rules accept it (SplitSwift/firebase/firestore.rules,
// match /feedback): fixed keys, short strings, the server's timestamp.
export const MAX_MESSAGE = 2000;
export const MAX_CONTACT = 200;

/** `createdAt` is `serverTimestamp()` in the page (a placeholder in tests). */
export function feedbackDoc({ message, contact = '', screen }, createdAt) {
  const doc = {
    message: message.trim().slice(0, MAX_MESSAGE),
    source: 'web',
    platform: 'web',
    screen: String(screen || 'web').slice(0, 60),
    createdAt,
  };
  const reply = contact.trim();
  if (reply) doc.contact = reply.slice(0, MAX_CONTACT);
  return doc;
}
