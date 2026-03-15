'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, Class } from '@/lib/types'
import { PageHeader, Button, Table, Modal, Input, Select, Badge, Pagination } from '@/components/ui'
import { useAlert } from '@/lib/alert-context'
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineUpload, HiOutlineDownload } from 'react-icons/hi'
import * as XLSX from 'xlsx'

export default function SiswaPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Student | null>(null)
    const [form, setForm] = useState({ full_name: '', nis: '', class_id: '', gender: 'L' as 'L' | 'P' })
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { showAlert, showConfirm } = useAlert()
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(15)

    useEffect(() => {
        setCurrentPage(1)
    }, [search, filterClass])

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [studentsRes, classesRes] = await Promise.all([
                supabase.from('students').select('*, classes(name)').order('full_name'),
                supabase.from('classes').select('*').order('level').order('name'),
            ])
            setStudents(studentsRes.data || [])
            setClasses(classesRes.data || [])
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ full_name: '', nis: '', class_id: '', gender: 'L' })
        setModalOpen(true)
    }

    const openEdit = (s: Student) => {
        setEditing(s)
        setForm({ full_name: s.full_name, nis: s.nis, class_id: s.class_id, gender: s.gender })
        setModalOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (editing) {
                await supabase.from('students').update(form).eq('id', editing.id)
                showAlert({ type: 'success', title: 'Berhasil', message: 'Data siswa berhasil diperbarui.' })
            } else {
                await supabase.from('students').insert(form)
                showAlert({ type: 'success', title: 'Berhasil', message: 'Data siswa berhasil ditambahkan.' })
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
            title: 'Hapus Data Siswa',
            message: 'Apakah Anda yakin ingin menghapus data siswa ini? Data yang sudah dihapus tidak dapat dikembalikan.'
        })
        if (!confirmed) return
        
        try {
            showAlert({ type: 'loading', title: 'Menghapus', message: 'Sedang menghapus data...' })
            const { error } = await supabase.from('students').delete().eq('id', id)
            if (error) throw error
            
            showAlert({ type: 'success', title: 'Berhasil', message: 'Data siswa berhasil dihapus.' })
            loadData()
        } catch (error: any) {
            console.error('Error deleting student:', error)
            showAlert({ type: 'error', title: 'Gagal Menghapus', message: error.message || 'Terjadi kesalahan saat menghapus data siswa.' })
        }
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { 'NIS': '1001', 'Nama Lengkap': 'Ahmad Budi', 'L/P': 'L', 'Kelas': '7A' },
            { 'NIS': '1002', 'Nama Lengkap': 'Siti Aminah', 'L/P': 'P', 'Kelas': '7A' },
            { 'NIS': '1003', 'Nama Lengkap': 'Bagus Sajiwo', 'L/P': 'L', 'Kelas': '8B' }
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        XLSX.writeFile(wb, 'template_siswa.xlsx')
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

                    const nis = normalizedRow['nis'] || normalizedRow['no induk']
                    const fullName = normalizedRow['nama lengkap'] || normalizedRow['nama_lengkap'] || normalizedRow['nama'] || normalizedRow['full_name']
                    const className = normalizedRow['kelas'] || normalizedRow['class_name'] || normalizedRow['nama kelas']
                    const genderRaw = normalizedRow['l/p'] || normalizedRow['jenis kelamin'] || normalizedRow['gender'] || normalizedRow['jk']

                    if (!nis || !fullName || !className || !genderRaw) {
                        errors.push(`Baris ${i + 2}: Kolom NIS, Nama Lengkap, L/P, atau Kelas ada yang kosong`)
                        continue
                    }

                    const gender = String(genderRaw).trim().toUpperCase()
                    if (gender !== 'L' && gender !== 'P') {
                        errors.push(`Baris ${i + 2}: Kolom L/P harus diisi huruf L atau P`)
                        continue
                    }

                    const cls = classes.find(c => c.name.toLowerCase() === String(className).trim().toLowerCase())
                    if (!cls) {
                        errors.push(`Baris ${i + 2}: Kelas "${className}" tidak terdaftar di sistem`)
                        continue
                    }

                    formattedData.push({
                        nis: String(nis).trim(),
                        full_name: String(fullName).trim(),
                        gender: gender,
                        class_id: cls.id
                    })
                }

                if (errors.length > 0) {
                    const errorMsg = 'Harap perbaiki file Excel Anda:\n\n' + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...dan lainnya' : '')
                    showAlert({ type: 'error', title: 'Data Tidak Sesuai', message: errorMsg })
                    return
                }

                if (formattedData.length > 0) {
                    const { error } = await supabase.from('students').insert(formattedData)
                    if (error) {
                        showAlert({ type: 'error', title: 'Gagal Mengimpor', message: 'Terdapat NIS yang sudah terdaftar di sistem atau terjadi kesalahan database.' })
                        console.error(error)
                    } else {
                        showAlert({ type: 'success', title: 'Berhasil', message: `${formattedData.length} data siswa baru berhasil ditambahkan.` })
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

    const filtered = students.filter(s => {
        const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
            s.nis.toLowerCase().includes(search.toLowerCase())
        const matchClass = filterClass ? s.class_id === filterClass : true
        return matchSearch && matchClass
    })

    const columns = [
        { key: 'nis', label: 'NIS' },
        {
            key: 'full_name', label: 'Nama Siswa',
            render: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                        {item.full_name?.charAt(0)}
                    </div>
                    <span className="font-medium text-white">{item.full_name}</span>
                </div>
            ),
        },
        {
            key: 'gender', label: 'L/P',
            render: (item: any) => (
                <Badge variant={item.gender === 'L' ? 'info' : 'warning'}>
                    {item.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </Badge>
            ),
        },
        {
            key: 'class_id', label: 'Kelas',
            render: (item: any) => <span>{(item as any).classes?.name || '-'}</span>,
        },
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

    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
                title="Data Siswa"
                description="Kelola data siswa"
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text" placeholder="Cari nama atau NIS..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                </div>
                <Select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="Semua Kelas"
                    className="sm:w-48"
                />
            </div>

            <div className="space-y-4">
                <Table columns={columns} data={paginatedData} loading={loading} emptyMessage="Tidak ada data siswa" />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={totalItems}
                />
            </div>
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Siswa' : 'Tambah Siswa'}>
                <div className="space-y-4">
                    <Input label="NIS" placeholder="12345" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} required />
                    <Input label="Nama Lengkap" placeholder="Nama siswa" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    <Select
                        label="Jenis Kelamin" value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}
                        options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]}
                    />
                    <Select
                        label="Kelas" value={form.class_id}
                        onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                        options={classes.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Pilih Kelas"
                        required
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
