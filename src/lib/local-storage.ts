export function saveNote(problemId: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`note:${problemId}`, note);
  } catch {
    /* quota exceeded – silently ignore */
  }
}

export function loadNote(problemId: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`note:${problemId}`) ?? "";
}

export function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("theme") as "dark" | "light") ?? "dark";
}

export function setTheme(theme: "dark" | "light"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("theme", theme);
}
