import json
import uuid
import random
import time
import os
from dotenv import load_dotenv
import google.generativeai as genai

# ==================================================
# LOAD ENV
# ==================================================
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY chưa được set trong environment")

genai.configure(api_key=GEMINI_API_KEY)

# ==================================================
# USE GEMINI 2.5 FLASH (✅ ĐÚNG MODEL)
# ==================================================
model = genai.GenerativeModel("models/gemini-2.5-flash")

# ==================================================
# CONFIG
# ==================================================
OUTPUT_FILE = "jobs.json"
TOTAL_JOBS = 2000   # bạn có thể giảm xuống 50 để test trước

# ==================================================
# DATA (GIỮ NGUYÊN CỦA BẠN)
# ==================================================
COMPANIES = [
  "FPT", "VNG", "Shopee", "Tiki", "VNPT", "MoMo",
  "Viettel", "CMC", "VCCorp", "Bkav",
  "Rikkeisoft", "NashTech", "KMS", "TMA",
  "Savvycom", "Luvina", "GMO-Z", "VMO",
  "Netcompany", "Axon Active", "Saigon Technology",
  "Designveloper", "Adamo", "Newwave Solutions",
  "Kyanon Digital", "AgileTech", "Golden Owl",
  "Techvify", "Enlab", "Creative Force",
  "VinAI", "VNG Cloud", "Zalo AI", "Cốc Cốc",
  "Grab", "Be Group", "Gojek", "Lazada",
  "Sendo", "VNPAY", "Payoo", "VNLife",
  "Techcombank", "VPBank", "MB Bank",
  "ACB", "TPBank", "Vietcombank",
  "Bosch", "Intel", "IBM", "Microsoft",
  "Amazon", "Google", "Meta", "Accenture",
  "Deloitte", "PwC", "KPMG", "EY",
  "NAB", "Standard Chartered", "HSBC Tech",
  "Samsung R&D", "LG CNS", "Hancom",
  "Nokia", "Ericsson", "Cisco",
  "Oracle", "SAP", "Atlassian",
  "Toshiba", "Panasonic", "Sony",
  "ShopeePay", "Zalopay", "VNDirect",
  "SSI Digital", "Masan Tech", "VinBigData",
  "VinID", "VinFast IT", "VNPost IT"
]

LOCATIONS = [
    "Hà Nội", "Thái Nguyên", "Quảng Ninh", "Bắc Ninh",
    "Bắc Giang", "Hồ Chí Minh", "Vũng Tàu",
    "Đà Nẵng", "Remote", "Hybrid"
]

JOB_TEMPLATES = [
  { "title": "Frontend Developer", "skills": ["JavaScript", "React", "HTML", "CSS", "Git"] },
  { "title": "Backend Developer", "skills": ["Java", "SQL", "Docker", "Git", "Problem Solving"] },
  { "title": "Fullstack Developer", "skills": ["JavaScript", "React", "Node.js", "SQL", "Git"] },
  { "title": "Mobile Developer", "skills": ["Flutter", "React Native", "Android", "iOS", "Git"] },
  { "title": "Game Developer", "skills": ["Unity", "C#", "Game Design", "OOP"] },
  { "title": "Embedded Engineer", "skills": ["C/C++", "Embedded Systems", "Microcontroller"] },
  { "title": "System Engineer", "skills": ["Linux", "System Administration", "Networking"] },
  { "title": "API Developer", "skills": ["REST API", "Node.js", "Authentication", "Git"] },

  { "title": "Data Analyst", "skills": ["SQL", "Excel", "Data Analysis", "Power BI", "Communication"] },
  { "title": "Data Engineer", "skills": ["Python", "ETL", "SQL", "Airflow", "Big Data"] },
  { "title": "Data Scientist", "skills": ["Python", "Machine Learning", "Statistics", "SQL"] },

  { "title": "AI Engineer", "skills": ["Python", "Machine Learning", "Deep Learning"] },
  { "title": "ML Engineer", "skills": ["Python", "TensorFlow", "Model Deployment", "Docker"] },

  { "title": "Cloud Engineer", "skills": ["AWS", "Cloud Computing", "Docker", "Linux", "Monitoring"] },
  { "title": "DevOps Engineer", "skills": ["CI/CD", "Docker", "Kubernetes", "Linux"] },

  { "title": "QA Engineer", "skills": ["Software Testing", "Test Case Design", "Bug Tracking", "Excel"] },
  { "title": "Automation QA Engineer", "skills": ["Selenium", "Automation Testing", "Python", "CI/CD"] },

  { "title": "Product Manager", "skills": ["Product Strategy", "Roadmap Planning", "Stakeholder Management"] },
  { "title": "Business Analyst", "skills": ["Business Analysis", "Requirement Gathering", "SQL"] },

  { "title": "UI/UX Designer", "skills": ["UI Design", "UX Research", "Figma", "Prototyping"] },
  { "title": "Digital Marketing Specialist", "skills": ["Digital Marketing", "SEO", "Content Creation"] },

  { "title": "IT Support Engineer", "skills": ["Technical Support", "Troubleshooting", "Communication"] }
]

# ==================================================
# GEMINI FUNCTIONS
# ==================================================
def generate_job_description(title, skills):
    prompt = f"""
Write a professional job description (3–4 sentences) for the position:
{title}

Required skills: {", ".join(skills)}

Make it realistic and suitable for the Vietnam IT job market.
"""
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.7,
            "max_output_tokens": 300
        }
    )
    return response.text.strip()


def generate_responsibilities(title):
    prompt = f"""
List exactly 4 concise job responsibilities for a {title}.
Return only bullet points.
"""
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.6,
            "max_output_tokens": 200
        }
    )

    lines = response.text.split("\n")
    return [
        l.replace("-", "").replace("•", "").strip()
        for l in lines if l.strip()
    ][:4]

# ==================================================
# MAIN
# ==================================================
def main():
    jobs = []

    for i in range(TOTAL_JOBS):
        template = random.choice(JOB_TEMPLATES)
        title = template["title"]
        skills = template["skills"]

        print(f"🛠 Generating job {i+1}/{TOTAL_JOBS} - {title}")

        try:
            description = generate_job_description(title, skills)
            responsibilities = generate_responsibilities(title)
        except Exception as e:
            print("❌ Gemini error, fallback:", e)
            description = f"{title} position requiring skills in {', '.join(skills)}."
            responsibilities = [
                "Develop system features",
                "Collaborate with team members",
                "Fix bugs and improve performance",
                "Follow company standards"
            ]

        job = {
            "job_id": str(uuid.uuid4()),
            "title": title,
            "company": random.choice(COMPANIES),
            "location": random.choice(LOCATIONS),
            "employment_type": "Full-time",
            "experience_level": random.choice(["Junior", "Middle"]),
            "salary_range": random.choice([
                "15 – 25 triệu VNĐ/tháng",
                "18 – 30 triệu VNĐ/tháng",
                "22 – 35 triệu VNĐ/tháng"
            ]),
            "job_description": description,
            "responsibilities": responsibilities,
            "requirements": {
                "education": "CNTT hoặc ngành liên quan",
                "experience": random.choice(["0.5 – 1 năm", "1 – 2 năm", "2+ năm"]),
                "skills_required": skills,
                "nice_to_have": ["English", "Teamwork"]
            },
            "benefits": [
                "Lương thưởng cạnh tranh",
                "Cơ hội phát triển nghề nghiệp",
                "Môi trường chuyên nghiệp"
            ]
        }

        jobs.append(job)

        # ⏱ tránh rate limit
        time.sleep(0.5)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)

    print(f"\n✅ DONE: Generated {len(jobs)} jobs → {OUTPUT_FILE}")

# ==================================================
if __name__ == "__main__":
    main()
