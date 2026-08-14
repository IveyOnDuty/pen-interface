import { NavLink } from 'react-router-dom'
import shutterLogo from '../../assets/shutter-pen-logo-white-512.png'

const NAV = [
  { to: '/seats',   label: 'SEATs',   icon: '◈' },
  { to: '/metrics', label: 'Metrics', icon: '◎' },
  { to: '/links',   label: 'Links',   icon: '⧉' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed top-0 left-0 h-full w-[220px] flex flex-col bg-white text-bone-900 z-40 transform transition-transform duration-200 ease-out md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand strip — matches header height + shadow so it reads as one bar */}
      <div className="h-16 flex items-center justify-between px-4 bg-brand-600 shadow-lg">
        <div className="flex items-center gap-2.5">
          <img src={shutterLogo} alt="" className="w-8 h-8 object-contain" />
          <span className="text-white font-semibold text-lg leading-none tracking-tight">Shutter PEN</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 -mr-1 flex items-center justify-center rounded-lg text-white/90 hover:bg-white/10 transition-colors"
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Nav — white portion below the strip */}
      <nav className="flex-1 p-3 space-y-0.5 border-r border-bone-200">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-bone-600 hover:bg-bone-50 hover:text-bone-950'
              }`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
