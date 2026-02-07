import json
import numpy as np

# ✅ Dim embedding (bge-m3 = 1024)
D = 1024  

# ✅ Load JSON data
jobs = json.load(open("data/jobs.json", encoding="utf-8"))
courses = json.load(open("data/courses.json", encoding="utf-8"))
cvs = json.load(open("data/cvs.json", encoding="utf-8"))

def rand_unit(n, d):
    """Sinh random unit vectors để cosine similarity chạy ổn định"""
    x = np.random.normal(size=(n, d)).astype(np.float32)
    x /= (np.linalg.norm(x, axis=1, keepdims=True) + 1e-12)
    return x

# ✅ Generate embeddings
job_emb = rand_unit(len(jobs), D)
course_emb = rand_unit(len(courses), D)
cv_emb = rand_unit(len(cvs), D)

# ✅ Save đúng tên mà backend đang đọc (ghi đè file cũ)
np.save("embeddings/job_embeddings.npy", job_emb)
np.save("embeddings/course_embeddings.npy", course_emb)
np.save("embeddings/cv_embeddings.npy", cv_emb)

print("✅ Saved embeddings successfully:")
print("job_emb:", job_emb.shape, "-> embeddings/job_embeddings.npy")
print("course_emb:", course_emb.shape, "-> embeddings/course_embeddings.npy")
print("cv_emb:", cv_emb.shape, "-> embeddings/cv_embeddings.npy")
