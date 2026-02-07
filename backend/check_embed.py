import json
import numpy as np

jobs = json.load(open("data/jobs.json", encoding="utf-8"))
courses = json.load(open("data/courses.json", encoding="utf-8"))
cvs = json.load(open("data/cvs.json", encoding="utf-8"))

job_emb = np.load("embeddings/job_embeddings.npy")
course_emb = np.load("embeddings/course_embeddings.npy")
cv_emb = np.load("embeddings/cv_embeddings.npy")

print("jobs:", len(jobs), "| job_emb:", job_emb.shape)
print("courses:", len(courses), "| course_emb:", course_emb.shape)
print("cvs:", len(cvs), "| cv_emb:", cv_emb.shape)
