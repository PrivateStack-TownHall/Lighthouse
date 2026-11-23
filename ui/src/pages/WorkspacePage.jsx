import { useCallback, useMemo, useState } from 'react';
import { SlidersHorizontal, Files, WandSparkles, Eye } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { QueryState } from '../components/QueryState.jsx';
import { useToast } from '../components/ui/toast-context.js';
import { ApiError } from '../lib/api-client.js';
import { toastMessageFor } from '../lib/error-messages.js';
import { stableStringify } from '../helpers/index.js';
import { ConfigurationCard, useOptions, useConfigState, useCompatibility, errorsByPath } from '../features/configuration/index.js';
import { GeneratePanel, Stepper, OutputList, ResultSummary, ExportPanel, PreviewModal, useGenerate, filesOf, downloadText, downloadZip, copyText, joinFiles } from '../features/generator/index.js';
import { useAutosave } from '../features/projects/index.js';
import { LoginPage } from './LoginPage.jsx';

export function WorkspacePage() {
  const toast = useToast();
  const options = useOptions();
  const { config, clean, dispatch } = useConfigState();
  const signInNeeded = options.error instanceof ApiError && options.error.code === 'UNAUTHORIZED';
  const check = useCompatibility(clean, Boolean(options.data));
  const onLoaded = useCallback((saved) => dispatch({ type: 'load', config: saved }), [dispatch]);
  const { saveState } = useAutosave({ clean, onLoaded, enabled: Boolean(options.data) });
  const generateMutation = useGenerate();

  const [result, setResult] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [zipping, setZipping] = useState(false);

  const key = stableStringify(clean);
  const stale = Boolean(result) && generatedKey !== key;
  const checkData = check.data;
  const errors = useMemo(() => (checkData && !checkData.ok ? errorsByPath(checkData.errors).byPath : {}), [checkData]);
  const selectedCount = clean.outputs.length;

  if (signInNeeded) return <LoginPage />;

  const steps = [
    { title: 'Configure', icon: SlidersHorizontal },
    { title: 'Select Output', icon: Files },
    { title: 'Generate', icon: WandSparkles },
    { title: 'Review & Export', icon: Eye },
  ];
  const disabledReason = checkData && !checkData.ok ? 'Fix the configuration first (see the highlighted fields and Compatibility).'
    : !selectedCount ? 'Select at least one output.' : null;

  const run = () => generateMutation.mutate({ config: clean }, {
    onSuccess: (data) => { setResult(data); setGeneratedKey(key); toast.success(`Generated ${data.files.length} files for ${clean.project.name}`); },
    onError: (e) => toast.error(e.details?.[0]?.message ?? toastMessageFor(e)),
  });

  const slug = clean.project.slug || 'project';
  const outputs = options.data?.outputs ?? [];
  const previewOutput = outputs.find((o) => o.id === previewId);
  const actions = {
    onPreview: (o) => setPreviewId(o.id),
    onCopy: async (o) => { const files = filesOf(result, o.id); await copyText(files.length > 1 ? joinFiles(files) : files[0].content); toast.success(`${o.title} copied`); },
    onDownload: async (o) => {
      const files = filesOf(result, o.id);
      if (o.id.endsWith('/')) await downloadZip(files, slug, `${slug}-prompts.zip`);
      else downloadText(files[0].content, files[0].path);
    },
  };
  const exportZip = async () => {
    setZipping(true);
    try { await downloadZip(result.files, slug, `${slug}-contract-kit.zip`); toast.success('ZIP exported'); } finally { setZipping(false); }
  };
  const exportMd = () => { downloadText(result.markdown, `${slug}-contract-kit.md`); toast.success('Markdown exported'); };

  return (
    // One window on wide screens: the page never scrolls, each panel scrolls inside (overflow-y).
    <div className="flex min-h-dvh flex-col bg-page lg:h-dvh lg:overflow-hidden">
      <AppHeader />
      <QueryState isLoading={options.isLoading} error={options.error} onRetry={options.refetch}>
        {options.data && (
          <main className="grid w-full grid-cols-[minmax(0,1fr)] gap-3 p-2 sm:p-3 sm:pt-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]">
            <ConfigurationCard config={config} dispatch={dispatch} options={options.data} check={checkData} checking={check.isStale} errors={errors} saveState={saveState} />

            <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-3 shadow-lg sm:p-4 lg:min-h-0" aria-label="Generate">
              <GeneratePanel onGenerate={run} loading={generateMutation.isPending} disabledReason={disabledReason} />
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-gray-100/70 p-2.5 lg:flex-row lg:items-center lg:gap-3">
                <Stepper steps={steps} />
                <ResultSummary result={result} stale={stale} />
              </div>
              <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto scrollbar-thin">
                <OutputList outputs={outputs} selected={clean.outputs} onToggle={(id) => dispatch({ type: 'toggleOutput', id })} result={stale ? null : result} {...actions} />
              </div>
              <ExportPanel disabled={!result || stale} onZip={exportZip} onMarkdown={exportMd} zipping={zipping} />
            </section>
          </main>
        )}
      </QueryState>

      <PreviewModal output={previewOutput} files={previewOutput ? filesOf(result, previewOutput.id) : []} onClose={() => setPreviewId(null)}
        onCopyFile={async (f) => { await copyText(f.content); toast.success(`${f.path} copied`); }}
        onDownloadFile={(f) => downloadText(f.content, f.path.split('/').pop())} />
    </div>
  );
}
