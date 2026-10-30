import type { LocationCategoryType, CategoryInfo } from '../types/favorites';

/**
 * Category metadata definitions with Apple HIG styling and emojis
 */
export const CATEGORY_DEFINITIONS: Record<LocationCategoryType, CategoryInfo> = {
  food: {
    type: 'food',
    label: 'Food & Dining',
    emoji: '🍕',
    symbol: 'utensils',
    color: '#f97316', // Warm Orange
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
  },
  coffee: {
    type: 'coffee',
    label: 'Coffee & Café',
    emoji: '☕',
    symbol: 'coffee',
    color: '#d97706', // Amber Caramel
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)'
  },
  water: {
    type: 'water',
    label: 'Sea & Waterside',
    emoji: '🌊',
    symbol: 'waves',
    color: '#06b6d4', // Ocean Cyan
    gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)'
  },
  home: {
    type: 'home',
    label: 'Home & Residence',
    emoji: '🏠',
    symbol: 'home',
    color: '#10b981', // Emerald Green
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
  },
  work: {
    type: 'work',
    label: 'Work & Office',
    emoji: '💼',
    symbol: 'work',
    color: '#6366f1', // Indigo
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
  },
  shop: {
    type: 'shop',
    label: 'Shops & Retail',
    emoji: '🛍️',
    symbol: 'shopping-bag',
    color: '#a855f7', // Vivid Purple
    gradient: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)'
  },
  other: {
    type: 'other',
    label: 'Saved Star',
    emoji: '⭐', // Default Fallback as explicitly requested by user
    symbol: 'other',
    color: '#eab308', // Apple Gold
    gradient: 'linear-gradient(135deg, #ca8a04 0%, #eab308 100%)'
  }
};

/**
 * Keywords dictionary for intelligent natural language matching in German & English
 */
const CATEGORY_RULES: Array<{
  category: LocationCategoryType;
  primaryEmoji: string;
  specificEmojis?: Record<string, string>;
  patterns: RegExp[];
}> = [
  // 1. Food & Restaurant Rules
  {
    category: 'food',
    primaryEmoji: '🍕',
    specificEmojis: {
      burger: '🍔',
      sushi: '🍣',
      ramen: '🍜',
      asian: '🥢',
      steak: '🥩',
      bbq: '🍖',
      taco: '🌮',
      döner: '🥙',
      bistro: '🍽️',
      restaurant: '🍽️'
    },
    patterns: [
      /\b(restaurant|ristorante|trattoria|pizzeria|pizza|diner|grill|bbq|steak|steakhouse|burger|sushi|ramen|pasta|bistro|döner|kebab|imbiss|essen|speise|brauhaus|gasthaus|wirtshaus|cantina|osteria|tavern|buffet|culinary|food)\b/i
    ]
  },

  // 2. Coffee & Café Rules
  {
    category: 'coffee',
    primaryEmoji: '☕',
    specificEmojis: {
      bakery: '🥐',
      bäckerei: '🥐',
      pastry: '🥐',
      cake: '🍰',
      tea: '🍵',
      matcha: '🍵',
      boba: '🧋'
    },
    patterns: [
      /\b(cafe|café|kaffee|coffee|espresso|latte|cappuccino|roastery|bäckerei|bakery|croissant|konditorei|starbucks|barista|pastry|patisserie|tea|teehaus|matcha)\b/i
    ]
  },

  // 3. Beside the Sea, Water, Beach & Lake Rules
  {
    category: 'water',
    primaryEmoji: '🌊',
    specificEmojis: {
      beach: '🏖️',
      strand: '🏖️',
      harbor: '⚓',
      hafen: '⚓',
      marina: '⛵',
      lake: '🌊',
      see: '🌊',
      aasee: '🌊',
      river: '🌊'
    },
    patterns: [
      /\b(sea|meer|ocean|beach|strand|lake|see|ufer|water|wasser|river|fluss|kanal|promenade|coast|küste|marina|harbor|hafen|dock|bay|bucht|aasee|dortmund-ems-kanal|werse|insel|island|lagoon|seaside)\b/i
    ]
  },

  // 4. House & Residence Rules
  {
    category: 'home',
    primaryEmoji: '🏠',
    specificEmojis: {
      villa: '🏡',
      garden: '🏡',
      apartment: '🏢',
      wohnung: '🏢'
    },
    patterns: [
      /\b(house|haus|home|wohnung|apartment|flat|residence|zuhause|heim|villa|domizil|cottage|bungalow)\b/i
    ]
  },

  // 5. Work & Office Rules
  {
    category: 'work',
    primaryEmoji: '💼',
    specificEmojis: {
      campus: '🎓',
      tech: '💻'
    },
    patterns: [
      /\b(work|arbeit|office|büro|firma|company|agency|agentur|hq|headquarters|coworking|campus|arbeitsplatz)\b/i
    ]
  },

  // 6. Shops, Supermarkets & Retail
  {
    category: 'shop',
    primaryEmoji: '🛍️',
    specificEmojis: {
      supermarket: '🛒',
      mall: '🏬',
      book: '📚',
      pharmacy: '💊'
    },
    patterns: [
      /\b(shop|store|supermarket|markt|supermarkt|mall|kaufhaus|boutique|retail|grocer|grocery|rewe|edeka|aldi|lidl|netto|kaufland|penny|dm|rossmann|apotheke|pharmacy|bookstore|books|thalia|clothing|fashion|schuhe|elektronik|hardware|baumarkt|ikea|saturn|mediamarkt|kaufland|shopping)\b/i
    ]
  }
];

/**
 * Intelligent Classifier Function:
 * Analyzes location name, address, or tag and assigns the optimal Category & Emoji.
 * If no category matches, gracefully defaults to 'other' with a '⭐' (Star) emoji.
 */
export function classifyLocation(
  name: string,
  address: string = '',
  tags: string = ''
): {
  category: LocationCategoryType;
  emoji: string;
  symbol: string;
  categoryLabel: string;
  color: string;
  gradient: string;
} {
  const combinedText = `${name} ${address} ${tags}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(combinedText)) {
        // Find if there is a more specific emoji (e.g. burger, beach, sushi)
        let chosenEmoji = rule.primaryEmoji;
        if (rule.specificEmojis) {
          for (const [kw, emoji] of Object.entries(rule.specificEmojis)) {
            if (combinedText.includes(kw)) {
              chosenEmoji = emoji;
              break;
            }
          }
        }

        const info = CATEGORY_DEFINITIONS[rule.category];
        return {
          category: rule.category,
          emoji: chosenEmoji,
          symbol: info.symbol,
          categoryLabel: info.label,
          color: info.color,
          gradient: info.gradient
        };
      }
    }
  }

  // Graceful Default: As requested, if no category matches, it gets a Star
  const defaultInfo = CATEGORY_DEFINITIONS.other;
  return {
    category: 'other',
    emoji: '⭐',
    symbol: defaultInfo.symbol,
    categoryLabel: defaultInfo.label,
    color: defaultInfo.color,
    gradient: defaultInfo.gradient
  };
}
