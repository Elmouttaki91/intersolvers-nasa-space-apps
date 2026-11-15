import Icon from './Icons';

export default function Header({ onBriefing, onCard }) {
  return (
    <header className="header">
      <div className="brand">
        <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
          <rect width="64" height="64" rx="14" fill="#071a57" />
          <path d="M10 48c14-2 10-18 22-18s8-14 22-16" fill="none" stroke="#E6FF2E" strokeWidth="6" strokeLinecap="round" />
          <circle cx="54" cy="14" r="5" fill="#fff" />
        </svg>
        <div>
          <h1>Murray Buttes Marswalk</h1>
          <p>Intersolvers · NASA Space Apps 2026 · Interplanetary Survival Guide</p>
        </div>
      </div>
      <nav className="header-actions" aria-label="Actions">
        <button className="btn ghost" onClick={onBriefing}><Icon name="flag" size={16} /> Briefing</button>
        <button className="btn ghost" onClick={onCard}><Icon name="download" size={16} /> Route card</button>
      </nav>
    </header>
  );
}
