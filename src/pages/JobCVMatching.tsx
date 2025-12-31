import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Loader2, Upload, Sparkles, CheckCircle2, XCircle, AlertCircle, LogIn, Trash2, Users, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getValidToken } from "@/lib/auth";

/* ======================
  TYPE DEFINITIONS
====================== */
interface Job {
  job_id: string;
  title: string;
  company: string;
  level?: string;
  requirements?: {
    skills_required?: string[];
  };
}

interface DemoCV {
  cv_id: string;
  student_id?: string;
  major?: string;
  skills: string[];
  gpa?: number;
}

interface PersonalCV {
  cv_id: string;
  filename: string;
  user_id: number;
  skills: string[];
  upload_date?: string;
  stats?: {
    total_skills: number;
    from_llm: number;
    from_rules: number;
    extraction_method: string;
  };
}

interface RecommendedCourse {
  course_id: string;
  title: string;
  platform: string;
  url?: string;
  rating?: number;
  duration?: string;
  level?: string;
  relevance_score?: number;
  skills_outcomes?: string[];
  relevant_skills?: string[];
  skill_coverage?: number;
}

// ✅ FIXED: Updated MatchResult interface
interface MatchResult {
  job_id: string;
  cv_id: string;
  // Demo mode fields
  match_score?: number;
  level?: string;
  assessment?: string;
  // Personal mode fields (NEW)
  semantic_fit_score?: number;
  skill_coverage_score?: number;
  explanations?: string[];
  // Common fields
  job_skills_required: string[];
  cv_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  num_matched: number;
  num_missing: number;
  recommended_courses?: RecommendedCourse[];
  extraction_stats?: any;
  type: "demo" | "user";
}

const JobCVMatching = () => {
  const navigate = useNavigate();
  
  // Mode selection
  const [mode, setMode] = useState<"demo" | "personal">("demo");
  
  // Common data
  const [jobs, setJobs] = useState<Job[]>([]);
  
  // Demo mode data
  const [demoCVs, setDemoCVs] = useState<DemoCV[]>([]);
  const [selectedDemoJobId, setSelectedDemoJobId] = useState<string>();
  const [selectedDemoCVId, setSelectedDemoCVId] = useState<string>();
  
  // Personal mode data
  const [personalCVs, setPersonalCVs] = useState<PersonalCV[]>([]);
  const [selectedPersonalJobId, setSelectedPersonalJobId] = useState<string>();
  const [selectedPersonalCVId, setSelectedPersonalCVId] = useState<string>();
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [deletingCVId, setDeletingCVId] = useState<string | null>(null);

  const token = getValidToken();
  const hasToken = !!token;

  /* ======================
    FETCH DATA
  ====================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Fetch jobs (public)
        const jobRes = await fetch("http://127.0.0.1:8000/jobs");
        if (!jobRes.ok) throw new Error("Không thể tải danh sách công việc");
        
        const jobsData = await jobRes.json();
        setJobs(Array.isArray(jobsData) ? jobsData : jobsData.jobs || []);

        // ✅ Fetch demo CVs (public)
        const demoCVRes = await fetch("http://127.0.0.1:8000/demo-cvs");
        if (demoCVRes.ok) {
          const demoCVData = await demoCVRes.json();
          setDemoCVs(Array.isArray(demoCVData) ? demoCVData : demoCVData.cvs || []);
        }

        // ✅ Fetch personal CVs (authenticated)
        if (hasToken) {
          const personalCVRes = await fetch("http://127.0.0.1:8000/user-cvs", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (personalCVRes.status === 401) {
            localStorage.removeItem("access_token");
            toast.error("Phiên đăng nhập hết hạn");
            return;
          }

          if (personalCVRes.ok) {
            const personalCVData = await personalCVRes.json();
            setPersonalCVs(Array.isArray(personalCVData) ? personalCVData : personalCVData.cvs || []);
          }
        }

      } catch (err: any) {
        console.error("Lỗi fetch data:", err);
        toast.error(err.message || "Không thể tải dữ liệu!");
      }
    };

    fetchData();
  }, [hasToken, token]);

  /* ======================
    DEMO MODE: ANALYZE
  ====================== */
  const handleDemoAnalyze = async () => {
    if (!selectedDemoJobId || !selectedDemoCVId) {
      toast.error("Vui lòng chọn Job và CV mẫu");
      return;
    }

    setLoading(true);
    setMatchResult(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/match-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedDemoJobId,
          cv_id: selectedDemoCVId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Phân tích thất bại");
      }

      const data = await res.json();
      setMatchResult(data);
      toast.success("✅ Phân tích CV mẫu hoàn tất");
    } catch (err: any) {
      toast.error(err.message || "Lỗi phân tích");
    } finally {
      setLoading(false);
    }
  };

  /* ======================
    PERSONAL MODE: UPLOAD CV
  ====================== */
  const handleUploadCV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasToken) {
      toast.error("Vui lòng đăng nhập để tải CV!");
      navigate("/login");
      return;
    }

    if (!file.name.endsWith('.pdf')) {
      toast.error("Chỉ chấp nhận file PDF!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    toast.info("🤖 Đang phân tích CV bằng HYBRID extraction (LLM + Rules)...");

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-cv", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        toast.error("Phiên đăng nhập hết hạn");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload thất bại");
      }

      const data = await res.json();
      
      const newCV: PersonalCV = {
        cv_id: data.cv_id,
        filename: file.name,
        user_id: 0,
        skills: data.skills || [],
        upload_date: new Date().toISOString(),
        stats: data.extraction_stats
      };

      setPersonalCVs((prev) => [newCV, ...prev]);
      setSelectedPersonalCVId(newCV.cv_id);

      toast.success(`✅ CV đã được phân tích thành công! Trích xuất ${data.skills_extracted} kỹ năng`);
      
      if (data.extraction_stats) {
        const method = data.extraction_stats.extraction_method;
        toast.info(`🔍 Phương pháp: ${method}`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Lỗi upload CV!");
    }

    event.target.value = '';
  };

  /* ======================
    PERSONAL MODE: DELETE CV
  ====================== */
  const handleDeleteCV = async (cvId: string) => {
    if (!hasToken) {
      toast.error("Vui lòng đăng nhập!");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa CV này?")) {
      return;
    }

    setDeletingCVId(cvId);

    try {
      const res = await fetch(`http://127.0.0.1:8000/user-cvs/${cvId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        toast.error("Phiên đăng nhập hết hạn");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Xóa CV thất bại");
      }

      setPersonalCVs((prev) => prev.filter(cv => cv.cv_id !== cvId));
      
      if (selectedPersonalCVId === cvId) {
        setSelectedPersonalCVId(undefined);
        setMatchResult(null);
      }

      toast.success("✅ Đã xóa CV thành công!");
    } catch (err: any) {
      console.error("Delete CV error:", err);
      toast.error(err.message || "Lỗi xóa CV!");
    } finally {
      setDeletingCVId(null);
    }
  };

  /* ======================
    PERSONAL MODE: ANALYZE
  ====================== */
  const handlePersonalAnalyze = async () => {
    if (!selectedPersonalJobId) {
      toast.error("Vui lòng chọn công việc!");
      return;
    }

    if (!hasToken) {
      toast.error("Vui lòng đăng nhập để phân tích!");
      navigate("/login");
      return;
    }

    if (!selectedPersonalCVId) {
      toast.error("Vui lòng tải lên CV!");
      return;
    }

    setLoading(true);
    setMatchResult(null);

    try {
      const requestBody = {
        job_id: selectedPersonalJobId,
        cv_id: selectedPersonalCVId
      };
      
      console.log("🔍 Sending request:", requestBody);
      console.log("🔑 Token:", token ? "exists" : "missing");

      const res = await fetch("http://127.0.0.1:8000/match-user-cv", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      console.log("📡 Response status:", res.status);

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        toast.error("Phiên đăng nhập hết hạn");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ Backend error:", errorData);
        
        let errorMessage = "Phân tích thất bại";
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e: any) => 
              `${e.loc?.join('.')}: ${e.msg}`
            ).join(", ");
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("✅ Match result:", data);
      
      setMatchResult(data);
      toast.success("✅ Phân tích cá nhân hóa hoàn tất!");
    } catch (err: any) {
      console.error("❌ Personal match error:", err);
      toast.error(err.message || "Lỗi phân tích!");
    } finally {
      setLoading(false);
    }
  };

  /* ======================
    COMPUTED VALUES
  ====================== */
  const selectedDemoJob = jobs.find((j) => j.job_id === selectedDemoJobId);
  const selectedDemoCV = demoCVs.find((cv) => cv.cv_id === selectedDemoCVId);
  
  const selectedPersonalJob = jobs.find((j) => j.job_id === selectedPersonalJobId);
  const selectedPersonalCV = personalCVs.find((cv) => cv.cv_id === selectedPersonalCVId);

  /* ======================
    ✅ FIXED: RENDER MATCH RESULT
  ====================== */
  const renderMatchResult = (result: MatchResult) => {
    const isDemo = result.type === "demo";
    const job = jobs.find(j => j.job_id === result.job_id);
    const cv = isDemo 
      ? demoCVs.find(c => c.cv_id === result.cv_id)
      : personalCVs.find(c => c.cv_id === result.cv_id);
    
    // ✅ FIX: Calculate display score based on mode
    const displayScore = isDemo 
      ? result.match_score 
      : result.skill_coverage_score;
    
    const hasScore = displayScore !== undefined;
    
    return (
      <Card className="border border-gray-200 shadow-xl bg-white">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Kết quả đánh giá
          </CardTitle>
          <CardDescription className="text-purple-100">
            {isDemo 
              ? "📊 Phân tích DEMO với CV mẫu từ dataset" 
              : "🎯 Phân tích CÁ NHÂN HÓA với CV của bạn"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Info Badge */}
          <div className="flex justify-center">
            <Badge className={isDemo ? "bg-blue-600" : "bg-green-600"}>
              {isDemo ? "🎓 Demo Mode" : "👤 Personal Mode"}
            </Badge>
          </div>

          {/* ✅ FIX: Score Display */}
          {hasScore && (
            <div className="text-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-md">
              <p className="text-sm mb-1 font-medium opacity-90">
                {isDemo ? "Độ phù hợp" : "Độ phủ kỹ năng"}
              </p>
              <p className="text-6xl font-bold">
                {displayScore!.toFixed(1)}%
              </p>
              {result.assessment && (
                <p className="text-sm mt-2 opacity-90">{result.assessment}</p>
              )}
            </div>
          )}

          {/* ✅ NEW: Personal Mode - Semantic Fit Score */}
          {!isDemo && result.semantic_fit_score !== undefined && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Độ phù hợp ngữ nghĩa</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {(result.semantic_fit_score * 100).toFixed(1)}%
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          )}

          {/* ✅ NEW: Explanations (Personal Mode only) */}
          {!isDemo && result.explanations && result.explanations.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Đánh giá chi tiết
              </h3>
              <ul className="space-y-2">
                {result.explanations.map((exp, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Job & CV Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
              <p className="text-sm font-semibold text-cyan-900 mb-2">🎯 Công việc</p>
              <p className="font-medium text-gray-900">{job?.title}</p>
              <p className="text-sm text-gray-600">{job?.company}</p>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900 mb-2">
                {isDemo ? "📋 CV Demo" : "📄 CV Cá nhân"}
              </p>
              {isDemo && cv && 'student_id' in cv ? (
                <>
                  <p className="font-medium text-gray-900">Student ID: {cv.student_id}</p>
                  <p className="text-sm text-gray-600">{cv.major}</p>
                </>
              ) : cv && 'filename' in cv ? (
                <>
                  <p className="font-medium text-gray-900">{cv.filename}</p>
                  {result.extraction_stats && (
                    <p className="text-xs text-gray-500 mt-1">
                      🤖 {result.extraction_stats.extraction_method || "hybrid-llm-rules"}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>
              {/* Matched Skills */}
          <div className="bg-green-50 p-5 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-lg text-green-800">
                Kỹ năng đã có ({result.num_matched})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.matched_skills.length > 0 ? (
                result.matched_skills.map((s) => (
                  <Badge key={s} className="bg-green-600 hover:bg-green-700 text-white">
                    {s}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 italic text-sm">Chưa có kỹ năng phù hợp</p>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div className="bg-red-50 p-5 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-lg text-red-800">
                Kỹ năng còn thiếu ({result.num_missing})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.missing_skills.length > 0 ? (
                result.missing_skills.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="border-red-400 text-red-700 bg-white"
                  >
                    {s}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 italic text-sm">Đáp ứng đầy đủ yêu cầu 🎉</p>
              )}
            </div>
          </div>

          {/* Extraction Stats (Personal Mode only) */}
          {!isDemo && result.extraction_stats && (
            <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-lg text-purple-800 mb-3">
                📊 Thống kê trích xuất
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Tổng skills</p>
                  <p className="font-bold text-purple-900">{result.extraction_stats.total_skills}</p>
                </div>
                <div>
                  <p className="text-gray-600">Từ LLM</p>
                  <p className="font-bold text-purple-900">{result.extraction_stats.from_llm}</p>
                </div>
                <div>
                  <p className="text-gray-600">Từ Rules</p>
                  <p className="font-bold text-purple-900">{result.extraction_stats.from_rules}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phương pháp</p>
                  <p className="font-bold text-purple-900 text-xs">
                    {result.extraction_stats.extraction_method?.replace('hybrid-', '')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Courses */}
          {result.recommended_courses && result.recommended_courses.length > 0 && (
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg text-blue-800 mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Khóa học được đề xuất ({result.recommended_courses.length})
              </h3>
              <div className="space-y-3">
                {result.recommended_courses.map((course) => (
                  <div key={course.course_id} className="bg-white p-4 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{course.title}</p>
                        <p className="text-sm text-gray-600">{course.platform}</p>
                        {course.level && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {course.level}
                          </Badge>
                        )}
                      </div>
                      {course.relevance_score !== undefined && (
                        <Badge className="bg-blue-600">{course.relevance_score.toFixed(0)}%</Badge>
                      )}
                    </div>
                    
                    {course.relevant_skills && course.relevant_skills.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Kỹ năng liên quan:</p>
                        <div className="flex flex-wrap gap-1">
                          {course.relevant_skills.map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs border-blue-300">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {course.skill_coverage !== undefined && (
                      <div className="mt-2 text-xs text-gray-500">
                        Độ phủ: {course.skill_coverage.toFixed(0)}% kỹ năng còn thiếu
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /* ======================
    UI
  ====================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-3 rounded-lg shadow-md">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Phân tích độ phù hợp Job – CV
            </h1>
          </div>
          <p className="text-gray-600 ml-16">
            Chọn giữa Demo Mode (CV mẫu) hoặc Personal Mode (CV cá nhân với Hybrid Extraction)
          </p>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => {
          setMode(v as "demo" | "personal");
          setMatchResult(null);
        }} className="mb-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="demo" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Demo Mode
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Personal Mode
            </TabsTrigger>
          </TabsList>

          {/* DEMO MODE */}
          <TabsContent value="demo" className="space-y-6">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-900 mb-1">
                  🎓 Demo Mode - Test với 100 CV mẫu từ dataset
                </p>
                <p className="text-sm text-blue-700">
                  Không cần đăng nhập. Chọn job và CV mẫu để xem phân tích độ phù hợp.
                </p>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demo Job Selection */}
              <Card className="border border-gray-200 shadow-lg bg-white">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Chọn công việc
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <Select
                    value={selectedDemoJobId}
                    onValueChange={(v) => {
                      setSelectedDemoJobId(v);
                      setMatchResult(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công việc" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.job_id} value={job.job_id}>
                          {job.title} – {job.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDemoJob && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Kỹ năng yêu cầu:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDemoJob.requirements?.skills_required?.map((skill) => (
                          <Badge key={skill} className="bg-blue-600">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Demo CV Selection */}
              <Card className="border border-gray-200 shadow-lg bg-white">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Chọn CV mẫu
                  </CardTitle>
                  <CardDescription className="text-emerald-50">
                    {demoCVs.length} CV từ student dataset
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Select
                    value={selectedDemoCVId}
                    onValueChange={(v) => {
                      setSelectedDemoCVId(v);
                      setMatchResult(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn CV mẫu" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoCVs.map((cv) => (
                        <SelectItem key={cv.cv_id} value={cv.cv_id}>
                          {cv.student_id} - {cv.major} ({cv.skills.length} skills)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDemoCV && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Student: {selectedDemoCV.student_id}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">{selectedDemoCV.major}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDemoCV.skills.slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {selectedDemoCV.skills.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{selectedDemoCV.skills.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Demo Analyze Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleDemoAnalyze}
                disabled={!selectedDemoJobId || !selectedDemoCVId || loading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-5 w-5" />
                    Phân tích Demo
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* PERSONAL MODE */}
          <TabsContent value="personal" className="space-y-6">
            {!hasToken ? (
              <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-300">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-orange-900 mb-1">
                      Bạn cần đăng nhập để sử dụng Personal Mode
                    </p>
                    <p className="text-sm text-orange-700">
                      Đăng nhập để tải CV và nhận phân tích cá nhân hóa với Hybrid Extraction.
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
            ) : personalCVs.length === 0 ? (
              <Alert className="bg-green-50 border-green-300">
                <Upload className="h-5 w-5 text-green-600" />
                <AlertDescription>
                  <p className="font-semibold text-green-900 mb-1">
                    👤 Personal Mode - Upload CV cá nhân
                  </p>
                  <p className="text-sm text-green-700">
                    Tải CV của bạn (PDF) để được phân tích bằng Hybrid Extraction (LLM + Rules) và nhận gợi ý khóa học cá nhân hóa.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-purple-50 border-purple-300">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <AlertDescription>
                  <p className="font-semibold text-purple-900 mb-1">
                    ✨ Personal Mode Active
                  </p>
                  <p className="text-sm text-purple-700">
                    Phân tích được cá nhân hóa dựa trên CV của bạn (đã trích xuất bằng Hybrid Extraction).
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Job Selection */}
              <Card className="border border-gray-200 shadow-lg bg-white">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Chọn công việc
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <Select
                    value={selectedPersonalJobId}
                    onValueChange={(v) => {
                      setSelectedPersonalJobId(v);
                      setMatchResult(null);
                    }}
                    disabled={!hasToken}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={hasToken ? "Chọn công việc" : "Đăng nhập để chọn"} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.job_id} value={job.job_id}>
                          {job.title} – {job.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedPersonalJob && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Kỹ năng yêu cầu:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPersonalJob.requirements?.skills_required?.map((skill) => (
                          <Badge key={skill} className="bg-blue-600">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personal CV Management */}
              <Card className="border border-gray-200 shadow-lg bg-white">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5" />
                    CV Cá nhân
                  </CardTitle>
                  <CardDescription className="text-emerald-50">
                    Hybrid Extraction (LLM + Rules)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Select
                    value={selectedPersonalCVId}
                    onValueChange={(v) => {
                      setSelectedPersonalCVId(v);
                      setMatchResult(null);
                    }}
                    disabled={!hasToken || personalCVs.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !hasToken ? "Đăng nhập để chọn CV" : 
                        personalCVs.length === 0 ? "Chưa có CV" : 
                        "Chọn CV"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {personalCVs.map((cv) => (
                        <SelectItem key={cv.cv_id} value={cv.cv_id}>
                          📄 {cv.filename} ({cv.skills.length} skills)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-4">
                    <input
                      type="file"
                      hidden
                      id="cvUploadInput"
                      accept=".pdf"
                      onChange={handleUploadCV}
                    />
                    <Button
                      variant="outline"
                      className={`w-full ${
                        hasToken 
                          ? "border-green-400 text-green-700 hover:bg-green-50" 
                          : "border-gray-300 text-gray-400"
                      }`}
                      onClick={() => {
                        if (!hasToken) {
                          navigate("/login");
                        } else {
                          document.getElementById("cvUploadInput")?.click();
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {hasToken ? "Tải CV mới (PDF)" : "Đăng nhập để tải CV"}
                    </Button>
                  </div>

                  {selectedPersonalCV && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-700">
                            📄 {selectedPersonalCV.filename}
                          </p>
                          {selectedPersonalCV.stats && (
                            <p className="text-xs text-gray-500 mt-1">
                              🤖 {selectedPersonalCV.stats.extraction_method}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(selectedPersonalCV.upload_date || "").toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1"
                          onClick={() => handleDeleteCV(selectedPersonalCV.cv_id)}
                          disabled={deletingCVId === selectedPersonalCV.cv_id}
                        >
                          {deletingCVId === selectedPersonalCV.cv_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {selectedPersonalCV.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedPersonalCV.skills.slice(0, 8).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs border-green-500">
                              {skill}
                            </Badge>
                          ))}
                          {selectedPersonalCV.skills.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{selectedPersonalCV.skills.length - 8}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Chưa có kỹ năng</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Personal Analyze Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handlePersonalAnalyze}
                disabled={!selectedPersonalJobId || !selectedPersonalCVId || loading || !hasToken}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Phân tích cá nhân hóa
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Match Result */}
        {matchResult && renderMatchResult(matchResult)}
      </div>
    </div>
  );
};

export default JobCVMatching;
