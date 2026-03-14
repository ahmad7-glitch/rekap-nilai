'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatCard, PageHeader, Card } from '@/components/ui'
import { HiOutlineUserGroup, HiOutlineUser, HiOutlineAcademicCap, HiOutlineBookOpen, HiOutlineClipboardList } from 'react-icons/hi'

interface Stats {
    totalStudents: number
    totalTeachers: number
    totalClasses: number
    totalSubjects: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({
        totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalSubjects: 0,
    })
    const [loading, setLoading] = useState(true)
    const [recentStudents, setRecentStudents] = useState<any[]>([])

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            const [students, teachers, classes, subjects] = await Promise.all([
                supabase.from('students').select('id', { count: 'exact', head: true }),
                supabase.from('teachers').select('id', { count: 'exact', head: true }),
                supabase.from('classes').select('id', { count: 'exact', head: true }),
                supabase.from('subjects').select('id', { count: 'exact', head: true }),
            ])

            setStats({
                totalStudents: students.count || 0,
                totalTeachers: teachers.count || 0,
                totalClasses: classes.count || 0,
                totalSubjects: subjects.count || 0,
            })

            // Recent students
            const { data: recent } = await supabase
                .from('students')
                .select('*, classes(name)')
                .order('created_at', { ascending: false })
                .limit(5)
            setRecentStudents(recent || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Dashboard Admin"
                description="Ringkasan data dan statistik sekolah"
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Total Siswa"
                    value={loading ? '...' : stats.totalStudents}
                    icon={<HiOutlineUserGroup className="w-6 h-6 text-white" />}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    label="Total Guru"
                    value={loading ? '...' : stats.totalTeachers}
                    icon={<HiOutlineUser className="w-6 h-6 text-white" />}
                    color="from-emerald-500 to-emerald-600"
                />
                <StatCard
                    label="Total Kelas"
                    value={loading ? '...' : stats.totalClasses}
                    icon={<HiOutlineAcademicCap className="w-6 h-6 text-white" />}
                    color="from-purple-500 to-purple-600"
                />
                <StatCard
                    label="Mata Pelajaran"
                    value={loading ? '...' : stats.totalSubjects}
                    icon={<HiOutlineBookOpen className="w-6 h-6 text-white" />}
                    color="from-amber-500 to-orange-600"
                />
            </div>

            {/* Recent Students */}
            <Card>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <HiOutlineClipboardList className="w-5 h-5 text-blue-400" />
                    Siswa Terbaru
                </h3>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : recentStudents.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">Belum ada data siswa</p>
                ) : (
                    <div className="space-y-3">
                        {recentStudents.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">
                                        {s.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{s.full_name}</p>
                                        <p className="text-xs text-gray-500">NIS: {s.nis}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-lg">
                                    {s.classes?.name || '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
