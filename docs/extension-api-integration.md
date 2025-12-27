# Browser Extension API Integration Guide

This document provides complete specifications for implementing authentication and flow creation API integration in the browser extension.

---

## Overview

The browser extension communicates with the Navio web app through REST APIs. The extension requires:

1. **Authentication**: Obtain a JWT token from the web app
2. **Flow Creation**: Create flows with steps and screenshots via API

---

## Base URL Configuration

The extension needs to know the base URL of the web app. This should be configurable:

```typescript
// config.ts or constants.ts
export const API_BASE_URL =
  process.env.API_BASE_URL || "https://your-app.vercel.app"
// For development: 'http://localhost:3000'
```

## Manifest Permissions

Your `manifest.json` needs to include permissions for making requests to the web app:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "tabs", "activeTab"],
  "host_permissions": [
    "https://your-app.vercel.app/*",
    "http://localhost:3000/*"
  ]
}
```

**Important**: The `host_permissions` allow the extension to make requests to your web app domain, and cookies will be automatically included for same-origin requests.

---

## 1. Authentication Flow

### 1.1 Automatic Authentication (Recommended)

Since the extension runs in the same browser as the web app, it can automatically detect if the user is logged in and fetch a token using the browser's cookies. This provides a seamless experience with no manual copy-paste required.

**How it works:**

1. Extension checks if user is logged in by calling the token endpoint
2. Browser automatically includes session cookies in the request
3. If logged in, token is fetched and stored automatically
4. If not logged in, user is prompted to log in to the web app

**Key Point**: When making requests from the extension to the web app, the browser automatically includes cookies for the same domain. This means if the user is logged into the web app, the extension can authenticate automatically.

### 1.2 Getting an Extension Token

**Endpoint**: `POST /api/extension/token`

**Description**: This endpoint generates a JWT token for the browser extension. The user must be logged into the web app first (via NextAuth session).

**Important**: When calling this endpoint from the extension, the browser will automatically include the session cookies if the user is logged into the web app in the same browser. This enables seamless authentication without user intervention.

### 1.3 Token Endpoint Details

**Request**:

```http
POST /api/extension/token
Cookie: next-auth.session-token=<session-token>  # Automatically included by browser
```

**Note**: The `Cookie` header is automatically included by the browser when making requests from the extension to the web app domain. You don't need to manually set it.

**Response (Success - 200)**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:30:00.000Z",
  "tenantId": "clx123abc",
  "tenantName": "Acme Corp"
}
```

**Response (Error - 401)**:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401
  }
}
```

**Response (Error - 400)**:

```json
{
  "error": {
    "code": "NO_ACTIVE_TENANT",
    "message": "No active tenant",
    "statusCode": 400
  }
}
```

### 1.4 Automatic Token Fetching

The extension should automatically fetch a token when needed. Here's how to implement it:

```typescript
// auth/token-fetcher.ts
import { API_BASE_URL } from "../config"
import { getTokenData, isTokenValid, saveToken } from "../storage"

export interface TokenResponse {
  token: string
  expiresAt: string
  tenantId: string
  tenantName: string
}

/**
 * Automatically fetch extension token from web app
 * Uses browser cookies for authentication (seamless if user is logged in)
 */
export async function fetchExtensionToken(): Promise<TokenResponse> {
  try {
    // Make request with credentials to include cookies
    const response = await fetch(`${API_BASE_URL}/api/extension/token`, {
      method: "POST",
      credentials: "include", // Important: includes cookies
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("NOT_LOGGED_IN")
      }
      const error = await response.json()
      throw new Error(error.error?.message || "Failed to fetch token")
    }

    const data: TokenResponse = await response.json()

    // Store token
    await saveToken(data)

    return data
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_LOGGED_IN") {
      throw new Error("Please log in to the web app first")
    }
    throw error
  }
}

/**
 * Get a valid token, fetching a new one if needed
 */
export async function ensureValidToken(): Promise<string> {
  // Check if we have a valid token
  const isValid = await isTokenValid()
  if (isValid) {
    const data = await getTokenData()
    return data!.token
  }

  // Try to fetch a new token (user must be logged in to web app)
  const tokenData = await fetchExtensionToken()
  return tokenData.token
}

/**
 * Check if user is logged in to web app
 */
export async function checkLoginStatus(): Promise<boolean> {
  try {
    await fetchExtensionToken()
    return true
  } catch (error) {
    return false
  }
}
```

**Important Notes:**

- Use `credentials: 'include'` in fetch options to ensure cookies are sent
- The browser automatically includes cookies for the same domain
- If user is not logged in, the request will return 401
- Extension should handle this gracefully and prompt user to log in

### 1.5 Token Storage

Store the token securely in the extension's storage:

```typescript
// storage.ts
import { browser } from "webextension-polyfill"

const TOKEN_KEY = "navio_extension_token"
const TOKEN_EXPIRY_KEY = "navio_token_expires_at"
const TENANT_ID_KEY = "navio_tenant_id"
const TENANT_NAME_KEY = "navio_tenant_name"

export interface StoredToken {
  token: string
  expiresAt: string
  tenantId: string
  tenantName: string
}

export async function saveToken(data: StoredToken): Promise<void> {
  await browser.storage.local.set({
    [TOKEN_KEY]: data.token,
    [TOKEN_EXPIRY_KEY]: data.expiresAt,
    [TENANT_ID_KEY]: data.tenantId,
    [TENANT_NAME_KEY]: data.tenantName,
  })
}

export async function getToken(): Promise<string | null> {
  const result = await browser.storage.local.get(TOKEN_KEY)
  return result[TOKEN_KEY] || null
}

export async function getTokenData(): Promise<StoredToken | null> {
  const result = await browser.storage.local.get([
    TOKEN_KEY,
    TOKEN_EXPIRY_KEY,
    TENANT_ID_KEY,
    TENANT_NAME_KEY,
  ])

  if (!result[TOKEN_KEY]) return null

  return {
    token: result[TOKEN_KEY],
    expiresAt: result[TOKEN_EXPIRY_KEY],
    tenantId: result[TENANT_ID_KEY],
    tenantName: result[TENANT_NAME_KEY],
  }
}

export async function clearToken(): Promise<void> {
  await browser.storage.local.remove([
    TOKEN_KEY,
    TOKEN_EXPIRY_KEY,
    TENANT_ID_KEY,
    TENANT_NAME_KEY,
  ])
}

export async function isTokenValid(): Promise<boolean> {
  const data = await getTokenData()
  if (!data) return false

  const expiresAt = new Date(data.expiresAt)
  const now = new Date()

  // Check if token expires in less than 5 minutes (refresh threshold)
  return expiresAt.getTime() > now.getTime() + 5 * 60 * 1000
}
```

### 1.6 Token Validation

The token is a JWT signed with HS256 algorithm. It contains:

- `userId`: User ID
- `tenantId`: Active tenant/organization ID
- `email`: User email
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (48 hours from issuance)

**Token Lifetime**: 48 hours

---

## 2. Flow Creation API

### 2.1 Create Flow Endpoint

**Endpoint**: `POST /api/extension/v1/flows`

**Description**: Creates a new flow with steps. Screenshots are uploaded automatically if provided in the request.

**Authentication**: Requires valid JWT token in `Authorization` header

**Request Headers**:

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:

```typescript
{
  name: string;              // 1-100 characters, required
  steps: FlowStep[];         // Array of at least 1 step, required
  meta?: {                   // Optional metadata
    description?: string;     // Max 500 characters
    tags?: string[];          // Max 10 tags
  };
}
```

**FlowStep Structure**:

```typescript
{
  type: "CLICK" | "NAVIGATION" | "INPUT" | "VISIBILITY" | "MANUAL";
  url: string;               // Valid URL, required
  explanation: string;       // 1-200 characters, required
  order: number;             // Non-negative integer, required (must be unique)
  meta?: {                   // Optional metadata
    elementText?: string;
    nodeType?: string;
    timestamp?: string;       // ISO 8601 datetime string
    clickCoordinates?: {
      x: number;
      y: number;
    };
    screenshotThumb?: string;  // Base64 data URL (data:image/png;base64,...)
    screenshotFull?: string;    // Base64 data URL (data:image/png;base64,...)
  };
}
```

**Response (Success - 201)**:

```json
{
  "id": "clx456def",
  "name": "User Onboarding Flow",
  "tenantId": "clx123abc",
  "createdBy": "clx789ghi",
  "meta": {
    "description": "Complete user onboarding process",
    "tags": ["onboarding", "demo"]
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "steps": [
    {
      "id": "clx111aaa",
      "flowId": "clx456def",
      "type": "CLICK",
      "url": "https://example.com/login",
      "explanation": "Click on the login button",
      "order": 0,
      "screenshotThumbUrl": "https://cdn.example.com/screenshots/.../thumb-123.png",
      "screenshotFullUrl": "https://cdn.example.com/screenshots/.../full-123.png",
      "meta": {
        "clickCoordinates": { "x": 150, "y": 200 },
        "elementText": "Login"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Response (Error - 401)**:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401
  }
}
```

**Response (Error - 400 - Validation)**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "details": [
      {
        "path": ["name"],
        "message": "String must contain at least 1 character(s)"
      },
      {
        "path": ["steps", 0, "url"],
        "message": "Invalid url"
      }
    ]
  }
}
```

**Response (Error - 400 - Duplicate Order)**:

```json
{
  "error": {
    "code": "DUPLICATE_STEP_ORDER",
    "message": "Step orders must be unique. Multiple steps cannot have the same order value.",
    "statusCode": 400
  }
}
```

### 2.2 TypeScript Types

```typescript
// types/api.ts

export type FlowStepType =
  | "CLICK"
  | "NAVIGATION"
  | "INPUT"
  | "VISIBILITY"
  | "MANUAL"

export interface FlowStepMeta {
  elementText?: string
  nodeType?: string
  timestamp?: string // ISO 8601 datetime
  clickCoordinates?: {
    x: number
    y: number
  }
  screenshotThumb?: string // Base64 data URL
  screenshotFull?: string // Base64 data URL
}

export interface FlowStep {
  type: FlowStepType
  url: string
  explanation: string
  order: number
  meta?: FlowStepMeta
}

export interface FlowMeta {
  description?: string // Max 500 chars
  tags?: string[] // Max 10 tags
}

export interface CreateFlowRequest {
  name: string // 1-100 chars
  steps: FlowStep[] // Min 1 step
  meta?: FlowMeta
}

export interface CreateFlowResponse {
  id: string
  name: string
  tenantId: string
  createdBy: string
  meta?: FlowMeta
  createdAt: string
  updatedAt: string
  steps: Array<{
    id: string
    flowId: string
    type: FlowStepType
    url: string
    explanation: string
    order: number
    screenshotThumbUrl: string | null
    screenshotFullUrl: string | null
    meta?: FlowStepMeta
    createdAt: string
    updatedAt: string
  }>
}

export interface ApiError {
  error: {
    code: string
    message: string
    statusCode: number
    details?: Array<{
      path: (string | number)[]
      message: string
    }>
  }
}
```

### 2.3 API Client Implementation

```typescript
// api/client.ts
import { API_BASE_URL } from './config';
import { ensureValidToken } from '../auth/token-fetcher';
import type { CreateFlowRequest, CreateFlowResponse, ApiError } from './types';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    // Automatically fetch token if needed (seamless if user is logged in)
    const token = await ensureValidToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const error: ApiError = await response.json();
        throw new ApiError(
          error.error.message,
          error.error.code,
          error.error.statusCode,
          error.error.details
        );
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (isJson) {
      return await response.json();
    }

    return {} as T;
  }

  async createFlow(data: CreateFlowRequest): Promise<CreateFlowResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/extension/v1/flows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return this.handleResponse<CreateFlowResponse>(response);
  }
}

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Array<{ path: (string | number)[]; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
```

### 2.4 Screenshot Handling

Screenshots should be captured as base64 data URLs and included in the request:

```typescript
// utils/screenshot.ts

/**
 * Capture screenshot of current page/tab
 * Returns base64 data URL
 */
export async function captureScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(dataUrl)
    })
  })
}

/**
 * Resize screenshot to thumbnail size
 * Returns base64 data URL
 */
export async function createThumbnail(
  fullScreenshot: string,
  maxWidth: number = 400,
  maxHeight: number = 300
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let width = img.width
      let height = img.height

      // Calculate thumbnail dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL("image/png", 0.8))
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = fullScreenshot
  })
}
```

### 2.5 Complete Flow Creation Example

```typescript
// Example: Creating a flow from recorded steps
import { apiClient } from "./api/client"
import type { CreateFlowRequest, FlowStep } from "./types"
import { captureScreenshot, createThumbnail } from "./utils/screenshot"

interface RecordedStep {
  type: "CLICK" | "NAVIGATION" | "INPUT" | "VISIBILITY" | "MANUAL"
  url: string
  explanation: string
  clickCoordinates?: { x: number; y: number }
  elementText?: string
  timestamp: Date
}

export async function createFlowFromRecording(
  flowName: string,
  recordedSteps: RecordedStep[]
): Promise<void> {
  try {
    // Prepare steps with screenshots
    const steps: FlowStep[] = await Promise.all(
      recordedSteps.map(async (recorded, index) => {
        // Capture screenshot for this step
        const fullScreenshot = await captureScreenshot()
        const thumbScreenshot = await createThumbnail(fullScreenshot)

        return {
          type: recorded.type,
          url: recorded.url,
          explanation: recorded.explanation,
          order: index,
          meta: {
            clickCoordinates: recorded.clickCoordinates,
            elementText: recorded.elementText,
            timestamp: recorded.timestamp.toISOString(),
            screenshotThumb: thumbScreenshot,
            screenshotFull: fullScreenshot,
          },
        }
      })
    )

    // Create flow request
    const request: CreateFlowRequest = {
      name: flowName,
      steps,
      meta: {
        description: `Flow recorded on ${new Date().toLocaleDateString()}`,
        tags: ["recorded"],
      },
    }

    // Send to API
    const response = await apiClient.createFlow(request)

    console.log("Flow created successfully:", response.id)
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("API Error:", error.code, error.message)
      if (error.details) {
        console.error("Validation errors:", error.details)
      }
    } else {
      console.error("Unexpected error:", error)
    }
    throw error
  }
}
```

---

## 3. Error Handling

### 3.1 Common Error Codes

| Code                   | Status | Description                        | Action                           |
| ---------------------- | ------ | ---------------------------------- | -------------------------------- |
| `UNAUTHORIZED`         | 401    | Token missing, invalid, or expired | Refresh token or re-authenticate |
| `FORBIDDEN`            | 403    | User doesn't have access           | Show access denied message       |
| `NOT_FOUND`            | 404    | Resource not found                 | Show not found message           |
| `VALIDATION_ERROR`     | 400    | Request validation failed          | Show validation errors to user   |
| `DUPLICATE_STEP_ORDER` | 400    | Step orders are not unique         | Fix step order values            |
| `SCREENSHOT_TOO_LARGE` | 413    | Screenshot exceeds 10MB            | Compress or resize screenshot    |
| `TENANT_ACCESS_DENIED` | 403    | User lost access to tenant         | Re-authenticate                  |

### 3.2 Error Handling Utility

```typescript
// utils/error-handler.ts
import { ApiError } from "./api/client"

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return "Your session has expired. Please reconnect your account."
      case "VALIDATION_ERROR":
        if (error.details) {
          const messages = error.details.map((d) => d.message).join(", ")
          return `Validation failed: ${messages}`
        }
        return "Invalid data provided. Please check your input."
      case "SCREENSHOT_TOO_LARGE":
        return "Screenshot is too large. Please try again with a smaller image."
      default:
        return error.message || "An error occurred"
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred"
}
```

---

## 4. Handling Not Logged In State

When the user is not logged into the web app, the extension should gracefully handle this and guide them to log in:

```typescript
// auth/auth-manager.ts
import { API_BASE_URL } from "../config"
import { checkLoginStatus, fetchExtensionToken } from "./token-fetcher"

/**
 * Check authentication status and handle UI accordingly
 */
export async function checkAuthAndPrompt(): Promise<boolean> {
  const isLoggedIn = await checkLoginStatus()

  if (!isLoggedIn) {
    // Show UI prompt to log in
    const shouldLogin = await showLoginPrompt()

    if (shouldLogin) {
      // Open web app login page
      chrome.tabs.create({
        url: `${API_BASE_URL}/login?redirect=/dashboard`,
      })

      // Wait for user to log in and come back
      // You can use chrome.tabs.onUpdated to detect when user navigates back
      return false
    }

    return false
  }

  return true
}

/**
 * Show login prompt in extension popup
 * Returns true if user wants to log in
 */
async function showLoginPrompt(): Promise<boolean> {
  // This would be implemented in your popup UI
  // For now, return true to open login page
  return true
}

/**
 * Initialize authentication on extension startup
 */
export async function initializeAuth(): Promise<void> {
  try {
    // Try to fetch token (will work if user is logged in)
    await fetchExtensionToken()
    console.log("Authentication successful")
  } catch (error) {
    console.log("User not logged in, will prompt when needed")
  }
}
```

**UI Flow for Not Logged In:**

1. Extension popup shows "Not Connected" state
2. Button: "Connect to Navio" or "Log In"
3. Clicking opens web app login page in new tab
4. After login, user can refresh extension or extension auto-detects
5. Extension automatically fetches token on next API call

---

## 5. Complete Integration Example

```typescript
// background/flow-recorder.ts
import { apiClient } from "../api/client"
import { checkAuthAndPrompt } from "../auth/auth-manager"
import { handleApiError } from "../utils/error-handler"
import { captureScreenshot, createThumbnail } from "../utils/screenshot"

interface RecordingState {
  isRecording: boolean
  steps: Array<{
    type: string
    url: string
    explanation: string
    order: number
    meta?: any
  }>
}

let recordingState: RecordingState = {
  isRecording: false,
  steps: [],
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_RECORDING") {
    recordingState = {
      isRecording: true,
      steps: [],
    }
    sendResponse({ success: true })
  } else if (message.type === "STOP_RECORDING") {
    recordingState.isRecording = false
    sendResponse({ success: true })
  } else if (message.type === "RECORD_STEP") {
    if (recordingState.isRecording) {
      recordingState.steps.push({
        type: message.stepType,
        url: message.url,
        explanation: message.explanation,
        order: recordingState.steps.length,
        meta: message.meta,
      })
      sendResponse({ success: true })
    }
  } else if (message.type === "SAVE_FLOW") {
    saveFlow(message.flowName).then(sendResponse)
    return true // Async response
  }
})

async function saveFlow(
  flowName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is logged in (will auto-fetch token if logged in)
    const isAuthenticated = await checkAuthAndPrompt()
    if (!isAuthenticated) {
      return {
        success: false,
        error: "Please log in to the web app to save flows",
      }
    }

    // Capture screenshots for each step
    const stepsWithScreenshots = await Promise.all(
      recordingState.steps.map(async (step, index) => {
        // In a real implementation, you'd capture screenshots when the step occurs
        // For now, we'll use placeholder logic
        const fullScreenshot = await captureScreenshot()
        const thumbScreenshot = await createThumbnail(fullScreenshot)

        return {
          type: step.type,
          url: step.url,
          explanation: step.explanation,
          order: index,
          meta: {
            ...step.meta,
            screenshotThumb: thumbScreenshot,
            screenshotFull: fullScreenshot,
          },
        }
      })
    )

    // Create flow via API
    const response = await apiClient.createFlow({
      name: flowName,
      steps: stepsWithScreenshots,
    })

    // Clear recording state
    recordingState = {
      isRecording: false,
      steps: [],
    }

    return { success: true }
  } catch (error) {
    const errorMessage = handleApiError(error)
    return { success: false, error: errorMessage }
  }
}
```

---

## 6. Testing the Integration

### 6.1 Test Token Endpoint

```typescript
// Test: Get token (must be done from web app, not extension)
// Open: https://your-app.vercel.app/api/extension/token
// While logged in, this will return a token
```

### 6.2 Test Flow Creation

```typescript
// test/create-flow.ts
import { apiClient } from "./api/client"

async function testCreateFlow() {
  try {
    const response = await apiClient.createFlow({
      name: "Test Flow",
      steps: [
        {
          type: "CLICK",
          url: "https://example.com",
          explanation: "Click the button",
          order: 0,
          meta: {
            clickCoordinates: { x: 100, y: 200 },
          },
        },
      ],
    })
    console.log("Success:", response)
  } catch (error) {
    console.error("Error:", error)
  }
}
```

---

## 7. Security Considerations

1. **Token Storage**: Store tokens in `chrome.storage.local` (encrypted at rest by browser)
2. **Token Transmission**: Always use HTTPS
3. **Token Expiry**: Check expiry before each API call
4. **Error Messages**: Don't expose sensitive information in error messages
5. **Screenshot Size**: Validate screenshot size before upload (max 10MB)
6. **Content Security**: Validate all user inputs before sending to API

---

## 8. Environment Variables

The extension should support different environments:

```typescript
// config.ts
export const config = {
  apiBaseUrl: process.env.API_BASE_URL || "https://your-app.vercel.app",
  environment: process.env.NODE_ENV || "production",
}
```

For development, set in `manifest.json` or build process:

- Development: `http://localhost:3000`
- Production: `https://your-app.vercel.app`

---

## Summary

### Authentication Flow (Seamless)

1. **Automatic Detection**: Extension automatically detects if user is logged into web app
2. **Cookie-Based Auth**: Browser automatically includes session cookies when making requests
3. **Token Fetching**: Extension calls `/api/extension/token` with `credentials: 'include'` to get JWT token
4. **No Manual Steps**: If user is logged in, authentication happens automatically - no copy-paste needed
5. **Not Logged In**: If user isn't logged in, extension shows prompt to open web app login page

### API Usage

1. **Token Usage**: Include `Authorization: Bearer <token>` header in all API requests
2. **Auto-Refresh**: Token is automatically refreshed if expired (as long as user is still logged in)
3. **Flow Creation**: POST to `/api/extension/v1/flows` with flow data and screenshots
4. **Error Handling**: Handle all error codes appropriately, especially 401 (not logged in)

### Key Benefits

- ✅ **Seamless UX**: If user is logged into web app, extension works automatically
- ✅ **No Copy-Paste**: Token is fetched automatically using browser cookies
- ✅ **Secure**: Tokens stored securely, automatically refreshed
- ✅ **User-Friendly**: Clear prompts when user needs to log in

This integration allows the extension to create flows with screenshots in the Navio web app with a seamless, automatic authentication experience.
