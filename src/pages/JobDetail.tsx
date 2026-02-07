import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, CheckCircle, Sparkles, AlertCircle, Target, Upload, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getValidToken } from "@/lib/auth";

/* ======================
   TYPES
====================== */
interface Job {
  job_id: string;
  title: string;
  company: string;
  location: string;
  employment_type?: string;
  salary_range?: string;
  job_description?: string;
  responsibilities?: string[];
  requirements?: {
    skills_required?: string[];
  };
}

interface Course {
  course_id: string;
  title: string;
  platform?: string;
  url?: string;
  rating?: number;
  duration?: string;
  level?: string;
  relevance_score?: number;
  skills_outcomes?: string[];
  relevant_skills?: string[];
  skill_coverage?: number;
}

interface UserCV {
  cv_id: string;
  filename: string;
  skills: string[];
  upload_date: string;
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCVs, setUserCVs] = useState<UserCV[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCourses, setShowCourses] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingUserCVs, setLoadingUserCVs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getValidToken();
  const isLoggedIn = !!token;
  const hasCV = userCVs.length > 0;

  // Xác định chế độ hiện tại
  const mode = !isLoggedIn ? "guest" : !hasCV ? "logged_no_cv" : "logged_has_cv";

  // =====================
  // FETCH JOB DETAIL
  // =====================
  useEffect(() => {
    if (!id) return;

    const fetchJobDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const jobRes = await fetch(`http://127.0.0.1:8000/jobs/${id}`);
        
        if (!jobRes.ok) {
          if (jobRes.status === 404) {
            throw new Error("Không tìm thấy công việc");
          }
          throw new Error(`Lỗi HTTP ${jobRes.status}`);
        }

        const jobData: Job = await jobRes.json();
        setJob(jobData);

      } catch (err: any) {
        console.error("Error fetching job:", err);
        const msg = err?.message || "Không thể tải dữ liệu";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetail();
  }, [id]);

  // =====================
  // FETCH USER CVs (if logged in)
  // =====================
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchUserCVs = async () => {
      try {
        setLoadingUserCVs(true);
        
        const res = await fetch("http://127.0.0.1:8000/user-cvs", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUserCVs(data.cvs || []);
        }
      } catch (err) {
        console.error("Error fetching user CVs:", err);
      } finally {
        setLoadingUserCVs(false);
      }
    };

    fetchUserCVs();
  }, [isLoggedIn, token]);

  // =====================
  // FETCH COURSES - CÓ 2 LUỒNG
  // =====================
  const handleSuggestCourses = async () => {
    if (!job) return;

    setShowCourses(true);
    
    if (courses.length > 0) {
      return;
    }

    const jobSkills = job.requirements?.skills_required || [];
    
    if (jobSkills.length === 0) {
      toast.info("Công việc này chưa có danh sách kỹ năng yêu cầu");
      return;
    }

    setLoadingCourses(true);

    try {
      // ===== LUỒNG 1: GUEST hoặc LOGGED_NO_CV → Course chung =====
      if (mode === "guest" || mode === "logged_no_cv") {
        console.log("🌐 Fetching general courses for job skills");
        
        const res = await fetch("http://127.0.0.1:8000/recommend-courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(jobSkills)
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();
        
        if (data.recommended_courses && data.recommended_courses.length > 0) {
          setCourses(data.recommended_courses);
          toast.success(`✅ Tìm thấy ${data.recommended_courses.length} khóa học phù hợp`);
        } else {
          toast.info("Chưa có khóa học phù hợp");
          setCourses([]);
        }
      }
      
      // ===== LUỒNG 2: LOGGED_HAS_CV → Course CÁ NHÂN HÓA =====
      else if (mode === "logged_has_cv") {
        console.log("👤 Fetching PERSONALIZED courses based on CV");
        
        // Lấy CV đầu tiên (hoặc cho user chọn)
        const userCV = userCVs[0];
        const cvSkills = userCV.skills || [];
        
        // Tìm skill gaps - chuẩn hóa để so sánh
        const jobSkillsSet = new Set(jobSkills.map(s => s.toLowerCase().trim()));
        const cvSkillsSet = new Set(cvSkills.map(s => s.toLowerCase().trim()));
        
        const missingSkills = jobSkills.filter(skill => 
          !cvSkillsSet.has(skill.toLowerCase().trim())
        );
        
        console.log("Job skills:", jobSkills);
        console.log("CV skills:", cvSkills);
        console.log("Missing skills:", missingSkills);
        
        if (missingSkills.length === 0) {
          toast.success("🎉 Bạn đã có đủ kỹ năng yêu cầu!");
          setCourses([]);
          setLoadingCourses(false);
          return;
        }
        
        // Gợi ý courses cho missing skills
        const res = await fetch("http://127.0.0.1:8000/recommend-courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(missingSkills)
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();
        
        if (data.recommended_courses && data.recommended_courses.length > 0) {
          setCourses(data.recommended_courses);
          toast.success(`✅ Tìm thấy ${data.recommended_courses.length} khóa học bù đắp ${missingSkills.length} kỹ năng thiếu`);
        } else {
          toast.info("Chưa có khóa học phù hợp");
          setCourses([]);
        }
      }
      
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      toast.error(err.message || "Lỗi khi tải khóa học");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  // =====================
  // LOADING STATE
  // =====================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // =====================
  // ERROR STATE
  // =====================
  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Không tìm thấy công việc"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const jobRequiredSkills = job.requirements?.skills_required || [];

  // =====================
  // RENDER TOP ALERT - THEO CHẾ ĐỘ
  // =====================
  const renderTopAlert = () => {
    // MODE 1: GUEST
    if (mode === "guest") {
      return (
        <Alert className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <LogIn className="h-5 w-5 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900 mb-1">
                🔐 Đăng nhập để mở khóa tính năng đầy đủ
              </p>
              <p className="text-sm text-blue-700">
                • Phân tích độ phù hợp CV với công việc<br />
                • Nhận gợi ý khóa học cá nhân hóa dựa trên kỹ năng thiếu<br />
                • Xem demo với CV mẫu
              </p>
            </div>
            <Button
              className="ml-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 whitespace-nowrap"
              onClick={() => navigate("/login")}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Đăng nhập
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    // MODE 2: LOGGED BUT NO CV
    if (mode === "logged_no_cv") {
      return (
        <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <Upload className="h-5 w-5 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-orange-900 mb-1">
                📤 Tải CV lên để nhận gợi ý cá nhân hóa
              </p>
              <p className="text-sm text-orange-700">
                Hiện tại bạn đang xem khóa học chung. Upload CV để:<br />
                • Nhận gợi ý khóa học BÙ ĐẮP kỹ năng thiếu<br />
                • Phân tích độ phù hợp chi tiết với công việc này
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50 whitespace-nowrap"
                onClick={() => navigate("/job-cv-matching")}
              >
                🎭 Xem Demo
              </Button>
              <Button
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 whitespace-nowrap"
                onClick={() => navigate("/job-cv-matching")}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CV
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    // MODE 3: HAS CV
    if (mode === "logged_has_cv") {
      return (
        <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-900 mb-1">
                ✅ Chế độ cá nhân hóa đã bật
              </p>
              <p className="text-sm text-green-700">
                Khóa học dưới đây được gợi ý dựa trên <strong>kỹ năng thiếu</strong> của CV bạn so với công việc này.
                <br />
                CV hiện tại: <strong>{userCVs[0]?.filename}</strong>
              </p>
            </div>
            <Button
              className="ml-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 whitespace-nowrap"
              onClick={() => navigate("/job-cv-matching")}
            >
              <Target className="h-4 w-4 mr-2" />
              Phân tích chi tiết
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
  };

  // =====================
  // RENDER COURSE INFO ALERT
  // =====================
  const renderCourseInfoAlert = () => {
    if (mode === "guest") {
      return (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <p className="font-medium text-blue-900 mb-1">
              📚 Khóa học dựa trên kỹ năng yêu cầu chung
            </p>
            <p className="text-xs text-blue-700">
              Đây là gợi ý chung cho vị trí này. <strong>Đăng nhập</strong> để nhận gợi ý cá nhân hóa.
            </p>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (mode === "logged_no_cv") {
      return (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm">
            <p className="font-medium text-orange-900 mb-1">
              📚 Khóa học chung cho vị trí này
            </p>
            <p className="text-xs text-orange-700">
              <strong>Upload CV</strong> để nhận gợi ý khóa học bù đắp kỹ năng thiếu của bạn.
            </p>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (mode === "logged_has_cv") {
      return (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm">
            <p className="font-medium text-green-900 mb-1">
              🎯 Khóa học CÁ NHÂN HÓA cho bạn
            </p>
            <p className="text-xs text-green-700">
              Dựa trên <strong>kỹ năng thiếu</strong> của CV so với yêu cầu công việc.
            </p>
          </AlertDescription>
        </Alert>
      );
    }
  };

  // =====================
  // RENDER
  // =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">

        {/* BACK BUTTON */}
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </Link>

        {/* TOP ALERT - DYNAMIC BY MODE */}
        {renderTopAlert()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN - JOB INFO */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* JOB CARD */}
            <Card className="bg-white border-2 border-gray-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardTitle className="text-3xl">{job.title}</CardTitle>
                <p className="text-lg opacity-90">{job.company}</p>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium">{job.location}</span>
                </div>

                {job.employment_type && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      {job.employment_type}
                    </Badge>
                  </div>
                )}

                {job.salary_range && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-semibold text-green-700 flex items-center gap-2">
                      💰 Mức lương: {job.salary_range}
                    </p>
                  </div>
                )}

                {job.job_description && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">📝 Mô tả công việc</h3>
                    <p className="text-gray-700 leading-relaxed">{job.job_description}</p>
                  </div>
                )}

                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-3">🎯 Trách nhiệm công việc</h3>
                    <ul className="space-y-2">
                      {job.responsibilities.map((r, i) => (
                        <li key={i} className="flex gap-3">
                          <CheckCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {jobRequiredSkills.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-3">
                      ✨ Kỹ năng yêu cầu ({jobRequiredSkills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {jobRequiredSkills.map((skill, idx) => (
                        <Badge key={idx} className="bg-orange-600 hover:bg-orange-700 text-white">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* INFO CARD */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-600 p-3 rounded-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      💡 Gợi ý từ hệ thống
                    </h3>
                    <p className="text-sm text-green-700 mb-2">
                      Các kỹ năng yêu cầu cho vị trí này có thể được cải thiện dần thông qua việc
                      học tập và tích lũy kinh nghiệm.
                    </p>
                    {mode === "guest" && (
                      <p className="text-sm text-green-700 font-medium">
                        🔐 Đăng nhập để xem demo phân tích CV-Job với dữ liệu mẫu!
                      </p>
                    )}
                    {mode === "logged_no_cv" && (
                      <p className="text-sm text-green-700 font-medium">
                        📤 Upload CV để nhận roadmap học tập cá nhân hóa!
                      </p>
                    )}
                    {mode === "logged_has_cv" && (
                      <p className="text-sm text-green-700 font-medium">
                        ✅ Bạn đang ở chế độ cá nhân hóa. Khóa học bên cạnh đã được điều chỉnh dựa trên CV của bạn.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - COURSES */}
          <div>
            <Card className="sticky top-20 border-2 border-pink-200 shadow-xl bg-gradient-to-br from-pink-50 to-yellow-50">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Khóa học đề xuất
                  {mode === "logged_has_cv" && (
                    <Badge className="ml-2 bg-white text-purple-600">
                      Cá nhân hóa
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">

                {/* INFO ALERT */}
                {renderCourseInfoAlert()}

                {/* BUTTON: SHOW COURSES */}
                {!showCourses && (
                  <Button 
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" 
                    onClick={handleSuggestCourses}
                    disabled={jobRequiredSkills.length === 0}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {mode === "logged_has_cv" 
                      ? "Xem khóa học bù đắp kỹ năng thiếu" 
                      : "Xem khóa học phù hợp"}
                  </Button>
                )}

                {jobRequiredSkills.length === 0 && (
                  <p className="text-sm text-center text-gray-500 italic">
                    Công việc này chưa có danh sách kỹ năng yêu cầu
                  </p>
                )}

                {/* LOADING COURSES */}
                {loadingCourses && (
                  <div className="text-center py-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-pink-200 rounded w-3/4 mx-auto"></div>
                      <div className="h-4 bg-pink-200 rounded w-1/2 mx-auto"></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {mode === "logged_has_cv" 
                        ? "Đang phân tích kỹ năng thiếu..." 
                        : "Đang tìm khóa học..."}
                    </p>
                  </div>
                )}

                {/* COURSES LIST */}
                {showCourses && !loadingCourses && courses.length > 0 && (
                  <div className="space-y-3">
                    
                    {/* HEADER */}
                    <div className={`p-3 rounded-md border ${
                      mode === "logged_has_cv" 
                        ? "bg-green-50 border-green-200" 
                        : "bg-blue-50 border-blue-200"
                    }`}>
                      <p className={`text-sm font-medium flex items-center gap-2 ${
                        mode === "logged_has_cv" ? "text-green-700" : "text-blue-700"
                      }`}>
                        <Sparkles className="h-4 w-4" />
                        {mode === "logged_has_cv" 
                          ? `Top ${courses.length} khóa học bù đắp kỹ năng thiếu` 
                          : `Top ${courses.length} khóa học phù hợp`}
                      </p>
                      <p className={`text-xs mt-1 ${
                        mode === "logged_has_cv" ? "text-green-600" : "text-blue-600"
                      }`}>
                        {mode === "logged_has_cv" 
                          ? "Dựa trên phân tích CV của bạn" 
                          : `Dựa trên ${jobRequiredSkills.length} kỹ năng yêu cầu của công việc`}
                      </p>
                    </div>

                    {/* COURSE CARDS */}
                    {courses.map((course, index) => (
                      <div 
                        key={course.course_id} 
                        className={`p-4 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all cursor-pointer border-l-4 ${
                          mode === "logged_has_cv" 
                            ? "border-green-400 hover:border-green-600" 
                            : "border-blue-400 hover:border-blue-600"
                        }`}
                        onClick={() => course.url && window.open(course.url, "_blank")}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                mode === "logged_has_cv" 
                                  ? "text-green-600 bg-green-100" 
                                  : "text-blue-600 bg-blue-100"
                              }`}>
                                #{index + 1}
                              </span>
                              <h4 className="font-semibold text-indigo-700 hover:underline text-sm">
                                {course.title}
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {course.platform && (
                                <Badge variant="outline" className="text-xs">
                                  📚 {course.platform}
                                </Badge>
                              )}
                              {course.level && (
                                <Badge variant="outline" className="text-xs">
                                  📊 {course.level}
                                </Badge>
                              )}
                              {course.duration && (
                                <Badge variant="outline" className="text-xs">
                                  ⏱️ {course.duration}
                                </Badge>
                              )}
                            </div>

                            {course.rating && (
                              <p className="text-sm text-yellow-600 mt-2">
                                ⭐ {course.rating.toFixed(1)}
                              </p>
                            )}
                          </div>
                          
                          {course.relevance_score && (
                            <Badge className="bg-green-600 ml-2">
                              {course.relevance_score.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        
                        {/* RELEVANT SKILLS */}
                        {course.relevant_skills && course.relevant_skills.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-600 mb-2">
                              {mode === "logged_has_cv" ? "Kỹ năng bạn cần học:" : "Kỹ năng liên quan:"}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {course.relevant_skills.map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SKILLS OUTCOMES */}
                        {course.skills_outcomes && course.skills_outcomes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-600 mb-2">Kỹ năng học được:</p>
                            <div className="flex flex-wrap gap-1">
                              {course.skills_outcomes.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-green-300">
                                  {skill}
                                </Badge>
                              ))}
                              {course.skills_outcomes.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{course.skills_outcomes.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SKILL COVERAGE */}
                        {course.skill_coverage !== undefined && (
                          <div className="mt-2 text-xs text-gray-500">
                            📈 Độ phủ: {course.skill_coverage.toFixed(0)}% kỹ năng yêu cầu
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* EMPTY STATE */}
                {showCourses && !loadingCourses && courses.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-2">
                      {mode === "logged_has_cv" 
                        ? "🎉 Bạn đã có đủ kỹ năng yêu cầu!" 
                        : "Chưa có khóa học phù hợp"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {mode === "logged_has_cv" 
                        ? "CV của bạn đã đáp ứng tất cả kỹ năng cho vị trí này" 
                        : "Hệ thống chưa tìm thấy khóa học khớp với các kỹ năng yêu cầu"}
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default JobDetail;