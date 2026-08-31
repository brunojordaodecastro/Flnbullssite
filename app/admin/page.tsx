import type { Metadata } from "next";
import Image from "next/image";

import styles from "../auth.module.css";
import AdminDashboardView from "./AdminDashboardView";

export const metadata: Metadata = {
  title: "Painel do Administrador | FLN BULLS",
  description: "Área administrativa para gestão do clube, atletas e jogos do FLN BULLS.",
};

export default function AdminPage() {
  return (
    <div className={styles.authPage}>
      <header className={styles.authHeader}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={styles.authBrand} href="/">
          <Image
            src="/fln-bulls-shield.png"
            alt=""
            width={1007}
            height={979}
          />
          <span>FLN BULLS</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a href="/time" className={styles.backHomeLink}>
            Ver Time
          </a>
          <a href="/perfil" className={styles.backHomeLink}>
            Meu Perfil
          </a>
          <span className="admin-crown-badge">Painel Admin</span>
        </div>
      </header>

      <main className={styles.profileMain}>
        <AdminDashboardView />
      </main>
    </div>
  );
}

