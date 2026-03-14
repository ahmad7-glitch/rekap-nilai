'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import { LoadingScreen } from '@/components/ui'

const roleHomeMap: Record<string, string> = {
    admin: '/admin',
    guru: '/guru',
    siswa: '/siswa',
    orang_tua: '/orang-tua',
    kepala_sekolah: '/kepala-sekolah',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (!loading && profile) {
            const rolePrefix = roleHomeMap[profile.role]
            // Redirect user to their role's dashboard if they're not in the right section
            if (rolePrefix && !pathname.startsWith(rolePrefix)) {
                router.push(rolePrefix)
            }
        }
    }, [profile, loading, pathname, router])

    if (loading) return <LoadingScreen />
    if (!user || !profile) return null

    return (
        <div className="flex min-h-screen bg-gray-950">
            <Sidebar />
            <main className="flex-1 min-w-0">
                <div className="p-4 pt-20 lg:p-8 lg:pt-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
