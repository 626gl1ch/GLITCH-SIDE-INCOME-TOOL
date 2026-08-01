const url = 'https://clkrxppzrjhelnvcnobh.supabase.co/rest/v1/profile';
const key = 'sb_publishable_gfPjmzxqzqbV8NwbDA-CJA_4H14kuFd';

const profileData = {
  daily_time_budget_minutes: 60,
  min_acceptable_payout_usd: 5,
  preferred_payout_methods: ['crypto', 'payoneer', 'bank_transfer'],
  categories: ['surveys', 'microtasks', 'affiliate']
};

fetch(url, { 
  method: 'POST',
  headers: { 
    apikey: key, 
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(profileData)
})
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
