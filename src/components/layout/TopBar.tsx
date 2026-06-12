// src/components/layout/TopBar.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { C, fonts } from '@styles/tokens';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { Avatar, Button } from '@components/ui';

export default function TopBar() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast('Signed out.', 'info');
    navigate('/');
  };

  return (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        background: C.white,
        borderBottom: `1px solid ${C.mist}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ fontFamily: fonts.display, fontSize: 18, color: C.charcoal }}>
        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Avatar initials={user.avatar_initials || user.name} size={34} />
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.charcoal }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.slate }}>{user.role}</div>
            </div>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
