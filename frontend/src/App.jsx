import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import router from '@/router'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

export default function App() {
  const { setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        clearAuth()
        return
      }

      const { data: member } = await supabase
        .from('members')
        .select('*, roles(*)')
        .eq('user_id', session.user.id)
        .single()

      setAuth({
        user: session.user,
        member: member ?? null,
        role: member?.roles ?? null,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          clearAuth()
          return
        }

        const { data: member } = await supabase
          .from('members')
          .select('*, roles(*)')
          .eq('user_id', session.user.id)
          .single()

        setAuth({
          user: session.user,
          member: member ?? null,
          role: member?.roles ?? null,
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return <RouterProvider router={router} />
}
