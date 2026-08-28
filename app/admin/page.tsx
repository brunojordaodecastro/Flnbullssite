import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
        <Link className={styles.authBrand} href="/">
          <Image
            src="/fln-bulls-shield.png"
            alt=""
            width={1007}
            height={979}
          />
          <span>FLN BULLS</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/time" className={styles.backHomeLink}>
            Ver Time
          </Link>
          <Link href="/perfil" className={styles.backHomeLink}>
            Meu Perfil
          </Link>
          <span className="admin-crown-badge">Painel Admin</span>
        </div>
      </header>

      <main className={styles.profileMain}>
        <AdminDashboardView />
      </main>
    </div>
  );
}

