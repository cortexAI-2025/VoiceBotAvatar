"use client";

import { useRef, useState } from "react";

type SpeechWindow = Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
const locales: Record<string, string> = { fr: "fr-FR", en: "en-US", ar: "ar-MA" };

export default function GeminiVoiceDemo() {
  const [language, setLanguage] = useState("fr");
  const [prompt, setPrompt] = useState("Tu es un assistant vocal professionnel, clair et concis.");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<any>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true); setError(""); setReply("");
    try {
      const base = process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8000";
      const response = await fetch(base + "/api/gemini/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, system_prompt: prompt })
      });
      if (!response.ok) throw new Error("Gemini API error (" + response.status + ")");
      const data: { reply: string } = await response.json();
      setReply(data.reply);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.lang = locales[language];
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur inconnue"); }
    finally { setBusy(false); }
  }

  function listen() {
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { setError("Reconnaissance vocale indisponible dans ce navigateur. Utilisez le texte."); return; }
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = locales[language]; instance.interimResults = false;
    instance.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript;
      setMessage(spoken); void send(spoken);
    };
    instance.onerror = (event: any) => setError("Micro : " + event.error);
    instance.start();
  }

  return <main className="mx-auto max-w-2xl p-8 space-y-5">
    <h1 className="text-3xl font-semibold">AIWorkPay — Gemini Voice POC</h1>
    <p>Prototype : reconnaissance et synthèse vocales du navigateur, raisonnement Gemini. Pas encore Gemini Live.</p>
    <label className="block">Langue
      <select className="block w-full border rounded p-2 text-black" value={language} onChange={e => setLanguage(e.target.value)}>
        <option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option>
      </select>
    </label>
    <label className="block">Instructions de l'agent
      <textarea className="block w-full border rounded p-2 text-black" value={prompt} onChange={e => setPrompt(e.target.value)} />
    </label>
    <label className="block">Message
      <textarea className="block w-full border rounded p-2 text-black" value={message} onChange={e => setMessage(e.target.value)} />
    </label>
    <div className="flex gap-3">
      <button className="border rounded px-4 py-2" onClick={listen} disabled={busy}>🎙 Parler</button>
      <button className="border rounded px-4 py-2" onClick={() => void send(message)} disabled={busy}>Envoyer</button>
      <button className="border rounded px-4 py-2" onClick={() => window.speechSynthesis?.cancel()}>Arrêter la voix</button>
    </div>
    {busy && <p>Gemini réfléchit…</p>}
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {reply && <section aria-live="polite"><h2 className="font-bold">Réponse</h2><p>{reply}</p></section>}
  </main>;
}
