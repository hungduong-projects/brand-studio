import { AgentThinking } from '@brand-studio/ui';

export default function AgentThinkingSizes() {
  return (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'start' }}>
      <AgentThinking size={20} label="Searching 14 orders" />
      <AgentThinking size={48} state="listening" />
      <AgentThinking size={96} state="speaking" />
    </div>
  );
}
