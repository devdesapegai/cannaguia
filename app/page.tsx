"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ChevronDown, Leaf, MessageCircle, Phone, Instagram, Mail, Star, Shield, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_FREE = 2;

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  }, [input]);

  const scrollToContent = () => contentRef.current?.scrollIntoView({ behavior: "smooth" });

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    if (msgCount >= MAX_FREE) { router.push("/login"); return; }
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Canna<span className="text-green-500">Guia</span></span>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Entrar</a>
            <a href="/register" className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Criar conta</a>
          </div>
        </div>
      </header>

      <section className="min-h-screen flex flex-col items-center justify-center pt-14 px-4 sm:px-6 relative">
        <div className="w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-500/10 flex items-center justify-center"><Leaf className="w-8 h-8 text-green-500" /></div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">Sua consultora canabica<br/>com inteligencia artificial</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">Orientacao sobre strains, cultivo, regulamentacao e cannabis medicinal. Base de 3.000+ documentos.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full">
            {messages.length > 0 && (
              <div className="mb-4 space-y-3 max-h-[300px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[85%] rounded-xl px-4 py-2.5 text-sm " + (msg.role === "user" ? "bg-green-600 text-white" : "bg-card border border-border")}>
                      {msg.content || <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: d+"ms"}} />)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden focus-within:border-green-500/30 focus-within:shadow-md transition-all">
                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunte sobre cannabis medicinal..." rows={1} disabled={loading} className="w-full resize-none bg-transparent text-sm leading-6 text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-[120px] px-4 pt-3 pb-0" />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{MAX_FREE - msgCount > 0 ? (MAX_FREE - msgCount) + " mensagens gratis" : ""}</span>
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
        <motion.button onClick={scrollToContent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors animate-bounce"><ChevronDown size={20} /></motion.button>
      </section>

      <section ref={contentRef} className="py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="w-40 h-40 rounded-full bg-card border-2 border-green-500/20 flex items-center justify-center shrink-0"><Leaf className="w-16 h-16 text-green-500/30" /></div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Maria &mdash; Educadora Canabica</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">Especialista em cannabis medicinal com anos de experiencia orientando pacientes e cultivadores. Maria oferece consultorias personalizadas para quem busca o Habeas Corpus para cultivo, orientacao sobre tratamentos com cannabis medicinal, e acompanhamento completo para cultivo.</p>
              <p className="text-muted-foreground leading-relaxed">Sua missao e democratizar o acesso a informacao sobre cannabis medicinal no Brasil, ajudando pessoas a encontrarem o tratamento adequado de forma segura e legal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">O que oferecemos</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-border bg-background"><MessageCircle className="w-8 h-8 text-green-500 mb-4" /><h3 className="font-semibold mb-2">CannaGuia IA</h3><p className="text-sm text-muted-foreground mb-4">Assistente virtual com base de 3.000+ documentos sobre strains, cultivo, regulamentacao e cannabis medicinal.</p><p className="text-2xl font-bold">R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mes</span></p></div>
            <div className="p-6 rounded-xl border border-green-500/30 bg-background relative"><div className="absolute -top-3 left-4 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">Popular</div><BookOpen className="w-8 h-8 text-green-500 mb-4" /><h3 className="font-semibold mb-2">Consultoria com Maria</h3><p className="text-sm text-muted-foreground mb-4">Atendimento personalizado: orientacao para HC, acompanhamento de cultivo, e tratamento medicinal.</p><p className="text-2xl font-bold">A partir de R$ 200</p></div>
            <div className="p-6 rounded-xl border border-border bg-background"><Shield className="w-8 h-8 text-green-500 mb-4" /><h3 className="font-semibold mb-2">Habeas Corpus</h3><p className="text-sm text-muted-foreground mb-4">Orientacao completa sobre o processo de obtencao do HC para cultivo pessoal no Brasil.</p><p className="text-sm text-muted-foreground">Consulte valores</p></div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">O que dizem sobre nos</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[{name:"Carlos M.",text:"A CannaGuia me ajudou a encontrar a strain perfeita pro meu tratamento de ansiedade. Informacao de qualidade!"},{name:"Ana P.",text:"A consultoria da Maria foi essencial pra eu conseguir meu HC. Profissional incrivel e muito atenciosa."},{name:"Roberto S.",text:"Uso a IA diariamente pra tirar duvidas sobre cultivo. Melhor investimento que fiz."},{name:"Lucia F.",text:"Finalmente um servico serio sobre cannabis medicinal no Brasil. Recomendo demais!"}].map((t, i) => (
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
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Tire suas duvidas ou agende uma consultoria personalizada.</p>
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
          <p className="text-xs text-muted-foreground">Cannabis medicinal e para fins educacionais. Nao substitui consulta medica.</p>
        </div>
      </footer>
    </div>
  );
}
