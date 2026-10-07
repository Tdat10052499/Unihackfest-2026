import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { WalletPanelProvider } from '../../components/WalletPanelContext.tsx';
import { SCENARIOS, scenarioView } from '../../dev/states.ts';
import { png } from '../../lib/__tests__/images.ts';
import { MESSAGES, OVERRIDE_LABEL, writePngMarker } from '../../lib/preview.ts';
import { FILES_HINT, GUIDE_TITLE, PREVIEW_LINK_HINT, SubmitView, WHAT_THEY_SEE, workTypeForCategory, type SubmitMode, type WorkType } from '../Submit.tsx';
import { PREVIEW_LINK_NEEDED, type DeliveryDraft } from '@ned/core/milestone/content.ts';

afterEach(cleanup);
const wrap = (ui: ReactNode) => render(<WalletPanelProvider><MemoryRouter>{ui}</MemoryRouter></WalletPanelProvider>);
const S = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const FUND = S('funded').fund.address.toBase58();

function view(id: string, mode: SubmitMode, type?: WorkType, extra: Partial<Parameters<typeof SubmitView>[0]> = {}) {
  const s = S(id);
  const onSend = vi.fn(async () => {});
  const content = { hasKey: true, contentStatus: 'ok' as const, content: s.content, importKey: async () => false };
  wrap(<SubmitView fund={scenarioView(s, 'freelancer')} raw={s.fund} index={0} now={s.now} vn={false} content={content} mode={mode} {...(type ? { initialType: type } : {})} status="" onSend={onSend} {...extra} />);
  return onSend;
}
const drop = async (section: HTMLElement, file: File) => {
  const input = section.querySelector('input[type=file]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};
const submitButton = () => screen.getByRole('button', { name: /^Submit milestone 1$/ }) as HTMLButtonElement;

describe('Submit page (U2, U5, U6)', () => {
  it('work type picker; a job category picks the type', () => {
    view('funded', 'submit');
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Design', 'Writing & translation', 'Code', 'Video', 'Other']);
    expect(screen.getByRole('radio', { name: 'Other' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByTestId('preview-check')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Design' }));
    expect(screen.getByTestId('preview-check')).toBeTruthy();
    expect([0, 1, 2, 4, 5].map(workTypeForCategory)).toEqual(['design', 'code', 'writing', 'video', 'other']);
  });

  it('Design: Submit waits for the checks; each check shows its exact message', async () => {
    view('funded', 'submit', 'design');
    expect(submitButton().disabled).toBe(true);
    const section = screen.getByTestId('preview-check');
    await drop(section, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    await waitFor(() => expect(screen.getByTestId('problem-source').textContent).toBe(MESSAGES.source));
    expect(screen.queryByRole('button', { name: 'Add watermark' })).toBeNull();
    await drop(section, new File([png(2000, 1400) as BlobPart], 'logo.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByTestId('problem-size').textContent).toBe(MESSAGES.size));
    expect(screen.getByTestId('problem-watermark').textContent).toBe(MESSAGES.watermark);
    expect(submitButton().disabled).toBe(true);
  });

  it('Add watermark downloads <name>-preview.png, the marked file passes, Submit opens', async () => {
    const makeWatermark = vi.fn(async () => new Blob([writePngMarker(png(1200, 840), FUND) as BlobPart], { type: 'image/png' }));
    const download = vi.fn();
    view('funded', 'submit', 'design', { makeWatermark, download });
    await drop(screen.getByTestId('preview-check'), new File([png(2000, 1400) as BlobPart], 'logo.png', { type: 'image/png' }));
    await waitFor(() => screen.getByRole('button', { name: 'Add watermark' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add watermark' }));
    });
    await waitFor(() => expect(screen.getByTestId('preview-passed')).toBeTruthy());
    expect(makeWatermark).toHaveBeenCalledWith(expect.any(Blob), 'Logo refresh', FUND);
    expect(download.mock.calls[0][1]).toBe('logo-preview.png');
    expect(submitButton().disabled).toBe(false);
    expect(screen.getAllByText(/the checked preview/).length).toBeGreaterThan(0);
  });

  it('the override tick opens Submit without a preview', () => {
    view('funded', 'submit', 'design');
    expect(submitButton().disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(OVERRIDE_LABEL));
    expect(submitButton().disabled).toBe(false);
  });

  it('link checks for every type: Drive folder and unknown host', () => {
    view('funded', 'submit', 'writing');
    const add = (url: string) => {
      fireEvent.change(screen.getByLabelText('Add a link'), { target: { value: url } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    };
    add('https://drive.google.com/drive/folders/final');
    add('https://example.com/portfolio');
    add('https://docs.google.com/document/d/x/view');
    expect(screen.getAllByTestId('link-warning').map((w) => w.textContent)).toEqual([MESSAGES.driveFolder, MESSAGES.unknownHost]);
  });

  it('the guide sheet, three optional ticks that never block, Files (optional)', () => {
    view('funded', 'submit');
    fireEvent.click(screen.getByRole('button', { name: GUIDE_TITLE }));
    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain('Share a preview on Google Drive');
    expect(within(sheet).getAllByRole('row')).toHaveLength(5);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Got it' }));
    expect(screen.getByLabelText('Each done-when point is covered.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Files (optional)' })).toBeTruthy();
    expect(screen.getByText(new RegExp(FILES_HINT('@mia').slice(0, 40)))).toBeTruthy();
    expect(submitButton().disabled).toBe(false);
  });
});

describe('D27 modes', () => {
  it('revision: own title and copy, the client request, sends', async () => {
    const send = view('changes', 'revision');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Send revised version');
    expect(screen.getByTestId('mode-info').textContent).toContain('The fingerprint saved at submit does not change');
    expect(screen.getByText('The dark background version is missing, and the icon breaks up at 32 px.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Add a link'), { target: { value: 'https://www.figma.com/file/abc/Logo?version-id=2290' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send revised version' }));
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it('handover: own title and copy, no preview gate even for design', () => {
    view('released', 'handover', 'design');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hand over final files');
    expect(screen.getByTestId('mode-info').textContent).toBe('Share the final files now. @mia can check them against the fingerprints you committed when you submitted.');
    expect(screen.queryByTestId('preview-check')).toBeNull();
    expect((screen.getByRole('button', { name: 'Hand over final files' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('R2 preview link', () => {
  const addLink = (url: string) => {
    fireEvent.change(screen.getByLabelText('Add a link'), { target: { value: url } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  };

  it('Submit cannot be sent without a link, even with files; the field says what to paste', async () => {
    const send = view('funded', 'submit', 'writing');
    expect(screen.getByRole('heading', { name: /Preview link/ }).textContent).toContain('required');
    expect(screen.getByText(PREVIEW_LINK_HINT)).toBeTruthy();
    await drop(screen.getByRole('region', { name: /Files \(optional\)/ }), new File(['draft'], 'draft.docx'));
    await waitFor(() => expect(screen.getByText('draft.docx')).toBeTruthy());
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText(PREVIEW_LINK_NEEDED)).toBeTruthy();
  });

  it('the first link shows "This is what {client} will see" with a PreviewFrame that loads only on click', async () => {
    const send = view('funded', 'submit', 'writing');
    addLink('https://drive.google.com/file/d/1AbC/view?usp=sharing');
    const box = screen.getByTestId('submit-preview');
    expect(box.textContent).toContain(WHAT_THEY_SEE('@mia'));
    expect(within(box).getByTestId('preview-frame').textContent).toContain('Google Drive');
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(within(box).getByRole('button', { name: 'Load preview' }));
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://drive.google.com/file/d/1AbC/preview');
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it('revision also needs a link', async () => {
    const send = view('changes', 'revision');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send revised version' }));
    });
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText(PREVIEW_LINK_NEEDED)).toBeTruthy();
  });

  it('handover still works with files only', async () => {
    const send = view('released', 'handover');
    expect(screen.queryByTestId('submit-preview')).toBeNull();
    await drop(screen.getByRole('region', { name: /Files \(optional\)/ }), new File(['svg'], 'logo-final.svg'));
    await waitFor(() => expect(screen.getByText('logo-final.svg')).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hand over final files' }));
    });
    expect(send).toHaveBeenCalledOnce();
    expect((send.mock.calls as unknown as [DeliveryDraft][])[0][0]).toMatchObject({ links: [], files: [{ name: 'logo-final.svg' }] });
  });
});
