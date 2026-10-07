// /jobs/legal (H4, V8): documents by URL, anchors, the scroll spy, the Next card, one source with the phone app.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { legalDocs, PRIVACY, TERMS } from '@ned/core/legal/copy.ts';
import { FEATURES } from '../../config.ts';
import { DRAFT_NOTICE, docFromUrl, Legal, LEGAL_INTRO, sectionId } from '../pages/Legal.tsx';

let where = '';
function Spy() {
  const l = useLocation();
  where = l.search + l.hash;
  return null;
}
const show = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/jobs/legal"
          element={
            <>
              <Legal />
              <Spy />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
const toc = () => within(screen.getByRole('complementary', { name: 'On this page' })).getAllByRole('link');
const docTitle = () => screen.getByRole('heading', { level: 2 }).textContent;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Legal page', () => {
  it('heading, intro, draft notice, four document cards; Terms by default with the shipped text', () => {
    show('/jobs/legal');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Legal, in plain words');
    expect(screen.getByText(LEGAL_INTRO)).toBeTruthy();
    expect(screen.getByRole('note').textContent).toBe(DRAFT_NOTICE);
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.split(/(?=[A-Z][a-z]+ )/)[0])).toHaveLength(4);
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain('Terms of use');
    expect(docTitle()).toBe('Terms of use');
    expect(toc().map((a) => a.textContent)).toEqual(TERMS.map((s, i) => `0${i + 1}${s.title}`));
    expect(screen.getByRole('heading', { level: 3, name: TERMS[2].title }).closest('section')?.id).toBe('lg-terms-3');
    expect(document.body.textContent).toContain(TERMS[1].body[0]);
    expect(screen.getByRole('complementary').textContent).toContain('[team email]');
  });

  it('each document opens by URL; a section anchor opens its document and scrolls to it', () => {
    vi.useFakeTimers();
    for (const d of legalDocs(FEATURES.dispute)) {
      show(`/jobs/legal?doc=${d.id}`);
      expect(docTitle()).toBe(d.title);
      expect(toc()).toHaveLength(d.sections.length);
      cleanup();
    }
    show('/jobs/legal#lg-privacy-3');
    expect(docTitle()).toBe('Privacy notice');
    act(() => vi.advanceTimersByTime(100));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(docFromUrl(new URLSearchParams('doc=nope'), '')).toBe('terms');
    expect(sectionId('rules', 2)).toBe('lg-rules-2');
  });

  it('cards and the Next card switch the document in the URL', () => {
    show('/jobs/legal?doc=disclosures');
    fireEvent.click(screen.getByRole('button', { name: /Read it/ }));
    expect(where).toBe('?doc=rules');
    expect(docTitle()).toBe('Job posting rules');
    expect(screen.getByText(/Next:/).textContent).toBe('Next: Terms of use');
    fireEvent.click(screen.getByRole('tab', { name: /Privacy notice/ }));
    expect(where).toBe('?doc=privacy');
    expect(toc()).toHaveLength(PRIVACY.length);
  });

  it('the table of contents follows the scroll (spy line 170 px) and links write the anchor', () => {
    show('/jobs/legal?doc=terms');
    const tops: Record<string, number> = { 'lg-terms-1': -400, 'lg-terms-2': -100, 'lg-terms-3': 150, 'lg-terms-4': 600 };
    TERMS.forEach((_, i) => {
      const id = sectionId('terms', i + 1);
      document.getElementById(id)!.getBoundingClientRect = () => ({ top: tops[id] ?? 1000 + i * 200 }) as DOMRect;
    });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(toc().find((a) => a.getAttribute('aria-current') === 'true')?.getAttribute('href')).toBe('#lg-terms-3');
    fireEvent.click(toc()[4]);
    expect(where).toBe('?doc=terms#lg-terms-5');
  });
});
