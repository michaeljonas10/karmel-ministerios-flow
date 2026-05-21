export default async function handler(req, res) {
  // Only allow GET from Vercel Cron (verified by CRON_SECRET)
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({}),
  })

  const data = await response.json()
  return res.status(response.ok ? 200 : 500).json(data)
}
