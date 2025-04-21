# JurisAI Frontend-Backend Testing Guide

This guide explains how to use the testing tools we've created to verify the communication between the frontend and backend components of JurisAI, with a focus on the summarization functionality.

## Test Components

We've created two main testing tools:

1. **Browser Console Test Script** (`frontend-backend-test.js`)
2. **Interactive Test Page** (`/test/summarization`)

## Running the Tests

### Method 1: Using the Interactive Test Page

1. Start your Next.js development server:
   ```bash
   cd apps/frontend
   npm run dev
   ```

2. Navigate to `/test/summarization` in your browser
   - This page provides a visual interface to test summarization
   - It displays real-time test results for API connection, summarization, error handling, and React Query hook integration
   - You can test both standard and legal document summarization
   - The page includes proper loading states and error handling displays

### Method 2: Using the Console Test Script

1. Open any page in your JurisAI application
2. Open the browser's developer tools console (F12 or right-click → Inspect → Console)
3. Copy the contents of `tests/frontend-backend-test.js` and paste it into the console
4. Run the tests by typing:
   ```javascript
   runAllTests()
   ```
5. Or run individual tests:
   ```javascript
   testApiConnection()
   testTextSummarization() 
   testReactQueryHook()
   testUIIntegration()
   testErrorHandling()
   testFileUpload()
   ```

## What the Tests Verify

The tests check for:

1. **API Connection**: Verifies that the frontend can connect to the backend API
2. **Summarization Functionality**: Tests that text can be successfully summarized
3. **React Query Integration**: Confirms that the React Query hooks are properly configured
4. **UI Integration**: Validates that UI components for summarization exist and function correctly
5. **Error Handling**: Ensures that API errors are properly caught and displayed
6. **File Upload**: Tests the document upload functionality

## Troubleshooting

### API Connection Issues

If the API connection test fails:
- Verify the API URL is correct (`https://jurisai-monorepo-production.up.railway.app`)
- Check if the Railway server is running
- Ensure there are no CORS issues

### React Query Problems

If the React Query integration test fails:
- Make sure the `QueryProvider` is properly configured in the application layout
- Verify the API client is correctly set up

### UI Component Issues

If UI tests show missing components:
- Check that you're on the right page with summarization components
- Verify that Shadcn UI components are properly imported and configured

## Next Steps

After ensuring all tests pass, you should:

1. Test the complete user journey from document upload to summarization
2. Verify that summarization results are properly displayed in the UI
3. Check that error states are handled gracefully

---

The tests are designed to help you verify that UI improvements and backend integration are functioning correctly before the pre-launch phase.
