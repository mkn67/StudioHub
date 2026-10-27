import styles from "../styles/helpdesk.module.css";

export function TypingIndicatorBubble() {
  return <div className={styles.typingBubble} aria-hidden="true">
    <span /><span /><span />
  </div>;
}
