# Add parameters to enable test mode and specify CSV file path
param(
    [switch]$TestMode = $false,
    [string]$CsvFilePath = "csv-example-users.csv"
)

# Display test mode message if enabled
if ($TestMode) {
    Write-Host "TEST MODE ENABLED - No actual changes will be made" -ForegroundColor Yellow
}

# Set Identity Store ID based on mode
$IDENTITY_STORE_ID = if ($TestMode) {
    "d-1234567890"  # Mock ID
} else {
    aws sso-admin list-instances --query 'Instances[0].IdentityStoreId' --output text
}

Write-Host "Using Identity Store ID: $IDENTITY_STORE_ID"

# Validate CSV file exists
if (-not (Test-Path -Path $CsvFilePath)) {
    Write-Host "Error: CSV file not found at path: $CsvFilePath" -ForegroundColor Red
    exit 1
}

# Process a CSV file with user information
$users = Import-Csv -Path $CsvFilePath

# Validate CSV has data
if ($users.Count -eq 0) {
    Write-Host "Error: CSV file contains no data" -ForegroundColor Red
    exit 1
}

# Validate required CSV columns
$requiredColumns = @("username", "givenName", "familyName", "email", "displayName", "groupName")
$csvColumns = $users[0].PSObject.Properties.Name
$missingColumns = $requiredColumns | Where-Object { $_ -notin $csvColumns }

if ($missingColumns.Count -gt 0) {
    Write-Host "Error: CSV file is missing required columns: $($missingColumns -join ', ')" -ForegroundColor Red
    exit 1
}

# Initialize counters
$successCount = 0
$failCount = 0
$groupSuccessCount = 0
$groupFailCount = 0

# Track groups we've already processed
$processedGroups = @{}

foreach ($user in $users) {
    Write-Host "Creating user: $($user.username)" -ForegroundColor Cyan
    $userId = $null
    
    if ($TestMode) {
        # Just simulate success in test mode
        Write-Host "  - Given Name: $($user.givenName)"
        Write-Host "  - Family Name: $($user.familyName)"
        Write-Host "  - Email: $($user.email)"
        Write-Host "  - Display Name: $($user.displayName)"
        Write-Host "  - Group: $($user.groupName)"
        Write-Host "TEST MODE: Would create user $($user.username)" -ForegroundColor Green
        $userId = "test-user-id-$($user.username)"
        $successCount++
    } else {
        try {
            # Create the user using AWS CLI
            $result = aws identitystore create-user `
                --identity-store-id $IDENTITY_STORE_ID `
                --user-name "$($user.username)" `
                --name "GivenName=$($user.givenName),FamilyName=$($user.familyName)" `
                --emails "Value=$($user.email),Type=work" `
                --display-name "$($user.displayName)" `
                --output json
            
            # Extract the user ID from the result
            $userId = $result | ConvertFrom-Json | Select-Object -ExpandProperty UserId
            
            Write-Host "Successfully created user: $($user.username) with ID: $userId" -ForegroundColor Green
            $successCount++
        }
        catch {
            Write-Host "Failed to create user: $($user.username) - $($_.Exception.Message)" -ForegroundColor Red
            $failCount++
        }
    }
    
    # Process group assignment if user was created successfully and has a group
    if ($userId -and $user.groupName) {
        # Check if we need to create the group first
        $groupId = $null
        
        if ($processedGroups.ContainsKey($user.groupName)) {
            $groupId = $processedGroups[$user.groupName]
            Write-Host "Using existing group: $($user.groupName) with ID: $groupId" -ForegroundColor Cyan
        } else {
            # Create or find the group
            if ($TestMode) {
                Write-Host "TEST MODE: Would create/find group: $($user.groupName)" -ForegroundColor Cyan
                $groupId = "test-group-id-$($user.groupName)"
                $processedGroups[$user.groupName] = $groupId
            } else {
                try {
                    # First check if the group exists
                    $groupSearchResult = aws identitystore list-groups `
                        --identity-store-id $IDENTITY_STORE_ID `
                        --filters "AttributePath=DisplayName,AttributeValue=$($user.groupName)" `
                        --output json
                    
                    $groupSearchJson = $groupSearchResult | ConvertFrom-Json
                    
                    if ($groupSearchJson.Groups.Count -gt 0) {
                        # Group exists, use its ID
                        $groupId = $groupSearchJson.Groups[0].GroupId
                        Write-Host "Found existing group: $($user.groupName) with ID: $groupId" -ForegroundColor Cyan
                    } else {
                        # Group doesn't exist, create it
                        $groupResult = aws identitystore create-group `
                            --identity-store-id $IDENTITY_STORE_ID `
                            --display-name "$($user.groupName)" `
                            --description "Group for $($user.groupName)" `
                            --output json
                        
                        $groupId = $groupResult | ConvertFrom-Json | Select-Object -ExpandProperty GroupId
                        Write-Host "Created new group: $($user.groupName) with ID: $groupId" -ForegroundColor Green
                    }
                    
                    # Store the group ID for future use
                    $processedGroups[$user.groupName] = $groupId
                }
                catch {
                    Write-Host "Failed to create/find group: $($user.groupName) - $($_.Exception.Message)" -ForegroundColor Red
                    continue
                }
            }
        }
        
        # Add user to group
        if ($TestMode) {
            Write-Host "TEST MODE: Would add user $($user.username) to group $($user.groupName)" -ForegroundColor Green
            $groupSuccessCount++
        } else {
            try {
                aws identitystore create-group-membership `
                    --identity-store-id $IDENTITY_STORE_ID `
                    --group-id $groupId `
                    --member-id "UserId=$userId" `
                    --output json
                
                Write-Host "Added user $($user.username) to group $($user.groupName)" -ForegroundColor Green
                $groupSuccessCount++
            }
            catch {
                Write-Host "Failed to add user $($user.username) to group $($user.groupName) - $($_.Exception.Message)" -ForegroundColor Red
                $groupFailCount++
            }
        }
    }
    
    # Add delay to avoid throttling (shorter in test mode)
    Start-Sleep -Seconds $(if ($TestMode) { 0.2 } else { 1 })
}

# Display summary
Write-Host "`nImport Summary:" -ForegroundColor Yellow
if ($TestMode) {
    Write-Host "TEST MODE: Would have imported: $successCount users" -ForegroundColor Green
    Write-Host "TEST MODE: Would have failed: $failCount users" -ForegroundColor Red
    Write-Host "TEST MODE: Would have added: $groupSuccessCount users to groups" -ForegroundColor Green
    Write-Host "TEST MODE: Would have failed adding: $groupFailCount users to groups" -ForegroundColor Red
} else {
    Write-Host "Successfully imported: $successCount users" -ForegroundColor Green
    Write-Host "Failed to import: $failCount users" -ForegroundColor Red
    Write-Host "Successfully added: $groupSuccessCount users to groups" -ForegroundColor Green
    Write-Host "Failed to add: $groupFailCount users to groups" -ForegroundColor Red
}

Write-Host "`nScript completed. CSV file used: $CsvFilePath" -ForegroundColor Cyan
