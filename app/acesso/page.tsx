import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import styles from "../auth.module.css";
import AuthForms from "./AuthForms";

export const metadata: Metadata = {
  title: "Acesso do jogador | FLN BULLS",
  description: "Cadastro e login dos jogadores do FLN BULLS.",
};

export default function AccessPage() {
  return (
    <div className={styles.authPage}>
      <header className={styles.authHeader}>
        <Link className={styles.authBrand} href="/">
          <Image
            src="/fln-bulls-shield.png"
            alt=""
            width={1007}
            height={979}
          />
          <span>FLN BULLS</span>
        </Link>
        <Link className={styles.backLink} href="/">
          Voltar ao site
        </Link>
      </header>

      <main className={styles.authMain}>
        <div className={styles.authIntro}>
          <p>Área do jogador</p>
          <h1>Seu lugar no Bulls.</h1>
          <span>
            Entre com seu usuário ou faça o cadastro para acessar seu perfil.
          </span>
        </div>
        <AuthForms />
      </main>
    </div>
  );
}
