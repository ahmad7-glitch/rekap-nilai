'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'

// ─── Button ──────────────────────────────────────
interface ButtonProps {
    children: ReactNode
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    onClick?: () => void
    type?: 'button' | 'submit'
    disabled?: boolean
    className?: string
    icon?: ReactNode
}

export function Button({
    children, variant = 'primary', size = 'md', onClick, type = 'button',
    disabled = false, className = '', icon
}: ButtonProps) {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants: Record<string, string> = {
        primary: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 focus:ring-blue-500',
        secondary: 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 border border-gray-600/50 focus:ring-gray-500',
        danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/25 focus:ring-red-500',
        ghost: 'hover:bg-white/5 text-gray-400 hover:text-white focus:ring-gray-500',
    }
    const sizes: Record<string, string> = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-7 py-3 text-base',
    }
    return (
        <button type={type} onClick={onClick} disabled={disabled}
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
            {icon}{children}
        </button>
    )
}

// ─── Input ───────────────────────────────────────
interface InputProps {
    label?: string
    type?: string
    value: string | number
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    required?: boolean
    id?: string
    min?: number
    max?: number
    step?: number
    className?: string
    error?: string
}

export function Input({
    label, type = 'text', value, onChange, placeholder, required,
    id, min, max, step, className = '', error
}: InputProps) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <input
                id={id} type={type} value={value} onChange={onChange}
                placeholder={placeholder} required={required}
                min={min} max={max} step={step}
                className={`w-full px-4 py-2.5 bg-gray-800/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 ${error ? 'border-red-500/50' : 'border-gray-700/50'
                    }`}
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    )
}

// ─── Select ──────────────────────────────────────
interface SelectProps {
    label?: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    options: { value: string; label: string }[]
    required?: boolean
    id?: string
    className?: string
    placeholder?: string
}

export function Select({ label, value, onChange, options, required, id, className = '', placeholder }: SelectProps) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <select
                id={id} value={value} onChange={onChange} required={required}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}

// ─── Modal ───────────────────────────────────────
interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    const sizes: Record<string, string> = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div ref={ref} className={`relative w-full ${sizes[size]} bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 transform transition-all duration-300 animate-in fade-in zoom-in-95`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    )
}

// ─── AlertModal ──────────────────────────────────
export interface AlertModalProps {
    open: boolean
    type: 'loading' | 'success' | 'error'
    title: string
    message: string
    onClose?: () => void
}

export function AlertModal({ open, type, title, message, onClose }: AlertModalProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={type !== 'loading' ? onClose : undefined} />
            <div className="relative w-full max-w-sm bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-6 flex flex-col items-center text-center transform transition-all duration-300 animate-in fade-in zoom-in-95">

                {/* Icon */}
                <div className="mb-4">
                    {type === 'loading' && (
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    )}
                    {type === 'success' && (
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                    {type === 'error' && (
                        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 mb-6 whitespace-pre-wrap">{message}</p>

                {type !== 'loading' && (
                    <Button onClick={onClose} className="w-full">
                        Tutup
                    </Button>
                )}
            </div>
        </div>
    )
}

// ─── Card ────────────────────────────────────────
interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    onClick?: () => void
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`bg-gray-800/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 ${hover ? 'hover:bg-gray-800/70 hover:border-white/10 hover:shadow-xl hover:shadow-black/20 cursor-pointer transition-all duration-300' : ''
                } ${className}`}
        >
            {children}
        </div>
    )
}

// ─── StatCard ────────────────────────────────────
interface StatCardProps {
    label: string
    value: string | number
    icon: ReactNode
    color?: string
    trend?: string
}

export function StatCard({ label, value, icon, color = 'from-blue-500 to-blue-600', trend }: StatCardProps) {
    return (
        <Card className="relative overflow-hidden">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-400 font-medium">{label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    {trend && <p className="text-xs text-emerald-400 mt-1">{trend}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                    {icon}
                </div>
            </div>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-5`} />
        </Card>
    )
}

// ─── Table ───────────────────────────────────────
interface Column<T> {
    key: string
    label: string
    render?: (item: T) => ReactNode
    className?: string
}

interface TableProps<T> {
    columns: Column<T>[]
    data: T[]
    loading?: boolean
    emptyMessage?: string
    onRowClick?: (item: T) => void
}

export function Table<T extends Record<string, unknown>>({
    columns, data, loading = false, emptyMessage = 'Tidak ada data', onRowClick
}: TableProps<T>) {
    if (loading) {
        return (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8">
                <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Memuat data...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {columns.map(col => (
                                <th key={col.key} className={`px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider ${col.className || ''}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 text-sm">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, i) => (
                                <tr
                                    key={i}
                                    onClick={() => onRowClick?.(item)}
                                    className={`hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map(col => (
                                        <td key={col.key} className={`px-6 py-4 text-sm text-gray-300 ${col.className || ''}`}>
                                            {col.render ? col.render(item) : String(item[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── Badge ───────────────────────────────────────
interface BadgeProps {
    children: ReactNode
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
    const variants: Record<string, string> = {
        default: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        danger: 'bg-red-500/10 text-red-400 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${variants[variant]}`}>
            {children}
        </span>
    )
}

// ─── LoadingScreen ───────────────────────────────
export function LoadingScreen() {
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Memuat...</p>
            </div>
        </div>
    )
}

// ─── PageHeader ──────────────────────────────────
interface PageHeaderProps {
    title: string
    description?: string
    actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    )
}

// ─── EmptyState ──────────────────────────────────
interface EmptyStateProps {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            {icon && <div className="text-gray-600 mb-4">{icon}</div>}
            <h3 className="text-lg font-semibold text-gray-300 mb-1">{title}</h3>
            {description && <p className="text-sm text-gray-500 mb-4 text-center max-w-md">{description}</p>}
            {action}
        </div>
    )
}

// ─── Pagination ──────────────────────────────────
interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    itemsPerPage: number
    onItemsPerPageChange: (items: number) => void
    totalItems: number
    itemsPerPageOptions?: number[]
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
    itemsPerPageOptions = [15, 30, 50, 100]
}: PaginationProps) {
    if (totalItems === 0) return null

    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm text-gray-400">
            <div className="flex items-center gap-3">
                <span className="whitespace-nowrap">Tampilkan:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                        onItemsPerPageChange(Number(e.target.value))
                        onPageChange(1) // Reset to page 1 on size change
                    }}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                    {itemsPerPageOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <span className="whitespace-nowrap ml-2">
                    Menampilkan {startItem}-{endItem} dari {totalItems} data
                </span>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-white/10 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Sebelumnya
                    </button>

                    <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            // Simple logic to show current, first, last, and immediate neighbors
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => onPageChange(page)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page
                                                ? 'bg-blue-500 hover:bg-blue-600 text-white font-medium'
                                                : 'hover:bg-white/10 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )
                            } else if (
                                page === currentPage - 2 ||
                                page === currentPage + 2
                            ) {
                                return <span key={page} className="px-1 text-gray-500">...</span>
                            }
                            return null
                        })}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-white/10 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Selanjutnya
                    </button>
                </div>
            )}
        </div>
    )
}
