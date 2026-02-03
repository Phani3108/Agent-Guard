/**
 * IMAGE GENERATOR AGENT
 * Generates relevant images for content using DALL-E 3
 * Supports both Standard OpenAI and Azure OpenAI
 * Simple and easy to understand!
 */

const { getChatModel, getImageModel, isImageGenerationAvailable } = require('../config/ai-config');

/**
 * Generate an image based on content
 * @param {string} content - The content text
 * @param {string} platform - Platform (LinkedIn, Twitter, etc.)
 * @param {object} openai - OpenAI or Azure OpenAI client
 * @returns {object} Image generation result
 */
async function generateContentImage(content, platform, openai) {
  try {
    console.log('🎨 Starting image generation...');

    // Check if image generation is available
    if (!isImageGenerationAvailable(openai)) {
      return {
        success: false,
        error: 'Image generation not available',
        suggestion: 'DALL-E is not deployed in your Azure OpenAI resource. Deploy DALL-E or use standard OpenAI.'
      };
    }

    // STEP 1: Create a smart prompt for the image
    // We ask ChatGPT to analyze the content and create a good image description
    const chatModel = getChatModel(openai);
    console.log(`📝 Using chat model: ${chatModel}`);
    
    const promptResponse = await openai.chat.completions.create({
      model: chatModel,  // Automatically uses Azure deployment or OpenAI model
      messages: [
        {
          role: "system",
          content: `You are an expert at creating stunning, visually pleasing image prompts for DALL-E that result in beautiful, professional marketing visuals.

STYLE REQUIREMENTS:
- Create BEAUTIFUL, POLISHED, VISUALLY STUNNING images
- Use professional graphic design principles
- Prefer: clean compositions, balanced layouts, harmonious colors
- Include lighting: soft lighting, gradient backgrounds, professional studio quality
- Add depth: subtle shadows, layered elements, dimensional design

AESTHETIC GUIDELINES:
- Color: Use vibrant but harmonious color palettes (blues, teals, purples, gradients)
- Composition: Balanced, centered, with clear focal point
- Quality: Sleek, modern, premium feel
- Style: Digital art, 3D illustration, isometric design, or premium flat design
- Avoid: cluttered, busy, amateur-looking designs

MUST AVOID:
- NO photorealistic people or faces
- NO realistic human bodies
- Use stylized figures, silhouettes, or abstract representations if people are needed

OUTPUT FORMAT:
Create a detailed, visually-rich description (under 400 characters) focusing on beautiful aesthetics, professional quality, and visual appeal.`
        },
        {
          role: "user",
          content: `Create a stunning, visually beautiful image prompt for this ${platform} content:\n\n"${content}"\n\nMake it premium quality, aesthetically pleasing, with beautiful colors and professional design. Use illustration/3D art style - NO realistic people. Describe the visual beauty and composition in detail.`
        }
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const imagePrompt = promptResponse.choices[0].message.content.trim();
    
    // Add premium visual style keywords for stunning results
    const enhancedPrompt = `${imagePrompt}. Premium quality digital art, vibrant gradient colors, soft professional lighting, clean composition, modern aesthetic, polished 3D illustration style, visually stunning, magazine-quality, studio lighting, depth and dimension, no photorealistic people`;
    
    console.log('📝 Generated image prompt:', imagePrompt);
    console.log('✨ Enhanced with premium styling:', enhancedPrompt);

    // STEP 2: Generate the image using DALL-E 3
    const imageModel = getImageModel(openai);
    console.log(`🎨 Using image model: ${imageModel}`);
    
    const imageResponse = await openai.images.generate({
      model: imageModel,           // Automatically uses Azure deployment or OpenAI model
      prompt: enhancedPrompt,      // Our enhanced prompt with premium styling
      n: 1,                        // Generate 1 image
      size: getSizeForPlatform(platform),  // Get right size for platform
      quality: "standard",         // "standard" or "hd" (hd costs more)
      style: "vivid",              // "vivid" for more vibrant, beautiful images
    });

    // STEP 3: Get the image URL
    const imageUrl = imageResponse.data[0].url;
    const revisedPrompt = imageResponse.data[0].revised_prompt; // DALL-E sometimes improves the prompt

    console.log('✅ Image generated successfully!');

    return {
      success: true,
      image_url: imageUrl,
      prompt_used: imagePrompt,
      revised_prompt: revisedPrompt,
      platform: platform,
      size: getSizeForPlatform(platform),
      model: "dall-e-3",
      generated_at: new Date().toISOString(),
      // Note: Image URLs expire after ~1 hour. In production, download and store them!
      expiry_note: "Image URL expires in ~1 hour. Download to keep permanently."
    };

  } catch (error) {
    console.error('❌ Image generation failed:', error.message);
    console.error('Error details:', error);
    
    // Handle specific errors
    if (error.message && error.message.includes('content_policy_violation')) {
      return {
        success: false,
        error: 'Content violates image generation policy',
        suggestion: 'Try modifying the content to be more appropriate'
      };
    }

    if (error.message && error.message.includes('billing')) {
      return {
        success: false,
        error: 'Billing issue with OpenAI account',
        suggestion: 'Please check your OpenAI billing settings and add payment method'
      };
    }

    if (error.message && error.message.includes('quota')) {
      return {
        success: false,
        error: 'API quota exceeded',
        suggestion: 'Please check your OpenAI usage limits or upgrade your plan'
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.response?.data || error.toString(),
      stack: error.stack
    };
  }
}

/**
 * Get the recommended image size for each platform
 * @param {string} platform - Platform name
 * @returns {string} Image size (e.g., "1024x1024")
 */
function getSizeForPlatform(platform) {
  // DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
  
  const sizes = {
    'LinkedIn': '1024x1024',    // Square works well for LinkedIn posts
    'Twitter': '1024x1024',      // Square or landscape
    'X': '1024x1024',            // Same as Twitter
    'Facebook': '1024x1024',     // Square is versatile
    'Instagram': '1024x1024',    // Square is native
    'TikTok': '1024x1792',       // Vertical/portrait
    'default': '1024x1024'       // Square is safe default
  };

  return sizes[platform] || sizes['default'];
}

/**
 * Generate image with simple options
 * Good for quick testing!
 * @param {string} simplePrompt - Direct image description
 * @param {object} openai - OpenAI client
 * @returns {object} Image generation result
 */
async function generateSimpleImage(simplePrompt, openai) {
  try {
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: simplePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return {
      success: true,
      image_url: imageResponse.data[0].url,
      prompt_used: simplePrompt
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateContentImage,
  generateSimpleImage,
  getSizeForPlatform
};
