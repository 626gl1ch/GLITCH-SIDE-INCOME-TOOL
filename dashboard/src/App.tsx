import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LayoutDashboard, Wallet, Settings, LogOut, Search, PlusCircle, Activity } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // Dashboard state
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    const { data: opps } = await supabase.from('opportunities').select('*').order('last_seen_at', { ascending: false });
    const { data: earns } = await supabase.from('earnings').select(`*, accounts(opportunity_id, status)`).order('earned_at', { ascending: false });
    if (opps) setOpportunities(opps);
    if (earns) setEarnings(earns);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sidehustle2026') { // Hardcoded simple gate for personal use
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 max-w-sm w-full animate-fade-in text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-400 mb-8">Enter your password to access the tracker.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              className="input-field text-center" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  const totalEarned = earnings.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-gray-800 bg-gray-900/30 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 text-indigo-400 font-bold text-xl">
          <Wallet className="w-6 h-6" /> Tracker
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" /> Overview
          </button>
          <button onClick={() => setActiveTab('opportunities')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'opportunities' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}>
            <Search className="w-5 h-5" /> Discoveries
          </button>
          <button onClick={() => setActiveTab('quicklog')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'quicklog' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}>
            <PlusCircle className="w-5 h-5" /> Quick Log
          </button>
        </nav>
        
        <button onClick={() => setIsAuthenticated(false)} className="mt-auto flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" /> Lock
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 animate-fade-in overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-slide-up">
            <header className="mb-8">
              <h2 className="text-3xl font-bold">Dashboard</h2>
              <p className="text-gray-400">Here's what you've earned across all platforms.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6">
                <div className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Total Earned</div>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                  ${totalEarned.toFixed(2)}
                </div>
              </div>
              <div className="glass-panel p-6">
                <div className="text-gray-400 text-sm font-medium mb-2">Pending Payouts</div>
                <div className="text-4xl font-bold text-white">
                  ${earnings.filter(e => e.status === 'pending').reduce((a,c) => a + Number(c.amount), 0).toFixed(2)}
                </div>
              </div>
              <div className="glass-panel p-6">
                <div className="text-gray-400 text-sm font-medium mb-2">Active Accounts</div>
                <div className="text-4xl font-bold text-indigo-400">
                  4
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 mt-8">
              <h3 className="text-xl font-bold mb-4">Threshold Tracker</h3>
              <div className="space-y-4">
                {/* Dummy visual for threshold */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-200">ySense</span>
                    <span className="text-gray-400">$6.50 / $10.00</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-200">Timebucks</span>
                    <span className="text-gray-400">$1.20 / $5.00</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-3xl font-bold">New Discoveries</h2>
            <div className="grid gap-4">
              {opportunities.map(opp => (
                <div key={opp.id} className="glass-panel p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {opp.name} 
                      <span className="text-xs px-2 py-1 bg-gray-800 text-indigo-300 rounded-full uppercase tracking-wider">{opp.category}</span>
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Payout: {opp.payout_methods.join(', ')} • Threshold: ${opp.payout_threshold_usd}</p>
                  </div>
                  <button className="btn-primary" onClick={() => window.open(opp.signup_url, '_blank')}>
                    Review & Setup
                  </button>
                </div>
              ))}
              {opportunities.length === 0 && <p className="text-gray-500">No opportunities found in DB. Try running the cron.</p>}
            </div>
          </div>
        )}

        {activeTab === 'quicklog' && (
          <div className="animate-slide-up max-w-lg">
            <h2 className="text-3xl font-bold mb-6">Quick Log</h2>
            <form className="glass-panel p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Logged!"); }}>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Platform Account</label>
                <select className="input-field">
                  <option>ySense (Active)</option>
                  <option>Timebucks (Active)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Amount ($)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.50" />
              </div>
              <button type="submit" className="btn-primary w-full mt-4">Log Earnings</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
