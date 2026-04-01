"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Mail } from "lucide-react";
import { signIn } from "next-auth/react";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm bg-background border border-border rounded-2xl p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold text-center mb-1 mt-2">Entrar ou cadastrar-se</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Consultas ilimitadas, histórico salvo e recomendações personalizadas de strains e tratamentos.</p>

            <div className="flex flex-col gap-2.5">
              <button onClick={() => signIn("google", { callbackUrl: "/chat" })} className="flex items-center justify-center gap-3 w-full h-11 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continuar com Google
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <a href="/login" className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors">
                <Mail size={16} />
                Continuar com email
              </a>
            </div>

            <p className="text-[11px] text-muted-foreground text-center mt-5">
              Ao continuar, você concorda com os Termos de Uso e Política de Privacidade.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
