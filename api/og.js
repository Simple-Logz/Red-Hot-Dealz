const SUPABASE_URL  = 'https://rijtxmpkgyfnnijqcnrw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpanR4bXBrZ3lmbm5panFjbnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTY3NTUsImV4cCI6MjA5ODE3Mjc1NX0.nzpDizroeWS63VJI1cL7EVVR-nS1v4Yep2PSwaI5N-c';

function slug(str) {
  return (str||'').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,80);
}
function e(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

module.exports = async (req, res) => {
  const product_slug = (req.query.p || '').trim();

  if (!product_slug) {
    return res.redirect(302, 'https://redhotdealz.com');
  }

  let product = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`
      }
    });
    const list = await r.json();
    product = list.find(p => slug(p.name) === product_slug);
  } catch(err) {
    console.error(err);
  }

  if (!product) {
    return res.redirect(302, 'https://redhotdealz.com');
  }

  const ua = req.headers['user-agent'] || '';
  const isBot = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegram|slackbot|discordbot|pinterest|googlebot|bingbot/i.test(ua);

  if (!isBot) {
    return res.redirect(302, `https://redhotdealz.com/#product/${product_slug}`);
  }

  const title = e(product.name) + ' — RedHotDealz';
  const price = Number(product.price).toFixed(2);
  const oldPrice = product.retail_price ? `Was $${Number(product.retail_price).toFixed(2)} → ` : '';
  const desc = e(`${oldPrice}Now only $${price}. Brand new. Fast USPS shipping. Shop RedHotDealz.com`);
  const img = e((product.media_urls && product.media_urls[0]) || '');
  const url = `https://redhotdealz.com/api/og?p=${product_slug}`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.send(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="800">
<meta property="og:url" content="${url}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="RedHotDealz">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${img}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
</head><body>
<script>window.location="https://redhotdealz.com/#product/${product_slug}";</script>
<a href="https://redhotdealz.com/#product/${product_slug}">${title}</a>
</body></html>`);
};
