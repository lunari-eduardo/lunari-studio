import sys

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/leads/DraggableLeadCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('onSendProposal?: () => void;', 'onSendProposal?: () => void;\n  onMoveToHistory?: () => void;')
content = content.replace('onSendProposal,', 'onSendProposal,\n  onMoveToHistory,')
content = content.replace('onSendProposal={onSendProposal}', 'onSendProposal={onSendProposal}\n      onMoveToHistory={onMoveToHistory}')

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/leads/DraggableLeadCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
