const TOKEN_KEY = "access_token";

/* ======================
   TOKEN MANAGEMENT
====================== */
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ======================
   TOKEN VALIDATION
====================== */

/**
 * Check if JWT token is expired
 * @param token JWT token string
 * @returns true if expired, false if still valid
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if exp field exists
    if (!payload.exp) {
      return true; // No expiration = treat as expired
    }
    
    // Compare with current time (exp is in seconds, Date.now() is in milliseconds)
    return Date.now() >= payload.exp * 1000;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If can't decode = treat as expired
  }
}

/**
 * Get valid token (check expiration first)
 * @returns valid token or null if expired/not exists
 */
export function getValidToken(): string | null {
  const token = getToken();
  
  if (!token) {
    return null;
  }
  
  // Check if expired
  if (isTokenExpired(token)) {
    console.warn("Token expired, removing from localStorage");
    logout(); // Auto cleanup
    return null;
  }
  
  return token;
}

/**
 * Check if user is logged in with VALID token
 * @returns true if logged in with valid token
 */
export function isLoggedIn(): boolean {
  return getValidToken() !== null;
}

/* ======================
   HELPER: Get Authorization Header
====================== */

/**
 * Get Authorization header for API requests
 * @returns Authorization header object or empty object
 */
export function getAuthHeader(): Record<string, string> {
  const token = getValidToken();
  
  if (!token) {
    return {};
  }
  
  return {
    "Authorization": `Bearer ${token}`
  };
}