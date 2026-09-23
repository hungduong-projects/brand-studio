/** A prompt a coding agent can run to install the package and the brand-design skill. The docs and the examples both copy it. */
export const agentPrompt = `Set up Brand Studio in this project.

1. Install the components: npm install @brand-studio/ui
2. Import '@brand-studio/ui/styles.css' once and wrap the app in <BrandTheme> from '@brand-studio/ui'.
3. Add the brand-design skill for Claude Code:
   claude plugin marketplace add hungduong-projects/brand-studio
   claude plugin install brand-studio@brand-studio-local
4. In a new session, run /brand-studio:brand-design to write the brand contract, then design the first page with the components.

Docs: https://brandstudio.js.org/docs/
Examples: https://brandstudio.js.org/examples/`;
