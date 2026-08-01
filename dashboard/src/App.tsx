import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LayoutDashboard, Wallet, LogOut, Search, PlusCircle, Activity, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Background Component for Premium Feel ---
const BackgroundOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen animate-blob"></div>
    <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-blob" style={{ animationDelay: '2s' }}></div>
    <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen animate-blob" style={{ animationDelay: '4s' }}></div>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // Dashboard state
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form state
  const [logAccountId, setLogAccountId] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    const { data: opps } = await supabase.from('opportunities').select('*').order('last_seen_at', { ascending: false });
    const { data: earns } = await supabase.from('earnings').select(`*, accounts(opportunity_id, status)`).order('earned_at', { ascending: false });
    const { data: accs } = await supabase.from('accounts').select(`*, opportunities(*)`).order('created_at', { ascending: false });
    
    if (opps) setOpportunities(opps);
    if (earns) setEarnings(earns);
    if (accs) {
      setAccounts(accs);
      if (accs.length > 0 && !logAccountId) setLogAccountId(accs[0].id);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sidehustle2026') { 
      setIsAuthenticated(true);
    } else {
      // Small shake animation could go here for incorrect pwd
      alert('Incorrect password');
    }
  };

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAccountId || !logAmount) return;
    
    setIsLogging(true);
    const { error } = await supabase.from('earnings').insert({
      account_id: logAccountId,
      amount: parseFloat(logAmount),
      currency: 'USD',
      status: 'paid',
      source: 'manual',
      earned_at: new Date().toISOString()
    });
    
    setIsLogging(false);
    if (error) {
      alert("Error logging earnings: " + error.message);
    } else {
      setLogAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      fetchDashboardData();
    }
  };

  const totalEarned = earnings.reduce((acc, curr) => acc + Number(curr.amount), 0);

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <BackgroundOrbs />
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel p-10 max-w-md w-full text-center z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)]"
          >
            <Wallet className="text-white w-10 h-10" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold mb-3 tracking-tight"
          >
            Welcome Back
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 mb-8"
          >
            Enter your secure passphrase to access your tracker.
          </motion.p>
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleLogin} 
            className="space-y-5"
          >
            <input 
              type="password" 
              className="input-field text-center text-lg tracking-[0.2em] focus:tracking-widest transition-all" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full py-4 text-lg">
              Unlock Dashboard
            </button>
          </motion.form>
        </motion.div>
      </div>
    );
  }

  // --- Main Dashboard UI ---
  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'opportunities', icon: Search, label: 'Discoveries' },
    { id: 'accounts', icon: CheckCircle2, label: 'Accounts' },
    { id: 'quicklog', icon: PlusCircle, label: 'Quick Log' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row font-outfit text-gray-100 bg-gray-950">
      <BackgroundOrbs />
      
      {/* Sidebar */}
      <aside className="relative z-20 w-full md:w-72 border-r border-gray-800/50 bg-gray-900/40 backdrop-blur-3xl p-6 flex flex-col shadow-2xl">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4 mb-12"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none">Tracker</h1>
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Side Income</span>
          </div>
        </motion.div>
        
        <nav className="space-y-2 flex-1 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)} 
                className={`relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 overflow-hidden group ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'text-indigo-400' : 'group-hover:scale-110'}`} />
                <span className="font-medium relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <button onClick={() => setIsAuthenticated(false)} className="mt-auto flex items-center gap-4 px-5 py-4 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all group">
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
          <span className="font-medium">Lock Dashboard</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 p-6 md:p-12 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-10 max-w-5xl mx-auto"
            >
              <header>
                <h2 className="text-4xl font-bold tracking-tight mb-2">Overview</h2>
                <p className="text-gray-400 text-lg">Here's the pulse of your income streams.</p>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Earned', value: `$${totalEarned.toFixed(2)}`, color: 'from-green-400 to-emerald-500', icon: Activity },
                  { label: 'Pending Payouts', value: `$${earnings.filter(e => e.status === 'pending').reduce((a,c) => a + Number(c.amount), 0).toFixed(2)}`, color: 'from-white to-gray-300', icon: Wallet },
                  { label: 'Active Accounts', value: accounts.length.toString(), color: 'from-indigo-400 to-purple-400', icon: LayoutDashboard }
                ].map((stat, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-6 group hover:border-gray-700/80 transition-colors"
                    key={stat.label}
                  >
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium mb-4">
                      <stat.icon className="w-4 h-4" /> {stat.label}
                    </div>
                    <div className={`text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-panel p-8"
              >
                <h3 className="text-2xl font-bold mb-6">Threshold Tracker</h3>
                <div className="space-y-6">
                  {accounts.filter(a => a.status === 'active').length === 0 && <p className="text-gray-500">No active accounts to track.</p>}
                  {accounts.filter(a => a.status === 'active').map(acc => {
                    const opp = acc.opportunities;
                    const threshold = opp.payout_threshold_usd || 0;
                    const accEarnings = earnings.filter(e => e.account_id === acc.id).reduce((a,c) => a + Number(c.amount), 0);
                    const progress = threshold > 0 ? Math.min((accEarnings / threshold) * 100, 100) : 100;
                    
                    return (
                      <div key={acc.id} className="group">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-gray-200">{opp.name}</span>
                          <span className="text-gray-400 font-medium">
                            <span className="text-white">${accEarnings.toFixed(2)}</span> {threshold > 0 ? `/ $${threshold.toFixed(2)}` : ''}
                          </span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden border border-gray-800">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full relative"
                          >
                            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* OPPORTUNITIES TAB */}
          {activeTab === 'opportunities' && (
            <motion.div 
              key="opportunities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 max-w-5xl mx-auto"
            >
              <header>
                <h2 className="text-4xl font-bold tracking-tight mb-2">New Discoveries</h2>
                <p className="text-gray-400 text-lg">Opportunities automatically found by the AI agent.</p>
              </header>
              
              <div className="grid gap-5">
                {opportunities.map((opp, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={opp.id} 
                    className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group hover:border-gray-700/80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                  >
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                        {opp.name} 
                        <span className="text-[10px] px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full uppercase tracking-widest font-semibold">
                          {opp.category}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-400">
                        <span className="text-gray-300">Payouts:</span> {opp.payout_methods.join(', ')} 
                        <span className="mx-2">•</span> 
                        <span className="text-gray-300">Threshold:</span> ${opp.payout_threshold_usd}
                      </p>
                    </div>
                    <button className="btn-primary flex items-center gap-2" onClick={async () => {
                      window.open(opp.signup_url, '_blank');
                      // Kick off AI setup assistant in background
                      try {
                        await fetch('https://discovery-agent.daniellancce1.workers.dev/setup-assistant', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ opportunityId: opp.id })
                        });
                        fetchDashboardData();
                      } catch (e) {
                        console.error(e);
                      }
                    }}>
                      Review & Setup <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                ))}
                {opportunities.length === 0 && (
                  <div className="py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-3xl">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No opportunities found yet. The discovery cron will populate this soon.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <motion.div 
              key="accounts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 max-w-5xl mx-auto"
            >
              <header>
                <h2 className="text-4xl font-bold tracking-tight mb-2">My Accounts</h2>
                <p className="text-gray-400 text-lg">Manage your signed-up platforms and AI setup notes.</p>
              </header>
              
              <div className="grid gap-5">
                {accounts.map((acc, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={acc.id} 
                    className="glass-panel p-6 sm:p-8 flex flex-col group transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          {acc.opportunities?.name}
                          <span className={`text-[10px] px-3 py-1 border rounded-full uppercase tracking-widest font-semibold ${acc.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                            {acc.status.replace('_', ' ')}
                          </span>
                        </h3>
                      </div>
                      {acc.status === 'pending_setup' && (
                        <button 
                          className="btn-primary py-2 px-4 text-sm"
                          onClick={async () => {
                            await supabase.from('accounts').update({ status: 'active' }).eq('id', acc.id);
                            fetchDashboardData();
                          }}
                        >
                          Mark as Active
                        </button>
                      )}
                    </div>
                    {acc.notes && (
                      <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        <strong className="block mb-2 text-indigo-400">AI Setup Insights:</strong>
                        {acc.notes}
                      </div>
                    )}
                  </motion.div>
                ))}
                {accounts.length === 0 && (
                  <div className="py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-3xl">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No accounts yet. Go to Discoveries and click 'Review & Setup' to get started.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* QUICK LOG TAB */}
          {activeTab === 'quicklog' && (
            <motion.div 
              key="quicklog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-xl mx-auto"
            >
              <header className="mb-10 text-center">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PlusCircle className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight mb-2">Quick Log</h2>
                <p className="text-gray-400 text-lg">Manually record your earnings across platforms.</p>
              </header>

              <div className="glass-panel p-8 relative overflow-hidden">
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-green-500/10 backdrop-blur-md z-20 flex flex-col items-center justify-center border border-green-500/20"
                    >
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-green-400">Earnings Logged!</h3>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form className="space-y-6 relative z-10" onSubmit={handleQuickLog}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 tracking-wide uppercase">Platform Account</label>
                    <div className="relative">
                      <select 
                        className="input-field appearance-none cursor-pointer" 
                        value={logAccountId} 
                        onChange={(e) => setLogAccountId(e.target.value)} 
                        required
                      >
                        {accounts.filter(a => a.status === 'active').length === 0 && <option value="">No active accounts found</option>}
                        {accounts.filter(a => a.status === 'active').map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.opportunities?.name} (Active)</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none rotate-90" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 tracking-wide uppercase">Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0.01" 
                        required 
                        className="input-field pl-9 font-mono text-lg" 
                        placeholder="0.00" 
                        value={logAmount} 
                        onChange={(e) => setLogAmount(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn-primary w-full py-4 text-lg mt-8" 
                    disabled={isLogging || accounts.filter(a => a.status === 'active').length === 0}
                  >
                    {isLogging ? (
                      <span className="flex items-center justify-center gap-3">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        Logging...
                      </span>
                    ) : 'Log Earnings'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
