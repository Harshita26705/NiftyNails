You are the lead software architect, full-stack developer, UI/UX designer, and AI/ML engineer for my project Nifty Nails, an AI-powered custom press-on nail e-commerce platform.
 
I am a software developer and I want this to be a real, production-quality project that I can eventually deploy and use as an actual business.
 
Do NOT create a generic ecommerce template. The website should feel like a premium, cute, modern, creator-led nail brand while also having sophisticated software/AI functionality.
 
1. CORE REQUIREMENTS
 
Build a full-stack web application with:
 
Customer side
 
- Mobile-first and fully responsive
- Desktop and tablet support
- Product catalogue
- Product search/filtering
- Custom nail design system
- AI-assisted design discovery
- Nail design editor
- AI nail sizing
- Outfit/image-based nail recommendations
- Gifting system
- Cart
- Checkout/order flow
- Customer accounts
- Saved nail designs
- Order history and tracking
 
Admin side
 
Create a completely separate protected "/admin" application/dashboard.
 
The admin should allow me to:
 
- Add/edit/delete products
- Upload product images
- Manage nail designs
- Manage nail colours
- Manage finishes
- Manage charms
- Manage nail shapes
- Manage inventory
- Manage orders
- Manage customers
- Review custom designs
- Review AI-generated/custom requests
- Manage pricing
- View sales analytics
- View popular designs/elements
- Manage website content/settings
 
Use proper authentication and role-based access control. Never rely on simply hiding admin pages from customers.
 
---
 
2. TECH STACK
 
Use:
 
Frontend
 
- Next.js
- React
- TypeScript
- Tailwind CSS
- Modern component architecture
 
Backend
 
- Python
- FastAPI
- Pydantic
- SQLAlchemy
 
Database
 
Use PostgreSQL.
 
Design the database properly with migrations and relationships.
 
AI/ML
 
Prefer free/open-source solutions wherever practical.
 
Do NOT assume that I want to pay for AI APIs.
 
I have a Claude Pro subscription, but understand that my Claude Pro subscription is primarily for development through Claude/Claude Code and should NOT be treated as a free Claude API for my customers.
 
Use Claude as a coding/development assistant where appropriate, not as a runtime dependency unless I explicitly provide an API.
 
For ML/CV functionality, prefer:
 
- OpenCV
- MediaPipe
- NumPy
- scikit-learn
- PyTorch where required
- open-source/free models
- deterministic algorithms where AI is unnecessary
 
The application should still work if external AI APIs are unavailable.
 
---
 
3. BRAND / DESIGN
 
Brand name:
 
NIFTY NAILS
 
The visual identity should be:
 
- Cute
- Feminine
- Modern
- Premium
- Playful
- Pink/white oriented
- Barbie-inspired but NOT childish
- Clean
- Instagram-friendly
 
Avoid:
 
- Generic Shopify-looking layouts
- Excessive gradients
- Overly corporate UI
- Stock beauty imagery
- Huge unnecessary text
- Clutter
 
Use high-quality spacing, typography, cards, subtle animations, rounded elements, elegant product photography layouts and a polished mobile experience.
 
The actual nail designs should be the visual focus.
 
Make the site feel like a premium beauty/fashion-tech startup.
 
---
 
4. CUSTOMER HOMEPAGE
 
Create a compelling homepage containing:
 
Hero section:
 
- Nifty Nails branding
- Strong visual showcasing nail designs
- Clear CTA
- "Shop Designs"
- "Create Your Own"
 
Sections:
 
1. Trending nail sets
2. Shop by style
3. AI Nail Stylist
4. Create Your Own Nails
5. Find My Nail Size
6. Gift Nifty
7. How it works
8. Customer reviews
9. Instagram/social section
10. Footer
 
The homepage must be mobile-first.
 
---
 
5. PRODUCT CATALOGUE
 
I will eventually upload my own nail designs.
 
Create a flexible product/catalogue system.
 
Each nail design should support:
 
- Product ID
- Name
- Description
- Price
- Images
- Category
- Style
- Nail shape
- Colours
- Finish
- Charms
- Patterns
- Occasion
- Difficulty
- Tags
- Available sizes
- Inventory
- Active/inactive status
 
Example:
 
Design:
"Pink Bow Coquette"
 
Category:
Coquette
 
Base:
Baby Pink
 
Finish:
Chrome
 
Colours:
Pink, White, Silver
 
Elements:
Bow, Pearl
 
Shape:
Almond
 
Price:
₹899
 
The admin should be able to enter all of this through the dashboard.
 
---
 
6. AI / SMART DESIGN SEARCH
 
Create a feature where the user can describe what they want.
 
Example:
 
"I want baby pink almond nails with chrome, little bows and pearls. Something cute but not too flashy."
 
The system should extract structured attributes such as:
 
- Colours
- Style
- Shape
- Finish
- Decorations
- Occasion
- Price range
 
Then search my catalogue and return the most relevant existing products.
 
Example:
 
"Closest matches"
 
Design #142 — 94%
Design #087 — 89%
Design #213 — 84%
 
Do NOT invent products that don't exist in the catalogue.
 
Use semantic search/vector embeddings where appropriate.
 
Design the system so that embeddings can be generated from product metadata and descriptions.
 
---
 
7. CUSTOM NAIL DESIGNER
 
This is one of the most important features.
 
Create a "Create Your Own Nails" section.
 
The user should be able to choose between:
 
A. AI/Chat Design
B. Draw Your Own
 
A. AI/Chat Design
 
Create a chat-style interface.
 
Example:
 
User:
"I want pink chrome nails with tiny white bows, pearls and 3D strawberries."
 
The system should convert this into a structured nail design.
 
The AI should help the user refine it.
 
Example:
 
"Would you like the strawberries on:
 
- One accent nail
- Two accent nails
- Every nail?"
 
The AI should work within the elements/materials actually available in my catalogue.
 
Do NOT assume unlimited charms or materials.
 
---
 
8. DRAW YOUR OWN NAILS
 
Create a real interactive nail design editor.
 
The user gets a set of 10 nail templates representing:
 
- Thumb
- Index
- Middle
- Ring
- Pinky
 
for both hands.
 
The user can select an individual nail.
 
When selected, the nail should zoom/enlarge.
 
The user can:
 
- Paint
- Erase
- Choose colours
- Add patterns
- Add finishes
- Add charms
- Add stickers/decorations
- Move decorations
- Resize decorations
- Rotate decorations
- Undo
- Redo
- Clear
- Duplicate design
- Save design
 
IMPORTANT:
 
Do not make this a basic rectangular drawing canvas.
 
The nail should have a mask/shape so painting is constrained to the actual nail shape.
 
The editor must be touch-friendly because most users will be on mobile.
 
Use a suitable canvas technology/library if necessary.
 
---
 
9. CHARM SYSTEM
 
Create reusable charm objects.
 
Examples:
 
- Bows
- Pearls
- Stars
- Butterflies
- Flowers
- Gems
- Hearts
- Strawberries
- 3D decorations
- Characters
 
Each charm should have:
 
- ID
- Name
- Image/asset
- Price/cost
- Inventory
- Active/inactive
- Category
 
Users can drag/drop charms onto individual nails.
 
The backend should record exactly which elements were used.
 
Example:
 
{
"base_color": "baby_pink",
"finish": "chrome",
"charms": [
{"type": "bow", "quantity": 2},
{"type": "pearl", "quantity": 4}
]
}
 
This is important because the final design needs to be manufacturable.
 
---
 
10. AI NAIL SIZING
 
Create a "Find My Nail Size" feature.
 
The user should be instructed to:
 
1. Place their hand next to a reference coin/object.
2. Take a clear photograph.
3. Upload the image.
 
The system should:
 
- Detect the hand
- Detect fingernails
- Detect the reference object
- Calibrate pixel measurements to real-world measurements
- Estimate each nail's width/length
- Map measurements to my Nifty Nails size system
 
My press-ons use sizes:
 
0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 
Do NOT simply ask an LLM to guess the size.
 
Build the system around computer vision and measurable geometry.
 
Create an admin interface where I can define the real dimensions of each of my nail sizes.
 
Example:
 
Size 0 → width X mm
Size 1 → width X mm
...
Size 9 → width X mm
 
The system should calculate the closest match.
 
Return:
 
Thumb: 2
Index: 5
Middle: 4
Ring: 5
Pinky: 8
 
Also return a confidence score.
 
If confidence is low, recommend manual measurement or a sizing kit instead of pretending the result is accurate.
 
IMPORTANT:
This feature must be designed as an estimation tool, not a medical or biometric identification system.
 
---
 
11. AI OUTFIT → NAIL DESIGN
 
Create an "AI Nail Stylist" feature.
 
The user can upload:
 
- Outfit photo
- Saree photo
- Dress photo
- Makeup inspiration
- Colour palette
- Existing nail inspiration
 
The system should analyze:
 
- Dominant colours
- Secondary colours
- Patterns
- Metallic accents
- Style
- Occasion
 
Then recommend nail designs from MY catalogue.
 
Example:
 
User uploads a pink/champagne outfit.
 
System:
 
"Your outfit has soft pink, champagne and floral details."
 
Then show relevant existing nail designs.
 
Do NOT automatically invent products that I cannot manufacture.
 
If a generated/custom design is requested, clearly label it as a custom design request.
 
---
 
12. GIFTING SYSTEM
 
Create a "Gift Nifty" feature.
 
Ask questions such as:
 
- Who are you gifting?
- Age range
- Relationship
- Occasion
- Favourite colours
- Style
- Interests
- Nail preferences
- Budget
 
Example:
 
"My best friend is 22. She loves pink, Barbie, makeup and cute things. Birthday. Budget ₹1500."
 
The system should recommend a gift bundle using products that actually exist.
 
For example:
 
Nail Set ₹599
Nail Care Kit ₹299
Gift Box ₹299
Personalized Card ₹99
 
Total ₹1296
 
The recommendation engine should respect the user's budget.
 
Allow me to define:
 
- Gift boxes
- Accessories
- Nail care products
- Cards
- Packaging
- Bundle pricing
 
---
 
13. CART / CHECKOUT
 
Create a normal ecommerce flow.
 
Cart should support:
 
- Standard products
- Custom nail sets
- AI-created designs
- Drawn designs
- Gift bundles
 
For custom orders, save the complete design configuration.
 
For each order, store:
 
- Customer
- Products
- Custom design
- Nail sizes
- Charms
- Shape
- Price
- Quantity
- Shipping information
- Payment status
- Order status
 
Order statuses:
 
NEW
DESIGN_REVIEW
APPROVED
IN_PRODUCTION
READY
SHIPPED
DELIVERED
CANCELLED
 
---
 
14. CUSTOMER ACCOUNTS
 
Customers should be able to:
 
- Register/login
- Save designs
- Save nail measurements
- View previous orders
- Reorder previous designs
- Track orders
- Save favourite products
 
Do not expose another customer's information.
 
---
 
15. ADMIN DASHBOARD
 
Create:
 
/admin
 
with a professional dashboard.
 
Sections:
 
Dashboard
Orders
Products
Design Catalogue
Custom Designs
Charms
Colours
Finishes
Nail Shapes
Inventory
Customers
Gift Bundles
AI Requests
Analytics
Settings
 
Dashboard metrics:
 
- Total sales
- Orders
- Pending orders
- Custom orders
- Customers
- Popular designs
- Popular charms
- Popular colours
- AI design → purchase conversion
- Average order value
 
---
 
16. ADMIN PRODUCT CREATION
 
I must be able to add products without editing code.
 
Create forms for:
 
Product name
Price
Description
Images
Category
Style
Colours
Shape
Finish
Charms
Tags
Inventory
Availability
 
The same applies to charms and other reusable design elements.
 
---

 17. RESPONSIVE DESIGN
This is extremely important.
The customer experience must be:
MOBILE FIRST.
Test layouts for:
360px
390px
414px
tablet
desktop
The nail editor especially must work well with touch.
Avoid tiny buttons and desktop-only interactions.
Admin should primarily be desktop optimized but should remain usable on mobile.
18. SECURITY
Implement:
Authentication
Password hashing
JWT/session-based auth
RBAC
Admin protection
Input validation
File upload validation
Image size/type restrictions
Rate limiting where appropriate
Secure API design
Environment variables for secrets
No API keys committed to Git
Proper CORS configuration
Do not store passwords in plaintext.
19. DATABASE
Design a normalized PostgreSQL schema.
At minimum consider:
users roles products product_images categories designs design_elements colours finishes charms nail_shapes nail_sizes inventory custom_designs custom_design_elements saved_designs orders order_items order_customizations gift_bundles gift_items reviews embeddings
Create proper relationships and indexes.
Use migrations.
20. FREE-FIRST REQUIREMENT
I want the project to be developed with a ₹0-first mindset.
Avoid paid services unless absolutely necessary.
Do not build the architecture around a paid AI API.
Use:
Open-source libraries
Free tiers
Local processing
Browser-side processing where practical
Deterministic algorithms when AI is unnecessary
Clearly separate: FREE / OPEN SOURCE components from OPTIONAL PAID components
If a feature genuinely cannot be implemented for free at production quality, explain why and provide a free MVP alternative.
21. DEVELOPMENT APPROACH
Do NOT attempt to build everything in one giant step.
First:
Inspect the project structure.
Propose the architecture.
Create the folder structure.
Set up the frontend.
Set up FastAPI.
Set up PostgreSQL/database models.
Set up authentication.
Build the customer shell.
Build the admin shell.
Then implement features one by one.
After each major feature:
Run tests
Check for errors
Check responsive behavior
Fix issues before continuing
Do not leave placeholder code pretending a feature is complete.
If something requires an external service that isn't configured yet, create a clean abstraction/interface so it can be plugged in later.
22. CODE QUALITY
Use:
Clean architecture
Reusable components
Type safety
Proper error handling
Logging
Environment configuration
API documentation
Unit tests
Integration tests where appropriate
Meaningful variable/function names
No unnecessary duplication
Do not put everything into one giant Python file or one giant React component.
Keep frontend, backend, ML, database and business logic properly separated.
23. IMPORTANT BUSINESS RULE
The AI must NOT promise designs that Nifty Nails cannot manufacture.
The catalogue/elements system should be the source of truth.
If a user asks for something unavailable, the system should say something like:
"This design uses a decoration we currently don't offer. Here's the closest design we can create."
This is a real business application, not an AI demo.
24. STARTING POINT
Before writing large amounts of code:
Analyze this specification.
Give me the proposed architecture.
Give me the folder structure.
Give me the database ERD/schema.
Give me the API structure.
Give me the major frontend pages/components.
Give me the AI/ML architecture.
Identify which parts can run completely free.
Identify any parts that may eventually require paid infrastructure.
Then start implementing Phase 1.
Do not skip directly to a superficial homepage.
Build the foundation so that the application can eventually become a real Nifty Nails business.
The final product should feel like:
A premium nail brand + ecommerce store + AI nail stylist + custom nail design studio + computer-vision sizing system.
The goal is not simply to "make a website."
The goal is to build the technology platform behind Nifty Nails.
   