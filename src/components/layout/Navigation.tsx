import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Briefcase,
  FileText,
  GraduationCap,
  LogIn,
  UserPlus,
  LogOut,
  Upload,
  User, // ✅ THÊM ICON USER
} from "lucide-react";

// ✅ UI utils
import { cn } from "@/lib/utils";

// ✅ AUTH utils (JWT) - SỬ DỤNG getValidToken thay vì isLoggedIn
import { getValidToken, logout } from "@/lib/auth";

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const loggedIn = !!getValidToken(); // ✅ CHECK TOKEN HỢP LỆ

  // ===== MENU ITEMS - PHÂN BIỆT THEO TRẠNG THÁI ĐĂNG NHẬP =====
  
  // Menu chung (luôn hiển thị)
  const publicNavItems = [
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
  ];

  // Menu riêng cho user đã đăng nhập
  const authenticatedNavItems = [
    {
      path: "/matching",
      label: "Phân tích CV",
      icon: FileText,
    },
  ];

  // Kết hợp menu dựa trên trạng thái
  const navItems = loggedIn 
    ? [...publicNavItems, ...authenticatedNavItems]
    : publicNavItems;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* ===== LOGO ===== */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-gradient-primary rounded-lg p-2">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl bg-gradient-primary bg-clip-text text-transparent">
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
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center space-x-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition-all duration-300",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* ===== MENU RIGHT (AUTH) ===== */}
          <div className="flex items-center space-x-2">
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
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Đăng ký</span>
                </button>
              </>
            )}

            {loggedIn && (
              <>
                {/* ✅ THÊM NÚT PROFILE */}
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                >
                  <User className="h-4 w-4" />
                  <span>Trang cá nhân</span>
                </button>

                <button
                  onClick={() => navigate("/upload-cv")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload CV</span>
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