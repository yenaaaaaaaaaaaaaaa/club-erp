import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const envUrl = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim()
const envKey = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_ANON_KEY')).split('=')[1].trim()

const supabase = createClient(envUrl, envKey)

async function testLogin() {
  console.log('Trying to login with yeana@naver.com / 99999999...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'yeana@naver.com',
    password: '99999999',
  })
  if (error) {
    console.error('Login failed:', error.message)
  } else {
    console.log('Login successful! User ID:', data.user.id)
  }
}
testLogin()
