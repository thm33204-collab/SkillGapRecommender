import json, random, uuid

skills_pool = [
    "Python", "SQL", "Excel", "Power BI", "Django", "Flask",
    "Machine Learning", "Deep Learning", "Java", "C#", "JavaScript",
    "React", "Node.js", "Communication", "Teamwork", "Problem Solving",
    "Data Analysis", "Cloud Computing", "AWS", "Git", "Docker"
]

locations = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hybrid", "Remote"]
providers = ["NEU", "Coursera", "Udemy", "edX", "Funix", "FPT Academy"]
course_levels = ["Beginner", "Intermediate", "Advanced"]

job_titles = [
    "Data Analyst", "Backend Developer", "Frontend Developer",
    "QA Engineer", "Marketing Specialist", "Business Analyst",
    "UI/UX Designer", "Cloud Engineer"
]

course_names = [
    "Python Fundamentals", "SQL Basic to Advanced", "Data Visualization",
    "React for Beginners", "Machine Learning Intro", "Docker Essentials",
    "Cloud Basics", "Business Analysis Starter"
]

def random_skills(n=4):
    return random.sample(skills_pool, n)

# ---------------------------
# CREATE JOBS (50)
# ---------------------------
jobs = []
for i in range(50):
    jobs.append({
        "job_id": str(uuid.uuid4()),
        "title": random.choice(job_titles),
        "company": random.choice(["FPT", "VNG", "VNPT", "Momo", "Tiki", "Shopee"]),
        "location": random.choice(locations),
        "description": "Mô tả công việc liên quan đến " + random.choice(skills_pool),
        "requirements": "Yêu cầu ứng viên có tinh thần học hỏi và thái độ tốt.",
        "skills_required": random_skills(5)
    })

# ---------------------------
# CREATE COURSES (50)
# ---------------------------
courses = []
for i in range(50):
    courses.append({
        "course_id": str(uuid.uuid4()),
        "name": random.choice(course_names),
        "provider": random.choice(providers),
        "description": "Khoá học cung cấp kiến thức nền tảng và kỹ năng thực hành.",
        "skills_outcomes": random_skills(3),
        "level": random.choice(course_levels)
    })

# ---------------------------
# CREATE CVS (50)
# ---------------------------
cvs = []
for i in range(50):
    cvs.append({
        "cv_id": str(uuid.uuid4()),
        "student_name": "Student " + str(i+1),
        "summary": "Sinh viên năng động, yêu thích công nghệ.",
        "education": "Đại học Kinh tế Quốc dân",
        "experiences": "Tham gia nhiều dự án nhỏ tại trường.",
        "courses_taken": random.sample([c["course_id"] for c in courses], 3),
        "skills": random_skills(6)
    })

json.dump(jobs, open("jobs.json", "w", encoding="utf-8"), ensure_ascii=False, indent=4)
json.dump(courses, open("courses.json", "w", encoding="utf-8"), ensure_ascii=False, indent=4)
json.dump(cvs, open("cvs.json", "w", encoding="utf-8"), ensure_ascii=False, indent=4)

print("✓ DONE — Tạo xong 50 job, 50 course, 50 CV!")
