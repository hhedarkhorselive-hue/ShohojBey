import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const Overview: React.FC = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    pendingOrders: 0,
    deliveredOrders: 0
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    // Real-time stats calculation
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      let sales = 0;
      let pending = 0;
      let delivered = 0;
      const ordersList: any[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        sales += data.totalAmount || 0;
        if (data.status === 'pending') pending++;
        if (data.status === 'delivered') delivered++;
        ordersList.push({ id: doc.id, ...data });
      });

      setStats(prev => ({
        ...prev,
        totalSales: sales,
        totalOrders: snapshot.size,
        pendingOrders: pending,
        deliveredOrders: delivered
      }));

      // Sort and take top 5
      const sorted = ordersList.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 5);
      setRecentOrders(sorted);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    });

    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, []);

  const data = [
    { name: 'Mon', sales: 4000 },
    { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 2000 },
    { name: 'Thu', sales: 2780 },
    { name: 'Fri', sales: 1890 },
    { name: 'Sat', sales: 2390 },
    { name: 'Sun', sales: 3490 },
  ];

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Sales" 
          value={`৳${stats.totalSales.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-emerald-500" 
          trend="up" 
          trendValue="+12.5%" 
        />
        <StatCard 
          title="Active Orders" 
          value={stats.totalOrders} 
          icon={Package} 
          color="bg-blue-500" 
          trend="up" 
          trendValue="+5.2%" 
        />
        <StatCard 
          title="Total Customers" 
          value={stats.totalUsers} 
          icon={Users} 
          color="bg-violet-500" 
          trend="up" 
          trendValue="+8.1%" 
        />
        <StatCard 
          title="Pending" 
          value={stats.pendingOrders} 
          icon={Clock} 
          color="bg-orange-500" 
          trend="down" 
          trendValue="-2.4%" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800">Sales Overview</h3>
              <p className="text-slate-400 text-sm font-medium">Revenue generated this week</p>
            </div>
            <select className="bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 px-4 py-2 outline-none cursor-pointer">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} tickFormatter={(value) => `৳${value}`} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{color: '#10b981', fontWeight: 800}}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6">Recent Orders</h3>
          <div className="space-y-6">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                  order.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Package size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-800 truncate">৳{order.totalAmount || 0}</p>
                  <p className="text-xs font-bold text-slate-400 truncate">{order.items?.length || 0} Items • {order.paymentMethod || 'COD'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg inline-block ${
                    order.status === 'delivered' ? 'text-emerald-600 bg-emerald-50' : 
                    order.status === 'pending' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50'
                  }`}>
                    {order.status}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold">No recent orders</p>
              </div>
            )}
          </div>
          {recentOrders.length > 0 && (
            <button className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
              View All Orders
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
