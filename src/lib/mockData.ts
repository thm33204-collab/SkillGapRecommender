export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary?: string;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  duration: string;
  skills: string[];
  matchScore?: number;
}

export interface CV {
  id: string;
  name: string;
  title: string;
  skills: string[];
  experience: string;
}

export const mockJobs: Job[] = [
  {
    id: "1",
    title: "Frontend Developer",
    company: "TechViet Solutions",
    location: "Hà Nội",
    type: "Full-time",
    description: "Chúng tôi đang tìm kiếm một Frontend Developer có kinh nghiệm để tham gia vào đội ngũ phát triển sản phẩm. Bạn sẽ làm việc với các công nghệ hiện đại và xây dựng các ứng dụng web tương tác cao.",
    requirements: [
      "Tốt nghiệp Đại học chuyên ngành CNTT hoặc tương đương",
      "Có ít nhất 2 năm kinh nghiệm với React/Vue",
      "Hiểu biết về responsive design và cross-browser compatibility",
      "Kỹ năng giao tiếp tốt và làm việc nhóm"
    ],
    skills: ["React", "TypeScript", "CSS", "HTML", "REST API", "Git"],
    salary: "15-25 triệu VNĐ"
  },
  {
    id: "2",
    title: "Data Analyst",
    company: "DataHub Vietnam",
    location: "Hồ Chí Minh",
    type: "Full-time",
    description: "Vị trí Data Analyst sẽ chịu trách nhiệm phân tích dữ liệu kinh doanh, xây dựng dashboard và báo cáo insights để hỗ trợ ra quyết định.",
    requirements: [
      "Tốt nghiệp Đại học chuyên ngành Toán, Thống kê, CNTT",
      "Thành thạo SQL và Python",
      "Kinh nghiệm với Power BI hoặc Tableau",
      "Tư duy logic và kỹ năng phân tích tốt"
    ],
    skills: ["Python", "SQL", "Power BI", "Excel", "Statistics", "Data Visualization"],
    salary: "12-20 triệu VNĐ"
  },
  {
    id: "3",
    title: "Backend Developer",
    company: "CloudTech Asia",
    location: "Đà Nẵng",
    type: "Full-time",
    description: "Phát triển và duy trì các hệ thống backend phục vụ hàng triệu người dùng. Làm việc với microservices và cloud infrastructure.",
    requirements: [
      "Kinh nghiệm 3+ năm với Node.js hoặc Java",
      "Hiểu biết về database design và optimization",
      "Kinh nghiệm với Docker và Kubernetes",
      "Có kiến thức về security best practices"
    ],
    skills: ["Node.js", "PostgreSQL", "Docker", "AWS", "REST API", "Microservices"],
    salary: "20-35 triệu VNĐ"
  },
  {
    id: "4",
    title: "UX/UI Designer",
    company: "Creative Studio VN",
    location: "Hà Nội",
    type: "Full-time",
    description: "Thiết kế trải nghiệm người dùng và giao diện cho các ứng dụng mobile và web. Làm việc chặt chẽ với team phát triển.",
    requirements: [
      "Portfolio thể hiện các dự án UX/UI",
      "Thành thạo Figma và Adobe XD",
      "Hiểu biết về design thinking và user research",
      "Khả năng làm việc độc lập và theo team"
    ],
    skills: ["Figma", "Adobe XD", "User Research", "Prototyping", "Design Systems", "Responsive Design"],
    salary: "15-28 triệu VNĐ"
  },
  {
    id: "5",
    title: "DevOps Engineer",
    company: "InfraTech Solutions",
    location: "Hồ Chí Minh",
    type: "Full-time",
    description: "Xây dựng và quản lý CI/CD pipeline, infrastructure as code, và monitoring systems.",
    requirements: [
      "Kinh nghiệm 2+ năm trong DevOps",
      "Thành thạo Linux và scripting",
      "Kinh nghiệm với cloud platforms (AWS/Azure/GCP)",
      "Hiểu biết về security và compliance"
    ],
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "Linux"],
    salary: "18-30 triệu VNĐ"
  }
];

export const mockCourses: Course[] = [
  {
    id: "c1",
    title: "Modern React Development",
    provider: "Udemy",
    duration: "40 giờ",
    skills: ["React", "TypeScript", "Redux", "Testing"]
  },
  {
    id: "c2",
    title: "Advanced CSS & Responsive Design",
    provider: "Frontend Masters",
    duration: "25 giờ",
    skills: ["CSS", "SASS", "Responsive Design", "Animations"]
  },
  {
    id: "c3",
    title: "Python for Data Analysis",
    provider: "Coursera",
    duration: "35 giờ",
    skills: ["Python", "Pandas", "NumPy", "Data Visualization"]
  },
  {
    id: "c4",
    title: "SQL Mastery for Data Science",
    provider: "DataCamp",
    duration: "20 giờ",
    skills: ["SQL", "Database Design", "Query Optimization"]
  },
  {
    id: "c5",
    title: "Node.js Backend Development",
    provider: "Udemy",
    duration: "45 giờ",
    skills: ["Node.js", "Express", "MongoDB", "REST API"]
  },
  {
    id: "c6",
    title: "Docker & Kubernetes Complete Guide",
    provider: "Udemy",
    duration: "30 giờ",
    skills: ["Docker", "Kubernetes", "Container Orchestration"]
  },
  {
    id: "c7",
    title: "UX Design Fundamentals",
    provider: "Interaction Design Foundation",
    duration: "28 giờ",
    skills: ["User Research", "Wireframing", "Prototyping", "Usability Testing"]
  },
  {
    id: "c8",
    title: "Figma UI/UX Design",
    provider: "Coursera",
    duration: "15 giờ",
    skills: ["Figma", "Design Systems", "Prototyping"]
  }
];

export const mockCVs: CV[] = [
  {
    id: "cv1",
    name: "Nguyễn Văn An",
    title: "Junior Frontend Developer",
    skills: ["HTML", "CSS", "JavaScript", "React", "Git"],
    experience: "1 năm kinh nghiệm"
  },
  {
    id: "cv2",
    name: "Trần Thị Bình",
    title: "Data Analyst Intern",
    skills: ["Python", "Excel", "SQL", "Statistics"],
    experience: "6 tháng thực tập"
  },
  {
    id: "cv3",
    name: "Lê Minh Cường",
    title: "Full Stack Developer",
    skills: ["React", "Node.js", "PostgreSQL", "Docker", "TypeScript", "REST API"],
    experience: "3 năm kinh nghiệm"
  },
  {
    id: "cv4",
    name: "Phạm Thu Hương",
    title: "UI/UX Designer",
    skills: ["Figma", "Adobe XD", "Photoshop", "Prototyping", "User Research"],
    experience: "2 năm kinh nghiệm"
  }
];

// Helper function to calculate skill match
export const calculateSkillMatch = (jobSkills: string[], cvSkills: string[]) => {
  const normalizeSkill = (skill: string) => skill.toLowerCase().trim();
  
  const normalizedJobSkills = jobSkills.map(normalizeSkill);
  const normalizedCVSkills = cvSkills.map(normalizeSkill);
  
  const matchedSkills = cvSkills.filter(skill => 
    normalizedJobSkills.includes(normalizeSkill(skill))
  );
  
  const missingSkills = jobSkills.filter(skill => 
    !normalizedCVSkills.includes(normalizeSkill(skill))
  );
  
  const matchScore = Math.round((matchedSkills.length / jobSkills.length) * 100);
  
  return {
    matchedSkills,
    missingSkills,
    matchScore
  };
};

// Get recommended courses based on missing skills
export const getRecommendedCourses = (missingSkills: string[]): Course[] => {
  const normalizeSkill = (skill: string) => skill.toLowerCase().trim();
  const normalizedMissingSkills = missingSkills.map(normalizeSkill);
  
  return mockCourses
    .filter(course => 
      course.skills.some(skill => 
        normalizedMissingSkills.includes(normalizeSkill(skill))
      )
    )
    .map(course => {
      const matchingSkillsCount = course.skills.filter(skill =>
        normalizedMissingSkills.includes(normalizeSkill(skill))
      ).length;
      return {
        ...course,
        matchScore: Math.round((matchingSkillsCount / missingSkills.length) * 100)
      };
    })
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
};
