Capture a brainstorm session to the project wiki.

## Instructions

1. Ask the user for:
   - **Topic**: What are we brainstorming about?
   - **Context**: What prompted this brainstorm?

2. Generate a slug from the topic (e.g., `deployment-model`)

3. Run the wiki script to create the brainstorm page:
   ```bash
   ./scripts/wiki.sh brainstorm <slug>
   ```

4. During the brainstorm conversation, capture:
   - All ideas discussed
   - Key discussion points and trade-offs
   - Any outcomes or follow-up actions
   - Links to related decisions or other wiki pages

5. Edit the generated file at `.wiki/<date>-<slug>.md` to fill in the details from the conversation.

6. Commit and push the wiki:
   ```bash
   ./scripts/wiki.sh sync
   ```

7. Update the wiki Home.md page index to include the new brainstorm.

8. If the brainstorm leads to a decision, create a separate decision page using `/wiki-decision`.
