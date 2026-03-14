'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, StatCard, Card, Badge, Select } from '@/components/ui'
import { calculateNilaiAkhir, getPredikat, getPredikatColor } from '@/lib/types'
import { HiOutlineUserGroup, HiOutlineUser, HiOutlineAcademicCap, HiOutlineChartBar } from 'react-icons/hi'

export default function KepalaSekolahDashboard() {
    const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 })
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClass, setSelectedClass] = useState('')
    const [subjects, setSubjects] = useState<any[]>([])
    const [selectedSubject, setSelectedSubject] = useState('')
    const [rekapData, setRekapData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingRekap, setLoadingRekap] = useState(false)

    useEffect(() => { loadInitial() }, [])

    useEffect(() => {
        if (selectedClass) loadSubjects()
    }, [selectedClass])

    useEffect(() => {
        if (selectedClass && selectedSubject) loadRekap()
    }, [selectedClass, selectedSubject])

    const loadInitial = async () => {
        const [s, t, c] = await Promise.all([
            supabase.from('students').select('id', { count: 'exact', head: true }),
            supabase.from('teachers').select('id', { count: 'exact', head: true }),
            supabase.from('classes').select('*').order('level').order('name'),
        ])
        setStats({ students: s.count || 0, teachers: t.count || 0, classes: c.data?.length || 0 })
        setClasses(c.data || [])
        setLoading(false)
    }

    const loadSubjects = async () => {
        const { data: activeSem } = await supabase
            .from('semesters')
            .select('*')
            .eq('is_active', true)
            .single()

        if (activeSem) {
            const { data: mappings } = await supabase
                .from('teacher_subjects')
                .select('subject_id, subjects(name)')
                .eq('class_id', selectedClass)
                .eq('semester_id', activeSem.id)

            const unique = [...new Map((mappings || []).map((m: any) => [m.subject_id, m])).values()]
            setSubjects(unique)
        }
    }

    const loadRekap = async () => {
        setLoadingRekap(true)
        const { data: activeSem } = await supabase
            .from('semesters')
            .select('*')
            .eq('is_active', true)
            .single()

        if (!activeSem) { setLoadingRekap(false); return }

        const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('class_id', selectedClass)
            .order('full_name')

        const { data: scores } = await supabase
            .from('scores')
            .select('*, score_types(code)')
            .eq('subject_id', selectedSubject)
            .eq('semester_id', activeSem.id)

        const getAvg = (studentId: string, code: string) => {
            const filtered = (scores || []).filter((s: any) => s.student_id === studentId && s.score_types?.code === code)
            if (filtered.length === 0) return null
            return filtered.reduce((sum: number, s: any) => sum + s.value, 0) / filtered.length
        }

        const rekap = (students || []).map(s => {
            const h = getAvg(s.id, 'HARIAN')
            const t = getAvg(s.id, 'TUGAS')
            const u = getAvg(s.id, 'UTS')
            const a = getAvg(s.id, 'UAS')
            const na = calculateNilaiAkhir(h, t, u, a)
            const pred = na !== null ? getPredikat(na) : '-'
            return { ...s, harian: h, tugas: t, uts: u, uas: a, nilai_akhir: na, predikat: pred }
        })

        setRekapData(rekap)
        setLoadingRekap(false)
    }

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Dashboard Kepala Sekolah"
                description="Monitoring nilai dan performa sekolah"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard
                    label="Total Siswa"
                    value={stats.students}
                    icon={<HiOutlineUserGroup className="w-6 h-6 text-white" />}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    label="Total Guru"
                    value={stats.teachers}
                    icon={<HiOutlineUser className="w-6 h-6 text-white" />}
                    color="from-emerald-500 to-emerald-600"
                />
                <StatCard
                    label="Total Kelas"
                    value={stats.classes}
                    icon={<HiOutlineAcademicCap className="w-6 h-6 text-white" />}
                    color="from-purple-500 to-purple-600"
                />
            </div>

            {/* Filter */}
            <Card className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <HiOutlineChartBar className="w-5 h-5 text-blue-400" />
                    Lihat Rekap Nilai
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="Kelas" value={selectedClass}
                        onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject('') }}
                        options={classes.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Pilih Kelas"
                    />
                    <Select
                        label="Mata Pelajaran" value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        options={subjects.map((s: any) => ({ value: s.subject_id, label: s.subjects?.name }))}
                        placeholder="Pilih Mata Pelajaran"
                    />
                </div>
            </Card>

            {/* Rekap Table */}
            {selectedSubject && (
                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nama Siswa</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Harian</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Tugas</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">UTS</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">UAS</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-blue-400 uppercase">Nilai Akhir</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingRekap ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : rekapData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">Belum ada data</td>
                                    </tr>
                                ) : (
                                    rekapData.map((s, i) => (
                                        <tr key={s.id} className="hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm text-white font-medium">{s.full_name}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-300">{s.harian?.toFixed(1) ?? '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-300">{s.tugas?.toFixed(1) ?? '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-300">{s.uts?.toFixed(1) ?? '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-300">{s.uas?.toFixed(1) ?? '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-blue-400">{s.nilai_akhir?.toFixed(2) ?? '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-bold ${getPredikatColor(s.predikat)}`}>{s.predikat}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
