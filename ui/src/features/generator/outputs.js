import { FileText, Network, Share2, CodeXml, Bot, Layers } from 'lucide-react';

/** Look of each output row (catalog and availability come from GET /api/options). */
export const OUTPUT_LOOK = {
  'PROJECT_CONTRACT.md': { icon: FileText, tile: 'from-beacon-50 to-beacon-100 text-beacon-600' },
  'ARCHITECTURE.md': { icon: Network, tile: 'from-info/5 to-info/15 text-info' },
  'SYSTEM_DESIGN.md': { icon: Share2, tile: 'from-violet-100/60 to-violet-100 text-violet-600' },
  'DEVELOPMENT_STANDARDS.md': { icon: CodeXml, tile: 'from-success/5 to-success/15 text-success' },
  'MASTER_PROMPT.md': { icon: Bot, tile: 'from-beacon-50 to-beacon-100 text-beacon-600' },
  'PROMPTS/': { icon: Layers, tile: 'from-violet-100/60 to-violet-100 text-violet-600' },
};

/** Files of one output in a generation result. */
export const filesOf = (result, outputId) => (result?.files ?? []).filter((f) => (outputId.endsWith('/') ? f.path.startsWith(outputId) : f.path === outputId));
