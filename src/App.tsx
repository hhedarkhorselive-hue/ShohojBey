import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Flame,
  Store,
  ShoppingCart,
  User,
  ShoppingBag,
  Sparkles,
  LayoutDashboard,
  Search,
  Heart,
  ChevronRight,
  Star,
  Clock,
  Truck,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Minus,
  X,
  ChevronLeft,
  Share2,
  Trash2,
  Bell,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import {
  auth,
  googleProvider,
  db,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminPanel from './components/AdminPanel';

export interface Product {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  old: number;
  rating: string;
  emoji: string;
  images?: string[]; // Multiple images support
  sale?: string;
  category: string;
  description?: string;
  stockLeft?: number;
  isMegaDeal?: boolean;
}

export interface CartItem extends Product {
  qty: number;
}

export interface OrderItem {
  id: string;
  customerName?: string;
  date: string;
  items: CartItem[];
  total: number;
  address: string;
  phone: string;
  district?: string;
  paymentMethod: string;
  status: 'অর্ডার গ্রহণ করা হয়েছে' | 'প্যাকেজ প্রস্তুত হচ্ছে' | 'কুরিয়ারে হস্তান্তর' | 'ডেলিভারি পথে' | 'ডেলিভারি সম্পন্ন';
  trackingCode: string;
  courier: string;
}

export interface DealNotice {
  id: string;
  tag: string;
  title: string;
  message: string;
  date: string;
  couponCode?: string;
  discount?: string;
  type: 'urgent' | 'cashback' | 'voucher' | 'stock';
}

export interface Banner {
  id: string;
  url: string;
  link?: string;
  title?: string;
}

export interface LocalUserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  address: string;
  district?: string;
  isRegistered: boolean;
}

export const PAYMENT_METHODS = [
  { id: 'bKash', name: 'বিকাশ', bg: '#fdf2f8', color: '#e2136e', number: '01811-223344', img: 'https://i.postimg.cc/zXwgXbM8/images-(16).jpg' },
  { id: 'Nagad', name: 'নগদ', bg: '#fff5f5', color: '#ec1c24', number: '01722-334455', img: 'https://i.postimg.cc/zDCBnmjD/unnamed.jpg' },
  { id: 'Upay', name: 'উপায়', bg: '#f0fdf4', color: '#00a651', number: '01933-445566', img: 'https://i.postimg.cc/MKZWVnHz/unnamed.png' },
  { id: 'CellFin', name: 'সেলফিন', bg: '#f0f9ff', color: '#00539f', number: '01544-556677', img: 'https://i.postimg.cc/zXP1hp9J/images-(17).jpg' },
  { id: 'MCash', name: 'এমক্যাশ', bg: '#fef2f2', color: '#ed1c24', number: '01655-667788', img: 'https://i.postimg.cc/5y0RNW92/unnamed-(1).png' },
  { id: 'Pathao Pay', name: 'পাঠাও পে', bg: '#fff1f2', color: '#ef4444', number: '01366-778899', img: 'https://i.postimg.cc/PJ30mrVF/pathao-pay-logo-png-seeklogo-677397.png' },
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_NOTICES: DealNotice[] = [];

export const INITIAL_ORDERS: OrderItem[] = [];

export function money(n: number): string {
  return '৳ ' + n.toLocaleString('en-IN');
}

const LOCAL_STORAGE_KEY = 'shohojbuy_auth_session';
const SAVED_LOCATION_KEY = 'shohojbuy_saved_location';

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<string>('splash');
  const [splashLoading, setSplashLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('9:41');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Products & Shopping State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishes, setWishes] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);

  // Direct Buy / Checkout Items (either single product or full cart)
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [isDirectBuy, setIsDirectBuy] = useState<boolean>(false);

  // Address & Location State
  const [custName, setCustName] = useState<string>('শাহরিয়ার আল শাকিব');
  const [address, setAddress] = useState<string>('বাড়ি ১২, রোড ৪, ধানমন্ডি, ঢাকা');
  const [district, setDistrict] = useState<string>('ঢাকা');
  const [phone, setPhone] = useState<string>('01712345678');
  const [saveLocationChecked, setSaveLocationChecked] = useState<boolean>(true);
  const [hasSavedLocation, setHasSavedLocation] = useState<boolean>(() => {
    return !!localStorage.getItem(SAVED_LOCATION_KEY);
  });

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<string>('ক্যাশ অন ডেলিভারি');

  // Payment Gateway State
  const [paymentGatewayMethod, setPaymentGatewayMethod] = useState<string | null>(null);
  const [gatewaySenderPhone, setGatewaySenderPhone] = useState<string>('');
  const [gatewayTrxId, setGatewayTrxId] = useState<string>('');
  const [paymentTimer, setPaymentTimer] = useState<number>(120);

  useEffect(() => {
    let interval: any = null;
    if (currentScreen === 'payment-gateway') {
      setPaymentTimer(120);
      interval = setInterval(() => {
        setPaymentTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen]);

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [activeTrackOrder, setActiveTrackOrder] = useState<OrderItem | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<OrderItem | null>(null);
  const [orderFilterTab, setOrderFilterTab] = useState<'all' | 'to-pay' | 'to-ship' | 'to-receive' | 'to-review' | 'returns'>('all');

  // Recently Viewed Products
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Review & Return Modals
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewTargetItem, setReviewTargetItem] = useState<{ id: number; name: string; emoji: string } | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');

  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [returnTargetOrder, setReturnTargetOrder] = useState<OrderItem | null>(null);
  const [returnReason, setReturnReason] = useState<string>('পণ্য ক্ষতিগ্রস্ত বা ত্রুটিপূর্ণ');

  // Notices & Mega Deals State
  const [notices, setNotices] = useState<DealNotice[]>(INITIAL_NOTICES);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newNoticeTitle, setNewNoticeTitle] = useState<string>('');
  const [newNoticeMsg, setNewNoticeMsg] = useState<string>('');
  const [showNoticeForm, setShowNoticeForm] = useState<boolean>(false);

  // Listing / Shop filter state
  const [listingTitle, setListingTitle] = useState<string>('সকল পণ্য');
  const [activeFilter, setActiveFilter] = useState<'all' | 'low' | 'high' | 'sale'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Flash Sale Countdown Timer
  const [countdown, setCountdown] = useState<{ hours: number; mins: number; secs: number }>({
    hours: 5,
    mins: 42,
    secs: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, mins: 59, secs: 59 };
        return { hours: 6, mins: 0, secs: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authentication & Persistent User State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const isAdmin = firebaseUser?.email === 'shariartech2010@gmail.com' || firebaseUser?.email === 'thedavid6758@gmail.com';
  
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [authName, setAuthName] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');

  // 4 Services Modals (Matching User Uploaded Image: Help Center, Contact Customer Care, My Reviews, Payment Options)
  const [showHelpCenterModal, setShowHelpCenterModal] = useState<boolean>(false);
  const [showContactCareModal, setShowContactCareModal] = useState<boolean>(false);
  const [showMyReviewsModal, setShowMyReviewsModal] = useState<boolean>(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState<boolean>(false);
  const [activeFaqTab, setActiveFaqTab] = useState<string>('order');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>('bKash');

  // Help Center AI Agent State
  const [helpAiTab, setHelpAiTab] = useState<'ai' | 'faq'>('ai');
  const [helpAiMessages, setHelpAiMessages] = useState<Array<{ id: string; role: 'user' | 'model'; text: string; time: string }>>([
    {
      id: 'h-init',
      role: 'model',
      text: 'আসসালামু আলাইকুম! আমি ShohojBuy সহায়তা কেন্দ্র এআই 🤖। আপনি অর্ডার ট্র্যাকিং, ডেলিভারি সময় ও খরচ, পেমেন্ট পদ্ধতি, ক্যাশব্যাক, ৭ দিনের রিটার্ন পলিসি বা ভাউচার কোড নিয়ে যেকোনো প্রশ্ন করতে পারেন।',
      time: 'এখন',
    },
  ]);
  const [helpAiInput, setHelpAiInput] = useState<string>('');
  const [helpAiLoading, setHelpAiLoading] = useState<boolean>(false);
  const helpAiEndRef = useRef<HTMLDivElement | null>(null);

  // Customer Care AI Agent State
  const [careAiTab, setCareAiTab] = useState<'ai' | 'direct'>('ai');
  const [careAiMessages, setCareAiMessages] = useState<Array<{ id: string; role: 'user' | 'model'; text: string; time: string }>>([
    {
      id: 'c-init',
      role: 'model',
      text: 'আসসালামু আলাইকুম! আমি ShohojBuy ২৪/৭ লাইভ কাস্টমার কেয়ার এআই স্পেশালিস্ট 🎧। আপনার অর্ডার স্ট্যাটাস, ডেলিভারি বিলম্ব, ঠিকানা পরিবর্তন বা ভুল/ক্ষতিগ্রস্ত পণ্যের বিষয়ে আমি সরাসরি তাৎক্ষণিক সমাধান দিতে প্রস্তুত।',
      time: 'এখন',
    },
  ]);
  const [careAiInput, setCareAiInput] = useState<string>('');
  const [careAiLoading, setCareAiLoading] = useState<boolean>(false);
  const careAiEndRef = useRef<HTMLDivElement | null>(null);

  // Real-time Listeners
  useEffect(() => {
    // 1. Products Listener (Auto-detects from Admin Panel)
    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(list);
        if (list.length > 0) setCurrentProduct(list[0]);
      } else {
        // If admin hasn't added any products, show empty list or dummy data
        // We will show empty list to reflect reality
        setProducts([]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
    });

    // 2. Notices Listener
    const qNotices = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubNotices = onSnapshot(qNotices, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DealNotice));
        setNotices(list);
      } else {
        setNotices([]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notices');
    });

    // 2.1 Banners Listener
    const qBanners = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const unsubBanners = onSnapshot(qBanners, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Banner));
        setBanners(list);
      } else {
        setBanners([]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'banners');
    });

    // 3. User Specific Orders Listener (if logged in)
    let unsubOrders: any = null;
    if (firebaseUser) {
      const qOrders = query(
        collection(db, 'orders'), 
        where('userId', '==', firebaseUser.uid),
        orderBy('date', 'desc')
      );
      unsubOrders = onSnapshot(qOrders, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as OrderItem));
          setOrders(list);
          if (list.length > 0) setActiveTrackOrder(list[0]);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      });
    }

    return () => {
      unsubProducts();
      unsubNotices();
      unsubBanners();
      if (unsubOrders) unsubOrders();
    };
  }, [firebaseUser]);

  // Seed Data Function (Run once if DB is empty - for development convenience)
  useEffect(() => {
    const seedIfEmpty = async () => {
      const prodRef = collection(db, 'products');
      const snap = await getDoc(doc(prodRef, 'initial_check')); // Dummy check
      // This is a simple flag. In production, you'd check if count > 0
    };
    seedIfEmpty();
  }, []);
  const [isHomeScrolled, setIsHomeScrolled] = useState<boolean>(false);
  const [homeHeaderConfig, setHomeHeaderConfig] = useState({
    brandBn: 'সহজবাই',
    brandEn: 'ShohojBuy',
    storeId: '#SH-8821',
    badges: [
      { id: 'b1', label: '🔥 স্পেশাল অফার', color: '#fde047' },
      { id: 'b2', label: '✓ ভেরিফাইড শপ', color: '#6ee7b7' },
    ],
  });

  useEffect(() => {
    if (showHelpCenterModal && helpAiTab === 'ai') {
      setTimeout(() => helpAiEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [helpAiMessages, showHelpCenterModal, helpAiTab]);

  useEffect(() => {
    if (showContactCareModal && careAiTab === 'ai') {
      setTimeout(() => careAiEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [careAiMessages, showContactCareModal, careAiTab]);

  const handleSendHelpAi = async (customPrompt?: string) => {
    const textToSend = (customPrompt || helpAiInput).trim();
    if (!textToSend || helpAiLoading) return;

    const userMsg = {
      id: `hu-${Date.now()}`,
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    setHelpAiMessages((prev) => [...prev, userMsg]);
    setHelpAiInput('');
    setHelpAiLoading(true);

    try {
      const response = await fetch('/api/ai/help-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: helpAiMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          userContext: {
            name: userProfile?.name || custName,
            district,
          },
        }),
      });

      const data = await response.json();
      const botReply = data.reply || data.fallbackReply || 'উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';

      setHelpAiMessages((prev) => [
        ...prev,
        {
          id: `hm-${Date.now()}`,
          role: 'model',
          text: botReply,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setHelpAiMessages((prev) => [
        ...prev,
        {
          id: `hm-${Date.now()}`,
          role: 'model',
          text: 'দুঃখিত, সংযোগে সাময়িক ত্রুটি হয়েছে। অনুগ্রহ করে আবার প্রশ্ন করুন অথবা সরাসরি কাস্টমার কেয়ারে যোগাযোগ করুন।',
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        },
      ]);
    } finally {
      setHelpAiLoading(false);
    }
  };

  const handleSendCareAi = async (customPrompt?: string) => {
    const textToSend = (customPrompt || careAiInput).trim();
    if (!textToSend || careAiLoading) return;

    const userMsg = {
      id: `cu-${Date.now()}`,
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    setCareAiMessages((prev) => [...prev, userMsg]);
    setCareAiInput('');
    setCareAiLoading(true);

    try {
      const response = await fetch('/api/ai/customer-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: careAiMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          userContext: {
            name: userProfile?.name || custName,
            phone: userProfile?.phone || phone,
            district,
            activeOrdersCount: orders.filter((o) => o.status !== 'ডেলিভার্ড').length,
            recentOrders: orders.slice(0, 3).map((o) => ({ id: o.id, name: o.name, status: o.status, total: o.total })),
          },
        }),
      });

      const data = await response.json();
      const botReply = data.reply || data.fallbackReply || 'উত্তর পাওয়া যায়নি।';

      setCareAiMessages((prev) => [
        ...prev,
        {
          id: `cm-${Date.now()}`,
          role: 'model',
          text: botReply,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setCareAiMessages((prev) => [
        ...prev,
        {
          id: `cm-${Date.now()}`,
          role: 'model',
          text: 'দুঃখিত, সংযোগে সমস্যা হয়েছে। জরুরি প্রয়োজনে হটলাইন ০৯৬১২-৩৪৫৬৭৮ এ কল দিন বা হোয়াটসঅ্যাপে চ্যাট করুন।',
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        },
      ]);
    } finally {
      setCareAiLoading(false);
    }
  };

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  // Status Bar live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load saved location on init
  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem(SAVED_LOCATION_KEY);
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        if (parsed.name) setCustName(parsed.name);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.district) setDistrict(parsed.district);
        setHasSavedLocation(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    // Admin check - do not auto open, just log status
    if (isAdmin) {
      console.log("Admin access granted.");
    }
  }, [isAdmin]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const updatedProfile: LocalUserProfile = {
          uid: user.uid,
          name: user.displayName || userProfile?.name || 'ShohojBuy গ্রাহক',
          phone: user.phoneNumber || userProfile?.phone || '+880 1712-345678',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          address: userProfile?.address || address,
          district: userProfile?.district || district,
          isRegistered: true,
        };
        setUserProfile(updatedProfile);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProfile));

        // Sync with Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.cart) setCart(data.cart);
            if (data.wishes) setWishes(data.wishes);
            if (data.address) setAddress(data.address);
            if (data.orders) setOrders(data.orders);
            if (data.notices) setNotices(data.notices);
          } else {
            await setDoc(userDocRef, {
              ...updatedProfile,
              cart,
              wishes,
              orders,
              notices,
              createdAt: serverTimestamp(),
            });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Splash auto-start
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentScreen === 'splash') {
        enterApp();
      }
    }, 1100);
    return () => clearTimeout(timer);
  }, [currentScreen]);

  const enterApp = () => {
    setSplashLoading(true);
    setTimeout(() => {
      setSplashLoading(false);
      setCurrentScreen('home');
    }, 450);
  };

  const navigateTo = (screenId: string) => {
    if (screenId === 'profile' && !userProfile?.isRegistered && !firebaseUser) {
      setShowAuthModal(true);
      return;
    }
    setCurrentScreen(screenId);
    setDrawerOpen(false);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      showToast('গুগল দিয়ে সাইন ইন হচ্ছে...');
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const prof: LocalUserProfile = {
          uid: result.user.uid,
          name: result.user.displayName || 'ShohojBuy গ্রাহক',
          phone: result.user.phoneNumber || '+880 1712-345678',
          email: result.user.email || '',
          photoURL: result.user.photoURL || undefined,
          address: address,
          isRegistered: true,
        };
        setUserProfile(prof);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prof));
        setShowAuthModal(false);
        showToast(`স্বাগতম, ${prof.name}!`);
        setCurrentScreen('profile');
      }
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        showToast('লগইন বাতিল করা হয়েছে');
        return;
      }
      showToast('লগইন সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন');
    }
  };

  const handleEmailSignIn = async () => {
    if (!authPhone.includes('@') || authPassword.length < 6) {
      showToast('সঠিক ইমেইল ও পাসওয়ার্ড (ন্যূনতম ৬ অক্ষরের) দিন');
      return;
    }
    
    try {
      showToast('লগইন হচ্ছে...');
      const result = await signInWithEmailAndPassword(auth, authPhone.trim(), authPassword);
      if (result.user) {
        setShowAuthModal(false);
        showToast('লগইন সফল হয়েছে');
        setCurrentScreen('profile');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        showToast('ইমেইল বা পাসওয়ার্ড ভুল');
      } else {
        showToast('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন');
      }
    }
  };

  const handleEmailSignUp = async () => {
    if (!authPhone.includes('@') || authPassword.length < 6) {
      showToast('সঠিক ইমেইল ও পাসওয়ার্ড (ন্যূনতম ৬ অক্ষরের) দিন');
      return;
    }
    if (!authName.trim()) {
      showToast('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
      return;
    }

    try {
      showToast('অ্যাকাউন্ট তৈরি হচ্ছে...');
      const result = await createUserWithEmailAndPassword(auth, authPhone.trim(), authPassword);
      if (result.user) {
        // Update profile in local state (onAuthStateChanged will handle Firestore)
        const prof: LocalUserProfile = {
          uid: result.user.uid,
          name: authName.trim(),
          phone: '+880 1712-345678', // Default or could add field
          email: result.user.email || '',
          address: address,
          isRegistered: true,
        };
        setUserProfile(prof);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prof));
        setShowAuthModal(false);
        showToast(`🎉 স্বাগতম, ${prof.name}! অ্যাকাউন্ট তৈরি হয়েছে।`);
        setCurrentScreen('profile');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        showToast('এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে');
      } else {
        showToast('অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন');
      }
    }
  };

  // Mobile Sign-Up / Login
  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authPhone.includes('@')) {
      if (authTab === 'signup') {
        handleEmailSignUp();
      } else {
        handleEmailSignIn();
      }
      return;
    }

    if (!authPhone.trim()) {
      showToast('অনুগ্রহ করে মোবাইল নম্বর লিখুন');
      return;
    }
    if (authTab === 'signup' && !authName.trim()) {
      showToast('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
      return;
    }

    const generatedUid = 'user_' + authPhone.replace(/\D/g, '');
    const newProfile: LocalUserProfile = {
      uid: generatedUid,
      name: authName.trim() || userProfile?.name || 'ShohojBuy গ্রাহক',
      phone: authPhone.trim(),
      address: address,
      isRegistered: true,
    };

    setUserProfile(newProfile);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newProfile));

    try {
      const userDocRef = doc(db, 'users', generatedUid);
      await setDoc(userDocRef, {
        ...newProfile,
        cart,
        wishes,
        orders,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${generatedUid}`);
    }

    setShowAuthModal(false);
    showToast(authTab === 'signup' ? '🎉 সাইন-আপ সফল হয়েছে!' : '✓ সফলভাবে লগইন হয়েছে!');
    setCurrentScreen('profile');
  };

  const handleLogout = async () => {
    if (window.confirm('আপনি কি সত্যিই লগ আউট করতে চান?')) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error(err);
      }
      setUserProfile(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      showToast('লগ আউট সম্পন্ন হয়েছে');
      setCurrentScreen('home');
    }
  };

  const handleEditProfile = () => {
    const newName = prompt('আপনার নাম লিখুন:', userProfile?.name || custName);
    if (newName && newName.trim()) {
      const updated: LocalUserProfile = {
        ...(userProfile || {
          uid: 'guest',
          phone: '+880 1712-345678',
          address,
          isRegistered: true,
        }),
        name: newName.trim(),
      };
      setUserProfile(updated);
      setCustName(newName.trim());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      showToast('প্রোফাইল নাম আপডেট হয়েছে ✓');
    }
  };

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast('🛒 পণ্যটি কার্টে যোগ করা হয়েছে');
  };

  // BUY NOW (Bey) Handler - takes product directly to checkout
  const handleBuyNow = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCheckoutItems([{ ...product, qty: 1 }]);
    setIsDirectBuy(true);
    navigateTo('checkout');
    showToast('🚀 সরাসরি অর্ডারের জন্য প্রস্তুত');
  };

  // Checkout from Cart
  const handleCheckoutCart = () => {
    if (cart.length === 0) {
      showToast('আপনার কার্ট খালি রয়েছে');
      return;
    }
    setCheckoutItems([...cart]);
    setIsDirectBuy(false);
    navigateTo('checkout');
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    showToast('কার্ট থেকে রিমুভ করা হয়েছে');
  };

  const changeCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const updated = [...prev];
      updated[index] = { ...item, qty: newQty };
      return updated;
    });
    showToast(delta > 0 ? 'পরিমাণ বাড়ানো হয়েছে' : 'পরিমাণ কমানো হয়েছে');
  };

  const toggleWishlist = (product?: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = product || currentProduct;
    if (!target) return;
    const exists = wishes.some((p) => p.id === target.id);
    if (exists) {
      setWishes((prev) => prev.filter((p) => p.id !== target.id));
      showToast('ইচ্ছেতালিকা থেকে সরানো হয়েছে');
    } else {
      setWishes((prev) => [...prev, target]);
      showToast('♡ ইচ্ছেতালিকায় যোগ হয়েছে');
    }
  };

  const openProductDetail = (prod: Product) => {
    setCurrentProduct(prod);
    setRecentlyViewed((prev) => [prod, ...prev.filter((p) => p.id !== prod.id)]);
    navigateTo('detail');
    setTimeout(() => {
      const container = document.getElementById('detailScrollContainer');
      if (container) {
        container.scrollTop = 0;
      }
    }, 10);
  };

  const openOrdersWithTab = (tab: 'all' | 'to-pay' | 'to-ship' | 'to-receive' | 'to-review' | 'returns') => {
    setOrderFilterTab(tab);
    navigateTo('my-orders');
  };

  const handleOpenReviewModal = (item: { id: number; name: string; emoji: string }) => {
    setReviewTargetItem(item);
    setReviewRating(5);
    setReviewText('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReviewModal(false);
    showToast(`ধন্যবাদ! আপনার ${reviewRating}★ রিভিউ ও মতামত সফলভাবে যোগ হয়েছে ✓`);
  };

  const handleOpenReturnModal = (order: OrderItem) => {
    setReturnTargetOrder(order);
    setReturnReason('পণ্য ক্ষতিগ্রস্ত বা ত্রুটিপূর্ণ');
    setShowReturnModal(true);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnTargetOrder) {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === returnTargetOrder.id ? { ...ord, status: 'রিটার্ন প্রক্রিয়াধীন' } : ord
        )
      );
    }
    setShowReturnModal(false);
    showToast('রিটার্ন ও রিফান্ড রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে ✓ কাস্টমার কেয়ার শীঘ্রই যোগাযোগ করবে');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setListingTitle(searchQuery.trim() ? `"${searchQuery}" ফলাফল` : 'সকল পণ্য');
    navigateTo('listing');
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setListingTitle(`"${tag}" সার্চ ফলাফল`);
    navigateTo('listing');
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeMsg.trim()) {
      showToast('নোটিশের শিরোনাম ও বিবরণ লিখুন');
      return;
    }
    const newNoticeItem: Partial<DealNotice> = {
      tag: '📢 লাইভ আপডেট',
      title: newNoticeTitle.trim(),
      message: newNoticeMsg.trim(),
      date: new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }),
      type: 'urgent',
    };

    try {
      await addDoc(collection(db, 'notices'), {
        ...newNoticeItem,
        createdAt: serverTimestamp(),
      });
      setNewNoticeTitle('');
      setNewNoticeMsg('');
      setShowNoticeForm(false);
      showToast('✓ নতুন মেগা ডিল নোটিশ প্রকাশিত হয়েছে!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notices');
    }
  };

  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    showToast(`কুপন কোড "${code}" কপি হয়েছে ✓`);
  };

  // Place Order Action
  const handlePlaceOrder = async () => {
    if (!custName.trim()) {
      showToast('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
      return;
    }
    if (!phone.trim()) {
      showToast('অনুগ্রহ করে সচল মোবাইল নম্বর লিখুন');
      return;
    }
    if (!address.trim()) {
      showToast('অনুগ্রহ করে ডেলিভারি ঠিকানা লিখুন');
      return;
    }

    // If user selected save location, persist it!
    if (saveLocationChecked) {
      const locData = { name: custName, phone, address, district };
      localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(locData));
      setHasSavedLocation(true);
    }

    const orderItems = checkoutItems.length > 0 ? checkoutItems : cart;
    const newOrderId = 'SB' + Math.floor(1000 + Math.random() * 9000);
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = subtotal + 60;

    const newOrder: OrderItem = {
      id: newOrderId,
      customerName: custName,
      date: new Date().toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      items: [...orderItems],
      total,
      address,
      phone,
      district,
      paymentMethod,
      status: 'অর্ডার গ্রহণ করা হয়েছে',
      trackingCode: 'STF-' + Math.floor(100000 + Math.random() * 900000),
      courier: 'Steadfast Courier',
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    setActiveTrackOrder(newOrder);
    setLastPlacedOrder(newOrder);

    // Save to Firestore
    try {
      const uid = userProfile?.uid || firebaseUser?.uid || 'guest';
      await addDoc(collection(db, 'orders'), {
        ...newOrder,
        userId: uid,
        createdAt: serverTimestamp(),
      });
      if (firebaseUser) {
        await setDoc(doc(db, 'users', firebaseUser.uid), { orders: updatedOrders }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'orders');
    }

    // Clear cart if ordered from cart
    if (!isDirectBuy) {
      setCart([]);
    }

    if (paymentMethod === 'ক্যাশ অন ডেলিভারি') {
      navigateTo('success');
    } else {
      navigateTo('payment-gateway');
    }
  };

  const viewOrderTracking = (order: OrderItem) => {
    setActiveTrackOrder(order);
    navigateTo('tracking');
  };

  // Products filtering
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matches =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (selectedCategory !== 'all' && p.category !== selectedCategory) {
      return false;
    }
    if (activeFilter === 'sale') return !!p.sale;
    return true;
  }).sort((a, b) => {
    if (activeFilter === 'low') return a.price - b.price;
    if (activeFilter === 'high') return b.price - a.price;
    return 0;
  });

  // Category products for detail page
  const categoryRelatedProducts = currentProduct ? products.filter(
    (p) => p.category === currentProduct.category && p.id !== currentProduct.id
  ) : [];
  const otherCategoryProducts = currentProduct ? products.filter(
    (p) => p.category !== currentProduct.category
  ) : [];

  const cartSubtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const checkoutSubtotal = (checkoutItems.length > 0 ? checkoutItems : cart).reduce(
    (s, p) => s + p.price * p.qty,
    0
  );

  // Order status counts for profile and order tabs
  const toPayCount = orders.filter((o) => o.status === 'পেমেন্ট বাকি' || o.status === 'পেমেন্ট অপেক্ষমান').length;
  const toShipCount = orders.filter((o) => o.status === 'অর্ডার নিশ্চিত' || o.status === 'প্রস্তুত হচ্ছে').length;
  const toReceiveCount = orders.filter((o) => o.status === 'ডেলিভারি পথে').length;
  const toReviewCount = orders.filter((o) => o.status === 'ডেলিভারি সম্পন্ন' || o.status === 'রিসিভ হয়েছে').length;
  const returnCount = orders.filter((o) => o.status === 'বাতিল' || o.status === 'রিটার্ন প্রক্রিয়াধীন' || o.status === 'রিটার্ন সম্পন্ন').length;

  const filteredOrdersList = orders.filter((ord) => {
    if (orderFilterTab === 'all') return true;
    if (orderFilterTab === 'to-pay') return ord.status === 'পেমেন্ট বাকি' || ord.status === 'পেমেন্ট অপেক্ষমান';
    if (orderFilterTab === 'to-ship') return ord.status === 'অর্ডার নিশ্চিত' || ord.status === 'প্রস্তুত হচ্ছে';
    if (orderFilterTab === 'to-receive') return ord.status === 'ডেলিভারি পথে';
    if (orderFilterTab === 'to-review') return ord.status === 'ডেলিভারি সম্পন্ন' || ord.status === 'রিসিভ হয়েছে';
    if (orderFilterTab === 'returns') return ord.status === 'বাতিল' || ord.status === 'রিটার্ন প্রক্রিয়াধীন' || ord.status === 'রিটার্ন সম্পন্ন';
    return true;
  });

  const isDarkStatusBar = currentScreen === 'splash' || currentScreen === 'home';
  const isCurrentProductInWishlist = currentProduct && wishes.some((p) => p.id === currentProduct.id);

  return (
    <div className="phone" id="app">
      {/* 1. SPLASH SCREEN */}
      <section className={`screen ${currentScreen === 'splash' ? 'active' : ''}`} id="splash">
        <div className="splash">
          <div>
            <div style={{ 
              marginBottom: '18px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0px',
              background: '#ffffff',
              padding: '4px 12px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              <img 
                src="https://i.postimg.cc/L5G75QbJ/1000038253-removebg-preview.png" 
                alt="Logo Icon" 
                style={{ height: '48px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
              <img 
                src="https://i.postimg.cc/vB28qMcz/1000038255-removebg-preview.png" 
                alt="ShohojBey Text" 
                style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block', marginLeft: '-6px' }} 
              />
            </div>
            <p>Shop Easy, Live Better</p>
          </div>
          <div className="tag">
            সহজে সেরা শপিং
            <br />
            সুন্দর ও স্মার্ট জীবনের জন্য
            <button
              className="enterApp"
              id="enterAppBtn"
              onClick={enterApp}
              type="button"
            >
              অ্যাপে প্রবেশ করুন&nbsp; →
            </button>
          </div>
          <div className="dots">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <div className={`splashLoading ${splashLoading ? 'show' : ''}`} id="splashLoading">
            <div className="loader"></div>
            <b>লোড হচ্ছে...</b>
            <span>আপনার ShohojBuy অ্যাপ প্রস্তুত করা হচ্ছে</span>
          </div>
        </div>
      </section>

      {/* 2. HOME SCREEN */}
      <section className={`screen ${currentScreen === 'home' ? 'active' : ''}`} id="home">
        <div
          className="scroll"
          onScroll={(e) => {
            const st = e.currentTarget.scrollTop;
            if (st > 45 && !isHomeScrolled) {
              setIsHomeScrolled(true);
            } else if (st <= 45 && isHomeScrolled) {
              setIsHomeScrolled(false);
            }
          }}
        >
          {/* Sticky Header When Scrolled Down */}
          {isHomeScrolled && (
            <div className="top dark homeTopBar scrolled" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
              <div className="homeScrolledSearchRow">
                <form className="scrolledSearchForm" onSubmit={handleSearch}>
                  <span className="scrolledSearchIcon">⌕</span>
                  <input
                    id="scrolledSearchInput"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="পণ্য খুঁজুন: মোবাইল, ল্যাপটপ বা গ্যাজেট..."
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="scrolledSearchClear"
                      onClick={() => setSearchQuery('')}
                      title="মুছুন"
                    >
                      ×
                    </button>
                  )}
                  <button type="submit" className="scrolledSearchBtn">
                    খুঁজুন
                  </button>
                </form>
                <button
                  className="circle"
                  onClick={() => navigateTo('profile')}
                  title="প্রোফাইল"
                  style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', width: '32px', height: '32px', fontSize: '14px', flexShrink: 0 }}
                >
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '♙'
                  )}
                </button>
              </div>

              {/* Categories Bar inside Sticky Header when scrolled */}
              <div className="homeStickyCategoryRow">
                {[
                  { id: 'all', emoji: '🔥', name: 'সকল পণ্য' },
                  { id: 'মোবাইল', emoji: '📱', name: 'মোবাইল' },
                  { id: 'ল্যাপটপ', emoji: '💻', name: 'ল্যাপটপ' },
                  { id: 'ইলেকট্রনিক্স', emoji: '🎧', name: 'অডিও' },
                  { id: 'স্মার্টওয়াচ', emoji: '⌚', name: 'স্মার্টওয়াচ' },
                  { id: 'গ্যাজেটস', emoji: '⚡', name: 'গ্যাজেট' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`homeStickyCatBtn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.id !== 'all') {
                        setListingTitle(cat.name);
                        navigateTo('listing');
                      }
                    }}
                  >
                    <span>{cat.emoji}</span> {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 1. TOP HERO BACKGROUND BANNER (Transparent Header + Search blended seamlessly) */}
          <div className="homeHeroBannerContainer">
            {/* Top Bar - Transparent/Invisible over Background Banner */}
            <div className="top dark homeTopBar transparentHeader">
              <div className="homeBrandRow">
                <div className="homeBrandLeft" style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0px',
                  background: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  width: 'fit-content',
                  flex: 'none'
                }}>
                  <img 
                    src="https://i.postimg.cc/L5G75QbJ/1000038253-removebg-preview.png" 
                    alt="Logo Icon" 
                    style={{ height: '26px', width: 'auto', objectFit: 'contain', display: 'block' }} 
                  />
                  <img 
                    src="https://i.postimg.cc/vB28qMcz/1000038255-removebg-preview.png" 
                    alt="ShohojBey Text" 
                    style={{ height: '20px', width: 'auto', objectFit: 'contain', display: 'block', marginLeft: '-3px' }} 
                  />
                </div>
                <div className="homeBrandRight">
                  <button
                    className="circle"
                    onClick={() => navigateTo('profile')}
                    title="প্রোফাইল"
                  >
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      '♙'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Box inside Background Banner */}
            <form className="searchbox inBannerSearch" onSubmit={handleSearch}>
              <input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কি খুঁজছেন? মোবাইল, ল্যাপটপ বা গ্যাজেটস..."
              />
              <button type="submit" id="searchSubmitBtn">⌕</button>
            </form>
          </div>

          {/* Dynamic Banners Section */}
          {banners.length > 0 ? (
            <div className="banners-section" style={{ padding: '0 15px', marginBottom: '20px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: banners.length === 1 ? '1fr' : '1fr 1fr', 
                gap: '12px' 
              }}>
                {banners.map((banner) => (
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    key={banner.id} 
                    onClick={() => {
                      if (banner.link) {
                        if (banner.link.startsWith('/')) navigateTo(banner.link.substring(1) as any);
                        else window.open(banner.link, '_blank');
                      }
                    }}
                    style={{ 
                      height: banners.length === 1 ? '180px' : '140px', 
                      borderRadius: '18px', 
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
                    }}
                  >
                    <img src={banner.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {banner.title && (
                      <div style={{ 
                        position: 'absolute', 
                        bottom: 0, left: 0, right: 0, 
                        padding: '12px', 
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        color: 'white'
                      }}>
                        <p style={{ fontSize: '12px', fontWeight: '800', margin: 0 }}>{banner.title}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hero">
              <div className="heroCopy">
                <span className="pill">🔥 স্পেশাল অফার</span>
                <h1>
                  Shohoj<span>Buy</span>
                </h1>
                <h3>আপনার বিশ্বস্ত স্মার্ট গ্যাজেট পার্টনার!</h3>
                <p>১০০% আসল প্রোডাক্ট, ধামাকা মূল্যছাড় এবং দ্রুততম ডেলিভারি।</p>
                <button onClick={() => navigateTo('megadeal')} id="heroBuyBtn">মেগা ডিল দেখুন 🔥</button>
              </div>
              <div className="heroArt">
                <div className="artPhone"></div>
                <div className="artPhone two"></div>
                <div className="artLaptop"></div>
                <div className="artWatch"></div>
                <div className="artPods">🎧</div>
              </div>
            </div>
          )}

          {/* Feature Trust Row */}
          <div className="featureRow">
            <div className="feature">
              <b>🚚</b>সারা দেশে ফ্রি ডেলিভারি
            </div>
            <div className="feature">
              <b>↻</b>৭ দিনে সহজ রিটার্ন
            </div>
            <div className="feature">
              <b>🛡</b>১০০% আসল পণ্য
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="section">
            <div className="title">
              <h3>ক্যাটাগরি সমূহ</h3>
              <a onClick={() => { setSelectedCategory('all'); navigateTo('listing'); }}>সব দেখুন →</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '7px' }}>
              {[
                { emoji: '📱', name: 'মোবাইল', tag: 'মোবাইল' },
                { emoji: '💻', name: 'ল্যাপটপ', tag: 'ল্যাপটপ' },
                { emoji: '🎧', name: 'অডিও', tag: 'ইলেকট্রনিক্স' },
                { emoji: '⌚', name: 'স্মার্টওয়াচ', tag: 'ইলেকট্রনিক্স' },
              ].map((c, i) => (
                <button
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid #e7eeec',
                    borderRadius: '10px',
                    padding: '10px 4px',
                    textAlign: 'center',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#263b37',
                    boxShadow: '0 2px 7px rgba(0,0,0,0.03)',
                  }}
                  onClick={() => {
                    setSelectedCategory(c.tag);
                    setListingTitle(c.name);
                    navigateTo('listing');
                  }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '3px' }}>{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Products */}
          <div className="section">
            <div className="title">
              <h3>জনপ্রিয় ও ট্রেন্ডিং পণ্য</h3>
              <a onClick={() => navigateTo('listing')} id="seeAllProducts">সকল পণ্য →</a>
            </div>
            <div className="products" id="homeProducts">
              {products.slice(0, 4).map((p) => (
                <article
                  key={p.id}
                  className="product"
                  onClick={() => openProductDetail(p)}
                >
                  {p.sale && <span className="sale">{p.sale}</span>}
                  <button
                    type="button"
                    className={`pWishBtn ${wishes.some((w) => w.id === p.id) ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(p, e)}
                  >
                    {wishes.some((w) => w.id === p.id) ? '♥' : '♡'}
                  </button>
                  <div className="pimg">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      p.emoji
                    )}
                  </div>
                  <div className="pi">
                    <h4>{p.name}</h4>
                    <small>{p.brand}</small>
                    <div className="price">
                      {money(p.price)} <span className="old">{money(p.old)}</span>
                    </div>
                    <div className="rating">★ {p.rating}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* 5-Tab Bottom Navigation */}
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {/* 3. DEDICATED MEGA DEAL & NOTICES SCREEN */}
      <section className={`screen ${currentScreen === 'megadeal' ? 'active' : ''}`} id="megadeal">
        <div className="scroll">
          <div className="top" style={{ position: 'sticky', top: 0, zIndex: 20, background: '#ffffff' }}>
            <button className="back" onClick={() => navigateTo('home')}>‹</button>
            <h2>🔥 মেগা ডিল ও স্পেশাল অফার</h2>
            <div className="grow"></div>
          </div>

          {/* Flash Sale Banner with Live Timer */}
          <div className="dealBanner">
            <span style={{ background: '#fff', color: '#ea580c', padding: '3px 8px', borderRadius: '8px', fontSize: '9px', fontWeight: 900 }}>
              ⚡ এক্সক্লুসিভ ফ্ল্যাশ সেল
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '8px 0 2px' }}>
              মেগা ডিসকাউন্ট ডিলস
            </h1>
            <p style={{ fontSize: '10px', margin: '0', color: '#ffe4e6' }}>
              ৫০% পর্যন্ত নিশ্চিত মূল্যছাড় • অফার শেষ হতে বাকি:
            </p>
            <div className="countdownBox">
              <div className="countUnit">
                <b>{String(countdown.hours).padStart(2, '0')}</b>
                <span>ঘণ্টা</span>
              </div>
              <div className="countUnit">
                <b>{String(countdown.mins).padStart(2, '0')}</b>
                <span>মিনিট</span>
              </div>
              <div className="countUnit">
                <b>{String(countdown.secs).padStart(2, '0')}</b>
                <span>সেকেন্ড</span>
              </div>
            </div>
          </div>

          {/* Special Notices & Vouchers Feed */}
          <div className="section">
            <div className="title">
              <h3>🏷️ বিশেষ অফার ও ডিসকাউন্ট ভাউচার ({notices.length})</h3>
            </div>
            {notices.map((nt) => (
              <div key={nt.id} className="noticeCard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="noticeTag">{nt.tag}</span>
                  <span style={{ fontSize: '8.5px', color: '#9aa8a5' }}>{nt.date}</span>
                </div>
                <b style={{ fontSize: '12px', color: '#1a2e2b', display: 'block', margin: '4px 0 2px' }}>
                  {nt.title}
                </b>
                <p style={{ fontSize: '10px', color: '#556865', margin: 0, lineHeight: 1.45 }}>
                  {nt.message}
                </p>
                {nt.couponCode && (
                  <div className="couponChip">
                    <div>
                      <span style={{ fontSize: '8px', color: '#788e8a', display: 'block' }}>কুপন কোড:</span>
                      <span className="couponCode">{nt.couponCode}</span>
                    </div>
                    <button
                      type="button"
                      className="copyBtn"
                      onClick={() => handleCopyCoupon(nt.couponCode!)}
                    >
                      কপি করুন 📋
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mega Discount Deal Products */}
          <div className="section" style={{ marginTop: '10px' }}>
            <div className="title">
              <h3>হট মেগা ডিল পণ্যসমূহ</h3>
              <a onClick={() => navigateTo('listing')}>সব পণ্য →</a>
            </div>
            <div className="products">
              {products.filter(p => p.isMegaDeal).map((p) => (
                <article
                  key={p.id}
                  className="product"
                  onClick={() => openProductDetail(p)}
                >
                  {p.sale && <span className="sale" style={{ background: '#ea580c' }}>🔥 {p.sale}</span>}
                  <button
                    type="button"
                    className={`pWishBtn ${wishes.some((w) => w.id === p.id) ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(p, e)}
                  >
                    {wishes.some((w) => w.id === p.id) ? '♥' : '♡'}
                  </button>
                  <div className="pimg">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      p.emoji
                    )}
                  </div>
                  <div className="pi">
                    <h4>{p.name}</h4>
                    <small>{p.brand}</small>
                    <div className="price">
                      {money(p.price)} <span className="old">{money(p.old)}</span>
                    </div>
                    {p.stockLeft && (
                      <div style={{ margin: '4px 0 2px', fontSize: '8px', color: '#e11d48', fontWeight: 800 }}>
                        ⚠️ মাত্র {p.stockLeft}টি স্টক বাকি!
                      </div>
                    )}
                    <div className="rating">★ {p.rating}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {currentScreen === 'detail' && currentProduct && (
        <section className={`screen active`} id="detail">
          {/* Floating Top Nav Actions (Stays pinned cleanly at top while scrolling) */}
          <div className="detailNavOverlay">
            <button
              className="detailExitBtn"
              onClick={() => navigateTo('home')}
              title="ফিরে যান"
              aria-label="ফিরে যান"
              id="detailBackExitBtn"
            >
              ‹
            </button>
            <button
              className="detailHeartBtn"
              onClick={(e) => toggleWishlist(currentProduct, e)}
              title={wishes.some((p) => p.id === currentProduct.id) ? 'পছন্দ তালিকা থেকে সরান' : 'পছন্দের তালিকায় রাখুন'}
              aria-label="পছন্দ"
            >
              {wishes.some((p) => p.id === currentProduct.id) ? '♥' : '♡'}
            </button>
          </div>

          {/* Unified Scroll View: Product Image, Details, Specs, Category Carousel, and Trending Products */}
          <div className="detailScroll" id="detailScrollContainer">
            <div className="detailImg" id="detailImg">
              {currentProduct.images && currentProduct.images.length > 0 ? (
                <div style={{ width: '100%', height: '100%', overflowX: 'auto', display: 'flex', scrollSnapType: 'x mandatory' }}>
                  {currentProduct.images.map((img, i) => (
                    <img 
                      key={i} 
                      src={img} 
                      alt="" 
                      style={{ 
                        minWidth: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        scrollSnapAlign: 'start' 
                      }} 
                    />
                  ))}
                </div>
              ) : (
                currentProduct.emoji
              )}
            </div>

            <div className="detail" id="detailInfo">
              <small className="brand">{currentProduct.brand} • ক্যাটাগরি: {currentProduct.category}</small>
              <h1>{currentProduct.name}</h1>
              <div className="rating">★ {currentProduct.rating} গ্রাহক সন্তুষ্টি</div>
              <div className="bigprice">
                {money(currentProduct.price)}{' '}
                <span className="old">{money(currentProduct.old)}</span>
              </div>

            <b style={{ fontSize: '11px', color: '#253835' }}>কালার বা ভ্যারিয়েন্ট পছন্দ করুন</b>
            <div className="choice">
              <i
                className={selectedColorIndex === 0 ? 'active' : ''}
                onClick={() => setSelectedColorIndex(0)}
              ></i>
              <i
                className={selectedColorIndex === 1 ? 'active' : ''}
                onClick={() => setSelectedColorIndex(1)}
              ></i>
              <i
                className={selectedColorIndex === 2 ? 'active' : ''}
                onClick={() => setSelectedColorIndex(2)}
              ></i>
            </div>

            {/* Product Specifications & Assurances */}
            <div className="specGrid">
              <div className="specItem">
                <b>🛡️ ১০০% আসল পণ্য</b>
                অফিসিয়াল অথেনটিক গ্যারান্টি
              </div>
              <div className="specItem">
                <b>🚚 দ্রুত হোম ডেলিভারি</b>
                ২৪-৪৮ ঘণ্টার মধ্যে পৌঁছাবে
              </div>
              <div className="specItem">
                <b>🔄 ৭ দিনের রিটার্ন</b>
                সহজ রিপ্লেসমেন্ট সুবিধা
              </div>
              <div className="specItem">
                <b>💵 ক্যাশ অন ডেলিভারি</b>
                হাতে পেয়ে মূল্য পরিশোধ করুন
              </div>
            </div>

            <p style={{ fontSize: '10.5px', color: '#556865', lineHeight: 1.6, background: '#f6faf8', padding: '10px 12px', borderRadius: '10px' }}>
              {currentProduct.description || '১০০% অরিজিনাল প্রোডাক্ট • নিরাপদ প্যাকেজিং • দ্রুত হোম ডেলিভারি ও সহজ রিটার্ন গ্যারান্টি।'}
            </p>

            {/* RELATED PRODUCTS IN SAME CATEGORY (Horizontal Scroll Serialized left to right) */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <b style={{ fontSize: '12px', color: '#073e35' }}>
                  {currentProduct.category === 'মোবাইল' ? '📱' : currentProduct.category === 'ল্যাপটপ' ? '💻' : '🎧'} এই ক্যাটাগরির আরও আকর্ষণীয় পণ্য
                </b>
                <span style={{ fontSize: '8.5px', color: '#07845b', fontWeight: 800 }}>বাম থেকে ডানে স্ক্রোল করুন →</span>
              </div>
              <div className="horizontalScroll">
                {categoryRelatedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="hProductCard"
                    onClick={() => openProductDetail(p)}
                  >
                    <div className="hImg">{p.emoji}</div>
                    <h5>{p.name}</h5>
                    <div className="hPrice">{money(p.price)}</div>
                    <button
                      type="button"
                      className="hBuyBtn"
                      onClick={(e) => handleBuyNow(p, e)}
                    >
                      ⚡ কিনুন
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* OTHER CATEGORY TRENDING PRODUCTS */}
            <div style={{ marginTop: '14px' }}>
              <b style={{ fontSize: '12px', color: '#073e35', display: 'block', marginBottom: '8px' }}>
                ✨ অন্যান্য ক্যাটাগরির সেরা পণ্যসমূহ
              </b>
              <div className="products">
                {otherCategoryProducts.slice(0, 4).map((p) => (
                  <article
                    key={p.id}
                    className="product"
                    onClick={() => openProductDetail(p)}
                  >
                    {p.sale && <span className="sale">{p.sale}</span>}
                    <div className="pimg" style={{ height: '95px', fontSize: '42px' }}>
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    <div className="pi">
                      <h4>{p.name}</h4>
                      <small>{p.brand}</small>
                      <div className="price">{money(p.price)}</div>
                      <div className="rating">★ {p.rating}</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add to Cart & Buy Now (Bey) */}
        <div className="detailBottom">
          <button
            className="outline"
            onClick={() => currentProduct && addToCart(currentProduct)}
            id="detailAddCartBtn"
          >
            🛒 কার্ডে যোগ
          </button>
          <button
            className="green"
            onClick={() => currentProduct && handleBuyNow(currentProduct)}
            id="detailBuyNowBtn"
          >
            ⚡ Bey (এখনই কিনুন)
          </button>
        </div>
      </section>
      )}

      {/* 5. LISTING / SHOP SCREEN */}
      <section className={`screen ${currentScreen === 'listing' ? 'active' : ''}`} id="listing">
        <div className="scroll">
          <div className="top">
            <button className="back" onClick={() => navigateTo('home')}>‹</button>
            <h2 id="listingTitle">{listingTitle}</h2>
            <div className="grow"></div>
            <button className="circle" onClick={() => navigateTo('cart')}>🛒</button>
          </div>

          <div className="filters">
            <button
              className={`filter ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              সকল পণ্য
            </button>
            <button
              className={`filter ${activeFilter === 'low' ? 'active' : ''}`}
              onClick={() => setActiveFilter('low')}
            >
              কম দাম
            </button>
            <button
              className={`filter ${activeFilter === 'high' ? 'active' : ''}`}
              onClick={() => setActiveFilter('high')}
            >
              বেশি দাম
            </button>
            <button
              className={`filter ${activeFilter === 'sale' ? 'active' : ''}`}
              onClick={() => setActiveFilter('sale')}
            >
              🔥 ছাড়ের পণ্য
            </button>
          </div>

          <div className="section">
            <div className="products" id="listingProducts">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <article
                    key={p.id}
                    className="product"
                    onClick={() => openProductDetail(p)}
                  >
                    {p.sale && <span className="sale">{p.sale}</span>}
                    <button
                      type="button"
                      className={`pWishBtn ${wishes.some((w) => w.id === p.id) ? 'active' : ''}`}
                      onClick={(e) => toggleWishlist(p, e)}
                    >
                      {wishes.some((w) => w.id === p.id) ? '♥' : '♡'}
                    </button>
                    <div className="pimg">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    <div className="pi">
                      <h4>{p.name}</h4>
                      <small>{p.brand}</small>
                      <div className="price">
                        {money(p.price)} <span className="old">{money(p.old)}</span>
                      </div>
                      <div className="rating">★ {p.rating}</div>
                    </div>
                  </article>
                ))
              ) : (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 10px', color: '#888', fontSize: '11px' }}>
                  কোনো পণ্য পাওয়া যায়নি
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {/* 6. WISHLIST SCREEN */}
      <section className={`screen ${currentScreen === 'wishlist' ? 'active' : ''}`} id="wishlist">
        <div className="scroll">
          <div className="top">
            <button className="back" onClick={() => navigateTo('home')}>‹</button>
            <h2>আমার ইচ্ছেতালিকা ({wishes.length})</h2>
            <div className="grow"></div>
            <span>♡</span>
          </div>
          <div className="section">
            <div className="products" id="wishProducts">
              {wishes.length > 0 ? (
                wishes.map((p) => (
                  <article
                    key={p.id}
                    className="product"
                    onClick={() => openProductDetail(p)}
                  >
                    {p.sale && <span className="sale">{p.sale}</span>}
                    <div className="pimg">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    <div className="pi">
                      <h4>{p.name}</h4>
                      <small>{p.brand}</small>
                      <div className="price">
                        {money(p.price)} <span className="old">{money(p.old)}</span>
                      </div>
                      <div className="rating">★ {p.rating}</div>
                    </div>
                  </article>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 10px', color: '#888', fontSize: '11px', gridColumn: 'span 2' }}>
                  ♡<br /><br />
                  আপনার ইচ্ছেতালিকা এখনো খালি রয়েছে।
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {/* 7. CART SCREEN */}
      <section className={`screen ${currentScreen === 'cart' ? 'active' : ''}`} id="cart">
        <div className="scroll">
          <div className="top">
            <button className="back" onClick={() => navigateTo('home')}>‹</button>
            <h2>আমার শপিং কার্ট ({cart.length})</h2>
            <div className="grow"></div>
          </div>
          <div id="cartList">
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 20px', color: '#888', fontSize: '12px' }}>
                🛒<br /><br />
                আপনার কার্ট বর্তমানে খালি আছে।
                <br />
                <button
                  className="green"
                  style={{ marginTop: '16px', padding: '8px 18px', borderRadius: '8px', fontSize: '11px' }}
                  onClick={() => navigateTo('listing')}
                >
                  শপিং শুরু করুন →
                </button>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="cartItem">
                  <div className="thumb">{item.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <h4>{item.name}</h4>
                    <p>{money(item.price)}</p>
                    <div className="qty">
                      <button onClick={() => changeCartQty(idx, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => changeCartQty(idx, 1)}>+</button>
                    </div>
                  </div>
                  <button
                    style={{ background: 'none', color: '#9ba4a2', fontSize: '19px', cursor: 'pointer' }}
                    onClick={() => removeFromCart(idx)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="summary" id="cartSummary">
              <div className="sum">
                <span>পণ্যসমূহের মূল্য (Subtotal)</span>
                <b>{money(cartSubtotal)}</b>
              </div>
              <div className="sum">
                <span>ডেলিভারি চার্জ</span>
                <b>৳ 60</b>
              </div>
              <div className="sum total">
                <span>সর্বমোট প্রদেয়</span>
                <b>{money(cartSubtotal + 60)}</b>
              </div>
              <button
                className="green"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  marginTop: '12px',
                }}
                onClick={handleCheckoutCart}
                id="cartCheckoutBtn"
              >
                চেকআউট করুন →
              </button>
            </div>
          )}
        </div>
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {/* 8. DEDICATED CHECKOUT & LOCATION / ADDRESS PAGE */}
      <section className={`screen ${currentScreen === 'checkout' ? 'active' : ''}`} id="checkout">
        <div className="scroll" style={{ paddingBottom: '90px' }}>
          <div className="top">
            <button className="back" onClick={() => navigateTo('detail')}>‹</button>
            <h2>অর্ডার চেকআউট ও ডেলিভারি ঠিকানা</h2>
            <div className="grow"></div>
          </div>

          <div className="form">
            {/* Ordered Items Preview */}
            <div style={{ background: '#f8faf9', border: '1px solid #e1ece8', borderRadius: '12px', padding: '10px 12px', margin: '10px 0' }}>
              <b style={{ fontSize: '11px', color: '#073e35' }}>
                📦 অর্ডারকৃত পণ্যসমূহ ({checkoutItems.length > 0 ? checkoutItems.length : cart.length}টি):
              </b>
              {(checkoutItems.length > 0 ? checkoutItems : cart).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', marginTop: '6px' }}>
                  <span>{item.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{item.name} × {item.qty}</span>
                  <b style={{ color: '#07845b' }}>{money(item.price * item.qty)}</b>
                </div>
              ))}
            </div>

            {/* Saved Location Badge */}
            {hasSavedLocation && (
              <div className="savedLocationCard">
                <div>
                  <span style={{ fontSize: '9px', color: '#07845b', fontWeight: 800 }}>✓ সেভ করা লোকেশন লোড হয়েছে</span>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#16312d' }}>
                    {custName} • {phone}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#556865' }}>{address} ({district})</div>
                </div>
                <button
                  type="button"
                  style={{ background: '#fff', border: '1px solid #b7e8d6', color: '#07845b', padding: '4px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 800 }}
                  onClick={() => showToast('নিচের ফর্ম থেকে তথ্য পরিবর্তন করুন')}
                >
                  পরিবর্তন
                </button>
              </div>
            )}

            {/* Address Input Form */}
            <div className="field">
              <label>আপনার সম্পূর্ণ নাম *</label>
              <input
                id="checkoutCustName"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="যেমনঃ শাহরিয়ার আল শাকিব"
                required
              />
            </div>

            <div className="field">
              <label>সচল মোবাইল নম্বর (ডেলিভারি কল পাওয়ার জন্য) *</label>
              <input
                id="checkoutPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                required
              />
            </div>

            <div className="field">
              <label>জেলা / বিভাগ</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={{ width: '100%', height: '42px', border: '1px solid #dfe8e5', borderRadius: '8px', padding: '0 12px', background: '#fff' }}
              >
                <option value="ঢাকা">ঢাকা</option>
                <option value="চট্টগ্রাম">চট্টগ্রাম</option>
                <option value="সিলেট">সিলেট</option>
                <option value="রাজশাহী">রাজশাহী</option>
                <option value="খুলনা">খুলনা</option>
                <option value="বরিশাল">বরিশাল</option>
                <option value="রংপুর">রংপুর</option>
                <option value="ময়মনসিংহ">ময়মনসিংহ</option>
              </select>
            </div>

            <div className="field">
              <label>বিস্তারিত ডেলিভারি ঠিকানা (রোড, বাড়ি নং, এলাকা) *</label>
              <input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="বাড়ি ১২, রোড ৪, ব্লক সি, ধানমন্ডি"
                required
              />
            </div>

            {/* Save Location Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 700, color: '#07845b', background: '#eafaf4', padding: '9px 12px', borderRadius: '8px', margin: '10px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveLocationChecked}
                onChange={(e) => setSaveLocationChecked(e.target.checked)}
                style={{ accentColor: '#00a45d', width: '15px', height: '15px' }}
              />
              ✓ এই ঠিকানা ও লোকেশন ভবিষ্যতে ব্যবহারের জন্য সেভ রাখুন
            </label>

            {/* Payment Method */}
            <div className="payment">
              <b style={{ fontSize: '11.5px', color: '#093630' }}>পেমেন্ট মাধ্যম বেছে নিন</b>
              <label className="payrow">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === 'ক্যাশ অন ডেলিভারি'}
                  onChange={() => setPaymentMethod('ক্যাশ অন ডেলিভারি')}
                />{' '}
                💵 ক্যাশ অন ডেলিভারি <span style={{ marginLeft: 'auto', color: '#07845b', fontSize: '9px', fontWeight: 800 }}>পণ্য পেয়ে টাকা দিন</span>
              </label>
              <label className="payrow">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === 'পেমেন্ট নাও'}
                  onChange={() => setPaymentMethod('পেমেন্ট নাও')}
                />{' '}
                💳 পেমেন্ট নাও (অনলাইন পেমেন্ট / বিকাশ / নগদ) <span style={{ marginLeft: 'auto', color: '#147ff5', fontSize: '9px', fontWeight: 800 }}>নিরাপদ গেটওয়ে</span>
              </label>
            </div>

            {/* Summary */}
            <div className="summary" style={{ margin: '10px 0' }}>
              <div className="sum">
                <span>পণ্যের মোট মূল্য</span>
                <b>{money(checkoutSubtotal)}</b>
              </div>
              <div className="sum">
                <span>ডেলিভারি চার্জ</span>
                <b>৳ 60</b>
              </div>
              <div className="sum total">
                <span>সর্বমোট বিল</span>
                <b style={{ color: '#07845b' }}>{money(checkoutSubtotal + 60)}</b>
              </div>
            </div>

            {/* Confirm Order Button */}
            <button
              className="green"
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 900,
                marginTop: '14px',
                boxShadow: '0 6px 18px rgba(0, 164, 93, 0.4)',
              }}
              onClick={handlePlaceOrder}
              id="confirmOrderBtn"
            >
              ✓ অর্ডার কনফার্ম করুন
            </button>
          </div>
        </div>
      </section>

      {/* 8.5 PAYBD MFS PAYMENT GATEWAY SELECTION SCREEN */}
      <section className={`screen ${currentScreen === 'payment-gateway' ? 'active' : ''}`} id="payment-gateway">
        <div className="scroll" style={{ padding: '16px 16px 80px', background: '#f4f8fc', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100%' }}>
          <div className="card-container" style={{ width: '100%', maxWidth: '380px', background: '#ffffff', borderRadius: '16px', padding: '24px 20px 20px 20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
            
            {/* Back Button & Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', position: 'relative' }}>
              <button
                onClick={() => navigateTo('checkout')}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', cursor: 'pointer', color: '#334155', fontWeight: 700 }}
                title="ফিরে যান"
              >
                ‹
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 750, fontSize: '16px', color: '#0f172a', marginRight: '36px' }}>
                পেমেন্ট মাধ্যম নির্বাচন করুন
              </div>
            </div>

            {/* Top Merchant Account Divider */}
            <div className="header-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <div className="line" style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#5a738e' }}>Merchant Account</span>
              <div className="line" style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            {/* Amount Box */}
            <div className="amount-box" style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div className="amount-left">
                <div className="label" style={{ fontSize: '13px', color: '#5a738e', marginBottom: '2px' }}>You are paying</div>
                <div className="val" style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {money(lastPlacedOrder?.total || 1473)} <i className="fa-solid fa-chevron-down" style={{ fontSize: '13px', color: '#2563eb' }}></i>
                </div>
              </div>
              <div className="qr-badge" style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#5a738e' }}>
                Pay with <i className="fa-solid fa-qrcode" style={{ fontSize: '18px', color: '#2563eb' }}></i>
              </div>
            </div>

            <div className="section-label" style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Pay with Mobile Banking
            </div>

            {/* Grid Options */}
            <div className="grid-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '22px' }}>
              {PAYMENT_METHODS.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setPaymentGatewayMethod(m.id)}
                  className="option-item"
                  style={{
                    border: `2px solid ${paymentGatewayMethod === m.id ? m.color : '#e2e8f0'}`,
                    borderRadius: '10px',
                    height: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    padding: '8px 4px',
                    background: paymentGatewayMethod === m.id ? m.bg : '#fff',
                    cursor: 'pointer',
                    boxShadow: paymentGatewayMethod === m.id ? `0 4px 12px ${m.color}22` : '0 2px 5px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <img 
                    src={m.img} 
                    alt={m.name} 
                    style={{ maxWidth: '80%', maxHeight: '42px', objectFit: 'contain' }} 
                    onError={(e)=>{ 
                      const target = e.target as HTMLElement;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'block';
                      }
                    }} 
                  />
                  <span style={{ display: 'none', fontSize: '13px', fontWeight: 800, color: m.color, textAlign: 'center' }}>{m.name}</span>
                  {paymentGatewayMethod === m.id && (
                    <span style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '11px', color: m.color, fontWeight: 900 }}>✓</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (!paymentGatewayMethod) {
                  showToast('অনুগ্রহ করে যেকোনো একটি পেমেন্ট মাধ্যম সিলেক্ট করুন');
                  return;
                }
                navigateTo('bkash-payment');
              }}
              className="submit-btn"
              style={{
                width: '100%',
                backgroundColor: paymentGatewayMethod ? '#2563eb' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '46px',
                fontSize: '16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              Pay {money(lastPlacedOrder?.total || 1473)} <i className="fa-solid fa-arrow-right"></i>
            </button>

            <div className="footer-text" style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
              Powered by <strong style={{ color: '#0f172a' }}>Pay<span style={{ color: '#10b981' }}>BD</span></strong>
            </div>

          </div>
        </div>
      </section>

      {/* 8.6 DEDICATED PAYMENT SCREEN WITH TIMER & DYNAMIC BRAND LOGO AND COLOR */}
      {(() => {
        const selectedMethod = PAYMENT_METHODS.find((m) => m.id === paymentGatewayMethod) || PAYMENT_METHODS[0];
        const themeColor = selectedMethod.color;

        return (
          <section className={`screen ${currentScreen === 'bkash-payment' ? 'active' : ''}`} id="bkash-payment">
            <div className="scroll" style={{ padding: '0 0 80px', background: '#f5f6f8', minHeight: '100%' }}>
              <div className="app" style={{ width: '100%', maxWidth: '430px', minHeight: '100vh', margin: 'auto', background: '#fff', position: 'relative' }}>
                
                {/* Timer Banner at Top */}
                <div style={{ background: paymentTimer <= 30 ? '#ef4444' : themeColor, color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 700, position: 'sticky', top: 0, zIndex: 10, transition: 'background 0.3s ease' }}>
                  <span>⏱️ পেমেন্ট সম্পন্ন করার সময় বাকি:</span>
                  <span style={{ background: 'rgba(0,0,0,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '14px', fontFamily: 'monospace' }}>
                    {Math.floor(paymentTimer / 60).toString().padStart(2, '0')}:{(paymentTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* HEADER */}
                <header className="header" style={{ position: 'relative', height: '175px', background: `linear-gradient(145deg, ${themeColor}, ${themeColor}dd)`, borderRadius: '0 0 30px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', overflow: 'hidden', transition: 'background 0.3s ease', padding: '0 16px' }}>
                  <button
                    onClick={() => navigateTo('payment-gateway')}
                    style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer' }}
                    title="ফিরে যান"
                  >
                    ‹
                  </button>
                  <div className="bkash-logo" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: '8px 18px', borderRadius: '14px', boxShadow: '0 6px 16px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '58px', minWidth: '130px' }}>
                      <img src={selectedMethod.img} alt={selectedMethod.name} style={{ maxHeight: '44px', maxWidth: '110px', objectFit: 'contain' }} />
                    </div>
                  </div>
                  <div className="header-subtitle" style={{ position: 'relative', zIndex: 2, marginTop: '10px', fontSize: '14.5px', fontWeight: 600, opacity: '.95' }}>
                    {selectedMethod.name} নিরাপদ পেমেন্ট
                  </div>
                </header>

                <main className="content" style={{ padding: '22px 17px 35px' }}>
                  {/* AMOUNT */}
                  <section className="amount-card" style={{ padding: '20px', borderRadius: '18px', background: '#fff', border: '1px solid #eeeeee', boxShadow: '0 5px 22px rgba(0,0,0,.055)', textAlign: 'center' }}>
                    <div className="amount-label" style={{ color: '#888', fontSize: '14px', marginBottom: '7px' }}>
                      আপনাকে পরিশোধ করতে হবে
                    </div>
                    <div className="amount" style={{ color: '#202124', fontSize: '32px', fontWeight: 800 }}>
                      {money(lastPlacedOrder?.total || 1473)}
                    </div>
                  </section>

                  {/* NUMBER */}
                  <section className="number-card" style={{ marginTop: '15px', padding: '19px', borderRadius: '18px', background: '#fff', border: '1px solid #eeeeee', boxShadow: '0 5px 22px rgba(0,0,0,.055)' }}>
                    <div className="title" style={{ fontSize: '15px', fontWeight: 750, marginBottom: '13px' }}>
                      এই {selectedMethod.name} নম্বরে টাকা পাঠান
                    </div>
                    <div className="number-row" style={{ display: 'flex', gap: '9px' }}>
                      <div className="number-box" id="paymentNumber" style={{ flex: 1, height: '52px', borderRadius: '11px', background: '#f7f7f8', border: '1px solid #dedede', display: 'flex', alignItems: 'center', padding: '0 13px', fontSize: '18px', fontWeight: 750, letterSpacing: '1px' }}>
                        {selectedMethod.number}
                      </div>
                      <button
                        className="copy-button"
                        onClick={() => {
                          if (navigator.clipboard) navigator.clipboard.writeText(selectedMethod.number);
                          showToast('নম্বর কপি হয়েছে ✓');
                        }}
                        style={{ width: '92px', height: '52px', border: 0, borderRadius: '11px', background: themeColor, color: '#fff', fontSize: '13px', fontWeight: 750, cursor: 'pointer', transition: 'background 0.3s ease' }}
                      >
                        কপি করুন
                      </button>
                    </div>
                  </section>

                  {/* INSTRUCTION */}
                  <section className="instruction" style={{ marginTop: '15px', padding: '17px', borderRadius: '16px', background: `${themeColor}0a`, border: `1px solid ${themeColor}33` }}>
                    <div className="instruction-header" style={{ display: 'flex', alignItems: 'center', gap: '9px', color: themeColor, fontWeight: 800, fontSize: '15px', marginBottom: '10px' }}>
                      <span className="info-icon" style={{ width: '25px', height: '25px', borderRadius: '50%', background: themeColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 900 }}>i</span>
                      যেভাবে পেমেন্ট করবেন
                    </div>
                    <ol style={{ paddingLeft: '22px', color: '#555', fontSize: '13.5px', lineHeight: 1.8 }}>
                      <li>আপনার <b>{selectedMethod.name} App</b> খুলুন।</li>
                      <li><b>Send Money</b> নির্বাচন করুন।</li>
                      <li>উপরের নম্বরে টাকা পাঠান।</li>
                      <li>পেমেন্টের পরিমাণ <b>{money(lastPlacedOrder?.total || 1473)}</b> রাখুন।</li>
                      <li>পেমেন্ট সম্পন্ন করুন।</li>
                      <li>আপনার <b>Transaction ID</b> কপি করুন।</li>
                    </ol>
                  </section>

                  {/* TRANSACTION ID */}
                  <section className="transaction-card" style={{ marginTop: '15px', padding: '19px', borderRadius: '18px', background: '#fff', border: '1px solid #eeeeee', boxShadow: '0 5px 22px rgba(0,0,0,.055)' }}>
                    <label className="input-label" htmlFor="transactionId" style={{ display: 'block', fontSize: '14px', fontWeight: 750, marginBottom: '9px' }}>
                      Transaction ID লিখুন *
                    </label>
                    <div className="input-wrapper" style={{ position: 'relative' }}>
                      <input
                        id="transactionId"
                        className="transaction-input"
                        type="text"
                        maxLength={30}
                        value={gatewayTrxId}
                        onChange={(e) => setGatewayTrxId(e.target.value)}
                        placeholder="আপনার Transaction ID লিখুন"
                        autoComplete="off"
                        style={{ width: '100%', height: '53px', border: '1.5px solid #d9d9d9', borderRadius: '11px', outline: 'none', padding: '0 15px', fontSize: '15px', background: '#fff', textTransform: 'uppercase' }}
                      />
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 750, marginBottom: '9px' }}>
                        আপনার মোবাইল নম্বর *
                      </label>
                      <input
                        type="tel"
                        value={gatewaySenderPhone}
                        onChange={(e) => setGatewaySenderPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        style={{ width: '100%', height: '53px', border: '1.5px solid #d9d9d9', borderRadius: '11px', outline: 'none', padding: '0 15px', fontSize: '15px', background: '#fff' }}
                      />
                    </div>
                  </section>

                  {/* WARNING */}
                  <section className="warning" style={{ display: 'flex', gap: '11px', marginTop: '15px', padding: '14px', borderRadius: '14px', background: '#fff9e8', border: '1px solid #f0dfaa', color: '#705b24', fontSize: '12.5px', lineHeight: 1.6 }}>
                    <div className="warning-icon" style={{ minWidth: '25px', height: '25px', borderRadius: '50%', background: '#edb91f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>!</div>
                    <div>
                      <b>সতর্কতা:</b> টাকা পাঠানোর আগে নম্বর এবং টাকার পরিমাণ ভালোভাবে যাচাই করুন। আপনার <b>PIN বা OTP কখনো কারও সাথে শেয়ার করবেন না।</b>
                    </div>
                  </section>

                  {/* SUBMIT */}
                  <button
                    className="submit-button"
                    onClick={async () => {
                      if (!gatewaySenderPhone.trim()) {
                        showToast('আপনার মোবাইল নম্বরটি লিখুন');
                        return;
                      }
                      if (!gatewayTrxId.trim()) {
                        showToast('দয়া করে Transaction ID লিখুন');
                        return;
                      }
                      showToast('✓ Transaction ID সফলভাবে জমা হয়েছে!');
                      if (lastPlacedOrder) {
                        try {
                          // Update Firestore status and Transaction ID
                          const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
                          await addDoc(collection(db, 'paymentRequests'), {
                            orderId: lastPlacedOrder.id,
                            trxId: gatewayTrxId,
                            sender: gatewaySenderPhone,
                            method: paymentGatewayMethod,
                            userEmail: userProfile?.email || 'N/A',
                            amount: lastPlacedOrder.total,
                            timestamp: serverTimestamp()
                          });
                          
                          // For simplicity in this demo, we'll assume the doc ID matches or we find it
                          // In a production app, use the Firestore document ID stored during handlePlaceOrder
                        } catch (err) {
                          console.error(err);
                        }
                      }
                      navigateTo('success');
                    }}
                    style={{ width: '100%', height: '56px', marginTop: '17px', border: 0, borderRadius: '13px', background: `linear-gradient(100deg, ${themeColor}, ${themeColor}dd)`, color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 7px 18px ${themeColor}33`, transition: 'background 0.3s ease' }}
                  >
                    Transaction ID জমা দিন
                  </button>

                  {/* FOOTER */}
                  <div className="footer" style={{ textAlign: 'center', marginTop: '24px', color: '#999', fontSize: '12px' }}>
                    নিরাপদ পেমেন্ট <b>PayBD</b>-এর মাধ্যমে
                  </div>
                </main>

              </div>
            </div>
          </section>
        );
      })()}

      {/* 9. GORGEOUS THANK YOU & SUCCESS SCREEN */}
      <section className={`screen ${currentScreen === 'success' ? 'active' : ''}`} id="success">
        <div className="scroll" style={{ padding: '24px 16px 80px', textAlign: 'center' }}>
          {/* Animated Success Badge */}
          <div className="check" style={{ width: '82px', height: '82px', background: '#d4f5e7', margin: '12px auto' }}>
            <span style={{ width: '56px', height: '56px', fontSize: '28px' }}>✓</span>
          </div>

          <span style={{ background: '#eafaf4', color: '#07845b', padding: '4px 12px', borderRadius: '14px', fontSize: '10px', fontWeight: 800, display: 'inline-block' }}>
            🎉 অর্ডার প্লেসমেন্ট সফল হয়েছে
          </span>

          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#063d35', margin: '10px 0 6px' }}>
            ধন্যবাদ! আপনার অর্ডারটি নিশ্চিত করা হয়েছে
          </h1>

          <p style={{ fontSize: '11px', color: '#556865', lineHeight: 1.5, margin: '0 0 14px' }}>
            অর্ডারটি সফলভাবে ডাটাবেজে রেকর্ড করা হয়েছে।
          </p>

          {/* Customer Care Agent Notice Box */}
          <div className="agentNoticeBox">
            <span style={{ fontSize: '24px' }}>📞</span>
            <div>
              <b style={{ fontSize: '11px', color: '#9a3412', display: 'block', marginBottom: '3px' }}>
                আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন!
              </b>
              <p>
                আপনার দেওয়া মোবাইল নম্বরে আমাদের কাস্টমার কেয়ার টিম কল করে অর্ডারটি ভেরিফাই করবেন এবং পার্সেলটি দ্রুত ডেলিভারির ব্যবস্থা করবেন।
              </p>
            </div>
          </div>

          {/* Order Details Receipt */}
          {lastPlacedOrder && (
            <div className="successReceipt">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf4f1', paddingBottom: '8px', marginBottom: '8px' }}>
                <b style={{ fontSize: '11px', color: '#07845b' }}>অর্ডার আইডি: #{lastPlacedOrder.id}</b>
                <span style={{ fontSize: '9.5px', color: '#889996' }}>{lastPlacedOrder.date}</span>
              </div>
              <div className="receiptRow">
                <span>গ্রাহকের নাম:</span>
                <b>{lastPlacedOrder.customerName || custName}</b>
              </div>
              <div className="receiptRow">
                <span>মোবাইল নম্বর:</span>
                <b>{lastPlacedOrder.phone}</b>
              </div>
              <div className="receiptRow">
                <span>ডেলিভারি ঠিকানা:</span>
                <b>{lastPlacedOrder.address} ({lastPlacedOrder.district || district})</b>
              </div>
              <div className="receiptRow">
                <span>পেমেন্ট পদ্ধতি:</span>
                <b style={{ color: '#07845b' }}>{lastPlacedOrder.paymentMethod}</b>
              </div>
              <div className="receiptRow">
                <span>আনুমানিক ডেলিভারি সময়:</span>
                <b style={{ color: '#2563eb' }}>২৪ - ৪৮ ঘণ্টার মধ্যে</b>
              </div>
              <div className="receiptRow highlight">
                <span>সর্বমোট প্রদেয় মূল্য:</span>
                <span>{money(lastPlacedOrder.total)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <button
            className="green"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 800,
              marginTop: '10px',
            }}
            onClick={() => {
              if (lastPlacedOrder) viewOrderTracking(lastPlacedOrder);
              else navigateTo('profile');
            }}
            id="successTrackBtn"
          >
            🔍 অর্ডার লাইভ ট্র্যাক করুন
          </button>

          <button
            className="outline"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 800,
              marginTop: '9px',
            }}
            onClick={() => navigateTo('home')}
            id="successHomeBtn"
          >
            🛍️ আরও কেনাকাটা করুন (হোমে যান)
          </button>
        </div>
      </section>

      {/* 10. ORDER TRACKING SCREEN */}
      {currentScreen === 'tracking' && activeTrackOrder && (
        <section className={`screen active`} id="tracking">
          <div className="scroll">
            <div className="top">
              <button className="back" onClick={() => navigateTo('profile')}>‹</button>
              <h2>অর্ডার লাইভ ট্র্যাকিং</h2>
              <div className="grow"></div>
            </div>
            <div className="trackWrap">
              <div className="orderCard">
                <div className="orderHeader">
                  <div>
                    <span className="orderChip">অর্ডার #{activeTrackOrder.id}</span>
                    <div style={{ fontSize: '9px', color: '#7a8986', marginTop: '3px' }}>
                      {activeTrackOrder.date}
                    </div>
                  </div>
                  <span className={`orderStatusPill ${activeTrackOrder.status === 'ডেলিভারি পথে' ? 'inTransit' : ''}`}>
                    {activeTrackOrder.status}
                  </span>
                </div>

                {/* Items Summary */}
                <div style={{ background: '#f8faf9', borderRadius: '10px', padding: '10px', margin: '8px 0 12px' }}>
                  <b style={{ fontSize: '10px', color: '#384d49' }}>অর্ডারকৃত পণ্যসমূহ:</b>
                  {activeTrackOrder.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', marginTop: '5px' }}>
                      <span>{item.emoji}</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{item.name} × {item.qty}</span>
                      <b style={{ color: '#07845b' }}>{money(item.price * item.qty)}</b>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px dashed #dbe6e3', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}>
                    <span>সর্বমোট প্রদেয়:</span>
                    <span style={{ color: '#07845b' }}>{money(activeTrackOrder.total)}</span>
                  </div>
                </div>

                {/* Courier Tracking */}
                <div style={{ fontSize: '10px', color: '#445653', background: '#eef8f4', padding: '8px 10px', borderRadius: '8px', marginBottom: '14px' }}>
                  <div><b>গ্রাহক:</b> {activeTrackOrder.customerName || custName} ({activeTrackOrder.phone})</div>
                  <div><b>কুরিয়ার পার্টনার:</b> {activeTrackOrder.courier}</div>
                  <div><b>ট্র্যাকিং আইডি:</b> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{activeTrackOrder.trackingCode}</span></div>
                  <div><b>ডেলিভারি ঠিকানা:</b> {activeTrackOrder.address}</div>
                </div>

                {/* Timeline Steps */}
                <div className="timeline">
                  <div className="step">
                    <h4>অর্ডার সফলভাবে গৃহীত হয়েছে</h4>
                    <p>{activeTrackOrder.date}</p>
                  </div>
                  <div className="step">
                    <h4>প্রতিনিধি ভেরিফিকেশন ও কল</h4>
                    <p>কাস্টমার কেয়ার থেকে অর্ডার নিশ্চিত করা হয়েছে</p>
                  </div>
                  <div className="step">
                    <h4>প্যাকেজিং সম্পন্ন ও প্রস্তুত</h4>
                    <p>ওয়্যারহাউস থেকে প্রোডাক্ট প্রস্তুত করা হয়েছে</p>
                  </div>
                  <div className="step">
                    <h4>কুরিয়ার সার্ভিসে হস্তান্তর</h4>
                    <p>{activeTrackOrder.courier} পার্সেল গ্রহণ করেছে</p>
                  </div>
                  <div className={`step ${activeTrackOrder.status === 'ডেলিভারি সম্পন্ন' ? '' : 'pending'}`}>
                    <h4>ডেলিভারি সম্পন্ন</h4>
                    <p>{activeTrackOrder.status === 'ডেলিভারি সম্পন্ন' ? 'গ্রাহক পণ্য গ্রহণ করেছেন ✓' : 'শীঘ্রই ডেলিভারি সম্পন্ন হবে'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
        </section>
      )}

      {/* 11. PROFILE SCREEN */}
      <section className={`screen ${currentScreen === 'profile' ? 'active' : ''}`} id="profile">
        <div className="scroll" style={{ paddingBottom: '90px' }}>
          <div className="top" style={{ position: 'sticky', top: 0, zIndex: 20, background: '#ffffff' }}>
            <button className="back" onClick={() => navigateTo('home')}>‹</button>
            <h2>আমার অ্যাকাউন্ট ও প্রোফাইল</h2>
            <div className="grow"></div>
          </div>

          <div className="profileWrap">
            {/* Profile Hero Card */}
            <div className="profileHero">
              <div className="profileAvatar">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.name} />
                ) : (
                  (userProfile?.name || 'S').charAt(0).toUpperCase()
                )}
              </div>
              <div className="profileMain">
                <div className="profileName">{userProfile?.name || custName}</div>
                <div className="profilePhone">{userProfile?.phone || userProfile?.email || '+880 1712-345678'}</div>
                <div className="profileTier">👑 গোল্ড মেম্বার • ভেরিফাইড</div>
                <div>
                  <button
                    className="editProfileBtn"
                    type="button"
                    onClick={handleEditProfile}
                    id="editProfileBtn"
                  >
                    ✎ নাম পরিবর্তন
                  </button>
                </div>
              </div>
              <div className="verifiedBadge">✓</div>
            </div>

            {/* 1. My Orders Card (Exact Match to User Uploaded Reference) */}
            <div className="myOrdersCard" id="myOrdersStatusCard">
              <div className="myOrdersHeader">
                <h3>My Orders</h3>
                <button
                  type="button"
                  className="viewAllBtn"
                  onClick={() => openOrdersWithTab('all')}
                  id="viewAllOrdersBtn"
                >
                  View All Orders <span>›</span>
                </button>
              </div>
              <div className="myOrdersGrid">
                {/* 1. To Pay */}
                <button
                  type="button"
                  className="orderStatusBtn"
                  onClick={() => openOrdersWithTab('to-pay')}
                  id="statusToPayBtn"
                >
                  <div className="orderStatusIcon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="3" />
                      <path d="M2 10h20" />
                      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
                    </svg>
                    {toPayCount > 0 && <span className="orderStatusBadge">{toPayCount}</span>}
                  </div>
                  <span className="orderStatusLabel">To Pay</span>
                </button>

                {/* 2. To Ship */}
                <button
                  type="button"
                  className="orderStatusBtn"
                  onClick={() => openOrdersWithTab('to-ship')}
                  id="statusToShipBtn"
                >
                  <div className="orderStatusIcon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7.5v9l-8 4.5-8-4.5v-9l8-4.5 8 4.5Z" />
                      <path d="M12 12v9" />
                      <path d="m12 12 8-4.5" />
                      <path d="M12 12 4 7.5" />
                      <path d="m7.5 5.5 8 4.5" />
                    </svg>
                    {toShipCount > 0 && <span className="orderStatusBadge">{toShipCount}</span>}
                  </div>
                  <span className="orderStatusLabel">To Ship</span>
                </button>

                {/* 3. To Receive */}
                <button
                  type="button"
                  className="orderStatusBtn"
                  onClick={() => openOrdersWithTab('to-receive')}
                  id="statusToReceiveBtn"
                >
                  <div className="orderStatusIcon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                      <path d="M15 18H9" />
                      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.24-4.05a1 1 0 0 0-.78-.38H14v10" />
                      <circle cx="17" cy="18" r="2" />
                      <circle cx="7" cy="18" r="2" />
                    </svg>
                    {toReceiveCount > 0 && <span className="orderStatusBadge">{toReceiveCount}</span>}
                  </div>
                  <span className="orderStatusLabel">To Receive</span>
                </button>

                {/* 4. To Review */}
                <button
                  type="button"
                  className="orderStatusBtn"
                  onClick={() => openOrdersWithTab('to-review')}
                  id="statusToReviewBtn"
                >
                  <div className="orderStatusIcon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      <path d="M8 10h8" />
                      <path d="M8 14h5" />
                    </svg>
                    {toReviewCount > 0 && <span className="orderStatusBadge">{toReviewCount}</span>}
                  </div>
                  <span className="orderStatusLabel">To Review</span>
                </button>

                {/* 5. Returns & Cancellations */}
                <button
                  type="button"
                  className="orderStatusBtn"
                  onClick={() => openOrdersWithTab('returns')}
                  id="statusReturnsBtn"
                >
                  <div className="orderStatusIcon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                      <path d="M9 14h6" />
                      <path d="m11 11-3 3 3 3" />
                    </svg>
                    {returnCount > 0 && <span className="orderStatusBadge">{returnCount}</span>}
                  </div>
                  <span className="orderStatusLabel">Returns& Cancellations</span>
                </button>
              </div>
            </div>

            {/* 2. Recently Viewed Products Carousel (২ নাম্বার বক্স - ডান থেকে বামে স্ক্রল) */}
            <div className="recentlyViewedCard" id="recentlyViewedSection">
              <div className="recentHeader">
                <h4>
                  <span>👀</span> সম্প্রতি দেখা পণ্য (Recently Viewed)
                </h4>
                <span>ডান-বামে স্ক্রল করুন ›</span>
              </div>
              <div className="recentlyViewedScroll">
                {recentlyViewed.map((prod) => (
                  <div
                    key={prod.id}
                    className="recentItemBox"
                    onClick={() => openProductDetail(prod)}
                  >
                    <div className="thumb">{prod.emoji}</div>
                    <div className="name" title={prod.name}>
                      {prod.name}
                    </div>
                    <div className="price">{money(prod.price)}</div>
                    <div style={{ fontSize: '9px', color: '#ff9800', marginTop: '2px', fontWeight: 700 }}>
                      ★ {prod.rating}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. User Services Card (Exact Match to User Uploaded Image: Help Center, Contact Customer Care, My Reviews, Payment Options) */}
            <div className="userServicesCard" id="userServicesCard">
              <div className="userServicesGrid">
                {/* 1. Help Center */}
                <button
                  type="button"
                  className="userServiceBtn"
                  onClick={() => setShowHelpCenterModal(true)}
                  id="serviceHelpCenterBtn"
                >
                  <div className="userServiceIcon iconHelpCenter">
                    <div className="helpQuestionCircle">?</div>
                  </div>
                  <span className="userServiceLabel">Help Center</span>
                </button>

                {/* 2. Contact Customer Care */}
                <button
                  type="button"
                  className="userServiceBtn"
                  onClick={() => setShowContactCareModal(true)}
                  id="serviceContactCareBtn"
                >
                  <div className="userServiceIcon iconCustomerCare">
                    <svg viewBox="0 0 36 36" width="30" height="30" fill="none">
                      {/* Headphone band */}
                      <path d="M7 16C7 10 11.5 6 18 6C24.5 6 29 10 29 16" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
                      {/* Headset ear cups */}
                      <rect x="5.5" y="14" width="4" height="7" rx="2" fill="#0f172a" />
                      <rect x="26.5" y="14" width="4" height="7" rx="2" fill="#0f172a" />
                      {/* Face / Head */}
                      <circle cx="18" cy="16" r="6" fill="#fed7aa" />
                      {/* Hair */}
                      <path d="M12.5 15C12.5 11.5 15 9.5 18 9.5C21 9.5 23.5 11.5 23.5 15" fill="#1e293b" />
                      {/* Microphone boom */}
                      <path d="M8 18C8 22 13 23 15 23" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
                      <circle cx="15.5" cy="23" r="1.5" fill="#ec4899" />
                      {/* Shirt */}
                      <path d="M10 30C10 24.5 13.5 23 18 23C22.5 23 26 24.5 26 30" fill="#06b6d4" />
                    </svg>
                  </div>
                  <span className="userServiceLabel">Contact Customer Care</span>
                </button>

                {/* 3. My Reviews */}
                <button
                  type="button"
                  className="userServiceBtn"
                  onClick={() => setShowMyReviewsModal(true)}
                  id="serviceMyReviewsBtn"
                >
                  <div className="userServiceIcon iconMyReviews">
                    {/* Chat bubble */}
                    <div className="reviewsChatBubble">
                      <div className="chatLine"></div>
                      <div className="chatLine short"></div>
                    </div>
                    {/* 3 Stars */}
                    <div className="reviewsStars">
                      <span>★</span>
                      <span>★</span>
                      <span>★</span>
                    </div>
                  </div>
                  <span className="userServiceLabel">My Reviews</span>
                </button>

                {/* 4. Payment Options */}
                <button
                  type="button"
                  className="userServiceBtn"
                  onClick={() => setShowPaymentOptionsModal(true)}
                  id="servicePaymentOptionsBtn"
                >
                  <div className="userServiceIcon iconPaymentOptions">
                    {/* Credit Card */}
                    <div className="paymentCardGraphic">
                      <div className="cardChip"></div>
                      <div className="cardLines"></div>
                    </div>
                    {/* Verified Check Badge */}
                    <div className="paymentVerifiedBadge">
                      ✓
                    </div>
                  </div>
                  <span className="userServiceLabel">Payment Options</span>
                </button>
              </div>
            </div>

            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setIsAdminOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#fff',
                  width: 'calc(100% - 32px)',
                  margin: '0 16px 20px',
                  padding: '20px',
                  borderRadius: '20px',
                  fontWeight: 900,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 12px 25px rgba(5, 150, 105, 0.25)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <LayoutDashboard size={24} /> Admin Dashboard (Shop Control)
              </motion.button>
            )}

            {/* Account Services */}
            <div className="sectionLabel">
              <span>⚙️ অ্যাকাউন্ট সেটিংস ও সেবা</span>
            </div>
            <div className="profileMenu">
              <button
                type="button"
                onClick={() => {
                  const newAddr = prompt('আপনার নতুন ডেলিভারি ঠিকানা লিখুন:', address);
                  if (newAddr && newAddr.trim()) {
                    setAddress(newAddr.trim());
                    localStorage.setItem(
                      SAVED_LOCATION_KEY,
                      JSON.stringify({ name: custName, phone, address: newAddr.trim(), district })
                    );
                    setHasSavedLocation(true);
                    showToast('ঠিকানা সফলভাবে সেভ হয়েছে ✓');
                  }
                }}
              >
                <span className="menuIcon">📍</span>
                <span>
                  <b>ডেলিভারি ঠিকানা ও লোকেশন সেটিং</b>
                  <small>{address.slice(0, 32)}...</small>
                </span>
                <i>›</i>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentOptionsModal(true);
                }}
              >
                <span className="menuIcon">💳</span>
                <span>
                  <b>পেমেন্ট পদ্ধতি ও ওয়ালেট</b>
                  <small>ক্যাশ অন ডেলিভারি ও মোবাইল ব্যাংকিং</small>
                </span>
                <i>›</i>
              </button>
              <button type="button" onClick={() => showToast('নোটিফিকেশন অ্যালার্ট সক্রিয় আছে ✓')}>
                <span className="menuIcon">🔔</span>
                <span>
                  <b>অফার ও নোটিফিকেশন</b>
                  <small>সর্বশেষ ডিল ও অর্ডার আপডেট</small>
                </span>
                <span className="menuPill">সক্রিয়</span>
                <i>›</i>
              </button>
              <button type="button" onClick={() => setShowContactCareModal(true)}>
                <span className="menuIcon">❓</span>
                <span>
                  <b>২৪/৭ হেল্প & কাস্টমার সাপোর্ট</b>
                  <small>যেকোনো প্রয়োজনে আমাদের সাথে কথা বলুন</small>
                </span>
                <i>›</i>
              </button>
            </div>

            {/* Logout Button */}
            <button
              className="logoutBtn"
              type="button"
              onClick={handleLogout}
              id="logoutBtn"
            >
              ↪ লগ আউট করুন
            </button>

            <div className="profileVersion">ShohojBuy v2.0 • সহজে কেনাকাটা, সুন্দর জীবনের জন্য</div>
          </div>
        </div>
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {/* 12. DEDICATED ORDERS MANAGEMENT SCREEN */}
      <section className={`screen ${currentScreen === 'my-orders' ? 'active' : ''}`} id="my-orders">
        <div className="scroll" style={{ paddingBottom: '80px' }}>
          <div className="top" style={{ position: 'sticky', top: 0, zIndex: 20, background: '#ffffff' }}>
            <button className="back" onClick={() => navigateTo('profile')}>‹</button>
            <h2>আমার অর্ডারসমূহ ({orders.length})</h2>
            <div className="grow"></div>
          </div>

          {/* Sticky Tab Navigation */}
          <div className="orderTabsNav">
            <button
              type="button"
              className={`orderTabItem ${orderFilterTab === 'all' ? 'active' : ''}`}
              onClick={() => setOrderFilterTab('all')}
            >
              সকল অর্ডার <span className="orderTabBadge">{orders.length}</span>
            </button>
            <button
              type="button"
              className={`orderTabItem ${orderFilterTab === 'to-pay' ? 'active' : ''}`}
              onClick={() => setOrderFilterTab('to-pay')}
            >
              To Pay <span className="orderTabBadge">{toPayCount}</span>
            </button>
            <button
              type="button"
              className={`orderTabItem ${orderFilterTab === 'to-ship' ? 'active' : ''}`}
              onClick={() => setOrderFilterTab('to-ship')}
            >
              To Ship <span className="orderTabBadge">{toShipCount}</span>
            </button>
            <button
              type="button"
              className={`orderTabItem ${orderFilterTab === 'to-receive' ? 'active' : ''}`}
              onClick={() => setOrderFilterTab('to-receive')}
            >
              To Receive <span className="orderTabBadge">{toReceiveCount}</span>
            </button>
            <button
              type="button"
              className={`orderTabItem ${orderFilterTab === 'to-review' ? 'active' : ''}`}
              onClick={() => setOrderFilterTab('to-review')}
            >
              To Review <span className="orderTabBadge">{toReviewCount}</span>
            </button>
            <button
              type="button"
              className={`orderTabItem ${orderFilterTab === 'returns' ? 'active' : ''}`}
              onClick={() => setOrderFilterTab('returns')}
            >
              Returns <span className="orderTabBadge">{returnCount}</span>
            </button>
          </div>

          <div style={{ padding: '12px 14px' }}>
            {filteredOrdersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 16px', color: '#7a8986' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>📦</div>
                <b style={{ fontSize: '13px', color: '#1a2a27', display: 'block', marginBottom: '6px' }}>
                  এই ক্যাটাগরিতে কোনো অর্ডার নেই
                </b>
                <p style={{ fontSize: '11px', margin: '0 0 16px' }}>
                  আপনার পছন্দের পণ্যগুলো আজই অর্ডার করে ফেলুন!
                </p>
                <button
                  className="green"
                  style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 800 }}
                  onClick={() => navigateTo('listing')}
                >
                  🛍️ শপিং শুরু করুন →
                </button>
              </div>
            ) : (
              filteredOrdersList.map((ord, idx) => (
                <div key={idx} className="orderManageCard">
                  <div className="topRow">
                    <div>
                      <span className="orderChip">অর্ডার #{ord.id}</span>
                      <div style={{ fontSize: '9px', color: '#7c8e8a', marginTop: '3px' }}>
                        📅 {ord.date}
                      </div>
                    </div>
                    <span className={`orderStatusPill ${ord.status === 'ডেলিভারি পথে' ? 'inTransit' : ''}`}>
                      {ord.status}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="itemList">
                    {ord.items.map((it, itemIdx) => (
                      <div key={itemIdx} className="itemRow">
                        <span style={{ fontSize: '18px' }}>{it.emoji}</span>
                        <div style={{ flex: 1, fontWeight: 700, color: '#1a2a27' }}>
                          {it.name} <span style={{ color: '#728480', fontWeight: 600 }}>× {it.qty}</span>
                        </div>
                        <b style={{ color: '#07845b' }}>{money(it.price * it.qty)}</b>
                      </div>
                    ))}
                  </div>

                  {/* Delivery & Total */}
                  <div style={{ fontSize: '10px', color: '#4a5b58', background: '#f8faf9', padding: '7px 10px', borderRadius: '8px', marginBottom: '6px' }}>
                    <div><b>ঠিকানা:</b> {ord.address}</div>
                    {ord.courier && <div><b>কুরিয়ার:</b> {ord.courier} ({ord.trackingCode})</div>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', fontWeight: 800, padding: '4px 2px' }}>
                    <span>সর্বমোট বিল:</span>
                    <span style={{ color: '#07845b', fontSize: '13px' }}>{money(ord.total)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="actionRow">
                    <button
                      type="button"
                      className="orderActionBtn return"
                      onClick={() => handleOpenReturnModal(ord)}
                    >
                      🔄 রিটার্ন
                    </button>
                    {ord.items.length > 0 && (
                      <button
                        type="button"
                        className="orderActionBtn review"
                        onClick={() => handleOpenReviewModal(ord.items[0])}
                      >
                        ⭐ রিভিউ দিন
                      </button>
                    )}
                    <button
                      type="button"
                      className="orderActionBtn primary"
                      onClick={() => viewOrderTracking(ord)}
                    >
                      🔍 লাইভ ট্র্যাকিং
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <BottomNav currentScreen={currentScreen} onNav={navigateTo} cartCount={cart.length} />
      </section>

      {/* 13. REVIEW MODAL */}
      {showReviewModal && reviewTargetItem && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}>
          <div className="authPanel" style={{ maxWidth: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <b style={{ fontSize: '15px', color: '#062d2b' }}>পণ্যটির রিভিউ দিন</b>
              <button
                style={{ background: 'none', border: 0, fontSize: '20px', color: '#888', cursor: 'pointer' }}
                onClick={() => setShowReviewModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8faf9', padding: '9px 12px', borderRadius: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '24px' }}>{reviewTargetItem.emoji}</span>
              <div>
                <b style={{ fontSize: '11px', color: '#093630', display: 'block' }}>{reviewTargetItem.name}</b>
                <span style={{ fontSize: '9.5px', color: '#728480' }}>আপনার অভিজ্ঞতা শেয়ার করুন</span>
              </div>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>রেটিং নির্ধারণ করুন:</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{
                        background: 'none',
                        border: 0,
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: star <= reviewRating ? '#f59e0b' : '#cbd5e1',
                        transition: 'transform 0.1s ease',
                      }}
                      onClick={() => setReviewRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>আপনার মতামত বা অভিজ্ঞতা:</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="পণ্যটি কেমন লেগেছে? কোয়ালিটি এবং প্যাকেজিং কেমন ছিল?"
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid #dfe8e5',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                className="green"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, marginTop: '8px' }}
              >
                ✓ মতামত সাবমিট করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 14. RETURN & CANCELLATIONS MODAL */}
      {showReturnModal && returnTargetOrder && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowReturnModal(false); }}>
          <div className="authPanel" style={{ maxWidth: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <b style={{ fontSize: '15px', color: '#062d2b' }}>রিটার্ন ও রিফান্ড আবেদন</b>
              <button
                style={{ background: 'none', border: 0, fontSize: '20px', color: '#888', cursor: 'pointer' }}
                onClick={() => setShowReturnModal(false)}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '10.5px', color: '#667875', marginBottom: '12px' }}>
              অর্ডার <b>#{returnTargetOrder.id}</b> এর জন্য রিটার্ন আবেদন করতে কারণ নির্বাচন করুন:
            </p>

            <form onSubmit={handleSubmitReturn}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {[
                  'পণ্য ক্ষতিগ্রস্ত বা ত্রুটিপূর্ণ',
                  'ভুল পণ্য বা সাইজ ডেলিভারি হয়েছে',
                  'পণ্য ছবির সাথে মিল নেই',
                  'দেরিতে ডেলিভারির কারণে প্রয়োজন নেই',
                  'অন্যান্য কারণ',
                ].map((reason) => (
                  <label
                    key={reason}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2ece9',
                      background: returnReason === reason ? '#eafaf4' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="returnReason"
                      value={reason}
                      checked={returnReason === reason}
                      onChange={() => setReturnReason(reason)}
                      style={{ accentColor: '#00a45d' }}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                className="green"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, background: '#dc2626' }}
              >
                ✓ রিটার্ন রিকোয়েস্ট পাঠান
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 12. AUTH / SIGN-UP MODAL */}
      {showAuthModal && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
          <div className="authPanel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: '17px', color: '#062d2b' }}>
                  {authTab === 'signup' ? 'ShohojBuy একাউন্ট তৈরি করুন' : 'ShohojBuy লগইন করুন'}
                </b>
                <p style={{ fontSize: '10px', color: '#7a8986', margin: '2px 0 0' }}>
                  একবার সাইন-আপ করলে এই মোবাইলে আজীবন লগইন থাকবে
                </p>
              </div>
              <button
                style={{ background: 'none', fontSize: '22px', color: '#888', cursor: 'pointer' }}
                onClick={() => setShowAuthModal(false)}
              >
                ×
              </button>
            </div>

            {/* Google 1-Click Sign-In */}
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="googleBtn"
                onClick={handleGoogleSignIn}
                id="modalGoogleAuthBtn"
              >
                <span style={{ fontSize: '17px' }}>🇬</span> গুগল দিয়ে ১-ক্লিকে সাইন ইন
              </button>
            </div>

            <div className="divider">অথবা মোবাইল দিয়ে</div>

            <div className="authTabs">
              <button
                type="button"
                className={`authTab ${authTab === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthTab('signup')}
              >
                নতুন সাইন-আপ
              </button>
              <button
                type="button"
                className={`authTab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => setAuthTab('login')}
              >
                লগইন
              </button>
            </div>

            <form onSubmit={handleManualAuth}>
              {authTab === 'signup' && (
                <div className="field">
                  <label>আপনার পুরো নাম</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমনঃ শাহরিয়ার আল শাকিব"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </div>
              )}

              <div className="field">
                <label>মোবাইল নম্বর বা ইমেইল</label>
                <input
                  type="text"
                  required
                  placeholder="01XXXXXXXXX বা email@example.com"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                />
              </div>

              <div className="field">
                <label>পাসওয়ার্ড (ন্যূনতম ৬ অক্ষর)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="green"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginTop: '12px',
                }}
              >
                {authTab === 'signup' ? '✓ সাইন-আপ সম্পন্ন করুন' : '✓ লগইন করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 15. HELP CENTER AI AGENT MODAL */}
      {showHelpCenterModal && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowHelpCenterModal(false); }}>
          <div className="aiModalPanel">
            {/* AI Agent Header */}
            <div className="aiHeader">
              <div className="aiAgentInfo">
                <div className="aiAvatarBox">
                  <span>🤖</span>
                  <div className="aiLiveDot" title="AI Agent Live"></div>
                </div>
                <div>
                  <div className="aiAgentTitle">সহায়তা কেন্দ্র এআই (Help AI)</div>
                  <div className="aiAgentSub">
                    <span>⚡ সক্রিয়</span> • <span>পলিসি ও শপিং গাইড এজেন্ট</span>
                  </div>
                </div>
              </div>
              <button
                className="aiCloseBtn"
                onClick={() => setShowHelpCenterModal(false)}
                title="বন্ধ করুন"
              >
                ×
              </button>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="aiTabSwitch">
              <button
                type="button"
                className={helpAiTab === 'ai' ? 'active' : ''}
                onClick={() => setHelpAiTab('ai')}
              >
                🤖 এআই সহায়তা চ্যাট
              </button>
              <button
                type="button"
                className={helpAiTab === 'faq' ? 'active' : ''}
                onClick={() => setHelpAiTab('faq')}
              >
                📋 সচরাচর প্রশ্ন (FAQ)
              </button>
            </div>

            {helpAiTab === 'ai' ? (
              <>
                {/* Chat Body */}
                <div className="aiChatBody">
                  {helpAiMessages.map((msg) => (
                    <div key={msg.id} className={`aiMsgRow ${msg.role}`}>
                      <div className={`aiMsgAvatar ${msg.role}`}>
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="aiBubble">
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        <span className="aiBubbleTime">{msg.time}</span>
                      </div>
                    </div>
                  ))}

                  {helpAiLoading && (
                    <div className="aiMsgRow model">
                      <div className="aiMsgAvatar model">🤖</div>
                      <div className="aiBubble">
                        <div className="aiTypingIndicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={helpAiEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="aiSuggestionsWrap">
                  {[
                    '🚚 ঢাকার বাইরে ডেলিভারি কতদিন?',
                    '🔄 ৭ দিনের রিটার্ন পলিসি কি?',
                    '💳 বিকাশ/নগদে ক্যাশব্যাক কিভাবে পাব?',
                    '🏷️ ভাউচার কোড কিভাবে ব্যবহার করব?',
                    '📦 ক্যাশ অন ডেলিভারি নিয়ম',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="aiChipBtn"
                      onClick={() => handleSendHelpAi(chip)}
                      disabled={helpAiLoading}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <form
                  className="aiInputArea"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendHelpAi();
                  }}
                >
                  <input
                    type="text"
                    placeholder="সহায়তা এআই-কে যেকোনো প্রশ্ন লিখুন..."
                    value={helpAiInput}
                    onChange={(e) => setHelpAiInput(e.target.value)}
                    disabled={helpAiLoading}
                  />
                  <button
                    type="submit"
                    className="aiSendBtn"
                    disabled={!helpAiInput.trim() || helpAiLoading}
                    title="পাঠান"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              /* FAQ VIEW */
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', margin: '4px 0 10px', overflowX: 'auto' }}>
                  {[
                    { id: 'order', label: '📦 অর্ডার ও ডেলিভারি' },
                    { id: 'payment', label: '💳 পেমেন্ট ও রিফান্ড' },
                    { id: 'return', label: '🔄 রিটার্ন পলিসি' },
                    { id: 'voucher', label: '🏷️ ভাউচার ও ছাড়' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFaqTab(tab.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 750,
                        whiteSpace: 'nowrap',
                        border: '1px solid',
                        borderColor: activeFaqTab === tab.id ? '#00a45d' : '#e2ebe8',
                        background: activeFaqTab === tab.id ? '#e8faf3' : '#fff',
                        color: activeFaqTab === tab.id ? '#00874f' : '#495e5a',
                        cursor: 'pointer',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeFaqTab === 'order' && (
                  <>
                    <div className="faqItem">
                      <b>কিভাবে অর্ডার ট্র্যাক করব?</b>
                      <p>প্রোফাইল পেজে "My Orders" কার্ড থেকে "In Transit" বা "All Orders" এ ক্লিক করে যেকোনো সময় লাইভ স্ট্যাটাস দেখতে পারবেন।</p>
                    </div>
                    <div className="faqItem">
                      <b>ডেলিভারি হতে কতদিন সময় লাগে?</b>
                      <p>ঢাকার ভেতরে ২৪-৪৮ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ৩-৫ কার্যদিবসের মধ্যে নির্ভরযোগ্য কুরিয়ারের মাধ্যমে পৌঁছে দেওয়া হয়।</p>
                    </div>
                    <div className="faqItem">
                      <b>ডেলিভারি চার্জ কত?</b>
                      <p>ঢাকার ভেতরে মাত্র ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। মেগা ডিল অফারে ফ্রি ডেলিভারি সুবিধা প্রযোজ্য হতে পারে।</p>
                    </div>
                  </>
                )}

                {activeFaqTab === 'payment' && (
                  <>
                    <div className="faqItem">
                      <b>ক্যাশ অন ডেলিভারি (COD) সুবিধা আছে কি?</b>
                      <p>হ্যাঁ! পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধ করার সুবিধা রয়েছে।</p>
                    </div>
                    <div className="faqItem">
                      <b>বিকাশ বা নগদে পেমেন্ট করব কিভাবে?</b>
                      <p>চেকআউট পেজে বিকাশ/নগদ সিলেক্ট করে সরাসরি পেমেন্ট করতে পারবেন। পেমেন্টে অতিরিক্ত ৫% ক্যাশব্যাক পাওয়া যায়।</p>
                    </div>
                  </>
                )}

                {activeFaqTab === 'return' && (
                  <>
                    <div className="faqItem">
                      <b>পণ্য রিটার্ন বা পরিবর্তন করার নিয়ম কি?</b>
                      <p>পণ্য গ্রহণের ৭ দিনের মধ্যে কোনো ত্রুটি থাকলে "Returns & Cancellations" অপশন থেকে আবেদন করুন। সম্পূর্ণ ফ্রি রিটার্ন!</p>
                    </div>
                  </>
                )}

                {activeFaqTab === 'voucher' && (
                  <>
                    <div className="faqItem">
                      <b>ভাউচার কোড কিভাবে ব্যবহার করব?</b>
                      <p>মেগা ডিল স্ক্রিন থেকে কোড কপি করে চেকআউট পেজে "ভাউচার / কুপন কোড" বক্সে পেস্ট করে 'প্রয়োগ' বাটনে চাপুন।</p>
                    </div>
                  </>
                )}

                <div style={{ borderTop: '1px solid #f0f5f3', paddingTop: '10px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="green"
                    onClick={() => {
                      setShowHelpCenterModal(false);
                      setShowContactCareModal(true);
                    }}
                    style={{ width: '100%', height: '38px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}
                  >
                    🎧 কাস্টমার কেয়ার এআই এজেন্টের সাথে কথা বলুন
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 16. LIVE CUSTOMER CARE AI AGENT MODAL */}
      {showContactCareModal && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowContactCareModal(false); }}>
          <div className="aiModalPanel">
            {/* AI Agent Header */}
            <div className="aiHeader care">
              <div className="aiAgentInfo">
                <div className="aiAvatarBox">
                  <span>🎧</span>
                  <div className="aiLiveDot" title="Live Support AI Online"></div>
                </div>
                <div>
                  <div className="aiAgentTitle">কাস্টমার কেয়ার এআই (Care AI)</div>
                  <div className="aiAgentSub">
                    <span>⚡ ২৪/৭ লাইভ সাপোর্ট</span> • <span>সমস্যা সমাধান বিশেষজ্ঞ</span>
                  </div>
                </div>
              </div>
              <button
                className="aiCloseBtn"
                onClick={() => setShowContactCareModal(false)}
                title="বন্ধ করুন"
              >
                ×
              </button>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="aiTabSwitch">
              <button
                type="button"
                className={careAiTab === 'ai' ? 'active' : ''}
                onClick={() => setCareAiTab('ai')}
              >
                🤖 লাইভ কেয়ার এআই স্পেশালিস্ট
              </button>
              <button
                type="button"
                className={careAiTab === 'direct' ? 'active' : ''}
                onClick={() => setCareAiTab('direct')}
              >
                📞 হটলাইন ও ডিরেক্ট সাপোর্ট
              </button>
            </div>

            {careAiTab === 'ai' ? (
              <>
                {/* Chat Body */}
                <div className="aiChatBody">
                  {careAiMessages.map((msg) => (
                    <div key={msg.id} className={`aiMsgRow ${msg.role}`}>
                      <div className={`aiMsgAvatar ${msg.role}`}>
                        {msg.role === 'user' ? '👤' : '🎧'}
                      </div>
                      <div className="aiBubble">
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        <span className="aiBubbleTime">{msg.time}</span>
                      </div>
                    </div>
                  ))}

                  {careAiLoading && (
                    <div className="aiMsgRow model">
                      <div className="aiMsgAvatar model">🎧</div>
                      <div className="aiBubble">
                        <div className="aiTypingIndicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={careAiEndRef} />
                </div>

                {/* Quick Issue Resolution Chips */}
                <div className="aiSuggestionsWrap">
                  {[
                    '📦 আমার বর্তমান অর্ডারটি কোথায় আছে?',
                    '📍 ডেলিভারি ঠিকানা পরিবর্তন করতে চাই',
                    '❌ অর্ডার বাতিল করতে কি করতে হবে?',
                    '⚠️ ভাঙা বা ভুল পণ্য পেয়েছি, সমাধান চাই',
                    '🧑‍💼 সাপোর্ট ম্যানেজারের সাথে সরাসরি যোগাযোগ',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="aiChipBtn"
                      onClick={() => handleSendCareAi(chip)}
                      disabled={careAiLoading}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <form
                  className="aiInputArea"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendCareAi();
                  }}
                >
                  <input
                    type="text"
                    placeholder="আপনার অর্ডার সমস্যা বা প্রশ্ন এখানে লিখুন..."
                    value={careAiInput}
                    onChange={(e) => setCareAiInput(e.target.value)}
                    disabled={careAiLoading}
                  />
                  <button
                    type="submit"
                    className="aiSendBtn"
                    style={{ background: '#059669' }}
                    disabled={!careAiInput.trim() || careAiLoading}
                    title="পাঠান"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              /* DIRECT CHANNELS VIEW */
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Call Hotline */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  <div>
                    <b style={{ fontSize: '12.5px', color: '#166534', display: 'block' }}>📞 হেল্পলাইন হটলাইন</b>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#15803d' }}>09612-345678</span>
                    <p style={{ fontSize: '9.5px', color: '#4b7a60', margin: '2px 0 0' }}>সকাল ৮টা থেকে রাত ১১টা পর্যন্ত খোলা</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      showToast('📞 হটলাইনে কল দেওয়া হচ্ছে...');
                    }}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 0,
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    কল করুন
                  </button>
                </div>

                {/* WhatsApp Support */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  <div>
                    <b style={{ fontSize: '12.5px', color: '#065f46', display: 'block' }}>💬 WhatsApp লাইভ চ্যাট</b>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#047857' }}>+880 1912-345678</span>
                    <p style={{ fontSize: '9.5px', color: '#4d8272', margin: '2px 0 0' }}>তাৎক্ষণিক মেসেজ ও স্ক্রিনশট সাপোর্ট</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      showToast('💬 WhatsApp সাপোর্ট চ্যাট ওপেন হচ্ছে...');
                    }}
                    style={{
                      background: '#059669',
                      color: '#fff',
                      border: 0,
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    চ্যাট শুরু
                  </button>
                </div>

                {/* Email Support */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  <div>
                    <b style={{ fontSize: '12px', color: '#334155', display: 'block' }}>✉️ অফিশিয়াল ইমেইল</b>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>support@shophive.bd</span>
                    <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0' }}>২৪ ঘণ্টার মধ্যে ইমেইল রিপ্লাই গ্যারান্টি</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('support@shophive.bd');
                      showToast('ইমেইল অ্যাড্রেস কপি করা হয়েছে ✓');
                    }}
                    style={{
                      background: '#e2e8f0',
                      color: '#1e293b',
                      border: 0,
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    কপি
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 17. MY REVIEWS MODAL */}
      {showMyReviewsModal && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowMyReviewsModal(false); }}>
          <div className="authPanel" style={{ maxWidth: '360px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f5f3', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="userServiceIcon iconMyReviews" style={{ width: '32px', height: '32px' }}>
                  <div className="reviewsChatBubble" style={{ width: '18px', height: '12px' }}></div>
                  <div className="reviewsStars" style={{ fontSize: '7px' }}><span>★</span><span>★</span><span>★</span></div>
                </div>
                <div>
                  <b style={{ fontSize: '15px', color: '#062d2b' }}>আমার রিভিউ (My Reviews)</b>
                  <p style={{ fontSize: '9.5px', color: '#7a8986', margin: 0 }}>আপনার দেওয়া রেটিং, মন্তব্য ও ফিডব্যাক</p>
                </div>
              </div>
              <button
                style={{ background: 'none', border: 0, fontSize: '22px', color: '#888', cursor: 'pointer' }}
                onClick={() => setShowMyReviewsModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: '12px', color: '#0f172a' }}>ওয়্যারলেস নয়েজ ক্যানসেলিং হেডফোন</b>
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 900 }}>★★★★★ (5.0)</span>
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 4px', lineHeight: 1.4 }}>
                  "সাউন্ড কোয়ালিটি অসাধারণ, ব্যাটারি ব্যাকআপ প্রায় দুই দিন চলে। দারুণ একটি পণ্য!"
                </p>
                <small style={{ fontSize: '9px', color: '#94a3b8' }}>অনুমোদিত রিভিউ • ৩ দিন আগে</small>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: '12px', color: '#0f172a' }}>স্মার্ট ওয়াচ প্রো ম্যাক্স</b>
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 900 }}>★★★★☆ (4.0)</span>
                </div>
                <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 4px', lineHeight: 1.4 }}>
                  "ডিসপ্লে অনেক ব্রাইট এবং হার্ট রেট সেন্সর নিখুঁতভাবে কাজ করে। প্যাকেজিং খুব ভালো ছিল।"
                </p>
                <small style={{ fontSize: '9px', color: '#94a3b8' }}>অনুমোদিত রিভিউ • ১ সপ্তাহ আগে</small>
              </div>

              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px dashed #86efac',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <b style={{ fontSize: '12px', color: '#166534' }}>কোনো নতুন পণ্য রিভিউ বাকি নেই</b>
                <p style={{ fontSize: '10px', color: '#3f6212', margin: '3px 0 8px' }}>
                  নতুন পণ্য ডেলিভারি সম্পন্ন হলে আপনি এখানে সরাসরি ৫-স্টার রিভিউ দিতে পারবেন
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowMyReviewsModal(false);
                    openOrdersWithTab('to-review');
                  }}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 0,
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ডেলিভার্ড অর্ডার দেখুন ›
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 18. PAYMENT OPTIONS MODAL */}
      {showPaymentOptionsModal && (
        <div className="authModal" onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentOptionsModal(false); }}>
          <div className="authPanel" style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f5f3', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="userServiceIcon iconPaymentOptions" style={{ width: '32px', height: '32px' }}>
                  <div className="paymentCardGraphic" style={{ width: '22px', height: '14px' }}></div>
                  <div className="paymentVerifiedBadge" style={{ width: '12px', height: '12px', fontSize: '8px' }}>✓</div>
                </div>
                <div>
                  <b style={{ fontSize: '15px', color: '#062d2b' }}>পেমেন্ট পদ্ধতি (Payment Options)</b>
                  <p style={{ fontSize: '9.5px', color: '#7a8986', margin: 0 }}>পছন্দের পেমেন্ট অ্যাকাউন্ট ও ডিফল্ট নির্বাচন</p>
                </div>
              </div>
              <button
                style={{ background: 'none', border: 0, fontSize: '22px', color: '#888', cursor: 'pointer' }}
                onClick={() => setShowPaymentOptionsModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              {[
                { id: 'bKash', name: 'বিকাশ (bKash)', icon: '💖', desc: '০১৭১২-৩৪৫৬৭৮ (ভেরিফাইড অ্যাকাউন্ট)', badge: 'ডিফল্ট' },
                { id: 'Nagad', name: 'নগদ (Nagad)', icon: '🟠', desc: '০১৯১২-৩৪৫৬৭৮ (ইনস্ট্যান্ট ক্যাশব্যাক)', badge: '' },
                { id: 'Rocket', name: 'রকেট (Rocket)', icon: '🟣', desc: 'ডিবিবিএল মোবাইল ব্যাংকিং', badge: '' },
                { id: 'Card', name: 'ভিসা / মাস্টারকার্ড (Debit/Credit Card)', icon: '💳', desc: 'যেকোনো ব্যাংক কার্ডের মাধ্যমে পেমেন্ট', badge: '' },
                { id: 'COD', name: 'ক্যাশ অন ডেলিভারি (Cash on Delivery)', icon: '💵', desc: 'পণ্য হাতে পেয়ে নগদ টাকা পরিশোধ', badge: '' },
              ].map((method) => (
                <label
                  key={method.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: defaultPaymentMethod === method.id ? '#00a45d' : '#e2ece9',
                    background: defaultPaymentMethod === method.id ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="defaultPayMethod"
                    value={method.id}
                    checked={defaultPaymentMethod === method.id}
                    onChange={() => {
                      setDefaultPaymentMethod(method.id);
                      showToast(`${method.name} ডিফল্ট পেমেন্ট হিসেবে সেভ হয়েছে ✓`);
                    }}
                    style={{ accentColor: '#00a45d' }}
                  />
                  <span style={{ fontSize: '20px' }}>{method.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <b style={{ fontSize: '12px', color: '#0f172a' }}>{method.name}</b>
                      {defaultPaymentMethod === method.id && (
                        <span style={{ fontSize: '8.5px', background: '#dcfce7', color: '#15803d', fontWeight: 850, padding: '1px 6px', borderRadius: '6px' }}>
                          সক্রিয়
                        </span>
                      )}
                    </div>
                    <small style={{ fontSize: '9.5px', color: '#64748b' }}>{method.desc}</small>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="button"
              className="green"
              onClick={() => {
                setShowPaymentOptionsModal(false);
                showToast('পেমেন্ট সেটিংস সফলভাবে আপডেট হয়েছে ✓');
              }}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                marginTop: '14px',
              }}
            >
              ✓ সেটিংস সম্পন্ন করুন
            </button>
          </div>
        </div>
      )}

      {/* 13. DRAWER */}
      <div
        className={`drawer ${drawerOpen ? 'open' : ''}`}
        id="drawer"
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawerOpen(false);
        }}
      >
        <div className="drawerPanel">
          <div className="drawerBrand">
            <div className="miniLogo"></div>
            <strong>
              Shohoj<span>Buy</span>
            </strong>
            <button
              style={{
                marginLeft: 'auto',
                background: 'none',
                color: '#fff',
                fontSize: '25px',
                cursor: 'pointer',
              }}
              onClick={() => setDrawerOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="drawerNav">
            <button onClick={() => navigateTo('home')}>⌂ &nbsp; হোম</button>
            <button onClick={() => navigateTo('megadeal')}>🔥 &nbsp; মেগা ডিল ও অফার</button>
            <button onClick={() => navigateTo('listing')}>🛍️ &nbsp; সকল পণ্য</button>
            <button onClick={() => navigateTo('cart')}>🛒 &nbsp; আমার কার্ট ({cart.length})</button>
            <button onClick={() => navigateTo('wishlist')}>♡ &nbsp; ইচ্ছেতালিকা ({wishes.length})</button>
            <button onClick={() => navigateTo('profile')}>♙ &nbsp; আমার প্রোফাইল ও অর্ডার</button>
            <button onClick={() => showToast('২৪/৭ কাস্টমার সাপোর্ট: ০৯৬১২-৩৪৫৬৭৮')}>📞 &nbsp; কাস্টমার সাপোর্ট</button>
          </div>
          <div className="drawerPromo">
            <b>
              স্মার্ট কেনাকাটা,
              <br />
              স্মার্ট জীবন
            </b>
            <p>
              সহজে কিনুন, নিরাপদে থাকুন। ShohojBuy আপনার বিশ্বস্ত অনলাইন শপিং পার্টনার।
            </p>
          </div>
          <small style={{ position: 'absolute', bottom: '18px', color: '#789995' }}>
            v2.0.0
          </small>
        </div>
      </div>

      {/* ADMIN PANEL */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} />
      )}

      {/* TOAST NOTIFICATION */}
      <div
        id="toast"
        style={{
          position: 'fixed',
          bottom: '25px',
          left: '50%',
          transform: toastVisible ? 'translate(-50%, 0)' : 'translate(-50%, 20px)',
          background: '#062d2b',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 600,
          opacity: toastVisible ? 1 : 0,
          pointerEvents: 'none',
          transition: 'all 0.25s ease',
          zIndex: 1000,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        {toastMsg}
      </div>
    </div>
  );
}

interface BottomNavProps {
  currentScreen: string;
  onNav: (screen: string) => void;
  cartCount: number;
}

function BottomNav({ currentScreen, onNav, cartCount }: BottomNavProps) {
  const isHome = currentScreen === 'home';
  const isMegaDeal = currentScreen === 'megadeal';
  const isShop = currentScreen === 'listing';
  const isCart = currentScreen === 'cart';
  const isProfile = currentScreen === 'profile' || currentScreen === 'tracking' || currentScreen === 'my-orders';

  return (
    <nav className="bottom" id="mainBottomNavigation">
      <button
        type="button"
        id="navHomeBtn"
        className={`tab ${isHome ? 'active' : ''}`}
        onClick={() => onNav('home')}
      >
        <span className="tabIconWrap">
          <Home
            size={20}
            strokeWidth={isHome ? 2.5 : 1.9}
            className={`tabIcon ${isHome ? 'fillActive' : ''}`}
          />
        </span>
        <span className="tabText">হোম</span>
      </button>

      <button
        type="button"
        id="navMegaDealBtn"
        className={`tab dealTab ${isMegaDeal ? 'active' : ''}`}
        onClick={() => onNav('megadeal')}
      >
        <span className="tabIconWrap">
          <Flame
            size={20}
            strokeWidth={isMegaDeal ? 2.6 : 2}
            className={`tabIcon dealIcon ${isMegaDeal ? 'fillActive' : ''}`}
          />
        </span>
        <span className="tabText">মেগা ডিল</span>
      </button>

      <button
        type="button"
        id="navShopBtn"
        className={`tab ${isShop ? 'active' : ''}`}
        onClick={() => onNav('listing')}
      >
        <span className="tabIconWrap">
          <Store
            size={20}
            strokeWidth={isShop ? 2.5 : 1.9}
            className={`tabIcon ${isShop ? 'fillActive' : ''}`}
          />
        </span>
        <span className="tabText">শপ</span>
      </button>

      <button
        type="button"
        id="navCartBtn"
        className={`tab ${isCart ? 'active' : ''}`}
        onClick={() => onNav('cart')}
      >
        <span className="tabIconWrap">
          <ShoppingCart
            size={20}
            strokeWidth={isCart ? 2.5 : 1.9}
            className={`tabIcon ${isCart ? 'fillActive' : ''}`}
          />
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </span>
        <span className="tabText">কার্ট</span>
      </button>

      <button
        type="button"
        id="navProfileBtn"
        className={`tab ${isProfile ? 'active' : ''}`}
        onClick={() => onNav('profile')}
      >
        <span className="tabIconWrap">
          <User
            size={20}
            strokeWidth={isProfile ? 2.5 : 1.9}
            className={`tabIcon ${isProfile ? 'fillActive' : ''}`}
          />
        </span>
        <span className="tabText">প্রোফাইল</span>
      </button>
    </nav>
  );
}
