import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Video, 
  ShieldAlert, 
  Settings, 
  Brain,
  LogOut, 
  Menu, 
  X,
  Bell,
  User,
  Activity,
  Book,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: '实时监控', path: '/', icon: MapIcon },
    { name: '地图管理', path: '/maps', icon: MapIcon },
    { name: '报警中心', path: '/alarms', icon: ShieldAlert },
    { name: '摄像头管理', path: '/cameras', icon: Video },
    { name: '电子围栏', path: '/safety-zones', icon: LayoutDashboard },
    { name: 'AI 模型', path: '/models', icon: Brain },
    { name: '数据字典', path: '/dictionaries', icon: Book },
    { name: '操作日志', path: '/logs', icon: FileText },
    { name: '系统配置', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* 侧边栏 */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <Activity className="w-6 h-6 text-primary mr-2" />
            <span className="text-lg font-display font-bold tracking-wider text-sidebar-foreground">
              在岗监测系统
            </span>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <a className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 mr-3 transition-colors",
                      isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
                    )} />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* 用户信息 */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center">
              <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                  {user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-sidebar-foreground">{user?.full_name}</p>
                <p className="text-xs text-sidebar-foreground/60">{user?.role?.display_name}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-sm z-40">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden mr-2"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-medium text-foreground hidden sm:block">
              {navItems.find(i => i.path === location)?.name || '系统'}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* 报警通知 */}
            <Button variant="ghost" size="icon" className="relative text-foreground/70 hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
            </Button>

            {/* 用户菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人设置</DropdownMenuItem>
                <DropdownMenuItem>修改密码</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 relative">
          {children}
        </main>
      </div>

      {/* 移动端遮罩 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
