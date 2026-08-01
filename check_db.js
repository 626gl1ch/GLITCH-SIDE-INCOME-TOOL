const url = 'https://clkrxppzrjhelnvcnobh.supabase.co/rest/v1/profile?select=*';
const key = 'sb_publishable_gfPjmzxqzqbV8NwbDA-CJA_4H14kuFd';
fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  .then(r => {
    if (!r.ok) {
       console.log('Error fetching:', r.status);
       return r.text().then(console.log);
    }
    return r.json().then(console.log);
  })
  .catch(console.error);
