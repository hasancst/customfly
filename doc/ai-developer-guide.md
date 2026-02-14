# AI Services Developer Guide

This document outlines the architecture and usage of the AI-powered services integrated into the Product Customizer.

## Architecture

The AI system is divided into four main layers:

1.  **Providers**: Low-level API wrappers (e.g., `llmService.js` using Google Gemini).
2.  **Core Services**: Domain-specific logic (e.g., `aiService.js`, `productAnalyzer.js`, `configAnalyzer.js`).
3.  **Executors**: Implementation of AI-suggested actions (e.g., `configExecutor.js`, `bulkExecutor.js`).
4.  **Routes**: API endpoints exposed to the frontend (`ai.routes.js`).

## Key Services

### `AIService`
The main entry point for chat interactions. It aggregates data from multiple analyzers to provide context-rich prompts to the LLM.

### `ProductAnalyzer`
Identifies product types and suggests initial customization setups based on title, description, and tags.

### `ConfigAnalyzer`
Detects issues in existing configurations like missing safe areas, suboptimal canvas sizes, or UX friction points.

### `DiagnosticService`
Performs deep health checks on product configurations to troubleshoot missing elements or broken setups.

### `RecommendationEngine`
Persists proactive suggestions in the database (`AIRecommendation` model) that can be surfaced in the admin dashboard.

## Action Execution Flow

1.  **Suggest**: AI suggests an action in the chat response (structured JSON).
2.  **Log**: The action is logged in the `AIAction` table with status `pending`.
3.  **Approve**: The merchant clicks "Approve & Execute" in the UI.
4.  **Execute**: The backend verifies the session/shop and calls the appropriate executor to modify the database.

## Security Guardrails

*   **Multi-Shop Isolation**: Every database query is scoped with `where: { shop: shopId }` using protected session data.
*   **Data-Only Constraint**: AI can only modify specific whitelisted fields in the database. It cannot execute scripts or access the file system.
*   **JWT Verification**: All API requests require a valid Shopify session token.

## API Documentation

All AI endpoints are prefixed with `/imcst_api/`.

### 1. Chat Interaction
**POST** `/chat`
Handles AI conversation and returns suggested actions.

**Request Body:**
```json
{
  "message": "Bantu saya setup kanvas 20x20cm untuk produk ini",
  "context": { "productId": "12345" }
}
```

**Response Example:**
```json
{
  "message": "Tentu! Saya menyarankan pengaturan kanvas kustom...",
  "suggestedActions": [
    {
      "dbId": "action-uuid",
      "type": "UPDATE_CONFIG",
      "description": "Set canvas size to 20x20cm",
      "status": "pending"
    }
  ]
}
```

### 2. Action Execution
**POST** `/actions/:id/execute`
Executes a previously suggested action.

**Response Example:**
```json
{
  "success": true,
  "result": { "paperSize": "Custom", "customPaperDimensions": { "width": 20, "height": 20 } }
}
```

### 3. Action Rollback (Undo)
**POST** `/actions/:id/rollback`
Reverts an executed action using stored previous state.

**Response Example:**
```json
{
  "success": true,
  "result": { "paperSize": "Default" }
}
```

### 4. Conversation History
**GET** `/sessions`
Lists recent chat sessions for the current shop.

### 5. Insights & Analytics
**GET** `/analytics`
Returns AI performance metrics and impact summary.

**Response Example:**
```json
{
  "usage": {
    "totalSessions": 15,
    "executedActions": 10,
    "successRate": 66.6
  },
  "impact": {
    "timeSavedMinutes": 50
  }
}
```

## Adding New Actions

To add a new action type:
1. Define the action in the system prompt inside `aiService.js`.
2. Implement the logic in a new or existing executor in `backend/services/ai/executors/`.
3. Add the execution trigger in `backend/routes/ai.routes.js`.
