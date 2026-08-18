import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/training', label: 'Training' },
  { to: '/nutrition', label: 'Ernährung' },
  { to: '/body', label: 'Körper' },
]

export default function BottomNav() {
  return (
    <nav>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
