import Image from "next/image";
import Link from "next/link";

import HomeAccountButton from "./HomeAccountButton";
import TeamStatsSummary from "./TeamStatsSummary";
import MatchesSection from "./MatchesSection";
import { recentMatches } from "@/lib/matches";

export default function Home() {
  const latestMatch = recentMatches[0];
  const recentFive = recentMatches.slice(0, 5);
  const formResults = recentFive.map((m) => ({
    result: m.result === "Vitória" ? "V" : m.result === "Empate" ? "E" : "D",
    label: m.result,
  }));
  const formWins = recentFive.filter((m) => m.result === "Vitória").length;
  const formDraws = recentFive.filter((m) => m.result === "Empate").length;
  const formLosses = recentFive.filter((m) => m.result === "Derrota").length;
  const formPoints = formWins * 3 + formDraws * 1;

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <nav className="main-nav" aria-label="Navegação principal">
            <a aria-current="page" href="#inicio">
              Início
            </a>
            <Link href="/time">Time</Link>
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

        <TeamStatsSummary matches={recentMatches} />

        <section className="dashboard-grid section-wrap" id="partidas">
          <article className="match-card panel reveal reveal-one">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Última partida</p>
                <h2>Amistoso</h2>
              </div>
              <span
                className={`status-badge ${latestMatch.result === "Vitória" ? "status-win" : "status-loss"}`}
              >
                {latestMatch.result}
              </span>
            </div>

            <p className="match-meta">{latestMatch.date} · Partida oficial</p>

            <div
              className="scoreboard"
              aria-label={`${latestMatch.home.name} ${latestMatch.score.replace("–", " a ")} ${latestMatch.away.name}`}
            >
              <div className="team team-home">
                <span
                  className={`team-crest${latestMatch.home.crest ? " crest-bulls" : " crest-rival"}`}
                  aria-hidden="true"
                >
                  {latestMatch.home.crest ? (
                    <Image
                      src={latestMatch.home.crest}
                      alt=""
                      width={1007}
                      height={979}
                    />
                  ) : (
                    latestMatch.home.mark
                  )}
                </span>
                <strong>{latestMatch.home.name}</strong>
              </div>

              <div className="score">
                <span>{latestMatch.score.split("–")[0]}</span>
                <small>FINAL</small>
                <span>{latestMatch.score.split("–")[1]}</span>
              </div>

              <div className="team">
                <span
                  className={`team-crest${latestMatch.away.crest ? "" : " crest-rival"}`}
                  aria-hidden="true"
                >
                  {latestMatch.away.crest ? (
                    <Image
                      src={latestMatch.away.crest}
                      alt=""
                      width={320}
                      height={320}
                    />
                  ) : (
                    latestMatch.away.mark
                  )}
                </span>
                <strong>{latestMatch.away.name}</strong>
              </div>
            </div>

            <div className="match-footer">
              <span>{latestMatch.date}</span>
              {latestMatch.link ? (
                <a
                  href={latestMatch.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Ver no Instagram
                </a>
              ) : null}
            </div>
          </article>

          <article className="form-card panel reveal reveal-two">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Momento</p>
                <h2>Forma recente</h2>
              </div>
              <span className="form-points">{formPoints} pts</span>
            </div>

            <ol className="form-list" aria-label="Últimos cinco resultados">
              {formResults.map((item, index) => (
                <li key={`${item.result}-${index}`}>
                  <span
                    className={`form-result result-${item.result.toLowerCase()}`}
                    aria-label={item.label}
                  >
                    {item.result}
                  </span>
                  <span className="form-line" aria-hidden="true" />
                </li>
              ))}
            </ol>

            <div className="form-summary">
              <div>
                <strong>{formWins}</strong>
                <span>{formWins === 1 ? "vitória" : "vitórias"}</span>
              </div>
              <div>
                <strong>{formDraws}</strong>
                <span>{formDraws === 1 ? "empate" : "empates"}</span>
              </div>
              <div>
                <strong>{formLosses}</strong>
                <span>{formLosses === 1 ? "derrota" : "derrotas"}</span>
              </div>
            </div>
          </article>
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
