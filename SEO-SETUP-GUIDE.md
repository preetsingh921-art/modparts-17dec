# SEO Setup Guide for ModParts

Complete guide for setting up SEO and Google Search Console for your ModParts website.

## 🎯 Quick Start

Your sitemap is now live at: **https://partsformyrd350.com/sitemap.xml**

## 📋 Current SEO Status

### ✅ Completed
- **Sitemap.xml**: Generated with 103 URLs (13 static + 5 categories + 85 products)
- **Robots.txt**: Configured with proper allow/disallow rules
- **Dynamic Generation**: Automated sitemap updates from database
- **File Size**: 17.62 KB (well within Google's 50MB limit)

### 📊 Sitemap Contents
- **Homepage**: Priority 1.0, Daily updates
- **Product Pages**: Priority 0.9, Daily updates  
- **Category Pages**: Priority 0.8, Weekly updates
- **Individual Products**: Priority 0.7, Weekly updates
- **Auth Pages**: Priority 0.5, Monthly updates
- **Static Pages**: Priority 0.4-0.6, Monthly/Yearly updates

## 🔍 Google Search Console Setup

### Step 1: Add Property
1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click "Add Property"
3. Choose "URL prefix" method
4. Enter: `https://partsformyrd350.com`
5. Click "Continue"

### Step 2: Verify Ownership
Choose one of these verification methods:

#### Method A: HTML File Upload (Recommended)
1. Download the verification file from Google
2. Upload it to `frontend/public/` directory
3. Verify it's accessible at: `https://partsformyrd350.com/[filename].html`
4. Click "Verify" in Google Search Console

#### Method B: HTML Tag
1. Copy the meta tag from Google
2. Add it to your website's `<head>` section
3. Click "Verify"

#### Method C: DNS Record
1. Add the TXT record to your domain's DNS
2. Wait for DNS propagation (up to 24 hours)
3. Click "Verify"

### Step 3: Submit Sitemap
1. In Google Search Console, go to "Sitemaps" (left sidebar)
2. Click "Add a new sitemap"
3. Enter: `sitemap.xml`
4. Click "Submit"

### Step 4: Verify Robots.txt
1. In Google Search Console, go to "robots.txt Tester"
2. Verify it shows your robots.txt content
3. Test important URLs to ensure they're allowed

## 🛠️ Sitemap Management

### Automatic Generation
```bash
# Generate new sitemap with current data
npm run sitemap

# Preview what would be generated
npm run sitemap:preview
```

### Manual Updates
When you add new products or categories, regenerate the sitemap:
```bash
npm run sitemap
npm run deploy "Update sitemap with new products"
```

### Scheduled Updates
Consider setting up a cron job to regenerate the sitemap daily:
```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * cd /path/to/your/project && npm run sitemap
```

## 📈 SEO Best Practices

### URL Structure
Your URLs are already SEO-friendly:
- ✅ `partsformyrd350.com/products` (main products page)
- ✅ `partsformyrd350.com/products/category/5` (category pages)
- ✅ `partsformyrd350.com/products/123` (individual products)

### Meta Tags (Recommended Additions)
Add these to your HTML `<head>`:

```html
<!-- Basic SEO -->
<title>Yamaha RD350 Parts | ModParts - Authentic Motorcycle Parts</title>
<meta name="description" content="Premium Yamaha RD350 motorcycle parts and accessories. Engine parts, bodywork, electrical components, and more. Fast shipping, authentic parts.">
<meta name="keywords" content="Yamaha RD350, motorcycle parts, engine parts, bodywork, electrical, suspension, brakes">

<!-- Open Graph (Social Media) -->
<meta property="og:title" content="Yamaha RD350 Parts | ModParts">
<meta property="og:description" content="Premium Yamaha RD350 motorcycle parts and accessories">
<meta property="og:image" content="https://partsformyrd350.com/images/og-image.jpg">
<meta property="og:url" content="https://partsformyrd350.com">
<meta property="og:type" content="website">

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Yamaha RD350 Parts | ModParts">
<meta name="twitter:description" content="Premium Yamaha RD350 motorcycle parts and accessories">
<meta name="twitter:image" content="https://partsformyrd350.com/images/twitter-image.jpg">
```

### Structured Data (JSON-LD)
Add product schema for better search results:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Store",
  "name": "ModParts",
  "description": "Premium Yamaha RD350 motorcycle parts and accessories",
  "url": "https://partsformyrd350.com",
  "logo": "https://partsformyrd350.com/images/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service"
  }
}
</script>
```

## 🔧 Technical SEO

### Performance
- ✅ Fast loading times
- ✅ Mobile responsive design
- ✅ Optimized images

### Security
- ✅ HTTPS enabled
- ✅ Secure headers

### Accessibility
- ✅ Semantic HTML
- ✅ Alt tags for images
- ✅ Keyboard navigation

## 📊 Monitoring & Analytics

### Google Analytics Setup
1. Create Google Analytics account
2. Add tracking code to your website
3. Link with Google Search Console

### Key Metrics to Track
- **Organic Traffic**: Users from search engines
- **Click-Through Rate**: From search results to your site
- **Page Load Speed**: Core Web Vitals
- **Mobile Usability**: Mobile-friendly test results
- **Index Coverage**: How many pages are indexed

### Regular Tasks
- **Weekly**: Check Search Console for errors
- **Monthly**: Review organic traffic and rankings
- **Quarterly**: Update sitemap and check for broken links
- **As needed**: Submit new pages for indexing

## 🚀 Next Steps

### Immediate Actions
1. ✅ **Sitemap submitted**: https://partsformyrd350.com/sitemap.xml
2. ⏳ **Verify Google Search Console ownership**
3. ⏳ **Submit sitemap to Google**
4. ⏳ **Request indexing for key pages**

### Short Term (1-2 weeks)
- Add meta descriptions to all pages
- Optimize product titles and descriptions
- Add structured data for products
- Set up Google Analytics

### Long Term (1-3 months)
- Monitor search performance
- Optimize based on search queries
- Build quality backlinks
- Create content marketing strategy

## 📞 Support

### Useful Tools
- **Google Search Console**: https://search.google.com/search-console/
- **Google PageSpeed Insights**: https://pagespeed.web.dev/
- **Google Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
- **Sitemap Validator**: https://www.xml-sitemaps.com/validate-xml-sitemap.html

### Files Location
- **Sitemap**: `frontend/public/sitemap.xml`
- **Robots.txt**: `frontend/public/robots.txt`
- **Generator**: `generate-sitemap.js`
- **This Guide**: `SEO-SETUP-GUIDE.md`

## 🎉 Success Metrics

Your SEO setup is complete when:
- ✅ Google Search Console shows "Success" for sitemap
- ✅ Pages start appearing in Google search results
- ✅ No critical errors in Search Console
- ✅ Mobile usability shows no issues
- ✅ Core Web Vitals are in "Good" range

**Your website is now ready for Google indexing!** 🚀
