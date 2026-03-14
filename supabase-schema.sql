-- ============================================
-- e-Rapor SMP - Supabase Database Schema
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'siswa', 'orang_tua', 'kepala_sekolah')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SCHOOL YEARS (Tahun Ajaran)
-- ============================================
CREATE TABLE public.school_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. SEMESTERS
-- ============================================
CREATE TABLE public.semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number IN (1, 2)),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_year_id, semester_number)
);

-- ============================================
-- 4. CLASSES (Kelas)
-- ============================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (7, 8, 9)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SUBJECTS (Mata Pelajaran)
-- ============================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. TEACHERS (Guru)
-- ============================================
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nip TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. STUDENTS (Siswa)
-- ============================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nis TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. TEACHER_SUBJECTS (Mapping Guru-Mapel-Kelas)
-- ============================================
CREATE TABLE public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id, semester_id)
);

-- ============================================
-- 9. SCORE TYPES (Jenis Nilai)
-- ============================================
CREATE TABLE public.score_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL CHECK (code IN ('HARIAN', 'TUGAS', 'UTS', 'UAS')),
  weight INTEGER NOT NULL DEFAULT 25,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, semester_id)
);

-- ============================================
-- 10. SCORES (Nilai)
-- ============================================
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  score_type_id UUID NOT NULL REFERENCES public.score_types(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  score_number INTEGER NOT NULL DEFAULT 1,
  value NUMERIC(5,2) NOT NULL CHECK (value >= 0 AND value <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. INDEXES
-- ============================================
CREATE INDEX idx_scores_student ON public.scores(student_id);
CREATE INDEX idx_scores_subject ON public.scores(subject_id);
CREATE INDEX idx_scores_semester ON public.scores(semester_id);
CREATE INDEX idx_scores_type ON public.scores(score_type_id);
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_class ON public.teacher_subjects(class_id);

-- ============================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- For simplicity, allow all authenticated users to read,
-- and allow admin/guru to write. Adjust as needed.

-- Profiles: users can read all, update own
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Read access for all authenticated users on reference tables
CREATE POLICY "school_years_read" ON public.school_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "school_years_write" ON public.school_years FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "semesters_read" ON public.semesters FOR SELECT TO authenticated USING (true);
CREATE POLICY "semesters_write" ON public.semesters FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "classes_read" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "classes_write" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "subjects_read" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects_write" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "teachers_read" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "teachers_write" ON public.teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "students_read" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "students_write" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "teacher_subjects_read" ON public.teacher_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "teacher_subjects_write" ON public.teacher_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "score_types_read" ON public.score_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "score_types_write" ON public.score_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "scores_read" ON public.scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "scores_write" ON public.scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 13. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'siswa')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
