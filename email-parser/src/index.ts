export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    try {
      const rawEmail = await new Response(message.raw).text();
      const from = message.from || "";
      
      const amountMatch = rawEmail.match(/\$\s*(\d+\.\d{2})|(\d+\.\d{2})\s*USD/i);
      let amount = 0;
      if (amountMatch) {
        amount = parseFloat(amountMatch[1] || amountMatch[2]);
      }

      if (amount > 0) {
        const domainMatch = from.match(/@([a-zA-Z0-9.-]+)/);
        const domain = domainMatch ? domainMatch[1] : '';

        const accountsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/accounts?status=eq.active&select=id,opportunities(name)`, {
          headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
        });
        
        if (!accountsRes.ok) {
          throw new Error(`Supabase API error: ${await accountsRes.text()}`);
        }
        
        const accounts = await accountsRes.json() as any[];
        let accountId = null;
        for (const acc of accounts) {
          if (acc.opportunities?.name?.toLowerCase().replace(/\s/g, '') === domain.split('.')[0].toLowerCase()) {
            accountId = acc.id;
            break;
          }
        }

        if (accountId) {
          const isOutlier = amount < 0.01 || amount > 500.00;
          const payoutStatus = isOutlier ? 'needs_review' : 'paid';

          const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/earnings`, {
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
              status: payoutStatus,
              source: 'email_parsed',
              earned_at: new Date().toISOString()
            })
          });
          
          if (!insertRes.ok) {
            throw new Error(`Failed to insert earnings: ${await insertRes.text()}`);
          }
        }
      } else {
        console.log("Parsed amount was 0, ignoring.");
      }
    } catch (err: any) {
      console.error("Email processing failed:", err.message);
      // Let the email fail gracefully so it can be retried or logged
      message.setReject(`Parser error: ${err.message}`);
    }
  }
};
