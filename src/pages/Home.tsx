import { useNavigate } from "react-router-dom"; // ✅ IMPORT useNavigate
import {
  Search,
  FileText,
  GraduationCap,
  Sparkles,
  Target,
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate(); // ✅ SỬ DỤNG HOOK

  return (
    <div className="w-full">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 py-20">
        {/* Blur background */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-yellow-300 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-pink-300 rounded-full blur-3xl opacity-30 animate-pulse" />

        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* LEFT */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6 border border-white/30 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">
                AI-Powered Career Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Tìm kiếm công việc <br />
              <span className="text-yellow-300">mơ ước của bạn</span>
            </h1>

            <p className="text-xl text-white/90 mb-8">
              Hệ thống phân tích{" "}
              <span className="font-bold text-yellow-300">
                Job – CV – Kỹ năng
              </span>{" "}
              bằng AI, giúp bạn biết mình đã có gì và còn thiếu gì để đạt được
              công việc mong muốn.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                className="px-6 py-3 bg-white text-purple-600 hover:bg-yellow-300 hover:text-purple-700 font-semibold shadow-xl rounded-lg flex items-center gap-2 transition-all transform hover:scale-105"
                onClick={() => navigate("/jobs")} // ✅ NAVIGATE ĐÚNG
              >
                <Search className="h-5 w-5" />
                Khám phá công việc
              </button>

              <button
                className="px-6 py-3 bg-white text-purple-600 hover:bg-yellow-400 hover:text-gray-900 font-semibold shadow-xl rounded-lg flex items-center gap-2 transition-all transform hover:scale-105"
                onClick={() => navigate("/analysis")} // ✅ NAVIGATE ĐÚNG
              >
                <FileText className="h-5 w-5" />
                Phân tích CV ngay
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-3xl blur-2xl opacity-50" />
              <div className="relative z-10 bg-white rounded-3xl p-8 shadow-2xl max-w-md">
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-50"></div>
                    <Search className="relative h-24 w-24 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Tìm việc thông minh</h3>
                  <p className="text-gray-600 text-center">Với công nghệ AI hiện đại</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Tính năng nổi bật 🚀
            </h2>
            <p className="text-xl text-gray-600">
              Công nghệ AI giúp bạn phát triển sự nghiệp hiệu quả
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CARD 1 */}
            <div
              onClick={() => navigate("/jobs")} // ✅ NAVIGATE ĐÚNG
              className="group cursor-pointer p-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl text-white
              transition-all duration-300 ease-out
              hover:-translate-y-4 hover:shadow-2xl"
            >
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mb-6
                transition-transform duration-300 group-hover:scale-110">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Gợi ý công việc</h3>
              <p>
                Đề xuất công việc phù hợp dựa trên kỹ năng và mục tiêu nghề
                nghiệp.
              </p>
            </div>

            {/* CARD 2 */}
            <div
              onClick={() => navigate("/analysis")} // ✅ NAVIGATE ĐÚNG
              className="group cursor-pointer p-8 bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl text-white
              transition-all duration-300 ease-out
              hover:-translate-y-4 hover:shadow-2xl"
            >
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mb-6
                transition-transform duration-300 group-hover:scale-110">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Phân tích CV</h3>
              <p>
                So sánh CV với yêu cầu công việc để xác định kỹ năng còn thiếu.
              </p>
            </div>

            {/* CARD 3 */}
            <div
              onClick={() => navigate("/jobs")} // ✅ NAVIGATE ĐÚNG
              className="group cursor-pointer p-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white
              transition-all duration-300 ease-out
              hover:-translate-y-4 hover:shadow-2xl"
            >
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mb-6
                transition-transform duration-300 group-hover:scale-110">
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Gợi ý khóa học</h3>
              <p>
                Đề xuất khóa học giúp bạn lấp đầy khoảng trống kỹ năng nhanh
                nhất.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Sẵn sàng bắt đầu hành trình mới? ✨
        </h2>
        <button
          className="px-8 py-4 bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold rounded-lg inline-flex items-center gap-2 transition-all transform hover:scale-105 shadow-xl"
          onClick={() => navigate("/jobs")} // ✅ NAVIGATE ĐÚNG
        >
          <Target className="h-6 w-6" />
          Bắt đầu ngay - Miễn phí
        </button>
      </section>
    </div>
  );
};

export default Home;