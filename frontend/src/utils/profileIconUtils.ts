// src/utils/profileIconUtils.ts
// Utility functions for handling profile icons

/**
 * Get the image path for a profile icon number
 * @param iconNumber - The icon number (1-8)
 * @returns The path to the icon image
 */
export function getProfileIconPath(iconNumber: number): string {
  if (iconNumber < 1 || iconNumber > 8) {
    console.warn(`Invalid icon number: ${iconNumber}. Using default icon.`);
    return "/assets/icons/1.png";
  }
  return `/assets/icons/${iconNumber}.png`;
}

/**
 * Get a random profile icon number (1-8)
 * @returns A random icon number between 1 and 8
 */
export function getRandomProfileIcon(): number {
  return Math.floor(Math.random() * 8) + 1;
}

/**
 * Validate if a number is a valid profile icon
 * @param iconNumber - The number to validate
 * @returns True if the number is between 1 and 8
 */
export function isValidProfileIcon(iconNumber: number): boolean {
  return Number.isInteger(iconNumber) && iconNumber >= 1 && iconNumber <= 8;
}

/**
 * Get all available profile icon numbers
 * @returns Array of icon numbers 1-8
 */
export function getAllProfileIcons(): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8];
}
