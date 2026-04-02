export default async function handler(req, res) {
  const username = req.query.username;

  if (!username) {
    return res.redirect('https://leapr.co');
  }

  try {
    const response = await fetch(
      `https://rlefumadvzpijgxjogoo.supabase.co/rest/v1/user_profiles?username=eq.${username}&select=name,display_name,target_role,current_role,match_percentage`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        }
      }
    );

    const data = await response.json();
    const profile = data?.[0];

    if (!profile) {
      return res.redirect('https://leapr.co');
    }

    const name = profile.name || profile.display_name || username;
    const targetRole = profile.target_role || '';
    const currentRole = profile.current_role || '';
    const matchPct = profile.match_percentage || 0;
    const appUrl = `https://app.leapr.co/card/${username}`;
    const imageUrl = `https://leapr.co/icons/og-card.png`;
    const title = `${name} — ${matchPct}% Ready for ${targetRole} | Leapr`;
    const description = `Transitioning from ${currentRole} → ${targetRole}. Skills verified against real job postings. ATS Exempt. See full verified profile on Leapr.`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${appUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Leapr" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=${appUrl}" />
  <script>window.location.href = "${appUrl}";</script>
</head>
<body>
  <p>Redirecting to <a href="${appUrl}">${name}'s verified career profile on Leapr</a>...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Card error:', error);
    return res.redirect('https://leapr.co');
  }
}