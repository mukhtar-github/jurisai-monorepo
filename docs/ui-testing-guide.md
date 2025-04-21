# JurisAI Frontend-Backend Testing Guide

This guide provides instructions for testing the communication between the JurisAI frontend and backend components, with a focus on verifying the OpenAI integration, document upload flows, and UI state handling.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Testing with the Browser Console](#testing-with-the-browser-console)
3. [Using the Visual Test Page](#using-the-visual-test-page)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Reviewing Test Results](#reviewing-test-results)

## Quick Start

The testing tools provide two main methods to verify frontend-backend communication:

1. **Browser Console Tests**: A JavaScript script for testing API communication directly in the browser console
2. **Visual Test Page**: A dedicated page within the app that provides a UI for testing summarization features

## Testing with the Browser Console

The browser console script is designed to run on any page of the JurisAI application and provides detailed diagnostics about the API communication.

### How to Use

1. Start the frontend development server:
   ```bash
   cd apps/frontend
   npm run dev
   ```

2. Navigate to any page of the JurisAI application in your browser

3. Open the browser's developer tools (F12 or right-click → Inspect)

4. Copy the entire contents of the test script:
   ```bash
   cat tests/frontend-backend-test.js
   ```

5. Paste the code into the browser console and press Enter

6. Run the tests by typing:
   ```javascript
   runAllTests()
   ```

### Available Test Functions

The script exports the following functions which can be called individually:

- `testApiConnection()` - Tests basic connectivity to the backend API
- `testTextSummarization()` - Tests the text summarization API
- `testReactQueryHook()` - Verifies React Query hook integration
- `testUIIntegration()` - Checks UI components for summarization
- `testErrorHandling()` - Tests error handling in the API
- `testFileUpload()` - Checks file upload components

Example:
```javascript
// Test just the API connection
testApiConnection()

// Test text summarization functionality
testTextSummarization()
```

## Using the Visual Test Page

The dedicated test page provides a UI-based approach to testing with visual feedback.

### How to Access

1. Start the frontend development server:
   ```bash
   cd apps/frontend
   npm run dev
   ```

2. Navigate to [http://localhost:3000/test/summarization](http://localhost:3000/test/summarization)

### Test Page Features

The test page includes:

- **Test Status Cards** - Visual indicators showing the status of different test aspects
- **Input Panel** - Area to enter legal text and summarization parameters
- **Results Panel** - Displays the results of summarization requests
- **Error Testing** - Button to test error handling

### Testing Workflow

1. **API Connection Test** - Runs automatically when the page loads
2. **Text Summarization Test** - Enter text (or use the default) and click "Generate Summary"
3. **Error Handling Test** - Click "Test Error Handling" to verify proper error reporting
4. **Legal Summarization Test** - Switch to the "Legal" tab and test specialized legal summarization

## Common Issues and Solutions

### API Connection Issues

If the API connection test fails:

1. Verify the backend server is running at the expected URL
2. Check for CORS issues (you may see these in the browser console)
3. Ensure the Railway deployment URL is correct in the test configuration

### Summarization Issues

If summarization tests fail:

1. Check the OpenAI API key configuration in the backend
2. Verify the text input contains sufficient content to summarize
3. Check the backend logs for any rate limiting or token usage issues

### React Query Integration Issues

If React Query tests fail:

1. Make sure the QueryClientProvider is properly configured in the app
2. Verify the React Query hooks are imported correctly
3. Check for TypeScript typing issues with the API responses

## Reviewing Test Results

### Browser Console Tests

The browser console tests produce detailed logs that highlight:

- API response times
- Response data structure
- Missing fields or unexpected values
- Error messages and handling

Look for green ✅ indicators for successful tests and red ❌ for failures.

### Visual Test Page

The visual test page provides:

- Color-coded status cards (green for pass, red for fail)
- Full display of the summarization response
- API metadata (processing time, character counts)
- Error messages and validation

## Next Steps After Testing

1. Document any issues found during testing
2. Verify that loading, success, and error states are handled correctly in the UI
3. Test on different devices to ensure responsive behavior
4. Verify that document upload and processing works end-to-end

---

For any questions or issues with the testing tools, please refer to the JurisAI development team or create an issue in the project repository.
