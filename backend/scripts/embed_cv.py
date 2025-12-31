import json
import numpy as np
from sentence_transformers import SentenceTransformer
import os

# ============================
# CONFIG
# ============================
BASE_DIR = os.path.dirname(__file__)
CV_FILE = os.path.join(BASE_DIR, "cvs.json")
CV_EMB_FILE = os.path.join(BASE_DIR, "cv_embeddings.npy")

# ============================
# LOAD MODEL
# ============================
print("🔧 Loading embedding model: BAAI/bge-m3 ...")
model = SentenceTransformer("BAAI/bge-m3")
print("✔ Model loaded!")

# ============================
# LOAD CVS
# ============================
with open(CV_FILE, encoding="utf-8") as f:
    cvs = json.load(f)

print(f"📄 Loaded {len(cvs)} CVs")

# ============================
# BUILD TEXT FOR CV
# ============================
texts = []
for cv in cvs:
    skills = ", ".join(cv.get("skills", []))
    summary = cv.get("summary", "")
    experience = cv.get("experiences", "")
    education = cv.get("education", "")

    text = (
        f"Skills: {skills}. "
        f"Summary: {summary}. "
        f"Experience: {experience}. "
        f"Education: {education}."
    )
    texts.append(text)

# ============================
# EMBEDDING
# ============================
cv_vectors = model.encode(
    texts,
    convert_to_numpy=True,
    normalize_embeddings=True
)

# ============================
# SAVE
# ============================
np.save(CV_EMB_FILE, cv_vectors)
print("🎉 DONE — CV embeddings saved!")
print(f"💾 Saved: {CV_EMB_FILE}")
