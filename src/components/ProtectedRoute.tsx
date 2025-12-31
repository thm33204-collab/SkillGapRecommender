import { Navigate } from "react-router-dom";
import { isLoggedIn } from "@/lib/auth"; // ✅ Import đúng từ lib/auth
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Kiểm tra user đã đăng nhập chưa
  if (!isLoggedIn()) {
    // Nếu chưa đăng nhập -> redirect về /login
    return <Navigate to="/login" replace />;
  }

  // Nếu đã đăng nhập -> render component children
  return <>{children}</>;
};

export default ProtectedRoute;