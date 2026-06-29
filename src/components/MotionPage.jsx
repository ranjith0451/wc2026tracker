import { motion } from "framer-motion";
import { prefersReducedMotion } from "../lib/usePlatform";

const variants = {
  initial: { opacity: 0, y: 12 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -8 },
};

export function MotionPage({ children, className }) {
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : "initial"}
      animate="in"
      exit="out"
      variants={variants}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const listVariants = {
  in: { transition: { staggerChildren: 0.025, delayChildren: 0.04 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 6 },
  in:      { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

export function MotionList({ children, className }) {
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : "initial"}
      animate="in"
      variants={reduced ? undefined : listVariants}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, as = "div", ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag variants={itemVariants} {...rest}>
      {children}
    </Tag>
  );
}
