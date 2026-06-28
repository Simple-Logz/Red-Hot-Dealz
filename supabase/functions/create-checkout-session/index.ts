import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// USPS shipping rates by weight tier (in cents)
const SHIPPING_RATES: Record<string, { ground: number; priority: number; express: number }> = {
  'under1': { ground: 499,   priority: 999,   express: 2999 },
  '1to3':   { ground: 899,   priority: 1499,  express: 3999 },
  '3to10':  { ground: 1499,  priority: 2499,  express: 5999 },
  '10to25': { ground: 2499,  priority: 4499,  express: 8999 },
  '25to70': { ground: 4999,  priority: 7999,  express: 14999 },
}

const WEIGHT_LABELS: Record<string, string> = {
  'under1': 'Under 1 lb',
  '1to3':   '1-3 lbs',
  '3to10':  '3-10 lbs',
  '10to25': '10-25 lbs',
  '25to70': '25-70 lbs',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, successUrl, cancelUrl } = await req.json()

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('Stripe key not configured')

    // Determine heaviest item in cart to set shipping rates
    const weightOrder = ['under1', '1to3', '3to10', '10to25', '25to70']
    let heaviestWeight = 'under1'
    for (const item of items) {
      const w = item.weight || 'under1'
      if (weightOrder.indexOf(w) > weightOrder.indexOf(heaviestWeight)) {
        heaviestWeight = w
      }
    }

    const rates = SHIPPING_RATES[heaviestWeight]
    const weightLabel = WEIGHT_LABELS[heaviestWeight]

    const params = new URLSearchParams()
    params.append('payment_method_types[]', 'card')
    params.append('payment_method_types[]', 'link')
    params.append('mode', 'payment')
    params.append('success_url', successUrl)
    params.append('cancel_url', cancelUrl)

    // Collect shipping address
    params.append('shipping_address_collection[allowed_countries][]', 'US')
    params.append('shipping_address_collection[allowed_countries][]', 'CA')
    params.append('shipping_address_collection[allowed_countries][]', 'GB')
    params.append('shipping_address_collection[allowed_countries][]', 'AU')
    params.append('shipping_address_collection[allowed_countries][]', 'NG')

    // USPS Ground Advantage
    params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount')
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(rates.ground))
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd')
    params.append('shipping_options[0][shipping_rate_data][display_name]', `USPS Ground Advantage (${weightLabel}) — 3-5 days`)
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '3')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '5')

    // USPS Priority Mail
    params.append('shipping_options[1][shipping_rate_data][type]', 'fixed_amount')
    params.append('shipping_options[1][shipping_rate_data][fixed_amount][amount]', String(rates.priority))
    params.append('shipping_options[1][shipping_rate_data][fixed_amount][currency]', 'usd')
    params.append('shipping_options[1][shipping_rate_data][display_name]', `USPS Priority Mail (${weightLabel}) — 1-3 days`)
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][minimum][value]', '1')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][maximum][value]', '3')

    // USPS Priority Mail Express
    params.append('shipping_options[2][shipping_rate_data][type]', 'fixed_amount')
    params.append('shipping_options[2][shipping_rate_data][fixed_amount][amount]', String(rates.express))
    params.append('shipping_options[2][shipping_rate_data][fixed_amount][currency]', 'usd')
    params.append('shipping_options[2][shipping_rate_data][display_name]', `USPS Priority Express (${weightLabel}) — 1-2 days`)
    params.append('shipping_options[2][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day')
    params.append('shipping_options[2][shipping_rate_data][delivery_estimate][minimum][value]', '1')
    params.append('shipping_options[2][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day')
    params.append('shipping_options[2][shipping_rate_data][delivery_estimate][maximum][value]', '2')

    // Line items
    items.forEach((item: any, i: number) => {
      params.append(`line_items[${i}][price_data][currency]`, 'usd')
      params.append(`line_items[${i}][price_data][product_data][name]`, item.name)
      params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.price * 100)))
      params.append(`line_items[${i}][quantity]`, String(item.qty))
    })

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    })

    const session = await response.json()
    if (session.error) throw new Error(session.error.message)

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
