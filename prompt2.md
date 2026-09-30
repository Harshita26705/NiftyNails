You have already created the Nifty Nails project and implemented the current application.

Now I want you to work on the NEXT PHASE of the existing project.

Do NOT rebuild the project from scratch.

First inspect the current implementation and identify what is already working. Then implement the following improvements on top of it.

The goal is to make Nifty Nails feel like a **real high-end luxury nail brand**, while making the Design Studio a genuinely powerful product-design tool.

---

# PRIORITY 1 — REDESIGN THE CUSTOMER UI

The current UI should be upgraded from a playful/kiddish nail-app aesthetic to a premium luxury beauty/fashion aesthetic.

Target feeling:

* luxury
* editorial
* sophisticated
* minimal
* feminine but mature
* premium
* modern
* spacious

Think:

**Luxury beauty brand + fashion editorial + premium ecommerce**

Avoid:

* childish UI
* excessive pink
* excessive rounded cards
* cartoon-like elements
* excessive gradients
* emoji-heavy interfaces
* generic SaaS styling
* excessive shadows
* overly colorful buttons

Use:

* warm ivory / cream
* taupe / stone
* deep espresso / near-black
* muted champagne
* restrained accent colors
* elegant typography
* generous whitespace
* large editorial imagery
* subtle animations

Use an elegant serif/display font for major headings and a clean sans-serif for UI.

Create reusable design tokens instead of styling every page independently.

---

# PRIORITY 2 — REDESIGN THE HOMEPAGE

Make the homepage feel like a premium beauty brand.

Hero should feel editorial.

Example direction:

NIFTY NAILS

YOUR NAILS,
CONSIDERED.

Then:

DISCOVER THE COLLECTION

DESIGN YOUR OWN

Sections should introduce:

1. Featured collection
2. AI Stylist
3. Find My Size
4. Design Studio
5. Custom designs
6. Brand/story
7. Footer

Do not make every section look like a collection of cards.

Use large imagery, whitespace, typography, and visual hierarchy.

---

# PRIORITY 3 — DESIGN STUDIO

This is the biggest feature to improve.

The Design Studio should NOT feel like a simple nail template picker.

It should feel like a **professional digital nail-art/design studio**.

The philosophy is:

> You create. Nifty Nails makes it real.

The customer should have complete creative freedom.

---

## Design Studio tools

Support:

* Select
* Brush
* Eraser
* Shapes
* Line
* Text
* Gradient
* Color picker
* Upload image
* Duplicate
* Delete
* Undo
* Redo
* Zoom

Keep the UI minimal and professional.

---

# PRIORITY 4 — FREEHAND DRAWING

Users must be able to draw directly on the nail.

Support:

* freehand strokes
* adjustable brush size
* color
* opacity
* eraser
* smooth strokes
* undo/redo

Represent strokes as editable structured objects.

Do NOT flatten the entire design into a bitmap.

A stroke should contain information such as:

```text
points
width
color
opacity
brushType
transform
```

---

# PRIORITY 5 — SHAPES

Users should be able to add editable shapes.

At minimum:

* circle
* rectangle
* rounded rectangle
* triangle
* polygon
* star
* heart
* diamond
* line

Each shape should support:

* position
* scale
* rotation
* fill
* stroke
* stroke width
* opacity

---

# PRIORITY 6 — OMBRE / GRADIENT

Ombre is essential.

Users should be able to create their own ombre rather than selecting from predefined ombre designs.

Implement an editable gradient system.

Support:

* multiple colors where practical
* gradient direction
* angle
* color stops
* opacity

Examples:

Pink → nude

Black → burgundy → red

Lavender → blue

The gradient must remain editable.

---

# PRIORITY 7 — FIX FRENCH TIPS

The current French-tip implementation is not good enough.

Do NOT simply tweak the current appearance.

Rework it properly.

French tips should be represented as an editable vector/path-based design object clipped to the nail.

Support:

* classic French
* deep French
* micro French
* colored French
* double French
* asymmetric French

Allow the user to edit:

* color
* thickness
* depth
* curve
* position
* shape
* opacity

Most importantly:

A French tip should only be a starting point.

After creating it, the user must be able to modify it using the normal Design Studio tools.

Add tests for the French-tip geometry/rendering.

---

# PRIORITY 8 — NAIL CLIPPING

The nail itself should act as a clipping mask.

Anything drawn outside the nail should not visually appear outside the nail.

This must work for:

* brush strokes
* shapes
* gradients
* French tips
* text
* uploaded images
* effects

---

# PRIORITY 9 — LAYERS

Add a proper layer system.

Example:

```text
LAYERS

Chrome
Flower
Gold line
Ombre
Base
```

Support:

* reorder
* hide/show
* lock/unlock
* duplicate
* delete
* rename

---

# PRIORITY 10 — COPY / MIRROR / APPLY

Users should be able to:

* copy a design from one nail to another
* duplicate an object
* mirror a design
* apply a design to multiple nails
* apply to all nails
* apply only to selected nails

Example:

Apply design to:

* All nails
* Selected nails
* Thumb + Ring
* Mirror

---

# PRIORITY 11 — MULTI-NAIL DESIGN

Allow each nail to have its own design.

Support:

Thumb
Index
Middle
Ring
Pinky

The user should be able to switch between nails easily.

Also provide a full-set preview.

---

# PRIORITY 12 — DESIGN HISTORY

Implement reliable:

* Undo
* Redo

Prefer object/operation history rather than screenshot history.

The user should be able to undo individual changes without losing the entire design.

---

# PRIORITY 13 — DESIGN DATA MODEL

Make the design fully serializable.

Use a structure conceptually similar to:

```json
{
  "nails": [
    {
      "nailId": "thumb",
      "base": {},
      "objects": []
    }
  ]
}
```

Objects may include:

```text
base
stroke
shape
text
gradient
french_tip
image
effect
decoration
```

The design must be reloadable without losing editability.

---

# PRIORITY 14 — DYNAMIC CUSTOM DESIGN PRICING

Create pricing based on design complexity.

The user should NOT have to manually choose a price.

Start with a configurable base price, for example:

```text
Base Set = ₹799
```

Then calculate complexity based on the actual design.

Example complexity weights:

```text
Solid color             0
Gradient                1
French tip              1
Simple shape            1
Line art                2
Floral                  3
Freehand illustration   4
Chrome                  2
3D decoration           3
```

These values must be configurable.

Do not scatter hardcoded prices throughout the frontend.

---

# PRIORITY 15 — PRICING TIERS

Implement configurable pricing tiers.

Initial example:

```text
0–3 complexity       Essential       ₹799
4–7                  Signature       ₹899–999
8–12                 Atelier         ₹1,099–1,299
13–18                Couture         ₹1,399–1,699
19+                  Bespoke         ₹1,700+
```

These are initial business assumptions, NOT permanent values.

The admin must eventually be able to modify them.

---

# PRIORITY 16 — PRICE BREAKDOWN

While designing, show:

```text
YOUR DESIGN

Base Set              ₹799
Custom Design         ₹350
Premium Finish        ₹150

ESTIMATED TOTAL       ₹1,299
```

Do not make the customer feel like they are being charged for every tiny action.

Show:

VIEW PRICE BREAKDOWN

The breakdown should explain the price without making the experience feel cheap or overly transactional.

---

# PRIORITY 17 — SERVER-SIDE PRICE CALCULATION

The browser must NOT be trusted for final pricing.

When a custom design is submitted:

Backend must:

1. receive design definition
2. validate objects
3. calculate complexity
4. calculate authoritative price
5. return price breakdown
6. store the calculated price with the design/order

A user must not be able to manipulate the price through browser state.

---

# PRIORITY 18 — ADMIN PRICING SETTINGS

Add/update the admin pricing settings.

Admin should be able to configure:

* base set price
* complexity weights
* pricing tiers
* premium finishes
* decorations
* minimum price
* maximum price

Pricing configuration should live in the backend/database/configuration system, not only in React.

---

# PRIORITY 19 — ADMIN PORTAL

Make sure the admin portal is actually accessible.

Target route:

```text
/admin
```

Use the existing routing/auth architecture if it already uses another route.

Admin should have access to:

* Dashboard
* Orders
* Products
* Inventory
* Customers
* Custom Designs
* Reviews
* Pricing
* Analytics
* Settings

Normal customers must NOT be able to access admin pages.

---

# PRIORITY 20 — DEMO CUSTOMER + ADMIN ACCOUNTS

Add deterministic demo accounts through the existing seed/demo mechanism.

Do NOT hardcode authentication bypasses.

Customer:

```text
Email: customer.demo@niftynails.local
Password: NiftyCustomer123!
Role: CUSTOMER
```

Admin:

```text
Email: admin.demo@niftynails.local
Password: NiftyAdmin123!
Role: ADMIN
```

These should only be created when running the project's demo/seed setup.

Do not automatically create these accounts in production.

---

# PRIORITY 21 — ADMIN CUSTOM DESIGN REVIEW

Admin should be able to see custom designs submitted by customers.

Show:

* customer
* complete design preview
* individual nail designs
* complexity
* price
* status
* creation date

Admin should be able to manage the design lifecycle using the application's existing conventions.

Possible statuses:

```text
Draft
Submitted
Under Review
Approved
Needs Changes
Production
Completed
Cancelled
```

Do not duplicate an existing status system if the project already has one.

---

# PRIORITY 22 — PRODUCTION DESIGN DATA

For every custom design/order, preserve the actual design definition.

Do not store only a screenshot.

Preserve:

* strokes
* shapes
* gradients
* colors
* text
* effects
* nail assignments
* nail shape
* size
* transformations

The design should be reproducible by production/admin staff.

---

# PRIORITY 23 — CUSTOMER/ADMIN SEPARATION

Customer navigation:

```text
Shop
Collections
Design Studio
AI Stylist
Find My Size
Account
Bag
```

Admin navigation:

```text
Dashboard
Orders
Products
Inventory
Customers
Custom Designs
Reviews
Pricing
Analytics
Settings
```

Do not expose admin navigation to customers.

---

# PRIORITY 24 — AI STYLIST

Keep AI as an optional premium service.

It should feel like a personal stylist rather than a chatbot.

Example:

THE NIFTY STYLIST

"A personal nail consultation, curated for you."

The user can ask for:

* outfit matching
* occasion recommendations
* color combinations
* design variations
* style refinement

But the Design Studio must remain fully usable without AI.

AI should assist the customer, not take control away from them.

---

# PRIORITY 25 — TESTING

After implementation, run:

* backend tests
* frontend tests
* TypeScript checks
* lint
* production build
* existing E2E tests

Add tests for:

* French-tip generation
* gradient/ombre
* clipping
* pricing calculation
* pricing validation
* custom design serialization
* role-based admin access
* customer cannot access admin
* admin can access admin
* demo account seeding

Fix all regressions.

---

# PRIORITY 26 — FINAL QA

Before considering the task complete, manually verify these flows:

## Customer

1. Login as customer
2. Browse products
3. Open Design Studio
4. Select a nail
5. Change base color
6. Draw a freehand stroke
7. Add a shape
8. Add text
9. Create an ombre
10. Create a French tip
11. Modify the French tip
12. Move/reorder layers
13. Copy design to another nail
14. Mirror design
15. Undo/redo
16. Preview full set
17. See calculated price
18. Add custom design to cart
19. Verify server-side price
20. Place/order as appropriate

## Admin

1. Login as admin
2. Navigate to `/admin`
3. View dashboard
4. View orders
5. View products
6. View inventory
7. View customers
8. View custom designs
9. Open a customer's design
10. View its design structure
11. View calculated complexity
12. View price breakdown
13. Change pricing configuration
14. Verify new pricing is applied

## Security

Verify:

* customer cannot access admin
* unauthenticated users cannot access protected admin routes
* frontend cannot manipulate final custom-design price
* pricing is recalculated server-side
* demo credentials are not automatically enabled in production

---

# IMPLEMENTATION PRINCIPLES

1. Do not rewrite working functionality unnecessarily.
2. Reuse existing components and APIs where sensible.
3. Keep the architecture maintainable.
4. Keep pricing server-authoritative.
5. Keep Design Studio designs editable.
6. Do not flatten designs unnecessarily.
7. Keep customer and admin experiences visually distinct.
8. Make the customer experience luxury-first.
9. Make the Design Studio powerful but intuitive.
10. Do not sacrifice usability for visual aesthetics.

Most importantly:

**Nifty Nails should feel like a luxury nail house that happens to have exceptional technology — not a technology demo that sells nails.**

After implementation, provide a concise summary of:

* what you changed
* files/components changed
* database changes
* API changes
* how to run the demo accounts
* how to access the admin portal
* how the new pricing system works
* tests/builds that passed
* any remaining limitations
