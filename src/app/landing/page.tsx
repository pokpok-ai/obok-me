"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { error: dbError } = await supabase
        .from("waitlist")
        .insert({ email: email.trim().toLowerCase() });

      if (dbError) {
        if (dbError.code === "23505") {
          setSubmitted(true);
        } else {
          setError("Coś poszło nie tak. Spróbuj ponownie.");
        }
      } else {
        setSubmitted(true);
        setEmail("");
      }
    } catch {
      setError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#e8e0d1] text-[#0a3b44] overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#0a3b44]/10 bg-[#e8e0d1]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tracking-widest text-[#0a3b44]">OBOK.ME</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-widest text-[#0a3b44]/60">
            <button onClick={() => scrollTo("features")} className="hover:text-[#0a3b44] transition-colors">
              Funkcje
            </button>
            <button onClick={() => scrollTo("audience")} className="hover:text-[#0a3b44] transition-colors">
              Dla kogo
            </button>
            <a href="/" className="bg-[#f5f900] hover:bg-[#e5e900] text-[#0a3b44] px-4 py-2 rounded-none text-xs font-mono font-bold tracking-widest transition-colors">
              OTWÓRZ MAPĘ
            </a>
          </div>
        </div>
      </nav>

      {/* ASCII Dither Header */}
      <div className="pt-14 bg-[#0a3b44] text-[#e8e0d1] overflow-hidden">
        <pre className="text-[8px] md:text-[10px] leading-none text-center text-[#e8e0d1]/30 select-none py-2 font-mono">
{`▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
║       . . : : ░ ▒ ▓ ▓ SCANNING WARSAW REAL ESTATE ▓ ▓ ▒ ░ : : . .       ║
║       →→→ █ █ ░ ░     168,000+ TRANSACTIONS LOADED     ░ ░ █ █ ←←←     ║
▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼`}
        </pre>
      </div>

      {/* Hero */}
      <section className="py-20 px-6 bg-[#0a3b44] text-[#e8e0d1]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-[#e8e0d1]/20 rounded-none px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-[#e8e0d1]/60 mb-8">
            PRAWDZIWE CENY TRANSAKCYJNE · RCN
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
            Twoje mieszkanie.
            <br />
            <span className="text-[#f5f900]">
              Prawdziwa cena.
            </span>
            <br />
            W 30 sekund.
          </h1>
          <p className="text-lg text-[#e8e0d1]/70 mt-6 max-w-2xl mx-auto leading-relaxed">
            obok.me pokazuje realne ceny transakcyjne z Rejestru Cen Nieruchomości — nie oferty, nie estymaty. 168 000+ transakcji w Warszawie na jednej mapie.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button
              onClick={() => scrollTo("waitlist")}
              className="bg-[#f5f900] hover:bg-[#e5e900] text-[#0a3b44] px-8 py-3.5 rounded-none font-mono font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Dołącz do waitlisty →
            </button>
            <a
              href="/"
              className="border border-[#e8e0d1]/30 hover:border-[#e8e0d1]/60 text-[#e8e0d1] px-8 py-3.5 rounded-none font-mono font-bold text-sm uppercase tracking-widest transition-colors"
            >
              Otwórz mapę
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-mono uppercase tracking-widest text-[#e8e0d1]/40">
            <span>168K+ TRANSAKCJI</span>
            <span>|</span>
            <span>WARSZAWA</span>
            <span>|</span>
            <span>DANE Z AKTÓW NOTARIALNYCH</span>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h6 className="text-xs font-mono uppercase tracking-widest text-[#0a3b44]/40 text-center mb-4">
            01 // DIAGNOSTYKA
          </h6>
          <h2 className="text-3xl md:text-4xl font-black text-center text-[#0a3b44] mb-16">
            Szukałeś kiedyś ceny mieszkania w Warszawie?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#fdfdfc] border-2 border-[#0a3b44]/10 p-8">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-red-600 mb-6">
                ✕ Stary sposób
              </h3>
              <ul className="space-y-4">
                {[
                  "Portale z cenami ofertowymi, nie transakcyjnymi",
                  "Raporty za 200 zł z ogólnikowymi danymi",
                  "Excel i ręczne porównywanie",
                  '"Wartość? No zależy od dzielnicy..."',
                  "Brak danych historycznych i trendów",
                  "Tygodnie researchu",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#0a3b44]/60 text-sm">
                    <span className="text-red-400 mt-0.5 shrink-0 font-mono">—</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0a3b44] text-[#e8e0d1] p-8">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-[#f5f900] mb-6">
                ✓ Z obok.me
              </h3>
              <ul className="space-y-4">
                {[
                  "Ceny z aktów notarialnych — nie oferty",
                  "168 000+ transakcji na interaktywnej mapie",
                  "Filtry: typ, data, dzielnica",
                  "Wycena AI w 30 sekund",
                  "Trendy cenowe i prognozy",
                  "30 sekund, nie tygodnie",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#e8e0d1]/80 text-sm">
                    <span className="text-[#f5f900] mt-0.5 shrink-0 font-mono">+</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-[#fdfdfc]">
        <div className="max-w-5xl mx-auto">
          <h6 className="text-xs font-mono uppercase tracking-widest text-[#0a3b44]/40 text-center mb-4">
            02 // FUNKCJE
          </h6>
          <h2 className="text-3xl md:text-4xl font-black text-center text-[#0a3b44]">
            Wszystko czego potrzebujesz
          </h2>
          <p className="text-[#0a3b44]/50 text-center mt-3 text-lg">do decyzji o nieruchomości</p>
          <div className="grid md:grid-cols-3 gap-px mt-14 bg-[#0a3b44]/10">
            {[
              {
                tag: "MAP",
                title: "Mapa Transakcji",
                sub: "168K transakcji na mapie",
                desc: "Kliknij dowolny punkt w Warszawie — ceny z aktów notarialnych, nie ogłoszenia.",
              },
              {
                tag: "ANALYTICS",
                title: "Analityka Cen",
                sub: "Trendy i prognozy",
                desc: "Średnie ceny, mediany, trendy miesięczne, analiza pięter, metrażu i stron transakcji.",
              },
              {
                tag: "HEAT",
                title: "Mapa Ciepła",
                sub: "Gdzie jest najdrożej?",
                desc: "Heatmapa cen za m² — natychmiast widzisz gorące i zimne strefy.",
              },
              {
                tag: "FORECAST",
                title: "Prognoza Cen",
                sub: "Co będzie za 6 miesięcy?",
                desc: "Regresja liniowa na danych historycznych — trend wzrostowy czy spadkowy.",
              },
              {
                tag: "PLOTS",
                title: "Analiza Działek",
                sub: "Nowe! Dane katastralne",
                desc: "Granice, TERYT, MPZP, strefy zalewowe — kliknij działkę i poznaj wszystko.",
              },
              {
                tag: "DEMO",
                title: "Demografia",
                sub: "GUS + NBP",
                desc: "Bezpieczeństwo, dochody, bezrobocie, stopy procentowe — kontekst dla decyzji.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#fdfdfc] p-6 hover:bg-[#e8e0d1]/30 transition-colors"
              >
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0a3b44]/30">
                  [{f.tag}]
                </span>
                <h3 className="font-bold text-[#0a3b44] mt-2">{f.title}</h3>
                <p className="text-[#0a3b44]/60 text-sm mt-1 font-medium">{f.sub}</p>
                <p className="text-[#0a3b44]/40 text-sm mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h6 className="text-xs font-mono uppercase tracking-widest text-[#0a3b44]/40 text-center mb-4">
            03 // JAK TO DZIAŁA
          </h6>
          <h2 className="text-3xl md:text-4xl font-black text-center text-[#0a3b44]">
            Trzy kroki. Trzydzieści sekund.
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-14">
            {[
              {
                step: "01",
                title: "Otwórz mapę",
                desc: "Przejdź do mapy Warszawy. Przesuwaj, zoomuj, szukaj adresu.",
              },
              {
                step: "02",
                title: "Eksploruj dane",
                desc: "Zobacz ceny transakcyjne, heatmapę, trendy. Kliknij punkt, żeby poznać szczegóły.",
              },
              {
                step: "03",
                title: "Podejmij decyzję",
                desc: "Porównaj ceny w okolicy, sprawdź prognozy, oceń rynek. Wszystko z jednego miejsca.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-6xl font-black text-[#0a3b44]/8 mb-4 font-mono">{s.step}</div>
                <h3 className="text-lg font-bold text-[#0a3b44]">{s.title}</h3>
                <p className="text-[#0a3b44]/50 text-sm mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section id="audience" className="py-20 px-6 bg-[#fdfdfc]">
        <div className="max-w-5xl mx-auto">
          <h6 className="text-xs font-mono uppercase tracking-widest text-[#0a3b44]/40 text-center mb-4">
            04 // DLA KOGO
          </h6>
          <h2 className="text-3xl md:text-4xl font-black text-center text-[#0a3b44]">
            Dla kogo jest obok.me?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {[
              {
                title: "Kupujący mieszkanie",
                sub: "Kupujesz mieszkanie w Warszawie?",
                desc: "Sprawdź ile naprawdę kosztują mieszkania w okolicy. Ceny z aktów notarialnych, nie z ogłoszeń.",
                cta: "SPRAWDŹ CENY →",
              },
              {
                title: "Sprzedający",
                sub: "Nie chcesz sprzedać za tanio?",
                desc: "Zobacz po ile sprzedawano podobne mieszkania. Porównaj z medianą dla dzielnicy.",
                cta: "WYCEŃ MIESZKANIE →",
              },
              {
                title: "Inwestor",
                sub: "Szukasz okazji inwestycyjnych?",
                desc: "Trendy cenowe, prognozy, analiza wolumenu transakcji. Dane zamiast przeczuć.",
                cta: "ANALIZUJ RYNEK →",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="bg-[#e8e0d1]/50 border-2 border-[#0a3b44]/10 p-6 flex flex-col hover:border-[#0a3b44]/30 transition-colors"
              >
                <h3 className="text-lg font-bold text-[#0a3b44]">{p.title}</h3>
                <p className="text-[#0a3b44]/60 text-sm mt-1">{p.sub}</p>
                <p className="text-[#0a3b44]/40 text-sm mt-3 leading-relaxed flex-1">
                  {p.desc}
                </p>
                <a
                  href="/"
                  className="mt-5 text-xs font-mono font-bold uppercase tracking-widest text-[#0a3b44] hover:text-[#0a3b44]/70 transition-colors"
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="py-20 px-6 bg-[#0a3b44] text-[#e8e0d1]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black">
            Przestań zgadywać.
            <br />
            <span className="text-[#f5f900]">
              Zacznij wiedzieć.
            </span>
          </h2>
          <p className="text-[#e8e0d1]/60 mt-4 text-lg">
            Dołącz do listy oczekujących i uzyskaj dostęp do nowych funkcji przed innymi.
          </p>

          {submitted ? (
            <div className="mt-8 border-2 border-[#f5f900]/30 bg-[#f5f900]/10 px-6 py-4 text-[#f5f900] font-mono font-bold uppercase tracking-widest text-sm">
              ✓ JESTEŚ NA LIŚCIE
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                required
                className="flex-1 px-4 py-3 rounded-none bg-[#0a3b44] border-2 border-[#e8e0d1]/20 text-[#e8e0d1] placeholder:text-[#e8e0d1]/30 focus:outline-none focus:border-[#f5f900] text-sm font-mono"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#f5f900] hover:bg-[#e5e900] disabled:opacity-50 text-[#0a3b44] px-6 py-3 rounded-none font-mono font-bold text-sm uppercase tracking-widest transition-colors"
              >
                {submitting ? "..." : "DOŁĄCZ →"}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-400 font-mono">{error}</p>
          )}

          <p className="text-xs text-[#e8e0d1]/30 mt-6 font-mono uppercase tracking-wider">
            ✓ BEZ SPAMU &nbsp; ✓ BETA ACCESS &nbsp; ✓ PIERWSZE 100 OSÓB → PRO GRATIS
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#0a3b44]/10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-mono font-bold text-xs tracking-widest text-[#0a3b44]">OBOK.ME</span>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#0a3b44]/40">
            DANE Z: RCN · GUS BDL · NBP · ULDK GUGIK
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#0a3b44]/40">
            © 2025 OBOK.ME · MADE IN WARSAW
          </div>
        </div>
      </footer>
    </div>
  );
}
