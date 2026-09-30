"""Demo catalogue for local development. Replace/extend through /admin — nothing here is hard-coded elsewhere."""

COLOURS = [
    # name, hex, family, synonyms
    ("Baby Pink", "#F8C8D8", "pink", ["light pink", "pastel pink", "soft pink", "pale pink"]),
    ("Barbie Pink", "#E0218A", "pink", ["barbie", "bubblegum pink", "doll pink"]),
    ("Hot Pink", "#FF4FA3", "pink", ["neon pink", "bright pink", "fuchsia"]),
    ("Blush", "#F4C7C3", "pink", ["blush pink", "rosy"]),
    ("Dusty Rose", "#D8A1A8", "pink", ["rose pink", "old rose"]),
    ("Mauve", "#B98A9E", "purple", []),
    ("Lavender", "#CDB8E8", "purple", ["pastel purple", "light purple"]),
    ("Lilac", "#C8A2C8", "purple", []),
    ("Milky White", "#F6F1EC", "white", ["milk", "milky", "soft white", "sheer white"]),
    ("White", "#FFFFFF", "white", ["pure white", "snow"]),
    ("Nude", "#E3C0A6", "nude", ["natural", "skin tone", "beige"]),
    ("Champagne", "#EBD9C1", "nude", ["ivory", "cream"]),
    ("Cherry Red", "#B0102A", "red", ["red", "classic red", "cherry red"]),
    ("Wine", "#6E1A2C", "red", ["burgundy", "maroon", "oxblood"]),
    ("Mocha", "#8A6552", "brown", ["brown", "latte", "coffee"]),
    ("Butter Yellow", "#F9E7A1", "yellow", ["yellow", "pastel yellow", "butter"]),
    ("Mint", "#B5E5CF", "green", ["pastel green", "mint green"]),
    ("Sage", "#B2C2A2", "green", ["sage green", "olive green"]),
    ("Baby Blue", "#BCD9F2", "blue", ["light blue", "pastel blue", "sky blue"]),
    ("Black", "#111111", "black", ["jet black", "noir"]),
    ("Silver", "#C9CDD2", "metallic", ["chrome silver"]),
    ("Gold", "#D4AF37", "metallic", ["golden"]),
    ("Rose Gold", "#E0A99A", "metallic", []),
    ("Peach", "#F9C4A6", "orange", ["apricot"]),
]

FINISHES = [
    # name, surcharge ₹, flashiness, synonyms
    ("Glossy", 0, 1, ["gloss", "shiny", "classic"]),
    ("Matte", 0, 0, ["velvet", "flat"]),
    ("Chrome", 100, 3, ["metallic", "mirror", "chromed"]),
    ("Glazed", 100, 2, ["glazed donut", "pearl chrome", "pearly", "pearlescent", "hailey"]),
    ("Cat Eye", 150, 3, ["cateye", "velvet magnetic", "magnetic"]),
    ("Glitter", 80, 3, ["sparkle", "sparkly", "shimmer", "glittery"]),
    ("Jelly", 50, 1, ["sheer", "translucent", "syrup"]),
]

SHAPES = [
    ("Almond", "almond", 0, ["almond shape"]),
    ("Coffin", "coffin", 0, ["ballerina"]),
    ("Square", "square", 0, ["squared"]),
    ("Oval", "oval", 0, ["round", "rounded"]),
    ("Stiletto", "stiletto", 50, ["pointy", "pointed"]),
    ("Squoval", "squoval", 0, ["soft square"]),
]

PATTERNS = [
    ("French Tip", 50, ["french", "french manicure", "tips"]),
    ("Micro French", 50, ["skinny french", "baby french"]),
    ("Marble", 80, ["marbled", "stone effect"]),
    ("Aura", 60, ["aura nails", "blush aura", "airbrush"]),
    ("Ombre", 60, ["gradient", "baby boomer"]),
    ("Polka Dots", 40, ["dots", "dotted"]),
    ("Hearts", 60, ["heart print", "hand painted hearts"]),
    ("Florals", 100, ["hand painted flowers", "flower art"]),
    ("Checkerboard", 60, ["checkered", "checks"]),
    ("Tortoiseshell", 80, ["tortoise"]),
    ("Leopard", 80, ["cheetah", "animal print"]),
    ("Swirls", 60, ["swirl", "wavy lines", "abstract"]),
]

CATEGORIES = [
    ("Coquette", ["bows", "ribbon", "girly", "feminine"]),
    ("Minimal", ["simple", "clean", "neutral", "everyday"]),
    ("Bridal & Festive", ["bridal", "wedding", "festive", "traditional", "indian wedding"]),
    ("Y2K", ["2000s", "retro"]),
    ("Chrome Glam", ["glam", "glamorous"]),
    ("Kawaii", ["cute", "playful", "kawaii"]),
]

STYLES = [
    ("Soft Girl", ["soft", "romantic", "dreamy", "pastel"]),
    ("Clean Girl", ["clean", "minimalist", "classy", "old money"]),
    ("Glam", ["luxe", "statement", "bold"]),
    ("Kawaii", ["cute", "sweet", "adorable"]),
    ("Classic", ["timeless", "elegant"]),
    ("Baddie", ["edgy", "fierce", "baddie"]),
]

OCCASIONS = [
    ("Everyday", ["daily", "casual"]),
    ("Office", ["work", "corporate", "interview"]),
    ("Date Night", ["date", "dinner", "valentine"]),
    ("Party", ["night out", "clubbing", "new year"]),
    ("Wedding", ["bride", "bridesmaid", "engagement", "reception"]),
    ("Festive", ["diwali", "eid", "christmas", "karwa chauth", "puja"]),
    ("Birthday", ["bday", "birthday party"]),
    ("Vacation", ["holiday", "beach", "summer", "goa"]),
    ("Brunch", ["cafe", "weekend", "picnic"]),
    ("Sangeet", ["mehendi", "haldi", "cocktail"]),
]

TAGS = ["Bestseller", "New", "Handpainted", "Limited Edition", "Instagram Favourite", "Gift Pick"]

CHARMS = [
    # name, category, asset_key, price ₹, stock, is_3d, flashiness, synonyms
    ("White Bow", "bow", "bow", 15, 400, False, 1, ["bow", "ribbon", "white ribbon"]),
    ("Pink Bow", "bow", "bow-pink", 15, 300, False, 1, ["pink ribbon"]),
    ("Pearl", "pearl", "pearl", 5, 1200, False, 1, ["pearls", "faux pearl"]),
    ("Gold Star", "celestial", "star-gold", 8, 500, False, 2, ["star", "stars"]),
    ("Silver Star", "celestial", "star-silver", 8, 400, False, 2, []),
    ("Crescent Moon", "celestial", "moon", 10, 200, False, 2, ["moon", "half moon"]),
    ("Butterfly", "butterfly", "butterfly", 20, 250, False, 1, ["butterflies", "papillon"]),
    ("Daisy", "flower", "daisy", 12, 300, False, 1, ["flower", "flowers", "floral charm"]),
    ("3D Rose", "flower", "rose-3d", 25, 150, True, 2, ["rose", "rosebud", "3d flower"]),
    ("Crystal", "gem", "crystal", 6, 2000, False, 3, ["rhinestone", "gem", "diamond", "stone", "bling"]),
    ("Heart", "heart", "heart", 10, 300, False, 1, ["hearts", "love heart"]),
    ("3D Strawberry", "fruit", "strawberry-3d", 30, 120, True, 2, ["strawberry", "strawberries", "fruit"]),
    ("Teddy Bear", "character", "teddy-3d", 35, 60, True, 2, ["teddy", "bear"]),
    ("Seashell", "ocean", "shell", 18, 0, False, 1, ["shell", "sea shell"]),  # out of stock on purpose
]

# size → (width mm, length mm) for a medium length set
NAIL_SIZES = [(0, 18.0, 25.0), (1, 17.0, 24.0), (2, 16.0, 23.0), (3, 15.0, 22.0), (4, 14.0, 21.0),
              (5, 13.0, 20.0), (6, 12.0, 19.0), (7, 11.0, 18.0), (8, 10.0, 17.0), (9, 9.0, 16.0)]

SIZE_KITS = [
    ("XS", {"thumb": 3, "index": 6, "middle": 5, "ring": 7, "pinky": 9}),
    ("S", {"thumb": 2, "index": 6, "middle": 5, "ring": 6, "pinky": 8}),
    ("M", {"thumb": 1, "index": 5, "middle": 4, "ring": 5, "pinky": 7}),
    ("L", {"thumb": 0, "index": 4, "middle": 3, "ring": 4, "pinky": 6}),
]

# name, price ₹, category, style, shape, length, finish, [(colour, role)], [(charm, qty)], [patterns],
# [occasions], [tags], difficulty, featured, tagline, art overrides
PRODUCTS = [
    ("Pink Bow Coquette", 899, "Coquette", "Soft Girl", "Almond", "medium", "Chrome",
     [("Baby Pink", "base"), ("White", "accent"), ("Silver", "accent")], [("White Bow", 2), ("Pearl", 6)], [],
     ["Date Night", "Birthday"], ["Bestseller", "Instagram Favourite"], "detailed", True,
     "Baby pink chrome with tiny satin bows and pearls.", {}),
    ("Milky Pearl Glaze", 749, "Minimal", "Clean Girl", "Squoval", "short", "Glazed",
     [("Milky White", "base"), ("Champagne", "accent")], [("Pearl", 4)], [],
     ["Office", "Everyday", "Wedding"], ["Bestseller"], "simple", True,
     "The glazed-donut set that goes with everything.", {}),
    ("Strawberry Milk", 999, "Kawaii", "Kawaii", "Almond", "medium", "Glossy",
     [("Baby Pink", "base"), ("White", "accent"), ("Cherry Red", "accent")], [("3D Strawberry", 2), ("Pearl", 4)],
     ["Polka Dots"], ["Brunch", "Birthday"], ["Instagram Favourite", "Handpainted"], "intricate", True,
     "Sweet polka dots with 3D strawberry charms.", {}),
    ("Barbie Dreamhouse", 949, "Y2K", "Glam", "Coffin", "long", "Glossy",
     [("Barbie Pink", "base"), ("Hot Pink", "accent"), ("White", "accent")], [("Heart", 4), ("Crystal", 6)],
     ["Hearts"], ["Party", "Birthday"], ["New", "Instagram Favourite"], "detailed", True,
     "Barbie pink, hand-painted hearts and a little sparkle.", {}),
    ("Champagne Bride", 1299, "Bridal & Festive", "Classic", "Almond", "long", "Glazed",
     [("Champagne", "base"), ("Nude", "accent"), ("Gold", "accent")], [("Crystal", 10), ("Pearl", 6)],
     ["French Tip"], ["Wedding", "Sangeet"], ["Limited Edition"], "intricate", True,
     "Luminous champagne glaze with pearl and crystal detailing.", {}),
    ("Diwali Diya Gold", 1099, "Bridal & Festive", "Glam", "Coffin", "medium", "Chrome",
     [("Wine", "base"), ("Gold", "accent")], [("Gold Star", 4), ("Crystal", 8)], ["French Tip"],
     ["Festive", "Wedding"], ["Limited Edition"], "detailed", False,
     "Deep wine with molten gold tips for festive nights.", {}),
    ("Clean Girl French", 599, "Minimal", "Clean Girl", "Squoval", "short", "Glossy",
     [("Nude", "base"), ("White", "accent")], [], ["French Tip"], ["Office", "Everyday"], ["Bestseller"],
     "simple", True, "A crisp, modern French you'll wear on repeat.", {}),
    ("Lavender Haze", 699, "Kawaii", "Soft Girl", "Oval", "medium", "Jelly",
     [("Lavender", "base"), ("Lilac", "accent"), ("White", "accent")], [("Butterfly", 2)], ["Aura"],
     ["Vacation", "Brunch"], ["New"], "detailed", False, "Dreamy lavender aura with butterfly accents.", {}),
    ("Cherry Cola", 799, "Minimal", "Classic", "Almond", "short", "Glossy",
     [("Cherry Red", "base"), ("Wine", "accent")], [("Heart", 2)], [], ["Date Night", "Party"], [],
     "simple", False, "Juicy cherry red with a tiny heart on each ring finger.", {}),
    ("Butterfly Kisses", 849, "Kawaii", "Soft Girl", "Almond", "long", "Chrome",
     [("Baby Blue", "base"), ("Lilac", "accent"), ("White", "accent")], [("Butterfly", 4)], [],
     ["Birthday", "Party"], ["Instagram Favourite"], "detailed", False,
     "Icy baby blue chrome with fluttering butterflies.", {}),
    ("Mocha Latte Marble", 799, "Minimal", "Clean Girl", "Square", "medium", "Glossy",
     [("Mocha", "base"), ("Nude", "accent"), ("Gold", "accent")], [], ["Marble"], ["Office", "Everyday"],
     ["Handpainted"], "detailed", False, "Creamy mocha marble with gold-leaf veins.", {}),
    ("Midnight Cat Eye", 999, "Chrome Glam", "Glam", "Coffin", "long", "Cat Eye",
     [("Black", "base"), ("Silver", "accent")], [("Crystal", 4)], [], ["Party", "Date Night"], ["New"],
     "detailed", False, "Velvet cat-eye shimmer that moves with the light.", {}),
    ("Butter Daisy", 699, "Kawaii", "Kawaii", "Oval", "short", "Glossy",
     [("Butter Yellow", "base"), ("White", "accent")], [("Daisy", 4)], [], ["Brunch", "Vacation"], [],
     "simple", False, "Sunny butter yellow with little daisies.", {}),
    ("Starlight Chrome", 899, "Y2K", "Glam", "Stiletto", "long", "Chrome",
     [("Silver", "base"), ("Lilac", "accent")], [("Silver Star", 4), ("Crescent Moon", 2)], [],
     ["Party"], ["Instagram Favourite"], "detailed", False, "Liquid silver chrome with stars and moons.", {}),
    ("Rose Garden Bride", 1199, "Bridal & Festive", "Soft Girl", "Almond", "medium", "Glossy",
     [("Blush", "base"), ("White", "accent"), ("Rose Gold", "accent")], [("3D Rose", 2), ("Pearl", 6)],
     ["Florals"], ["Wedding", "Sangeet"], ["Handpainted", "Limited Edition"], "intricate", True,
     "Hand-painted florals with sculpted 3D roses.", {}),
    ("Mint Sorbet", 649, "Minimal", "Clean Girl", "Squoval", "short", "Jelly",
     [("Mint", "base"), ("White", "accent")], [], ["Micro French"], ["Vacation", "Everyday"], [],
     "simple", False, "Cool mint jelly with a barely-there micro French.", {}),
    ("Teddy Cuddles", 999, "Kawaii", "Kawaii", "Oval", "medium", "Matte",
     [("Mocha", "base"), ("Nude", "accent"), ("White", "accent")], [("Teddy Bear", 2), ("Heart", 2)], [],
     ["Birthday"], ["Gift Pick"], "intricate", False, "Velvety matte mocha with 3D teddy charms.", {}),
    ("Hot Pink Leopard", 849, "Y2K", "Baddie", "Coffin", "long", "Glossy",
     [("Hot Pink", "base"), ("Black", "accent")], [], ["Leopard"], ["Party"], [], "detailed", False,
     "Hot pink with hand-painted leopard accents.", {}),
    ("Sage Garden", 749, "Minimal", "Clean Girl", "Almond", "medium", "Matte",
     [("Sage", "base"), ("Milky White", "accent")], [("Daisy", 2)], ["Florals"], ["Everyday", "Brunch"],
     ["Handpainted"], "detailed", False, "Muted sage with delicate painted blooms.", {}),
    ("Glitter Bomb Birthday", 899, "Chrome Glam", "Glam", "Coffin", "medium", "Glitter",
     [("Barbie Pink", "base"), ("Silver", "accent")], [("Gold Star", 3), ("Crystal", 6)], [],
     ["Birthday", "Party"], ["Gift Pick"], "detailed", False, "Pink glitter made for birthday candles.", {}),
    ("Blush Aura", 699, "Minimal", "Soft Girl", "Almond", "short", "Glossy",
     [("Blush", "base"), ("Dusty Rose", "accent")], [], ["Aura"], ["Everyday", "Date Night"], ["Bestseller"],
     "simple", False, "A soft, glowing aura — like your nails are blushing.", {}),
    ("Tortoise Chic", 749, "Minimal", "Classic", "Square", "short", "Glossy",
     [("Mocha", "base"), ("Butter Yellow", "accent"), ("Gold", "accent")], [], ["Tortoiseshell"], ["Office"],
     [], "detailed", False, "Warm tortoiseshell with a gold stripe.", {}),
    ("Ocean Pearl Mermaid", 949, "Y2K", "Soft Girl", "Almond", "long", "Glazed",
     [("Baby Blue", "base"), ("Mint", "accent"), ("White", "accent")], [("Pearl", 6)], ["Swirls"],
     ["Vacation"], ["New"], "detailed", False, "Iridescent ocean swirls with pearls.", {}),
    ("Red Carpet Chrome", 899, "Chrome Glam", "Glam", "Stiletto", "medium", "Chrome",
     [("Cherry Red", "base")], [("Crystal", 2)], [], ["Party", "Date Night"], [], "simple", False,
     "Candy-apple red chrome, pure old Hollywood.", {}),
]

GIFT_ITEMS = [
    # slug, name, type, price ₹, stock, tags, personalisable, description
    ("signature-gift-box", "Nifty Signature Gift Box", "box", 299, 80, ["pink", "luxe", "birthday", "barbie", "love"],
     False, "Blush-pink keepsake box with tissue, ribbon and a wax seal."),
    ("mini-heart-tin", "Mini Heart Gift Tin", "box", 199, 60, ["cute", "minimal", "heart", "love"], False,
     "A tiny heart-shaped tin — perfect for one set."),
    ("personalised-card", "Personalised Card", "card", 99, 300, ["birthday", "love", "friend", "sister", "mom"], True,
     "Your message, hand-lettered on textured card."),
    ("birthday-confetti-card", "Birthday Confetti Card", "card", 79, 200, ["birthday", "party", "fun"], False,
     "Pop-up confetti birthday card."),
    ("nail-care-kit", "Nail Care Kit", "care", 299, 70, ["self care", "makeup", "beauty", "skincare"], False,
     "Cuticle oil, glass file, buffer and prep pads."),
    ("cuticle-oil-pen", "Cuticle Oil Pen", "care", 199, 120, ["self care", "minimal", "beauty"], False,
     "Rose-scented cuticle oil in a click pen."),
    ("pearl-hair-clips", "Pearl Hair Clip Set", "accessory", 249, 50, ["coquette", "pearl", "cute", "bow", "hair"],
     False, "Three pearl clips to match your set."),
    ("satin-bow-scrunchie", "Satin Bow Scrunchie", "accessory", 149, 90, ["bow", "pink", "barbie", "cute", "coquette"],
     False, "Silky pink scrunchie with a big bow."),
    ("mini-mirror-keychain", "Mini Mirror Keychain", "accessory", 179, 40, ["makeup", "barbie", "pink", "beauty"],
     False, "Heart-shaped pocket mirror keychain."),
    ("ribbon-wrap", "Tissue & Ribbon Wrap", "packaging", 49, 500, ["gift", "wrap"], False,
     "Tissue wrap and satin ribbon for any order."),
]

REVIEWS = [
    ("Ananya", 5, "Obsessed!!", "The bows are so dainty and the sizing tool got every finger right. Wore them for "
     "10 days without a single lift.", "Pink Bow Coquette"),
    ("Riya", 5, "Wedding perfection", "Wore Champagne Bride for my sister's wedding — so many compliments at the "
     "sangeet. Packaging was gorgeous too.", "Champagne Bride"),
    ("Meher", 5, "Designed my own set", "I described what I wanted in the chat and it actually understood. The "
     "artist sent a preview before making it. 10/10.", None),
    ("Sana", 4, "So cute", "Strawberry Milk is the cutest thing I own. Took one star off only because I wanted it "
     "even sooner!", "Strawberry Milk"),
    ("Ishita", 5, "Office-approved", "Milky Pearl Glaze looks like a salon glaze. Five minutes to apply before "
     "work.", "Milky Pearl Glaze"),
    ("Kavya", 5, "Best gift", "Used Gift Nifty for my best friend's birthday — it stayed under budget and she "
     "cried a little.", None),
]
