import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import HomeMegaMenu from './ReactBits/HomeMegaMenu';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout() {
  const { usuario } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050505', display: 'flex', flexDirection: 'column' }}>
      <HomeMegaMenu user={usuario} mobileMenuOpen={dropdownOpen} setMobileMenuOpen={setDropdownOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
}
