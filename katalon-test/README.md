# Test Developer Productivity Dashboard

## Project Overview
This Katalon Studio project implements a Test Developer Productivity Dashboard that helps track and visualize test automation metrics and performance.

## Project Structure

### Directory Tree
```
katalon-test/
├── bin/                      # Compiled binaries and execution files
├── Checkpoints/              # Verification checkpoints for comparing expected vs actual results
├── console.properties        # Properties for running tests in console/headless mode
├── Data Files/               # Test data sources (CSV, Excel, etc.) for data-driven testing
├── Drivers/                  # WebDriver and other driver executables for browser automation
├── Include/                  # Included resources and shared code libraries
├── Keywords/                 # Reusable test functions and utilities
├── Libs/                     # External libraries and dependencies (similar to node_modules)
├── Object Repository/        # UI element definitions and locators for test interactions
├── Plugins/                  # Katalon plugins and extensions
├── Profiles/                 # Environment configuration profiles (dev, staging, prod)
├── README.md                 # Project documentation
├── Reports/                  # Test execution reports and logs
├── Scripts/                  # Custom Groovy scripts for test implementation
├── settings/                 # Project configuration files
├── Test Cases/               # Individual test scenarios
├── Test Developer Productivity Dashboard.prj  # Main project file
├── Test Listeners/           # Custom event handlers for test execution
├── Test Suites/              # Collections of test cases organized for execution
└── build.gradle              # Gradle build configuration for dependencies
```

## Getting Started

### Prerequisites
- Katalon Studio installed
- Required dependencies configured
- The website frontend and backend services are actively running and accessible at their designated

### Setup Instructions
1. Open the project in Katalon Studio
2. Right-click on the project in the Test Explorer
3. Select "Build All" or run the Gradle build task
4. Katalon will download all dependencies specified in build.gradle to the Libs folder
5. Configure execution profiles as needed
6. Run test cases or test suites

## Execution
- Individual test cases can be executed from the Test Cases browser
- Test suites can be scheduled and executed from the Test Suites browser
- Reports are generated in the Reports folder

## Maintenance
- Update object repositories when UI changes
- Maintain test data in the Data Files folder
- Update test scripts as application functionality evolves

## CI/CD Integration
This project includes GitHub workflow configurations in the `.github` folder for continuous integration.
