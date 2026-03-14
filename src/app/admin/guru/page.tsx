'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Teacher } from '@/lib/types'
import { PageHeader, Button, Table, Modal, Input, AlertModal, Pagination } from '@/components/ui'
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineUpload, HiOutlineDownload } from 'react-icons/hi'
import * as XLSX from 'xlsx'

export default function GuruPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Teacher | null>(null)
    const [form, setForm] = useState({ full_name: '', nip: '', email: '', phone: '' })
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [alertConfig, setAlertConfig] = useState<{ open: boolean, type: 'loading' | 'success' | 'error', title: string, message: string }>({
        open: false, type: 'loading', title: '', message: ''
    })
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(15)

    useEffect(() => {
        setCurrentPage(1)
    }, [search])

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const { data } = await supabase.from('teachers').select('*').order('full_name')
            setTeachers(data || [])
        } catch (err) {
            console.error('loadData error:', err)
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ full_name: '', nip: '', email: '', phone: '' })
        setModalOpen(true)
    }

    const openEdit = (t: Teacher) => {
        setEditing(t)
        setForm({ full_name: t.full_name, nip: t.nip, email: t.email, phone: t.phone || '' })
        setModalOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const payload = { ...form, phone: form.phone || null }
        
        try {
            if (editing) {
                await supabase.from('teachers').update(payload).eq('id', editing.id)
            } else {
                // Buat user di Auth terlebih dahulu via Edge Function yg kita buat
                const res = await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: form.email,
                        password: 'guru123',
                        full_name: form.full_name,
                        role: 'guru'
                    })
                })
                
                const authData = await res.json()
                
                if (!res.ok) {
                    throw new Error(authData.error || 'Gagal membuat user auth')
                }

                // Setelah user auth terbuat (dan trigger profil jalan otomatis), 
                // masukkan ke tabel guru beserta user_id-nya
                await supabase.from('teachers').insert({
                    ...payload,
                    user_id: authData.user.id
                })
            }
            setModalOpen(false)
            loadData()
        } catch (error: any) {
            alert(`Error: ${error.message}`)
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus data guru ini?')) return
        await supabase.from('teachers').delete().eq('id', id)
        loadData()
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { 'NIP': '198001012010011001', 'Nama Lengkap': 'Budi Santoso, S.Pd', 'Email': 'budi@sekolah.com', 'No Telepon': '081234567890' },
            { 'NIP': '198502022015022002', 'Nama Lengkap': 'Siti Rahmawati, M.Pd', 'Email': 'siti@sekolah.com', 'No Telepon': '089876543210' }
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        XLSX.writeFile(wb, 'template_guru.xlsx')
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImporting(true)
        setAlertConfig({ open: true, type: 'loading', title: 'Mengimpor Data', message: 'Memproses file Excel...' })

        const reader = new FileReader()
        reader.onerror = () => {
            setAlertConfig({ open: true, type: 'error', title: 'Gagal Membaca File', message: 'File Excel tidak dapat dibaca oleh browser.' })
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

                    const nip = normalizedRow['nip'] || normalizedRow['no induk']
                    const fullName = normalizedRow['nama lengkap'] || normalizedRow['nama_lengkap'] || normalizedRow['nama'] || normalizedRow['full_name']
                    const email = normalizedRow['email']
                    const phone = normalizedRow['no telepon'] || normalizedRow['telepon'] || normalizedRow['no hp'] || normalizedRow['phone']

                    if (!nip || !fullName || !email) {
                        errors.push(`Baris ${i + 2}: Kolom NIP, Nama Lengkap, atau Email wajib diisi`)
                        continue
                    }

                    formattedData.push({
                        nip: String(nip).trim(),
                        full_name: String(fullName).trim(),
                        email: String(email).trim(),
                        phone: phone ? String(phone).trim() : null
                    })
                }

                if (errors.length > 0) {
                    const errorMsg = 'Harap perbaiki file Excel Anda:\n\n' + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...dan lainnya' : '')
                    setAlertConfig({ open: true, type: 'error', title: 'Data Tidak Sesuai', message: errorMsg })
                    return
                }

                if (formattedData.length > 0) {
                    let successCount = 0;
                    let errorCount = 0;

                    for (const teacherData of formattedData) {
                        try {
                            // 1. Create di Auth Supabase
                            const res = await fetch('/api/admin/create-user', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    email: teacherData.email,
                                    password: 'guru123',
                                    full_name: teacherData.full_name,
                                    role: 'guru'
                                })
                            });

                            const authData = await res.json();

                            if (!res.ok) {
                                console.error('Auth error for', teacherData.email, authData.error);
                                errorCount++;
                                continue;
                            }

                            // 2. Insert ke table teachers
                            const { error: dbError } = await supabase.from('teachers').insert({
                                ...teacherData,
                                user_id: authData.user.id
                            });

                            if (dbError) {
                                console.error('DB error for', teacherData.email, dbError);
                                errorCount++;
                            } else {
                                successCount++;
                            }
                        } catch (err) {
                            console.error('Unhandled error importing teacher', err);
                            errorCount++;
                        }
                    }

                    if (successCount > 0) {
                        setAlertConfig({ open: true, type: 'success', title: 'Selesai', message: `${successCount} data guru berhasil diimpor & dibuat akunnya. ${errorCount > 0 ? `(${errorCount} gagal)` : ''}` })
                        loadData()
                    } else {
                        setAlertConfig({ open: true, type: 'error', title: 'Gagal Mengimpor', message: 'Semua data gagal diimpor. Pastikan Email belum terdaftar sebelumnya.' })
                    }
                } else {
                    setAlertConfig({ open: true, type: 'error', title: 'Format Tidak Valid', message: 'Tidak ada data valid untuk diimpor.' })
                }
            } catch (err) {
                console.error('Error parsing Excel:', err)
                setAlertConfig({ open: true, type: 'error', title: 'Gagal Membaca File', message: 'Terjadi kesalahan saat membaca file Excel.' })
            } finally {
                setImporting(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const filtered = teachers.filter(t =>
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.nip.toLowerCase().includes(search.toLowerCase())
    )

    const columns = [
        { key: 'nip', label: 'NIP' },
        {
            key: 'full_name', label: 'Nama Guru',
            render: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        {item.full_name?.charAt(0)}
                    </div>
                    <span className="font-medium text-white">{item.full_name}</span>
                </div>
            ),
        },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Telepon', render: (item: any) => item.phone || '-' },
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
                title="Data Guru"
                description="Kelola data guru"
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

            <div className="relative mb-6">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text" placeholder="Cari nama atau NIP..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-80 pl-12 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
            </div>

            <div className="space-y-4">
                <Table columns={columns} data={paginatedData} loading={loading} emptyMessage="Tidak ada data guru" />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={totalItems}
                />
            </div>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Guru' : 'Tambah Guru'}>
                <div className="space-y-4">
                    <Input label="NIP" placeholder="1234567890" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} required />
                    <Input label="Nama Lengkap" placeholder="Nama guru" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    <Input label="Email" type="email" placeholder="guru@sekolah.ac.id" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    <Input label="No. Telepon" placeholder="08xxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </div>
            </Modal>

            <AlertModal
                {...alertConfig}
                onClose={() => setAlertConfig(prev => ({ ...prev, open: false }))}
            />
        </div>
    )
}
