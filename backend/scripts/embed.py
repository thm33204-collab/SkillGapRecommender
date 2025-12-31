import json
import numpy as np
from sentence_transformers import SentenceTransformer
import os

# ============================
# CONFIG (FIXED FOR YOUR STRUCTURE)
# ============================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))   # backend/scripts
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)                # backend

DATA_DIR = os.path.join(BACKEND_DIR, "data")
EMB_DIR = os.path.join(BACKEND_DIR, "embeddings")
META_DIR = os.path.join(BACKEND_DIR, "metadata")

# Ensure folders exist
os.makedirs(EMB_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)

JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")
COURSES_FILE = os.path.join(DATA_DIR, "courses.json")

JOB_EMB_FILE = os.path.join(EMB_DIR, "job_embeddings.npy")
COURSE_EMB_FILE = os.path.join(EMB_DIR, "course_embeddings.npy")

JOB_META_FILE = os.path.join(META_DIR, "job_metadata.json")
COURSE_META_FILE = os.path.join(META_DIR, "course_metadata.json")

# ============================
# 1) LOAD MODEL
# ============================
print("🔧 Loading embedding model: BAAI/bge-m3 ...")
model = SentenceTransformer("BAAI/bge-m3")
print("✔ Model loaded!")

# ============================
# 2) LOAD DATA
# ============================
if not os.path.exists(JOBS_FILE):
    raise FileNotFoundError(f"❌ jobs.json not found at {JOBS_FILE}")

if not os.path.exists(COURSES_FILE):
    raise FileNotFoundError(f"❌ courses.json not found at {COURSES_FILE}")

with open(JOBS_FILE, encoding="utf-8") as f:
    jobs = json.load(f)

with open(COURSES_FILE, encoding="utf-8") as f:
    courses = json.load(f)

print(f"📄 Loaded {len(jobs)} jobs")
print(f"📄 Loaded {len(courses)} courses")

# ============================
# 3) BUILD TEXT
# ============================
def build_job_text(job: dict) -> str:
    title = job.get("title", "")
    company = job.get("company", "")
    location = job.get("location", "")
    desc = job.get("job_description", "")

    req = job.get("requirements", {})
    skills_required = req.get("skills_required", [])
    nice_to_have = req.get("nice_to_have", [])

    return (
        f"Job title: {title}. "
        f"Company: {company}. "
        f"Location: {location}. "
        f"Description: {desc}. "
        f"Required skills: {', '.join(skills_required)}. "
        f"Nice to have skills: {', '.join(nice_to_have)}."
    )

# ⚠️ Course ưu tiên field "text" nếu có
def build_course_text(course: dict) -> str:
    if course.get("text"):
        return course["text"]

    name = course.get("name", "")
    desc = course.get("description", "")
    provider = course.get("provider", "")
    skills = course.get("skills_outcomes", [])

    return (
        f"Course name: {name}. "
        f"Description: {desc}. "
        f"Skills outcomes: {', '.join(skills)}. "
        f"Provider: {provider}."
    )

# ============================
# 4) EMBEDDING JOBS
# ============================
print("\n📌 Embedding JOBS...")

job_texts = []
job_metadata = []

for job in jobs:
    text = build_job_text(job)
    job_texts.append(text)
    job_metadata.append({
        "job_id": job.get("job_id"),
        "title": job.get("title"),
        "text": text
    })

job_vectors = model.encode(
    job_texts,
    convert_to_numpy=True,
    normalize_embeddings=True,
    show_progress_bar=True
)

print(f"✔ Embedded {len(job_vectors)} JOB vectors")

# ============================
# 5) EMBEDDING COURSES
# ============================
print("\n📌 Embedding COURSES...")

course_texts = []
course_metadata = []

for course in courses:
    text = build_course_text(course)
    course_texts.append(text)
    course_metadata.append({
        "course_id": course.get("course_id"),
        "name": course.get("name"),
        "text": text
    })

course_vectors = model.encode(
    course_texts,
    convert_to_numpy=True,
    normalize_embeddings=True,
    show_progress_bar=True
)

print(f"✔ Embedded {len(course_vectors)} COURSE vectors")

# ============================
# 6) SAVE FILES
# ============================
np.save(JOB_EMB_FILE, job_vectors)
np.save(COURSE_EMB_FILE, course_vectors)

with open(JOB_META_FILE, "w", encoding="utf-8") as f:
    json.dump(job_metadata, f, ensure_ascii=False, indent=2)

with open(COURSE_META_FILE, "w", encoding="utf-8") as f:
    json.dump(course_metadata, f, ensure_ascii=False, indent=2)

print("\n🎉 DONE — Embedding regenerated successfully!")
print(f"💾 Saved: {JOB_EMB_FILE}")
print(f"💾 Saved: {COURSE_EMB_FILE}")
print(f"💾 Saved: {JOB_META_FILE}")
print(f"💾 Saved: {COURSE_META_FILE}")
