import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Package, 
  ShoppingBag, 
  PlusCircle, 
  Trash2, 
  LogOut, 
  CheckCircle, 
  Clock, 
  LayoutDashboard, 
  Bell, 
  CreditCard,
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'dashboard' | 'mega-deal' | 'shop' | 'orders' | 'payments';

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  
  // Product Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [old, setOld] = useState('');
  const [emoji, setEmoji] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('মোবাইল');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>(['', '', '']); // Support up to 3 images
  const [isMegaDeal, setIsMegaDeal] = useState(false);
  
  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [noticeType, setNoticeType] = useState<'urgent' | 'cashback' | 'voucher' | 'stock'>('urgent');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProducts(list);
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('date', 'desc')), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setOrders(list);
    });

    const unsubNotices = onSnapshot(collection(db, 'notices'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setNotices(list);
    });

    const unsubPayments = onSnapshot(collection(db, 'paymentRequests'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setPaymentRequests(list);
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubNotices();
      unsubPayments();
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const filteredImages = images.filter(url => url.trim() !== '');
      await addDoc(collection(db, 'products'), {
        name,
        brand: brand || 'ShohojBuy',
        price: Number(price),
        old: old ? Number(old) : Number(price),
        emoji: emoji || '📦',
        images: filteredImages.length > 0 ? filteredImages : [emoji || '📦'],
        category,
        description,
        rating: "5.0",
        stockLeft: 10,
        isMegaDeal,
        createdAt: new Date().toISOString()
      });
      // Reset
      setName(''); setPrice(''); setOld(''); setEmoji(''); setBrand(''); setDescription(''); setImages(['', '', '']);
      alert('প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!');
    } catch (error) {
      console.error(error);
      alert('ব্যর্থ হয়েছে');
    }
    setIsSubmitting(false);
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeMsg) return;
    try {
      await addDoc(collection(db, 'notices'), {
        title: noticeTitle,
        message: noticeMsg,
        type: noticeType,
        date: new Date().toLocaleDateString('bn-BD'),
        createdAt: serverTimestamp()
      });
      setNoticeTitle(''); setNoticeMsg('');
      alert('নোটিশ পাঠানো হয়েছে!');
    } catch (error) { console.error(error); }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) { console.error(error); }
  };

  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

  return (
    <div className="fixed inset-0 bg-[#f4f7f6] z-[100] overflow-hidden font-sans flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 bg-white border-r flex-col p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-emerald-700">ShohojBuy</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="ড্যাশবোর্ড" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Bell size={20}/>} label="মেগা ডিল (নোটিশ)" active={activeTab === 'mega-deal'} onClick={() => setActiveTab('mega-deal')} />
          <SidebarItem icon={<Package size={20}/>} label="শপ (প্রোডাক্ট)" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
          <SidebarItem icon={<ShoppingBag size={20}/>} label="অর্ডারসমূহ" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarItem icon={<CreditCard size={20}/>} label="পেমেন্ট এরিয়া" active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
        </nav>

        <button onClick={onClose} className="flex items-center gap-3 text-red-500 font-bold p-3 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut size={20}/> বের হয়ে যান
        </button>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-white px-4 py-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-black text-emerald-700">ShohojBuy Admin</h1>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">×</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Stats Context */}
        <header className="hidden md:flex bg-white h-20 border-b items-center justify-between px-8">
          <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400 font-bold">Loged in as</p>
              <p className="text-sm font-bold text-gray-700">Shariar Al Shakib</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">S</div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={<TrendingUp className="text-blue-600"/>} label="মোট রেভিনিউ" value={`৳${totalRevenue.toLocaleString()}`} color="bg-blue-50" />
                  <StatCard icon={<ShoppingBag className="text-emerald-600"/>} label="মোট অর্ডার" value={orders.length.toString()} color="bg-emerald-50" />
                  <StatCard icon={<Package className="text-orange-600"/>} label="মোট প্রোডাক্ট" value={products.length.toString()} color="bg-orange-50" />
                  <StatCard icon={<Users className="text-purple-600"/>} label="অ্যাক্টিভ ইউজার" value="১২৪" color="bg-purple-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-4">রিসেন্ট অর্ডারসমূহ</h3>
                    <div className="space-y-4">
                      {orders.slice(0, 5).map(o => (
                        <div key={o.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">📦</div>
                            <div>
                              <p className="text-sm font-bold">{o.customerName}</p>
                              <p className="text-xs text-gray-400">{o.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-600">৳{o.total}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{o.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-4">শপ পারফরম্যান্স</h3>
                    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm font-medium">চার্ট এখানে প্রদর্শিত হবে</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'mega-deal' && (
              <motion.div key="mega" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <Bell className="text-emerald-600" /> নতুন নোটিশ পাঠান
                  </h3>
                  <form onSubmit={handleSendNotice} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">নোটিশ টাইটেল</label>
                      <input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} required type="text" className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-emerald-500" placeholder="যেমন: ঈদ ধামাকা অফার!" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">বিস্তারিত মেসেজ</label>
                      <textarea value={noticeMsg} onChange={e => setNoticeMsg(e.target.value)} required className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl h-32 focus:ring-2 focus:ring-emerald-500" placeholder="অফার সম্পর্কে বিস্তারিত লিখুন..."></textarea>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">নোটিশ টাইপ</label>
                      <div className="flex gap-2 mt-1">
                        {['urgent', 'cashback', 'voucher', 'stock'].map(type => (
                          <button key={type} type="button" onClick={() => setNoticeType(type as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${noticeType === type ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>{type}</button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">নোটিশ পাবলিশ করুন</button>
                  </form>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">সাম্প্রতিক নোটিশসমূহ</h3>
                  {notices.map(n => (
                    <div key={n.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Bell size={18}/></div>
                        <div>
                          <p className="font-bold text-sm">{n.title}</p>
                          <p className="text-xs text-gray-400">{n.date}</p>
                        </div>
                      </div>
                      <button onClick={async () => { if(confirm('ডিলিট করবেন?')) await deleteDoc(doc(db, 'notices', n.id)) }} className="text-red-400 p-2"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Add Form */}
                  <div className="lg:w-1/2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <PlusCircle className="text-emerald-600" /> নতুন প্রোডাক্ট যোগ করুন
                    </h3>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-gray-500">প্রোডাক্টের নাম</label>
                          <input value={name} onChange={e => setName(e.target.value)} required type="text" className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl" placeholder="যেমন: iPhone 15 Pro Max" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">মূল্য (৳)</label>
                          <input value={price} onChange={e => setPrice(e.target.value)} required type="number" className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl" placeholder="৫০০০" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">আগের মূল্য (৳)</label>
                          <input value={old} onChange={e => setOld(e.target.value)} type="number" className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl" placeholder="৬০০০" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">ব্র্যান্ড</label>
                          <input value={brand} onChange={e => setBrand(e.target.value)} type="text" className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl" placeholder="যেমন: Apple" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">ক্যাটাগরি</label>
                          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl">
                            <option value="মোবাইল">মোবাইল</option>
                            <option value="ল্যাপটপ">ল্যাপটপ</option>
                            <option value="ইলেকট্রনিক্স">ইলেকট্রনিক্স</option>
                            <option value="ফ্যাশন">ফ্যাশন</option>
                            <option value="গ্যাজেট">গ্যাজেট</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 block">প্রোডাক্টের ছবি (URL)</label>
                        {images.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              {url ? <img src={url} className="w-full h-full object-cover rounded-lg" alt="" /> : <ImageIcon className="text-gray-300" size={16}/>}
                            </div>
                            <input 
                              value={url} 
                              onChange={e => {
                                const newImgs = [...images];
                                newImgs[idx] = e.target.value;
                                setImages(newImgs);
                              }} 
                              type="text" 
                              className="flex-1 bg-gray-50 border-none p-2 text-xs rounded-lg" 
                              placeholder={`Image URL ${idx + 1}`} 
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500">বিস্তারিত বিবরণ</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} required className="w-full mt-1 bg-gray-50 border-none p-3 rounded-xl h-24" placeholder="প্রোডাক্ট সম্পর্কে বিস্তারিত..."></textarea>
                      </div>

                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isMegaDeal} onChange={e => setIsMegaDeal(e.target.checked)} className="rounded text-emerald-600" />
                        <label className="text-sm font-bold text-gray-700">মেগা ডিল হিসেবে সেট করুন</label>
                      </div>

                      <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 transition-all">
                        {isSubmitting ? 'আপলোড হচ্ছে...' : 'প্রোডাক্ট পাবলিশ করুন'}
                      </button>
                    </form>
                  </div>

                  {/* List */}
                  <div className="lg:w-1/2 space-y-4">
                    <h3 className="font-bold text-gray-800">লাইভ প্রোডাক্টসমূহ ({products.length})</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {products.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                            {p.images && p.images[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <span className="text-3xl">{p.emoji}</span>}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm line-clamp-1">{p.name}</p>
                            <p className="text-emerald-600 font-black">৳{p.price}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500 uppercase">{p.category}</span>
                              {p.isMegaDeal && <span className="text-[10px] bg-orange-100 px-2 py-0.5 rounded-full font-bold text-orange-600 uppercase">Mega Deal</span>}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">সাম্প্রতিক অর্ডারসমূহ ({orders.length})</h3>
                  <div className="flex gap-2">
                    <button className="bg-white border text-xs font-bold px-4 py-2 rounded-lg">সবগুলো</button>
                    <button className="bg-white border text-xs font-bold px-4 py-2 rounded-lg text-emerald-600">পেন্ডিং</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase">Order #{order.id.substring(0,8)}</p>
                          <p className="text-xl font-black text-gray-800">৳{order.total}</p>
                        </div>
                        <select 
                          value={order.status} 
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={`text-xs font-bold px-3 py-2 rounded-xl border-none ring-1 ring-inset transition-all
                            ${order.status === 'ডেলিভারি সম্পন্ন' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-orange-50 text-orange-700 ring-orange-200'}`}
                        >
                          <option value="অর্ডার গ্রহণ করা হয়েছে">গৃহীত</option>
                          <option value="প্যাকেজ প্রস্তুত হচ্ছে">প্রস্তুত হচ্ছে</option>
                          <option value="ডেলিভারি পথে">পথে আছে</option>
                          <option value="ডেলিভারি সম্পন্ন">সম্পন্ন</option>
                        </select>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Users size={14} className="text-gray-400" />
                          <span className="font-bold text-gray-700">{order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-600">{order.paymentMethod}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <LayoutDashboard size={14} className="text-gray-400 mt-1" />
                          <span className="text-gray-500 text-xs">{order.address}, {order.district}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered Items</p>
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{item.emoji}</span>
                              <p className="text-sm font-bold text-gray-700 line-clamp-1">{item.name}</p>
                            </div>
                            <p className="text-sm font-bold text-gray-400">×{item.qty}</p>
                          </div>
                        ))}
                      </div>

                      <button className="mt-6 w-full border-2 border-emerald-50 text-emerald-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all">
                        ডিটেইলস দেখুন <ChevronRight size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">পেমেন্ট রিকোয়েস্ট ({paymentRequests.length})</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {paymentRequests.length > 0 ? (
                    paymentRequests.map(req => (
                      <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CreditCard size={24} />
                          </div>
                          <div>
                            <p className="font-black text-gray-800">৳{req.amount}</p>
                            <p className="text-xs text-gray-400">Order ID: #{req.orderId?.substring(0,8)}</p>
                            <p className="text-sm font-bold text-emerald-600">{req.method} ({req.sender})</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 rounded-xl flex-1 md:max-w-xs">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Transaction ID</p>
                          <p className="text-sm font-black text-blue-600 select-all">{req.trxId}</p>
                          <p className="text-[9px] text-gray-400 mt-1">{req.userEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              if(confirm('পেমেন্টটি নিশ্চিত করবেন?')) {
                                try {
                                  // Find the order and update its status
                                  const orderRef = doc(db, 'orders', req.orderId);
                                  await updateDoc(orderRef, { status: 'প্যাকেজ প্রস্তুত হচ্ছে' });
                                  await deleteDoc(doc(db, 'paymentRequests', req.id));
                                  alert('পেমেন্ট ভেরিফাই হয়েছে এবং অর্ডার প্রসেসিং এ গেছে!');
                                } catch (e) { alert('ত্রুটি হয়েছে'); }
                              }
                            }}
                            className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100"
                          >
                            Verify
                          </button>
                          <button 
                            onClick={async () => {
                              if(confirm('ডিলিট করবেন?')) await deleteDoc(doc(db, 'paymentRequests', req.id));
                            }}
                            className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                        <CreditCard size={40} />
                      </div>
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">কোনো রিকোয়েস্ট নেই</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Nav - Mobile */}
      <div className="md:hidden bg-white border-t px-2 py-2 flex justify-around">
        <MobileNavItem icon={<LayoutDashboard size={20}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Bell size={20}/>} active={activeTab === 'mega-deal'} onClick={() => setActiveTab('mega-deal')} />
        <MobileNavItem icon={<Package size={20}/>} active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
        <MobileNavItem icon={<ShoppingBag size={20}/>} active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <MobileNavItem icon={<CreditCard size={20}/>} active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-500 hover:bg-gray-50'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all ${active ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
      {icon}
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}

const handleDeleteProduct = async (id: string) => {
  if(window.confirm('Are you sure you want to delete this product?')) {
    await deleteDoc(doc(db, 'products', id));
  }
};

