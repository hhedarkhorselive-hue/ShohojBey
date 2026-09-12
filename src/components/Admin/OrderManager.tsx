import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const OrderManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({...selectedOrder, status: newStatus});
      }
    } catch (error) {
      console.error(error);
      alert('Error updating status');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'processing': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'cancelled': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
     o.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     o.number?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === 'all' || o.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Order ID, Email, or Number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 px-4 py-3 outline-none cursor-pointer"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">#{order.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="text-sm font-black text-slate-800">{order.userEmail || 'Guest'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.number || 'No Number'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar size={14} />
                      <span className="text-xs font-bold">
                        {order.date?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-emerald-600">৳{order.totalAmount}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative group">
                      <select 
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`appearance-none px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all outline-none cursor-pointer pr-8 ${getStatusStyle(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('Delete this order?')) {
                            await deleteDoc(doc(db, 'orders', order.id));
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#f8fafc] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${getStatusStyle(selectedOrder.status)}`}>
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Order Details</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{selectedOrder.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Customer & Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <User size={14} className="text-emerald-500" /> Customer Information
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm font-black text-slate-800">{selectedOrder.userEmail || 'Guest User'}</p>
                      <p className="text-sm font-bold text-slate-500">{selectedOrder.number || 'No Phone Provided'}</p>
                      <div className="pt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">User ID</span>
                        <code className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-600">{selectedOrder.userId || 'N/A'}</code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard size={14} className="text-blue-500" /> Payment Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">Method</span>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide bg-slate-50 px-2 py-1 rounded">{selectedOrder.paymentMethod || 'Manual'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">Total Amount</span>
                        <span className="text-sm font-black text-emerald-600">৳{selectedOrder.totalAmount}</span>
                      </div>
                      {selectedOrder.trxId && (
                        <div className="pt-2 border-t border-slate-50">
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Transaction ID</span>
                          <p className="text-sm font-black text-slate-800 break-all">{selectedOrder.trxId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Ordered Items</h4>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <ShoppingBag size={20} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{item.name}</p>
                          <p className="text-xs font-bold text-slate-400">Qty: {item.quantity || 1} • ৳{item.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-800">৳{(item.price * (item.quantity || 1))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                    <span className="text-sm font-black text-slate-800">Grand Total</span>
                    <span className="text-xl font-black text-emerald-600">৳{selectedOrder.totalAmount}</span>
                  </div>
                </div>

                {/* Status Update Actions */}
                <div className="flex flex-wrap gap-3 pt-4">
                  {['pending', 'processing', 'delivered', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedOrder.id, status)}
                      className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        selectedOrder.status === status 
                          ? getStatusStyle(status) + ' ring-2 ring-emerald-500 ring-offset-2'
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderManager;
