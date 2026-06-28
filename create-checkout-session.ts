import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, successUrl, cancelUrl } = await req.json()

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('Stripe key not configured')

    // Build form body for Stripe API
    const params = new URLSearchParams()

    // Payment methods — card, Apple Pay, Google Pay (automatic)
    params.append('payment_method_types[]', 'card')
    params.append('payment_method_types[]', 'link')

    params.append('mode', 'payment')
    params.append('success_url', successUrl)
    params.append('cancel_url', cancelUrl)

    // Collect shipping address from customer
    params.append('shipping_address_collection[allowed_countries][]', 'US')
    params.append('shipping_address_collection[allowed_countries][]', 'CA')
    params.append('shipping_address_collection[allowed_countries][]', 'GB')
    params.append('shipping_address_collection[allowed_countries][]', 'AU')
    params.append('shipping_address_collection[allowed_countries][]', 'NG')

    // USPS-based shipping options
    // USPS First Class: under 1lb items, 1-5 days
    params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount')
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '599')
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd')
    params.append('shipping_options[0][shipping_rate_data][display_name]', 'USPS First Class (3-5 business days)')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '3')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day')
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '5')

    // USPS Priority Mail: 1-3 days
    params.append('shipping_options[1][shipping_rate_data][type]', 'fixed_amount')
    params.append('shipping_options[1][shipping_rate_data][fixed_amount][amount]', '1299')
    params.append('shipping_options[1][shipping_rate_data][fixed_amount][currency]', 'usd')
    params.append('shipping_options[1][shipping_rate_data][display_name]', 'USPS Priority Mail (1-3 business days)')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][minimum][value]', '1')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day')
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][maximum][value]', '3')

    // USPS Priority Mail Express: overnight
    params.append('shipping_options[2][shipping_rate_data][type]', 'fixed_amount')
    params.append('shipping_options[2][shipping_rate_data][fixed_amount][amount]', '2999')
    params.append('shipping_options[2][shipping_rate_data][fixed_amount][currency]', 'usd')
    params.append('shipping_options[2][shipping_rate_data][display_name]', 'USPS Priority Mail Express (1-2 days)')
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

    // Create Stripe Checkout Session
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
