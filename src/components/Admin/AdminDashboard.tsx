import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ClipboardList, 
  Users, 
  Image as ImageIcon, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle,
  Clock,
  ChevronRight,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

// Sub-components will be imported here or defined locally for now to ensure portability
import Overview from './Overview';
import ProductManager from './ProductManager';
import OrderManager from './OrderManager';
import UserManager from './UserManager';
import BannerManager from './BannerManager';
import NoticeManager from './NoticeManager';

type AdminTab = 'overview' | 'products' | 'orders' | 'users' | 'banners' | 'notices' | 'settings';

const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'notices', label: 'Notices', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[9999] flex overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? (isMobile ? '100%' : '280px') : '0px' }}
        className={`bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-[10000] ${isMobile && !isSidebarOpen ? 'hidden' : 'relative'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-lg leading-tight">SHOP ADMIN</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Control Center</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-lg text-slate-500">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as AdminTab);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="font-bold text-sm">{item.label}</span>
              {activeTab === item.id && (
                <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 bg-emerald-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            Exit Dashboard
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-black text-slate-800 capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search anything..." className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-48 font-medium" />
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-800 leading-none">Admin User</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Super Admin</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-xl border-2 border-white shadow-sm overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff" alt="Avatar" />
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <Overview />}
              {activeTab === 'products' && <ProductManager />}
              {activeTab === 'orders' && <OrderManager />}
              {activeTab === 'users' && <UserManager />}
              {activeTab === 'banners' && <BannerManager />}
              {activeTab === 'notices' && <NoticeManager />}
              {activeTab === 'settings' && (
                <div className="bg-white p-12 rounded-3xl text-center">
                  <Settings size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800">Settings Coming Soon</h3>
                  <p className="text-slate-500">We are working on advanced store settings.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
