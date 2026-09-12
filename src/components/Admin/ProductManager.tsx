import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye, 
  Package, 
  Tag, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    originalPrice: '',
    image: '',
    category: 'Games',
    description: '',
    stock: true,
    isMegaDeal: false,
    deliveryType: 'Instant Delivery'
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
      }

      setIsAddModalOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '', price: '', originalPrice: '', image: '', 
        category: 'Games', description: '', stock: true, isMegaDeal: false,
        deliveryType: 'Instant Delivery'
      });
    } catch (error) {
      console.error(error);
      alert('Error saving product');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'all' || p.category === categoryFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 px-4 py-3 outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Games">Games</option>
            <option value="Subscriptions">Subscriptions</option>
            <option value="Gift Cards">Gift Cards</option>
            <option value="Software">Software</option>
          </select>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all whitespace-nowrap"
        >
          <Plus size={20} />
          Add New Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl border border-slate-100 overflow-hidden shrink-0 bg-slate-50">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{product.deliveryType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wide">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">৳{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-[10px] font-bold text-slate-400 line-through">৳{product.originalPrice}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'products', product.id), { stock: !product.stock });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                        product.stock ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {product.stock ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {product.stock ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            name: product.name,
                            price: product.price.toString(),
                            originalPrice: product.originalPrice?.toString() || '',
                            image: product.image,
                            category: product.category,
                            description: product.description || '',
                            stock: product.stock,
                            isMegaDeal: product.isMegaDeal || false,
                            deliveryType: product.deliveryType || 'Instant Delivery'
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this product?')) {
                            await deleteDoc(doc(db, 'products', product.id));
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
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-xl font-black text-slate-800">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Product Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                      placeholder="e.g. Free Fire Diamond"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option>Games</option>
                      <option>Subscriptions</option>
                      <option>Gift Cards</option>
                      <option>Software</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Sale Price (৳)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Original Price (৳) - Optional</label>
                    <input 
                      type="number" 
                      value={formData.originalPrice}
                      onChange={e => setFormData({...formData, originalPrice: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                      placeholder="e.g. 650"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Image URL</label>
                  <input 
                    required
                    type="text" 
                    value={formData.image}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
                    placeholder="Product details..."
                  />
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div 
                      onClick={() => setFormData({...formData, stock: !formData.stock})}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        formData.stock ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {formData.stock && <CheckCircle size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-black text-slate-700">In Stock</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div 
                      onClick={() => setFormData({...formData, isMegaDeal: !formData.isMegaDeal})}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        formData.isMegaDeal ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {formData.isMegaDeal && <CheckCircle size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-black text-slate-700">Mega Deal</span>
                  </label>
                </div>
              </form>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-white text-slate-600 rounded-2xl font-black border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductManager;
