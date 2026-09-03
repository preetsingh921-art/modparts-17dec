/**
 * Helper function to handle image URLs properly
 *
 * This function checks if the image URL is valid and returns a fallback if not.
 * It handles both absolute URLs and relative paths.
 */

// Function to check if a string is a valid URL
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Function to get the base URL of the application
const getBaseUrl = () => {
  return window.location.origin;
};

/**
 * Check if URL is from Supabase Storage
 * @param {string} url
 * @returns {boolean}
 */
export const isSupabaseStorageUrl = (url) => {
  return url && url.includes('supabase.co/storage/v1/object/public/');
};

/**
 * Process image URL to ensure it's properly formatted
 * Now handles Supabase Storage URLs properly
 *
 * @param {string} imageUrl - The image URL to process
 * @param {string} fallbackUrl - Optional fallback URL if the image is invalid
 * @returns {string} - The processed image URL
 */
export const processImageUrl = (imageUrl, fallbackUrl = null) => {
  // If no image URL is provided or it's "nan", return null to trigger placeholder
  if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'nan' || imageUrl === 'undefined' || imageUrl === 'null') {
    return null;
  }

  // Log the original URL for debugging
  console.log('Processing image URL:', imageUrl);

  // If it's a Supabase Storage URL, return it as-is (it's already a full URL)
  if (isSupabaseStorageUrl(imageUrl)) {
    console.log('Using Supabase Storage URL as-is:', imageUrl);
    return imageUrl;
  }

  // If it's any other external URL (http/https), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    console.log('Using external URL as-is:', imageUrl);
    return imageUrl;
  }

  // If it's already a valid URL, return it as is
  if (isValidUrl(imageUrl)) {
    // Check if the URL is from the old domain and needs to be updated
    // This is useful when migrating from development to production
    const currentDomain = window.location.origin;
    const urlObj = new URL(imageUrl);

    // If the URL is from localhost but we're on a different domain, update it
    if (urlObj.hostname.includes('localhost') && !currentDomain.includes('localhost')) {
      console.log('Converting localhost URL to current domain:', imageUrl);
      // Extract the path from the URL and append it to the current domain
      return `${currentDomain}${urlObj.pathname}`;
    }

    console.log('Using valid URL as-is:', imageUrl);
    return imageUrl;
  }

  // If it's a relative path starting with '/', append it to the base URL
  if (imageUrl.startsWith('/')) {
    const processedUrl = `${getBaseUrl()}${imageUrl}`;
    console.log('Processed relative URL (with /):', processedUrl);
    return processedUrl;
  }

  // If it's a relative path not starting with '/', append it to the base URL with '/'
  const processedUrl = `${getBaseUrl()}/${imageUrl}`;
  console.log('Processed relative URL (without /):', processedUrl);
  return processedUrl;
};

/**
 * Handle image loading errors by setting a fallback image
 *
 * @param {Event} event - The error event from the img element
 * @param {string} fallbackUrl - Optional fallback URL to use
 */
export const handleImageError = (event, fallbackUrl = null) => {
  const currentSrc = event.target.src;
  console.error('Image failed to load:', currentSrc);

  // Check if we're already trying to load a fallback image to prevent infinite loops
  if (currentSrc.includes('placeholder-image.svg') ||
      event.target.hasAttribute('data-using-fallback')) {
    // Already using fallback, don't try again
    console.log('Already using fallback image, preventing infinite loop');

    // Remove the src attribute to stop loading attempts
    event.target.removeAttribute('src');

    // Add a class and placeholder text
    event.target.classList.add('image-load-error');

    // Create a placeholder div with text
    const placeholder = document.createElement('div');
    placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-200';
    placeholder.innerHTML = '<span class="text-gray-500 text-sm">Image unavailable</span>';

    // Replace the image with the placeholder if possible
    if (event.target.parentNode) {
      event.target.parentNode.appendChild(placeholder);
      event.target.style.display = 'none';
    }

    return;
  }

  // Set a default fallback if none provided
  const defaultFallback = '/placeholder-image.svg';

  // Mark the image as using a fallback to prevent infinite loops
  event.target.setAttribute('data-using-fallback', 'true');

  // Set the fallback image with the full path
  event.target.src = fallbackUrl || defaultFallback;

  // Add a class to indicate the image failed to load
  event.target.classList.add('image-load-error');
};

export default {
  processImageUrl,
  handleImageError
};
