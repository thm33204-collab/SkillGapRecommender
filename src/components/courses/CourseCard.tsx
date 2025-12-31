import { Clock, BookOpen, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  course: {
    id: string;
    name: string;
    provider: string;
    skills: string[];
    similarity?: number; // optional – để hiển thị % phù hợp
  };
  showMatchScore?: boolean;
}

export const CourseCard = ({ course, showMatchScore = false }: CourseCardProps) => {
  return (
    <Card className="hover:shadow-md transition-all duration-300 border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex-1">{course.name}</CardTitle>

          {showMatchScore && course.similarity !== undefined && (
            <Badge className="ml-2 bg-success">
              {(course.similarity * 100).toFixed(1)}% phù hợp
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* Provider */}
        <div className="flex items-center text-muted-foreground text-sm">
          <BookOpen className="h-4 w-4 mr-2" />
          <span>{course.provider}</span>
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center text-sm font-medium mb-2">
            <Award className="h-4 w-4 mr-2 text-secondary" />
            <span>Kỹ năng đạt được:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {course.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
