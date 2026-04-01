"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ChevronDown, Leaf, MessageCircle, Phone, Instagram, Mail, Star, Shield, BookOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";


function renderMd(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line: string, i: number) => {
    const isBullet = line.trim().startsWith("- ");
    const cleaned = isBullet ? line.trim().slice(2) : line;
    const html = cleaned.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (isBullet) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: html }} />;
    if (!cleaned.trim()) return <br key={i} />;
    return <p key={i} className="text-sm leading-relaxed mb-1.5" dangerouslySetInnerHTML={{ __html: html }} />;
  });
}
export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const placeholders = [
    "Quais as melhores strains pra ansiedade?",
    "Cannabis medicinal é legal no Brasil?",
    "Como fazer óleo RSO em casa?",
    "Qual o pH ideal pra cultivo indoor?",
    "Interações da cannabis com medicamentos",
    "O que é o sistema endocanabinoide?",
  ];

  useEffect(() => {
    if (messages.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((p) => (p + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const isLoggedIn = status === "authenticated" && !!session?.user?.email && !session.user.email.startsWith("guest-");

  const handleEntrar = () => {
    if (isLoggedIn) {
      router.push("/chat");
    } else {
      setShowAuthModal(true);
    }
  };
  const MAX_FREE = 2;

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  }, [input]);

  const scrollToContent = () => contentRef.current?.scrollIntoView({ behavior: "smooth" });

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    if (msgCount >= MAX_FREE) { handleEntrar(); return; }
    setMessages(p => [...p, { role: "user", content: text.trim() }]);
    setInput(""); setLoading(true); setMsgCount(c => c + 1);
    setMessages(p => [...p, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/landing-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history: messages.filter(m => m.content).map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(p => { const u = [...p]; u[u.length-1] = { role: "assistant", content: data.error ? "Desculpe, ocorreu um erro." : data.response }; return u; });
    } catch { setMessages(p => { const u = [...p]; u[u.length-1] = { role: "assistant", content: "Erro de conexao." }; return u; }); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Canna<span className="text-green-500">Guia</span></span>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <button onClick={() => router.push("/chat")} className="text-sm px-4 py-2 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors">Ir pro chat</button>
            ) : (
              <>
                <button onClick={() => setShowAuthModal(true)} className="text-[13px] px-3 sm:px-4 py-1.5 sm:py-2 border border-white/20 text-white rounded-full font-medium hover:bg-white/10 transition-colors">Entrar</button>
                <button onClick={() => signIn("guest", { callbackUrl: "/chat" })} className="text-[13px] px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors">Experimente a CannaGuia</button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="min-h-[100dvh] flex flex-col items-center pt-20 sm:pt-14 sm:justify-center px-4 sm:px-6 relative pb-16">
        <div className="w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center relative">
              {/* Orbital rings */}
              <motion.div
                className="absolute w-32 h-32 rounded-full border border-green-500/15"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-400/60"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <motion.div
                className="absolute w-24 h-24 rounded-full border border-green-500/10"
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              >
                <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full bg-green-300/50"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.div>

              {/* Core glow */}
              <motion.div
                className="absolute w-18 h-18 rounded-2xl bg-green-500/8"
                animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Icon morphing between leaf and sparkle */}
              <div className="relative w-18 h-18 rounded-2xl bg-green-500/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-400/10"
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute w-full h-full"
                >
                  <div className="absolute top-2 right-2 w-0.5 h-0.5 rounded-full bg-green-400/40" />
                  <div className="absolute bottom-3 left-2 w-0.5 h-0.5 rounded-full bg-green-300/30" />
                  <div className="absolute top-4 left-3 w-0.5 h-0.5 rounded-full bg-green-400/20" />
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 0.85, 1],
                    rotate: [0, -8, 8, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Leaf className="w-9 h-9 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                </motion.div>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">Sua consultora canábica<br/>com inteligência artificial</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">Orientação sobre strains, cultivo, regulamentação e cannabis medicinal. Base de 3.000+ documentos.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full">
            {messages.length > 0 && (
              <div className="mb-4 space-y-3 max-h-[300px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[85%] rounded-xl px-4 py-2.5 text-sm " + (msg.role === "user" ? "bg-green-600 text-white" : "bg-card border border-border")}>
                      {msg.content ? (msg.role === "assistant" ? <div className="space-y-0.5">{renderMd(msg.content)}</div> : <span>{msg.content}</span>) : <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: d+"ms"}} />)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden focus-within:border-green-500/30 focus-within:shadow-md transition-all">
                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholders[placeholderIdx]} rows={1} disabled={loading} className="w-full resize-none bg-transparent text-sm leading-6 text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-[120px] px-4 pt-3 pb-0 placeholder:transition-opacity" />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{msgCount === 0 ? "Experimente sem cadastro" : ""}</span>
                  <button type="submit" disabled={loading || !input.trim()} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                    {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowUp size={15} />}
                  </button>
                </div>
              </div>
            </form>
            {messages.length === 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["Strains pra ansiedade","Cannabis e legal?","Como fazer oleo RSO","Cultivo indoor"].map(s => (
                  <button key={s} onClick={() => sendMessage(s)} className="text-sm px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">{s}</button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
        <motion.button onClick={scrollToContent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 sm:absolute sm:bottom-8 left-1/2 sm:-translate-x-1/2 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors animate-bounce mx-auto"><ChevronDown size={20} /></motion.button>
      </section>

      <section ref={contentRef} className="py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="w-40 h-40 rounded-full bg-card border-2 border-green-500/20 flex items-center justify-center shrink-0"><Leaf className="w-16 h-16 text-green-500/30" /></div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Maria &mdash; Educadora Canábica</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">Especialista em cannabis medicinal com anos de experiência orientando pacientes e cultivadores. Maria oferece consultorias personalizadas para quem busca o Habeas Corpus para cultivo, orientação sobre tratamentos com cannabis medicinal, e acompanhamento completo para cultivo.</p>
              <p className="text-muted-foreground leading-relaxed">Sua missão é democratizar o acesso à informação sobre cannabis medicinal no Brasil, ajudando pessoas a encontrarem o tratamento adequado de forma segura e legal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">O que oferecemos</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-border bg-background"><MessageCircle className="w-8 h-8 text-green-500 mb-4" /><h3 className="font-semibold mb-2">CannaGuia IA</h3><p className="text-sm text-muted-foreground mb-4">Assistente virtual com base de 3.000+ documentos sobre strains, cultivo, regulamentação e cannabis medicinal.</p><p className="text-2xl font-bold">R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mes</span></p></div>
            <div className="p-6 rounded-xl border border-green-500/30 bg-background relative"><div className="absolute -top-3 left-4 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">Popular</div><BookOpen className="w-8 h-8 text-green-500 mb-4" /><h3 className="font-semibold mb-2">Consultoria com Maria</h3><p className="text-sm text-muted-foreground mb-4">Atendimento personalizado: orientação para HC, acompanhamento de cultivo e tratamento medicinal.</p><p className="text-2xl font-bold">A partir de R$ 200</p></div>
            <div className="p-6 rounded-xl border border-border bg-background"><Shield className="w-8 h-8 text-green-500 mb-4" /><h3 className="font-semibold mb-2">Habeas Corpus</h3><p className="text-sm text-muted-foreground mb-4">Orientação completa sobre o processo de obtenção do HC para cultivo pessoal no Brasil.</p><p className="text-sm text-muted-foreground">Consulte valores</p></div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">O que dizem sobre nós</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[{name:"Carlos M.",text:"A CannaGuia me ajudou a encontrar a strain perfeita pro meu tratamento de ansiedade. Informação de qualidade!"},{name:"Ana P.",text:"A consultoria da Maria foi essencial pra eu conseguir meu HC. Profissional incrível e muito atenciosa."},{name:"Roberto S.",text:"Uso a IA diariamente pra tirar dúvidas sobre cultivo. Melhor investimento que fiz."},{name:"Lúcia F.",text:"Finalmente um serviço sério sobre cannabis medicinal no Brasil. Recomendo demais!"}].map((t, i) => (
              <div key={i} className="p-5 rounded-xl border border-border bg-card">
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, j) => <Star key={j} size={14} className="fill-green-500 text-green-500" />)}</div>
                <p className="text-sm text-muted-foreground mb-3">&ldquo;{t.text}&rdquo;</p>
                <p className="text-sm font-medium">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-card/50 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Fale com a Maria</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Tire suas dúvidas ou agende uma consultoria personalizada.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"><Phone size={18} />WhatsApp</a>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl hover:bg-accent transition-colors"><Instagram size={18} />Instagram</a>
            <a href="mailto:contato@cannaguia.com" className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl hover:bg-accent transition-colors"><Mail size={18} />Email</a>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-medium">Canna<span className="text-green-500">Guia</span></span>
          <p className="text-xs text-muted-foreground">Cannabis medicinal é para fins educacionais. Não substitui consulta médica.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-background border border-border rounded-2xl p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
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
    </div>
  );
}
