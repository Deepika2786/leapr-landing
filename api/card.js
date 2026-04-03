module.exports = async function handler(req, res) {
  const { u: username } = req.query;

  if (!username) return res.redirect(301, 'https://leapr.co');

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/user_profiles?username=eq.${username}&select=full_name,target_role,match_percentage,card_image_url&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const rows = await response.json();
    const user = rows?.[0];

    if (!user) return res.redirect(301, 'https://leapr.co');

    const ua = req.headers['user-agent'] || '';
    const isBot = /LinkedInBot|facebookexternalhit|Twitterbot|WhatsApp/i.test(ua);
    const profileUrl = `https://app.leapr.co/@${username}`;
    const imageUrl = user.card_image_url || 'https://leapr.co/icons/og-card.png';
    const title = `${user.full_name} → ${user.target_role} | Leapr`;
    const description = user.match_percentage
      ? `${user.match_percentage}% ready for ${user.target_role}. Skills verified vs real job postings. ATS Exempt.`
      : `Aspiring ${user.target_role}. Verified career profile on Leapr.`;

    if (isBot) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="https://leapr.co/card?u=${username}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Leapr" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
  </head>
  <body>Redirecting...</body>
</html>`);
    } else {
      return res.redirect(301, profileUrl);
    }
  } catch (err) {
    return res.status(500).send(`Error: ${err.message}`);
  }
}