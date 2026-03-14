'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Card, StatCard, Table, Badge } from '@/components/ui'
import { calculateNilaiAkhir, getPredikat, getPredikatColor } from '@/lib/types'
import { HiOutlineClipboardList, HiOutlineAcademicCap, HiOutlineStar, HiOutlinePrinter } from 'react-icons/hi'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function SiswaDashboard() {
    const { profile } = useAuth()
    const [student, setStudent] = useState<any>(null)
    const [scores, setScores] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile) loadData()
    }, [profile])

    const loadData = async () => {
        // Find student by user_id
        const { data: studentData } = await supabase
            .from('students')
            .select('*, classes(name)')
            .eq('user_id', profile?.id)
            .single()

        if (!studentData) { setLoading(false); return }
        setStudent(studentData)

        // Get active semester
        const { data: activeSem } = await supabase
            .from('semesters')
            .select('*, school_years(name)')
            .eq('is_active', true)
            .single()

        if (activeSem) {
            // Get scores for this student
            const { data: scoresData } = await supabase
                .from('scores')
                .select('*, subjects(name, code), score_types(code, name)')
                .eq('student_id', studentData.id)
                .eq('semester_id', activeSem.id)

            setScores(scoresData || [])

            // Get unique subjects
            const uniqueSubjects = [...new Set((scoresData || []).map((s: any) => s.subject_id))]
                .map(id => {
                    const score = (scoresData || []).find((s: any) => s.subject_id === id)
                    return { id, name: score?.subjects?.name || '', code: score?.subjects?.code || '' }
                })
            setSubjects(uniqueSubjects)
        }
        setLoading(false)
    }

    const getAvg = (subjectId: string, code: string) => {
        const filtered = scores.filter(s => s.subject_id === subjectId && s.score_types?.code === code)
        if (filtered.length === 0) return null
        return filtered.reduce((sum, s) => sum + s.value, 0) / filtered.length
    }

    const subjectData = subjects.map(s => {
        const h = getAvg(s.id, 'HARIAN')
        const t = getAvg(s.id, 'TUGAS')
        const u = getAvg(s.id, 'UTS')
        const a = getAvg(s.id, 'UAS')
        const na = calculateNilaiAkhir(h, t, u, a)
        const pred = na !== null ? getPredikat(na) : '-'
        return { ...s, harian: h, tugas: t, uts: u, uas: a, nilai_akhir: na, predikat: pred }
    })

    const avgNilai = subjectData.filter(s => s.nilai_akhir !== null)
    const totalAvg = avgNilai.length > 0
        ? (avgNilai.reduce((sum, s) => sum + (s.nilai_akhir || 0), 0) / avgNilai.length).toFixed(1)
        : '-'

    return (
        <div className="animate-fade-in print:bg-white print:text-black">
            <div className="flex justify-between items-center mb-8 pr-4">
                <PageHeader
                    title={`Halo, ${student?.full_name || profile?.full_name}!`}
                    description={student ? `Kelas ${student.classes?.name} · NIS: ${student.nis}` : 'Dashboard Siswa'}
                />
                <button
                    onClick={() => window.print()}
                    className="print:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm shadow-lg shadow-blue-500/20"
                >
                    <HiOutlinePrinter className="w-5 h-5" />
                    Cetak Rapor
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard
                    label="Mata Pelajaran"
                    value={subjects.length}
                    icon={<HiOutlineClipboardList className="w-6 h-6 text-white" />}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    label="Rata-rata Nilai"
                    value={totalAvg}
                    icon={<HiOutlineStar className="w-6 h-6 text-white" />}
                    color="from-emerald-500 to-emerald-600"
                />
                <StatCard
                    label="Kelas"
                    value={student?.classes?.name || '-'}
                    icon={<HiOutlineAcademicCap className="w-6 h-6 text-white" />}
                    color="from-purple-500 to-purple-600"
                />
            </div>

            {/* Area Grafik Performa (Bisa disembunyikan saat print) */}
            <div className="print:hidden mb-10">
                <h2 className="text-lg font-semibold text-white mb-4">Grafik Performa Akademik</h2>
                <Card className="p-6 h-80">
                    {subjectData.length > 0 ? (
                        <Bar
                            data={{
                                labels: subjectData.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name),
                                datasets: [{
                                    label: 'Nilai Akhir',
                                    data: subjectData.map(s => s.nilai_akhir || 0),
                                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                    borderColor: 'rgb(59, 130, 246)',
                                    borderWidth: 1,
                                    borderRadius: 4,
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true, max: 100,
                                        ticks: { color: 'rgba(156, 163, 175, 1)' },
                                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                                    },
                                    x: {
                                        ticks: { color: 'rgba(156, 163, 175, 1)' },
                                        grid: { display: false }
                                    }
                                }
                            }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">Belum ada data nilai</div>
                    )}
                </Card>
            </div>

            <h2 className="text-lg font-semibold text-white print:text-black mb-4 print:mb-2">Nilai Per Mata Pelajaran</h2>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Mata Pelajaran</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Harian</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Tugas</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">UTS</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">UAS</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-400 uppercase">Nilai Akhir</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Predikat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : subjectData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">Belum ada data nilai</td>
                                </tr>
                            ) : (
                                subjectData.map(s => (
                                    <tr key={s.id} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 text-sm text-white font-medium">{s.name}</td>
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
        </div>
    )
}
