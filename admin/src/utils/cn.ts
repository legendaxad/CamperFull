type ClassValue = string | false | null | undefined | 0

/** Joins truthy class names (tiny alternative to `clsx`). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}
