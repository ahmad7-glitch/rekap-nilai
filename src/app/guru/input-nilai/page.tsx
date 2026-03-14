'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Student, Score, calculateNilaiAkhir, getPredikat, getPredikatColor } from '@/lib/types'
import { PageHeader, Button, Card, Badge, Select } from '@/components/ui'
import { HiOutlineSave, HiOutlineDocumentDownload, HiOutlineChevronLeft } from 'react-icons/hi'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type ScoreTab = 'harian' | 'tugas' | 'uts' | 'uas' | 'rekap'

const TABS: { key: ScoreTab; label: string; code: string }[] = [
    { key: 'harian', label: 'Nilai Harian', code: 'HARIAN' },
    { key: 'tugas', label: 'Nilai Tugas', code: 'TUGAS' },
    { key: 'uts', label: 'UTS', code: 'UTS' },
    { key: 'uas', label: 'UAS', code: 'UAS' },
]

interface ScoreEntry {
    student_id: string
    scores: { [scoreNumber: number]: number | '' }
}

function InputNilaiContent() {
    const searchParams = useSearchParams()
    const classId = searchParams.get('class_id') || ''
    const subjectId = searchParams.get('subject_id') || ''
    const semesterId = searchParams.get('semester_id') || ''

    const [students, setStudents] = useState<Student[]>([])
    const [activeTab, setActiveTab] = useState<ScoreTab>('harian')
    const [scoreEntries, setScoreEntries] = useState<{ [tab: string]: ScoreEntry[] }>({})
    const [numColumns, setNumColumns] = useState<{ [tab: string]: number }>({ harian: 3, tugas: 3, uts: 1, uas: 1 })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [className, setClassName] = useState('')
    const [subjectName, setSubjectName] = useState('')
    const [scoreTypes, setScoreTypes] = useState<any[]>([])
    const [saveMessage, setSaveMessage] = useState('')

    useEffect(() => {
        if (classId && subjectId && semesterId) {
            loadData()
        } else {
            setLoading(false)
        }
    }, [classId, subjectId, semesterId])

    const loadData = async () => {
        setLoading(true)
        try {
            const [classRes, subjectRes, studentsRes, typesRes] = await Promise.all([
                supabase.from('classes').select('name').eq('id', classId).single(),
                supabase.from('subjects').select('name').eq('id', subjectId).single(),
                supabase.from('students').select('*').eq('class_id', classId).order('full_name'),
                supabase.from('score_types').select('*').eq('semester_id', semesterId)
            ])

            setClassName(classRes.data?.name || '')
            setSubjectName(subjectRes.data?.name || '')

            const studentsData = studentsRes.data || []
            setStudents(studentsData)

            let currentTypes = typesRes.data || []

            if (currentTypes.length === 0) {
                const defaultTypes = [
                    { name: 'Nilai Harian', code: 'HARIAN', weight: 30, semester_id: semesterId },
                    { name: 'Nilai Tugas', code: 'TUGAS', weight: 20, semester_id: semesterId },
                    { name: 'UTS', code: 'UTS', weight: 25, semester_id: semesterId },
                    { name: 'UAS', code: 'UAS', weight: 25, semester_id: semesterId },
                ]
                const { data: newTypes } = await supabase.from('score_types').insert(defaultTypes).select()
                currentTypes = newTypes || []
            }
            setScoreTypes(currentTypes)

            let existingScores: any = []
            if (studentsData && studentsData.length > 0) {
                const { data } = await supabase
                    .from('scores')
                    .select('*, score_types(code)')
                    .eq('subject_id', subjectId)
                    .eq('semester_id', semesterId)
                    .in('student_id', studentsData.map(s => s.id))
                
                existingScores = data || []
            }

            const entries: { [tab: string]: ScoreEntry[] } = {}
            const cols: { [tab: string]: number } = { harian: 3, tugas: 3, uts: 1, uas: 1 }

            TABS.forEach(tab => {
                const tabScores = (existingScores || []).filter((s: any) => s.score_types?.code === tab.code)
                const maxNum = tabScores.reduce((max: number, s: any) => Math.max(max, s.score_number), 0)
                if (maxNum > cols[tab.key]) cols[tab.key] = maxNum

                entries[tab.key] = (studentsData || []).map(student => {
                    const studentScores: { [num: number]: number | '' } = {}
                    for (let i = 1; i <= cols[tab.key]; i++) {
                        const found = tabScores.find((s: any) => s.student_id === student.id && s.score_number === i)
                        studentScores[i] = found ? found.value : ''
                    }
                    return { student_id: student.id, scores: studentScores }
                })
            })

            setNumColumns(cols)
            setScoreEntries(entries)
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleScoreChange = (tab: string, studentId: string, scoreNum: number, value: string) => {
        const numValue = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value) || 0))
        setScoreEntries(prev => ({
            ...prev,
            [tab]: (prev[tab] || []).map(entry =>
                entry.student_id === studentId
                    ? { ...entry, scores: { ...entry.scores, [scoreNum]: numValue } }
                    : entry
            )
        }))
    }

    const addColumn = (tab: string) => {
        const newNum = numColumns[tab] + 1
        setNumColumns(prev => ({ ...prev, [tab]: newNum }))
        setScoreEntries(prev => ({
            ...prev,
            [tab]: (prev[tab] || []).map(entry => ({
                ...entry,
                scores: { ...entry.scores, [newNum]: '' }
            }))
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setSaveMessage('')

        try {
            const tab = TABS.find(t => t.key === activeTab)
            if (!tab) { setSaving(false); return }

            const scoreType = scoreTypes.find((st: any) => st.code === tab.code)
            if (!scoreType) {
                setSaveMessage('Error: Score type not found')
                setSaving(false)
                return
            }

            const entries2 = scoreEntries[activeTab] || []
            const scoresToUpsert: any[] = []

            entries2.forEach(entry => {
                Object.entries(entry.scores).forEach(([num, value]) => {
                    if (value !== '' && value !== null) {
                        scoresToUpsert.push({
                            student_id: entry.student_id,
                            subject_id: subjectId,
                            score_type_id: scoreType.id,
                            semester_id: semesterId,
                            score_number: parseInt(num),
                            value: Number(value),
                        })
                    }
                })
            })

            await supabase
                .from('scores')
                .delete()
                .eq('subject_id', subjectId)
                .eq('semester_id', semesterId)
                .eq('score_type_id', scoreType.id)

            if (scoresToUpsert.length > 0) {
                const { error } = await supabase.from('scores').insert(scoresToUpsert)
                if (error) {
                    setSaveMessage('Error menyimpan nilai')
                    console.error(error)
                } else {
                    setSaveMessage('Nilai berhasil disimpan!')
                    setTimeout(() => setSaveMessage(''), 3000)
                }
            } else {
                setSaveMessage('Nilai berhasil disimpan!')
                setTimeout(() => setSaveMessage(''), 3000)
            }
        } catch (err) {
            setSaveMessage('Error: Terjadi kesalahan saat menyimpan')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const getAverage = (studentId: string, tab: string): number | null => {
        const entry = scoreEntries[tab]?.find(e => e.student_id === studentId)
        if (!entry) return null
        const values = Object.values(entry.scores).filter(v => v !== '' && v !== null) as number[]
        if (values.length === 0) return null
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!classId || !subjectId || !semesterId) {
        return (
            <div className="animate-fade-in text-center py-10">
                <h3 className="text-xl font-semibold text-white mb-2">Silakan pilih kelas dan mata pelajaran</h3>
                <p className="text-gray-400 mb-6">Anda harus memilih kelas dan mata pelajaran dari dashboard terlebih dahulu.</p>
                <Link href="/guru">
                    <Button icon={<HiOutlineChevronLeft className="w-4 h-4" />}>
                        Kembali ke Dashboard
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            <Link href="/guru" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
                <HiOutlineChevronLeft className="w-4 h-4" />
                Kembali ke Dashboard
            </Link>

            <PageHeader
                title={`Input Nilai - ${subjectName}`}
                description={`Kelas ${className}`}
                actions={
                    activeTab !== 'rekap' ? (
                        <div className="flex items-center gap-3">
                            {saveMessage && (
                                <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {saveMessage}
                                </span>
                            )}
                            <Button onClick={handleSave} disabled={saving} icon={<HiOutlineSave className="w-4 h-4" />}>
                                {saving ? 'Menyimpan...' : 'Simpan Nilai'}
                            </Button>
                        </div>
                    ) : undefined
                }
            />

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-800/50 p-1 rounded-xl border border-white/5 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
                <button
                    onClick={() => setActiveTab('rekap')}
                    className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'rekap'
                            ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    📊 Rekap
                </button>
            </div>

            {/* Score Table */}
            {activeTab === 'rekap' ? (
                <RekapTable students={students} getAverage={getAverage} />
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nama Siswa</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">NIS</th>
                                    {Array.from({ length: numColumns[activeTab] || 1 }, (_, i) => (
                                        <th key={i} className="px-2 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                                            {activeTab === 'uts' || activeTab === 'uas' ? 'Nilai' : `${activeTab === 'harian' ? 'NH' : 'NT'}${i + 1}`}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                                        Rata-rata
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {students.map((student, idx) => {
                                    const entry = scoreEntries[activeTab]?.find(e => e.student_id === student.id)
                                    const avg = getAverage(student.id, activeTab)
                                    return (
                                        <tr key={student.id} className="hover:bg-white/[0.02]">
                                            <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-2 text-sm text-white font-medium">{student.full_name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-400">{student.nis}</td>
                                            {Array.from({ length: numColumns[activeTab] || 1 }, (_, i) => (
                                                <td key={i} className="px-2 py-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={entry?.scores[i + 1] ?? ''}
                                                        onChange={(e) => handleScoreChange(activeTab, student.id, i + 1, e.target.value)}
                                                        className="w-full px-2 py-1.5 text-center text-sm bg-gray-900/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-2 text-center">
                                                <span className={`text-sm font-semibold ${avg !== null && avg >= 70 ? 'text-emerald-400' : avg !== null ? 'text-red-400' : 'text-gray-600'}`}>
                                                    {avg !== null ? avg.toFixed(1) : '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {(activeTab === 'harian' || activeTab === 'tugas') && (
                        <div className="px-4 py-3 border-t border-white/5">
                            <Button size="sm" variant="ghost" onClick={() => addColumn(activeTab)}>
                                + Tambah Kolom
                            </Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}

function RekapTable({ students, getAverage }: { students: Student[]; getAverage: (id: string, tab: string) => number | null }) {
    return (
        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase w-12">No</th>
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
                        {students.map((s, idx) => {
                            const h = getAverage(s.id, 'harian')
                            const t = getAverage(s.id, 'tugas')
                            const u = getAverage(s.id, 'uts')
                            const a = getAverage(s.id, 'uas')
                            const na = calculateNilaiAkhir(h, t, u, a)
                            const pred = na !== null ? getPredikat(na) : '-'
                            return (
                                <tr key={s.id} className="hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                    <td className="px-4 py-3 text-sm text-white font-medium">{s.full_name}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-300">{h?.toFixed(1) ?? '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-300">{t?.toFixed(1) ?? '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-300">{u?.toFixed(1) ?? '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-300">{a?.toFixed(1) ?? '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-400">{na?.toFixed(2) ?? '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-sm font-bold ${getPredikatColor(pred)}`}>{pred}</span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

export default function InputNilaiPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <InputNilaiContent />
        </Suspense>
    )
}
