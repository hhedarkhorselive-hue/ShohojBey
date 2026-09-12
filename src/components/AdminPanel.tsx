import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Package, ShoppingBag, PlusCircle, Trash2, LogOut, CheckCircle, Clock } from 'lucide-react';

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Product Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [old, setOld] = useState('');
  const [emoji, setEmoji] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('মোবাইল');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProducts(list);
    });

    // Fetch Orders
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('date', 'desc')), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setOrders(list);
    });

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        name,
        brand: brand || 'ShohojBuy',
        price: Number(price),
        old: old ? Number(old) : Number(price),
        emoji,
        category,
        description,
        rating: "5.0",
        stockLeft: 10,
        createdAt: new Date().toISOString()
      });
      // Reset form
      setName('');
      setPrice('');
      setOld('');
      setEmoji('');
      setBrand('');
      setDescription('');
      alert('Product Added Successfully!');
    } catch (error) {
      console.error("Error adding product: ", error);
      alert('Failed to add product');
    }
    setIsSubmitting(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if(window.confirm('Are you sure you want to delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] overflow-y-auto font-sans flex flex-col">
      <div className="bg-white px-4 pt-6 pb-4 border-b">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-emerald-700">ShohojBuy Admin</h1>
            <p className="text-xs text-gray-500 font-medium">Welcome back, Shariar Al Shakib</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-transform"
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            <Package size={16} /> পণ্যসমূহ
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
          >
            <ShoppingBag size={16} /> অর্ডারসমূহ
            {orders.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1">
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Add Product Form */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlusCircle size={20} className="text-emerald-600"/> Add New Product
              </h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Product Name</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. Mens Cotton T-Shirt"/>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Price (৳)</label>
                    <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. 500"/>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Old Price (৳)</label>
                    <input type="number" value={old} onChange={e => setOld(e.target.value)} className="w-full border p-2 rounded" placeholder="Optional"/>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Emoji/Icon</label>
                    <input required type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. 📱"/>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Brand Name</label>
                    <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. Apple"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded">
                    <option value="মোবাইল">মোবাইল</option>
                    <option value="ল্যাপটপ">ল্যাপটপ</option>
                    <option value="ইলেকট্রনিক্স">ইলেকট্রনিক্স</option>
                    <option value="ফ্যাশন">ফ্যাশন</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded h-20" placeholder="Product details..."></textarea>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">
                  {isSubmitting ? 'Adding...' : 'Publish Product'}
                </button>
              </form>
            </div>

            {/* Product List */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h2 className="text-lg font-bold mb-4">Live Products ({products.length})</h2>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 border p-2 rounded-lg">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded text-2xl">
                      {p.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium line-clamp-1">{p.name}</h3>
                      <p className="text-emerald-600 font-bold">৳{p.price}</p>
                    </div>
                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                {products.length === 0 && <p className="text-gray-500 text-center py-4">No products yet.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Recent Orders ({orders.length})</h2>
            {orders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Order #{order.id.substring(0,8)}</p>
                    <p className="font-bold text-lg">৳{order.total}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1
                    ${order.status === 'Processing' ? 'bg-orange-100 text-orange-700' : 
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {order.status === 'Processing' ? <Clock size={12}/> : <CheckCircle size={12}/>}
                    {order.status}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-2 rounded text-sm mb-3">
                  <p><strong>Customer:</strong> {order.customerName}</p>
                  <p><strong>Phone:</strong> {order.phone}</p>
                  <p><strong>Address:</strong> {order.address}, {order.district}</p>
                  <p><strong>Payment:</strong> {order.paymentMethod}</p>
                </div>
                
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">ITEMS:</p>
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 text-sm border-b border-gray-100 pb-2 mb-2 last:border-0">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded text-xl">
                        {item.emoji}
                      </div>
                      <div>
                        <p className="line-clamp-1 font-medium">{item.name}</p>
                        <p className="text-gray-500">Qty: {item.qty} x ৳{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500 text-center py-4">No orders received yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
