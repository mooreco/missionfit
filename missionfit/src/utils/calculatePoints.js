/**
 * MissionFit 7-factor points formula.
 *
 * @param {Object} food
 * @param {number} food.calories
 * @param {number} food.protein      - grams
 * @param {number} food.fiber        - grams
 * @param {number} food.saturatedFat - grams
 * @param {number} food.sugar        - grams
 * @param {number} food.sodium       - milligrams
 * @param {boolean} food.purine      - high-purine flag
 * @returns {number} points (integer, minimum 0)
 */
export function calculatePoints(food) {
  const calories = parseFloat(food.calories) || 0;
  const protein = parseFloat(food.protein) || 0;
  const fiber = Math.min(parseFloat(food.fiber) || 0, 5);
  const saturatedFat = parseFloat(food.saturatedFat) || 0;
  const sugar = parseFloat(food.sugar) || 0;
  const sodium = parseFloat(food.sodium) || 0;
  const purine = Boolean(food.purine);

  let points = calories / 35;
  points -= protein * 0.2;
  points -= fiber * 0.2;
  points += saturatedFat * 0.3;
  points += sugar * 0.15;
  points += sodium > 600 ? 1 : 0;
  points += purine ? 1 : 0;

  return Math.max(0, Math.round(points));
}

export const ZERO_POINT_FOODS = [
  "Spinach",
  "Broccoli",
  "Celery",
  "Lettuce",
  "Cucumber",
  "Tomatoes",
  "Peppers",
  "Onions",
  "Mushrooms",
  "Zucchini",
  "Cauliflower",
  "Cabbage",
  "Asparagus",
  "Green Beans",
  "Kale",
  "Mustard",
  "Hot Sauce",
  "Vinegar",
  "Herbs",
  "Spices",
  "Lemon Juice",
  "Garlic",
  "Salsa",
];
