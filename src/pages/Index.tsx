import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, Target } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="text-center max-w-xl">
        <h1 className="mb-4 text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Hệ thống gợi ý khóa học & phân tích kỹ năng
        </h1>

        <p className="text-lg text-muted-foreground mb-8">
          Khám phá công việc phù hợp và cải thiện kỹ năng dựa trên Job – Course – CV.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/jobs">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-primary">
              <Briefcase className="mr-2 h-5 w-5" />
              Xem danh sách công việc
            </Button>
          </Link>

          <Link to="/matching">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              <Target className="mr-2 h-5 w-5" />
              Phân tích Job - CV
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
