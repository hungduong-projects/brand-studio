export type Category = 'Foundations' | 'App' | 'Navigation' | 'Data' | 'AI agents' | 'Effects' | 'Storytelling' | 'Product page';

export interface Entry {
  slug: string;
  /** Exported names documented on the page; the first one is the main component. */
  exports: string[];
  title: string;
  category: Category;
  description: string;
  /** HTML attributes the component passes through, so the props table can leave them out. */
  base?: string;
}

export const categories: Category[] = ['Foundations', 'App', 'Navigation', 'Data', 'AI agents', 'Effects', 'Storytelling', 'Product page'];

export const catalog: Entry[] = [
  { slug: 'brand-theme', exports: ['BrandTheme'], title: 'Brand Theme', category: 'Foundations', description: 'Applies a brand palette to everything inside it, in light, dark or the system mode.', base: 'HTMLAttributes<HTMLDivElement>' },
  { slug: 'button', exports: ['Button'], title: 'Button', category: 'App', description: 'A native button with primary, secondary and inverse tones.', base: 'ButtonHTMLAttributes<HTMLButtonElement>' },
  { slug: 'action-link', exports: ['ActionLink'], title: 'Action Link', category: 'App', description: 'A link styled as a button, for actions that go somewhere.', base: 'AnchorHTMLAttributes<HTMLAnchorElement>' },
  { slug: 'text-field', exports: ['TextField'], title: 'Text Field', category: 'App', description: 'A labelled input with an optional hint and error message.', base: 'InputHTMLAttributes<HTMLInputElement>' },
  { slug: 'textarea', exports: ['Textarea'], title: 'Textarea', category: 'App', description: 'A labelled multi-line input with an optional hint and error message.', base: 'TextareaHTMLAttributes<HTMLTextAreaElement>' },
  { slug: 'checkbox', exports: ['Checkbox'], title: 'Checkbox', category: 'App', description: 'A tick box with a visible label, including a mixed state.' },
  { slug: 'select', exports: ['Select'], title: 'Select', category: 'App', description: 'A labelled single-choice list that opens in a popup.' },
  { slug: 'switch', exports: ['Switch'], title: 'Switch', category: 'App', description: 'An on/off control with a visible label.' },
  { slug: 'tabs', exports: ['Tabs'], title: 'Tabs', category: 'App', description: 'Panels of content, one visible at a time.' },
  { slug: 'dialog', exports: ['Dialog', 'DialogClose'], title: 'Dialog', category: 'App', description: 'A window over the page that holds focus until it closes.' },
  { slug: 'tooltip', exports: ['Tooltip'], title: 'Tooltip', category: 'App', description: 'A short label shown on hover or keyboard focus.' },
  { slug: 'toast', exports: ['ToastProvider'], title: 'Toast', category: 'App', description: 'Brief messages that stack in a corner and dismiss themselves.' },
  { slug: 'badge', exports: ['Badge'], title: 'Badge', category: 'App', description: 'A short status or category label.', base: 'HTMLAttributes<HTMLSpanElement>' },
  { slug: 'card', exports: ['Card'], title: 'Card', category: 'App', description: 'A bordered surface with a title, body and footer.', base: 'HTMLAttributes<HTMLElement>' },
  { slug: 'dropdown-menu', exports: ['DropdownMenu'], title: 'Dropdown Menu', category: 'App', description: 'A list of actions that opens from a button.' },
  { slug: 'alert', exports: ['Alert'], title: 'Alert', category: 'App', description: 'An inline message about the page or a task, in info or critical tone.' },
  { slug: 'empty-state', exports: ['EmptyState'], title: 'Empty State', category: 'App', description: 'What a list or page shows before it has content, with the action that fills it.' },
  { slug: 'skeleton', exports: ['Skeleton'], title: 'Skeleton', category: 'App', description: 'Placeholder lines in the shape of content that is loading.' },
  { slug: 'spinner', exports: ['Spinner'], title: 'Spinner', category: 'App', description: 'A turning ring with a label, for a wait of unknown length.' },
  { slug: 'header', exports: ['Header'], title: 'Header', category: 'Navigation', description: 'The bar across the top: brand, links and actions. Links fold into a menu when it is narrow.' },
  { slug: 'sidebar', exports: ['Sidebar'], title: 'Sidebar', category: 'Navigation', description: 'Grouped side navigation for an app, with icons and counts.' },
  { slug: 'story-header', exports: ['StoryHeader'], title: 'Story Header', category: 'Navigation', description: 'A floating glass bar for a long, chaptered page. It names the chapter you are reading and fills a line as you scroll.' },
  { slug: 'site-bar', exports: ['SiteBar'], title: 'Site Bar', category: 'Navigation', description: 'A thin bar across the top of a whole site. Items can open a full-width menu panel while the page behind blurs.' },
  { slug: 'product-bar', exports: ['ProductBar'], title: 'Product Bar', category: 'Navigation', description: 'The bar for one product: its name, its own pages and one action. It sticks to the top while the page scrolls.' },
  { slug: 'mobile-navigation', exports: ['MobileNavigation'], title: 'Mobile Navigation', category: 'Navigation', description: 'A menu button that opens the links in a full-screen panel.' },
  { slug: 'data-table', exports: ['DataTable'], title: 'Data Table', category: 'Data', description: 'A captioned table with sortable columns, loading rows and an empty message.' },
  { slug: 'stat-card', exports: ['StatCard'], title: 'Stat Card', category: 'Data', description: 'One key number with its change and a sparkline.' },
  { slug: 'agent-thinking', exports: ['AgentThinking'], title: 'Agent Thinking', category: 'AI agents', description: 'A dot-matrix disc that shows whether an agent is idle, listening, thinking or speaking.' },
  { slug: 'thinking-trace', exports: ['ThinkingTrace'], title: 'Thinking Trace', category: 'AI agents', description: 'Collapsible reasoning steps with a live status for each.' },
  { slug: 'streaming-text', exports: ['StreamingText'], title: 'Streaming Text', category: 'AI agents', description: 'Text that arrives word by word, as a model writes it.' },
  { slug: 'tool-chips', exports: ['ToolChips'], title: 'Tool Chips', category: 'AI agents', description: 'Compact chips for the tools an agent calls, with running, done and failed states.' },
  { slug: 'approval-card', exports: ['ApprovalCard'], title: 'Approval Card', category: 'AI agents', description: 'Asks a person to allow or deny an action before an agent runs it.' },
  { slug: 'task-rows', exports: ['TaskRows'], title: 'Task Rows', category: 'AI agents', description: 'An agent’s task list with progress.' },
  { slug: 'border-beam', exports: ['BorderBeam'], title: 'Border Beam', category: 'Effects', description: 'A light that travels around the edge of a card.', base: 'HTMLAttributes<HTMLDivElement>' },
  { slug: 'metal-button', exports: ['MetalButton'], title: 'Metal Button', category: 'Effects', description: 'A brushed-metal button whose sheen follows the pointer.', base: 'ButtonHTMLAttributes<HTMLButtonElement>' },
  { slug: 'magnet-tabs', exports: ['MagnetTabs'], title: 'Magnet Tabs', category: 'Effects', description: 'Pill tabs whose highlight slides toward the pointer.' },
  { slug: 'flip-text', exports: ['FlipText'], title: 'Flip Text', category: 'Effects', description: 'Cycles through words with a letter-by-letter flip.' },
  { slug: 'scroll-stack', exports: ['ScrollStack'], title: 'Scroll Stack', category: 'Effects', description: 'Cards that pin and pile up as you scroll.' },
  { slug: 'click-spark', exports: ['ClickSpark'], title: 'Click Spark', category: 'Effects', description: 'Sparks fly from each click.', base: 'HTMLAttributes<HTMLDivElement>' },
  { slug: 'brand-image', exports: ['BrandImage'], title: 'Brand Image', category: 'Storytelling', description: 'A responsive picture with focal point and loading priority.' },
  { slug: 'story-hero', exports: ['StoryHero'], title: 'Story Hero', category: 'Storytelling', description: 'The opening frame of a page: headline, promise, action and image.' },
  { slug: 'chapter-rail', exports: ['ChapterRail'], title: 'Chapter Rail', category: 'Storytelling', description: 'The chapter list docks at the side once the cover scrolls away and lights the chapter being read.' },
  { slug: 'story-cover', exports: ['StoryCover'], title: 'Story Cover', category: 'Storytelling', description: 'The framed title card that opens a long page: kicker, title, one line, the chapter list and actions.' },
  { slug: 'editorial-section', exports: ['EditorialSection'], title: 'Editorial Section', category: 'Storytelling', description: 'A heading and prose beside an image.' },
  { slug: 'story-sequence', exports: ['StorySequence'], title: 'Story Sequence', category: 'Storytelling', description: 'Chapters that swap a pinned image as you scroll.' },
  { slug: 'scroll-text-reveal', exports: ['ScrollTextReveal'], title: 'Scroll Text Reveal', category: 'Storytelling', description: 'Words brighten one by one as the paragraph scrolls into view.' },
  { slug: 'parallax-gallery', exports: ['ParallaxGallery'], title: 'Parallax Gallery', category: 'Storytelling', description: 'Three columns of images that drift at different speeds.' },
  { slug: 'horizontal-story', exports: ['HorizontalStory'], title: 'Horizontal Story', category: 'Storytelling', description: 'Vertical scrolling moves chapters sideways.' },
  { slug: 'image-trail', exports: ['ImageTrail'], title: 'Image Trail', category: 'Storytelling', description: 'Moving the mouse leaves a fading trail of images.' },
  { slug: 'highlights-gallery', exports: ['HighlightsGallery'], title: 'Highlights Gallery', category: 'Product page', description: 'A row of large slides that plays by itself while on screen, with a progress pill and a pause button.' },
  { slug: 'product-viewer', exports: ['ProductViewer'], title: 'Product Viewer', category: 'Product page', description: 'A large stage for one product image at a time, with pill tabs under it to switch views.' },
  { slug: 'card-carousel', exports: ['CardCarousel'], title: 'Card Carousel', category: 'Product page', description: 'A row of tall cards that scrolls sideways, with round previous and next buttons.' },
  { slug: 'key-figures', exports: ['KeyFigures'], title: 'Key Figures', category: 'Product page', description: 'Big numbers side by side, each under a thin rule with a short lead-in and what it means.' },
  { slug: 'model-compare', exports: ['ModelCompare'], title: 'Model Compare', category: 'Product page', description: 'Models side by side: picture, name, price and action at the top, then one line per feature.' },
  { slug: 'footer-directory', exports: ['FooterDirectory'], title: 'Footer Directory', category: 'Product page', description: 'The closing directory of a site: numbered fine print, a breadcrumb, link columns and a legal line.' },
];

export const guides = [
  { slug: '', title: 'Introduction', description: 'React components that take their colours, type and shape from a brand contract.' },
  { slug: 'installation', title: 'Installation', description: 'Add the package, import the styles and wrap your app in a theme.' },
  { slug: 'theming', title: 'Theming', description: 'How a brand palette becomes CSS variables every component reads.' },
];

export const componentHref = (slug: string) => `/docs/components/${slug}/`;
export const guideHref = (slug: string) => (slug ? `/docs/${slug}/` : '/docs/');

/** Sidebar order: guides first, then each category in catalog order. */
export const pageOrder = [
  ...guides.map(guide => ({ href: guideHref(guide.slug), title: guide.title })),
  ...categories.flatMap(category => catalog.filter(entry => entry.category === category).map(entry => ({ href: componentHref(entry.slug), title: entry.title }))),
];
