import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Briefcase,
  FileText,
  GraduationCap,
  LogIn,
  UserPlus,
  LogOut,
  User,
  Eye,
  Sparkles,
  LucideIcon,
} from "lucide-react";

// ✅ UI utils
import { cn } from "@/lib/utils";

// ✅ AUTH utils (JWT)
import { getValidToken, logout } from "@/lib/auth";

// ✅ TYPE: Navigation Item
interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = getValidToken();
  const loggedIn = !!token;

  // =============================================
  // 🎯 MENU ITEMS - TÁCH RIÊNG THEO USER TYPE
  // =============================================

  // ✅ Menu cho GUEST (chưa đăng nhập)
  const guestNavItems: NavItem[] = [
    {
      path: "/",
      label: "Trang chủ",
      icon: Home,
    },
    {
      path: "/jobs",
      label: "Danh sách công việc",
      icon: Briefcase,
    },
    {
      path: "/analysis",  // ✅ Route riêng cho demo
      label: "Demo phân tích CV",
      icon: Eye,
      badge: "Demo",
      badgeColor: "bg-blue-500"
    },
  ];

  // ✅ Menu cho USER (đã đăng nhập)
  const userNavItems: NavItem[] = [
    {
      path: "/",
      label: "Trang chủ",
      icon: Home,
    },
    {
      path: "/jobs",
      label: "Danh sách công việc",
      icon: Briefcase,
    },
    {
      path: "/analysis",  // ✅ Route riêng cho personal
      label: "Phân tích CV cá nhân",
      icon: Sparkles,
      badge: "Cá nhân",
      badgeColor: "bg-green-500"
    },
  ];

  // ✅ Chọn menu dựa trên trạng thái đăng nhập
  const navItems = loggedIn ? userNavItems : guestNavItems;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* ===== LOGO ===== */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-2">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Career Guide
            </span>
          </Link>

          {/* ===== MENU LEFT (MAIN) ===== */}
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 relative",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  
                  {/* BADGE (nếu có) */}
                  {item.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded text-white ml-1",
                      item.badgeColor
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ===== MENU RIGHT (AUTH) ===== */}
          <div className="flex items-center space-x-2">
            
            {/* ✅ MODE: GUEST (Chưa đăng nhập) */}
            {!loggedIn && (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Đăng nhập</span>
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm hover:from-blue-700 hover:to-indigo-700 transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Đăng ký</span>
                </button>
              </>
            )}

            {/* ✅ MODE: USER (Đã đăng nhập) */}
            {loggedIn && (
              <>
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                >
                  <User className="h-4 w-4" />
                  <span>Trang cá nhân</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};