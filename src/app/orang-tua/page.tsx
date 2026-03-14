'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Card, StatCard } from '@/components/ui'
import { calculateNilaiAkhir, getPredikat, getPredikatColor } from '@/lib/types'
import { HiOutlineClipboardList, HiOutlineAcademicCap, HiOutlineStar } from 'react-icons/hi'

export default function OrangTuaDashboard() {
    const { profile, loading: authLoading } = useAuth()
    const [children, setChildren] = useState<any[]>([])
    const [selectedChild, setSelectedChild] = useState<any>(null)
    const [scores, setScores] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading) {
            if (profile) loadData()
            else setLoading(false)
        }
    }, [profile, authLoading])

    const loadData = async () => {
        try {
            // Find children by parent_user_id
            const { data: childrenData } = await supabase
                .from('students')
                .select('*, classes(name)')
                .eq('parent_user_id', profile?.id)

            if (childrenData && childrenData.length > 0) {
                setChildren(childrenData)
                setSelectedChild(childrenData[0])
                await loadScores(childrenData[0].id)
            }
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadScores = async (studentId: string) => {
        try {
            const { data: activeSem } = await supabase
                .from('semesters')
                .select('*')
                .eq('is_active', true)
                .single()

            if (activeSem) {
                const { data: scoresData } = await supabase
                    .from('scores')
                    .select('*, subjects(name, code), score_types(code)')
                    .eq('student_id', studentId)
                    .eq('semester_id', activeSem.id)

                setScores(scoresData || [])

                const uniqueSubjects = [...new Set((scoresData || []).map((s: any) => s.subject_id))]
                    .map(id => {
                        const score = (scoresData || []).find((s: any) => s.subject_id === id)
                        return { id, name: score?.subjects?.name || '' }
                    })
                setSubjects(uniqueSubjects)
            }
        } catch (err) {
            console.error('loadScores error:', err)
        }
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
        return { ...s, nilai_akhir: na, predikat: pred }
    })

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Dashboard Orang Tua"
                description={selectedChild ? `Melihat nilai: ${selectedChild.full_name} · Kelas ${selectedChild.classes?.name}` : 'Lihat nilai anak Anda'}
            />

            {children.length > 1 && (
                <div className="flex gap-2 mb-6">
                    {children.map(child => (
                        <button
                            key={child.id}
                            onClick={async () => { setSelectedChild(child); await loadScores(child.id) }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedChild?.id === child.id
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                    : 'bg-gray-800/50 text-gray-400 border border-white/5 hover:bg-white/5'
                                }`}
                        >
                            {child.full_name}
                        </button>
                    ))}
                </div>
            )}

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Mata Pelajaran</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-400 uppercase">Nilai Akhir</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Predikat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-12 text-center">
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : subjectData.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">Belum ada data nilai</td>
                                </tr>
                            ) : (
                                subjectData.map(s => (
                                    <tr key={s.id} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 text-sm text-white font-medium">{s.name}</td>
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
