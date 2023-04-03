import { calculateElementOffset } from '@textcomplete/utils';
import { t } from 'app/i18next-t';
import { allNotesHashtagsSelector } from 'app/inventory/selectors';
import { maxLength } from 'app/item-popup/NotesArea';
import { useIsPhonePortrait } from 'app/shell/selectors';
import { isWindows, isiOSBrowser } from 'app/utils/browsers';
import { ChangeEvent, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import TextareaAutosize from 'react-textarea-autosize';
import { PressTipRoot } from './PressTip';
import { WithSymbolsPicker } from './destiny-symbols/SymbolsPicker';
import { useAutocomplete } from './text-complete/text-complete';
import styles from './useBulkNote.m.scss';
import useDialog, { Body, Buttons, Title } from './useDialog';

export interface BulkNoteResult {
  note: string;
  /**
   * 'replace' replaces the entire note with the new note.
   * 'append' adds the new note to the end of the existing note.
   * 'remove' removes any part of the note that matches the new note.
   */
  appendMode: 'replace' | 'append' | 'remove';
}

export default function useBulkNote(): [
  element: React.ReactNode,
  prompt: () => Promise<BulkNoteResult | null>
] {
  const [dialog, showDialog] = useDialog<void, BulkNoteResult | null>((_args, close) => (
    <BulkNoteDialog close={close} />
  ));

  const prompt = () => showDialog();

  return [dialog, prompt];
}

function BulkNoteDialog({ close }: { close: (result: BulkNoteResult | null) => void }) {
  const [note, setNote] = useState('');
  const [appendMode, setAppendMods] = useState<BulkNoteResult['appendMode']>('replace');

  const cancel = useCallback(() => close(null), [close]);
  const ok = useCallback(() => close({ note, appendMode }), [appendMode, close, note]);

  const okButton = (
    <button className="dim-button dim-button-primary" type="button" onClick={ok} autoFocus>
      {t('Dialog.OK')}
    </button>
  );

  const cancelButton = (
    <button className="dim-button" type="button" onClick={cancel}>
      {t('Dialog.Cancel')}
    </button>
  );

  // TODO: symbol picker, #tag
  // TODO: use the note editor?
  const handleRadioChange = (e: ChangeEvent<HTMLInputElement>) =>
    setAppendMods(e.currentTarget.value as BulkNoteResult['appendMode']);

  // TODO: better title style
  return (
    <>
      <Title>{t('BulkNote.Title')}</Title>
      <Body>
        <NotesEditor notes={note} onNotesChanged={setNote} />
        <div>
          <label>
            <input
              type="radio"
              name="appendmode"
              value="replace"
              checked={appendMode === 'replace'}
              onChange={handleRadioChange}
            />
            {t('BulkNote.Replace')}
          </label>
          <label>
            <input
              type="radio"
              name="appendmode"
              value="append"
              checked={appendMode === 'append'}
              onChange={handleRadioChange}
            />
            {t('BulkNote.Append')}
          </label>
          <label>
            <input
              type="radio"
              name="appendmode"
              value="remove"
              checked={appendMode === 'remove'}
              onChange={handleRadioChange}
            />
            {t('BulkNote.Remove')}
          </label>
        </div>
      </Body>
      <Buttons>
        {isWindows() ? (
          <>
            {cancelButton}
            {okButton}
          </>
        ) : (
          <>
            {okButton}
            {cancelButton}
          </>
        )}
      </Buttons>
    </>
  );
}

function NotesEditor({
  notes,
  onNotesChanged,
}: {
  notes: string;
  onNotesChanged: (notes: string) => void;
}) {
  const textArea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const isPhonePortrait = useIsPhonePortrait();

  const tags = useSelector(allNotesHashtagsSelector);
  useAutocomplete(textArea, tags, form.current ?? undefined);

  // On iOS at least, focusing the keyboard pushes the content off the screen
  const nativeAutoFocus = !isPhonePortrait && !isiOSBrowser();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onNotesChanged(e.target.value);

  // This effect brute-force compensates for the fact that the textcomplete
  // library doesn't set its offset relative to its closest positioned parent,
  // but rather always from the document. It may be time to fork or replace the
  // textcomplete lib.
  useLayoutEffect(() => {
    if (!form.current) {
      return;
    }
    const offsets = calculateElementOffset(form.current);
    const dropdown = form.current.querySelector('.textcomplete-dropdown');
    if (dropdown && dropdown instanceof HTMLElement && dropdown.style.left) {
      dropdown.style.left = parseInt(dropdown.style.left, 10) - offsets.left + 'px';
      dropdown.style.top = parseInt(dropdown.style.top, 10) - offsets.top + 'px';
    }
  }, [notes]);

  return (
    <form name="notes" ref={form} className={styles.form}>
      <PressTipRoot.Provider value={form}>
        <WithSymbolsPicker input={textArea} setValue={(val) => onNotesChanged(val)}>
          <TextareaAutosize
            ref={textArea}
            name="data"
            autoFocus={nativeAutoFocus}
            maxLength={maxLength}
            value={notes}
            onChange={handleChange}
          />
        </WithSymbolsPicker>
      </PressTipRoot.Provider>
    </form>
  );
}
