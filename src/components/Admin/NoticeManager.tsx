import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Edit3, MessageSquare, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const NoticeManager: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    message: '',
    type: 'urgent' as 'urgent' | 'cashback' | 'voucher' | 'stock'
  });

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(list);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNotice) {
        await updateDoc(doc(db, 'notices', editingNotice.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'notices'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingNotice(null);
      setFormData({ message: '', type: 'urgent' });
    } catch (error) { console.error(error); }
  };

  const getNoticeColor = (type: string) => {
    switch(type) {
      case 'urgent': return 'bg-rose-500';
      case 'cashback': return 'bg-emerald-500';
      case 'voucher': return 'bg-violet-500';
      case 'stock': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Global Notices ({notices.length})</h3>
        <button 
          onClick={() => { setEditingNotice(null); setFormData({message:'', type:'urgent'}); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all text-sm"
        >
          <Plus size={18} /> New Notice
        </button>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <div key={notice.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between group hover:border-emerald-200 transition-all shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${getNoticeColor(notice.type)}`}>
                <Bell size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md text-white ${getNoticeColor(notice.type)}`}>
                    {notice.type}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {notice.createdAt?.toDate().toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">{notice.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setEditingNotice(notice);
                  setFormData({ message: notice.message, type: notice.type });
                  setIsModalOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit3 size={18} />
              </button>
              <button 
                onClick={async () => { if(confirm('Delete notice?')) await deleteDoc(doc(db, 'notices', notice.id)); }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-800">{editingNotice ? 'Edit Notice' : 'New Notice'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Notice Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['urgent', 'cashback', 'voucher', 'stock'].map((t) => (
                      <button 
                        key={t}
                        type="button"
                        onClick={() => setFormData({...formData, type: t as any})}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                          formData.type === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Message</label>
                  <textarea 
                    required 
                    rows={4}
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold resize-none" 
                    placeholder="Enter notice message here..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700">Publish Notice</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoticeManager;
