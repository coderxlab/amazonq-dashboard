# Amazon Q Developer Pro Setup Guide For User

## Installing Amazon Q Developer in Your IDE

### Visual Studio Code
1. Download: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.amazon-q-vscode)
2. Install the extension
3. Click Amazon Q icon in sidebar
4. Authentication:
   - Free: Choose "Use for free" and follow browser prompts
   - Pro: Enter Start URL and AWS Region, then authenticate via browser

### JetBrains IDEs
1. Download: [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/24267-amazon-q/)
2. Install the plugin
3. Click Amazon Q icon on side panel
4. Authentication:
   - Free: Follow browser prompts for Builder ID
   - Pro: Choose "Use with Pro license", enter Start URL and Region

### Visual Studio
1. Download: [AWS Toolkit for Visual Studio](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.AWSToolkitforVisualStudio2022)
2. Navigate to: Extensions > AWS Toolkit > Getting Started
3. In Amazon Q section, click "Enable"
4. Authentication:
   - Free: Click "Sign up or Sign in" in Free Tier section
   - Pro: Fill in Profile Name, Start URL, and Regions, then click "Connect"

### Installing Amazon Q Developer on Command Line
1. **macOS**:
   - Download: [Amazon Q for macOS](https://desktop-release.q.us-east-1.amazonaws.com/latest/Amazon%20Q.dmg)
   - Or install with Homebrew: `brew install amazon-q`
   - Run: `q --version` to verify installation

2. **Linux**:
   - Ubuntu: `wget https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb && sudo apt-get install -f && sudo dpkg -i amazon-q.deb`
   - AppImage: Download [AppImage](https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.appimage), run `chmod +x amazon-q.appimage && ./amazon-q.appimage`
   - WSL: Install through appropriate Linux method above

3. **Authentication**:
   - Run: `q login` to authenticate with Builder ID or IAM Identity Center
   - For troubleshooting: `q doctor`

## Additional Resources

- [Amazon Q Developer User Guide](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/)
