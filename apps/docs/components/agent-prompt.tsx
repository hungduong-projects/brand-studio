'use client';

import { useState } from 'react';
import { agentPrompt } from '@/lib/agent-prompt';

/** Copies the agent setup prompt. Sits beside the npm badge on the home page. */
export function AgentPromptButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return <button type="button" className="hero__badge hero__prompt" onClick={copy}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {copied ? <path d="M20 6 9 17l-5-5" /> : <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>}
    </svg>
    {copied ? 'Prompt copied' : 'Copy agent prompt'}
  </button>;
}
