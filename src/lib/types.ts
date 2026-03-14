export type UserRole = 'admin' | 'guru' | 'siswa' | 'orang_tua' | 'kepala_sekolah'

export interface Profile {
    id: string
    email: string
    full_name: string
    role: UserRole
    avatar_url?: string
    created_at: string
}

export interface SchoolYear {
    id: string
    name: string
    start_date: string
    end_date: string
    is_active: boolean
    created_at: string
}

export interface Semester {
    id: string
    school_year_id: string
    semester_number: number
    is_active: boolean
    school_year?: SchoolYear
    created_at: string
}

export interface Class {
    id: string
    name: string
    level: number
    created_at: string
    student_count?: number
}

export interface Subject {
    id: string
    name: string
    code: string
    created_at: string
}

export interface Student {
    id: string
    user_id?: string
    nis: string
    full_name: string
    class_id: string
    gender: 'L' | 'P'
    parent_user_id?: string
    class?: Class
    created_at: string
}

export interface Teacher {
    id: string
    user_id?: string
    nip: string
    full_name: string
    email: string
    phone?: string
    created_at: string
}

export interface TeacherSubject {
    id: string
    teacher_id: string
    subject_id: string
    class_id: string
    semester_id: string
    teacher?: Teacher
    subject?: Subject
    class?: Class
    semester?: Semester
}

export interface ScoreType {
    id: string
    name: string
    code: string
    weight: number
    semester_id: string
}

export interface Score {
    id: string
    student_id: string
    subject_id: string
    score_type_id: string
    semester_id: string
    value: number
    score_number: number
    student?: Student
    subject?: Subject
    score_type?: ScoreType
    created_at: string
}

export interface ScoreRecap {
    student_id: string
    student_name: string
    nis: string
    avg_harian: number | null
    avg_tugas: number | null
    uts: number | null
    uas: number | null
    nilai_akhir: number | null
    predikat: string
}

export interface DashboardStats {
    total_students: number
    total_teachers: number
    total_classes: number
    total_subjects: number
    input_progress: number
}

export function getPredikat(nilai: number): string {
    if (nilai >= 90) return 'A'
    if (nilai >= 80) return 'B'
    if (nilai >= 70) return 'C'
    return 'D'
}

export function getPredikatColor(predikat: string): string {
    switch (predikat) {
        case 'A': return 'text-emerald-400'
        case 'B': return 'text-blue-400'
        case 'C': return 'text-yellow-400'
        case 'D': return 'text-red-400'
        default: return 'text-gray-400'
    }
}

export function calculateNilaiAkhir(
    avgHarian: number | null,
    avgTugas: number | null,
    uts: number | null,
    uas: number | null,
    weights = { harian: 0.3, tugas: 0.2, uts: 0.25, uas: 0.25 }
): number | null {
    if (avgHarian === null && avgTugas === null && uts === null && uas === null) {
        return null
    }
    const h = avgHarian ?? 0
    const t = avgTugas ?? 0
    const u = uts ?? 0
    const a = uas ?? 0
    return Math.round((h * weights.harian + t * weights.tugas + u * weights.uts + a * weights.uas) * 100) / 100
}
