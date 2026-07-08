import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  FileDownloadOutlined as DownloadIcon,
  FileUploadOutlined as UploadIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  SiteConfigSchema,
} from '@simple-site/interfaces';
import { loadDraftConfig, saveDraftConfig } from '../../../services/configVersionService';
import { useNotifications } from '../../../hooks/useNotifications';
import { PageRail } from './PageRail';
import { PageSettingsForm } from './PageSettingsForm';
import { SectionPreview } from './SectionPreview';
import { SectionEditorPanel } from './SectionEditorPanel';
import { createPage, createSection, moveItem, pagesAreValid, validatePages } from './pagesDraft';
import { downloadPageJson, downloadPagesJson, parsePageFile, parsePagesFile } from './pagesImportExport';

/**
 * Pages tab of /manage/site: a full page & section editor. Reads the working
 * draft (`GET /api/config/draft`), lets the admin add/remove/reorder pages and
 * their sections and edit one section at a time with a live preview, then saves
 * the whole draft (`POST /api/config`) — re-fetching first so concurrent edits to
 * `site`/`themes` are preserved. Changes go live only when published from the
 * Config Versions panel.
 */
export const PagesEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [pages, setPages] = useState<PageConfiguration[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [deletePageIndex, setDeletePageIndex] = useState<number | null>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [importAnchor, setImportAnchor] = useState<null | HTMLElement>(null);
  const [replacePages, setReplacePages] = useState<PageConfiguration[] | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addPageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => { if (active) setPages(config.pages); })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.pages.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const errors = useMemo(() => validatePages(pages), [pages]);
  const currentPage: PageConfiguration | undefined = pages[selectedPage];

  const updatePage = (index: number, next: PageConfiguration) =>
    setPages((prev) => prev.map((p, i) => (i === index ? next : p)));

  const addPage = () => {
    setPages((prev) => {
      const page = createPage(prev.map((p) => p.route), prev.map((p) => p.pageName));
      setSelectedPage(prev.length);
      setSelectedSection(null);
      return [...prev, page];
    });
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    setSelectedPage((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    setSelectedSection(null);
  };

  const movePage = (from: number, to: number) => {
    setPages((prev) => moveItem(prev, from, to));
    setSelectedPage((prev) => (prev === from ? to : prev));
    setSelectedSection(null);
  };

  const selectPage = (index: number) => {
    setSelectedPage(index);
    setSelectedSection(null);
  };

  const addSection = (type: SectionType) => {
    if (!currentPage) return;
    const section = createSection(type, currentPage.sections.map((s) => s.sectionName));
    updatePage(selectedPage, { ...currentPage, sections: [...currentPage.sections, section] });
    setSelectedSection(currentPage.sections.length);
  };

  const removeSection = (index: number) => {
    if (!currentPage) return;
    updatePage(selectedPage, { ...currentPage, sections: currentPage.sections.filter((_, i) => i !== index) });
    setSelectedSection((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const moveSection = (from: number, to: number) => {
    if (!currentPage) return;
    const sections = moveItem(currentPage.sections, from, to);
    if (sections === currentPage.sections) return;
    updatePage(selectedPage, { ...currentPage, sections });
    setSelectedSection((prev) => (prev === from ? to : prev));
  };

  const changeSection = (index: number, next: SectionProps<SectionType>) => {
    if (!currentPage) return;
    updatePage(selectedPage, {
      ...currentPage,
      sections: currentPage.sections.map((s, i) => (i === index ? next : s)),
    });
  };

  const exportAll = () => { setExportAnchor(null); downloadPagesJson(pages); };
  const exportCurrent = () => { setExportAnchor(null); if (currentPage) downloadPageJson(currentPage); };

  const onReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = parsePagesFile(await file.text());
    if (!res.ok) { notify.error(intl.formatMessage({ id: 'page.manage.pages.import.error' })); return; }
    setReplacePages(res.pages);
  };

  const confirmReplace = () => {
    if (!replacePages) return;
    setPages(replacePages);
    setSelectedPage(0);
    setSelectedSection(null);
    setShowErrors(false);
    setReplacePages(null);
    notify.success(intl.formatMessage({ id: 'page.manage.pages.import.success' }));
  };

  const onAddPageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = parsePageFile(await file.text());
    if (!res.ok) { notify.error(intl.formatMessage({ id: 'page.manage.pages.import.error' })); return; }
    setPages((prev) => {
      setSelectedPage(prev.length);
      setSelectedSection(null);
      return [...prev, res.page];
    });
    notify.success(intl.formatMessage({ id: 'page.manage.pages.import.pageSuccess' }));
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (!pagesAreValid(errors)) {
      notify.error(intl.formatMessage({ id: 'page.manage.pages.error.invalid' }));
      return;
    }
    setSubmitting(true);
    try {
      // Re-fetch so a concurrent edit to site/themes on the draft isn't clobbered.
      const current = await loadDraftConfig();
      const nextConfig = SiteConfigSchema.parse({ ...current, pages });
      await saveDraftConfig(nextConfig);
      notify.success(intl.formatMessage({ id: 'page.manage.pages.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.pages.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<UploadIcon />} onClick={(e) => setImportAnchor(e.currentTarget)}>
          <FormattedMessage id="page.manage.pages.import" />
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} disabled={pages.length === 0} onClick={(e) => setExportAnchor(e.currentTarget)}>
          <FormattedMessage id="page.manage.pages.export" />
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={submitting}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.pages.save" />}
        </Button>
      </Stack>

      <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
        <MenuItem onClick={exportAll}><FormattedMessage id="page.manage.pages.export.all" /></MenuItem>
        <MenuItem onClick={exportCurrent} disabled={!currentPage}><FormattedMessage id="page.manage.pages.export.page" /></MenuItem>
      </Menu>
      <Menu anchorEl={importAnchor} open={Boolean(importAnchor)} onClose={() => setImportAnchor(null)}>
        <MenuItem onClick={() => { setImportAnchor(null); replaceInputRef.current?.click(); }}>
          <FormattedMessage id="page.manage.pages.import.replace" />
        </MenuItem>
        <MenuItem onClick={() => { setImportAnchor(null); addPageInputRef.current?.click(); }}>
          <FormattedMessage id="page.manage.pages.import.addPage" />
        </MenuItem>
      </Menu>
      <input ref={replaceInputRef} type="file" accept="application/json,.json" hidden onChange={onReplaceFile} />
      <input ref={addPageInputRef} type="file" accept="application/json,.json" hidden onChange={onAddPageFile} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Paper variant="outlined" sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0, p: 1, alignSelf: 'stretch' }}>
          <PageRail
            pages={pages}
            errors={errors}
            showErrors={showErrors}
            selectedIndex={selectedPage}
            onSelect={selectPage}
            onAdd={addPage}
            onRemove={(i) => setDeletePageIndex(i)}
            onMove={movePage}
          />
        </Paper>

        <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
          {currentPage ? (
            <>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <PageSettingsForm
                  page={currentPage}
                  errors={errors[selectedPage] ?? {}}
                  showErrors={showErrors}
                  onChange={(next) => updatePage(selectedPage, next)}
                />
              </Paper>
              <SectionPreview
                page={currentPage}
                selectedSectionIndex={selectedSection}
                onSelectSection={setSelectedSection}
                onMoveSection={moveSection}
                onRemoveSection={removeSection}
                onAddSection={addSection}
              />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
              <FormattedMessage id="page.manage.pages.empty" />
            </Typography>
          )}
        </Box>

        <Paper variant="outlined" sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, p: 2, alignSelf: 'stretch' }}>
          {currentPage && (
            <SectionEditorPanel page={currentPage} sectionIndex={selectedSection} onChangeSection={changeSection} />
          )}
        </Paper>
      </Stack>

      <Dialog open={deletePageIndex !== null} onClose={() => setDeletePageIndex(null)} maxWidth="xs" fullWidth>
        <DialogTitle><FormattedMessage id="page.manage.pages.confirmDelete.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id="page.manage.pages.confirmDelete.body"
              values={{ name: deletePageIndex !== null ? (pages[deletePageIndex]?.menuTitle || pages[deletePageIndex]?.route) : '' }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePageIndex(null)}><FormattedMessage id="page.manage.pages.confirmDelete.cancel" /></Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { if (deletePageIndex !== null) removePage(deletePageIndex); setDeletePageIndex(null); }}
          >
            <FormattedMessage id="page.manage.pages.confirmDelete.confirm" />
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={replacePages !== null} onClose={() => setReplacePages(null)} maxWidth="xs" fullWidth>
        <DialogTitle><FormattedMessage id="page.manage.pages.import.replaceTitle" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage id="page.manage.pages.import.replaceBody" values={{ count: replacePages?.length ?? 0 }} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplacePages(null)}><FormattedMessage id="page.manage.pages.cancel" /></Button>
          <Button variant="contained" onClick={confirmReplace}>
            <FormattedMessage id="page.manage.pages.import.replaceConfirm" />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
