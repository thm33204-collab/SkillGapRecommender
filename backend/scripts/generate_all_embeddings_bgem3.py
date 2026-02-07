import os, json
import numpy as np
from sentence_transformers import SentenceTransformer

# ============================
# PATHS
# ============================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))     # backend/scripts
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)                  # backend

DATA_DIR = os.path.join(BACKEND_DIR, "data")
EMB_DIR  = os.path.join(BACKEND_DIR, "embeddings")
META_DIR = os.path.join(BACKEND_DIR, "metadata")

os.makedirs(EMB_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)

JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")
COURSES_FILE = os.path.join(DATA_DIR, "courses.json")
CVS_FILE = os.path.join(DATA_DIR, "cvs.json")

JOB_EMB_FILE = os.path.join(EMB_DIR, "job_embeddings.npy")
COURSE_EMB_FILE = os.path.join(EMB_DIR, "course_embeddings.npy")
CV_EMB_FILE = os.path.join(EMB_DIR, "cv_embeddings.npy")

# ============================
# LOAD MODEL
# ============================
print("🔧 Loading embedding model: BAAI/bge-m3 ...")
model = SentenceTransformer("BAAI/bge-m3")
print("✅ Model loaded!")

# ============================
# LOAD DATA
# ============================
jobs = json.load(open(JOBS_FILE, encoding="utf-8"))
courses = json.load(open(COURSES_FILE, encoding="utf-8"))
cvs = json.load(open(CVS_FILE, encoding="utf-8"))

print(f"📄 Jobs: {len(jobs)}")
print(f"📄 Courses: {len(courses)}")
print(f"📄 CVs: {len(cvs)}")

# ============================
# BUILD TEXT
# ============================
def build_job_text(job):
    title = job.get("title", "")
    desc = job.get("job_description", job.get("description", ""))
    req = job.get("requirements", {})
    skills_required = req.get("skills_required", [])
    nice = req.get("nice_to_have", [])
    return f"{title}. {desc}. Required: {', '.join(skills_required)}. Nice: {', '.join(nice)}"

def build_course_text(course):
    name = course.get("name", "")
    desc = course.get("description", "")
    skills = course.get("skills_outcomes", [])
    provider = course.get("provider", "")
    return f"{name}. {desc}. Outcomes: {', '.join(skills)}. Provider: {provider}"

def build_cv_text(cv):
    skills = ", ".join(cv.get("skills", []))
    summary = cv.get("summary", "")
    exp = cv.get("experiences", "")
    edu = cv.get("education", "")
    return f"Skills: {skills}. Summary: {summary}. Experience: {exp}. Education: {edu}"

job_texts = [build_job_text(j) for j in jobs]
course_texts = [build_course_text(c) for c in courses]
cv_texts = [build_cv_text(cv) for cv in cvs]

# ============================
# ENCODE + SAVE
# ============================
print("\n🚀 Encoding JOB embeddings...")
job_vectors = model.encode(job_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=True)
np.save(JOB_EMB_FILE, job_vectors)
print("✅ Saved:", JOB_EMB_FILE, job_vectors.shape)

print("\n🚀 Encoding COURSE embeddings...")
course_vectors = model.encode(course_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=True)
np.save(COURSE_EMB_FILE, course_vectors)
print("✅ Saved:", COURSE_EMB_FILE, course_vectors.shape)

print("\n🚀 Encoding CV embeddings...")
cv_vectors = model.encode(cv_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=True)
np.save(CV_EMB_FILE, cv_vectors)
print("✅ Saved:", CV_EMB_FILE, cv_vectors.shape)

print("\n🎉 DONE — All embeddings regenerated successfully!")
