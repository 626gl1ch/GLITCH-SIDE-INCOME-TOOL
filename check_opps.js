const url = 'https://clkrxppzrjhelnvcnobh.supabase.co/rest/v1/opportunities?select=name,category';
const key = 'sb_publishable_gfPjmzxqzqbV8NwbDA-CJA_4H14kuFd';
fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
