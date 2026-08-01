export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

const DISCOVERY_SYSTEM_PROMPT = `
You are a research assistant finding legitimate, low-competition, "hidden gem" online income opportunities
for a user based in {COUNTRY}. Search the web for survey sites, GPT (get-paid-to)
platforms, affiliate programs, and microtask/testing platforms that CURRENTLY
accept users from {COUNTRY} and have HIGH task availability.

CRITICAL INSTRUCTION: DO NOT recommend extremely mainstream, oversaturated, or highly restrictive platforms.
Specifically, completely IGNORE the following and anything similar to them (they waste time or are too saturated):
- Amazon Associates, Fiverr, Upwork, Freelancer
- Remotasks, Outlier, Scale AI, DataAnnotation.tech
- UserTesting, Tester Work, Trymata (TryMyUI), Userlytics
- Swagbucks, InboxDollars, ySense, Freecash, PrizeRebel, MyPoints
- Appen, Clickworker, Toloka, Telus International, OneForma, Microworkers
- Rev, TranscribeMe, GoTranscript
- Prolific (waitlists are too long)

FEW-SHOT EXAMPLE:
If a search surfaces "Toloka" as well-reviewed for {COUNTRY}.
Correct response: Skip it completely. It is on the ignore list, regardless of how legitimate it appears in search results.

For each platform you DO recommend, verify:
1. It is a lesser-known but highly legitimate platform with a real track record of paying out.
2. It actively supports and has decent task allocation for users in {COUNTRY}.
3. The payout threshold is realistically achievable (e.g. $5 - $20).

Format your response exactly as a JSON array of objects. YOU MUST use REAL data, NEVER use placeholder strings like "https://...":
[
  {
    "name": "<Real Platform Name>",
    "category": "<Must be one of: surveys, watch_to_earn, microtasks, website_testing, affiliate, other>",
    "payout_methods": ["<Real Payout Method 1>", "<Real Payout Method 2>"],
    "payout_threshold_usd": <Real Number>,
    "signup_url": "<Real, Valid HTTPS URL to the platform>",
    "source_url": "<The exact URL you used to verify the threshold>",
    "red_flags": ["<Real warning or downside 1>", "<Real warning or downside 2>"]
  }
]

Omit anything you are not reasonably confident is currently active, eligible for {COUNTRY}, and unsaturated. An empty array is a valid, correct response if nothing new qualifies.
`;

const BLACKLIST = [
  "amazon associates", "fiverr", "upwork", "freelancer",
  "remotasks", "outlier", "scale ai", "dataannotation", "usertesting",
  "tester work", "trymata", "trymyui", "userlytics", "swagbucks",
  "inboxdollars", "ysense", "freecash", "prizerebel", "mypoints",
  "appen", "clickworker", "toloka", "telus", "oneforma", "microworkers",
  "rev", "transcribeme", "gotranscript", "prolific"
];

const isBlacklisted = (name: string) => BLACKLIST.some(b => name.toLowerCase().includes(b));

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    try {
      await runDiscovery(env);
    } catch (e: any) {
      console.error("Discovery error:", e.message);
      // Optional: send error to telegram
    }
  },
  
  // Also expose as an endpoint so we can manually trigger it during testing,
  // and handle Setup Assistant tasks.
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname === '/trigger-discovery') {
      try {
        const result = await runDiscovery(env);
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (url.pathname === '/setup-assistant' && request.method === 'POST') {
      try {
        const { opportunityId } = await request.json() as any;
        if (!opportunityId) {
          return new Response("Missing opportunityId", { status: 400, headers: corsHeaders });
        }
        const result = await runSetupAssistant(env, opportunityId);
        return new Response(JSON.stringify({ result }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    
    return new Response("Not found", { status: 404 });
  }
};

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

async function fetchFromGeminiWithFallback(env: Env, requestBody: any): Promise<any> {
  let lastError = null;
  
  for (const model of GEMINI_MODELS) {
    try {
      // Add Google Search Grounding to all requests
      const bodyWithTools = {
        ...requestBody,
        tools: [{ googleSearch: {} }]
      };
      
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithTools)
      });
      
      if (geminiRes.ok) {
        return await geminiRes.json();
      }
      
      const errorText = await geminiRes.text();
      // If rate limited or service unavailable, try the next model
      if (geminiRes.status === 429 || geminiRes.status === 503) {
        console.warn(`Model ${model} unavailable (status ${geminiRes.status}). Falling back to next...`);
        lastError = new Error(`Model ${model} failed: ${errorText}`);
        continue;
      }
      
      // If it's a 4xx error (like bad request), failing over might not help, but we throw
      throw new Error(`Gemini API error on ${model}: ${errorText}`);
      
    } catch (err: any) {
      console.warn(`Error connecting to model ${model}: ${err.message}`);
      lastError = err;
    }
  }
  
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
}

async function runSetupAssistant(env: Env, opportunityId: string) {
  // 1. Get Opportunity
  const oppRes = await fetch(`${env.SUPABASE_URL}/rest/v1/opportunities?id=eq.${opportunityId}&select=*`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
  });
  const opps = await oppRes.json() as any[];
  if (!opps || opps.length === 0) throw new Error("Opportunity not found");
  const opp = opps[0];

  // 2. Get Profile
  const profileRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profile?select=*&limit=1`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
  });
  const profiles = await profileRes.json() as any[];
  const profile = profiles[0];

  // 3. Call Gemini API
  const prompt = `Given this opportunity:
name: ${opp.name}
category: ${opp.category}
payout_methods: ${opp.payout_methods.join(', ')}
signup_url: ${opp.signup_url}

Produce:
1. A 3-bullet summary of REAL, verified eligibility/KYC requirements for a user based in their country.
2. Draft profile text (display name, short bio) based on this stored profile: ${JSON.stringify(profile)} — for the human to copy in, not to submit.
3. Any known submission quirks (e.g. "requires phone verification", "flags VPN usage", "asks for a referral code").
4. source_url: The exact URL where you verified the minimum payout threshold.

CRITICAL ANTI-HALLUCINATION RULES:
- Do NOT guess, estimate, or hallucinate the minimum withdrawal threshold. If you don't know the exact current threshold, say "Threshold unknown".
- Do NOT make up fake KYC or VPN rules that sound plausible. Only list rules if you have verified them.
- Do NOT use dummy data or placeholder strings.
- Base your insights strictly on real-world facts.

Do not attempt to access or submit the signup form. Output only the summary and draft text for human review.`;

  const geminiData = await fetchFromGeminiWithFallback(env, {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });

  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No insights found.";
  
  // Enforce Citations structurally
  const groundingChunks = geminiData.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingUrls = groundingChunks.map((chunk: any) => chunk.web?.uri || chunk.retrievedContext?.uri).filter(Boolean);
  
  let setupNotes = rawText;
  
  // Extract source_url if provided by model
  const sourceUrlMatch = rawText.match(/source_url:\s*(https?:\/\/[^\s]+)/i);
  let verifiedSource = null;
  if (sourceUrlMatch) {
    const candidateUrl = sourceUrlMatch[1];
    // Check if the URL exists in the actual grounding metadata provided by Google Search
    const isGrounded = groundingUrls.some((url: string) => url.includes(candidateUrl) || candidateUrl.includes(url));
    if (isGrounded) {
      verifiedSource = candidateUrl;
    } else {
      setupNotes += "\n\nWARNING: The AI provided a source URL that could not be structurally verified against search grounding metadata. Proceed with caution.";
    }
  }

  // Fallback if no source is grounded
  if (!verifiedSource && rawText.includes("Threshold:")) {
     setupNotes += "\n\nNote: Minimum threshold could not be definitively verified. Treat as 'Threshold unknown' until checked on the official site.";
  }
  
  // 4. Attach draft to a new account row
  const { error: insertError } = await fetch(`${env.SUPABASE_URL}/rest/v1/accounts`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunity_id: opportunityId, notes: setupNotes, status: 'pending_setup' })
  }).then(r => r.json()) as any;

  if (insertError) throw new Error(insertError.message);

  return setupNotes;
}

async function runDiscovery(env: Env) {
  // 1. Fetch user profile to get country and preferences
  const profileRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profile?select=*&limit=1`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
  });
  const profiles = await profileRes.json() as any[];
  const profile = profiles[0] || {};
  
  const country = profile.country || 'Nigeria';
  const systemPrompt = DISCOVERY_SYSTEM_PROMPT.replace(/\{COUNTRY\}/g, country);

  // 2. Fetch existing opportunities so AI doesn't duplicate
  const existingRes = await fetch(`${env.SUPABASE_URL}/rest/v1/opportunities?select=name,category`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
  });
  const existing = await existingRes.json() as any[];
  const ignoreNames = existing.map(e => e.name).join(', ');

  const userPrompt = `
Existing opportunities we already know about (DO NOT RECOMMEND THESE): ${ignoreNames || 'None'}
Find 2-3 NEW, unsaturated "hidden gem" platforms that are highly rated, have good task allocations, and are working in ${country} right now. Do not include major saturated platforms.
  `;

  // 3. Call Gemini
  const geminiData = await fetchFromGeminiWithFallback(env, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: "user",
      parts: [{ text: userPrompt }]
    }]
  });
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const jsonStr = text.replace(/```json|```/g, "").trim();
  
  let opportunities: any[] = [];
  try {
    opportunities = JSON.parse(jsonStr);
  } catch(e) {
    console.error("Failed to parse Gemini output:", jsonStr);
    return;
  }
  
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    console.log("No new opportunities found.");
    return;
  }

  // Filter against blacklist structurally
  const cleanOpportunities = opportunities.filter(opp => {
    if (isBlacklisted(opp.name)) {
      console.warn(`Dropped blacklisted opportunity: \${opp.name}`);
      return false;
    }
    return true;
  });

  if (cleanOpportunities.length === 0) {
    console.log("All discovered opportunities were blacklisted.");
    return;
  }

  // 3. Upsert into Supabase
  const newItems = [];
  for (const opp of cleanOpportunities) {
    const upsertBody = {
      name: opp.name,
      category: opp.category,
      payout_methods: opp.payout_methods,
      payout_threshold_usd: opp.payout_threshold_usd,
      signup_url: opp.signup_url,
      source_url: opp.source_url || null,
      red_flags: opp.red_flags,
      status: 'new',
      last_seen_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString()
    };
    
    // We use ON CONFLICT to just update last_seen_at if it already exists
    const upsertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/opportunities?on_conflict=name,category`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([upsertBody])
    });
    
    if (upsertRes.ok) {
      newItems.push(opp);
    } else {
      const err = await upsertRes.text();
      console.error("Upsert error:", err);
    }
  }

  // 4. Send Telegram Digest
  // 4. Send Telegram summary if enabled
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && newItems.length > 0) {
    const lines = newItems.map(i => `- ${i.name} (${i.category})`);
    const msg = `Found ${newItems.length} new side-income opportunities:\n${lines.join('\n')}`;
    
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: msg
      })
    }).catch(console.error);
  }
  
  return newItems;
}
