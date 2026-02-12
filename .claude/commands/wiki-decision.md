Record a technical or architectural decision to the project wiki.

## Instructions

1. Ask the user for:
   - **Context**: What question or issue requires a decision?
   - **Options considered**: At least 2 options with pros and cons
   - **Decision**: Which option was chosen?
   - **Rationale**: Why this option over others?

2. Generate a slug from the decision topic (e.g., `recommendation-architecture`)

3. Run the wiki script to create the decision page:
   ```bash
   ./scripts/wiki.sh decision <slug>
   ```

4. Edit the generated file at `.wiki/<date>-<slug>.md` to fill in the details from the conversation.

5. Commit and push the wiki:
   ```bash
   ./scripts/wiki.sh sync
   ```

6. Update the wiki Home.md page index to include the new decision.

7. If the decision resolves an open question in CLAUDE.md, update CLAUDE.md accordingly.
