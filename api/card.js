const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  const username = req.query.u;

  if (!username) {
    return res.redirect(302, 'https://leapr.co');
  }

  let name = 'A Career Transitioner';
  let targetRole = 'their target role';
  let matchPercentage = null;
  let currentRole = null;
  let cardImageUrl = 'https://leapr.co/icons/og-card.png';

  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('full_name, target_role, current_role, match_percentage, card_image_url')
      .eq('username', username)
      .single();

    if (data) {
      name = data.full_name || name;
      targetRole = data.target_role || targetRole;
      currentRole = data.current_role;
      matchPercentage = data.match_percentage;
      cardImageUrl = data.card_image_url;
    }
  } catch (e) {
    // fallback to defaults
  }

  const title = `${name} → ${targetRole} | Leapr`;
  const description = matchPercentage
    ? `${matchPercentage}% ready for ${targetRole}. Skills verified against real job postings. ATS Exempt.`
    : `${currentRole ? `Transitioning from ${currentRole} to ${targetRole}.` : `Aspiring ${targetRole}.`} Verified career profile on Leapr.`;

  const escaped = {
    title: title.replace(/"/g, '&quot;'),
    description: description.replace(/"/g, '&quot;'),
    username: username.replace(/[^a-zA-Z0-9_.-]/g, '')
  };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

  return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escaped.title}</title>
  <meta name="description" content="${escaped.description}" />
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${escaped.title}" />
  <meta property="og:description" content="${escaped.description}" />
  <meta property="og:url" content="https://leapr.co/card?u=${escaped.username}" />
  <meta property="og:image" content="${cardImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Leapr" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escaped.title}" />
  <meta name="twitter:description" content="${escaped.description}" />
  <meta name="twitter:image" content="https://leapr.co/icons/og-card.png" />
  <script>
    window.location.href = 'https://app.leapr.co/@${escaped.username}';
  </script>
</head>
<body>
  <p>Redirecting to ${escaped.name}'s verified career profile...</p>
  <p><a href="https://app.leapr.co/@${escaped.username}">Click here if not redirected</a></p>
</body>
</html>`);
};