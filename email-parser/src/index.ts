export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    // Basic Cloudflare Email Worker handler
    const rawEmail = await new Response(message.raw).text();
    
    // Parse sender
    const from = message.from || "";
    
    // Quick regex to extract amounts like $5.00 or 5.00 USD
    const amountMatch = rawEmail.match(/\$\s*(\d+\.\d{2})|(\d+\.\d{2})\s*USD/i);
    let amount = 0;
    if (amountMatch) {
      amount = parseFloat(amountMatch[1] || amountMatch[2]);
    }

    if (amount > 0) {
      // 1. Identify platform from sender domain (e.g., @ysense.com)
      const domainMatch = from.match(/@([a-zA-Z0-9.-]+)/);
      const domain = domainMatch ? domainMatch[1] : '';

      // 2. Fetch active accounts
      const accountsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/accounts?status=eq.active&select=id,opportunities(name)`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
      });
      const accounts = await accountsRes.json() as any[];

      // Try to match the domain to a known opportunity name
      let accountId = null;
      for (const acc of accounts) {
        if (acc.opportunities?.name?.toLowerCase().replace(/\s/g, '') === domain.split('.')[0].toLowerCase()) {
          accountId = acc.id;
          break;
        }
      }

      if (accountId) {
        // 3. Log earnings
        await fetch(`${env.SUPABASE_URL}/rest/v1/earnings`, {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            account_id: accountId,
            amount,
            currency: 'USD',
            status: 'paid',
            source: 'email_parsed',
            earned_at: new Date().toISOString()
          })
        });
      }
    }
  }
};
