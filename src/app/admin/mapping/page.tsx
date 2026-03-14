'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Teacher, Subject, Class, Semester, SchoolYear, TeacherSubject } from '@/lib/types'
import { PageHeader, Button, Table, Modal, Select, Badge } from '@/components/ui'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'

export default function MappingPage() {
    const [mappings, setMappings] = useState<TeacherSubject[]>([])
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [semesters, setSemesters] = useState<(Semester & { school_year?: SchoolYear })[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState({ teacher_id: '', subject_id: '', class_id: '', semester_id: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        const [mapRes, tRes, sRes, cRes, semRes] = await Promise.all([
            supabase.from('teacher_subjects').select('*, teachers(full_name, nip), subjects(name, code), classes(name), semesters(semester_number, school_years(name))').order('created_at', { ascending: false }),
            supabase.from('teachers').select('*').order('full_name'),
            supabase.from('subjects').select('*').order('name'),
            supabase.from('classes').select('*').order('level').order('name'),
            supabase.from('semesters').select('*, school_years(name)').order('created_at', { ascending: false }),
        ])
        setMappings(mapRes.data || [])
        setTeachers(tRes.data || [])
        setSubjects(sRes.data || [])
        setClasses(cRes.data || [])
        setSemesters(semRes.data || [])
        setLoading(false)
    }

    const handleSave = async () => {
        setSaving(true)
        await supabase.from('teacher_subjects').insert(form)
        setSaving(false)
        setModalOpen(false)
        setForm({ teacher_id: '', subject_id: '', class_id: '', semester_id: '' })
        loadData()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus mapping ini?')) return
        await supabase.from('teacher_subjects').delete().eq('id', id)
        loadData()
    }

    const columns = [
        {
            key: 'teacher', label: 'Guru',
            render: (item: any) => (
                <div>
                    <span className="font-medium text-white">{item.teachers?.full_name}</span>
                    <span className="text-xs text-gray-500 ml-2">{item.teachers?.nip}</span>
                </div>
            ),
        },
        {
            key: 'subject', label: 'Mata Pelajaran',
            render: (item: any) => (
                <Badge variant="info">{item.subjects?.name}</Badge>
            ),
        },
        {
            key: 'class', label: 'Kelas',
            render: (item: any) => item.classes?.name || '-',
        },
        {
            key: 'semester', label: 'Semester',
            render: (item: any) => {
                const sem = item.semesters
                return sem ? `${sem.school_years?.name} - Sem ${sem.semester_number}` : '-'
            },
        },
        {
            key: 'actions', label: '', className: 'text-right',
            render: (item: any) => (
                <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                    <HiOutlineTrash className="w-4 h-4" />
                </button>
            ),
        },
    ]

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Mapping Guru - Mata Pelajaran"
                description="Tentukan guru yang mengajar mata pelajaran pada kelas tertentu"
                actions={
                    <Button onClick={() => { setForm({ teacher_id: '', subject_id: '', class_id: '', semester_id: '' }); setModalOpen(true) }} icon={<HiOutlinePlus className="w-4 h-4" />}>
                        Tambah Mapping
                    </Button>
                }
            />

            <Table columns={columns} data={mappings} loading={loading} emptyMessage="Belum ada mapping guru" />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Mapping Guru">
                <div className="space-y-4">
                    <Select
                        label="Guru" value={form.teacher_id}
                        onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                        options={teachers.map(t => ({ value: t.id, label: `${t.full_name} (${t.nip})` }))}
                        placeholder="Pilih Guru" required
                    />
                    <Select
                        label="Mata Pelajaran" value={form.subject_id}
                        onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                        options={subjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                        placeholder="Pilih Mata Pelajaran" required
                    />
                    <Select
                        label="Kelas" value={form.class_id}
                        onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                        options={classes.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Pilih Kelas" required
                    />
                    <Select
                        label="Semester" value={form.semester_id}
                        onChange={(e) => setForm({ ...form, semester_id: e.target.value })}
                        options={semesters.map(s => ({
                            value: s.id,
                            label: `${(s as any).school_years?.name || ''} - Semester ${s.semester_number}`
                        }))}
                        placeholder="Pilih Semester" required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
