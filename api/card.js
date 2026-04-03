import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const { u: username } = req.query;

  if (!username) {
    return res.redirect(301, 'https://leapr.co');
  }

  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('card_image_url, full_name, target_role, match_percentage')
    .eq('username', username)
    .single();

  if (error || !user) {
    return res.redirect(301, 'https://leapr.co');
  }

  const ua = req.headers['user-agent'] || '';
  const isBot = /LinkedInBot|facebookexternalhit|Twitterbot|WhatsApp/i.test(ua);
  const profileUrl = `https://app.leapr.co/@${username}`;
  const imageUrl = user.card_image_url || 'https://leapr.co/icons/og-card.png';
  const title = `${user.full_name} → ${user.target_role} | Leapr`;
  const description = user.match_percentage
    ? `${user.match_percentage}% ready for ${user.target_role}. Skills verified against real job postings. ATS Exempt.`
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
  <body>Redirecting to ${user.full_name}'s verified career profile...</body>
</html>`);
  } else {
    return res.redirect(301, profileUrl);
  }
}