'use client'

import { AuthProvider } from '@/lib/auth-context'
import { AlertProvider } from '@/lib/alert-context'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AlertProvider>
            <AuthProvider>{children}</AuthProvider>
        </AlertProvider>
    )
}
