import re
from typing import List, Set

# Special cases that need exact preservation
SPECIAL_SKILLS = {
    "c++": "c++",
    "c#": "c#",
    ".net": ".net",
    "asp.net": "asp.net",
    "node.js": "node.js",
    "vue.js": "vue.js",
    "react.js": "react.js",
    "next.js": "next.js",
    "express.js": "express.js",
    "d3.js": "d3.js",
    "three.js": "three.js",
}

# Common skill aliases to normalize
SKILL_ALIASES = {
    "nodejs": "node.js",
    "reactjs": "react.js",
    "vuejs": "vue.js",
    "nextjs": "next.js",
    "expressjs": "express.js",
    "dotnet": ".net",
    "c plus plus": "c++",
    "c sharp": "c#",
    "csharp": "c#",
}


def normalize_skill(skill: str) -> str:
    """
    Normalize a single skill string.
    
    Steps:
    1. Lowercase and strip whitespace
    2. Handle special cases (C++, C#, .NET, etc.)
    3. Map common aliases
    4. Clean special characters (except for preserved skills)
    """
    # Basic normalization
    skill = skill.lower().strip()
    
    # Check if it's a special skill that needs exact preservation
    if skill in SPECIAL_SKILLS:
        return SPECIAL_SKILLS[skill]
    
    # Check for aliases
    if skill in SKILL_ALIASES:
        return SKILL_ALIASES[skill]
    
    # Remove extra whitespace
    skill = re.sub(r'\s+', ' ', skill)
    
    # Remove problematic characters but keep alphanumeric, spaces, dots, plus, hash
    # Only apply if not a special case
    skill = re.sub(r'[^\w\s\.\+#-]', '', skill)
    
    # Clean up any remaining issues
    skill = skill.strip('.-')  # Remove leading/trailing dots or dashes
    
    return skill


def is_valid_skill(skill: str) -> bool:
    """
    Validate if a skill string is reasonable.
    
    Rules:
    - Length between 2-50 characters
    - Not just numbers
    - Not just special characters
    - Contains at least one letter
    """
    if not skill or not isinstance(skill, str):
        return False
    
    # Length check (increased max to 50 for longer framework names)
    if len(skill) < 2 or len(skill) > 50:
        return False
    
    # Must contain at least one letter
    if not re.search(r'[a-z]', skill):
        return False
    
    # Reject if it's just numbers
    if skill.replace(' ', '').isdigit():
        return False
    
    # Reject common garbage patterns
    garbage_patterns = [
        r'^\d+$',  # Only numbers
        r'^[^\w]+$',  # Only special chars
        r'\.{3,}',  # Multiple dots
        r'\s{3,}',  # Multiple spaces
    ]
    
    for pattern in garbage_patterns:
        if re.search(pattern, skill):
            return False
    
    return True


def post_process_skills(skills: List[str]) -> List[str]:
    """
    Clean, normalize, and deduplicate skills from LLM output.
    
    Process:
    1. Type validation
    2. Normalization (lowercase, special cases, aliases)
    3. Validation (length, pattern checks)
    4. Deduplication
    5. Sorting
    
    Args:
        skills: Raw skill list from LLM
        
    Returns:
        Cleaned and sorted list of unique skills
    """
    if not skills or not isinstance(skills, list):
        return []
    
    cleaned: Set[str] = set()
    
    for raw_skill in skills:
        # Skip non-strings
        if not isinstance(raw_skill, str):
            continue
        
        # Normalize the skill
        normalized = normalize_skill(raw_skill)
        
        # Validate
        if not is_valid_skill(normalized):
            continue
        
        # Add to set (automatic deduplication)
        cleaned.add(normalized)
    
    # Return sorted list
    return sorted(cleaned)


def merge_skill_lists(*skill_lists: List[str]) -> List[str]:
    """
    Merge multiple skill lists with deduplication.
    
    Useful for combining skills from multiple CVs or sources.
    """
    all_skills = []
    for skill_list in skill_lists:
        if skill_list:
            all_skills.extend(skill_list)
    
    return post_process_skills(all_skills)


# Example usage and testing
if __name__ == "__main__":
    # Test cases
    test_skills = [
        "Python",
        "C++",
        "c++",  # duplicate
        "C#",
        "Node.js",
        "nodejs",  # alias
        "React.js",
        "reactjs",  # alias
        ".NET",
        "ASP.NET",
        "JavaScript",
        "java script",  # variation
        "  Docker  ",  # extra whitespace
        "123",  # invalid - just numbers
        "!!@#",  # invalid - just special chars
        "x",  # invalid - too short
        "a" * 60,  # invalid - too long
        "",  # invalid - empty
        None,  # invalid - not string
    ]
    
    result = post_process_skills(test_skills)
    print("Processed skills:")
    for skill in result:
        print(f"  - {skill}")
    
    # Expected output should preserve C++, C#, Node.js, .NET
    # and correctly merge aliases