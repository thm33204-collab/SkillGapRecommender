import { useEffect, useState } from "react";
import { Search, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/jobs/JobCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * 🔧 Type definitions matching backend response
 */
interface JobRequirements {
  skills_required?: string[];
  education?: string;
  experience?: string;
}

interface Job {
  job_id: string;
  title: string;
  company: string;
  location: string;
  employment_type?: string;
  experience_level?: string;
  salary_range?: string;
  description?: string;
  requirements?: JobRequirements;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const JobList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 50;

  // =====================================
  // 🔥 FETCH JOBS FROM BACKEND
  // =====================================
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE_URL}/jobs`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Backend không phản hồi`);
        }

        const data: JobsResponse = await res.json();

        if (data.jobs && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          console.log(`✅ Đã tải ${data.total} công việc`);
        } else {
          throw new Error("Format dữ liệu không hợp lệ");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Lỗi không xác định";
        console.error("❌ Lỗi tải jobs:", errorMessage);
        setError(
          "Không thể tải danh sách công việc. Vui lòng kiểm tra kết nối backend."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // =====================================
  // 🔍 SEARCH FILTER (Case-insensitive)
  // =====================================
  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase().trim();
    const skills = job.requirements?.skills_required || [];

    return (
      job.title?.toLowerCase().includes(term) ||
      job.company?.toLowerCase().includes(term) ||
      job.location?.toLowerCase().includes(term) ||
      job.description?.toLowerCase().includes(term) ||
      skills.some((skill) => skill.toLowerCase().includes(term))
    );
  });

  // =====================================
  // 📄 PAGINATION LOGIC
  // =====================================
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // =====================================
  // ⏳ LOADING STATE
  // =====================================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          Đang tải danh sách công việc...
        </p>
      </div>
    );
  }

  // =====================================
  // ❌ ERROR STATE
  // =====================================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // =====================================
  // ✅ MAIN UI
  // =====================================
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Khám phá cơ hội nghề nghiệp
          </h1>
          <p className="text-muted-foreground text-lg">
            Tìm kiếm công việc phù hợp với kỹ năng của bạn
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Tổng số: <span className="font-semibold">{jobs.length}</span> công việc
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="Tìm kiếm công việc, công ty, địa điểm hoặc kỹ năng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results count */}
        {searchTerm && (
          <div className="mb-4 text-sm text-muted-foreground">
            Tìm thấy <span className="font-semibold">{filteredJobs.length}</span>{" "}
            kết quả cho "{searchTerm}"
          </div>
        )}

        {/* Pagination info */}
        {filteredJobs.length > 0 && (
          <div className="mb-4 text-sm text-muted-foreground">
            Hiển thị {startIndex + 1}–{Math.min(endIndex, filteredJobs.length)} trong tổng số{" "}
            <span className="font-semibold">{filteredJobs.length}</span> công việc
          </div>
        )}

        {/* Job Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {currentJobs.map((job, index) => (
            <JobCard
              key={job.job_id}
              index={startIndex + index}
              job={{
                id: job.job_id,
                title: job.title,
                company: job.company,
                location: job.location,
                skills: job.requirements?.skills_required || [],
              }}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {filteredJobs.length > jobsPerPage && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((page, idx) => (
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </Button>
                )
              ))}

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Trang {currentPage} / {totalPages}
            </p>
          </div>
        )}

        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">
              Không tìm thấy công việc phù hợp
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? `Không có kết quả cho "${searchTerm}"`
                : "Danh sách công việc trống"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-primary hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobList;