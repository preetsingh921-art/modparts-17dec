# Yamaha Vintage & Second-Hand Parts Platform - Renovation Roadmap

Based on the comparison between the existing general auto-parts code and the new requirements for a specialized Yamaha RD/RX platform, here is a phased renovation plan.

## 🏁 Phase 1: Visual Identity & "Workshop" UX (Design Focus)
**Goal:** Shift the visual language from "Generic Auto Parts" to "Technical Workshop/Garage".
**Current State:** Generic modern SaaS styling (gradients, rounded corners).
**Required Changes:**
- **Design System:** Switch to a high-contrast, data-dense "Workshop" aesthetic.
    - *Colors:* Yamaha Racing Red, Oil Black, Mechanic Blue, Metallic Silver.
    - *Typography:* Monospaced fonts for data/SKUs (e.g., Roboto Mono), Industrial sans-serif for headers (e.g., Oswald or Inter).
- **Layout:** Reduce whitespace (increase data density).
- **Deliverables:**
    - 3 UI Concepts for Product Listing (Classic, Schematic, Dark-Garage).
    - 3 UI Concepts for Login Page.

## ⚙️ Phase 2: Structural Data Renovation (Model-First Logic)
**Goal:** Implement the "Model -> Year -> Sub-system" navigation.
**Current State:** Simple Category -> Product flow.
**Required Changes:**
- **Database:**
    - Create `bike_models` table (e.g., RD350, RX100).
    - Create `parts_diagrams` table.
    - Implement Many-to-Many relationship for `product_compatibility` (One part fits multiple bikes).
- **Navigation (Frontend):**
    - Replace generic "Shop by Category" with "Select Your Machine" selector.
    - Implement the "Model-First" router.

## 📐 Phase 3: Visual Parts Finder (The Killer Feature)
**Goal:** Interactive Exploded Diagrams.
**Current State:** Standard grid of product images.
**Required Changes:**
- **Feature:** "Hotspot" system for part diagrams.
    - Upload exploded view images.
    - Define clickable coordinates mapped to Product SKUs.
- **UI:** Split view (Diagram on left, Parts list on right).

## 🔩 Phase 4: Inventory & "Rare Parts" Engine
**Goal:** Handling One-off/Used items and Technical Reference.
**Current State:** Standard stock management.
**Required Changes:**
- **Used/Rare Module:**
    - Grading system (NOS / Refurbished / Used - Good / Core).
    - "Only 1 in stock" high-urgency UI indicators.
- **Technical Library:**
    - Create "Mechanic's Notes" section (non-blog format).
    - Link Tech Notes to specific Products (e.g., "Read tuning guide" on Carburetor page).

## 🛡️ Phase 5: Trust & Polish
**Goal:** Security and international shipping for collectors.
**Current State:** Basic checkout.
**Required Changes:**
- **Shipping:** Advanced weight-based shipping for international heavy parts.
- **Policies:** Explicit "Used Parts" return policy agreements.
- **Performance:** Cache heavy diagrams.

---

## 📝 Immediate Next Steps (Phase 1 Execution)
1. **Design Generation:** I will now generate the 3 requested UI concepts for the Product Listing and Login pages to visualize the "Workshop" aesthetic.
2. **Review:** You choose the preferred direction.
3. **Implementation:** We begin transforming `index.css` and the `Home.jsx` / `ProductList.jsx` to match the new identity.
