"""General vocabulary of things customers *might* ask for.

The catalogue (DB) defines what Nifty Nails actually offers. This lexicon only exists so the
system can recognise requests for things that are NOT offered and suggest the closest real
alternative, instead of silently ignoring them or inventing products.
"""

# decoration word → charm category used to find the closest offered charm
DECORATION_LEXICON: dict[str, str] = {
    "bow": "bow", "ribbon": "bow",
    "pearl": "pearl",
    "star": "celestial", "moon": "celestial", "sun": "celestial", "sparkle": "celestial", "planet": "celestial",
    "butterfly": "butterfly", "dragonfly": "butterfly", "moth": "butterfly",
    "flower": "flower", "daisy": "flower", "tulip": "flower", "sakura": "flower",
    "cherry blossom": "flower", "lily": "flower", "sunflower": "flower", "floral": "flower", "blossom": "flower",
    "gem": "gem", "rhinestone": "gem", "crystal": "gem", "diamond": "gem", "stone": "gem", "diamante": "gem",
    "jewel": "gem", "stud": "gem",
    "heart": "heart", "love heart": "heart",
    "strawberry": "fruit", "cherry": "fruit", "fruit": "fruit",
    "watermelon": "fruit", "orange slice": "fruit",
    "teddy": "character", "teddy bear": "character", "bear": "character", "bunny": "character",
    "kitty": "character", "hello kitty": "character", "cat": "character", "character": "character",
    "cartoon": "character", "frog": "character",
    "shell": "ocean", "seashell": "ocean", "starfish": "ocean", "wave": "ocean", "mermaid": "ocean",
    "chain": "metal", "stud chain": "metal", "gold foil": "metal", "foil": "metal",
    "snowflake": "seasonal", "ghost": "seasonal", "pumpkin": "seasonal", "skull": "seasonal",
    "candy cane": "seasonal", "christmas tree": "seasonal",
    "lightning": "icon", "cloud": "icon", "rainbow": "icon", "smiley": "icon", "mushroom": "icon",
    "evil eye": "icon", "cross": "icon", "lip": "icon", "cherry lip": "icon",
}

# Related charm categories to fall back on when an exact category isn't stocked.
RELATED_CATEGORIES: dict[str, list[str]] = {
    "fruit": ["3d", "heart", "flower"],
    "character": ["3d", "heart", "bow"],
    "ocean": ["pearl", "gem"],
    "metal": ["gem", "pearl"],
    "seasonal": ["celestial", "gem"],
    "icon": ["heart", "celestial"],
    "butterfly": ["flower", "celestial"],
    "flower": ["butterfly", "heart"],
    "celestial": ["gem", "heart"],
    "gem": ["pearl", "celestial"],
    "pearl": ["gem", "bow"],
    "bow": ["heart", "pearl"],
    "heart": ["bow", "gem"],
    "3d": ["flower", "heart"],
}

# Common colour words with reference hex values (used for "closest colour we offer").
COLOUR_LEXICON: dict[str, str] = {
    "pink": "#F6B8CE", "baby pink": "#F8C8D8", "light pink": "#F8C8D8", "pastel pink": "#F7CAD6",
    "hot pink": "#FF3E9A", "barbie pink": "#E0218A", "fuchsia": "#D1147A", "magenta": "#C2187A",
    "rose": "#E8839B", "dusty rose": "#C99098", "blush": "#F2C4C4", "mauve": "#B98A9E", "salmon": "#F29A8A",
    "peach": "#F9C4A6", "coral": "#F67E6E", "red": "#C8102E", "cherry red": "#B0102A", "wine": "#6E1A2C",
    "burgundy": "#72182B", "maroon": "#6A1B26", "orange": "#F58A2E", "yellow": "#F7D54A",
    "butter yellow": "#F9E7A1", "lemon": "#F6E36B", "mint": "#B5E5CF", "sage": "#B2C2A2", "green": "#4C9A5B",
    "emerald": "#1F7A57", "olive": "#7A7A3A", "teal": "#1E8C8C", "turquoise": "#3CC6C0", "aqua": "#7FDBDA",
    "baby blue": "#BCD9F2", "sky blue": "#8CC7EE", "blue": "#3563C9", "cobalt": "#1F4DB8", "navy": "#1D2951",
    "lavender": "#CDB8E8", "lilac": "#C8A2C8", "purple": "#7B4BA8", "violet": "#8A5BD1", "plum": "#6B3A5B",
    "white": "#FFFFFF", "milky white": "#F6F1EC", "ivory": "#FFF8EC", "cream": "#F5ECD9", "beige": "#E4D1B8",
    "nude": "#E3C0A6", "champagne": "#EBD9C1", "tan": "#C9A27E", "brown": "#7A4E35", "mocha": "#8A6552",
    "chocolate": "#4E2E22", "caramel": "#C38A4E", "black": "#111111", "grey": "#9A9A9A", "gray": "#9A9A9A",
    "silver": "#C9CDD2", "gold": "#D4AF37", "rose gold": "#E0A99A", "bronze": "#A86F3C", "copper": "#B87333",
    "clear": "#F4F6F8", "transparent": "#F4F6F8", "holographic": "#D9D4F2", "iridescent": "#DCE3F5",
    "pearl white": "#F3EEE8",
}

# Shape words customers use → canonical renderer key.
SHAPE_LEXICON: dict[str, str] = {
    "almond": "almond", "ballerina": "coffin", "coffin": "coffin", "square": "square", "squoval": "squoval",
    "oval": "oval", "round": "oval", "stiletto": "stiletto", "pointy": "stiletto", "pointed": "stiletto",
    "lipstick": "coffin", "flare": "coffin", "duck": "square", "edge": "stiletto",
}

SIMILAR_SHAPES: dict[str, list[str]] = {
    "almond": ["oval", "stiletto"],
    "oval": ["almond", "squoval"],
    "stiletto": ["almond"],
    "coffin": ["square", "squoval"],
    "square": ["squoval", "coffin"],
    "squoval": ["square", "oval"],
}

LENGTH_LEXICON: dict[str, str] = {
    "short": "short", "natural length": "short", "office length": "short",
    "medium": "medium", "mid length": "medium", "mid": "medium",
    "long": "long", "longer": "long", "shorter": "short",
    "extra long": "xlong", "xl": "xlong", "very long": "xlong", "xxl": "xlong",
}

LOW_FLASH_WORDS = (
    "subtle", "minimal", "minimalist", "simple", "understated", "classy", "elegant", "clean", "office",
    "not too flashy", "not flashy", "not over the top", "natural", "soft", "dainty", "delicate", "neutral",
)
HIGH_FLASH_WORDS = ("bling", "blingy", "sparkly", "extra", "flashy", "glam", "glamorous", "loud", "bold", "statement")

NEGATION_WORDS = {"no", "not", "without", "dont", "don't", "avoid", "hate", "never", "except", "minus", "skip"}

NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "single": 1, "two": 2, "couple": 2, "pair": 2, "three": 3, "few": 3,
    "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "some": 4, "lot": 8, "many": 8,
}
