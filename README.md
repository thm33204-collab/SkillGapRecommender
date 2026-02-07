# Hệ thống gợi ý khóa học & khoảng trống kỹ năng (Job – Course – CV)

## 1) Tổng quan
Ứng dụng web cho phép:
- Chọn **Job** → xem chi tiết mô tả công việc và **gợi ý Course** phù hợp.
- Chọn **Job + CV** (CV demo hoặc CV upload) → phân tích mức độ phù hợp, trả về **matched/missing skills** và gợi ý khóa học cho các kỹ năng còn thiếu.

Backend: **FastAPI**  
Frontend: **React + TypeScript**  
Trích xuất kỹ năng (LLM): **Qwen2.5-3B chạy qua Ollama** (mặc định)

---

## 2) Yêu cầu cài đặt
- **Python** 3.9+ (khuyến nghị 3.10/3.11)
- **Node.js** 18+ (nếu chạy frontend)
- (Tuỳ chọn nhưng khuyến nghị) **Ollama** để chạy model `qwen2.5:3b`

---

## 3) Cấu trúc thư mục (tham khảo)
```
backend/
  main.py
  services/
  data/               # jobs.json, courses.json, cvs.json, users.json, ...
  embeddings/         # *.npy
  uploads/            # CV người dùng upload (PDF)
  db/                 # skillgap.db
  requirements.txt    # tạo/đặt tại đây
src/                  # mã nguồn frontend (React)
```

---

## 4) Chạy Backend (FastAPI)

### 4.1 Tạo môi trường ảo + cài thư viện
Mở terminal tại thư mục dự án, chạy:

**Windows (PowerShell)**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

**macOS / Linux**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> Gợi ý:
> - Nếu bạn đang dùng file `requirements_full.txt` thì hãy đổi tên thành `requirements.txt`
>   hoặc cài trực tiếp: `pip install -r requirements_full.txt`.

### 4.2 (Tuỳ chọn) Thiết lập biến môi trường
Tạo file `backend/.env` (hoặc sửa file `.env` hiện có) và thêm:
```env
SECRET_KEY=your-secret-key-change-in-production
```
> Nếu không set, backend sẽ dùng giá trị mặc định trong code.

### 4.3 Chạy server
```bash
uvicorn main:app --reload
```

- API base URL: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

---

## 5) Chạy Qwen2.5-3B bằng Ollama (khuyến nghị)

Backend gọi LLM qua Ollama tại:
- `http://localhost:11434`
- Model name: `qwen2.5:3b`

### 5.1 Cài Ollama
Cài Ollama theo hướng dẫn chính thức (tuỳ hệ điều hành).

### 5.2 Pull model & chạy Ollama
```bash
ollama pull qwen2.5:3b
ollama serve
```

> Nếu Ollama chưa chạy, chức năng trích xuất kỹ năng bằng Qwen sẽ báo lỗi “Ollama service not available”.

---

## 6) Chạy Frontend (React)
**Lưu ý:** Bạn đang có thư mục `src/` (mã nguồn). Nếu dự án của bạn có đầy đủ `package.json` ở root frontend thì chạy theo hướng dẫn dưới.
Nếu bạn chỉ có `src/`, hãy tạo 1 React/Vite project rồi thay thế thư mục `src/` bằng thư mục `src/` này.

### 6.1 Cài dependencies & chạy dev server
Tại thư mục có `package.json`:
```bash
npm install
npm run dev
```

Frontend mặc định gọi backend ở:
- `http://127.0.0.1:8000` (xem `src/lib/api.ts`)

---

## 7) Luồng demo nhanh (để chụp màn hình báo cáo)
1. Mở frontend → xem danh sách Job
2. Click 1 Job → xem chi tiết và danh sách Course gợi ý
3. Trang Job + CV Matching:
   - Chọn Job
   - Chọn CV demo **hoặc** upload CV PDF
   - Bấm phân tích → xem **matched skills**, **missing skills**, **score**, và course gợi ý cho kỹ năng thiếu

---

## 8) Các API chính (Backend)
- `GET /jobs` : danh sách job
- `GET /jobs/{job_id}` : chi tiết job
- `GET /courses` : danh sách course
- `POST /recommend-courses` : gợi ý course theo kỹ năng (skills list)
- `GET /demo-cvs` : danh sách CV demo
- `POST /match-demo` : match job + CV demo
- `POST /upload-cv` : upload CV PDF (yêu cầu login)
- `POST /match-user-cv` : match job + CV user upload (yêu cầu login)
- Auth:
  - `POST /register`
  - `POST /login`
  - `GET /me`

Chi tiết request/response xem tại Swagger: `http://127.0.0.1:8000/docs`.

---

## 9) Ghi chú
- Dữ liệu Job/Course/CV trong `backend/data/` là dữ liệu synthetic để demo & thử nghiệm.
- Vector embeddings nằm trong `backend/embeddings/`. Nếu bạn thay đổi data, cần regenerate embeddings để kết quả recommendation nhất quán.
- Khi chạy CPU, Qwen2.5-3B qua Ollama có thể chậm; nên giới hạn độ dài CV (backend đã truncate) để ổn định.

