'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useAlert } from '@/lib/alert-context'
import { UserRole } from '@/lib/types'
import {
    HiOutlineHome,
    HiOutlineAcademicCap,
    HiOutlineUserGroup,
    HiOutlineBookOpen,
    HiOutlineClipboardList,
    HiOutlineCalendar,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineLogout,
    HiOutlineMenu,
    HiOutlineX,
    HiOutlineUser,
    HiOutlineDocumentText,
    HiOutlineLink,
} from 'react-icons/hi'
import { IconType } from 'react-icons'

interface NavItem {
    label: string
    href: string
    icon: IconType
}

const navByRole: Record<UserRole, NavItem[]> = {
    admin: [
        { label: 'Dashboard', href: '/admin', icon: HiOutlineHome },
        { label: 'Tahun Ajaran', href: '/admin/tahun-ajaran', icon: HiOutlineCalendar },
        { label: 'Kelas', href: '/admin/kelas', icon: HiOutlineAcademicCap },
        { label: 'Mata Pelajaran', href: '/admin/mata-pelajaran', icon: HiOutlineBookOpen },
        { label: 'Siswa', href: '/admin/siswa', icon: HiOutlineUserGroup },
        { label: 'Guru', href: '/admin/guru', icon: HiOutlineUser },
        { label: 'Mapping Guru', href: '/admin/mapping', icon: HiOutlineLink },
    ],
    guru: [
        { label: 'Dashboard', href: '/guru', icon: HiOutlineHome },
        { label: 'Input Nilai', href: '/guru/input-nilai', icon: HiOutlineClipboardList },
        { label: 'Rekap Nilai', href: '/guru/rekap', icon: HiOutlineDocumentText },
    ],
    kepala_sekolah: [
        { label: 'Dashboard', href: '/kepala-sekolah', icon: HiOutlineHome },
        { label: 'Laporan Nilai', href: '/kepala-sekolah/laporan', icon: HiOutlineChartBar },
        { label: 'Monitoring', href: '/kepala-sekolah/monitoring', icon: HiOutlineClipboardList },
    ],
    siswa: [
        { label: 'Dashboard', href: '/siswa', icon: HiOutlineHome },
        { label: 'Nilai Saya', href: '/siswa/nilai', icon: HiOutlineClipboardList },
        { label: 'Rapor', href: '/siswa/rapor', icon: HiOutlineDocumentText },
    ],
    orang_tua: [
        { label: 'Dashboard', href: '/orang-tua', icon: HiOutlineHome },
        { label: 'Nilai Anak', href: '/orang-tua/nilai', icon: HiOutlineClipboardList },
        { label: 'Rapor', href: '/orang-tua/rapor', icon: HiOutlineDocumentText },
    ],
}

export default function Sidebar() {
    const { profile, signOut } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const { isDirty, setIsDirty, showConfirm } = useAlert()
    const [mobileOpen, setMobileOpen] = useState(false)

    if (!profile) return null

    const navItems = navByRole[profile.role] || []

    const isActive = (href: string) => {
        if (href === `/${profile.role}` || href === '/admin') {
            return pathname === href
        }
        return pathname.startsWith(href)
    }

    const handleNavigation = async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (isDirty && pathname !== href) {
            e.preventDefault()
            const confirmed = await showConfirm({
                title: 'Perubahan Belum Disimpan',
                message: 'Data belum disimpan. Ingin meninggalkan halaman ini?'
            })
            if (confirmed) {
                setIsDirty(false)
                setMobileOpen(false)
                router.push(href)
            }
        } else {
            setMobileOpen(false)
        }
    }

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <HiOutlineAcademicCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">e-Rapor</h1>
                        <p className="text-xs text-gray-400">SMP Digital</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const active = isActive(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => handleNavigation(e, item.href)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${active
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg shadow-blue-500/10 border border-blue-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                            {item.label}
                            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />}
                        </Link>
                    )
                })}
            </nav>

            {/* User Profile & Logout */}
            <div className="px-4 py-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/25">
                        {profile.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{profile.role.replace('_', ' ')}</p>
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                >
                    <HiOutlineLogout className="w-5 h-5" />
                    Keluar
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="print:hidden lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-gray-800/90 backdrop-blur-sm text-white shadow-xl border border-white/10"
            >
                {mobileOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`print:hidden fixed lg:static inset-y-0 left-0 z-40 w-72 bg-gray-900/95 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {sidebarContent}
            </aside>
        </>
    )
}
