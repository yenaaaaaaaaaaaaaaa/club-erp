import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  const allowedOrigin = Deno.env.get('SITE_URL') || 'http://localhost:5173'

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 회장만 삭제 가능
    const { data: caller, error: callerError } = await supabase
      .from('members')
      .select('roles(is_president)')
      .eq('user_id', user.id)
      .single()

    if (callerError || !caller?.roles?.is_president) {
      return new Response(JSON.stringify({ error: 'Only president can delete officers' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { memberId } = await req.json()
    if (!memberId) {
      return new Response(JSON.stringify({ error: 'memberId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // members 테이블에서 조회
    const { data: target, error: targetError } = await supabase
      .from('members')
      .select('id, user_id')
      .eq('id', memberId)
      .single()

    if (targetError || !target) {
      return new Response(JSON.stringify({ error: '존재하지 않는 임원입니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // auth 계정이 있으면 먼저 삭제
    if (target.user_id) {
      await supabase.auth.admin.deleteUser(target.user_id)
    }

    // members 테이블에서 삭제
    await supabase.from('members').delete().eq('id', memberId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
