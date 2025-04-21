# 📘 CREATE_MEMORY_FILE.md

This guide outlines how to write and organize a **memory file** for each completed feature.

Memory files help the coding assistant remember:
- What was done
- Why it was done that way
- How it was implemented
- What to consider for future changes

---

## 🗂️ File Location & Naming

Place all files in:
```
.amazonq/assistant_memory/
```

**File name format:**
```
feat-[slugified-feature-title]-[yyyy-mm-dd].md
```

**Examples:**
- `feat-password-reset-2025-04-18.md`
- `feat-add-storefront-banner-2025-04-21.md`

---

## 📝 Memory File Template

```md
# 🧠 Feature Memory: [Feature Name]

**Date:** YYYY-MM-DD  
**Status:** Completed / In Progress / Needs Review  
**Related Files:** [paths to key files]

---

## 1. 🔍 Clarification & Requirements

**Original Task:**
> Short description of the feature request

**Questions Asked:**
- What tech stack or pattern to follow?
- Any edge cases or fallback behavior?

**Confirmed Requirements:**
- List of all finalized requirements

---

## 2. 🧭 Implementation Plan

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## 3. 🔧 Code Highlights

### Example Snippet
```ts
// Reset token logic
const token = generateToken();
```

### Affected Files
- `routes/auth/reset.ts`
- `components/forms/ResetForm.tsx`

---

## 4. 🧪 Testing Summary

- ✅ Unit tests written for: `sendResetEmail()`, token validation
- ✅ Manual test run for password reset flow
- ⚠️ Known test limitation: time-based expiry edge case not covered yet

---

## 5. 📝 Notes & Gotchas

- Uses new SendGrid API keys (stored in `.env`)
- Tailwind styles follow the new `2025-design-system`
- Avoid reusing token table for other auth flows

---

## 6. 📌 Follow-ups

- [ ] Add resend email button with cooldown
- [ ] Centralize token expiration config
```

---

## 🔁 When to Reference This

- Building a **related feature**
- Debugging **unexpected behavior**
- Onboarding **new developers**
- Writing **documentation**

---

> 💡 Tip: Keep your tone concise, clear, and dev-friendly.