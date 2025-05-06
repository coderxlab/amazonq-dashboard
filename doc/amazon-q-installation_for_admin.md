# Amazon Q Developer Pro Setup Guide for Admin

## Prerequisites

Before you begin, ensure you have:

- **Administrator permissions** to subscribe users and manage Amazon Q Developer settings
- **IAM Identity Center** set up in your management account in a supported AWS Region

## Step 1: Set Up IAM Identity Center

If you haven't already set up IAM Identity Center:

1. Sign in to the AWS Management Console using your AWS management account
2. Navigate to the **IAM Identity Center** console
3. Choose **Enable IAM Identity Center**
4. For **Identity source**, select **IAM Identity Center directory** (to create and manage users directly in IAM Identity Center)

## Step 2: Create Users in IAM Identity Center

1. In the IAM Identity Center console, select **Users** from the navigation pane
2. Click **Add user**
3. Enter the required information:
   - **Username** (must be unique within your directory)
   - **Email address** (must be unique and valid)
   - **First name** and **Last name**
   - **Display name** (optional)
4. Click **Next**
5. (Optional) Add the user to groups:
   - Select existing groups or create new ones
   - Groups make it easier to manage permissions for multiple users
6. Click **Add user**
7. Repeat for all users who need Amazon Q Developer Pro access

## Step 3: Install the Amazon Q Developer Profile

1. Sign in to the AWS Management Console using your AWS management account
2. Navigate to the **Amazon Q Developer console**
3. Verify you're in the AWS Region where you want to install the profile and store user data
4. Click **Get started**
5. In the **Create Amazon Q Developer profile** dialog box:
   - Enter a name for your profile in the **Profile name** field
   - Consider enabling **Share Amazon Q Developer settings with member account** if needed
   - Consider disabling dashboard metrics if desired
6. Click **Create application**
7. Wait for the Amazon Q Developer profile and managed application to be installed

## Step 4: Subscribe Users to Amazon Q Developer Pro

1. In the Amazon Q Developer console, select **Subscriptions** from the navigation pane
2. Click **Subscribe**
3. In the **Assign users and groups** dialog box:
   - Start typing the name of the group or user you want to subscribe
   - Select from the auto-populated list of available users/groups in IAM Identity Center
4. Click **Assign**
5. Inform users to check their email for an activation message titled **Activate Your Amazon Q Developer Pro Subscription**
   - Users should receive this email within 24 hours
   - The email contains their unique Start URL and AWS Region for authentication
   - It also includes quickstart steps for using Amazon Q Developer in their IDE

## Step 5: Enable Identity-Aware Console Sessions (Optional)

If you want users to use their Amazon Q Developer Pro subscription on AWS apps and websites:

1. In the IAM Identity Center console, select **Settings** from the navigation pane
2. Under **Authentication**, select **Identity-aware console sessions**
3. Choose **Enable**
4. Select your preferred session duration
5. Click **Save changes**

**Note:** If you don't enable identity-aware console sessions, users can still use Amazon Q on AWS apps and websites, but they'll be limited to the Free tier.

## Resources Created

When you complete this setup, Amazon Q creates the following resources:

- **Pro tier subscriptions** for your selected users in Amazon Q Developer
- **An Amazon Q Developer profile** in the Amazon Q Developer console under Settings
- **A managed application** called **QDefaultProfile** in your IAM Identity Center


## Additional Resources

- [Amazon Q Developer User Guide](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/)
