import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, CheckCircle, Sparkles, AlertCircle, Target } from "lucide-react";
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

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCourses, setShowCourses] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getValidToken();
  const hasToken = !!token;

  // =====================
  // FETCH JOB DETAIL
  // =====================
  useEffect(() => {
    if (!id) return;

    const fetchJobDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Fetch job detail (public endpoint)
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
  // ✅ FIXED: FETCH COURSES (PUBLIC)
  // =====================
  const handleSuggestCourses = async () => {
    if (!job) return;

    setShowCourses(true);
    
    // Nếu đã có courses, không fetch lại
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
      // ✅ Backend expects: POST /recommend-courses with body: List[str] directly
      console.log("Sending skills:", jobSkills);
      
      const res = await fetch("http://127.0.0.1:8000/recommend-courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(jobSkills)  // ✅ Send array directly, NOT {skills: [...]}
      });
      
      console.log("Response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Backend error:", errorData);
        throw new Error(errorData?.detail || `HTTP ${res.status}: Không thể tải khóa học`);
      }

      const data = await res.json();
      console.log("Courses data:", data);
      
      if (data.recommended_courses && data.recommended_courses.length > 0) {
        setCourses(data.recommended_courses);
        toast.success(`✅ Tìm thấy ${data.total_recommended || data.recommended_courses.length} khóa học phù hợp`);
      } else {
        toast.info("Chưa có khóa học phù hợp với các kỹ năng này");
        setCourses([]);
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

        {/* TOP ALERT - CTA để đi đến JobCVMatching */}
        <Alert className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <Target className="h-5 w-5 text-purple-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-purple-900 mb-1">
                💡 Muốn kiểm tra độ phù hợp CV với công việc này?
              </p>
              <p className="text-sm text-purple-700">
                {!hasToken 
                  ? "Đăng nhập và upload CV để nhận phân tích cá nhân hóa với Hybrid Extraction (LLM + Rules)"
                  : "Đi đến trang Job-CV Matching để phân tích chi tiết"}
              </p>
            </div>
            <Button
              className="ml-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 whitespace-nowrap"
              onClick={() => navigate("/job-cv-matching")}
            >
              <Target className="h-4 w-4 mr-2" />
              {hasToken ? "Phân tích CV" : "Đăng nhập & Phân tích"}
            </Button>
          </AlertDescription>
        </Alert>

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

            {/* INFO CARD - How to get personalized analysis */}
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
                    <h3 className="font-semibold text-green-900 mb-2">
                      🎯 Muốn biết mình phù hợp bao nhiêu %?
                    </h3>
                    <ul className="text-sm text-green-700 space-y-1 mb-4">
                      <li>• Phân tích độ phù hợp CV với công việc này</li>
                      <li>• So sánh kỹ năng bạn có vs yêu cầu công việc</li>
                      <li>• Nhận gợi ý khóa học cá nhân hóa cho kỹ năng còn thiếu</li>
                      <p>
                        Các kỹ năng yêu cầu cho vị trí này có thể được cải thiện dần thông qua việc
                        học tập và tích lũy kinh nghiệm.
                        Những khóa học phù hợp bên cạnh sẽ giúp bạn từng bước chuẩn bị tốt hơn
                        cho công việc mong muốn.
                      </p>
                    </ul>
                    
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
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">

                {/* INFO ALERT */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">
                      📚 Khóa học dựa trên kỹ năng yêu cầu
                    </p>
                    <p className="text-xs text-blue-700">
                      Đây là gợi ý chung cho vị trí này. Để nhận gợi ý cá nhân hóa, hãy dùng Job-CV Matching.
                    </p>
                  </AlertDescription>
                </Alert>

                {/* BUTTON: SHOW COURSES */}
                {!showCourses && (
                  <Button 
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" 
                    onClick={handleSuggestCourses}
                    disabled={jobRequiredSkills.length === 0}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Xem khóa học phù hợp
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
                    <p className="text-sm text-muted-foreground mt-2">Đang tìm khóa học...</p>
                  </div>
                )}

                {/* COURSES LIST */}
                {showCourses && !loadingCourses && courses.length > 0 && (
                  <div className="space-y-3">
                    
                    {/* HEADER */}
                    <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                      <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Top {courses.length} khóa học phù hợp
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Dựa trên {jobRequiredSkills.length} kỹ năng yêu cầu của công việc
                      </p>
                    </div>

                    {/* COURSE CARDS */}
                    {courses.map((course, index) => (
                      <div 
                        key={course.course_id} 
                        className="p-4 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all cursor-pointer border-l-4 border-blue-400 hover:border-blue-600"
                        onClick={() => course.url && window.open(course.url, "_blank")}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
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
                            <p className="text-xs text-gray-600 mb-2">Kỹ năng liên quan:</p>
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
                      Chưa có khóa học phù hợp
                    </p>
                    <p className="text-xs text-gray-400">
                      Hệ thống chưa tìm thấy khóa học khớp với các kỹ năng yêu cầu
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