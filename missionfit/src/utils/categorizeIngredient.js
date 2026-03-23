const CATEGORIES = [
  {
    id: "produce",
    label: "Produce",
    emoji: "🥬",
    keywords: [
      "broccoli", "spinach", "tomato", "tomatoes", "lettuce", "pepper", "peppers",
      "onion", "onions", "garlic", "carrot", "carrots", "celery", "apple", "apples",
      "banana", "bananas", "lemon", "lime", "avocado", "potato", "potatoes",
      "sweet potato", "cucumber", "zucchini", "squash", "mushroom", "mushrooms",
      "cabbage", "kale", "cauliflower", "asparagus", "green beans", "corn",
      "berries", "strawberry", "blueberry", "raspberry", "orange", "grapefruit",
      "mango", "pineapple", "peach", "pear", "grape", "grapes", "cilantro",
      "parsley", "basil", "mint", "ginger", "jalapeño", "scallion", "leek",
      "beet", "radish", "arugula", "romaine", "chard", "collard",
    ],
  },
  {
    id: "protein",
    label: "Protein",
    emoji: "🥩",
    keywords: [
      "chicken", "turkey", "beef", "pork", "fish", "salmon", "tuna", "shrimp",
      "tilapia", "cod", "tofu", "tempeh", "eggs", "egg", "beans", "lentils",
      "lentil", "chickpea", "chickpeas", "ground meat", "steak", "sausage",
      "bacon", "ham", "lamb", "venison", "bison", "crab", "lobster", "scallop",
      "black beans", "kidney beans", "pinto beans",
    ],
  },
  {
    id: "dairy",
    label: "Dairy",
    emoji: "🧀",
    keywords: [
      "milk", "cheese", "yogurt", "butter", "cream", "sour cream",
      "cottage cheese", "cream cheese", "mozzarella", "cheddar", "parmesan",
      "feta", "ricotta", "whey", "half and half", "heavy cream",
    ],
  },
  {
    id: "grains",
    label: "Grains & Pasta",
    emoji: "🌾",
    keywords: [
      "bread", "rice", "pasta", "noodle", "noodles", "tortilla", "oats",
      "oatmeal", "flour", "cereal", "quinoa", "couscous", "barley",
      "bagel", "roll", "bun", "wrap", "pita", "cracker", "crackers",
      "cornbread", "biscuit",
    ],
  },
  {
    id: "pantry",
    label: "Pantry",
    emoji: "🥫",
    keywords: [
      "oil", "olive oil", "coconut oil", "broth", "stock", "sauce",
      "canned", "sugar", "honey", "maple syrup", "peanut butter",
      "almond butter", "nuts", "almonds", "walnuts", "pecans", "cashews",
      "seeds", "chia", "flax", "jam", "jelly", "protein powder",
      "baking powder", "baking soda", "cornstarch", "cocoa",
      "chocolate", "vanilla", "tomato sauce", "tomato paste", "salsa",
    ],
  },
  {
    id: "frozen",
    label: "Frozen",
    emoji: "🧊",
    keywords: ["frozen"],
  },
  {
    id: "condiments",
    label: "Condiments & Spices",
    emoji: "🫙",
    keywords: [
      "salt", "pepper", "spice", "seasoning", "herb", "mustard", "vinegar",
      "hot sauce", "soy sauce", "ketchup", "mayo", "mayonnaise",
      "worcestershire", "cumin", "paprika", "oregano", "thyme", "rosemary",
      "cinnamon", "turmeric", "chili powder", "garlic powder", "onion powder",
      "dressing", "ranch", "bbq sauce", "teriyaki", "sriracha", "relish",
    ],
  },
];

const OTHER_CATEGORY = { id: "other", label: "Other", emoji: "📦" };

/**
 * Categorize a grocery ingredient by name using keyword matching.
 * @param {string} name
 * @returns {{ id: string, label: string, emoji: string }}
 */
export function categorizeIngredient(name) {
  const lower = name.toLowerCase().trim();

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        return { id: cat.id, label: cat.label, emoji: cat.emoji };
      }
    }
  }

  return OTHER_CATEGORY;
}

/**
 * Group a flat grocery list into categories.
 * @param {Array<{ name: string, count: number, unit: string }>} items
 * @returns {Array<{ category: { id, label, emoji }, items: Array }>}
 */
export function groupByCategory(items) {
  const groups = new Map();

  for (const item of items) {
    const cat = categorizeIngredient(item.name);
    if (!groups.has(cat.id)) {
      groups.set(cat.id, { category: cat, items: [] });
    }
    groups.get(cat.id).items.push(item);
  }

  // Sort items within each category alphabetically
  for (const group of groups.values()) {
    group.items.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Sort categories in the defined order
  const order = [...CATEGORIES.map((c) => c.id), "other"];
  return order
    .filter((id) => groups.has(id))
    .map((id) => groups.get(id));
}

export { CATEGORIES, OTHER_CATEGORY };
