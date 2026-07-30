export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

const DISCOVERY_SYSTEM_PROMPT = `
You are a research assistant finding legitimate online income opportunities
for a Nigeria-based user. Search the web for survey sites, GPT (get-paid-to)
platforms, affiliate programs, and microtask/testing platforms that currently
accept Nigerian users.

For each one, verify before including it:
1. It has a real track record of paying out (not just claiming to).
2. It does not require any upfront payment to join.
3. It lists at least one payout method usable from Nigeria (Payoneer, cryptocurrency, direct bank transfer, or gift card).

Return ONLY a JSON array, no other text, no markdown fences, in this exact shape:
[
  {
    "name": string,
    "category": "surveys" | "watch_to_earn" | "microtasks" | "website_testing" | "affiliate" | "other",
    "payout_methods": string[],
    "payout_threshold_usd": number | null,
    "signup_url": string,
    "red_flags": string[]
  }
]

Omit anything you are not reasonably confident is currently active and Nigeria-eligible. An empty array is a valid, correct response if nothing new qualifies.
`;

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
    const url = new URL(request.url);
    if (url.pathname === '/trigger-discovery') {
      ctx.waitUntil(runDiscovery(env));
      return new Response("Discovery triggered", { status: 200 });
    }
    
    if (url.pathname === '/setup-assistant' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const result = await runSetupAssistant(env, body.opportunityId);
        return new Response(JSON.stringify({ result }), { status: 200, headers: {'Content-Type': 'application/json'} });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
      }
    }
    
    return new Response("Not found", { status: 404 });
  }
};

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
1. A 3-bullet summary of likely eligibility/KYC requirements for a Nigeria-based signup.
2. Draft profile text (display name, short bio) based on this stored profile: ${JSON.stringify(profile)} — for the human to copy in, not to submit.
3. Any known submission quirks (e.g. "requires phone verification", "flags VPN usage", "asks for a referral code").

Do not attempt to access or submit the signup form. Output only the summary and draft text for human review.`;

  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    })
  });

  const geminiData = await geminiRes.json() as any;
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No insights found.";
  
  // 4. Attach draft to a new account row
  const accountBody = {
    opportunity_id: opp.id,
    status: 'pending_setup',
    notes: text
  };
  await fetch(`${env.SUPABASE_URL}/rest/v1/accounts`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(accountBody)
  });

  return text;
}

async function runDiscovery(env: Env) {
  // 1. Get Profile
  const profileRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profile?select=*&limit=1`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });
  const profiles = await profileRes.json() as any[];
  if (!profiles || profiles.length === 0) {
    throw new Error("No profile found");
  }
  const profile = profiles[0];

  // 2. Call Gemini API
  const userPrompt = `Find new or currently active opportunities in these categories: ${profile.categories.join(', ')}. Prioritize platforms with payout methods in ${profile.preferred_payout_methods.join(', ')} and a payout threshold at or below $${profile.min_acceptable_payout_usd * 5}.`;
  
  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: DISCOVERY_SYSTEM_PROMPT }]
      },
      contents: [{
        role: "user",
        parts: [{ text: userPrompt }]
      }],
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.3 }
        }
      }]
    })
  });

  const geminiData = await geminiRes.json() as any;
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

  // 3. Upsert into Supabase
  const newItems = [];
  for (const opp of opportunities) {
    const upsertBody = {
      name: opp.name,
      category: opp.category,
      payout_methods: opp.payout_methods,
      payout_threshold_usd: opp.payout_threshold_usd,
      signup_url: opp.signup_url,
      red_flags: opp.red_flags,
      status: 'new',
      last_seen_at: new Date().toISOString()
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
  if (newItems.length > 0 && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    let msg = `🔍 *New Opportunities Discovered!*\n\n`;
    for (const item of newItems) {
      msg += `*${item.name}* (${item.category})\n`;
      msg += `Payout: ${item.payout_methods.join(', ')} (Threshold: $${item.payout_threshold_usd})\n`;
      if (item.red_flags && item.red_flags.length > 0) {
        msg += `🚩 Flags: ${item.red_flags.join(', ')}\n`;
      }
      msg += `[Signup Link](${item.signup_url})\n\n`;
    }
    
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: "Markdown"
      })
    });
  }
}
