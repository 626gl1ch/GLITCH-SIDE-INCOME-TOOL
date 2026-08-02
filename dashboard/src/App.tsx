import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LayoutDashboard, Wallet, LogOut, Search, PlusCircle, Activity, ChevronRight, CheckCircle2, XCircle, Settings as SettingsIcon, Star, Trash2, Flag, Clock, ExternalLink } from 'lucide-react';
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
  const [profileCountry, setProfileCountry] = useState('Nigeria');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSearching, setIsSearching] = useState(false);
  const [setupLoading, setSetupLoading] = useState<string | null>(null);
  
  // Form state
  const [logAccountId, setLogAccountId] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    const { data: opps } = await supabase.from('opportunities').select('*').order('last_seen_at', { ascending: false });
    const { data: earns } = await supabase.from('earnings').select(`*, accounts(opportunity_id, status)`).order('earned_at', { ascending: false });
    const { data: accs } = await supabase.from('accounts').select(`*, opportunities(*)`).order('created_at', { ascending: false });
    const { data: prof } = await supabase.from('profile').select('*').limit(1);
    
    if (opps) setOpportunities(opps);
    if (earns) setEarnings(earns);
    if (accs) {
      setAccounts(accs);
      if (accs.length > 0 && !logAccountId) setLogAccountId(accs[0].id);
    }
    if (prof && prof.length > 0 && prof[0].country) {
      setProfileCountry(prof[0].country);
    }
  };

  const handleFlagOpportunity = async (opportunityId: string) => {
    setOpportunities(opportunities.filter(o => o.id !== opportunityId));
    await supabase.from('corrections').insert([{
      opportunity_id: opportunityId,
      reason: 'User flagged as incorrect or saturated'
    }]);
  };

  const handleReviewAndSetup = async (opportunityId: string) => {
    setSetupLoading(opportunityId);
    try {
      const opp = opportunities.find(o => o.id === opportunityId);
      window.open(opp.signup_url, '_blank');
      await fetch('https://discovery-agent.daniellancce1.workers.dev/setup-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId })
      });
      await fetchDashboardData();
      setActiveTab('accounts');
    } catch (e) {
      console.error(e);
    } finally {
      setSetupLoading(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sidehustle2026') { 
      setIsAuthenticated(true);
    } else {
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
      setLogError(error.message);
      setTimeout(() => setLogError(null), 3500);
    } else {
      setLogAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      fetchDashboardData();
    }
  };

  const totalEarned = earnings.reduce((acc, curr) => acc + Number(curr.amount), 0);

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

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'opportunities', icon: Search, label: 'Discoveries' },
    { id: 'accounts', icon: CheckCircle2, label: 'My Tasks' },
    { id: 'quicklog', icon: PlusCircle, label: 'Quick Log' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' }
  ];

  const allCountries = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];

  const displayOpportunities = opportunities.filter(opp => !accounts.some(acc => acc.opportunity_id === opp.id));

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row font-outfit text-gray-100 bg-gray-950">
      <BackgroundOrbs />
      <aside className="relative z-20 w-full md:w-72 border-r border-gray-800/50 bg-gray-900/40 backdrop-blur-3xl p-6 flex flex-col shadow-2xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none">Tracker</h1>
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Side Income</span>
          </div>
        </div>
        <nav className="space-y-2 flex-1 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 overflow-hidden group ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {isActive && <motion.div layoutId="active-pill" className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
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

      <main className="relative z-10 flex-1 p-6 md:p-12 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="space-y-10 max-w-5xl mx-auto">
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
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-panel p-6">
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium mb-4">
                      <stat.icon className="w-4 h-4" /> {stat.label}
                    </div>
                    <div className={`text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'opportunities' && (
            <motion.div key="opportunities" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="space-y-8 max-w-5xl mx-auto">
              <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight mb-2">New Discoveries</h2>
                </div>
                <button onClick={async () => {
                    setIsSearching(true);
                    try {
                      await fetch('https://discovery-agent.daniellancce1.workers.dev/trigger-discovery');
                      await fetchDashboardData();
                    } catch (e) { console.error(e); }
                    setIsSearching(false);
                  }} disabled={isSearching} className="btn-primary py-3 px-6 flex items-center gap-2">
                  {isSearching ? 'Searching...' : <><Search className="w-4 h-4" /> Find More</>}
                </button>
              </header>
              <div className="grid gap-5">
                {displayOpportunities.length === 0 ? (
                  <div className="glass-panel p-10 text-center flex flex-col items-center justify-center text-gray-400">
                    <Search className="w-12 h-12 mb-4 text-indigo-400/50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No New Opportunities</h3>
                    <p>Click "Find More" to let the AI search the web for new hidden gems in {profileCountry}.</p>
                  </div>
                ) : (
                  displayOpportunities.map((opp, i) => {
                    const daysVerifiedAgo = opp.last_verified_at 
                      ? Math.floor((new Date().getTime() - new Date(opp.last_verified_at).getTime()) / (1000 * 3600 * 24))
                      : null;
                    return (
                    <motion.div key={opp.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start gap-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">{opp.name}</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          Threshold: ${opp.payout_threshold_usd}
                          {opp.source_url && (
                             <span className="ml-4 px-2 py-1 bg-white/5 rounded text-xs text-blue-400">Source: {new URL(opp.source_url).hostname}</span>
                          )}
                          {daysVerifiedAgo !== null && (
                             <span className={`ml-2 px-2 py-1 rounded text-xs ${daysVerifiedAgo > 30 ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                               Verified {daysVerifiedAgo} days ago
                             </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleReviewAndSetup(opp.id)} disabled={setupLoading === opp.id} className="btn-primary py-2 px-4 text-sm flex items-center justify-center gap-2 min-w-[140px]">
                          {setupLoading === opp.id ? 'Setting up...' : <>Review & Setup <ChevronRight className="w-4 h-4" /></>}
                        </button>
                        <button onClick={() => handleFlagOpportunity(opp.id)} className="text-xs text-gray-500 hover:text-red-400 flex items-center justify-center gap-1">
                          <Flag className="w-3 h-3" /> Flag as Incorrect
                        </button>
                      </div>
                    </motion.div>
                  );
                }))}
              </div>
            </motion.div>
          )}

          {activeTab === 'accounts' && (
            <motion.div key="accounts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-4xl mx-auto">
              <header className="mb-8">
                <h2 className="text-4xl font-bold tracking-tight mb-2">My Accounts</h2>
                <p className="text-gray-400 text-lg">Manage your active platform accounts and view AI setup notes.</p>
              </header>

              <div className="grid gap-5">
                {accounts.length === 0 ? (
                  <div className="glass-panel p-10 text-center flex flex-col items-center justify-center text-gray-400">
                    <Wallet className="w-12 h-12 mb-4 text-indigo-400/50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Active Accounts</h3>
                    <p>Go to the Discoveries tab and click "Review & Setup" on a platform to start tracking it.</p>
                  </div>
                ) : (
                  accounts.map(acc => (
                    <motion.div key={acc.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 sm:p-8">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-1">{acc.opportunities?.name}</h3>
                          <div className="flex gap-3 text-sm">
                            <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 capitalize">{acc.status}</span>
                            <span className="px-2 py-1 rounded bg-gray-800 text-gray-400">Since {new Date(acc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm('Are you sure you want to remove this account?')) {
                              await supabase.from('accounts').delete().eq('id', acc.id);
                              fetchDashboardData();
                            }
                          }}
                          className="p-2 rounded-xl bg-gray-800/50 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove Account"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      {acc.notes && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                          <strong className="block mb-2 text-indigo-400">AI Setup Insights:</strong>
                          {acc.notes}
                        </div>
                      )}
                    </motion.div>
                  ))
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
                  {logError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-red-500/10 backdrop-blur-md z-20 flex flex-col items-center justify-center border border-red-500/20"
                    >
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <XCircle className="w-16 h-16 text-red-400 mb-4" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-red-400">Failed to Log</h3>
                      <p className="text-red-300 mt-2 text-sm">{logError}</p>
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

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto"
            >
              <header className="mb-10">
                <h2 className="text-4xl font-bold tracking-tight mb-2">Settings</h2>
                <p className="text-gray-400 text-lg">Configure your tracking and AI preferences.</p>
              </header>

              <div className="glass-panel p-8">
                <h3 className="text-2xl font-bold text-white mb-6">AI Localization</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // Assuming profile ID 1 is the user's profile
                    await supabase.from('profile').update({ country: profileCountry }).eq('id', 1);
                    alert('Settings Saved!');
                    fetchDashboardData();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2 tracking-wide uppercase">Your Country</label>
                    <div className="relative">
                      <input 
                        list="country-list"
                        className="input-field cursor-text pr-12" 
                        value={profileCountry} 
                        onChange={(e) => setProfileCountry(e.target.value)} 
                        placeholder="Start typing your country..."
                        required
                      />
                      <datalist id="country-list">
                        {allCountries.map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none rotate-90" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      The AI agent uses this to find side income opportunities that specifically accept users from your region.
                    </p>
                  </div>
                  
                  <button type="submit" className="btn-primary w-full py-4 text-lg mt-4">
                    Save Settings
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
