'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Basic protection (in a real app you'd verify the token with the backend)
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const navItems = [
    { name: 'Inventario', path: '/dashboard/inventario', icon: '📦' },
    { name: 'Red de Vencimientos', path: '/dashboard/red', icon: '🤝' },
    { name: 'Chat (Tiempo Real)', path: '/dashboard/chat', icon: '💬' },
    { name: 'Licencia y Facturación', path: '/dashboard/facturacion', icon: '💳' },
  ];

  // Dynamically add Admin link
  const isSuperadmin = typeof window !== 'undefined' && localStorage.getItem('role') === 'SUPERADMIN';
  if (isSuperadmin) {
    navItems.push({ name: 'SaaS Admin', path: '/dashboard/admin', icon: '⚙️' });
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-2">
            <span className="text-white font-bold text-xs">+</span>
          </div>
          <span className="text-lg font-extrabold text-blue-900">PharmaShare</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition">
            <span className="mr-3 text-lg">🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
