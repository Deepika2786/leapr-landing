const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rlefumadvzpijgxjogoo.supabase.co',
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.redirect('https://leapr.co');
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!profile) {
      return res.redirect('https://leapr.co');
    }

    const name = profile.name || profile.display_name || username;
    const targetRole = profile.target_role || '';
    const currentRole = profile.current_role || '';
    const matchPct = profile.match_percentage || 0;
    const location = profile.location || profile.location_city || '';
    const yearsExp = profile.years_of_experience || '';

    const title = `${name} — Verified Career Profile on Leapr`;
    const description = `${matchPct}% ready for ${targetRole}. Transitioning from ${currentRole}. Skills verified against real job postings. ATS Exempt.`;
    const appUrl = `https://app.leapr.co/card/${username}`;
    const imageUrl = `https://leapr.co/icons/og-card.png`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${appUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Leapr" />

  <!-- LinkedIn specific -->
  <meta name="author" content="${name}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Redirect to app -->
  <meta http-equiv="refresh" content="0;url=${appUrl}" />
  <script>window.location.href = "${appUrl}";</script>
</head>
<body>
  <p>Redirecting to <a href="${appUrl}">${name}'s verified career profile</a>...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(200).send(html);

  } catch (error) {
    console.error('Card error:', error);
    res.redirect('https://leapr.co');
  }
};