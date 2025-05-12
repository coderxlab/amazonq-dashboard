# GitHub Copilot API Metrics Reference

This document provides a comprehensive list of metrics available in the response for each GitHub Copilot API endpoint.

## Table of Contents

- [Enterprise-level Metrics](#enterprise-level-metrics)
- [Enterprise Team-level Metrics](#enterprise-team-level-metrics)
- [Organization-level Metrics](#organization-level-metrics)
- [Organization Team-level Metrics](#organization-team-level-metrics)
- [Common Metrics Structure](#common-metrics-structure)

## Enterprise-level Metrics

**Endpoint:** `GET /enterprises/{enterprise}/copilot/metrics`

### Top-level Metrics

| Metric | Type | Description |
|--------|------|-------------|
| date | string | The date for which the usage metrics are aggregated, in `YYYY-MM-DD` format. |
| total_active_users | integer | The total number of Copilot users with activity belonging to any Copilot feature, globally, for the given day. Includes passive activity such as receiving a code suggestion, as well as engagement activity such as accepting a code suggestion or prompting chat. Does not include authentication events. |
| total_engaged_users | integer | The total number of Copilot users who engaged with any Copilot feature, for the given day. Examples include but are not limited to accepting a code suggestion, prompting Copilot chat, or triggering a PR Summary. Does not include authentication events. |

## Enterprise Team-level Metrics

**Endpoint:** `GET /enterprises/{enterprise}/team/{team_slug}/copilot/metrics`

### Top-level Metrics

Same as Enterprise-level metrics.

## Organization-level Metrics

**Endpoint:** `GET /orgs/{org}/copilot/metrics`

### Top-level Metrics

Same as Enterprise-level metrics.

## Organization Team-level Metrics

**Endpoint:** `GET /orgs/{org}/team/{team_slug}/copilot/metrics`

### Top-level Metrics

Same as Enterprise-level metrics.

## Common Metrics Structure

All API endpoints share the same metrics structure. Below are the detailed metrics available in each response.

### IDE Code Completions Metrics

**Object:** `copilot_ide_code_completions`

| Metric | Type | Description |
|--------|------|-------------|
| total_engaged_users | integer | Number of users who accepted at least one Copilot code suggestion, across all active editors. Includes both full and partial acceptances. |

#### Languages Metrics

**Array:** `copilot_ide_code_completions.languages`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the language used for Copilot code completion suggestions. |
| total_engaged_users | integer | Number of users who accepted at least one Copilot code completion suggestion for the given language. Includes both full and partial acceptances. |

#### Editors Metrics

**Array:** `copilot_ide_code_completions.editors`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the given editor. |
| total_engaged_users | integer | Number of users who accepted at least one Copilot code completion suggestion for the given editor. Includes both full and partial acceptances. |

##### Editor Models Metrics

**Array:** `copilot_ide_code_completions.editors[].models`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the model used for Copilot code completion suggestions. If the default model is used will appear as 'default'. |
| is_custom_model | boolean | Indicates whether a model is custom or default. |
| custom_model_training_date | string/null | The training date for the custom model. |
| total_engaged_users | integer | Number of users who accepted at least one Copilot code completion suggestion for the given editor, for the given language and model. Includes both full and partial acceptances. |

###### Model Languages Metrics

**Array:** `copilot_ide_code_completions.editors[].models[].languages`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the language used for Copilot code completion suggestions, for the given editor. |
| total_engaged_users | integer | Number of users who accepted at least one Copilot code completion suggestion for the given editor, for the given language. Includes both full and partial acceptances. |
| total_code_suggestions | integer | The number of Copilot code suggestions generated for the given editor, for the given language. |
| total_code_acceptances | integer | The number of Copilot code suggestions accepted for the given editor, for the given language. Includes both full and partial acceptances. |
| total_code_lines_suggested | integer | The number of lines of code suggested by Copilot code completions for the given editor, for the given language. |
| total_code_lines_accepted | integer | The number of lines of code accepted from Copilot code suggestions for the given editor, for the given language. |

### IDE Chat Metrics

**Object:** `copilot_ide_chat`

| Metric | Type | Description |
|--------|------|-------------|
| total_engaged_users | integer | Total number of users who prompted Copilot Chat in the IDE. |

#### IDE Chat Editors Metrics

**Array:** `copilot_ide_chat.editors`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the given editor. |
| total_engaged_users | integer | The number of users who prompted Copilot Chat in the specified editor. |

##### IDE Chat Editor Models Metrics

**Array:** `copilot_ide_chat.editors[].models`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the model used for Copilot Chat. If the default model is used will appear as 'default'. |
| is_custom_model | boolean | Indicates whether a model is custom or default. |
| custom_model_training_date | string/null | The training date for the custom model. |
| total_engaged_users | integer | The number of users who prompted Copilot Chat in the given editor and model. |
| total_chats | integer | The total number of chats initiated by users in the given editor and model. |
| total_chat_insertion_events | integer | The number of times users accepted a code suggestion from Copilot Chat using the 'Insert Code' UI element, for the given editor. |
| total_chat_copy_events | integer | The number of times users copied a code suggestion from Copilot Chat using the keyboard, or the 'Copy' UI element, for the given editor. |

### GitHub.com Chat Metrics

**Object:** `copilot_dotcom_chat`

| Metric | Type | Description |
|--------|------|-------------|
| total_engaged_users | integer | Total number of users who prompted Copilot Chat on github.com at least once. |

#### GitHub.com Chat Models Metrics

**Array:** `copilot_dotcom_chat.models`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the model used for Copilot Chat. If the default model is used will appear as 'default'. |
| is_custom_model | boolean | Indicates whether a model is custom or default. |
| custom_model_training_date | string/null | The training date for the custom model (if applicable). |
| total_engaged_users | integer | Total number of users who prompted Copilot Chat on github.com at least once for each model. |
| total_chats | integer | Total number of chats initiated by users on github.com. |

### Pull Request Metrics

**Object:** `copilot_dotcom_pull_requests`

| Metric | Type | Description |
|--------|------|-------------|
| total_engaged_users | integer | The number of users who used Copilot for Pull Requests on github.com to generate a pull request summary at least once. |

#### Pull Request Repositories Metrics

**Array:** `copilot_dotcom_pull_requests.repositories`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Repository name |
| total_engaged_users | integer | The number of users who generated pull request summaries using Copilot for Pull Requests in the given repository. |

##### Pull Request Repository Models Metrics

**Array:** `copilot_dotcom_pull_requests.repositories[].models`

| Metric | Type | Description |
|--------|------|-------------|
| name | string | Name of the model used for Copilot pull request summaries. If the default model is used will appear as 'default'. |
| is_custom_model | boolean | Indicates whether a model is custom or default. |
| custom_model_training_date | string/null | The training date for the custom model. |
| total_pr_summaries_created | integer | The number of pull request summaries generated using Copilot for Pull Requests in the given repository. |
| total_engaged_users | integer | The number of users who generated pull request summaries using Copilot for Pull Requests in the given repository and model. |
