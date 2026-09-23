import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { FormEvent } from 'react';
import { ActionLink, BrandImage, BrandTheme, Button, EditorialSection, StoryHero, StorySequence, TextField } from '@brand-studio/ui';
import type { ImageAsset, StoryChapter } from '@brand-studio/ui';
import '@brand-studio/ui/styles.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import brand from '../../../plugins/brand-studio/skills/brand-design/assets/still.brand.json';
import './styles.css';
import { Edition } from './edition';
import { Deskhand, DeskhandHeader } from './deskhand';
import deskhand from './deskhand.brand.json';
import { Hollis } from './hollis';

const cup: ImageAsset = { src: '/images/cup.webp', srcSet: '/images/cup-768.webp 768w, /images/cup.webp 1536w', alt: 'A cobalt ceramic cup of coffee on a brushed steel counter in morning light.', width: 1536, height: 1024, focalPoint: '70% 50%' };
const beans: ImageAsset = { src: '/images/beans.webp', srcSet: '/images/beans-768.webp 768w, /images/beans.webp 1536w', alt: 'Roasted coffee beans on the steel counter, with the same cobalt cup behind them.', width: 1536, height: 1024 };
const pour: ImageAsset = { src: '/images/pour.webp', srcSet: '/images/pour-768.webp 768w, /images/pour.webp 1536w', alt: 'A slender stream of coffee pours into the cobalt cup.', width: 1536, height: 1024, focalPoint: '70% 50%' };
const chapters: StoryChapter[] = [
  { id: 'beans', label: 'Plate I · The bean', title: 'Start with the bean.', body: 'Small differences become the whole cup. Texture, aroma, and the moment a familiar ritual begins.', asset: beans },
  { id: 'pour', label: 'Plate II · The pour', title: 'Give it a moment.', body: 'The first pour. The slow bloom. A little attention changes an everyday drink into something worth pausing for.', asset: pour },
  { id: 'cup', label: 'Plate III · The cup', title: 'Make room for the first sip.', body: 'A warm cup. A clear counter. A moment that belongs to you, before the day asks for anything else.', asset: cup },
];

function ThemeControl({ mode, onChange }: { mode: 'light' | 'dark'; onChange: () => void }) {
  return <button className="theme-control" onClick={onChange} aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>{mode === 'light' ? 'Dark' : 'Light'}</button>;
}

function Coffee() {
  const [motion, setMotion] = useState<'auto' | 'off'>('auto');
  return <>
    <main id="main" tabIndex={-1}>
      <StoryHero variant="overlay" title={<>A still life, <span className="bs-tail">every morning.</span></>} description="One cup, one counter, one light. Coffee as a small, deliberate pause." asset={cup} action={<ActionLink href="#ritual" tone="inverse" shape="pill">See the ritual</ActionLink>} />
      <section className="coffee-intro bs-container" aria-labelledby="coffee-intro-title">
        <h2 id="coffee-intro-title">Good things take a little time. <span className="bs-tail">Still is about attention: to the bean, the making and the space in your day.</span></h2>
        <p className="bs-voice coffee-voice">Same cup. A closer look.</p>
      </section>
      <div className="motion-setting bs-container"><Button tone="secondary" shape="pill" aria-pressed={motion === 'off'} onClick={()=>setMotion(motion === 'auto' ? 'off' : 'auto')}>{motion === 'auto' ? 'Reduce motion' : 'Motion reduced'}</Button></div>
      <StorySequence title="One cup. Three plates." chapters={chapters} id="ritual" motion={motion} />
      <section className="coffee-rules bs-container" id="about" aria-labelledby="coffee-rules-title">
        <h2 id="coffee-rules-title">Three rules hold the world together. <span className="bs-tail">The crop and the light can change. These cannot.</span></h2>
        <ol>
          <li><span className="coffee-rules__index">I</span><h3>One cup.</h3><p>The same cobalt ceramic cup in every frame. The brand colour lives there and in the action you take.</p></li>
          <li><span className="coffee-rules__index">II</span><h3>One counter.</h3><p>Brushed steel, cleared of props. The surface stays so the eye settles on the coffee.</p></li>
          <li><span className="coffee-rules__index">III</span><h3>One light.</h3><p>Soft morning light from the left. Each plate moves closer; nothing else moves.</p></li>
        </ol>
      </section>
      <section className="coffee-finish" aria-labelledby="coffee-finish-title">
        <div className="bs-container"><h2 id="coffee-finish-title">Take a moment. <span>Make it yours.</span></h2><ActionLink href="#ritual" tone="inverse" shape="pill">See the ritual again</ActionLink></div>
      </section>
    </main>
    <footer className="site-footer bs-container"><a href="/">Brand Studio</a><p>Still is a fictional brand study. Original generated imagery; no real shop or product claims.</p><a href="/#system">See the system</a></footer>
  </>;
}

function FormDemo() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {setError('Enter an email address, such as hello@example.com.'); setSaved(false); return;}
    setError(''); setSaved(true);
  };
  return <form className="form-demo" noValidate onSubmit={submit}><TextField label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={e=>{setEmail(e.target.value);setSaved(false);setError('');}} error={error} hint="Local component demo. Nothing is sent or stored." /><Button type="submit">Check address</Button><p role="status">{saved ? 'Valid address. This demo does not subscribe you.' : error ? 'Please correct the email address above.' : ''}</p></form>;
}

function Studio() {
  return <>
    <main id="main" tabIndex={-1}>
      <section className="studio-hero bs-container">
        <div className="studio-hero__copy"><p className="studio-label">A system for your story</p><h1>Make it feel<br />like one brand.</h1><p>From the first image to the last interaction. A UI library and an AI design workflow, built to belong together.</p><ActionLink href="/coffee">Explore the coffee study</ActionLink></div>
        <a href="/coffee" className="study-cover" aria-label="Open Still, the coffee brand study"><BrandImage asset={cup} priority /><span className="study-cover__name" aria-hidden="true">Still.</span></a>
      </section>
      <section className="system-section bs-container" id="system"><h2>Decide once.<br />Design with it everywhere.</h2><div className="system-columns"><article><span className="system-caption">The foundation</span><h3>Brand Studio UI</h3><p>Typed React components for image-led stories. Shared tokens, deliberate mobile layouts, and motion with a static fallback.</p><a href="#components">Explore the components</a></article><article><span className="system-caption">The direction</span><h3>Brand Studio plugin</h3><p>A shared workflow for Codex and Claude: define the identity, plan the story, direct the imagery, then check the result.</p><a href="#workflow">Explore the workflow</a></article></div></section>
      <section className="asset-section bs-container" id="imagery"><div><h2>One photographic world.</h2><p className="section-description">The same cup, steel surface and morning light. Three views of one ritual, guided by a shared reference image.</p></div><div className="asset-strip">{[{asset:beans,label:'The material'},{asset:pour,label:'The making'},{asset:cup,label:'The moment'}].map(({asset,label})=><figure key={label}><BrandImage asset={asset} /><figcaption>{label}</figcaption></figure>)}</div></section>
      <section className="component-section bs-container" id="components"><h2>Small parts.<br />A shared character.</h2><p className="section-description">Change the brand contract and the system follows. Try the theme switch, button states and a real validation flow.</p><div className="component-examples"><article className="component-panel"><h3>Actions</h3><div className="button-demo"><Button onClick={()=>document.getElementById('workflow')?.scrollIntoView()}>See the workflow</Button><ActionLink tone="secondary" href="/coffee">View the study</ActionLink><Button disabled>Unavailable</Button><Button loading>Saving</Button></div><p>One accent. Predictable feedback. Clear keyboard focus.</p></article><article className="component-panel"><h3>A useful form</h3><FormDemo /></article></div><details className="api-details"><summary>All eight components and their purpose</summary><dl>{[['BrandTheme','Scoped light, dark and system tokens.'],['Button','Actions, disabled and loading states.'],['ActionLink','Navigation with a clear visual priority.'],['TextField','Labels, hints and connected error messages.'],['BrandImage','Responsive sources, dimensions and focal points.'],['StoryHero','One promise, one image and a clear action.'],['EditorialSection','A focused text and image composition.'],['StorySequence','A shared desktop image stage; inline mobile chapters.']].map(([name,description])=><div key={name}><dt><code>{name}</code></dt><dd>{description}</dd></div>)}</dl></details></section>
      <section className="workflow-section bs-container" id="workflow"><h2>A brief becomes<br />a coherent experience.</h2><ol>{[['Understand the brand','Audience, promise, evidence and voice. A clear point of view before a palette.'],['Shape the story','Every chapter answers a question. Every transition has a reason.'],['Make the visual world','Reference-guided images, shared materials, careful crops and consistent light.'],['Build and check','Reusable components, responsive composition, keyboard access and reduced motion.']].map(([title,body])=><li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol><div className="plugin-invoke"><p>Try it in Claude Code after loading the local plugin</p><code>/brand-studio:brand-design</code><p>In Codex, select the Brand Studio skill after installing the local package.</p></div></section>
    </main>
    <footer className="site-footer bs-container"><strong>Brand Studio</strong><p>An original library and design workflow by Hung Duong.</p><a href="/coffee">View the brand study</a></footer>
  </>;
}

function App() {
  const [mode,setMode] = useState<'light' | 'dark'>(()=>window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const path = window.location.pathname;
  const edition = path === '/edition';
  const coffee = path === '/coffee' || edition;
  if (path === '/hollis') return <Hollis />;
  if (path === '/deskhand') return <BrandTheme palette={deskhand.tokens} mode="light">
    <a className="skip-link" href="#main">Skip to content</a>
    <DeskhandHeader />
    <Deskhand />
  </BrandTheme>;
  return <BrandTheme palette={brand.tokens} mode={edition ? 'dark' : mode}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><a className={coffee ? 'wordmark wordmark--coffee' : 'wordmark'} href={coffee ? '/coffee' : '/'}>{coffee ? 'Still.' : 'Brand Studio'}</a><nav aria-label="Main navigation">{coffee ? <><a href={edition ? '/coffee#ritual' : '#ritual'}>The ritual</a><a href="/edition" aria-current={edition ? 'page' : undefined}>The edition</a><a href="/">The studio</a></> : <><a href="#system">System</a><a href="#components">Components</a><a href="/coffee">Study</a></>}</nav>{!edition && <ThemeControl mode={mode} onChange={()=>setMode(mode==='light'?'dark':'light')} />}</header>
    {edition ? <Edition /> : coffee ? <Coffee /> : <Studio />}
  </BrandTheme>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
