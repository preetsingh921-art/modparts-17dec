#!/usr/bin/env node

/**
 * Dynamic Sitemap Generator for ModParts
 * Generates sitemap.xml with current categories and products from database
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { supabase } = require('./lib/supabase');

class SitemapGenerator {
    constructor() {
        this.baseUrl = 'https://partsformyrd350.com';
        this.currentDate = new Date().toISOString().split('T')[0];
        this.urls = [];
    }

    // Add URL to sitemap
    addUrl(loc, lastmod = this.currentDate, changefreq = 'weekly', priority = '0.5') {
        this.urls.push({
            loc: `${this.baseUrl}${loc}`,
            lastmod,
            changefreq,
            priority
        });
    }

    // Add static pages
    addStaticPages() {
        console.log('📄 Adding static pages...');
        
        // Homepage
        this.addUrl('/', this.currentDate, 'daily', '1.0');
        
        // Main product page
        this.addUrl('/products', this.currentDate, 'daily', '0.9');
        
        // Authentication pages
        this.addUrl('/login', this.currentDate, 'monthly', '0.5');
        this.addUrl('/register', this.currentDate, 'monthly', '0.5');
        this.addUrl('/verify-email', this.currentDate, 'monthly', '0.3');
        this.addUrl('/resend-verification', this.currentDate, 'monthly', '0.3');
        
        // Shopping pages
        this.addUrl('/cart', this.currentDate, 'never', '0.3');
        
        // Static/info pages (for future use)
        this.addUrl('/about', this.currentDate, 'monthly', '0.6');
        this.addUrl('/contact', this.currentDate, 'monthly', '0.6');
        this.addUrl('/privacy-policy', this.currentDate, 'yearly', '0.4');
        this.addUrl('/terms-of-service', this.currentDate, 'yearly', '0.4');
        this.addUrl('/shipping-info', this.currentDate, 'monthly', '0.5');
        this.addUrl('/return-policy', this.currentDate, 'monthly', '0.5');
        
        console.log(`✅ Added ${this.urls.length} static pages`);
    }

    // Fetch and add categories
    async addCategories() {
        try {
            console.log('📂 Fetching categories from database...');
            
            const { data: categories, error } = await supabase
                .from('categories')
                .select('id, name, updated_at')
                .order('id');

            if (error) {
                console.error('❌ Error fetching categories:', error);
                return;
            }

            console.log(`📂 Found ${categories.length} categories`);

            categories.forEach(category => {
                const lastmod = category.updated_at ? 
                    new Date(category.updated_at).toISOString().split('T')[0] : 
                    this.currentDate;
                
                this.addUrl(`/products/category/${category.id}`, lastmod, 'weekly', '0.8');
                console.log(`  ✅ Added category: ${category.name} (ID: ${category.id})`);
            });

        } catch (error) {
            console.error('❌ Error adding categories:', error);
        }
    }

    // Fetch and add products
    async addProducts() {
        try {
            console.log('🛍️ Fetching products from database...');
            
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, updated_at')
                .order('id');

            if (error) {
                console.error('❌ Error fetching products:', error);
                return;
            }

            console.log(`🛍️ Found ${products.length} products`);

            // Add products in batches to avoid overwhelming the sitemap
            const maxProducts = 1000; // Limit for sitemap size
            const productsToAdd = products.slice(0, maxProducts);

            productsToAdd.forEach(product => {
                const lastmod = product.updated_at ? 
                    new Date(product.updated_at).toISOString().split('T')[0] : 
                    this.currentDate;
                
                this.addUrl(`/products/${product.id}`, lastmod, 'weekly', '0.7');
            });

            console.log(`✅ Added ${productsToAdd.length} products to sitemap`);
            
            if (products.length > maxProducts) {
                console.log(`⚠️ Note: Limited to ${maxProducts} products. Consider creating a product sitemap index.`);
            }

        } catch (error) {
            console.error('❌ Error adding products:', error);
        }
    }

    // Generate XML content
    generateXML() {
        console.log('📝 Generating XML content...');
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

`;

        this.urls.forEach(url => {
            xml += `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>

`;
        });

        xml += `</urlset>`;
        
        return xml;
    }

    // Save sitemap to file
    saveSitemap(xml) {
        const sitemapPath = path.join(__dirname, 'frontend', 'public', 'sitemap.xml');
        
        try {
            fs.writeFileSync(sitemapPath, xml, 'utf8');
            console.log(`✅ Sitemap saved to: ${sitemapPath}`);
            console.log(`📊 Total URLs: ${this.urls.length}`);
            
            // Show file size
            const stats = fs.statSync(sitemapPath);
            const fileSizeKB = (stats.size / 1024).toFixed(2);
            console.log(`📏 File size: ${fileSizeKB} KB`);
            
        } catch (error) {
            console.error('❌ Error saving sitemap:', error);
        }
    }

    // Generate robots.txt
    generateRobotsTxt() {
        const robotsPath = path.join(__dirname, 'frontend', 'public', 'robots.txt');
        
        const robotsContent = `User-agent: *
Allow: /

# Disallow admin and user-specific pages
Disallow: /admin/
Disallow: /profile
Disallow: /orders
Disallow: /checkout
Disallow: /order-confirmation/
Disallow: /wishlist

# Allow important pages
Allow: /products
Allow: /login
Allow: /register

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1
`;

        try {
            fs.writeFileSync(robotsPath, robotsContent, 'utf8');
            console.log(`🤖 Robots.txt saved to: ${robotsPath}`);
        } catch (error) {
            console.error('❌ Error saving robots.txt:', error);
        }
    }

    // Main generation process
    async generate() {
        console.log('🚀 Starting sitemap generation...');
        console.log(`🌐 Base URL: ${this.baseUrl}`);
        console.log(`📅 Date: ${this.currentDate}`);
        console.log('');

        try {
            // Add static pages
            this.addStaticPages();
            
            // Add dynamic content from database
            await this.addCategories();
            await this.addProducts();
            
            // Generate XML
            const xml = this.generateXML();
            
            // Save files
            this.saveSitemap(xml);
            this.generateRobotsTxt();
            
            console.log('');
            console.log('🎉 Sitemap generation completed successfully!');
            console.log('');
            console.log('📋 Summary:');
            console.log(`   • Total URLs: ${this.urls.length}`);
            console.log(`   • Sitemap: ${this.baseUrl}/sitemap.xml`);
            console.log(`   • Robots.txt: ${this.baseUrl}/robots.txt`);
            console.log('');
            console.log('🔍 Next steps for Google Search Console:');
            console.log('   1. Submit sitemap URL: https://partsformyrd350.com/sitemap.xml');
            console.log('   2. Verify robots.txt: https://partsformyrd350.com/robots.txt');
            console.log('   3. Request indexing for important pages');
            
        } catch (error) {
            console.error('❌ Sitemap generation failed:', error);
            process.exit(1);
        }
    }

    // Show help
    static showHelp() {
        console.log('Dynamic Sitemap Generator for ModParts');
        console.log('');
        console.log('Usage:');
        console.log('  node generate-sitemap.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  -h, --help     Show this help message');
        console.log('  --dry-run      Show what would be generated without saving');
        console.log('');
        console.log('Examples:');
        console.log('  node generate-sitemap.js              # Generate and save sitemap');
        console.log('  node generate-sitemap.js --dry-run    # Preview without saving');
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('-h') || args.includes('--help')) {
        SitemapGenerator.showHelp();
        process.exit(0);
    }
    
    const generator = new SitemapGenerator();
    
    if (args.includes('--dry-run')) {
        console.log('🔍 DRY RUN MODE - No files will be saved');
        console.log('');
    }
    
    generator.generate();
}

module.exports = SitemapGenerator;
