const SUPABASE_URL  = 'https://rijtxmpkgyfnnijqcnrw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpanR4bXBrZ3lmbm5panFjbnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTY3NTUsImV4cCI6MjA5ODE3Mjc1NX0.nzpDizroeWS63VJI1cL7EVVR-nS1v4Yep2PSwaI5N-c';

function toSlug(str) {
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default async function handler(req, res) {
  const slug = (req.query.product || '').trim();
  let product = null;

  if (slug) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/products?published=eq.true&sold=eq.false`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
      );
      const list = await r.json();
      product = list.find(p => toSlug(p.name) === slug);
    } catch(e) {}
  }

  // If no product found, redirect home
  if (!product) {
    res.redirect(302, 'https://redhotdealz.com');
    return;
  }

  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /facebook|instagram|twitter|whatsapp|telegram|linkedin|slack|pinterest|discord|googlebot|bingbot|crawler|spider|preview|bot/i.test(ua);

  // Real user — send them straight to the product
  if (!isBot) {
    res.redirect(302, `https://redhotdealz.com/#product/${slug}`);
    return;
  }

  // Bot / crawler — return HTML with correct OG tags using product photo
  const title = esc(product.name) + ' — RedHotDealz';
  const price = Number(product.price).toFixed(2);
  const retail = product.retail_price ? Number(product.retail_price).toFixed(2) : null;
  const desc = retail
    ? `Was $${retail} → Now only $${price}. Brand new, authentic. Shop at RedHotDealz.com`
    : `Only $${price}. Brand new, authentic. Shop at RedHotDealz.com`;
  const image = (product.media_urls && product.media_urls[0]) || 'https://redhotdealz.com/og-image.svg';
  const pageUrl = `https://redhotdealz.com/api/og?product=${slug}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.status(200).send(`<!DOCTYPE html>
<html prefix="og: https://ogp.me/ns#">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="${esc(product.name)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:site_name" content="RedHotDealz">
<meta property="product:price:amount" content="${price}">
<meta property="product:price:currency" content="USD">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
</head>
<body>
<h1>${title}</h1>
<img src="${esc(image)}" alt="${esc(product.name)}" style="max-width:400px">
<p>${esc(desc)}</p>
<a href="https://redhotdealz.com/#product/${slug}">View on RedHotDealz</a>
</body>
</html>`);
}
