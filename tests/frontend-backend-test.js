/**
 * JurisAI Frontend-Backend Communication Test
 * 
 * This script tests the communication between the frontend and backend
 * focusing on summarization functionality, including loading states,
 * success responses, and error handling.
 * 
 * To use:
 * 1. Open your dev tools console on the summarization page
 * 2. Copy and paste this entire script
 * 3. Run the tests by calling runAllTests()
 */

// Configuration
const BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'https://jurisai-monorepo-production.up.railway.app';

const SAMPLE_TEXT = `IN THE SUPREME COURT OF NIGERIA
HOLDEN AT ABUJA
APPEAL NO: SC/433/2018
BETWEEN:
AIRTEL NETWORKS LIMITED........................APPELLANT
AND
ANNE MMADUABUCHI & ORS.........................RESPONDENTS

JUDGMENT
This is an appeal against the judgment of the Court of Appeal. The Supreme Court, in a unanimous decision, held that the registration and deactivation of SIM cards fall within the regulatory powers of the NCC as established by the Nigerian Communications Act 2003, [2009] LPELR 4526.`;

// Helper for styling console output
const styles = {
  title: 'font-size: 14px; font-weight: bold; color: #3b82f6;',
  success: 'color: #22c55e;',
  error: 'color: #ef4444;',
  warning: 'color: #f59e0b;',
  info: 'color: #3b82f6;',
};

// Test 1: Verify API Connection
async function testApiConnection() {
  console.group('%cTest 1: API Connection', styles.title);
  try {
    const response = await fetch(`${BASE_URL}/health/`);
    if (response.ok) {
      console.log('%c✅ Successfully connected to the API', styles.success);
    } else {
      console.log('%c❌ API connection failed: ' + response.status, styles.error);
    }
  } catch (error) {
    console.log('%c❌ API connection error: ' + error.message, styles.error);
  }
  console.groupEnd();
}

// Test 2: Test Text Summarization API
async function testTextSummarization() {
  console.group('%cTest 2: Text Summarization API', styles.title);
  
  console.log('%c📤 Sending request to summarize text...', styles.info);
  
  try {
    const startTime = performance.now();
    
    const response = await fetch(`${BASE_URL}/summarization/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: SAMPLE_TEXT,
        max_length: 300,
        use_ai: true,
      }),
    });
    
    const endTime = performance.now();
    
    if (response.ok) {
      const data = await response.json();
      console.log('%c✅ Summarization successful in ' + Math.round(endTime - startTime) + 'ms', styles.success);
      console.log('%cSummary:', styles.info, data.summary);
      
      // Check for expected fields
      const requiredFields = ['summary', 'key_points', 'citations', 'summary_type', 'ai_used'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length === 0) {
        console.log('%c✅ Response contains all required fields', styles.success);
      } else {
        console.log('%c⚠️ Missing fields in response: ' + missingFields.join(', '), styles.warning);
      }
      
      // Check if AI was used
      if (data.ai_used) {
        console.log('%c✅ AI was used for summarization', styles.success);
      } else {
        console.log('%c⚠️ AI was not used for summarization', styles.warning);
      }
    } else {
      const errorData = await response.json();
      console.log('%c❌ Summarization failed: ' + response.status, styles.error);
      console.log(errorData);
    }
  } catch (error) {
    console.log('%c❌ API request error: ' + error.message, styles.error);
  }
  
  console.groupEnd();
}

// Test 3: Test React Query Hook Integration
async function testReactQueryHook() {
  console.group('%cTest 3: React Query Hook Integration', styles.title);
  
  // This test checks if React Query hooks are accessible and functioning
  try {
    // Check if React Query is available
    if (typeof window.__REACT_QUERY_GLOBAL_SCOPE__ !== 'undefined') {
      console.log('%c✅ React Query is available in the global scope', styles.success);
      
      // Check queries related to summarization
      const queriesFound = Object.keys(window.__REACT_QUERY_GLOBAL_SCOPE__.queries || {})
        .filter(key => key.includes('summary') || key.includes('summariz'));
      
      if (queriesFound.length > 0) {
        console.log('%c✅ Found summarization-related queries:', styles.success);
        queriesFound.forEach(key => {
          console.log(`   - ${key}`);
        });
      } else {
        console.log('%c⚠️ No summarization queries found in React Query cache', styles.warning);
        console.log('%c💡 This might be normal if no summarization has been requested yet', styles.info);
      }
    } else {
      console.log('%c⚠️ React Query global scope not found', styles.warning);
      console.log('%c💡 This test should be run after rendering a component that uses React Query', styles.info);
    }
    
    // Check if our custom hooks are available (this is a heuristic check)
    const hookNames = [
      'useDocumentSummary',
      'useTextSummarization',
      'useLegalDocumentSummarization',
      'useSummarizeDocument'
    ];
    
    // Check in window for exposed hooks (dev mode might expose them)
    const foundHooks = hookNames.filter(name => typeof window[name] === 'function');
    
    if (foundHooks.length > 0) {
      console.log('%c✅ Found the following hooks in global scope:', styles.success);
      foundHooks.forEach(name => {
        console.log(`   - ${name}`);
      });
    } else {
      console.log('%c⚠️ No summarization hooks found in global scope', styles.warning);
      console.log('%c💡 This is expected in production builds where hooks aren\'t exposed globally', styles.info);
    }
    
  } catch (error) {
    console.log('%c❌ Error testing React Query integration: ' + error.message, styles.error);
  }
  
  console.groupEnd();
}

// Test 4: Test UI Integration and Loading States
function testUIIntegration() {
  console.group('%cTest 4: UI Integration and Loading States', styles.title);
  
  // Check for summarization form
  const textareaEl = document.querySelector('textarea[id*="legal-text"]');
  const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('Generate') || btn.textContent?.includes('Summarize'));
  
  if (textareaEl) {
    console.log('%c✅ Found legal text input in the UI', styles.success);
  } else {
    console.log('%c❌ Could not find legal text input in the UI', styles.error);
  }
  
  if (submitBtn) {
    console.log('%c✅ Found submit button in the UI', styles.success);
    
    // Test loading state simulation
    console.log('%c📋 To test loading state, you can run the following manually:', styles.info);
    console.log(`   document.querySelector('button[type="submit"]').disabled = true;`);
    console.log(`   document.querySelector('button[type="submit"]').innerHTML = '<svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"></svg>Generating...';`);
  } else {
    console.log('%c❌ Could not find submit button in the UI', styles.error);
  }
  
  // Check for loading spinner components
  const spinnerEls = document.querySelectorAll('.animate-spin, [class*="spinner"]');
  if (spinnerEls.length > 0) {
    console.log(`%c✅ Found ${spinnerEls.length} spinner elements in the UI`, styles.success);
  } else {
    console.log('%c⚠️ No spinner elements found in the UI', styles.warning);
  }
  
  console.groupEnd();
}

// Test 5: Test Error Handling
async function testErrorHandling() {
  console.group('%cTest 5: Error Handling', styles.title);
  
  console.log('%c📤 Sending request with invalid data to trigger error...', styles.info);
  
  try {
    // Send request with invalid data (empty text)
    const response = await fetch(`${BASE_URL}/summarization/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: '', // Empty text should trigger validation error
        max_length: 300,
        use_ai: true,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('%c✅ API returned expected error for invalid input', styles.success);
      console.log('%cError details:', styles.info, errorData);
      
      // Check if UI has error handling components
      const errorContainers = document.querySelectorAll('[class*="error"], [class*="alert"]');
      if (errorContainers.length > 0) {
        console.log(`%c✅ Found ${errorContainers.length} error containers in the UI`, styles.success);
      } else {
        console.log('%c⚠️ No error containers found in the UI', styles.warning);
        console.log('%c💡 Ensure the UI has components to display errors to users', styles.info);
      }
    } else {
      console.log('%c⚠️ API accepted empty text when it should have returned an error', styles.warning);
    }
  } catch (error) {
    console.log('%c✅ Error was thrown as expected: ' + error.message, styles.success);
  }
  
  console.groupEnd();
}

// Test 6: Check File Upload Component
function testFileUpload() {
  console.group('%cTest 6: File Upload Component', styles.title);
  
  // Look for file upload components
  const fileInputs = document.querySelectorAll('input[type="file"]');
  const dropzones = document.querySelectorAll('[class*="dropzone"], [class*="upload"]');
  
  if (fileInputs.length > 0) {
    console.log(`%c✅ Found ${fileInputs.length} file input elements`, styles.success);
    
    // Check accept attribute for proper file types
    const fileTypes = Array.from(fileInputs).map(input => input.accept).filter(Boolean);
    if (fileTypes.length > 0) {
      console.log('%c✅ File inputs specify accepted file types:', styles.success);
      fileTypes.forEach(types => console.log(`   - ${types}`));
    } else {
      console.log('%c⚠️ File inputs do not specify accepted file types', styles.warning);
    }
  } else {
    console.log('%c⚠️ No file input elements found', styles.warning);
    console.log('%c💡 This might be normal if you\'re on the text summarization page', styles.info);
  }
  
  if (dropzones.length > 0) {
    console.log(`%c✅ Found ${dropzones.length} drop zone elements for file upload`, styles.success);
  } else {
    console.log('%c⚠️ No drop zone elements found for file upload', styles.warning);
    console.log('%c💡 This might be normal if you\'re on the text summarization page', styles.info);
  }
  
  console.groupEnd();
}

// Run all tests sequentially
async function runAllTests() {
  console.clear();
  console.log('%c🧪 Starting JurisAI Frontend-Backend Communication Tests 🧪', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('%c📌 Running tests on: ' + window.location.href, 'font-style: italic;');
  
  await testApiConnection();
  await testTextSummarization();
  await testReactQueryHook();
  testUIIntegration();
  await testErrorHandling();
  testFileUpload();
  
  console.log('%c🎉 All tests completed!', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('%c📋 Review the results above to ensure proper frontend-backend communication.', 'font-style: italic;');
}

// Export the test functions to global scope so they can be called from the console
window.runAllTests = runAllTests;
window.testApiConnection = testApiConnection;
window.testTextSummarization = testTextSummarization;
window.testReactQueryHook = testReactQueryHook;
window.testUIIntegration = testUIIntegration;
window.testErrorHandling = testErrorHandling;
window.testFileUpload = testFileUpload;

console.log('%c🧪 JurisAI Frontend-Backend Tests loaded!', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
console.log('%c📋 Run tests by calling window.runAllTests() or individual tests like window.testApiConnection()', 'font-style: italic;');
