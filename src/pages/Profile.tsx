import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, FileText, LogOut, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getValidToken, logout } from "@/lib/auth";
import { toast } from "sonner";

/* ======================
   TYPES
====================== */
interface UserInfo {
  id: number;
  email: string;
  created_at: string;
}

interface CV {
  cv_id: string;
  filename: string;
  user_id: number;
  skills: string[];
  uploaded_at?: string;
  extraction_method?: string;
  skills_count?: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const token = getValidToken();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingCVId, setDeletingCVId] = useState<string | null>(null);

  /* ======================
     FETCH USER DATA
  ====================== */
  const fetchUserData = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch user info
      const userRes = await fetch("http://127.0.0.1:8000/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          toast.error("Phiên đăng nhập đã hết hạn");
          logout();
          navigate("/login");
          return;
        }
        throw new Error("Không thể tải thông tin user");
      }

      const userData = await userRes.json();
      setUserInfo(userData);

      // 2. Fetch CVs
      const cvRes = await fetch("http://127.0.0.1:8000/user-cvs", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (cvRes.ok) {
        const cvData = await cvRes.json();
        if (Array.isArray(cvData)) {
          setCvs(cvData);
        } else if (cvData.cvs && Array.isArray(cvData.cvs)) {
          setCvs(cvData.cvs);
        }
      }

    } catch (error: any) {
      console.error("Error fetching user data:", error);
      toast.error(error.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [token, navigate]);

  /* ======================
     HANDLERS
  ====================== */
  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login");
  };

  const handleDeleteCV = async (cvId: string, filename: string) => {
    if (!token) {
      toast.error("Vui lòng đăng nhập!");
      navigate("/login");
      return;
    }

    // Confirm before delete
    if (!confirm(`Bạn có chắc chắn muốn xóa CV "${filename}"?`)) {
      return;
    }

    setDeletingCVId(cvId);

    try {
      const res = await fetch(`http://127.0.0.1:8000/cvs/${cvId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      // Handle 401 - token expired
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
        logout();
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Xóa CV thất bại");
      }

      // Success - refetch CVs
      toast.success(`✅ Đã xóa CV "${filename}" thành công!`);
      
      // Refetch CVs to update the list
      const cvRes = await fetch("http://127.0.0.1:8000/user-cvs", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (cvRes.ok) {
        const cvData = await cvRes.json();
        if (Array.isArray(cvData)) {
          setCvs(cvData);
        } else if (cvData.cvs && Array.isArray(cvData.cvs)) {
          setCvs(cvData.cvs);
        }
      }

    } catch (err: any) {
      console.error("Delete CV error:", err);
      toast.error(err.message || "Lỗi xóa CV!");
    } finally {
      setDeletingCVId(null);
    }
  };

  /* ======================
     LOADING STATE
  ====================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  // Extract username from email (part before @)
  const username = userInfo.email.split('@')[0];
  
  // Format date
  const joinDate = new Date(userInfo.created_at).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* ===== HEADER CARD ===== */}
        <Card className="mb-6 border-none shadow-xl overflow-hidden">
          {/* Background gradient */}
          <div className="h-32 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Profile info */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center border-4 border-white shadow-lg">
                <User className="w-16 h-16 text-white" />
              </div>
            </div>

            {/* Logout button */}
            <div className="flex justify-end pt-4">
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="shadow-md"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>

            {/* User details */}
            <div className="mt-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {username}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{userInfo.email}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Tham gia: {joinDate}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{cvs.length} CV</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ===== TABS ===== */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="info" className="text-base">
              Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger value="cvs" className="text-base">
              CV của tôi ({cvs.length})
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB: THÔNG TIN CÁ NHÂN ===== */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin tài khoản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Email */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{userInfo.email}</p>
                  </div>
                </div>

                {/* User ID */}
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-semibold text-gray-900">#{userInfo.id}</p>
                  </div>
                </div>

                {/* Join Date */}
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ngày tham gia</p>
                    <p className="font-semibold text-gray-900">{joinDate}</p>
                  </div>
                </div>

                {/* Total CVs */}
                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tổng số CV</p>
                    <p className="font-semibold text-gray-900">{cvs.length} CV</p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: CV CỦA TÔI ===== */}
          <TabsContent value="cvs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Danh sách CV
                  </CardTitle>
                  <Button
                    onClick={() => navigate("/analysis")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    + Tải CV mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cvs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Bạn chưa có CV nào
                    </p>
                    <Button
                      onClick={() => navigate("/analysis")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Tải lên CV đầu tiên
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cvs.map((cv) => (
                      <div
                        key={cv.cv_id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              {cv.filename}
                            </h3>
                            
                            <div className="space-y-1 mb-3">
                              {cv.uploaded_at && (
                                <p className="text-sm text-gray-500">
                                  📅 Tải lên: {new Date(cv.uploaded_at).toLocaleString('vi-VN')}
                                </p>
                              )}
                              
                              {cv.extraction_method && (
                                <p className="text-sm text-gray-500">
                                  🤖 Phương thức: {cv.extraction_method}
                                </p>
                              )}
                              
                              <p className="text-sm text-gray-500">
                                📊 {cv.skills.length} kỹ năng được trích xuất
                              </p>
                            </div>

                            {cv.skills.length > 0 ? (
                              <div>
                                <p className="text-xs text-gray-600 mb-2 font-medium">
                                  Kỹ năng:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {cv.skills.slice(0, 10).map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                  {cv.skills.length > 10 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{cv.skills.length - 10} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">
                                Chưa có kỹ năng được trích xuất
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCV(cv.cv_id, cv.filename)}
                            disabled={deletingCVId === cv.cv_id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                          >
                            {deletingCVId === cv.cv_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

export default Profile;