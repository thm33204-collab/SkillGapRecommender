from services.qwen_service import extract_skills_with_qwen

cv_text = """
Experienced Frontend Developer.
Skills: JavaScript, React, HTML, CSS, Tailwind, Git.
Worked with REST API and Agile.
"""

skills = extract_skills_with_qwen(cv_text)
print("Extracted skills:", skills)
