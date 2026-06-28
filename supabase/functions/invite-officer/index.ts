import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 요청 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 발송자 인증 검증
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 발송자가 회장인지 확인 (is_president = true)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('roles(is_president)')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member?.roles?.is_president) {
      return new Response(JSON.stringify({ error: 'Only president can invite officers' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 서비스키로 초대장 발송 (자유 가입이 막혀있어도 발송 가능)
    // NOTE: 운영 환경 배포 시 redirectTo URL을 환경 변수 처리 필요
    const redirectTo = Deno.env.get('SITE_URL') 
      ? `${Deno.env.get('SITE_URL')}/auth/setup-password`
      : 'http://localhost:5173/auth/setup-password'
      
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (error) {
      // 이미 가입된 유저 등의 처리
      throw error
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
