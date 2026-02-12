import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/health', label: 'Health' },
  { to: '/projects', label: 'Projects' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-900 text-gray-100 p-4">
        <h1 className="text-lg font-bold mb-6">Watch My SaaS</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${
                  isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
