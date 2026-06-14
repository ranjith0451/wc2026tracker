import { FLAG_URL, FLAGS } from "../data/teams.js";

export default function TeamFlag({ team, ...props }) {
  if (!FLAGS[team]) return null;
  return <img src={FLAG_URL(team)} alt={team} loading="lazy" {...props} />;
}
