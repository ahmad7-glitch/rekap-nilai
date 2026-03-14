'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Class } from '@/lib/types'
import { PageHeader, Button, Table, Modal, Input, Select } from '@/components/ui'
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'

export default function KelasPage() {
    const [classes, setClasses] = useState<Class[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Class | null>(null)
    const [form, setForm] = useState({ name: '', level: '7' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('classes')
            .select('*')
            .order('level')
            .order('name')
        setClasses(data || [])
        setLoading(false)
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ name: '', level: '7' })
        setModalOpen(true)
    }

    const openEdit = (cls: Class) => {
        setEditing(cls)
        setForm({ name: cls.name, level: String(cls.level) })
        setModalOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const payload = { name: form.name, level: parseInt(form.level) }
        if (editing) {
            await supabase.from('classes').update(payload).eq('id', editing.id)
        } else {
            await supabase.from('classes').insert(payload)
        }
        setSaving(false)
        setModalOpen(false)
        loadData()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus kelas ini?')) return
        await supabase.from('classes').delete().eq('id', id)
        loadData()
    }

    const columns = [
        { key: 'name', label: 'Nama Kelas' },
        {
            key: 'level', label: 'Tingkat',
            render: (item: any) => <span>Kelas {item.level}</span>,
        },
        {
            key: 'actions', label: '',
            className: 'text-right',
            render: (item: any) => (
                <div className="flex items-center justify-end gap-1">
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
                title="Kelas"
                description="Kelola data kelas"
                actions={
                    <Button onClick={openCreate} icon={<HiOutlinePlus className="w-4 h-4" />}>
                        Tambah Kelas
                    </Button>
                }
            />

            <Table columns={columns} data={classes} loading={loading} emptyMessage="Belum ada data kelas" />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Kelas' : 'Tambah Kelas'}>
                <div className="space-y-4">
                    <Input
                        label="Nama Kelas" placeholder="7A"
                        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Tingkat"
                        value={form.level}
                        onChange={(e) => setForm({ ...form, level: e.target.value })}
                        options={[
                            { value: '7', label: 'Kelas 7' },
                            { value: '8', label: 'Kelas 8' },
                            { value: '9', label: 'Kelas 9' },
                        ]}
                    />
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
