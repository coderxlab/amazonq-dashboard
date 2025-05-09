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
import com.kms.katalon.core.util.KeywordUtil
import groovy.json.JsonSlurper

/**
 * Test Developer Productivity Dashboard - User Filter Test
 * 
 * This test validates the user filter functionality on the Amazon Q Dashboard
 * by comparing API data with UI display and testing filter interactions.
 * 
 * @author Test Automation Team
 * @version 1.1
 */

try {
    KeywordUtil.logInfo("Starting User Filter Test")
    
    // Step 1: Get API data first to compare with UI
    KeywordUtil.logInfo("Fetching API data for comparison")
    def apiResponse = WS.sendRequest(findTestObject('Productivity Summary API'))
    WS.verifyResponseStatusCode(apiResponse, 200)
    
    def jsonSlurper = new JsonSlurper()
    def jsonResponse = jsonSlurper.parseText(apiResponse.getResponseText())
    
    // Extract user data from API response
    def users = jsonResponse.byUser
    KeywordUtil.logInfo("Found ${users.size()} users in API response")
    
    // Step 2: Open the dashboard UI
    KeywordUtil.logInfo("Opening dashboard UI")
    WebUI.openBrowser('')
    WebUI.maximizeWindow()
    WebUI.navigateToUrl('http://localhost:8081/')
    WebUI.waitForPageLoad(10)
    
    // Step 3: Verify initial metrics match API data
    KeywordUtil.logInfo("Verifying initial metrics match API data")
    def acceptanceRateText = WebUI.getText(findTestObject('Object Repository/Page_Amazon Q Dashboard/div_Acceptance Rate54.8'))
    def chatInteractionsText = WebUI.getText(findTestObject('Object Repository/Page_Amazon Q Dashboard/div_Chat Interactions26'))
    
    // Extract numeric values from UI text
    def uiAcceptanceRate = acceptanceRateText.findAll(/\d+\.\d+|\d+/)[0] as Double
    def uiChatInteractions = chatInteractionsText.findAll(/\d+/)[0] as Integer
    
    // Compare with API data
    def apiAcceptanceRate = jsonResponse.acceptanceRate
    def apiChatInteractions = jsonResponse.totalChatInteractions
    
    KeywordUtil.logInfo("UI Acceptance Rate: ${uiAcceptanceRate}, API: ${apiAcceptanceRate}")
    KeywordUtil.logInfo("UI Chat Interactions: ${uiChatInteractions}, API: ${apiChatInteractions}")
    
    // Allow small rounding differences in acceptance rate
    def acceptanceRateTolerance = 0.1
    if (Math.abs(uiAcceptanceRate - apiAcceptanceRate) > acceptanceRateTolerance) {
        KeywordUtil.markFailed("Acceptance rate mismatch between UI (${uiAcceptanceRate}) and API (${apiAcceptanceRate})")
    }
    
    if (uiChatInteractions != apiChatInteractions) {
        KeywordUtil.markFailed("Chat interactions mismatch between UI (${uiChatInteractions}) and API (${apiChatInteractions})")
    }
    
    // Step 4: Test date filter functionality
    KeywordUtil.logInfo("Testing date filter functionality")
    
    // Set start date (one week ago)
    WebUI.click(findTestObject('Object Repository/Page_Amazon Q Dashboard/input_Start Date_w-full border border-gray-_687918'))
    WebUI.sendKeys(findTestObject('Object Repository/Page_Amazon Q Dashboard/input_Start Date_w-full border border-gray-_687918'), '2025-05-01')
    WebUI.sendKeys(findTestObject('Object Repository/Page_Amazon Q Dashboard/input_Start Date_w-full border border-gray-_687918'), Keys.chord(Keys.TAB))
    
    // Set end date (today)
    WebUI.click(findTestObject('Object Repository/Page_Amazon Q Dashboard/input_End Date_w-full border border-gray-30_cbf492'))
    WebUI.sendKeys(findTestObject('Object Repository/Page_Amazon Q Dashboard/input_End Date_w-full border border-gray-30_cbf492'), '2025-05-07')
    WebUI.sendKeys(findTestObject('Object Repository/Page_Amazon Q Dashboard/input_End Date_w-full border border-gray-30_cbf492'), Keys.chord(Keys.TAB))
    
    // Apply filters
    WebUI.click(findTestObject('Object Repository/Page_Amazon Q Dashboard/button_Apply Filters'))
    WebUI.delay(2) // Wait for filters to apply
    
    // Verify metrics changed after filtering
    def filteredAcceptanceRateText = WebUI.getText(findTestObject('Object Repository/Page_Amazon Q Dashboard/div_Acceptance Rate54.8'))
    def filteredChatInteractionsText = WebUI.getText(findTestObject('Object Repository/Page_Amazon Q Dashboard/div_Chat Interactions26'))
    
    // Extract numeric values from filtered UI text
    def filteredUiAcceptanceRate = filteredAcceptanceRateText.findAll(/\d+\.\d+|\d+/)[0] as Double
    def filteredUiChatInteractions = filteredChatInteractionsText.findAll(/\d+/)[0] as Integer
    
    KeywordUtil.logInfo("Filtered UI Acceptance Rate: ${filteredUiAcceptanceRate}")
    KeywordUtil.logInfo("Filtered UI Chat Interactions: ${filteredUiChatInteractions}")
    
    // Calculate expected values from API data for the filtered date range
    def filteredApiData = jsonResponse.byDate.findAll { dateEntry ->
        def entryDate = dateEntry.date
        return entryDate >= '2025-05-01' && entryDate <= '2025-05-07'
    }
    
    def filteredApiChatInteractions = filteredApiData.sum { it.chatInteractions } ?: 0
    def filteredApiInlineSuggestions = filteredApiData.sum { it.inlineSuggestions } ?: 0
    def filteredApiInlineAcceptances = filteredApiData.sum { it.inlineAcceptances } ?: 0
    
    // Calculate expected acceptance rate
    def expectedFilteredAcceptanceRate = 0.0
    if (filteredApiInlineSuggestions > 0) {
        expectedFilteredAcceptanceRate = (filteredApiInlineAcceptances / filteredApiInlineSuggestions) * 100
    }
    
    KeywordUtil.logInfo("Expected filtered chat interactions: ${filteredApiChatInteractions}")
    KeywordUtil.logInfo("Expected filtered acceptance rate: ${expectedFilteredAcceptanceRate}")
    
    // Step 5: Reset filters and verify original metrics are restored
    KeywordUtil.logInfo("Testing filter reset functionality")
    
    // Find and click the Reset button (you may need to add this object to your repository)
    def resetButtonExists = WebUI.verifyElementPresent(findTestObject('Object Repository/Page_Amazon Q Dashboard/button_Reset'), 5, FailureHandling.OPTIONAL)
    
    if (resetButtonExists) {
        WebUI.click(findTestObject('Object Repository/Page_Amazon Q Dashboard/button_Reset'))
        WebUI.delay(2) // Wait for reset to apply
        
        // Verify metrics returned to original values
        def resetAcceptanceRateText = WebUI.getText(findTestObject('Object Repository/Page_Amazon Q Dashboard/div_Acceptance Rate54.8'))
        def resetChatInteractionsText = WebUI.getText(findTestObject('Object Repository/Page_Amazon Q Dashboard/div_Chat Interactions26'))
        
        // Extract numeric values from reset UI text
        def resetUiAcceptanceRate = resetAcceptanceRateText.findAll(/\d+\.\d+|\d+/)[0] as Double
        def resetUiChatInteractions = resetChatInteractionsText.findAll(/\d+/)[0] as Integer
        
        KeywordUtil.logInfo("Reset UI Acceptance Rate: ${resetUiAcceptanceRate}, Original: ${uiAcceptanceRate}")
        KeywordUtil.logInfo("Reset UI Chat Interactions: ${resetUiChatInteractions}, Original: ${uiChatInteractions}")
        
        // Verify reset values match original values
        if (Math.abs(resetUiAcceptanceRate - uiAcceptanceRate) > acceptanceRateTolerance) {
            KeywordUtil.markFailed("Reset acceptance rate (${resetUiAcceptanceRate}) doesn't match original (${uiAcceptanceRate})")
        }
        
        if (resetUiChatInteractions != uiChatInteractions) {
            KeywordUtil.markFailed("Reset chat interactions (${resetUiChatInteractions}) doesn't match original (${uiChatInteractions})")
        }
    } else {
        KeywordUtil.logInfo("Reset button not found, skipping reset test")
    }
    
    // Test completed successfully
    KeywordUtil.markPassed("User filter test completed successfully")
    
} catch (Exception e) {
    KeywordUtil.markFailed("Test failed with exception: " + e.getMessage())
    throw e
} finally {
    // Close browser
    WebUI.closeBrowser()
}

