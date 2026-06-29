const SUPABASE_URL  = 'https://rijtxmpkgyfnnijqcnrw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpanR4bXBrZ3lmbm5panFjbnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTY3NTUsImV4cCI6MjA5ODE3Mjc1NX0.nzpDizroeWS63VJI1cL7EVVR-nS1v4Yep2PSwaI5N-c';

function toSlug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default async function handler(req, res) {
  const slug = req.query.product || '';
  let product = null;

  if (slug) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/products?published=eq.true`, {
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` }
      });
      const products = await r.json();
      product = products.find(p => toSlug(p.name) === slug);
    } catch(e) {}
  }

  const title       = product ? escapeHtml(product.name) + ' — RedHotDealz' : 'RedHotDealz — Brand New. Up to 50% Off.';
  const description = product
    ? `Buy ${escapeHtml(product.name)} for only $${Number(product.price).toFixed(2)}. Brand new, authentic product. Shop at RedHotDealz.com`
    : 'Brand new overstock products at up to 50% off retail. 100% authentic. Secure checkout. Fast USPS shipping.';
  const image = product && product.media_urls && product.media_urls[0]
    ? product.media_urls[0]
    : 'https://redhotdealz.com/og-image.svg';
  const pageUrl = product ? `https://redhotdealz.com/api/og?product=${slug}` : 'https://redhotdealz.com';

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /facebook|twitter|linkedin|whatsapp|slack|telegram|pinterest|google|bing|crawler|spider|bot/i.test(userAgent);

  if (!isBot && product) {
    res.redirect(302, `https://redhotdealz.com/#product/${slug}`);
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="${product ? 'product' : 'website'}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="RedHotDealz">
  ${product ? `<meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="USD">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <p>Redirecting... <a href="https://redhotdealz.com/#product/${slug}">Click here if not redirected</a></p>
  <script>window.location = "https://redhotdealz.com/#product/${slug}";</script>
</body>
</html>`);
}
