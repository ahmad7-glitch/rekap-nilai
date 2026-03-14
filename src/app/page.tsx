'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { LoadingScreen } from '@/components/ui'

const roleHomeMap: Record<string, string> = {
  admin: '/admin',
  guru: '/guru',
  siswa: '/siswa',
  orang_tua: '/orang-tua',
  kepala_sekolah: '/kepala-sekolah',
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (profile) {
        router.push(roleHomeMap[profile.role] || '/admin')
      }
    }
  }, [user, profile, loading, router])

  return <LoadingScreen />
}
