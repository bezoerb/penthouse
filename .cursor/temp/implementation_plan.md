# Implementation Plan: Fix Test Timeout for "error should not contain debug info"

## Problem Analysis

The test `"error should not contain debug info"` in `/Users/benjamin.zoerb/Github/penthouse/test/run-sequential/node-module.test.js` is timing out after 30 seconds.

### Root Cause
1. The test tries to access a non-existent URL: `http://localhost.does.not.exist`
2. Penthouse has a default timeout of 30,000ms (30 seconds) - see `DEFAULT_TIMEOUT` in `src/index.js:32`
3. The test itself has a timeout of 30,000ms (from `vitest.config.js:5`)
4. When Puppeteer attempts to navigate to the non-existent domain, it waits for the full penthouse timeout period before failing
5. By the time penthouse returns an error, the test has already exceeded its 30-second timeout

### Evidence
- In `src/index.js`, line 32: `const DEFAULT_TIMEOUT = 30000;`
- In `vitest.config.js`, line 5: `testTimeout: 30000,`
- The test doesn't pass a `timeout` option to penthouse, so it uses the default
- Similar pattern exists in `test/basic.test.js:159-175` where a short timeout (100ms) is used to test timeout behavior

## Solution

Add a `timeout` option to the penthouse call in the failing test to make it fail faster than the test timeout.

### Implementation Steps

1. **Modify the test in `/Users/benjamin.zoerb/Github/penthouse/test/run-sequential/node-module.test.js`**
   - Location: Lines 45-58
   - Change: Add `timeout: 5000` option to the penthouse call
   - This gives penthouse 5 seconds to fail (which is more than enough for DNS/connection errors)
   - The test will complete within 5-6 seconds instead of timing out at 30 seconds

### Code Changes

**File: `/Users/benjamin.zoerb/Github/penthouse/test/run-sequential/node-module.test.js`**

Replace lines 47-49:
```javascript
return penthouse({
  url: "http://localhost.does.not.exist",
  css: page1cssPath,
```

With:
```javascript
return penthouse({
  url: "http://localhost.does.not.exist",
  css: page1cssPath,
  timeout: 5000, // 5 second timeout to avoid test timeout
```

## Expected Outcome

- The test will complete in approximately 5-6 seconds instead of timing out at 30 seconds
- Penthouse will fail with an error when trying to navigate to the non-existent URL
- The test will catch the error and verify it doesn't contain debug info (as intended)
- All other tests in the suite will remain unaffected

## Alternative Solutions Considered

1. **Increase test timeout globally** - Not ideal because it would slow down all tests
2. **Increase test timeout for this specific test** - Would make the test take 30+ seconds unnecessarily
3. **Reduce penthouse timeout** ✅ **CHOSEN** - This is the most appropriate solution as it:
   - Makes the test complete faster
   - Still allows adequate time for the operation to fail naturally
   - Follows the pattern used in other tests (see `test/basic.test.js:159-175`)

## Confidence Score

**98%**

### Why 98%?
- ✅ Root cause is clearly identified
- ✅ Solution is straightforward and follows existing patterns in the codebase
- ✅ Similar approach is already used successfully in `test/basic.test.js`
- ✅ No side effects on other tests
- ⚠️ Minor uncertainty: The exact timeout value (5000ms) may need adjustment if the network stack behaves differently in certain environments, but 5 seconds should be more than sufficient for DNS/connection failures

### To reach 100% confidence:
- Could verify that 5 seconds is sufficient across different operating systems and network configurations
- Could run the test locally to confirm the fix works as expected

## Testing Plan

After implementation:
1. Run the specific test: `yarn vitest run test/run-sequential/node-module.test.js`
2. Verify the test completes in ~5-6 seconds instead of timing out
3. Verify the test passes (catches the expected error)
4. Run the full test suite to ensure no regressions

## Risk Assessment

**Low Risk**
- Only modifying a single test
- Not changing any production code
- Following established patterns from existing tests
- Timeout is generous enough to allow the operation to complete naturally

## Questions

None - the solution is clear and straightforward.
