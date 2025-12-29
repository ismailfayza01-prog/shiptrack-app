'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const renderUserNavigation = () => {
    if (!user) return null;

    switch (user.role) {
      case 'admin':
        return (
          <>
            <NavItem href="/admin/shipments" label="Shipments" isActive={isActive} />
            <NavItem href="/admin/drivers" label="Drivers" isActive={isActive} />
            <NavItem href="/admin/users" label="Users" isActive={isActive} />
            <NavItem href="/admin/pricing" label="Pricing" isActive={isActive} />
          </>
        );
      case 'driver':
        return (
          <>
            <NavItem href="/driver/assignments" label="My Assignments" isActive={isActive} />
            <NavItem href="/driver/profile" label="Profile" isActive={isActive} />
          </>
        );
      case 'staff':
        return (
          <>
            <NavItem href="/staff/shipments" label="Shipments" isActive={isActive} />
            <NavItem href="/staff/track" label="Track" isActive={isActive} />
          </>
        );
      default:
        return (
          <>
            <NavItem href="/shipments" label="My Shipments" isActive={isActive} />
            <NavItem href="/track" label="Track" isActive={isActive} />
          </>
        );
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold">
            Logistics App
          </Link>
          {isAuthenticated && (
            <div className="flex space-x-4">
              {renderUserNavigation()}
              <NavItem href="/profile" label="Profile" isActive={isActive} />
            </div>
          )}
        </div>
        <div>
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span>Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link href="/login" className="hover:underline">
                Login
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

interface NavItemProps {
  href: string;
  label: string;
  isActive: (path: string) => boolean;
}

const NavItem = ({ href, label, isActive }: NavItemProps) => (
  <Link
    href={href}
    className={`px-3 py-2 rounded-md ${
      isActive(href) ? 'bg-gray-700' : 'hover:bg-gray-700'
    } transition-colors`}
  >
    {label}
  </Link>
);

export default Navigation;