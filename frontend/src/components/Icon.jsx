// src/components/Icon.jsx
// Jeu d'icônes SVG (style "ligne", sans dépendance externe) pour remplacer les
// émojis dans toute l'application — rendu plus professionnel et cohérent.
//
// Usage : <Icon name="box" /> ou <Icon name="truck" size={18} className="text-..." />
// La couleur suit currentColor (donc les classes text-* du parent).

const P = {
  // Navigation / objets
  home:        <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /></>,
  box:         <><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
  truck:       <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
  receipt:     <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></>,
  file:        <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></>,
  cart:        <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 7H6" /></>,
  bag:         <><path d="M6 8h12l-1 12H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  building:    <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" /></>,
  factory:     <><path d="M3 21V10l6 4V10l6 4V6l6 4v11z" /><path d="M3 21h18" /></>,
  // Personnes / sécurité
  user:        <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  users:       <><circle cx="9" cy="8" r="3" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8" /><path d="M17 13.2A6 6 0 0 1 22 19" /></>,
  lock:        <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  key:         <><circle cx="8" cy="14" r="4" /><path d="M11 11l9-9M17 5l2 2M14 8l2 2" /></>,
  shield:      <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></>,
  crown:       <><path d="M3 7l4 5 5-7 5 7 4-5v11H3z" /></>,
  fingerprint: <><path d="M12 11a2 2 0 0 1 2 2c0 3 0 5-1 7" /><path d="M8 13a4 4 0 0 1 8 0c0 3 0 4-1 6" /><path d="M5 13a7 7 0 0 1 14 0" /></>,
  // Finance / data
  coins:       <><circle cx="8" cy="8" r="5" /><path d="M14.5 4.5a5 5 0 0 1 0 11" /></>,
  chart:       <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-7" /></>,
  trendUp:     <><path d="M3 17l6-6 4 4 7-7" /><path d="M16 8h5v5" /></>,
  trendDown:   <><path d="M3 7l6 6 4-4 7 7" /><path d="M16 16h5v-5" /></>,
  target:      <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  hash:        <><path d="M5 9h14M5 15h14M9 4 7 20M17 4l-2 16" /></>,
  // Actions
  check:       <><path d="M5 12l5 5 9-11" /></>,
  x:           <><path d="M6 6l12 12M18 6 6 18" /></>,
  plus:        <><path d="M12 5v14M5 12h14" /></>,
  trash:       <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
  edit:        <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>,
  search:      <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  eye:         <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  refresh:     <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v5h-5" /></>,
  printer:     <><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1" /><path d="M8 17h8v4H8z" /></>,
  download:    <><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></>,
  ticket:      <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M14 6v12" /></>,
  clipboard:   <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M9 11h6M9 15h4" /></>,
  pause:       <><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></>,
  play:        <><path d="M7 5l12 7-12 7z" /></>,
  ban:         <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
  link:        <><path d="M9 15l6-6" /><path d="M10 6l1-1a4 4 0 0 1 6 6l-1 1" /><path d="M14 18l-1 1a4 4 0 0 1-6-6l1-1" /></>,
  // Statut / divers
  alert:       <><path d="M12 3 2 20h20z" /><path d="M12 9v5M12 17.5v.5" /></>,
  clock:       <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bell:        <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  bolt:        <><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></>,
  settings:    <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L16.5 2h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" /></>,
  palette:     <><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5 1-2 2-2h2a3 3 0 0 0 3-3 8 8 0 0 0-9-9z" /><circle cx="7.5" cy="11.5" r="1" /><circle cx="11" cy="7.5" r="1" /><circle cx="15.5" cy="8.5" r="1" /></>,
  sparkles:    <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  bulb:        <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M8 14a5 5 0 1 1 8 0c-.8 1-1 1.5-1 3H9c0-1.5-.2-2-1-3z" /></>,
  rocket:      <><path d="M5 15c-1 1-2 5-2 5s4-1 5-2" /><path d="M9 11a8 8 0 0 1 9-8 8 8 0 0 1-8 9l-3 3-1-1z" /><circle cx="14.5" cy="9.5" r="1.3" /></>,
  trophy:      <><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /><path d="M12 13v4M9 20h6M10 20l.5-3h3l.5 3" /></>,
  inbox:       <><path d="M3 13l3-9h12l3 9v6H3z" /><path d="M3 13h5l1.5 2h5L16 13h5" /></>,
  camera:      <><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></>,
  phone:       <><path d="M5 4h4l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></>,
  mail:        <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  pin:         <><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  device:      <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>,
  infinity:    <><path d="M7 9a3 3 0 1 0 0 6c2 0 3-3 5-3s3-3 5-3a3 3 0 1 1 0 6c-2 0-3-3-5-3s-3 3-5 3" /></>,
  star:        <><path d="M12 3l2.6 6.3 6.4.5-4.9 4.1 1.5 6.6L12 17.3 6.4 20.6l1.5-6.6L3 9.8l6.4-.5z" /></>,
  // Flèches
  arrowRight:  <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  arrowUpRight:<><path d="M7 17 17 7M8 7h9v9" /></>,
  arrowDown:   <><path d="M12 5v14M6 13l6 6 6-6" /></>,
  chevron:     <><path d="M6 9l6 6 6-6" /></>,
  chevronUp:   <><path d="M6 15l6-6 6 6" /></>,
  sort:        <><path d="M8 4v16M8 20l-3-3M8 4l3 3M16 20V4M16 4l3 3M16 20l-3-3" /></>,
};

export default function Icon({ name, size = 18, className = "", strokeWidth = 2, style }) {
  const path = P[name] || P.box;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}
