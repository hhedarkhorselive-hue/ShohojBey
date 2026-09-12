import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Calendar, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    });
    return unsub;
  }, []);

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" /> : <UserIcon size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{user.displayName || 'Anonymous User'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{user.id.slice(0, 12)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Mail size={12} className="text-slate-400" /> {user.email}
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone size={12} className="text-slate-400" /> {user.phoneNumber}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar size={14} />
                      <span className="text-xs font-bold">
                        {user.createdAt?.toDate().toLocaleDateString('en-GB') || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {user.email === 'thedavid6758@gmail.com' ? 'Super Admin' : 'Customer'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this user?')) {
                          await deleteDoc(doc(db, 'users', user.id));
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
