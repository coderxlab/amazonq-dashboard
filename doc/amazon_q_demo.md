# Amazon Q Developer Guide

## 1. Code Comprehension and Summarization

### Context Awareness in Amazon Q
Amazon Q leverages multiple context sources to provide accurate responses:
- Current chat history and conversation flow
- Open file content (subject to size limitations)
- Workspace files when using the `@workspace` directive
- Specific files and folders selected by user using `@folder` or `@file` directives (size limitations apply)

### Crafting Effective Prompts
For optimal results with Amazon Q Developer, include these key elements:

- **Clear task or question**: Explicitly state what you want Amazon Q Developer to accomplish
- **Relevant context**: Provide any additional information that could help Amazon Q understand your needs
- **Appropriate input**: Ensure you have the correct files open or referenced in your chat history
- **Desired output format**: Specify how you want Amazon Q to structure its response

### Comprehensive Prompt Template

```markdown
[Business Context]
- Project description: [Brief overview of the project]
- Performance requirements: [Speed, scalability, etc.]
- Compliance needs: [Security, regulatory, etc.]
- Scale expectations: [User volume, data size, etc.]

[Technical Details]
- Current technology stack: [Languages, frameworks, etc.]
- Versions/dependencies: [Specific versions of tools]
- Technical constraints: [Limitations, legacy systems]
- Environment details: [Development, staging, production]

[Specific Request]
- Task description: [What you need accomplished]
- Expected outcome: [What success looks like]
- Special considerations: [Edge cases, specific requirements]

[Output Format]
- Desired format: [Markdown, code block, mermaid diagram, etc.]
- Level of detail required: [High-level overview or detailed implementation]
- Examples needed: [Yes/No]
- Additional formatting requirements: [Tables, lists, etc.]

[Optional]
- Example input: [Sample data or parameters]
- Example output: [Expected result format]
```

### Example Prompt
```
I'm building a three-tier app:
* Frontend: React 
* Backend: NodeJS, Express
* Database: PostgreSQL

Explain AWS deployment options for this application.

Include:
* AWS services for each component:
  - Frontend hosting
  - API deployment 
  - Database setup
* Network architecture and configuration
* Security best practices and IAM roles
* Auto-scaling and high availability
* CI/CD pipeline setup
* Cost optimization recommendations

Format as bullet points with implementation details for each component.
```

Source: [Mastering Amazon Q Developer: Part 1 - Crafting Prompts](https://community.aws/content/2tV2fFK9GNYHmuLDnEQ82Ht9t7b/mastering-amazon-q-developer-part-1-crafting-prompts)

### Pro Tips
- Ask Amazon Q Developer to create the prompt for you when you're unsure how to structure it
- Use Agentic Documentation with the `/dev` command for more comprehensive results
- Start with a high-level request and then refine with follow-up questions

### Demo Prompts for Comprehension
1. "Analyze this codebase and explain its overall architecture"
2. "Summarize the key functionality in the `src/controllers` directory"
3. "What are the main data models used in this application?"

## 2. Documentation Generation

### Documentation Types
- **Application Structure**: Overall architecture and component relationships
- **Framework Details**: Specific frameworks and their implementation
- **Key Features Overview**: Core functionality and capabilities
- **Getting Started Guide**: Setup and initial usage instructions

### Sample Documentation Prompts
1. "Create a comprehensive README.md for this project"
2. "Generate API documentation for the endpoints in `routes/api.js`"
3. "Document the database schema and relationships"
4. "Create a developer onboarding guide for new team members"

## 3. Code Debugging, Testing, and Optimization

### Building and Running Applications
Create scripts to streamline development workflows:
```
@workspace Create a run-project script file that starts both the frontend and backend servers
```

If you're unsure about running a project:
```
How do I build and run a [your language] application based on the project structure?
```

### Debugging Assistance
Identify and fix issues with targeted prompts:

**Finding the cause**:
```
@workspace My application keeps returning the same word for each new game played. How is the word selected for each new game in my project?
```

**Solving specific errors**:
```
This function is producing the following error: [Error message]. How can I fix it?
```

### Test Creation
Generate comprehensive tests for your codebase:
```
Create a unit test that tests get_random_word in the WordList class in the WordList.py file. The test should verify the word length is 6 characters.
```

Use the `/test` command for more advanced testing scenarios.

## 4. Refactoring and Feature Implementation

### Refactoring Existing Code
Use the `/dev` command to leverage Amazon Q's agentic capabilities for refactoring:
```
/dev Refactor the authentication system to use JWT tokens instead of session cookies
```

### Implementing New Features
Leverage Amazon Q to build new functionality:
```
/dev Add a user profile page that displays activity statistics and allows users to update their information
```

### Development Environment Setup
Create containerized environments for consistent development:
```
Create a devfile.yaml to set up a containerized environment for running and testing this application
```

## 5. Documentation Best Practices

For optimal documentation generation with Amazon Q:

- **Scope appropriately**: For large repositories, request documentation for specific components rather than the entire codebase
- **Code quality matters**: Well-commented, organized code with good naming conventions yields better documentation
- **Language support**: Amazon Q produces the highest quality documentation for officially supported languages
- **Specific updates**: When requesting changes to existing documentation, clearly specify sections to modify and desired changes
- **Content limitations**: Amazon Q can't document private platforms, specialized tooling, or third-party systems it doesn't have knowledge of

## 6. Git Integration

Use the `@git` directive to provide repository context:
```
@git Write me a commit message for my current changes
```

Additional git-related prompts:
```
@git Summarize the changes in the last 5 commits
@git Help me resolve this merge conflict
```

## 7. Custom Prompts

Create reusable prompt templates with the `@prompt` directive:
```
@prompt Create a template for generating API endpoint documentation
```

## 8. Amazon Q CLI

### Security Best Practices

When using Amazon Q's system modification capabilities:

#### Understanding Security Risks
- **Unintended changes**: Commands may be interpreted differently than intended
- **AWS resource modifications**: Resources could be created, modified, or deleted
- **Data loss**: Commands might delete or overwrite important files
- **Security vulnerabilities**: System security could be compromised

These risks increase significantly when using `/tools trustall` or `/acceptall`.

#### Restricting File Access
By default, Amazon Q can read files without permission (`fs_read` is trusted):
```
/tools untrust fs_read
```

Make this setting persistent:
```
echo 'alias q="q --untrust-fs-read"' >> ~/.bashrc
```

#### Additional Security Measures
- Use Amazon Q in isolated development environments
- Store sensitive files outside project directories
- Use environment variables for credentials
- Consider `/tools untrust use_aws` for AWS API calls
- Define security guidelines with project rules

#### Using `/tools trustall` Safely
If you must use `/tools trustall`:
- Only use in development/testing environments
- Enable only for specific tasks, then disable with `/tools reset`
- Back up important data beforehand
- Use AWS credentials with minimal permissions
- Monitor all actions carefully

Reset to default permissions:
```
/tools reset
```

### MCP (Model Context Protocol)

Configuration locations:
- Global: `~/.aws/amazonq/mcp.json` (applies to all workspaces)
- Workspace: `.amazonq/mcp.json` (specific to current workspace)

Best practices:
- Only install servers from trusted sources
- Review tool descriptions before approving
- Use environment variables for sensitive configuration
- Keep MCP servers and Q CLI updated
- Monitor logs for unexpected activity

### Context Hooks

Set up automated actions to run when either conversation start or prompt start

```
/context hooks add --trigger conversation_start --command "node /Users/macintoshhd/Desktop/coderpush/AmazonQ-productivity/.amazonq/hooks/suggestFocus.js"
```