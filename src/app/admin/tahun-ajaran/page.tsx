'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SchoolYear, Semester } from '@/lib/types'
import { PageHeader, Button, Table, Modal, Input, Badge } from '@/components/ui'
import { useAlert } from '@/lib/alert-context'
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'

export default function TahunAjaranPage() {
    const [years, setYears] = useState<(SchoolYear & { semesters?: Semester[] })[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [semesterModalOpen, setSemesterModalOpen] = useState(false)
    const [editingYear, setEditingYear] = useState<SchoolYear | null>(null)
    const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null)
    const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false })
    const [saving, setSaving] = useState(false)
    const { showAlert, showConfirm } = useAlert()

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('school_years')
                .select('*, semesters(*)')
                .order('created_at', { ascending: false })
            setYears(data || [])
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditingYear(null)
        setForm({ name: '', start_date: '', end_date: '', is_active: false })
        setModalOpen(true)
    }

    const openEdit = (year: SchoolYear) => {
        setEditingYear(year)
        setForm({ name: year.name, start_date: year.start_date, end_date: year.end_date, is_active: year.is_active })
        setModalOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (editingYear) {
                await supabase.from('school_years').update(form).eq('id', editingYear.id)
                showAlert({ type: 'success', title: 'Berhasil', message: 'Tahun ajaran berhasil diperbarui.' })
            } else {
                await supabase.from('school_years').insert(form)
                showAlert({ type: 'success', title: 'Berhasil', message: 'Tahun ajaran berhasil ditambahkan.' })
            }
            setModalOpen(false)
            loadData()
        } catch (err: any) {
            showAlert({ type: 'error', title: 'Gagal', message: 'Terjadi kesalahan saat menyimpan data.' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm({
            title: 'Hapus Tahun Ajaran',
            message: 'Apakah Anda yakin ingin menghapus tahun ajaran ini? Data semester dan mapping yang terkait juga akan terhapus.'
        })
        if (!confirmed) return
        await supabase.from('school_years').delete().eq('id', id)
        loadData()
    }

    const handleAddSemesters = async (yearId: string) => {
        // Add semester 1 and 2 for this year
        await supabase.from('semesters').insert([
            { school_year_id: yearId, semester_number: 1, is_active: false },
            { school_year_id: yearId, semester_number: 2, is_active: false },
        ])
        loadData()
    }

    const toggleSemesterActive = async (semId: string, current: boolean) => {
        await supabase.from('semesters').update({ is_active: !current }).eq('id', semId)
        loadData()
    }

    const columns = [
        { key: 'name', label: 'Tahun Ajaran' },
        { key: 'start_date', label: 'Mulai' },
        { key: 'end_date', label: 'Selesai' },
        {
            key: 'is_active', label: 'Status',
            render: (item: any) => (
                <Badge variant={item.is_active ? 'success' : 'default'}>
                    {item.is_active ? 'Aktif' : 'Tidak Aktif'}
                </Badge>
            ),
        },
        {
            key: 'semesters', label: 'Semester',
            render: (item: any) => {
                const sems = item.semesters || []
                if (sems.length === 0) {
                    return (
                        <Button size="sm" variant="secondary" onClick={() => handleAddSemesters(item.id)}>
                            + Tambah Semester
                        </Button>
                    )
                }
                return (
                    <div className="flex gap-2">
                        {sems.sort((a: any, b: any) => a.semester_number - b.semester_number).map((s: any) => (
                            <button
                                key={s.id}
                                onClick={() => toggleSemesterActive(s.id, s.is_active)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${s.is_active
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-gray-700/50 text-gray-400 border-gray-600/50 hover:bg-gray-600/50'
                                    }`}
                            >
                                Sem {s.semester_number}
                            </button>
                        ))}
                    </div>
                )
            },
        },
        {
            key: 'actions', label: '',
            render: (item: any) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                        <HiOutlineTrash className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ]

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Tahun Ajaran"
                description="Kelola tahun ajaran dan semester"
                actions={
                    <Button onClick={openCreate} icon={<HiOutlinePlus className="w-4 h-4" />}>
                        Tambah Tahun Ajaran
                    </Button>
                }
            />

            <Table columns={columns} data={years} loading={loading} emptyMessage="Belum ada tahun ajaran" />

            {/* Modal Create/Edit */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}>
                <div className="space-y-4">
                    <Input
                        label="Nama Tahun Ajaran" placeholder="2025/2026"
                        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Tanggal Mulai" type="date"
                            value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                            required
                        />
                        <Input
                            label="Tanggal Selesai" type="date"
                            value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                            required
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox" checked={form.is_active}
                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">Tahun ajaran aktif</span>
                    </label>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
