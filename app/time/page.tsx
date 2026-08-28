import Image from "next/image";
import Link from "next/link";

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
          <nav className="main-nav" aria-label="Navegação principal">
            <Link href="/">Início</Link>
            <Link aria-current="page" href="/time">
              Time
            </Link>
            <Link href="/#estatisticas">Estatísticas</Link>
            <Link href="/#partidas">Partidas</Link>
            <Link href="/#amistoso">Amistoso</Link>
            <Link href="/#sobre">Sobre</Link>
          </nav>

          <HomeAccountButton />
        </div>
      </header>

      <main id="conteudo">
        <TeamView />
      </main>

      <footer className="site-footer" id="rodape">
        <div className="section-wrap footer-inner">
          <div>
            <Link className="brand footer-brand" href="/">
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
            </Link>
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

