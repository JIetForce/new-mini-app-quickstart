import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Pay Link</p>
          <h1 className={styles.title}>Create a one-time USDC payment link on Base</h1>
          <p className={styles.subtitle}>
            Generate a fixed-amount link, share it, and let the next person pay
            with Base Pay on mainnet. One successful payment closes the link.
          </p>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Asset</span>
            <strong className={styles.summaryValue}>USDC on Base</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Flow</span>
            <strong className={styles.summaryValue}>Create, share, pay once</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Settlement</span>
            <strong className={styles.summaryValue}>Mainnet only</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>States</span>
            <strong className={styles.summaryValue}>active, paid, expired, canceled</strong>
          </div>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/create">
            Create payment link
          </Link>
          <Link className={styles.secondaryButton} href="/my-links">
            My links
          </Link>
        </div>
      </section>
    </main>
  );
}
