/**
 * AI Configuration
 * Supports both Standard OpenAI and Azure OpenAI
 */

require('dotenv').config();
const { AzureOpenAI } = require('openai');
const OpenAI = require('openai');

/**
 * Determine which AI service to use based on environment variables
 * Priority: Azure OpenAI > Standard OpenAI
 */
function getAIClient() {
  // Check if Azure OpenAI is configured
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    console.log('🔵 Using Azure OpenAI');
    
    const client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    });

    // Mark this as Azure for conditional logic
    client._isAzure = true;
    client._deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    client._dalleDeploymentName = process.env.AZURE_DALLE_DEPLOYMENT_NAME || null;
    
    return client;
  }
  
  // Fall back to standard OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log('🟢 Using Standard OpenAI');
    
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    client._isAzure = false;
    
    return client;
  }

  throw new Error('No AI API configuration found. Please set either Azure OpenAI or Standard OpenAI credentials in .env file');
}

/**
 * Get the appropriate model name for chat completions
 * Azure uses deployment names, OpenAI uses model names
 */
function getChatModel(client) {
  if (client._isAzure) {
    // For Azure, use the deployment name
    return client._deploymentName || 'gpt-4';
  } else {
    // For standard OpenAI, use model name
    return 'gpt-4o-mini';  // or 'gpt-4' if you have access
  }
}

/**
 * Get the appropriate model for image generation
 * Azure uses deployment names, OpenAI uses model names
 */
function getImageModel(client) {
  if (client._isAzure) {
    // For Azure, check if DALL-E is deployed
    if (client._dalleDeploymentName) {
      return client._dalleDeploymentName;
    } else {
      throw new Error('DALL-E not configured in Azure. Set AZURE_DALLE_DEPLOYMENT_NAME in .env');
    }
  } else {
    // For standard OpenAI
    return 'dall-e-3';
  }
}

/**
 * Check if image generation is available
 */
function isImageGenerationAvailable(client) {
  if (client._isAzure) {
    return !!client._dalleDeploymentName;
  }
  return true; // Always available in standard OpenAI
}

module.exports = {
  getAIClient,
  getChatModel,
  getImageModel,
  isImageGenerationAvailable,
};
