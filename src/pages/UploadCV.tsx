import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Sparkles,
  AlertCircle,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { getValidToken } from "@/lib/auth";

interface UploadResponse {
  message: string;
  cv: {
    cv_id: string;
    filename: string;
    user_id: number;
    uploaded_at: string;
    extraction_method: string;
    skills_count: number;
  };
  skills: string[];
  skills_detected: number;
  extraction_method: string;
  type: string;
  success: boolean;
  text_preview?: string;
}

const UploadCV = () => {
  const navigate = useNavigate();
  const token = getValidToken();
  const hasToken = !!token;

  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  /* ======================
     HANDLE FILE CHANGE
  ====================== */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.pdf')) {
      toast.error("Chỉ chấp nhận file PDF!");
      setFile(null);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      toast.error("File quá lớn! Tối đa 10MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
    toast.success(`Đã chọn file: ${selectedFile.name}`);
  };

  /* ======================
     HANDLE UPLOAD
  ====================== */
  const handleUpload = async () => {
    // Check authentication
    if (!hasToken) {
      toast.error("Vui lòng đăng nhập để upload CV!");
      navigate("/login");
      return;
    }

    // Check file
    if (!file) {
      toast.error("Vui lòng chọn file PDF!");
      return;
    }

    setIsLoading(true);
    setUploadResult(null);

    const toastId = toast.loading("🤖 DeepSeek OCR đang phân tích CV của bạn...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://127.0.0.1:8000/upload-cv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // Handle 401 - token expired
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        toast.error("Phiên đăng nhập hết hạn!", { id: toastId });
        navigate("/login");
        return;
      }

      // Handle error response
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload thất bại!");
      }

      // Parse success response
      const data: UploadResponse = await res.json();

      setUploadResult(data);
      setFile(null);

      toast.success(
        `✅ Đã trích xuất ${data.skills_detected} kỹ năng bằng DeepSeek OCR!`,
        { id: toastId }
      );
    } catch (error: any) {
      console.error("Upload CV error:", error);
      
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        toast.error("Không thể kết nối đến server!", { id: toastId });
      } else {
        toast.error(error.message || "Có lỗi xảy ra khi upload!", { id: toastId });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4 shadow-lg">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Upload CV Cá Nhân
          </h1>
          <p className="text-gray-600">
            Tải CV (PDF) để trích xuất kỹ năng bằng AI DeepSeek OCR ✨
          </p>
        </div>

        {/* Auth Check */}
        {!hasToken && (
          <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-300">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-900 mb-1">
                  Bạn cần đăng nhập để upload CV
                </p>
                <p className="text-sm text-orange-700">
                  Đăng nhập để lưu CV và nhận phân tích cá nhân hóa.
                </p>
              </div>
              <Button
                className="ml-4 bg-orange-600 hover:bg-orange-700"
                onClick={() => navigate("/login")}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Đăng nhập
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Card */}
        <Card className="shadow-2xl border-none">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Tải CV của bạn
            </CardTitle>
            <CardDescription className="text-purple-100">
              File PDF, tối đa 10MB. DeepSeek OCR sẽ tự động trích xuất kỹ năng.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Upload Area */}
            <div
              className={`border-3 border-dashed rounded-2xl p-10 text-center transition-all ${
                file
                  ? "border-purple-400 bg-purple-50"
                  : "border-gray-300 bg-gray-50 hover:border-purple-300 hover:bg-purple-25"
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
                disabled={isLoading || !hasToken}
              />
              
              <label
                htmlFor="file-input"
                className={`cursor-pointer block ${!hasToken && 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                  
                  {file ? (
                    <>
                      <p className="font-semibold text-purple-600 text-lg">
                        📄 {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        disabled={isLoading}
                      >
                        Chọn file khác
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 font-medium">
                        {hasToken 
                          ? "Nhấp để chọn file CV (PDF)" 
                          : "Đăng nhập để upload CV"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Chỉ chấp nhận file PDF, tối đa 10MB
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || isLoading || !hasToken}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Đang phân tích với DeepSeek OCR...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload & Phân tích CV
                </>
              )}
            </Button>

            {/* Upload Result */}
            {uploadResult && (
              <div className="space-y-4 animate-fade-in">
                {/* Success Message */}
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-900 mb-1">
                      ✅ {uploadResult.message}
                    </p>
                    <p className="text-sm text-green-700">
                      Đã trích xuất {uploadResult.skills_detected} kỹ năng bằng {uploadResult.extraction_method}
                    </p>
                  </AlertDescription>
                </Alert>

                {/* CV Info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-900">
                      📄 Thông tin CV
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">File:</span>
                      <span className="font-medium text-gray-900">
                        {uploadResult.cv.filename}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ngày tải:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(uploadResult.cv.uploaded_at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Phương thức:</span>
                      <Badge className="bg-blue-600">
                        {uploadResult.cv.extraction_method}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Extracted Skills */}
                {uploadResult.skills.length > 0 && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Kỹ năng được trích xuất ({uploadResult.skills.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {uploadResult.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="bg-purple-100 text-purple-800 border-purple-300"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Text Preview */}
                {uploadResult.text_preview && (
                  <Card className="bg-gray-50 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-gray-700">
                        Preview nội dung CV
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-600 font-mono">
                        {uploadResult.text_preview}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Next Steps */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-indigo-900 mb-1">
                          🎯 Bước tiếp theo
                        </p>
                        <p className="text-sm text-indigo-700">
                          Xem danh sách công việc để phân tích độ phù hợp và nhận gợi ý khóa học.
                        </p>
                      </div>
                      <Button
                        className="ml-4 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => navigate("/jobs")}
                      >
                        Xem Jobs
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            💡 Mẹo: CV càng chi tiết, kỹ năng được trích xuất càng chính xác!
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadCV;