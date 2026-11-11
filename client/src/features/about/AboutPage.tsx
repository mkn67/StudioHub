"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Github, Mail, UserRound } from "lucide-react";
import Image from "@/components/image";
import Link from "@/components/motion/navigation-link";
import { gsap, useGSAP, gsapEase } from "@/components/motion/gsap-runtime";
import { duration } from "@/components/motion/tokens";
import { teamMembers, type TeamMember } from "./team";
import styles from "./about.module.css";

function githubProfile(value?: string) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

function MemberAvatar({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.avatar}>
    {member.image && !failed ? <Image src={member.image} alt={`Ảnh đại diện ${member.name}`} width={80} height={80} onError={() => setFailed(true)}/> : <span role="img" aria-label={`Chưa có ảnh đại diện của ${member.name}`}><UserRound size={34} aria-hidden="true"/></span>}
  </div>;
}

export function AboutPage() {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const root = scope.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const intro = gsap.timeline({ defaults: { ease: gsapEase, immediateRender: false, clearProps: "opacity,transform" } });
      intro.fromTo(root.querySelector("[data-about-title]"), { opacity: .7, y: 16 }, { opacity: 1, y: 0, duration: duration.slow }, 0);
      intro.fromTo(root.querySelector("[data-about-intro]"), { opacity: .7, y: 10 }, { opacity: 1, y: 0, duration: duration.normal }, .1);
      const cards = root.querySelectorAll("[data-team-member]");
      const reveal = gsap.fromTo(cards, { opacity: .75, y: 20 }, { opacity: 1, y: 0, duration: duration.slow, stagger: .08, ease: gsapEase, immediateRender: false, clearProps: "opacity,transform", scrollTrigger: { id: "studiohub-about-team", trigger: root.querySelector("[data-team-grid]"), start: "top 92%", once: true } });
      const finish = (event: Event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-team-member]")) reveal.progress(1);
        if (target?.closest("a, button")) intro.progress(1);
      };
      root.addEventListener("focusin", finish); root.addEventListener("pointerover", finish);
      return () => { root.removeEventListener("focusin", finish); root.removeEventListener("pointerover", finish); };
    }, scope);
    return () => media.revert();
  }, { scope });

  return <div ref={scope} className={`about-page ${styles.page}`}>
    <section className={styles.hero} aria-labelledby="about-title">
      <div><p className={styles.eyebrow}>StudioHub / Đội ngũ</p><h1 id="about-title" data-about-title>Đằng sau StudioHub là ai?</h1>
        <p className={styles.intro} data-about-intro>Chúng mình là nhóm sinh viên gồm 5 thành viên, cùng phát triển StudioHub với mong muốn giúp việc tìm kiếm và thuê không gian sáng tạo trở nên thuận tiện hơn.</p>
      </div>
      <div className={styles.teamMark} aria-hidden="true"><span>SH</span><div>{teamMembers.map(member => <i key={member.id}/>)}</div><small>Cùng làm nên StudioHub</small></div>
    </section>

    <section className={styles.project} aria-labelledby="about-project-title">
      <div><p className={styles.eyebrow}>Không gian cho sáng tạo</p><h2 id="about-project-title">Về dự án StudioHub</h2></div>
      <div className={styles.projectCopy}><p>StudioHub là dự án hỗ trợ tìm kiếm và đặt thuê không gian sáng tạo. Khách thuê có thể khám phá loại Studio, xem ảnh, thông tin phòng và bảng giá trước khi chọn lịch.</p><p>Dự án kết nối trải nghiệm của khách thuê với công cụ quản lý phòng và đơn thuê dành cho chủ Studio. Trợ lý AI hỗ trợ tìm hiểu thông tin phòng cho người dùng đã đăng nhập; giá và lịch trống vẫn được kiểm tra tại bước đặt thuê.</p><Link href="/rooms" className={styles.explore}>Khám phá Studio <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </section>

    <section className={styles.team} aria-labelledby="about-team-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Những người cùng xây dựng</p><h2 id="about-team-title">Gặp gỡ đội ngũ</h2></div><span className={styles.count}>05 thành viên</span></div>
      <p className={styles.teamIntro}>Thông tin giới thiệu từng thành viên sẽ được cập nhật tại đây.</p>
      <div className={styles.memberGrid} data-team-grid>{teamMembers.map(member => {
        const github = githubProfile(member.github);
        const email = member.emailPublic && member.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email) ? member.email : null;
        return <article key={member.id} className={styles.memberCard} data-team-member={member.id} aria-labelledby={`team-member-${member.id}`}>
          <div className={styles.memberTop}><MemberAvatar member={member}/><span className={styles.memberIndex}>{String(member.id).padStart(2, "0")}</span></div>
          <h3 id={`team-member-${member.id}`}>{member.name}</h3>
          {member.studentId && <p className={styles.studentId}>MSSV: {member.studentId}</p>}
          {member.role && <p className={styles.role}>{member.role}</p>}
          {member.description && <p className={styles.memberDescription}>{member.description}</p>}
          {(github || email) && <div className={styles.memberLinks}>{github && <a href={github} target="_blank" rel="noopener noreferrer" aria-label={`GitHub của ${member.name} (mở thẻ mới)`}><Github size={17} aria-hidden="true"/>GitHub<ArrowUpRight size={14} aria-hidden="true"/></a>}{email && <a href={`mailto:${encodeURIComponent(email)}`} aria-label={`Gửi email cho ${member.name}`}><Mail size={17} aria-hidden="true"/>Email</a>}</div>}
        </article>;
      })}</div>
    </section>

    <section className={styles.technology} aria-labelledby="about-tech-title"><h2 id="about-tech-title">Công nghệ sử dụng</h2><ul>{["Next.js", "React", "TypeScript", "PHP", "MySQL", "GSAP"].map(technology => <li key={technology}>{technology}</li>)}</ul></section>
  </div>;
}
