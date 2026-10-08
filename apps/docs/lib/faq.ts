import { catalog, categories } from './catalog';

/** Questions answered on the home page. The same text feeds the page's FAQPage data and llms.txt. */
export const faq = [
  { question: 'What is in @brand-studio/ui?', answer: `${catalog.length} React components in ${categories.length} groups: ${categories.join(', ')}. They cover app screens, AI agent interfaces, effects and story pages.` },
  { question: 'How does a component take on my brand?', answer: 'Wrap the app in BrandTheme and pass a palette with light and dark tokens: surface, elevated, ink, muted, accent, onAccent, line, font and radius. BrandTheme sets them as CSS variables, and every component inside it reads them.' },
  { question: 'Which React versions does it support?', answer: 'React 18.3 or newer, or React 19. React and React DOM are peer dependencies, and Base UI is the one runtime dependency.' },
  { question: 'Do I need Tailwind CSS?', answer: 'No. The package ships one plain CSS file, @brand-studio/ui/styles.css, which you import once.' },
  { question: 'Where does the brand contract come from?', answer: 'The brand-design skill writes it to brand/brand.json from your business facts, audience and category research. Install the skill with npx skills add hungduong-projects/brand-studio --skill brand-design, or write the palette by hand.' },
  { question: 'Can a coding agent read these docs?', answer: 'Yes. Each docs page has a Markdown copy, /llms.txt lists them, and /llms-full.txt holds every page in one file.' },
  { question: 'What is the licence?', answer: 'MIT. The source is on GitHub at hungduong-projects/brand-studio.' },
];
