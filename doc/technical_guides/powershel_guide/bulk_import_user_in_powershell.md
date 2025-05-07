# PowerShell Scripts on Windows for IAM Identity Directory User & Group Import

This guide explains how to bulk import users in IAM Identity Center on PowerShell on Windows, including group assignments.

## Prerequisites
1. **Verify Powershell Version**
   - Verify: `$PSVersionTable.PSVersion` (should be PowerShell 7.5.x or higher)

2. **AWS CLI installed and configured**
   - Download from: [https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)
   - Verify installation: `aws --version` (The version should be 2.25.x or higher)
   - Verify if necessary commands (`create-user`, `list-groups`, `create-group`, `create-group-membership`) are in the current aws cli version: `aws identitystore help`
   - Configure with your credentials: `aws configure`
   - Verify active AWS profile: `aws configure list`

3. **CSV file with user and group information**
   - Properly formatted as described below

## CSV Format with Group Information

The CSV file should have the following format:

```
username,givenName,familyName,email,displayName,groupName
john.doe,John,Doe,john.doe@example.com,John Doe,Developers
jane.smith,Jane,Smith,jane.smith@example.com,Jane Smith,Administrators
```

The `groupName` column specifies which group each user should be assigned to.

## Testing the PowerShell Script on Windows

1. Make sure AWS CLI is installed and configured on your Windows system:
   ```powershell
   aws --version 
   aws configure list # Get the information of the current active profile
   ```
2. Verify that file `import-users-with-test.ps1` in the current folder

3. Run the script in test mode:
   ```powershell
   .\import-users-with-test.ps1 -TestMode -CsvFilePath "path/to/your/users.csv"
   ```

4. When ready to perform the actual import:
   ```powershell
   # Custom CSV file
   .\import-users-with-test.ps1 -CsvFilePath "path/to/your/users.csv"
   ```

## How the Script Works

The enhanced script performs the following operations:

1. **User Creation**: Creates users in IAM Identity Directory based on CSV data
2. **Group Management**: 
   - Checks if groups already exist
   - Creates groups that don't exist
   - Tracks created groups to avoid duplicate creation
3. **Group Assignment**: Adds users to their specified groups
4. **Error Handling**: Captures and reports errors for both user and group operations
5. **Test Mode**: Simulates all operations without making actual AWS API calls

## Note

1. Start with a small subset (5 - 10 users) to validate the import process
2. Monitor execution time and any errors with the test subset
3. If successful, proceed with importing batches of 50-100 users at a time

