import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyByDh_nxkV1kWGdIHFldDAoIU7iGqU3FQc",
  authDomain: "onlybills-b8dac.firebaseapp.com",
  projectId: "onlybills-b8dac",
  storageBucket: "onlybills-b8dac.firebasestorage.app",
  messagingSenderId: "572680746912",
  appId: "1:572680746912:web:9c3890b712bdc19a9a16c5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Currency formatter
const formatCurrency = (amount, currency) => {
  const symbols = {
    GBP: '£', USD: '$', EUR: '€', JPY: '¥', CAD: 'C$', AUD: 'A$',
    SGD: 'S$', MYR: 'RM', THB: '฿', INR: '₹', KRW: '₩', CNY: '¥', HKD: 'HK$'
  };
  return (symbols[currency] || currency + ' ') + amount.toFixed(2);
};

// Date formatter
const formatDate = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Count formatter
const formatCount = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n;

// Check if string starts with emoji
const startsWithEmoji = (str) => {
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
  return emojiRegex.test(str.trim());
};

// Get display info for avatar
const getAvatarDisplay = (name) => {
  const n = name.trim();
  if (startsWithEmoji(n)) {
    const match = n.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})/u);
    return { isEmoji: true, char: match ? match[0] : n.charAt(0) };
  }
  const parts = n.split(' ');
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : n.charAt(0).toUpperCase();
  return { isEmoji: false, char: initials };
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  }
};

// Icons
const ChevronIcon = () => (
  <svg className="expand-icon" viewBox="0 0 20 20" fill="none">
    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AppleIcon = () => (
  <svg className="apple-icon" viewBox="0 0 24 24" fill="none">
    <path d="M17.05 12.76c-.02-2.33 1.83-3.46 1.91-3.51-.94-1.54-2.6-1.76-3.2-1.78-1.39-.14-2.74.87-3.45.87-.72 0-1.82-.85-3-.83-1.52.03-2.94.94-3.72 2.31-1.61 2.8-.41 6.94 1.13 9.21.77 1.11 1.68 2.35 2.86 2.31 1.15-.04 1.58-.74 2.96-.74 1.37 0 1.77.74 2.97.71 1.24-.02 2.02-1.11 2.76-2.23.9-1.28 1.26-2.55 1.27-2.61-.03-.01-2.32-.89-2.34-3.52z" fill="#000" />
    <path d="M14.8 5.96c.63-.77 1.06-1.82.94-2.88-.91.04-2.04.64-2.7 1.4-.58.67-1.1 1.75-.97 2.78 1.02.08 2.08-.51 2.73-1.3z" fill="#000" />
  </svg>
);

const BankIcon = () => (
  <svg className="payment-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7v2h20V7L12 2zm0 2.5L18 7H6l6-2.5zM4 11v7h3v-7H4zm6 0v7h4v-7h-4zm7 0v7h3v-7h-3zM2 20h20v2H2v-2z"/>
  </svg>
);

const PayPalIcon = () => (
  <svg className="payment-icon paypal" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-1.717 0-3.146 1.27-3.403 2.966l-1.334 8.466a.641.641 0 0 0 .633.74h3.397c.524 0 .968-.382 1.05-.9l.823-5.228a1.087 1.087 0 0 1 1.074-.922h.679c4.133 0 7.362-1.676 8.306-6.521.393-2.021.18-3.717-.829-4.896z"/>
  </svg>
);

const VenmoIcon = () => (
  <svg className="payment-icon venmo" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 2.25c.75 1.25 1.1 2.5 1.1 4.1 0 5.1-4.35 11.75-7.9 16.4H5.85L2.5 3.65l6.5-.6 1.75 14.1c1.65-2.7 3.7-6.95 3.7-9.85 0-1.5-.25-2.55-.7-3.4l5.75-1.65z"/>
  </svg>
);

const QRIcon = () => (
  <svg className="payment-icon qr" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v2h-3v-2zm0 3h3v3h-3v-3zm-3 0h2v3h-2v-3zm-2-3h2v2h-2v-2z"/>
  </svg>
);

// Components
const Hero = ({ data, imageLoaded, onImageLoad }) => (
  <motion.div className="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
    {data.restaurantPhotoUrl && (
      <img className={`hero-image ${imageLoaded ? 'loaded' : ''}`} src={data.restaurantPhotoUrl} alt="" onLoad={onImageLoad} />
    )}
    <div className="hero-overlay" />
    <div className="hero-content">
      <motion.h1 className="venue-name" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {data.storeName}
      </motion.h1>
      <motion.div className="venue-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {data.rating && (
          <span className="rating">
            <span className="rating-star">★</span>
            <span className="rating-value">{data.rating.toFixed(1)}</span>
            {data.ratingCount && <span className="rating-count">({formatCount(data.ratingCount)})</span>}
          </span>
        )}
        {data.placeType && <span className="venue-type">{data.placeType}</span>}
        {data.date && (
          <>
            <span className="meta-dot" />
            <span className="venue-date">{formatDate(data.date)}</span>
          </>
        )}
      </motion.div>
    </div>
  </motion.div>
);

const TotalCard = ({ data }) => (
  <motion.div className="total-card" variants={itemVariants}>
    <div className="total-info">
      <div className="total-label">Total Bill</div>
      <div className="total-people">{data.people.length} {data.people.length === 1 ? 'person' : 'people'}</div>
    </div>
    <motion.div
      className="total-amount"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
    >
      {formatCurrency(data.totalBill, data.currency)}
    </motion.div>
  </motion.div>
);

const PersonCard = ({ person, currency }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const display = getAvatarDisplay(person.name);
  const itemCount = person.items?.length || 0;
  const hasFees = person.tax > 0 || person.serviceCharge > 0 || person.tip > 0;

  return (
    <motion.div className={`person-card ${isExpanded ? 'expanded' : ''}`} variants={itemVariants} layout>
      <div className="person-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className={`avatar ${display.isEmoji ? 'emoji' : ''}`} style={!display.isEmoji ? { background: person.color } : undefined}>
          {display.char}
        </div>
        <div className="person-info">
          <div className="person-name">{person.name}</div>
          <div className="person-item-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
        </div>
        <span className="person-amount">{formatCurrency(person.total, currency)}</span>
        <ChevronIcon />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div className="person-body" initial="collapsed" animate="expanded" exit="collapsed" variants={expandVariants}>
            <div className="person-body-inner">
              {person.items?.length > 0 && (
                <div className="items-list">
                  {person.items.map((item, i) => (
                    <motion.div key={i} className="item-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <span className="item-name">
                        {item.name}
                        {item.quantity && item.quantity !== 1 && <span className="item-quantity"> x{item.quantity}</span>}
                      </span>
                      <span className="item-price">{formatCurrency(item.price, currency)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
              {hasFees && (
                <div className="fees-section">
                  {person.tax > 0 && <div className="fee-row"><span className="fee-label">Tax</span><span className="fee-amount">{formatCurrency(person.tax, currency)}</span></div>}
                  {person.serviceCharge > 0 && <div className="fee-row"><span className="fee-label">Service</span><span className="fee-amount">{formatCurrency(person.serviceCharge, currency)}</span></div>}
                  {person.tip > 0 && <div className="fee-row"><span className="fee-label">Tip</span><span className="fee-amount">{formatCurrency(person.tip, currency)}</span></div>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PaymentSection = ({ payment, onQRClick }) => {
  if (!payment) return null;

  const hasBankDetails = payment.bankDetails?.length > 0 || payment.bankAccountName;
  const hasPaypal = payment.paypalUsername;
  const hasVenmo = payment.venmoHandle;
  const hasQR = payment.qrCodeUrl;
  const hasAnyPayment = hasBankDetails || hasPaypal || hasVenmo || hasQR;

  if (!hasAnyPayment) return null;

  return (
    <motion.div className="section" variants={itemVariants}>
      <div className="section-header">
        <span className="section-title">Payment</span>
      </div>
      <div className="payment-card">
        {hasBankDetails && (
          <div className="payment-method">
            <div className="payment-method-header">
              <BankIcon />
              <span className="payment-method-title">Bank Transfer</span>
            </div>
            <div className="payment-method-content">
              {payment.bankAccountName && (
                <div className="payment-row">
                  <span className="payment-label">Account Name</span>
                  <span className="payment-value">{payment.bankAccountName}</span>
                </div>
              )}
              {payment.bankDetails?.map((field, i) => (
                <div key={i} className="payment-row">
                  <span className="payment-label">{field.label}</span>
                  <span className="payment-value">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPaypal && (
          <div className="payment-method">
            <div className="payment-method-header">
              <PayPalIcon />
              <span className="payment-method-title">PayPal</span>
            </div>
            <div className="payment-method-content">
              <div className="payment-row single">
                <span className="payment-value highlight">{payment.paypalUsername}</span>
              </div>
            </div>
          </div>
        )}

        {hasVenmo && (
          <div className="payment-method">
            <div className="payment-method-header">
              <VenmoIcon />
              <span className="payment-method-title">Venmo</span>
            </div>
            <div className="payment-method-content">
              <div className="payment-row single">
                <span className="payment-value highlight">@{payment.venmoHandle.replace(/^@/, '')}</span>
              </div>
            </div>
          </div>
        )}

        {hasQR && (
          <div className="payment-method qr-method">
            <div className="payment-method-header">
              <QRIcon />
              <span className="payment-method-title">
                {payment.qrCodeDescription || 'QR Code'}
              </span>
            </div>
            <div className="payment-qr-container">
              <img
                className="payment-qr-image"
                src={payment.qrCodeUrl}
                alt="Payment QR Code"
                onClick={() => onQRClick(payment.qrCodeUrl)}
              />
              <span className="payment-qr-hint">Tap to enlarge</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ReceiptSection = ({ imageUrl, onImageClick }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.div className="section" variants={itemVariants}>
      <div className="section-header">
        <span className="section-title">Receipt</span>
      </div>
      <div className="receipt-card">
        <img className={`receipt-image ${loaded ? 'loaded' : ''}`} src={imageUrl} alt="Receipt" onLoad={() => setLoaded(true)} onClick={() => onImageClick(imageUrl)} />
      </div>
    </motion.div>
  );
};

const ImageModal = ({ imageUrl, onClose }) => (
  <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <button className="modal-close" onClick={onClose}>×</button>
    <motion.img className="modal-image" src={imageUrl} alt="Receipt" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} />
  </motion.div>
);

const AppStoreBanner = () => (
  <motion.div className="app-banner" initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 30 }}>
    <a href="https://apps.apple.com/app/onlybills" className="download-button">
      <img src="app-icon.png" alt="OnlyBills" className="app-icon-img" />
      <div className="download-text">
        <span className="download-small">Download</span>
        <span className="download-big">OnlyBills</span>
      </div>
    </a>
  </motion.div>
);

const LoadingState = () => (
  <div className="container">
    <div className="skeleton skeleton-hero" />
    <div className="skeleton skeleton-total" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);

const ErrorState = ({ message }) => (
  <div className="container">
    <div className="error-container">
      <img src="app-icon.png" alt="OnlyBills" className="error-app-icon" />
      <h2 className="error-title">Not Found</h2>
      <p className="error-message">{message}</p>
    </div>
  </div>
);

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');

      if (!id) {
        setError('No receipt ID provided');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'sharedReceipts', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('Receipt not found');
          setLoading(false);
          return;
        }

        const receiptData = docSnap.data();
        setData(receiptData);
        document.title = `${receiptData.storeName} - OnlyBills`;
      } catch (err) {
        console.error(err);
        setError('Error loading receipt');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalImage) setModalImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalImage]);

  if (loading) return <div className="app"><LoadingState /><AppStoreBanner /></div>;
  if (error) return <div className="app"><ErrorState message={error} /><AppStoreBanner /></div>;

  return (
    <div className="app">
      <div className="container">
        <Hero data={data} imageLoaded={heroLoaded} onImageLoad={() => setHeroLoaded(true)} />

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <TotalCard data={data} />

          <div className="section">
            <motion.div className="section-header" variants={itemVariants}>
              <span className="section-title">Breakdown</span>
              <span className="section-count">{data.people.length}</span>
            </motion.div>
            {data.people.map((person, index) => (
              <PersonCard key={index} person={person} currency={data.currency} />
            ))}
          </div>

          <PaymentSection payment={data.payment} onQRClick={setModalImage} />

          {data.receiptImageUrl && <ReceiptSection imageUrl={data.receiptImageUrl} onImageClick={setModalImage} />}

          <motion.div className="footer" variants={itemVariants}>
            <img src="app-icon.png" alt="OnlyBills" className="footer-app-icon" />
            <span>Split with <a href="https://apps.apple.com/app/onlybills">OnlyBills</a></span>
          </motion.div>
        </motion.div>
      </div>

      <AppStoreBanner />

      <AnimatePresence>
        {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
