# 🧭 DEVELOPMENT_APPROACH.md

This guide defines the workflow that coding assistants must follow when implementing a new feature. The process emphasizes clarity, modularity, testing, and documentation — including creating a memory file for future reference.

---

## 🛠️ When Assigned a Task

### 1. 🔍 Clarify the Requirements

Ask necessary questions before coding:

- What is the expected behavior or outcome?
- What constraints or edge cases should I be aware of?
- What technologies or design patterns should be used?
- Is there a similar feature already built?

> ✅ Wait for confirmation before proceeding.

---

### 2. 🧭 Propose an Implementation Plan

Break the feature into clear steps, e.g.:

- Database changes
- API routes or backend logic
- Frontend components
- Tests
- Documentation

Present the plan clearly for review before execution.

---

## 🔧 Implementation Phase

### 3. 🔄 Work Iteratively, Step by Step

For each step:

1. Implement only what’s needed for that step.
2. Run relevant tests (unit/integration).
3. Manually test the feature in the app.
4. Ensure it works as expected before continuing.

> ⚠️ Do not proceed to the next step until the current one is validated.

---

### 4. 🧪 Testing Expectations

- Add tests alongside implementation.
- Ensure tests run successfully.
- Validate UI/UX if frontend is involved.
- Handle and document edge cases.

> ✅ Manual and automated testing are both required.

---

## ✅ Final Checklist

Before marking the feature complete:

- [ ] All requirements clarified
- [ ] Implementation plan followed
- [ ] Feature tested thoroughly
- [ ] Code reviewed and documented

---

> 👩‍💻 You are building collaboratively. Ask when unsure. Plan before coding. Test everything. Leave a trail.


