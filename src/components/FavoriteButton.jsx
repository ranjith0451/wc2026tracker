/**
 * FavoriteButton — heart toggle for any team.
 * Props: team (string), size (px, default 18), variant ("icon"|"chip")
 */
import { motion } from "framer-motion";
import { useFavorites } from "../lib/favorites.js";

export default function FavoriteButton({ team, size = 18, variant = "icon", className = "" }) {
  const { isFav, toggle } = useFavorites();
  const active = isFav(team);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle(team);
  }

  return (
    <motion.button
      type="button"
      data-testid={`fav-btn-${team || "unknown"}`}
      onClick={onClick}
      aria-label={active ? `Unfollow ${team}` : `Follow ${team}`}
      className={`fav-btn ${variant} ${active ? "active" : ""} ${className}`}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.15 }}
      animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      {variant === "chip" && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700 }}>{active ? "Following" : "Follow"}</span>}
    </motion.button>
  );
}
