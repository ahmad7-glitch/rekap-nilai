'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { AlertModal } from '@/components/ui'

type AlertType = 'success' | 'error' | 'loading'

interface AlertState {
    open: boolean
    type: AlertType
    title: string
    message: string
}

interface ConfirmState {
    open: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
}

interface AlertContextType {
    showAlert: (params: { type: AlertType; title: string; message: string }) => void
    hideAlert: () => void
    showConfirm: (params: { title: string; message: string }) => Promise<boolean>
    isDirty: boolean
    setIsDirty: (dirty: boolean) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
    const [isDirty, setIsDirty] = useState(false)
    const [alert, setAlert] = useState<AlertState>({
        open: false,
        type: 'loading',
        title: '',
        message: '',
    })

    const [confirm, setConfirm] = useState<ConfirmState>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {},
    })

    const showAlert = useCallback(({ type, title, message }: { type: AlertType; title: string; message: string }) => {
        setAlert({ open: true, type, title, message })
    }, [])

    const hideAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, open: false }))
    }, [])

    const showConfirm = useCallback(({ title, message }: { title: string; message: string }) => {
        return new Promise<boolean>((resolve) => {
            setConfirm({
                open: true,
                title,
                message,
                onConfirm: () => {
                    setConfirm(prev => ({ ...prev, open: false }))
                    resolve(true)
                },
                onCancel: () => {
                    setConfirm(prev => ({ ...prev, open: false }))
                    resolve(false)
                },
            })
        })
    }, [])

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert, showConfirm, isDirty, setIsDirty }}>
            {children}
            
            {/* Global Alert Modal */}
            <AlertModal
                open={alert.open}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onClose={hideAlert}
            />

            {/* Global Confirm Modal */}
            <ConfirmModal
                open={confirm.open}
                title={confirm.title}
                message={confirm.message}
                onConfirm={confirm.onConfirm}
                onCancel={confirm.onCancel}
            />
        </AlertContext.Provider>
    )
}

export function useAlert() {
    const context = useContext(AlertContext)
    if (!context) throw new Error('useAlert must be used within AlertProvider')
    return context
}

// Internal ConfirmModal component used by the provider
function ConfirmModal({ open, title, message, onConfirm, onCancel }: { 
    open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void 
}) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-sm bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-6 flex flex-col items-center text-center transform transition-all duration-300 animate-in fade-in zoom-in-95">
                
                {/* Warning Icon */}
                <div className="mb-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 mb-6">{message}</p>

                <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Ya, Hapus
                    </button>
                </div>
            </div>
        </div>
    )
}
