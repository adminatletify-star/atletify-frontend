import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import HomeMegaMenu from './ReactBits/HomeMegaMenu';

export default function PublicLayout() {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('usuario');
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch (e) {
        console.error("Error parsing user in PublicLayout", e);
      }
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050505', display: 'flex', flexDirection: 'column' }}>
      <HomeMegaMenu user={user} mobileMenuOpen={dropdownOpen} setMobileMenuOpen={setDropdownOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
}
