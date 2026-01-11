# Category Backdrop Images

This folder contains backdrop images for product category cards on the dashboard.

## Image Requirements

### File Naming Convention
Images should be named exactly as the category name, but:
- Convert to lowercase
- Replace spaces with hyphens
- Use `.jpg` extension

### Examples:
- **Category: "Engine Parts"** → **File: `engine-parts.jpg`**
- **Category: "Bodywork"** → **File: `bodywork.jpg`**
- **Category: "Brakes"** → **File: `brakes.jpg`**
- **Category: "Electrical"** → **File: `electrical.jpg`**
- **Category: "Suspension"** → **File: `suspension.jpg`**

### Image Specifications
- **Format**: JPG (preferred) or PNG
- **Dimensions**: Minimum 400x300px, recommended 800x600px
- **Aspect Ratio**: 4:3 or 16:9 works well
- **File Size**: Keep under 500KB for optimal loading
- **Quality**: High quality, well-lit images

### Image Content Guidelines
- Use images that clearly represent the category
- Ensure good contrast for text overlay readability
- Avoid images with too much text or busy backgrounds
- Professional automotive parts photography works best

### Fallback Behavior
If an image is not found or fails to load:
- A blue gradient background will be displayed instead
- The category name and description will still be visible
- No broken image icons will appear

### Current Categories
Based on your database, you may need images for:
- Engine Parts
- Electrical
- Bodywork
- Suspension
- Brakes

### Adding New Categories
When adding new categories to your database:
1. Add the corresponding image to this folder
2. Follow the naming convention above
3. The image will automatically appear on the dashboard

### Technical Implementation
- Images are loaded from `/images/categories/[category-name].jpg`
- Error handling prevents broken image display
- Hover effects and overlays enhance user experience
- Responsive design works on all screen sizes
