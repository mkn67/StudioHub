import Link from "./motion/navigation-link";
import styles from "./public-footer.module.css";

export function PublicFooter({ demo = false }: { demo?: boolean }) {
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  return <footer className={`public-footer ${styles.footer}`}>
    <div className={`container ${styles.inner}`}>
      <div className={styles.top}>
        <div className={styles.identity}>
          <Link className={`brand ${styles.wordmark}`} href="/" aria-label="StudioHub — Trang chủ">StudioHub<span>®</span></Link>
          <p>Tìm kiếm Studio phù hợp với nhu cầu.</p>
        </div>
        <nav className={styles.navigation} aria-label="Điều hướng cuối trang">
          <Link href="/rooms">Khám phá Studio</Link>
          <Link href="/about">Về chúng tôi</Link>
          <Link href="/policies/privacy">Chính sách</Link>
          <Link href="/policies/terms">Điều khoản sử dụng</Link>
          <Link href="/register/host">Trở thành đối tác</Link>
          <details className={styles.morePolicies}>
            <summary>Chính sách khác</summary>
            <div className={styles.policyMenu}>
              <Link href="/policies/cookies">Chính sách cookie</Link>
              <Link href="/policies/personal-data">Dữ liệu cá nhân</Link>
              <Link href="/policies/disclaimer">Miễn trừ trách nhiệm</Link>
            </div>
          </details>
        </nav>
      </div>
      <div className={styles.bottom}>
        <span>© {year} StudioHub. All rights reserved.</span>
        <span>Trường Đại học Công nghệ Thông tin · ĐHQG-HCM{demo && " · Dữ liệu minh họa, không thanh toán thật"}</span>
      </div>
    </div>
  </footer>;
}
