import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testobject.ObjectRepository.findWindowsObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys
import groovy.json.JsonSlurper
import java.text.SimpleDateFormat
import com.kms.katalon.core.util.KeywordUtil

/**
 * Test Developer Productivity Dashboard - Summary API Test
 * 
 * This test validates the activity summary API endpoint that provides productivity metrics
 * for test developers. It verifies both the structure and content of the API response.
 * 
 * @author Test Automation Team
 * @version 1.1
 */

// Test configuration
int expectedMaxResponseTime = 5000 // milliseconds
float acceptanceRateTolerance = 0.001 // Tolerance for floating point comparison

try {
    KeywordUtil.logInfo("Starting Summary API Test")
    
    // Send request to the summary API endpoint
    KeywordUtil.logInfo("Sending request to API endpoint")
    def response = WS.sendRequest(findTestObject('Productivity Summary API'))
    
    // Basic validation - verify HTTP 200 OK status
    KeywordUtil.logInfo("Verifying response status code")
    WS.verifyResponseStatusCode(response, 200)
    
    // Parse the JSON response
    KeywordUtil.logInfo("Parsing JSON response")
    def jsonSlurper = new JsonSlurper()
    def jsonResponse
    
    try {
        jsonResponse = jsonSlurper.parseText(response.getResponseText())
    } catch (Exception e) {
        KeywordUtil.markFailed("Failed to parse JSON response: " + e.getMessage())
        throw e
    }
    
    // Log the response for debugging
    KeywordUtil.logInfo("API Response: " + response.getResponseText())
    
    // SECTION 1: STRUCTURE VALIDATION
    KeywordUtil.logInfo("Validating response structure")
    
    // Define required fields and their expected types
    def requiredFields = [
        'totalAICodeLines': Number.class,
        'totalChatInteractions': Number.class,
        'totalInlineSuggestions': Number.class,
        'totalInlineAcceptances': Number.class,
        'acceptanceRate': Number.class,
        'byUser': List.class,
        'byDate': List.class
    ]
    
    // Verify all required fields exist with correct types
    requiredFields.each { fieldName, expectedType ->
        if (jsonResponse[fieldName] == null) {
            KeywordUtil.markFailed("Response is missing required field: ${fieldName}")
            assert false : "Response should contain ${fieldName}"
        }
        
        if (!expectedType.isInstance(jsonResponse[fieldName])) {
            KeywordUtil.markFailed("Field ${fieldName} has incorrect type. Expected: ${expectedType.simpleName}, Actual: ${jsonResponse[fieldName].getClass().simpleName}")
            assert false : "${fieldName} should be a ${expectedType.simpleName}"
        }
    }
    
    // SECTION 2: DATA VALIDATION
    KeywordUtil.logInfo("Validating data values")
    
    // Verify acceptance rate is within valid range (0-100%)
    if (!(jsonResponse.acceptanceRate >= 0 && jsonResponse.acceptanceRate <= 100)) {
        KeywordUtil.markFailed("Acceptance rate outside valid range: ${jsonResponse.acceptanceRate}")
        assert false : "Acceptance rate should be between 0 and 100"
    }
    
    // Verify non-negative values for metrics
    ['totalAICodeLines', 'totalChatInteractions', 'totalInlineSuggestions', 'totalInlineAcceptances'].each { metric ->
        if (jsonResponse[metric] < 0) {
            KeywordUtil.markFailed("${metric} has negative value: ${jsonResponse[metric]}")
            assert false : "${metric} should not be negative"
        }
    }
    
    // SECTION 3: USER DATA VALIDATION
    KeywordUtil.logInfo("Validating user data")
    
    // Verify byUser structure and data
    if (jsonResponse.byUser.size() == 0) {
        KeywordUtil.logInfo("No user data found in response")
    } else {
        KeywordUtil.logInfo("Found ${jsonResponse.byUser.size()} users in response")
        
        // Define required user fields and their expected types
        def requiredUserFields = [
            'userId': String.class,
            'aiCodeLines': Number.class,
            'chatInteractions': Number.class,
            'inlineSuggestions': Number.class,
            'inlineAcceptances': Number.class
        ]
        
        // Check each user entry
        jsonResponse.byUser.eachWithIndex { user, index ->
            // Verify all required fields exist with correct types
            requiredUserFields.each { fieldName, expectedType ->
                if (user[fieldName] == null) {
                    KeywordUtil.markFailed("User at index ${index} is missing required field: ${fieldName}")
                    assert false : "User should have ${fieldName}"
                }
                
                if (!expectedType.isInstance(user[fieldName])) {
                    KeywordUtil.markFailed("User field ${fieldName} has incorrect type. Expected: ${expectedType.simpleName}, Actual: ${user[fieldName].getClass().simpleName}")
                    assert false : "User ${fieldName} should be a ${expectedType.simpleName}"
                }
            }
            
            // Verify non-negative values for user metrics
            ['aiCodeLines', 'chatInteractions', 'inlineSuggestions', 'inlineAcceptances'].each { metric ->
                if (user[metric] < 0) {
                    KeywordUtil.markFailed("User ${user.userId} has negative ${metric}: ${user[metric]}")
                    assert false : "User ${metric} should not be negative"
                }
            }
            
            // Verify user acceptance rate logic
            if (user.inlineSuggestions > 0) {
                def userAcceptanceRate = (user.inlineAcceptances / user.inlineSuggestions) * 100
                if (userAcceptanceRate > 100) {
                    KeywordUtil.markFailed("User ${user.userId} has invalid acceptance rate: ${userAcceptanceRate}% (${user.inlineAcceptances}/${user.inlineSuggestions})")
                    assert false : "User acceptance rate cannot exceed 100%"
                }
            }
        }
        
        // Verify unique user IDs
        def userIds = jsonResponse.byUser.collect { it.userId }
        def uniqueUserIds = userIds.unique()
        if (userIds.size() != uniqueUserIds.size()) {
            KeywordUtil.markFailed("Duplicate user IDs found in response")
            assert false : "User IDs should be unique"
        }
    }
    
    // SECTION 4: DATE DATA VALIDATION
    KeywordUtil.logInfo("Validating date data")
    
    // Verify byDate structure and data
    if (jsonResponse.byDate.size() == 0) {
        KeywordUtil.logInfo("No date data found in response")
    } else {
        KeywordUtil.logInfo("Found ${jsonResponse.byDate.size()} date entries in response")
        
        // Define required date fields and their expected types
        def requiredDateFields = [
            'date': String.class,
            'aiCodeLines': Number.class,
            'chatInteractions': Number.class,
            'inlineSuggestions': Number.class,
            'inlineAcceptances': Number.class
        ]
        
        // Date format validator
        def dateFormat = new SimpleDateFormat("yyyy-MM-dd")
        dateFormat.setLenient(false)
        
        // Check each date entry
        jsonResponse.byDate.eachWithIndex { dateEntry, index ->
            // Verify all required fields exist with correct types
            requiredDateFields.each { fieldName, expectedType ->
                if (dateEntry[fieldName] == null) {
                    KeywordUtil.markFailed("Date entry at index ${index} is missing required field: ${fieldName}")
                    assert false : "Date entry should have ${fieldName}"
                }
                
                if (!expectedType.isInstance(dateEntry[fieldName])) {
                    KeywordUtil.markFailed("Date entry field ${fieldName} has incorrect type. Expected: ${expectedType.simpleName}, Actual: ${dateEntry[fieldName].getClass().simpleName}")
                    assert false : "Date entry ${fieldName} should be a ${expectedType.simpleName}"
                }
            }
            
            // Verify date format (YYYY-MM-DD)
            if (!(dateEntry.date ==~ /\d{4}-\d{2}-\d{2}/)) {
                KeywordUtil.markFailed("Invalid date format: ${dateEntry.date}")
                assert false : "Date should be in YYYY-MM-DD format"
            }
            
            // Verify date is valid
            try {
                dateFormat.parse(dateEntry.date)
            } catch (Exception e) {
                KeywordUtil.markFailed("Invalid date value: ${dateEntry.date}")
                assert false : "Date should be a valid calendar date"
            }
            
            // Verify non-negative values for date metrics
            ['aiCodeLines', 'chatInteractions', 'inlineSuggestions', 'inlineAcceptances'].each { metric ->
                if (dateEntry[metric] < 0) {
                    KeywordUtil.markFailed("Date ${dateEntry.date} has negative ${metric}: ${dateEntry[metric]}")
                    assert false : "Date ${metric} should not be negative"
                }
            }
        }
        
        // Verify unique dates
        def dates = jsonResponse.byDate.collect { it.date }
        def uniqueDates = dates.unique()
        if (dates.size() != uniqueDates.size()) {
            KeywordUtil.markFailed("Duplicate dates found in response")
            assert false : "Dates should be unique"
        }
        
        // Verify dates are in chronological order
        def sortedDates = dates.sort()
        if (dates != sortedDates && dates != sortedDates.reverse()) {
            KeywordUtil.logInfo("Dates are not in chronological order")
        }
    }
    
    // SECTION 5: BUSINESS LOGIC VALIDATION
    KeywordUtil.logInfo("Validating business logic")
    
    // Calculate acceptance rate manually and verify it matches the API response
    if (jsonResponse.totalInlineSuggestions > 0) {
        def calculatedAcceptanceRate = (jsonResponse.totalInlineAcceptances / jsonResponse.totalInlineSuggestions) * 100
        if (Math.abs(calculatedAcceptanceRate - jsonResponse.acceptanceRate) >= acceptanceRateTolerance) {
            KeywordUtil.markFailed("Calculated acceptance rate (${calculatedAcceptanceRate}) does not match API response (${jsonResponse.acceptanceRate})")
            assert false : "Calculated acceptance rate should match API response"
        }
    } else if (jsonResponse.acceptanceRate != 0) {
        KeywordUtil.markFailed("Acceptance rate should be 0 when there are no suggestions")
        assert false : "Acceptance rate should be 0 when there are no suggestions"
    }
    
    // Verify that the sum of user metrics equals the total metrics
    def sumUserAICodeLines = jsonResponse.byUser.sum { it.aiCodeLines }
    def sumUserChatInteractions = jsonResponse.byUser.sum { it.chatInteractions }
    def sumUserInlineSuggestions = jsonResponse.byUser.sum { it.inlineSuggestions }
    def sumUserInlineAcceptances = jsonResponse.byUser.sum { it.inlineAcceptances }
    
    if (sumUserAICodeLines != jsonResponse.totalAICodeLines) {
        KeywordUtil.markFailed("Sum of user aiCodeLines (${sumUserAICodeLines}) does not equal totalAICodeLines (${jsonResponse.totalAICodeLines})")
        assert false : "Sum of user aiCodeLines should equal totalAICodeLines"
    }
    
    if (sumUserChatInteractions != jsonResponse.totalChatInteractions) {
        KeywordUtil.markFailed("Sum of user chatInteractions (${sumUserChatInteractions}) does not equal totalChatInteractions (${jsonResponse.totalChatInteractions})")
        assert false : "Sum of user chatInteractions should equal totalChatInteractions"
    }
    
    if (sumUserInlineSuggestions != jsonResponse.totalInlineSuggestions) {
        KeywordUtil.markFailed("Sum of user inlineSuggestions (${sumUserInlineSuggestions}) does not equal totalInlineSuggestions (${jsonResponse.totalInlineSuggestions})")
        assert false : "Sum of user inlineSuggestions should equal totalInlineSuggestions"
    }
    
    if (sumUserInlineAcceptances != jsonResponse.totalInlineAcceptances) {
        KeywordUtil.markFailed("Sum of user inlineAcceptances (${sumUserInlineAcceptances}) does not equal totalInlineAcceptances (${jsonResponse.totalInlineAcceptances})")
        assert false : "Sum of user inlineAcceptances should equal totalInlineAcceptances"
    }
    
    // Verify that the sum of date metrics equals the total metrics
    def sumDateAICodeLines = jsonResponse.byDate.sum { it.aiCodeLines }
    def sumDateChatInteractions = jsonResponse.byDate.sum { it.chatInteractions }
    def sumDateInlineSuggestions = jsonResponse.byDate.sum { it.inlineSuggestions }
    def sumDateInlineAcceptances = jsonResponse.byDate.sum { it.inlineAcceptances }
    
    if (sumDateAICodeLines != jsonResponse.totalAICodeLines) {
        KeywordUtil.logInfo("Sum of date aiCodeLines (${sumDateAICodeLines}) does not equal totalAICodeLines (${jsonResponse.totalAICodeLines})")
    }
    
    if (sumDateChatInteractions != jsonResponse.totalChatInteractions) {
        KeywordUtil.logInfo("Sum of date chatInteractions (${sumDateChatInteractions}) does not equal totalChatInteractions (${jsonResponse.totalChatInteractions})")
    }
    
    if (sumDateInlineSuggestions != jsonResponse.totalInlineSuggestions) {
        KeywordUtil.logInfo("Sum of date inlineSuggestions (${sumDateInlineSuggestions}) does not equal totalInlineSuggestions (${jsonResponse.totalInlineSuggestions})")
    }
    
    if (sumDateInlineAcceptances != jsonResponse.totalInlineAcceptances) {
        KeywordUtil.logInfo("Sum of date inlineAcceptances (${sumDateInlineAcceptances}) does not equal totalInlineAcceptances (${jsonResponse.totalInlineAcceptances})")
    }
    
    // SECTION 6: PERFORMANCE VALIDATION
    KeywordUtil.logInfo("Validating performance")
    
    // Measure and validate response time
    def responseTime = response.getElapsedTime()
    KeywordUtil.logInfo("API Response Time: ${responseTime}ms")
    
    if (responseTime >= expectedMaxResponseTime) {
        KeywordUtil.markFailed("API response time (${responseTime}ms) exceeds maximum allowed (${expectedMaxResponseTime}ms)")
        assert false : "API response time should be less than ${expectedMaxResponseTime}ms"
    }
    
    // Test passed successfully
    KeywordUtil.markPassed("Summary API test completed successfully")
    
} catch (Exception e) {
    KeywordUtil.markFailed("Test failed with exception: " + e.getMessage())
    throw e
}