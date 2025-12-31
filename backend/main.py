from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List, Set

# ✅ KEEP: Import services (now actually used)
from services.pdf_service import extract_text_from_pdf
from services.qwen_service import extract_skills_with_qwen
from services.skill_service import post_process_skills

import json
import numpy as np
import os
import uuid
import shutil
import logging
import hashlib
import jwt
import re
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

# ==================================================
# LOGGING
# ==================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================================================
# CONFIG
# ==================================================
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# ==================================================
# APP
# ==================================================
app = FastAPI(
    title="SkillGap Recommender API - Hybrid Extraction",
    description="API with HYBRID skill extraction (LLM + Rule-based)",
    version="6.0.0"
)

# ==================================================
# 🔴 FIX: CORS CONFIGURATION - ĐẶT TRƯỚC KHI ĐỊNH NGHĨA ROUTES
# ==================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     
        "http://localhost:3000",      
        "http://localhost:8080",      
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        # Thêm origin của bạn khi deploy
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================
# DATABASE (USER)
# ==================================================
DATABASE_URL = "sqlite:///./skillgap.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==================================================
# DATABASE HELPERS
# ==================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    try:
        if len(password.encode('utf-8')) > 72:
            password = hashlib.sha256(password.encode('utf-8')).hexdigest()
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Error hashing password: {e}")
        raise

def verify_password(password: str, hashed: str) -> bool:
    try:
        if len(password.encode('utf-8')) > 72:
            password = hashlib.sha256(password.encode('utf-8')).hexdigest()
        return pwd_context.verify(password, hashed)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User không tồn tại")
    
    return user

# ==================================================
# PATHS
# ==================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")
EMB_DIR = os.path.join(BASE_DIR, "embeddings")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

for directory in [DATA_DIR, EMB_DIR, UPLOAD_DIR]:
    os.makedirs(directory, exist_ok=True)

# ==================================================
# FILES
# ==================================================
JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")
COURSES_FILE = os.path.join(DATA_DIR, "courses.json")
CVS_FILE = os.path.join(DATA_DIR, "cvs.json")
USER_CVS_FILE = os.path.join(DATA_DIR, "user_cvs.json")

JOB_EMB_FILE = os.path.join(EMB_DIR, "job_embeddings.npy")
COURSE_EMB_FILE = os.path.join(EMB_DIR, "course_embeddings.npy")
CV_EMB_FILE = os.path.join(EMB_DIR, "cv_embeddings.npy")
USER_CV_EMB_FILE = os.path.join(EMB_DIR, "user_cv_embeddings.npy")

# ==================================================
# LOAD MODELS
# ==================================================
logger.info("🔧 Loading embedding model: BAAI/bge-m3")
try:
    model = SentenceTransformer("BAAI/bge-m3")
    logger.info("✔ Embedding model loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load embedding model: {e}")
    raise

# ==================================================
# SKILL DATABASE & NORMALIZATION
# ==================================================

# Technical Skills Database
TECHNICAL_SKILLS = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "cpp", "c#", "csharp",
    "php", "ruby", "go", "golang", "rust", "kotlin", "swift", "r", "scala",
    "perl", "bash", "shell", "powershell", "matlab", "vba",
    
    # Web Development
    "html", "html5", "css", "css3", "sass", "scss", "less",
    "react", "reactjs", "react.js", "angular", "vue", "vuejs", "vue.js",
    "nodejs", "node.js", "express", "expressjs", "nestjs",
    "django", "flask", "fastapi", "spring", "spring boot",
    "laravel", "symfony", "rails", "ruby on rails", "asp.net",
    "next.js", "nextjs", "nuxt.js", "gatsby", "svelte",
    "jquery", "bootstrap", "tailwind", "webpack", "vite",
    
    # Mobile Development
    "android", "ios", "react native", "flutter", "xamarin", "ionic",
    "swift", "kotlin", "objective-c", "cordova",
    
    # Databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "redis",
    "oracle", "sql server", "mariadb", "sqlite", "cassandra",
    "dynamodb", "elasticsearch", "neo4j", "couchdb", "firebase",
    "nosql", "database", "db2",
    
    # Data Science & AI/ML
    "machine learning", "ml", "deep learning", "artificial intelligence", "ai",
    "nlp", "natural language processing", "computer vision", "cv",
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
    "pandas", "numpy", "matplotlib", "seaborn", "plotly", "jupyter",
    "data analysis", "data science", "statistics", "statistical analysis",
    "data mining", "data visualization", "big data", "spark", "hadoop",
    "r programming", "sas", "spss",
    
    # Cloud & DevOps
    "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud",
    "docker", "kubernetes", "k8s", "jenkins", "gitlab", "github actions",
    "terraform", "ansible", "puppet", "chef", "vagrant",
    "ci/cd", "cicd", "devops", "linux", "unix", "windows server",
    "nginx", "apache", "tomcat", "heroku", "digitalocean",
    
    # Business & Analytics Tools
    "excel", "microsoft excel", "power bi", "powerbi", "tableau",
    "google analytics", "seo", "sem", "digital marketing",
    "business intelligence", "bi", "data visualization",
    "looker", "qlik", "sap", "erp", "crm", "salesforce",
    
    # Design & Multimedia
    "photoshop", "adobe photoshop", "illustrator", "figma", "sketch",
    "adobe xd", "indesign", "premiere pro", "after effects",
    "ui", "ux", "ui/ux", "user interface", "user experience",
    "graphic design", "web design", "video editing",
    
    # Version Control & Collaboration
    "git", "github", "gitlab", "bitbucket", "svn", "mercurial",
    "jira", "confluence", "trello", "asana", "slack", "teams",
    
    # APIs & Architecture
    "rest", "restful", "rest api", "graphql", "soap", "microservices",
    "api", "api development", "webhooks", "grpc",
    
    # Testing & QA
    "testing", "unit testing", "integration testing", "e2e testing",
    "jest", "pytest", "selenium", "cypress", "junit",
    "test automation", "qa", "quality assurance",
    
    # Security
    "security", "cybersecurity", "encryption", "authentication",
    "oauth", "jwt", "ssl", "tls", "penetration testing",
    
    # Other Technical
    "blockchain", "cryptocurrency", "iot", "embedded systems",
    "robotics", "ar", "vr", "augmented reality", "virtual reality",
}

# Soft Skills Database
SOFT_SKILLS = {
    "communication", "teamwork", "team work", "leadership", "problem solving",
    "critical thinking", "creativity", "time management", "project management",
    "collaboration", "adaptability", "flexibility", "attention to detail",
    "analytical", "organizational", "presentation", "negotiation",
    "conflict resolution", "decision making", "emotional intelligence",
    "work ethic", "interpersonal", "multitasking", "planning",
    "strategic thinking", "initiative", "self-motivated", "customer service",
}

# Methodologies
METHODOLOGIES = {
    "agile", "scrum", "kanban", "waterfall", "lean", "six sigma",
    "devops", "design thinking", "tdd", "bdd", "continuous integration",
}

# All Skills Combined
ALL_SKILLS = TECHNICAL_SKILLS | SOFT_SKILLS | METHODOLOGIES

# Skill Normalization Map
SKILL_NORMALIZATION = {
    "powerbi": "power bi",
    "power-bi": "power bi",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "js": "javascript",
    "ts": "typescript",
    "k8s": "kubernetes",
    "ci/cd": "cicd",
    "cicd": "ci/cd",
    "bi": "business intelligence",
    "vue.js": "vue",
    "node.js": "nodejs",
    "nodejs": "node.js",
    "react.js": "react",
    "reactjs": "react",
    "c++": "cpp",
    "c#": "csharp",
    "ui/ux": "ui ux",
}

def normalize_skill(skill: str) -> str:
    """Chuẩn hóa skill về dạng chính thức"""
    skill_lower = skill.lower().strip()
    return SKILL_NORMALIZATION.get(skill_lower, skill_lower)

def normalize_skill_list(skills: list) -> set:
    """Chuẩn hóa danh sách skills thành set"""
    return set(normalize_skill(s.strip()) for s in skills if s and isinstance(s, str))

# ==================================================
# 🎯 RULE-BASED SKILL EXTRACTION HELPERS
# ==================================================

def extract_skills_keyword_matching(text: str) -> Set[str]:
    """Trích xuất skills bằng keyword matching"""
    text_lower = text.lower()
    found_skills = set()
    
    for skill in ALL_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            normalized_skill = normalize_skill(skill)
            found_skills.add(normalized_skill)
    
    return found_skills


def extract_skills_section_parsing(text: str) -> Set[str]:
    """Trích xuất skills từ section 'Skills' trong CV"""
    found_skills = set()
    
    section_patterns = [
        r'(?i)(?:^|\n)(?:technical\s+)?skills?\s*:?\s*\n(.*?)(?=\n(?:[A-Z][^:]*:|$))',
        r'(?i)(?:^|\n)competencies\s*:?\s*\n(.*?)(?=\n(?:[A-Z][^:]*:|$))',
        r'(?i)(?:^|\n)expertise\s*:?\s*\n(.*?)(?=\n(?:[A-Z][^:]*:|$))',
        r'(?i)(?:^|\n)technologies\s*:?\s*\n(.*?)(?=\n(?:[A-Z][^:]*:|$))',
    ]
    
    for pattern in section_patterns:
        matches = re.finditer(pattern, text, re.DOTALL)
        
        for match in matches:
            skills_section = match.group(1)
            potential_skills = re.split(r'[,•\n\|;]', skills_section)
            
            for item in potential_skills:
                item = item.strip().strip('•-–*').strip()
                
                if not item or len(item) < 2 or len(item) > 50:
                    continue
                
                item_lower = item.lower()
                normalized = normalize_skill(item_lower)
                
                if normalized in ALL_SKILLS or item_lower in ALL_SKILLS:
                    found_skills.add(normalized)
    
    return found_skills


def extract_skills_regex_patterns(text: str) -> Set[str]:
    """Trích xuất skills bằng regex patterns"""
    found_skills = set()
    
    context_patterns = [
        r'(?i)(?:experience|proficient|skilled|knowledge|expertise|familiar)\s+(?:with|in)\s+([^.;:\n]+)',
        r'(?i)(?:technologies|tools|languages)\s*:?\s*([^.;:\n]+)',
        r'(?i)(?:strong|good|excellent)\s+(?:knowledge|understanding)\s+of\s+([^.;:\n]+)',
        r'(?i)(?:working\s+)?(?:knowledge|experience)\s+(?:of|in|with)\s+([^.;:\n]+)',
    ]
    
    for pattern in context_patterns:
        matches = re.finditer(pattern, text)
        
        for match in matches:
            skills_text = match.group(1)
            potential_skills = re.split(r'[,;&]', skills_text)
            
            for item in potential_skills:
                item = item.strip().lower()
                
                if not item or len(item) < 2:
                    continue
                
                for skill in ALL_SKILLS:
                    if skill in item:
                        normalized = normalize_skill(skill)
                        found_skills.add(normalized)
    
    return found_skills


# ==================================================
# 🚀 HYBRID SKILL EXTRACTION (LLM + RULES)
# ==================================================

def extract_skills_hybrid(pdf_path: str) -> dict:
    """
    🎯 HYBRID SKILL EXTRACTION PIPELINE
    Combines Qwen LLM + Rule-based methods
    
    Pipeline:
    1. Extract text from PDF (using service)
    2. Extract skills with Qwen LLM (using service)
    3. Extract skills with rule-based methods (3 methods)
    4. Merge, deduplicate, normalize
    5. Post-process (using service)
    """
    logger.info(f"🔍 Starting HYBRID extraction from: {pdf_path}")
    
    # ===== STEP 1: Extract Text (Use Service) =====
    try:
        text = extract_text_from_pdf(pdf_path)
        logger.info(f"✅ Text extracted: {len(text)} characters")
    except Exception as e:
        logger.error(f"❌ PDF text extraction failed: {e}")
        raise ValueError(f"Không thể đọc PDF: {str(e)}")
    
    if not text or len(text.strip()) < 50:
        raise ValueError("CV không có đủ nội dung hoặc không đọc được text từ PDF")
    
    # ===== STEP 2: LLM Extraction (Qwen) =====
    skills_llm = set()
    llm_success = False
    
    logger.info("🤖 Extracting skills with Qwen LLM...")
    try:
        llm_result = extract_skills_with_qwen(text)
        raw_llm_skills = llm_result.get("skills", [])
        skills_llm = set(normalize_skill(s) for s in raw_llm_skills if s)
        llm_success = True
        logger.info(f"✅ Qwen extracted {len(skills_llm)} skills")
    except Exception as e:
        logger.warning(f"⚠️ Qwen extraction failed: {e}")
        logger.info("📋 Falling back to rule-based extraction only")
    
    # ===== STEP 3: Rule-based Extraction =====
    logger.info("📋 Extracting skills with rule-based methods...")
    
    skills_keyword = extract_skills_keyword_matching(text)
    logger.info(f"  ├─ Keyword matching: {len(skills_keyword)} skills")
    
    skills_section = extract_skills_section_parsing(text)
    logger.info(f"  ├─ Section parsing: {len(skills_section)} skills")
    
    skills_regex = extract_skills_regex_patterns(text)
    logger.info(f"  └─ Regex patterns: {len(skills_regex)} skills")
    
    skills_rules = skills_keyword | skills_section | skills_regex
    logger.info(f"✅ Rule-based extracted {len(skills_rules)} unique skills")
    
    # ===== STEP 4: Merge & Deduplicate =====
    all_skills = skills_llm | skills_rules
    logger.info(f"🔄 Combined: {len(all_skills)} total unique skills")
    
    # ===== STEP 5: Post-process (Optional) =====
    try:
        all_skills_list = list(all_skills)
        processed_skills = post_process_skills(all_skills_list)
        all_skills = set(processed_skills)
        logger.info(f"✅ Post-processing complete: {len(all_skills)} final skills")
    except Exception as e:
        logger.warning(f"⚠️ Post-processing skipped: {e}")
    
    skills_list = sorted(list(all_skills))
    
    # ===== STEP 6: Statistics =====
    stats = {
        "total_skills": len(skills_list),
        "from_llm": len(skills_llm),
        "from_rules": len(skills_rules),
        "from_keyword": len(skills_keyword),
        "from_section": len(skills_section),
        "from_regex": len(skills_regex),
        "text_length": len(text),
        "llm_success": llm_success,
        "extraction_method": "hybrid-llm-rules" if llm_success else "rules-only"
    }
    
    logger.info(f"✅ HYBRID extraction complete: {len(skills_list)} unique skills")
    
    return {
        "text": text,
        "skills": skills_list,
        "stats": stats,
        "skills_by_source": {
            "llm": sorted(list(skills_llm)),
            "rules": sorted(list(skills_rules)),
            "keyword": sorted(list(skills_keyword)),
            "section": sorted(list(skills_section)),
            "regex": sorted(list(skills_regex))
        }
    }


# ==================================================
# UTILS
# ==================================================
def load_json(path):
    if not os.path.exists(path):
        logger.warning(f"File not found: {path}, returning empty list")
        return []
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {path}: {e}")
        return []

def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"✅ Saved data to {path}")
    except Exception as e:
        logger.error(f"❌ Error saving {path}: {e}")
        raise

# ==================================================
# LOAD DATA
# ==================================================
jobs = load_json(JOBS_FILE)
courses = load_json(COURSES_FILE)
demo_cvs = load_json(CVS_FILE)
user_cvs = load_json(USER_CVS_FILE)

job_emb = np.load(JOB_EMB_FILE) if os.path.exists(JOB_EMB_FILE) else None
course_emb = np.load(COURSE_EMB_FILE) if os.path.exists(COURSE_EMB_FILE) else None
cv_emb = np.load(CV_EMB_FILE) if os.path.exists(CV_EMB_FILE) else None
user_cv_emb = np.load(USER_CV_EMB_FILE) if os.path.exists(USER_CV_EMB_FILE) else None

logger.info(f"✅ Jobs: {len(jobs)}, Courses: {len(courses)}, Demo CVs: {len(demo_cvs)}, User CVs: {len(user_cvs)}")

# ==================================================
# 🔴 FIX: PYDANTIC MODELS WITH VALIDATION
# ==================================================
class AuthRequest(BaseModel):
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Mật khẩu phải có ít nhất 6 ký tự')
        if len(v) > 128:
            raise ValueError('Mật khẩu quá dài (tối đa 128 ký tự)')
        return v

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

class DemoMatchRequest(BaseModel):
    job_id: str
    cv_id: str
    
    @validator('job_id', 'cv_id')
    def check_not_empty(cls, v):
        """Kiểm tra field không được rỗng và tự động trim"""
        if not v or not v.strip():
            raise ValueError('Field không được để trống')
        return v.strip()

class MatchUserCVRequest(BaseModel):
    job_id: str
    cv_id: str
    
    @validator('job_id', 'cv_id')
    def check_not_empty(cls, v):
        """Kiểm tra field không được rỗng và tự động trim"""
        if not v or not v.strip():
            raise ValueError('Field không được để trống')
        return v.strip()

# ==================================================
# HEALTH CHECK
# ==================================================
@app.get("/")
def root():
    return {
        "message": "SkillGap Recommender API - Hybrid Processing",
        "version": "6.0.0",
        "status": "running",
        "extraction": "hybrid-llm-rules",
        "llm": "Ollama + Qwen2.5",
        "rules": "keyword + section + regex"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "jobs": len(jobs),
        "courses": len(courses),
        "demo_cvs": len(demo_cvs),
        "user_cvs": len(user_cvs),
        "embedding_model": "BAAI/bge-m3",
        "skill_extraction": "hybrid-llm-rules",
        "skills_database_size": len(ALL_SKILLS)
    }

# ==================================================
# AUTH API
# ==================================================
@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: AuthRequest, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise HTTPException(400, "Email đã tồn tại")

        user = User(
            email=data.email,
            password_hash=hash_password(data.password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"✅ New user registered: {user.email}")
        return {"message": "Đăng ký thành công", "user_id": user.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        db.rollback()
        raise HTTPException(500, f"Lỗi server: {str(e)}")

@app.post("/login")
def login(data: AuthRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == data.email).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(401, "Sai email hoặc mật khẩu")

        access_token = create_access_token(data={"user_id": user.id, "email": user.email})
        logger.info(f"✅ User logged in: {user.email}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(500, f"Lỗi server: {str(e)}")

@app.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# ==================================================
# 🟢 PUBLIC / DEMO
# ==================================================
@app.get("/demo-cvs")
def get_demo_cvs():
    """[PUBLIC] Lấy danh sách CV mẫu từ dataset"""
    return {
        "cvs": demo_cvs,
        "total": len(demo_cvs),
        "type": "demo"
    }

@app.post("/match-demo")
def match_demo(request: DemoMatchRequest):
    """[PUBLIC] So sánh Job với CV mẫu"""
    job = next((j for j in jobs if j["job_id"] == request.job_id), None)
    if not job:
        raise HTTPException(404, "Công việc không tồn tại")
    
    cv = next((c for c in demo_cvs if c.get("cv_id") == request.cv_id), None)
    if not cv:
        raise HTTPException(404, "CV không tồn tại trong dataset demo")
    
    job_skills = normalize_skill_list(job.get("requirements", {}).get("skills_required", []))
    cv_skills = normalize_skill_list(cv.get("skills", []))
    
    matched_skills = job_skills & cv_skills
    missing_skills = job_skills - cv_skills
    
    match_score = (len(matched_skills) / len(job_skills) * 100) if job_skills else 0
    
    if match_score >= 80:
        assessment = "Xuất sắc! CV này rất phù hợp với công việc."
        level = "excellent"
    elif match_score >= 60:
        assessment = "Tốt! Có nền tảng vững, cần bổ sung một số kỹ năng."
        level = "good"
    elif match_score >= 40:
        assessment = "Khá! Có một số kỹ năng cần thiết."
        level = "fair"
    else:
        assessment = "Cần cải thiện đáng kể."
        level = "needs_improvement"
    
    recommended_courses = []
    
    if missing_skills and course_emb is not None:
        try:
            missing_text = " ".join(missing_skills)
            missing_emb = model.encode(missing_text, normalize_embeddings=True)
            
            sims = cosine_similarity(missing_emb.reshape(1, -1), course_emb)[0]
            top_indices = sims.argsort()[-5:][::-1]
            
            for i in top_indices:
                if i < len(courses):
                    c = courses[i]
                    course_skills = normalize_skill_list(c.get("skills_outcomes", []))
                    relevant_skills = course_skills & missing_skills
                    
                    recommended_courses.append({
                        "course_id": c.get("course_id"),
                        "title": c.get("title"),
                        "platform": c.get("platform"),
                        "url": c.get("url"),
                        "rating": c.get("rating"),
                        "duration": c.get("duration"),
                        "level": c.get("level"),
                        "relevance_score": round(float(sims[i]) * 100, 2),
                        "skills_outcomes": sorted(list(course_skills)),
                        "relevant_skills": sorted(list(relevant_skills)),
                        "skill_coverage": round(len(relevant_skills) / len(missing_skills) * 100, 2) if missing_skills else 0
                    })
            
        except Exception as e:
            logger.error(f"❌ Error recommending courses: {e}")
    
    return {
        "job_id": request.job_id,
        "cv_id": request.cv_id,
        "match_score": round(match_score, 2),
        "level": level,
        "assessment": assessment,
        "job_skills_required": sorted(list(job_skills)),
        "cv_skills": sorted(list(cv_skills)),
        "matched_skills": sorted(list(matched_skills)),
        "missing_skills": sorted(list(missing_skills)),
        "num_matched": len(matched_skills),
        "num_missing": len(missing_skills),
        "recommended_courses": recommended_courses,
        "type": "demo"
    }

# ==================================================
# 🔐 USER CV MANAGEMENT
# ==================================================
@app.get("/user-cvs")
def get_user_cvs(current_user: User = Depends(get_current_user)):
    """[PROTECTED] Lấy danh sách CV của user hiện tại"""
    user_cv_list = [cv for cv in user_cvs if cv.get("user_id") == current_user.id]
    return {
        "cvs": user_cv_list,
        "total": len(user_cv_list),
        "user_id": current_user.id
    }

@app.post("/upload-cv")
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """[PROTECTED] Upload CV của user - Sử dụng HYBRID extraction"""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Chỉ chấp nhận file PDF")
    
    cv_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{cv_id}.pdf")
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"✅ File saved: {file_path}")
        
        # 🚀 HYBRID EXTRACTION (LLM + Rules)
        extraction_result = extract_skills_hybrid(file_path)
        
        cv_data = {
            "cv_id": cv_id,
            "user_id": current_user.id,
            "filename": file.filename,
            "upload_date": datetime.utcnow().isoformat(),
            "text": extraction_result["text"][:1000],  # Lưu 1000 ký tự đầu
            "skills": extraction_result["skills"],
            "stats": extraction_result["stats"],
            "skills_by_source": extraction_result["skills_by_source"]
        }
        
        user_cvs.append(cv_data)
        save_json(USER_CVS_FILE, user_cvs)
        
        # Update embeddings
        try:
            cv_text = " ".join(cv_data["skills"])
            new_emb = model.encode(cv_text, normalize_embeddings=True)
            
            global user_cv_emb
            if user_cv_emb is None:
                user_cv_emb = new_emb.reshape(1, -1)
            else:
                user_cv_emb = np.vstack([user_cv_emb, new_emb])
            
            np.save(USER_CV_EMB_FILE, user_cv_emb)
            logger.info(f"✅ Embeddings updated: shape {user_cv_emb.shape}")
        except Exception as e:
            logger.error(f"❌ Error updating embeddings: {e}")
        
        return {
            "message": "CV đã được upload và xử lý thành công",
            "cv_id": cv_id,
            "skills_extracted": len(cv_data["skills"]),
            "extraction_stats": cv_data["stats"],
            "skills": cv_data["skills"]
        }
        
    except ValueError as e:
        logger.error(f"❌ Extraction error: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"❌ Upload error: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(500, f"Lỗi xử lý CV: {str(e)}")

@app.delete("/user-cvs/{cv_id}")
def delete_user_cv(
    cv_id: str,
    current_user: User = Depends(get_current_user)
):
    """[PROTECTED] Xóa CV của user"""
    global user_cvs, user_cv_emb
    
    cv_index = next((i for i, cv in enumerate(user_cvs) 
                     if cv.get("cv_id") == cv_id and cv.get("user_id") == current_user.id), None)
    
    if cv_index is None:
        raise HTTPException(404, "CV không tồn tại hoặc không thuộc quyền sở hữu")
    
    # Remove CV data
    deleted_cv = user_cvs.pop(cv_index)
    save_json(USER_CVS_FILE, user_cvs)
    
    # Remove file
    file_path = os.path.join(UPLOAD_DIR, f"{cv_id}.pdf")
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Update embeddings
    if user_cv_emb is not None and cv_index < len(user_cv_emb):
        user_cv_emb = np.delete(user_cv_emb, cv_index, axis=0)
        np.save(USER_CV_EMB_FILE, user_cv_emb)
    
    logger.info(f"✅ CV deleted: {cv_id} by user {current_user.id}")
    return {"message": "CV đã được xóa thành công"}

# ==================================================
# 🎯 JOB MATCHING
# ==================================================
@app.get("/jobs")
def get_jobs():
    """[PUBLIC] Lấy danh sách công việc"""
    return {
        "jobs": jobs,
        "total": len(jobs)
    }

@app.get("/jobs/{job_id}")
def get_job_detail(job_id: str):
    """[PUBLIC] Lấy chi tiết công việc"""
    job = next((j for j in jobs if j["job_id"] == job_id), None)
    if not job:
        raise HTTPException(404, "Công việc không tồn tại")
    return job

# ==================================================
# 🔴 FIX: MATCH USER CV ENDPOINT
# ==================================================
@app.post("/match-user-cv")
def match_user_cv(
    request: MatchUserCVRequest,
    current_user: User = Depends(get_current_user)
):
    """[PROTECTED] Advanced Job–CV Matching with NLP + Skill Gap Analysis"""

    job_id = request.job_id
    cv_id = request.cv_id

    logger.info(f"🔍 Matching job_id={job_id}, cv_id={cv_id}, user={current_user.id}")

    # ===== 1. Validate Job =====
    job = next((j for j in jobs if j["job_id"] == job_id), None)
    if not job:
        raise HTTPException(404, "Công việc không tồn tại")

    # ===== 2. Validate CV =====
    cv = next(
        (c for c in user_cvs if c.get("cv_id") == cv_id and c.get("user_id") == current_user.id),
        None
    )
    if not cv:
        raise HTTPException(404, "CV không tồn tại hoặc không thuộc quyền sở hữu")

    # ===== 3. Skill Normalization =====
    job_skills = normalize_skill_list(
        job.get("requirements", {}).get("skills_required", [])
    )
    cv_skills = normalize_skill_list(cv.get("skills", []))

    matched_skills = job_skills & cv_skills
    missing_skills = job_skills - cv_skills

    # ===== 4. Skill Coverage Score (Rule-based) =====
    skill_coverage_score = (
        len(matched_skills) / len(job_skills)
        if job_skills else 0
    )

    # ===== 5. Semantic Matching (NLP + Embedding) =====
    job_text = (
        job.get("title", "") + " " +
        job.get("description", "") + " " +
        " ".join(job_skills)
    )

    cv_text = " ".join(cv_skills)

    job_vec = model.encode(job_text, normalize_embeddings=True)
    cv_vec = model.encode(cv_text, normalize_embeddings=True)

    semantic_fit_score = cosine_similarity(
        cv_vec.reshape(1, -1),
        job_vec.reshape(1, -1)
    )[0][0]

    # ===== 6. Explainability =====
    explanations = []

    if semantic_fit_score >= 0.75:
        explanations.append(
            "CV của bạn có mức độ phù hợp ngữ nghĩa cao với mô tả công việc."
        )
    elif semantic_fit_score >= 0.6:
        explanations.append(
            "CV có định hướng nghề nghiệp tương đối phù hợp với vị trí."
        )
    else:
        explanations.append(
            "CV chưa thể hiện rõ sự phù hợp về mặt ngữ nghĩa với công việc."
        )

    if skill_coverage_score >= 0.7:
        explanations.append(
            "Bạn đã đáp ứng phần lớn các kỹ năng yêu cầu."
        )
    elif skill_coverage_score >= 0.4:
        explanations.append(
            "Bạn có một số kỹ năng quan trọng nhưng vẫn còn thiếu."
        )
    else:
        explanations.append(
            "Bạn còn thiếu nhiều kỹ năng cốt lõi so với yêu cầu công việc."
        )

    # ===== 7. Course Recommendation (Embedding-based) =====
    recommended_courses = []

    if missing_skills and course_emb is not None:
        try:
            missing_text = " ".join(missing_skills)
            missing_emb = model.encode(missing_text, normalize_embeddings=True)

            sims = cosine_similarity(
                missing_emb.reshape(1, -1),
                course_emb
            )[0]

            top_indices = sims.argsort()[-5:][::-1]

            for i in top_indices:
                if i < len(courses):
                    c = courses[i]
                    course_skills = normalize_skill_list(
                        c.get("skills_outcomes", [])
                    )
                    relevant_skills = course_skills & missing_skills

                    recommended_courses.append({
                        "course_id": c.get("course_id"),
                        "title": c.get("title"),
                        "platform": c.get("platform"),
                        "url": c.get("url"),
                        "level": c.get("level"),
                        "relevance_score": round(float(sims[i]) * 100, 2),
                        "skills_outcomes": sorted(list(course_skills)),
                        "relevant_skills": sorted(list(relevant_skills)),
                        "skill_coverage": round(
                            len(relevant_skills) / len(missing_skills) * 100, 2
                        ) if missing_skills else 0
                    })

        except Exception as e:
            logger.error(f"❌ Course recommendation error: {e}")

    # ===== 8. Final Response =====
    logger.info(
        f"✅ Match done | semantic={semantic_fit_score:.3f}, "
        f"skill_coverage={skill_coverage_score:.2f}"
    )

    return {
        "job_id": job_id,
        "cv_id": cv_id,

        # 🔥 핵심 평가 지표
        "semantic_fit_score": round(float(semantic_fit_score), 3),
        "skill_coverage_score": round(skill_coverage_score * 100, 2),

        "explanations": explanations,

        # Skill analysis
        "job_skills_required": sorted(list(job_skills)),
        "cv_skills": sorted(list(cv_skills)),
        "matched_skills": sorted(list(matched_skills)),
        "missing_skills": sorted(list(missing_skills)),

        # Recommendations
        "recommended_courses": recommended_courses,

        # Metadata
        "extraction_stats": cv.get("stats", {}),
        "type": "user"
    }


# ==================================================
# 🎓 COURSE RECOMMENDATIONS
# ==================================================
@app.get("/courses")
def get_courses(
    limit: int = 20,
    platform: Optional[str] = None,
    level: Optional[str] = None
):
    """[PUBLIC] Lấy danh sách khóa học"""
    filtered_courses = courses
    
    if platform:
        filtered_courses = [c for c in filtered_courses 
                           if c.get("platform", "").lower() == platform.lower()]
    
    if level:
        filtered_courses = [c for c in filtered_courses 
                           if c.get("level", "").lower() == level.lower()]
    
    return {
        "courses": filtered_courses[:limit],
        "total": len(filtered_courses),
        "shown": min(limit, len(filtered_courses))
    }

@app.post("/recommend-courses")
def recommend_courses_by_skills(skills: List[str]):
    """[PUBLIC] Gợi ý khóa học dựa trên danh sách skills"""
    
    if not skills:
        raise HTTPException(400, "Danh sách skills không được để trống")
    
    if course_emb is None:
        raise HTTPException(500, "Course embeddings chưa được tạo")
    
    normalized_skills = normalize_skill_list(skills)
    skills_text = " ".join(normalized_skills)
    
    try:
        skills_emb = model.encode(skills_text, normalize_embeddings=True)
        sims = cosine_similarity(skills_emb.reshape(1, -1), course_emb)[0]
        top_indices = sims.argsort()[-5:][::-1]
        
        recommended = []
        for i in top_indices:
            if i < len(courses):
                c = courses[i]
                course_skills = normalize_skill_list(c.get("skills_outcomes", []))
                relevant_skills = course_skills & normalized_skills
                
                recommended.append({
                    "course_id": c.get("course_id"),
                    "title": c.get("title"),
                    "platform": c.get("platform"),
                    "url": c.get("url"),
                    "rating": c.get("rating"),
                    "duration": c.get("duration"),
                    "level": c.get("level"),
                    "relevance_score": round(float(sims[i]) * 100, 2),
                    "skills_outcomes": sorted(list(course_skills)),
                    "relevant_skills": sorted(list(relevant_skills)),
                    "skill_coverage": round(len(relevant_skills) / len(normalized_skills) * 100, 2)
                })
        
        return {
            "requested_skills": sorted(list(normalized_skills)),
            "recommended_courses": recommended,
            "total_recommended": len(recommended)
        }
        
    except Exception as e:
        logger.error(f"❌ Error in course recommendation: {e}")
        raise HTTPException(500, f"Lỗi gợi ý khóa học: {str(e)}")

# ==================================================
# 🔧 ADMIN / UTILITY ENDPOINTS
# ==================================================
@app.get("/skills/list")
def get_all_skills():
    """[PUBLIC] Lấy danh sách tất cả skills trong database"""
    return {
        "technical_skills": sorted(list(TECHNICAL_SKILLS)),
        "soft_skills": sorted(list(SOFT_SKILLS)),
        "methodologies": sorted(list(METHODOLOGIES)),
        "total_skills": len(ALL_SKILLS)
    }

@app.post("/skills/normalize")
def normalize_skills_endpoint(skills: List[str]):
    """[PUBLIC] Chuẩn hóa danh sách skills"""
    normalized = normalize_skill_list(skills)
    return {
        "original": skills,
        "normalized": sorted(list(normalized)),
        "count": len(normalized)
    }

# ==================================================
# RUN
# ==================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)