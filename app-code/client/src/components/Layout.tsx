import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Image, Palette, Users, User } from 'lucide-react';

const navItems = [
  { path: '/', label: '渲心', icon: Home, end: true },
  { path: '/wall', label: '心情墙', icon: Image },
  { path: '/palette', label: '色盘', icon: Palette },
  { path: '/plaza', label: '广场', icon: Users },
  { path: '/me', label: '我的', icon: User },
];

const Layout = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen xuan-paper-bg text-foreground font-sans">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-zhu-sha flex items-center justify-center seal-stamp text-white text-lg">
              心
            </div>
            <div className="flex flex-col">
              <span className="ink-brush-text text-xl font-semibold text-mo-se">
                渲<span className="text-zhu-sha">心</span>
              </span>
              <span className="text-[10px] text-muted-foreground tracking-widest font-serif">
                一句话，渲出一颗心
              </span>
            </div>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-zhu-sha/10 text-zhu-sha font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-lg bg-background/85 border-t border-border">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-zhu-sha' : 'text-muted-foreground'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
