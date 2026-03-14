'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, StatCard, Card, Badge } from '@/components/ui'
import { HiOutlineAcademicCap, HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineBookOpen } from 'react-icons/hi'
import Link from 'next/link'

interface TeachingAssignment {
    id: string
    class_name: string
    class_id: string
    subject_name: string
    subject_id: string
    semester_id: string
    semester_label: string
}

export default function GuruDashboard() {
    const { profile, loading: authLoading } = useAuth()
    const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading) {
            if (profile) loadData()
            else setLoading(false)
        }
    }, [profile, authLoading])

    const loadData = async () => {
        try {
            // Fetch teacher and mappings in one go by using user_id if we have it? 
            // Wait, we only have profile?.email or auth info. The teacher has email.
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile?.email)
                .single()

            if (!teacher) return

            const { data: mappings } = await supabase
                .from('teacher_subjects')
                .select('id, class_id, subject_id, semester_id, subjects(name), classes(name), semesters(semester_number, is_active, school_years(name))')
                .eq('teacher_id', teacher.id)

            if (mappings) {
                const items = mappings.map((m: any) => ({
                    id: m.id,
                    class_name: m.classes?.name || '',
                    class_id: m.class_id,
                    subject_name: m.subjects?.name || '',
                    subject_id: m.subject_id,
                    semester_id: m.semester_id,
                    semester_label: `${m.semesters?.school_years?.name || ''} - Sem ${m.semesters?.semester_number}`,
                }))
                setAssignments(items)
            }
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const uniqueClasses = [...new Set(assignments.map(a => a.class_name))]
    const uniqueSubjects = [...new Set(assignments.map(a => a.subject_name))]

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={`Halo, ${profile?.full_name || 'Guru'}!`}
                description="Selamat datang di dashboard guru"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard
                    label="Kelas Diajar"
                    value={uniqueClasses.length}
                    icon={<HiOutlineAcademicCap className="w-6 h-6 text-white" />}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    label="Mata Pelajaran"
                    value={uniqueSubjects.length}
                    icon={<HiOutlineBookOpen className="w-6 h-6 text-white" />}
                    color="from-purple-500 to-purple-600"
                />
                <StatCard
                    label="Total Penugasan"
                    value={assignments.length}
                    icon={<HiOutlineClipboardList className="w-6 h-6 text-white" />}
                    color="from-emerald-500 to-emerald-600"
                />
            </div>

            <h2 className="text-lg font-semibold text-white mb-4">Kelas & Mata Pelajaran</h2>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : assignments.length === 0 ? (
                <Card>
                    <p className="text-gray-500 text-center py-8">Belum ada penugasan mengajar. Hubungi admin.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((a) => (
                        <Link key={a.id} href={`/guru/input-nilai?class_id=${a.class_id}&subject_id=${a.subject_id}&semester_id=${a.semester_id}`}>
                            <Card hover className="h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
                                        <HiOutlineBookOpen className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white">{a.subject_name}</h3>
                                        <p className="text-sm text-gray-400 mt-0.5">Kelas {a.class_name}</p>
                                        <div className="mt-3">
                                            <Badge variant="info">{a.semester_label}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
