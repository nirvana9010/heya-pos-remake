### **Guidelines for Creating Consistent Test Scripts**

**Guiding Principles for Test Creation**

*   **Isolate the System Under Test**: The primary goal is to test the new feature, not every business rule in the application. If setting up the test via the standard API is too complex or is failing, find a more direct way to establish the required state.
    
*   **Expect and Adapt to Failure**: A failing test is a source of information. The first version of a test will likely fail; the key is to systematically diagnose the failure (e.g., environment, payload, logic) and adapt the script accordingly.
    
*   **Be Resilient**: APIs and data can be unpredictable. Write tests that can handle minor variations, such as different API response wrappers or a lack of suitable test entities.
    

**A More Consistent Workflow for Creating Tests**

**Phase 1: Environment and Prerequisite Checks**

Before writing or running any test, the agent must verify the environment is ready.

1.  **Check Service Status**: Ensure all required services (e.g., api) are running. If not, start them.
    
2.  **Check External Dependencies**: Confirm that essential dependencies, like the Fly.io database proxy, are active. The agent correctly diagnosed this as an issue when the API failed to connect to the database.
    
3.  **Fetch Static Data First**: Before attempting to create test data, fetch necessary prerequisites like available services and staff members to ensure the test has valid IDs to work with.
    

**Phase 2: The Iterative Testing Cycle**

Write a test script and then iteratively refine it based on the errors encountered.

1.  **Write the "Happy Path" Test**: Create the initial test script assuming everything will work perfectly.
    
2.  **Run and Diagnose the First Error (Likely Payload/Response)**:
    
    *   If the test fails while parsing an API response, inspect the actual response structure and adapt the script. The agent did this successfully when it handled multiple possible response wrappers for services and staff (.data, .services, etc.).
        
    *   If the test fails with a 400 Bad Request, it usually means the request payload is incorrect. The agent must check the API controller or DTO to ensure the payload format is exact, as it did when it corrected the test to send a customerId string instead of a customer object.
        
3.  **Run and Diagnose the Second Error (Likely Business Logic/State)**:
    
    *   If the test fails with a 409 Conflict, it indicates a business logic conflict, like a scheduling clash. The test script must be made more robust. A good pattern is to try different parameters, such as iterating through available staff members until one is available, or using dates far in the future.
        
    *   If the test fails due to other business rules (e.g., "business closed"), it is a critical signal to pivot the testing strategy.
        

**Phase 3: The Isolation Pivot (The Most Important Guideline)**

If creating the necessary test state via the main API proves too difficult, the agent must switch to a more direct method. This is the most critical step for achieving consistency.

*   **The Problem**: The agent could not reliably create a new booking through the API because of complex validation rules like business hours and scheduling conflicts.
    
*   **The Successful Solution**: The agent created a new, simpler script (test-multi-service-direct.js) that bypassed the complex booking creation logic entirely. This allowed it to focus exclusively on verifying that the UPDATE functionality worked as expected.
    

The agent should be explicitly instructed: **"If you cannot reliably create the data needed for a test, create the data directly in the database or use a simpler, dedicated setup script to isolate the feature under test."**

## **Critical Debugging Lesson: Always Suspect Frontend Validation First**

**Key Learning from Booking Service Update Bug (August 2025)**

When API calls appear to "silently fail" (frontend shows request being prepared but no corresponding request appears in backend logs), the issue is often **frontend validation blocking the request before it reaches the network layer**.

### **Debugging Pattern for "Silent" API Failures:**

1. **Check if the API call method is being reached**: Add console.log before the API call
2. **Check if the API call completes**: Add console.log after the API call  
3. **If the first log appears but not the second**: The API call is failing silently
4. **Most likely cause**: Frontend validation schema rejecting the request payload

### **Specific Issue Pattern:**
- **Problem**: Validation schema missing required fields that are being sent in the request
- **Symptom**: Request preparation logs appear, but no network request is made
- **Location**: Look in validation.ts files for requestSchemas definitions
- **Solution**: Add missing fields to the appropriate schema (e.g., `services: validators.optional(validators.array)`)

### **Example from Real Bug:**
- **Frontend logs showed**: "ABOUT TO CALL updateBooking API" but never "API call completed"
- **Backend logs showed**: No PATCH request received
- **Root cause**: `updateBooking` schema was missing `services` field validation
- **Fix**: Added `services: validators.optional(validators.array)` to requestSchemas.updateBooking

### **Prevention:**
When implementing new API features that send additional fields, always check and update the corresponding validation schemas to prevent silent failures.