import React, { useState, useEffect } from 'react';
import { ImageIcon, Plus, Trash2, Edit3, Link as LinkIcon, ExternalLink, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    link: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBanners(list);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'banners'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingBanner(null);
      setFormData({ title: '', url: '', link: '' });
    } catch (error) { console.error(error); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Active Banners ({banners.length})</h3>
        <button 
          onClick={() => { setEditingBanner(null); setFormData({title:'', url:'', link:''}); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all text-sm"
        >
          <Plus size={18} /> Add Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="aspect-[21/9] bg-slate-100 relative overflow-hidden">
              <img src={banner.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button 
                  onClick={() => {
                    setEditingBanner(banner);
                    setFormData({ title: banner.title || '', url: banner.url, link: banner.link || '' });
                    setIsModalOpen(true);
                  }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 hover:scale-110 transition-transform shadow-lg"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={async () => { if(confirm('Delete banner?')) await deleteDoc(doc(db, 'banners', banner.id)); }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-rose-600 hover:scale-110 transition-transform shadow-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <h4 className="font-black text-slate-800 truncate">{banner.title || 'Untitled Banner'}</h4>
              <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                <LinkIcon size={12} /> {banner.link || 'No Link'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-800">{editingBanner ? 'Edit Banner' : 'New Banner'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Banner Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Image URL</label>
                  <input required value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Redirect Link</label>
                  <input value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold" placeholder="/megadeal" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700">Save Banner</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BannerManager;
