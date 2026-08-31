import Image from "next/image";

import HomeAccountButton from "../HomeAccountButton";
import TeamView from "./TeamView";

export const metadata = {
  title: "Elenco e Inscrição | FLN BULLS",
  description: "Conheça os atletas do FLN BULLS e solicite entrada no time de Futebol 7.",
};

export default function TeamPage() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          {/* eslint-disable @next/next/no-html-link-for-pages */}
          <nav className="main-nav" aria-label="Navegação principal">
            <a href="/">Início</a>
            <a aria-current="page" href="/time">
              Time
            </a>
            <a href="/#estatisticas">Estatísticas</a>
            <a href="/#partidas">Partidas</a>
            <a href="/#amistoso">Amistoso</a>
            <a href="/#sobre">Sobre</a>
          </nav>
          {/* eslint-enable @next/next/no-html-link-for-pages */}

          <HomeAccountButton />
        </div>
      </header>

      <main id="conteudo">
        <TeamView />
      </main>

      <footer className="site-footer" id="rodape">
        <div className="section-wrap footer-inner">
          <div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="brand footer-brand" href="/">
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

