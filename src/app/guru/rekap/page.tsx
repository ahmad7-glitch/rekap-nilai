'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Card, Select, Table, Badge, Button } from '@/components/ui'
import { calculateNilaiAkhir, getPredikat, getPredikatColor } from '@/lib/types'
import { HiOutlineDownload } from 'react-icons/hi'
import * as XLSX from 'xlsx'

export default function RekapPage() {
    const { profile, loading: authLoading } = useAuth()
    const [assignments, setAssignments] = useState<any[]>([])
    const [selectedAssignment, setSelectedAssignment] = useState('')
    const [students, setStudents] = useState<any[]>([])
    const [scores, setScores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingScores, setLoadingScores] = useState(false)

    useEffect(() => {
        if (!authLoading) {
            if (profile) loadAssignments()
            else setLoading(false)
        }
    }, [profile, authLoading])

    useEffect(() => {
        if (selectedAssignment) loadScores()
    }, [selectedAssignment])

    const loadAssignments = async () => {
        try {
            // Try to find teacher by user_id first, then fall back to email
            let { data: teacher } = await supabase
                .from('teachers')
                .select('id, user_id')
                .eq('user_id', profile?.id)
                .maybeSingle()

            if (!teacher) {
                // Fall back to email lookup
                const res = await supabase
                    .from('teachers')
                    .select('id, user_id')
                    .eq('email', profile?.email)
                    .maybeSingle()
                teacher = res.data

                // Auto-link user_id on first login
                if (teacher && !teacher.user_id && profile?.id) {
                    const { error: linkError } = await supabase
                        .from('teachers')
                        .update({ user_id: profile.id })
                        .eq('id', teacher.id)
                    if (linkError) console.error('Auto-link user_id error:', linkError.message)
                }
            }

            if (!teacher) return

            const { data } = await supabase
                .from('teacher_subjects')
                .select('*, subjects(name), classes(name), semesters(semester_number, school_years(name))')
                .eq('teacher_id', teacher.id)

            setAssignments(data || [])
        } catch (err) {
            console.error('loadAssignments error:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadScores = async () => {
        setLoadingScores(true)
        try {
            const assignment = assignments.find(a => a.id === selectedAssignment)
            if (!assignment) return

            const { data: studentsData } = await supabase
                .from('students')
                .select('*')
                .eq('class_id', assignment.class_id)
                .order('full_name')

            const { data: scoresData } = await supabase
                .from('scores')
                .select('*, score_types(code, name)')
                .eq('subject_id', assignment.subject_id)
                .eq('semester_id', assignment.semester_id)

            setStudents(studentsData || [])
            setScores(scoresData || [])
        } catch (err) {
            console.error('loadScores error:', err)
        } finally {
            setLoadingScores(false)
        }
    }

    const getAvgForStudent = (studentId: string, code: string) => {
        const studentScores = scores.filter(s => s.student_id === studentId && s.score_types?.code === code)
        if (studentScores.length === 0) return null
        return studentScores.reduce((sum: number, s: any) => sum + s.value, 0) / studentScores.length
    }

    const rekapData = students.map(s => {
        const h = getAvgForStudent(s.id, 'HARIAN')
        const t = getAvgForStudent(s.id, 'TUGAS')
        const u = getAvgForStudent(s.id, 'UTS')
        const a = getAvgForStudent(s.id, 'UAS')
        const na = calculateNilaiAkhir(h, t, u, a)
        const pred = na !== null ? getPredikat(na) : '-'
        return {
            ...s,
            avg_harian: h,
            avg_tugas: t,
            uts: u,
            uas: a,
            nilai_akhir: na,
            predikat: pred,
        }
    })

    const columns = [
        { key: 'nis', label: 'NIS' },
        { key: 'full_name', label: 'Nama Siswa', render: (item: any) => <span className="font-medium text-white">{item.full_name}</span> },
        { key: 'avg_harian', label: 'Harian', render: (item: any) => item.avg_harian?.toFixed(1) ?? '-' },
        { key: 'avg_tugas', label: 'Tugas', render: (item: any) => item.avg_tugas?.toFixed(1) ?? '-' },
        { key: 'uts', label: 'UTS', render: (item: any) => item.uts?.toFixed(1) ?? '-' },
        { key: 'uas', label: 'UAS', render: (item: any) => item.uas?.toFixed(1) ?? '-' },
        {
            key: 'nilai_akhir', label: 'Nilai Akhir',
            render: (item: any) => <span className="font-bold text-blue-400">{item.nilai_akhir?.toFixed(2) ?? '-'}</span>,
        },
        {
            key: 'predikat', label: 'Predikat',
            render: (item: any) => <span className={`font-bold ${getPredikatColor(item.predikat)}`}>{item.predikat}</span>,
        },
    ]

    const handleExportExcel = () => {
        const assignment = assignments.find(a => a.id === selectedAssignment)
        if (!assignment) return

        const exportData = rekapData.map(s => ({
            'NIS': s.nis,
            'Nama Lengkap': s.full_name,
            'Nilai Harian': s.avg_harian?.toFixed(1) ?? '-',
            'Nilai Tugas': s.avg_tugas?.toFixed(1) ?? '-',
            'Nilai UTS': s.uts?.toFixed(1) ?? '-',
            'Nilai UAS': s.uas?.toFixed(1) ?? '-',
            'Nilai Akhir': s.nilai_akhir?.toFixed(2) ?? '-',
            'Predikat': s.predikat
        }))

        const worksheet = XLSX.utils.json_to_sheet(exportData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai')

        const fileName = `Rekap_Nilai_${assignment.classes?.name}_${assignment.subjects?.name}.xlsx`
        XLSX.writeFile(workbook, fileName.replace(/\s+/g, '_'))
    }

    return (
        <div className="animate-fade-in">
            <PageHeader title="Rekap Nilai" description="Lihat rekap nilai seluruh siswa" />

            <div className="mb-6 flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full max-w-md">
                    <Select
                        label="Pilih Kelas & Mata Pelajaran"
                        value={selectedAssignment}
                        onChange={(e) => setSelectedAssignment(e.target.value)}
                        options={assignments.map(a => ({
                            value: a.id,
                            label: `${a.subjects?.name} - Kelas ${a.classes?.name} (${a.semesters?.school_years?.name} Sem ${a.semesters?.semester_number})`
                        }))}
                        placeholder="Pilih..."
                        className="w-full"
                    />
                </div>
                {selectedAssignment && (
                    <Button
                        variant="secondary"
                        onClick={handleExportExcel}
                        icon={<HiOutlineDownload className="w-5 h-5" />}
                        disabled={rekapData.length === 0}
                    >
                        Export Excel
                    </Button>
                )}
            </div>

            {selectedAssignment && (
                <Table columns={columns} data={rekapData} loading={loadingScores} emptyMessage="Tidak ada data" />
            )}
        </div>
    )
}
