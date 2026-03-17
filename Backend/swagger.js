/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation at /api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Prism API - Article Bias Analyzer',
      version: '1.0.0',
      description: 'Real-time AI-powered article bias analysis using Claude AI and LangChain',
      contact: {
        name: 'Tim',
        email: 'tim@prism.dev'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Users',
        description: 'User management'
      },
      {
        name: 'Articles',
        description: 'Article management'
      },
      {
        name: 'Results',
        description: 'Analysis results management'
      },
      {
        name: 'Analysis',
        description: 'Real-time bias analysis (SSE streaming)'
      }
    ]
  },
  apis: ['./routes/*.js', './controllers/*.js', './server.js'] // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
