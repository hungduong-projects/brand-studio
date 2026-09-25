'use client';

import { useState } from 'react';
import { agentPrompt } from '@/lib/agent-prompt';
import { Check, Copy } from 'lucide-react';

/** Copies the agent setup prompt. Sits beside the npm badge on the home page. */
export function AgentPromptButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return <button type="button" className="hero__badge hero__prompt" onClick={copy}>
    {copied ? <Check aria-hidden="true" size={13} /> : <Copy aria-hidden="true" size={13} />}
    {copied ? 'Prompt copied' : 'Copy agent prompt'}
  </button>;
}
