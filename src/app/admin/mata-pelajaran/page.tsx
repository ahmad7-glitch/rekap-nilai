'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Subject } from '@/lib/types'
import { PageHeader, Button, Table, Modal, Input, Pagination } from '@/components/ui'
import { useAlert } from '@/lib/alert-context'
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUpload, HiOutlineDownload } from 'react-icons/hi'
import * as XLSX from 'xlsx'

export default function MataPelajaranPage() {
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Subject | null>(null)
    const [form, setForm] = useState({ name: '', code: '' })
    const [saving, setSaving] = useState(false)
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { showAlert, showConfirm } = useAlert()
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(15)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const { data } = await supabase.from('subjects').select('*').order('name')
            setSubjects(data || [])
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ name: '', code: '' })
        setModalOpen(true)
    }

    const openEdit = (subj: Subject) => {
        setEditing(subj)
        setForm({ name: subj.name, code: subj.code })
        setModalOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (editing) {
                await supabase.from('subjects').update(form).eq('id', editing.id)
                showAlert({ type: 'success', title: 'Berhasil', message: 'Mata pelajaran berhasil diperbarui.' })
            } else {
                await supabase.from('subjects').insert(form)
                showAlert({ type: 'success', title: 'Berhasil', message: 'Mata pelajaran berhasil ditambahkan.' })
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
            title: 'Hapus Mata Pelajaran',
            message: 'Apakah Anda yakin ingin menghapus mata pelajaran ini? Data yang sudah dihapus tidak dapat dikembalikan.'
        })
        if (!confirmed) return
        await supabase.from('subjects').delete().eq('id', id)
        loadData()
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { 'Kode': 'MTK', 'Nama Mata Pelajaran': 'Matematika' },
            { 'Kode': 'B_IND', 'Nama Mata Pelajaran': 'Bahasa Indonesia' },
            { 'Kode': 'IPA', 'Nama Mata Pelajaran': 'Ilmu Pengetahuan Alam' }
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        XLSX.writeFile(wb, 'template_mata_pelajaran.xlsx')
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImporting(true)
        showAlert({ type: 'loading', title: 'Mengimpor Data', message: 'Memproses file Excel...' })

        const reader = new FileReader()
        reader.onerror = () => {
            showAlert({ type: 'error', title: 'Gagal Membaca File', message: 'File Excel tidak dapat dibaca oleh browser.' })
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }

        reader.onload = async (event) => {
            try {
                const data = event.target?.result
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(sheet) as any[]

                const formattedData: any[] = []
                const errors: string[] = []

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    const normalizedRow: any = {}
                    let isEmpty = true

                    Object.keys(row).forEach(k => {
                        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                            isEmpty = false
                            normalizedRow[k.toLowerCase().trim()] = row[k]
                        }
                    })

                    if (isEmpty) continue;

                    const code = normalizedRow['kode'] || normalizedRow['code'] || normalizedRow['kode mapel'] || normalizedRow['kode pelajaran']
                    const name = normalizedRow['nama mata pelajaran'] || normalizedRow['nama mapel'] || normalizedRow['nama'] || normalizedRow['mata pelajaran'] || normalizedRow['name']

                    if (!code || !name) {
                        errors.push(`Baris ${i + 2}: Kolom Kode atau Nama Mata Pelajaran wajib diisi`)
                        continue
                    }

                    formattedData.push({
                        code: String(code).trim(),
                        name: String(name).trim()
                    })
                }

                if (errors.length > 0) {
                    const errorMsg = 'Harap perbaiki file Excel Anda:\n\n' + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...dan lainnya' : '')
                    showAlert({ type: 'error', title: 'Data Tidak Sesuai', message: errorMsg })
                    return
                }

                if (formattedData.length > 0) {
                    const { error } = await supabase.from('subjects').insert(formattedData)
                    if (error) {
                        showAlert({ type: 'error', title: 'Gagal Mengimpor', message: 'Terdapat kode mata pelajaran yang sudah ada atau terjadi kesalahan database.' })
                        console.error(error)
                    } else {
                        showAlert({ type: 'success', title: 'Berhasil', message: `${formattedData.length} data mata pelajaran baru berhasil ditambahkan.` })
                        loadData()
                    }
                } else {
                    showAlert({ type: 'error', title: 'File Kosong', message: 'Tidak ada data valid yang bisa diimpor dari file tersebut.' })
                }
            } catch (err) {
                console.error('Error parsing Excel:', err)
                showAlert({ type: 'error', title: 'Gagal Membaca File', message: 'Terjadi kesalahan saat membaca file Excel.' })
            } finally {
                setImporting(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const columns = [
        { key: 'code', label: 'Kode' },
        { key: 'name', label: 'Nama Mata Pelajaran' },
        {
            key: 'actions', label: '', className: 'text-right',
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

    const totalItems = subjects.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedData = subjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="animate-fade-in">
            <input
                type="file"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImport}
            />

            <PageHeader
                title="Mata Pelajaran"
                description="Kelola data mata pelajaran"
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={downloadTemplate} icon={<HiOutlineDownload className="w-4 h-4" />}>
                            Template
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            icon={<HiOutlineUpload className="w-4 h-4" />}
                        >
                            {importing ? '...' : 'Import'}
                        </Button>
                        <Button onClick={openCreate} icon={<HiOutlinePlus className="w-4 h-4" />}>
                            Tambah
                        </Button>
                    </div>
                }
            />

            <div className="space-y-4">
                <Table columns={columns} data={paginatedData} loading={loading} emptyMessage="Belum ada mata pelajaran" />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={totalItems}
                />
            </div>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}>
                <div className="space-y-4">
                    <Input label="Kode" placeholder="MTK" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                    <Input label="Nama" placeholder="Matematika" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </div>
            </Modal>

        </div>
    )
}
