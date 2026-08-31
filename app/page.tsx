import Image from "next/image";

import HomeAccountButton from "./HomeAccountButton";
import TeamStatsSummary from "./TeamStatsSummary";
import MatchesSection from "./MatchesSection";
import LatestMatchPanels from "./LatestMatchPanels";
import { DEFAULT_RECENT_MATCHES } from "@/lib/matches";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <nav className="main-nav" aria-label="Navegação principal">
            <a aria-current="page" href="#inicio">
              Início
            </a>
            <a href="/time">Time</a>
            <a href="#estatisticas">Estatísticas</a>
            <a href="#partidas">Partidas</a>
            <a href="#amistoso">Amistoso</a>
            <a href="#sobre">Sobre</a>
          </nav>

          <HomeAccountButton />
        </div>
      </header>

      <main id="conteudo">
        <MatchesSection />

        <section className="hero section-wrap" id="inicio">
          <div className="hero-copy reveal reveal-one">
            <div className="club-badge">
              <Image
                src="/fln-bulls-shield.png"
                alt="Escudo oficial do FLN BULLS"
                width={1007}
                height={979}
                priority
              />
            </div>

            <div>
              <p className="eyebrow">Florianópolis · Santa Catarina</p>
              <h1>FLN BULLS</h1>
              <div className="identity-meta" aria-label="Informações do time">
                <span>Society</span>
                <span>Fundado em 2019</span>
              </div>
            </div>
          </div>
        </section>

        <TeamStatsSummary initialMatches={DEFAULT_RECENT_MATCHES} />

        <section className="dashboard-grid section-wrap" id="partidas">
          <LatestMatchPanels initialMatches={DEFAULT_RECENT_MATCHES} />
        </section>

        <section className="cta-section section-wrap" id="amistoso">
          <div>
            <p className="eyebrow">Próximo adversário</p>
            <h2>Quer jogar contra o Bulls?</h2>
            <p>Entre em contato com a gente e marque um amistoso.</p>
          </div>
          <a
            className="instagram-button pressable"
            href="https://www.instagram.com/fln_bulls/"
            target="_blank"
            rel="noreferrer"
          >
            Chamar no Instagram
          </a>
        </section>

        <section className="about-section section-wrap" id="sobre">
          <div className="about-copy">
            <p className="eyebrow">Desde o ensino médio</p>
            <h2>Amigos fora de campo. Bulls dentro dele.</h2>
          </div>
          <p>
            Um time de Florianópolis que transformou cada amistoso em memória.
            Esta plataforma vai reunir partidas, elenco e números oficiais em
            um só lugar.
          </p>
        </section>
      </main>

      <footer className="site-footer" id="rodape">
        <div className="section-wrap footer-inner">
          <div>
            <a className="brand footer-brand" href="#inicio">
              <span className="brand-mark" aria-hidden="true">
                <Image
                  className="brand-shield"
                  src="/fln-bulls-shield.png"
                  alt=""
                  width={1007}
                  height={979}
                />
              </span>
              <span className="brand-name">FLN BULLS</span>
            </a>
            <p>Futebol 7 · Florianópolis/SC</p>
          </div>
          <div className="footer-status">
            <span>Área do jogador</span>
            <p>Cadastre-se ou entre para acessar seu perfil.</p>
          </div>
          <a
            className="footer-instagram"
            href="https://www.instagram.com/fln_bulls/"
            target="_blank"
            rel="noreferrer"
          >
            @fln_bulls
          </a>
        </div>
      </footer>
    </div>
  );
}
