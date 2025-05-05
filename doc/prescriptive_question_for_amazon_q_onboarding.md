# Amazon Q Developer Onboarding - Prescriptive Questions 

## 1. Core Assessment Questions 

### Project & Workflow Assessment 
- Which projects are candidates for Amazon Q Developer integration?
- What are the current development workflows in these projects?
- Which stages of the SDLC could benefit most from AI assistance (planning, coding, testing, deployment)?

### Team Structure & Adoption Strategy 
- What is the composition of your team (percentage of developers, QA engineers, business analysts)?
- How would each role (developers, QA, BAs) potentially leverage Amazon Q Developer?
- Who would be ideal champions for Amazon Q Developer adoption within your teams?

### Pain Points & Opportunities 
- What are the most significant bottlenecks in your current development process?
- Which repetitive coding tasks consume the most developer time?
- Where do your teams struggle with code quality or consistency?

### Current Tooling & Integration 
- Which IDEs and development tools are currently used across your teams?
  - Note: Amazon Q Developer integrates with VS Code, JetBrains IDEs, AWS Cloud9, JupyterLab, and the AWS CLI
- How do your teams currently handle code reviews and documentation?
- What source control and CI/CD systems are you using?

### Network Connectivity
- Does Amazon Q Developer need to connect to AWS endpoints? Are client machines in your network restricted from connecting, and what is the process for allowing these endpoints?
  - Please provide details on any firewall policies
  - List specific domains, IP ranges, or ports that need to be allowlisted
  - Document the approval process for network access changes

Read more: [Configuring a firewall, proxy server, or data perimeter for Amazon Q Developer](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/firewall.html)

### Metrics & Measurement 
- Which productivity metrics do you currently track for development teams?
- What would success look like when implementing Amazon Q Developer?
- How would you measure the ROI of Amazon Q Developer adoption?

#### Suggested productivity metrics:

| Metric | Description | Purpose |
|--------|-------------|---------|
| Time to First Commit for New Developers | Tracks time from onboarding to first commit vs. pre-Amazon Q baseline. | Measure onboarding efficiency. |
| Task Completion Time | Time taken for tasks like regulatory compliance and security fixes. | Quantify productivity in critical functions. |
| Developer Satisfaction Index | Survey (scale 1–5) across banking departments. | Track morale and perceived productivity. |
| Sprint Velocity Comparison | Compare sprint velocity before/after Amazon Q adoption. | Evaluate team-level performance improvements. |
| Documentation Generation Efficiency | Time saved when generating technical/regulatory docs. | Measure process improvements. |
| Error Reduction Rate | Change in bugs post-Amazon Q adoption. | Monitor code quality improvements. |
| Feature Development Cycle Time | From request to deployment of banking-specific features. | Measure speed of delivery. |

## 2. Additional Context Questions 

### AWS Experience & Environment 
- What is your team's current experience level with AWS services?
- Which AWS services are you currently using in your development environment?

### AI Coding Assistant Experience 
- Have team members used GitHub Copilot or similar AI coding assistants?
- What were the most valuable use cases and limitations experienced with these tools?
- What security or compliance considerations are important for your AI tool adoption?