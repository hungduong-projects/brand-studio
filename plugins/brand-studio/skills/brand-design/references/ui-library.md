# Use Brand Studio UI

`@brand-studio/ui` is an optional React package, published on npm. Inspect the target project's stack and dependencies first. Preserve its existing accessible component system when it can express the contract; do not install or replace a UI package merely to use Brand Studio.

When the target has chosen `@brand-studio/ui`, import components from `@brand-studio/ui` and styles from `@brand-studio/ui/styles.css`. Wrap the intended subtree in `BrandTheme` with `palette={brand.tokens}`. Its theme is scoped to the subtree. Check the installed version's exports before using a component: some components below arrived after 0.1.0 and need a newer release.

## Pick by job

Start from the job the person is doing on this screen, not from a component you want to show. Find the job below, check the "not when" column, then use the component. If no row fits, build the smallest thing that does the job and record it as a candidate pattern.

### Act and enter

| The person needs to | Use | Not when |
|---|---|---|
| Take the main action on a screen | `Button` (primary) | The action goes to another page: use `ActionLink` |
| Take a lesser action beside it | `Button` tone `secondary` | There are more than two: group the rest in `DropdownMenu` |
| Go somewhere that looks like an action | `ActionLink` | It changes data: use `Button` |
| Type one line | `TextField` | The answer is one of a known few: use `Select` |
| Write several lines | `Textarea` | A single line is enough |
| Pick one of many options | `Select` | There are two or three options: show them all, for example as `Tabs` or buttons |
| Turn a setting on or off, taking effect at once | `Switch` | The choice is only saved on submit: use `Checkbox` |
| Agree, or pick several items, then submit | `Checkbox` (with `indeterminate` for a parent box) | The choice acts immediately: use `Switch` |
| Reach several actions on one object | `DropdownMenu` | One action matters most: show it as a `Button` |

### Find their way

| The person needs to | Use | Not when |
|---|---|---|
| Know where they are and move between main areas | `Header` | The app has more than about six areas: use `Sidebar` |
| Move between the areas of a working app | `Sidebar`, with `MobileNavigation` on narrow screens | It is a marketing site: use `Header` |
| Know which chapter of a long page they are reading | `StoryHeader` | The page is short or an app screen: use `Header` |
| Move between the areas of a whole site, with menus for the big ones | `SiteBar` | The site has a handful of pages and no menus: use `Header` |
| Move between one product's pages and reach its main action | `ProductBar`, stacked under a `SiteBar` | The page is an app screen or a chaptered story: use `Header` or `StoryHeader` |
| Reach the links on a phone, or in your own bar | `MobileNavigation` | You use `Header`: it already includes one |
| Switch views of the same thing | `Tabs` | The views are separate pages: use links |

### Know what happened

| The person needs to | Use | Not when |
|---|---|---|
| See that a quick action worked | `ToastProvider` + `useToast` | They must act on it: use `Alert` |
| Read a message that stays until it is resolved | `Alert` tone `info` | It is a passing confirmation: use a toast |
| Fix something before they can go on | `Alert` tone `critical` | Nothing is blocked: `critical` interrupts screen readers, so use `info` |
| Confirm a decision, or finish a short task, before returning | `Dialog` | The content is long or needs the page behind it |
| Wait for content of a known shape | `Skeleton` | The shape is unknown or the wait is an action: use `Spinner` |
| Wait for an action of unknown length | `Spinner`, or `Button` with `loading` for the pressed button | Content is loading into a known layout: use `Skeleton` |
| Understand an empty list or page, and fill it | `EmptyState` | The emptiness is an error: use `Alert` |
| Learn what an unlabelled control does | `Tooltip` | The text is needed to use the control: show it as a visible label |

### Read data

| The person needs to | Use | Not when |
|---|---|---|
| Compare rows across columns, sort them, scan them | `DataTable` | Each item is read alone with a picture or actions: use `Card` |
| Watch one key number and its direction | `StatCard` | The change needs axes and values to be understood: use a full chart |
| Read one item: title, detail, actions | `Card` | The items are compared column by column: use `DataTable` |
| Read a status or category at a glance | `Badge` | The status needs an explanation: use `Alert` |

### Work with an AI agent

| The person needs to | Use | Not when |
|---|---|---|
| See whether the agent is idle, listening, thinking or speaking | `AgentThinking` | You can show the actual steps: use `ThinkingTrace` or `TaskRows` |
| Follow the agent's reasoning, collapsed by default | `ThinkingTrace` | The steps are a plan the person approves: use `TaskRows` |
| Track a list of tasks the agent works through | `TaskRows` | There is a single step: use `AgentThinking` |
| See which tools the agent called and whether they worked | `ToolChips` | The person must allow the call first: use `ApprovalCard` |
| Allow or deny an action before the agent takes it | `ApprovalCard` | The action is harmless and reversible: let it run and report it |
| Read an answer as the model writes it | `StreamingText` | The text is complete: render it directly |
| Read a conversation that follows the newest message | `ChatThread` with `ChatMessage` | There is one answer and no back-and-forth: show it in a `Card` |
| Type a message, send it and stop a running answer | `ChatComposer` | The person adds sources or commands: use `PromptBar` |
| Point the agent at sources, run a command or pick a model while typing | `PromptBar` | The people using it only chat: use `ChatComposer` |
| See a file going with a message and whether it uploaded | `Attachment` | The file is already part of the answer: cite it with `SourceCards` |
| Start a chat, or ask a likely follow-up, in one tap | `SuggestionChips` | The choices are settings, not questions: use `Select` or `Tabs` |
| Copy, retry, edit or rate one message | `MessageActions` | The action affects the whole conversation: put it in the header |
| Read or take code the agent wrote | `CodeBlock` | The text is prose with a few terms: use inline `code` |
| Check where an answer came from | `SourceCards` | The agent retrieved nothing: leave them out rather than show an empty list |
| Ask the agent about part of a text | `SelectionActions` | The action applies to the whole text: use a `Button` |
| Accept the agent's pick, or promote an alternative | `RecommendationCard` | The agent is asking permission to act: use `ApprovalCard` |
| See a voice agent listen, think and speak | `VoiceOrb` | The agent works in text: use `AgentThinking` |
| Talk instead of typing | `DictationButton` | The page is not served over https: the browser blocks the microphone |
| Watch spoken words appear as they are recognised | `LiveTranscript` | The words are the agent's typed answer: use `StreamingText` |

### Feel the brand

Use these for a brand moment, not for routine controls. Allow at most one per view, and only when it comes from the brand concept.

| The moment | Use | Not when |
|---|---|---|
| Draw the eye to one card or offer | `BorderBeam` | Several things compete for attention |
| Make one premium action feel physical | `MetalButton` | The brand is quiet or the action is routine |
| Choose between a few modes with some play | `MagnetTabs` | The switch is a working control in a dense app: use `Tabs` |
| Rotate a short list of words in a headline | `FlipText` | The words carry facts the person needs |
| Reward a click with a small burst | `ClickSpark` | The click is frequent or serious |
| Pile up cards as the page scrolls | `ScrollStack` | The cards must be compared side by side |
| Give a hero or offer a living backdrop in the brand's colours | `ShaderBackground` | Text over it fails contrast somewhere in the gradient |
| Land one headline with weight as it arrives | `KineticText` | The text is body copy or changes often |
| Make one signature image answer the pointer | `DistortionImage` | The image carries detail people must read, or comes from another origin |
| Carry a short brand line across the page with scroll energy | `VelocityMarquee` | The line holds a fact the person needs |
| Make the one action on a launch page feel within reach | `MagneticButton` | The page has several actions of equal weight |
| Give a gallery or journal page a signature pointer that names what a click does | `CustomCursor` | The area is a working app screen or touch is the main input |
| Give one product card physical presence | `TiltCard` | Cards sit in a dense grid people scan quickly |
| Let a row of plans or options glow as the pointer passes | `SpotlightCard` | The cards hold a form or many controls |
| Draw attention to a short label, lot code or status line | `ScrambleText` | The text is longer than a line or must be read at once |
| Make a display headline answer the pointer | `ProximityText` | The brand font has no variable weight axis |
| Fill a hero word with the product in motion | `VideoText` | The words are long or the video has no clear texture at that size |
| Mark a scroll cue, badge or seal with a turning ring of words | `CircularText` | The words carry information the person must read |
| Give a technical or developer section a quiet, living texture | `DotGrid` | The section already has an image or pattern behind it |
| Set a calm, atmospheric backdrop for a night, space or launch moment | `ParticleField` | The brand is quiet and flat, or text over it fails contrast |
| Show where things come from or go, and how they connect | `DotGlobe` | Exact positions matter: use a real map |

### Tell a story

| The page needs to | Use | Not when |
|---|---|---|
| Open with one promise, one action and one image | `StoryHero` | The page is a working screen |
| Pair a claim with an image | `EditorialSection` | The image adds nothing to the claim |
| Walk through steps with a pinned image | `StorySequence` | The steps are short: use a list |
| Walk sideways through chapters | `HorizontalStory` | The chapters need close reading |
| Bring one paragraph forward as it scrolls in | `ScrollTextReveal` | The paragraph is long |
| Open a long page with its title and chapter list over a picture | `StoryCover` | There is one promise and one action: use `StoryHero` |
| Keep the chapter list in reach and show which chapter is being read | `ChapterRail` | The page has under four chapters |
| Invite exploring a set of related topics, each with a short detail | `TopicMap` | The reader must compare or read every item: use a list or `DataTable` |
| Show many images with depth | `ParallaxGallery` | Each image needs a caption |
| Leave images behind the pointer | `ImageTrail` | Touch is the main input |
| Invite wandering through a large set of images | `InfiniteCanvas` | The order matters or each image needs a caption |
| Let people open any image full screen and step through the set; `layout="masonry"` keeps mixed shapes | `Lightbox` | There are one or two images: show them large |
| Show one object or set from every side, one at a time | `RingGallery` | There are fewer than five images or more than twelve |
| Bring a set of images in with depth as the page scrolls | `StaggerGrid` | Each image needs a caption or the set is small |
| Turn a scattered set into order as a moment of arrival | `ScrollFormation` | There are fewer than six images or more than twelve |
| Step through a few large images with a signature change between them | `ImageTransition` | The images need captions or quick comparison |
| Prove a change by letting people wipe between two versions of one view | `BeforeAfter` | The two images differ in framing or size |
| Offer three to five equal paths, each with an image and a line | `ExpandingPanels` | Each path needs more than a sentence |
| Let people sort a short set of options into yes and no | `SwipeDeck` | The choice needs comparison side by side: use `ModelCompare` |
| Show any contract image at the right size and focal point | `BrandImage` | — |

### Present a product

| The page needs to | Use | Not when |
|---|---|---|
| Show a few strong points about a product in turn | `HighlightsGallery` | Each point needs close reading: use `EditorialSection` |
| Let the person look at a product from several sides | `ProductViewer` | There is only one picture |
| Offer related guides, stories or accessories to browse | `CardCarousel` | The items must be compared: use `ModelCompare` |
| Prove a claim with a few big numbers | `KeyFigures` | The number changes and needs a trend: use `StatCard` |
| Choose between models or kits, feature by feature | `ModelCompare` | There are many rows and sorting matters: use `DataTable` |
| Close a site with fine print, a way back up and every section | `FooterDirectory` | The page is a single landing page: a short footer is enough |

## Style for the purpose

The brand stays the same across these; its volume changes.

- **Working screens** (settings, orders, dashboards): the act, navigation, feedback and data components. Neutral surfaces, the accent only on the main action and the current place, and no effects. The person came to finish a task.
- **Agent screens**: the AI components inside a working screen. Show state in words as well as motion, and ask before acting.
- **Brand moments** (a launch, a signature offer): one effect or story component, chosen from the concept. Everything around it stays calm so it reads.
- **Story pages**: storytelling components carry the narrative; working components appear only for the action at the end.
- **Product pages**: a `SiteBar` and a sticky `ProductBar`, then the product components in a steady rhythm. One signature moment (a 3D stage, a film) carries the page; the rest stays quiet.

Every component takes colour, type and corners from the contract, so pick by job and let the contract carry the look. Do not restyle a component to make it stand out; if it must stand out, the job may call for a different component.

## Promote a pattern

When a piece built for one page works and a second page needs it, make it a shared component. Name it by the job it does, not by its shape. Move only the reusable behaviour and look into the component, using semantic tokens. The page keeps its own brand touches. Give it documentation, a demo, an entry in this guide and a test before calling it done.

## Other libraries

For controls the package does not cover, use the existing app's accessible foundation. For a new React application, consider shadcn/ui or React Aria before implementing custom behavior.

The private `workbench/references/` catalogue is optional research material and is not bundled with this plugin. Do not assume another user's filesystem contains it. Borrow a documented pattern; copy code only after checking the exact snapshot licence and recording required attribution. Restricted or custom licences do not become MIT merely because a component is renamed.

Existing Harry UI informed semantic tokens, complete states and responsive discipline. Brand Studio's components are newly authored, not a wholesale rename or publication of the reference catalogue.
