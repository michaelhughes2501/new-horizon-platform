// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { C, fonts } from '@styles/tokens';
import { useAuth } from '@context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '◆' },
  { to: '/connect',    label: 'Connect',    icon: '✦' },
  { to: '/messages',   label: 'Messages',   icon: '✉' },
  { to: '/jobs',       label: 'Jobs',       icon: '⬢' },
  { to: '/blog',       label: 'Community',  icon: '✎' },
  { to: '/resources',  label: 'Resources',  icon: '⚲' },
  { to: '/calculator', label: 'Calculator', icon: '∑' },
  { to: '/profile',    label: 'Profile',    icon: '●' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = !!user && ['admin', 'super_admin'].includes(user.role);

  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        background: C.sidebar,
        color: C.white,
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 14px',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 22px' }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          ✦
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600 }}>New Horizon</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 14,
              color: isActive ? C.white : 'rgba(255,255,255,.62)',
              background: isActive ? C.sidebarHover : 'transparent',
              fontWeight: isActive ? 500 : 400,
              borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
            })}
          >
            <span style={{ width: 18, textAlign: 'center', color: C.gold }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 14,
              marginTop: 8,
              color: isActive ? C.white : 'rgba(255,255,255,.62)',
              background: isActive ? C.sidebarHover : 'transparent',
              borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
            })}
          >
            <span style={{ width: 18, textAlign: 'center', color: C.gold }}>⚙</span>
            Admin
          </NavLink>
        )}
      </nav>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', padding: '12px 12px 0' }}>
        Built with dignity · v0.1
      </div>
    </aside>
  );
}
