# Requirements Document: AI-Assisted Product Customization

## Introduction

This feature enables AI-powered analysis of reference websites to automatically create or customize products in the system. The AI analyzes product customization patterns, identifies required assets (fonts, colors, shapes, images), and leverages existing system capabilities to configure products that match the reference design.

## Glossary

- **Reference_Website**: An external website URL provided by the user that demonstrates desired product customization features
- **AI_Analyzer**: The system component that fetches and analyzes reference websites to extract customization patterns
- **Asset_Manager**: The existing system component that manages fonts, colors, gallery images, options, and shapes
- **Product_Configurator**: The system component that creates or updates MerchantConfig and SavedDesign records
- **Action_Executor**: The backend service that executes AI actions (CREATE_ASSET, ADD_ITEMS_TO_ASSET, UPDATE_ASSET)
- **Customization_Pattern**: A set of features identified from the reference website (text fields, color options, shape selections, etc.)
- **Asset_Type**: One of: font, color, gallery, option, or shape
- **Configuration_Plan**: A structured plan detailing which assets to create, reuse, or update to match the reference
- **Canvas_Designer**: The existing canvas-based product designer with elements, base images, and safe areas

## Requirements

### Requirement 1: Reference Website Analysis

**User Story:** As a merchant, I want to provide a reference website URL, so that the AI can analyze and understand the product customization features.

#### Acceptance Criteria

1. WHEN a user provides a reference website URL, THE AI_Analyzer SHALL fetch the website content
2. WHEN the website content is fetched, THE AI_Analyzer SHALL extract HTML structure and visual elements
3. WHEN analyzing the website, THE AI_Analyzer SHALL identify customization options including text fields, color pickers, font selectors, shape options, and image upload areas
4. WHEN analyzing the website, THE AI_Analyzer SHALL identify layout patterns and design structure
5. IF the website cannot be fetched, THEN THE System SHALL return a descriptive error message
6. WHEN analysis is complete, THE AI_Analyzer SHALL generate a structured Customization_Pattern document

### Requirement 2: Asset Discovery and Reuse

**User Story:** As a system, I want to check existing assets before creating new ones, so that I can leverage available resources and avoid duplication.

#### Acceptance Criteria

1. WHEN the AI_Analyzer identifies required assets, THE Asset_Manager SHALL query existing assets by type and shop
2. WHEN existing assets match the requirements, THE System SHALL prioritize reusing existing assets over creating new ones
3. WHEN existing assets partially match requirements, THE System SHALL use ADD_ITEMS_TO_ASSET to extend existing asset groups
4. WHEN no matching assets exist, THE System SHALL plan to create new assets using CREATE_ASSET
5. THE Asset_Manager SHALL return a list of available assets with their IDs, names, types, and item counts

### Requirement 3: Configuration Plan Generation

**User Story:** As a merchant, I want the AI to create a detailed plan before making changes, so that I can review and approve the proposed configuration.

#### Acceptance Criteria

1. WHEN asset analysis is complete, THE System SHALL generate a Configuration_Plan
2. THE Configuration_Plan SHALL list all assets to be created with their type, name, and items
3. THE Configuration_Plan SHALL list all assets to be updated with the items to be added
4. THE Configuration_Plan SHALL list all existing assets to be reused with their current names
5. THE Configuration_Plan SHALL include the proposed MerchantConfig settings including print area, base image, safe area, and enabled tools
6. WHEN the plan is generated, THE System SHALL present it to the user for review
7. THE System SHALL NOT execute any actions until the user explicitly approves the plan

### Requirement 4: Asset Creation and Management

**User Story:** As a system, I want to create and manage assets following existing conventions, so that they integrate seamlessly with the current system.

#### Acceptance Criteria

1. WHEN creating shape assets, THE System SHALL generate complete SVG code with xmlns, viewBox, width, and height attributes
2. WHEN creating font assets, THE System SHALL use newline-separated format
3. WHEN creating color assets, THE System SHALL use comma-space-separated format with name|#hexcode pattern
4. WHEN creating gallery assets, THE System SHALL use newline-separated format with name|imageUrl pattern
5. WHEN creating option assets, THE System SHALL use comma-space-separated format with name|value pattern
6. WHEN creating or updating shape assets, THE System SHALL execute auto_fix_shapes.cjs after the operation
7. WHEN assets are created or updated, THE System SHALL clear the cache to ensure frontend sees changes
8. THE System SHALL use existing action types: CREATE_ASSET, ADD_ITEMS_TO_ASSET, UPDATE_ASSET

### Requirement 5: Product Configuration

**User Story:** As a merchant, I want the AI to configure my product settings to match the reference website, so that I can quickly replicate successful customization patterns.

#### Acceptance Criteria

1. WHEN the user approves the Configuration_Plan, THE Product_Configurator SHALL create or update the MerchantConfig record
2. THE Product_Configurator SHALL set the shopifyProductId from user input or context
3. THE Product_Configurator SHALL configure printArea dimensions based on the reference analysis
4. THE Product_Configurator SHALL set baseImage URL if identified from the reference
5. THE Product_Configurator SHALL configure safeArea settings including shape, padding, and offset
6. THE Product_Configurator SHALL link created or selected assets by setting colorAssetId, fontAssetId, galleryAssetId, optionAssetId, and shapeAssetId
7. THE Product_Configurator SHALL configure enabledTools based on identified customization features
8. THE Product_Configurator SHALL set appropriate designerLayout (redirect, inline, modal, or wizard)

### Requirement 6: Multi-Language Support

**User Story:** As a merchant, I want to interact with the AI in my preferred language, so that I can use the system comfortably.

#### Acceptance Criteria

1. THE System SHALL support user input in English, Indonesian, Arabic, Spanish, and French
2. WHEN a user provides input in a supported language, THE System SHALL respond in the same language
3. THE System SHALL correctly interpret intent phrases across all supported languages for "add to existing" vs "create new"
4. THE System SHALL generate asset names and descriptions in the user's language when appropriate

### Requirement 7: Action Execution and Validation

**User Story:** As a system, I want to execute approved actions reliably and provide clear feedback, so that users understand what changes were made.

#### Acceptance Criteria

1. WHEN executing CREATE_ASSET actions, THE Action_Executor SHALL validate all required fields are present
2. WHEN executing ADD_ITEMS_TO_ASSET actions, THE Action_Executor SHALL verify the target asset exists
3. IF an asset does not exist during ADD_ITEMS_TO_ASSET, THEN THE System SHALL return an error with a list of available assets
4. WHEN actions are executed successfully, THE System SHALL return confirmation with asset IDs and item counts
5. IF any action fails, THEN THE System SHALL return a descriptive error message and rollback partial changes
6. THE System SHALL log all actions to the AIAction table with sessionId, actionType, input, output, and status

### Requirement 8: Image Asset Handling

**User Story:** As a system, I want to handle image assets from reference websites properly, so that they can be used in product customization.

#### Acceptance Criteria

1. WHEN the AI_Analyzer identifies images from the reference website, THE System SHALL extract image URLs
2. WHEN images are external URLs, THE System SHALL validate they are accessible
3. WHERE the system has S3 storage configured, THE System SHALL optionally upload images to Linode Object Storage
4. WHEN creating gallery assets, THE System SHALL use the image URLs (original or S3) in the name|imageUrl format
5. IF image URLs are inaccessible, THEN THE System SHALL notify the user and exclude those images from the plan

### Requirement 9: Design Template Creation

**User Story:** As a merchant, I want the AI to optionally create a design template based on the reference, so that I have a starting point for customization.

#### Acceptance Criteria

1. WHERE the user requests a design template, THE System SHALL create a SavedDesign record
2. THE SavedDesign SHALL include designJson with canvas elements matching the reference layout
3. THE SavedDesign SHALL set isTemplate to true
4. THE SavedDesign SHALL link to the shopifyProductId
5. THE designJson SHALL include elements with appropriate types (text, image, shape) based on the reference analysis
6. THE designJson SHALL include positioning and styling information extracted from the reference

### Requirement 10: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and recovery options when something goes wrong, so that I can successfully complete my task.

#### Acceptance Criteria

1. IF the reference website URL is invalid or inaccessible, THEN THE System SHALL return an error message with suggestions
2. IF the AI_Analyzer cannot identify any customization patterns, THEN THE System SHALL notify the user and request clarification
3. IF asset creation fails, THEN THE System SHALL provide the specific error reason and suggest corrections
4. IF the user's shop has insufficient permissions, THEN THE System SHALL return a clear permission error
5. WHEN errors occur during multi-step operations, THE System SHALL indicate which step failed and what was completed successfully

### Requirement 11: Session Management and Context

**User Story:** As a system, I want to maintain session context throughout the analysis and configuration process, so that I can provide coherent multi-turn interactions.

#### Acceptance Criteria

1. WHEN a user starts a new product customization request, THE System SHALL create an AISession record
2. THE AISession SHALL store the reference URL, analysis results, and Configuration_Plan in the context field
3. WHEN the user approves actions, THE System SHALL link AIAction records to the AISession
4. THE System SHALL maintain conversation context across multiple user messages within the same session
5. WHEN the session is complete, THE System SHALL set the AISession status to "completed" and record endedAt timestamp

### Requirement 12: Validation and Quality Checks

**User Story:** As a system, I want to validate generated assets and configurations, so that they meet quality standards before being saved.

#### Acceptance Criteria

1. WHEN generating SVG shapes, THE System SHALL validate that each SVG includes xmlns, viewBox, width, and height attributes
2. WHEN generating color values, THE System SHALL validate that hex codes match the pattern #[0-9A-F]{6}
3. WHEN generating font names, THE System SHALL verify they are valid font family names
4. WHEN setting MerchantConfig dimensions, THE System SHALL validate that numeric values are positive
5. IF validation fails for any asset, THEN THE System SHALL report the specific validation error and request corrections
