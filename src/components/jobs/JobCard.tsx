import { Link } from "react-router-dom";
import { MapPin, Building2, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Danh sách màu pastel tươi sáng
const pastelColors = [
  "bg-blue-50",
  "bg-indigo-50",
  "bg-purple-50",
  "bg-pink-50",
  "bg-emerald-50",
  "bg-teal-50",
  "bg-yellow-50",
  "bg-orange-50",
];

export const JobCard = ({ job, index }: any) => {
  // Lấy màu theo index để Job nào cũng tươi
  const colorClass = pastelColors[index % pastelColors.length];

  return (
    <Link to={`/jobs/${job.id}`}>
      <Card
        className={`
          ${colorClass}
          border border-primary/20 
          shadow-sm 
          hover:shadow-xl 
          hover:-translate-y-1
          transition-all 
          cursor-pointer 
          rounded-2xl
        `}
      >
        <CardContent className="p-6 space-y-3">

          {/* Title + Company */}
          <div>
            <h2 className="font-bold text-xl text-primary mb-1">
              {job.title}
            </h2>
            <p className="text-muted-foreground flex items-center gap-1">
              <Building2 className="h-4 w-4" /> {job.company}
            </p>
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground gap-2">
            <MapPin className="h-4 w-4" /> {job.location}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {job.skills.slice(0, 3).map((skill: string) => (
              <Badge
                key={skill}
                className="
                  bg-blue-600 
                  text-white 
                  shadow-sm 
                  hover:opacity-90
                "
              >
                {skill}
              </Badge>
            ))}

            {job.skills.length > 3 && (
              <Badge className="bg-green-600 text-white">
                +{job.skills.length - 3}
              </Badge>
            )}
          </div>

          {/* Job Type */}
          <div className="pt-2">
            <Badge className="bg-green-100 text-green-700 border border-green-300">
              <Briefcase className="h-3 w-3 mr-1" /> Full-time
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
