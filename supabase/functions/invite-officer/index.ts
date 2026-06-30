import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  // 배포 도메인(SITE_URL)으로 CORS 제한 (개발 시 localhost 허용)
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

    // [의견 반영] members 테이블에 초대할 이메일이 등록되어 있는지 사전 검증
    const { data: targetMember, error: targetError } = await supabase
      .from('members')
      .select('id, user_id')
      .eq('email', email)
      .single()

    if (targetError || !targetMember) {
      return new Response(JSON.stringify({ error: '임원 정보가 등록되지 않은 이메일입니다. 먼저 임원을 등록해주세요.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (targetMember.user_id) {
      return new Response(JSON.stringify({ error: '이미 연결된 계정입니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SITE_URL 필수 처리 (로컬이 아닌 클라우드 배포 시 반드시 세팅해야 함)
    const siteUrl = Deno.env.get('SITE_URL')
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: 'Server configuration error: SITE_URL is missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const redirectTo = `${siteUrl}/auth/setup-password`
      
    // 초대장 발송
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (error) {
      // 이미 가입된 유저 등의 처리 (에러 문구 가공)
      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        throw new Error('이미 가입된 이메일입니다')
      }
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
