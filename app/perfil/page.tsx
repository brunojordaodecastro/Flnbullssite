import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import styles from "../auth.module.css";
import ProfileView from "./ProfileView";

export const metadata: Metadata = {
  title: "Perfil do jogador | FLN BULLS",
  description: "Área privada do jogador do FLN BULLS.",
};

export default function ProfilePage() {
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
        <span className={styles.privateLabel}>Área protegida</span>
      </header>

      <main className={styles.profileMain}>
        <ProfileView />
      </main>
    </div>
  );
}
