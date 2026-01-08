AI IDE PROMPT — Yamaha Vintage & Second-Hand Parts Platform

Objective
Build a specialized web platform for selling second-hand and vintage Yamaha motorcycle parts, focused on classic models such as RD350 / RD360 / RX series, serving mechanics, restorers, and collectors.

The site must function as both an e-commerce store and a technical reference system.

⸻

🧱 Core Architecture Requirements

1. Homepage (Navigation Hub)
Design the homepage as a functional router, not a marketing page.
Primary entry paths:
	•	Browse by Motorcycle Model
	•	Browse by Part Category
	•	Browse by Exploded Diagrams / Visual Parts Finder
	•	Browse Used & Rare Parts
	•	Access Technical Notes & Restoration Guides

⸻

2. Product Catalog System (Primary Module)
Implement a dual navigation system:

Model-First Flow
	•	Brand: Yamaha
	•	Model (e.g., RD350, RD360, RX100)
	•	Year / Generation
	•	Sub-systems (Engine, Gearbox, Electrical, Frame, Body)
	•	Compatible parts list

Category-First Flow
	•	Engine Parts
	•	Carburetion & Fuel
	•	Electrical & Ignition
	•	Suspension & Frame
	•	Body & Trim
	•	Controls & Cables
	•	Tools & Consumables

Each product must include:
	•	SKU / internal part ID
	•	Condition (used / refurbished / NOS)
	•	Compatibility mapping (many-to-many with models & years)
	•	Images (real photos, not stock)
	•	Price
	•	Stock quantity (often limited or one-off)
	•	Notes on wear, fitment, or substitutions

⸻

3. Visual Parts Finder (Exploded Diagrams)
Provide an interactive diagram system:
	•	Yamaha → Model → Year → Assembly Diagram
	•	Clickable components mapped to product listings
	•	Support discontinued and superseded parts
	•	Allow alternatives or compatible substitutions

Diagrams should behave as structured data, not static images.

⸻

4. Used & Rare Inventory Module
Handle second-hand parts as a special category:
	•	One-off or limited quantity items
	•	Manual condition grading
	•	No automatic restock assumptions
	•	Highlight rarity and model specificity

⸻

5. Technical Knowledge Base
Include a non-blog reference section:
	•	Restoration notes
	•	Carb tuning guidance
	•	Electrical wiring references
	•	Common failure points by model
	•	Compatibility warnings

Contextually link technical notes to relevant products and models.

⸻

6. Search & Discovery
	•	Global search across parts, models, diagrams, and notes
	•	Filters: model, year, condition, availability
	•	AI-assisted part finder (optional):
“I have RD350, need ignition coil alternative”

⸻

7. Customer & Trust Layer
	•	Secure checkout
	•	Shipping & returns
	•	Worldwide delivery support
	•	Contact & support
	•	Clear policies for used parts

⸻

🧠 Design & UX Philosophy
	•	Prioritize function over decoration
	•	Design for mechanics, not impulse shoppers
	•	Data-dense, fast, and precise
	•	No copying of competitor visuals or text
	•	Navigation should feel familiar but not identical to any existing site

⸻

🤖 Optional Advanced Features
	•	Model compatibility graph
	•	“This part fits…” intelligence
	•	Restoration project lists
	•	VIN or engine-number reference mapping
	•	Admin dashboard for rapid SKU updates

⸻

⚠️ Constraints
	•	Do NOT copy any competitor’s text, images, diagrams, or branding
	•	Use original naming, layout, and visual identity
	•	Structure may follow industry-standard navigation patterns only

⸻

This prompt gives your cousin a serious, workshop-grade platform, not a flimsy Shopify clone.