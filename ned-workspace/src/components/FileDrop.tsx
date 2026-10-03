// Drop zone + file picker (WebSubmit / WebReview boards). Keyboard and screen readers use the button; files are
// handed to the page, which reads them locally. Nothing is uploaded.
import { useRef, useState, type DragEvent } from 'react';
import { Icon } from './icons.tsx';
import styles from '../pages/Milestone.module.css';

export function FileDrop({ label, multiple = true, onFiles, compact = false }: { label: string; multiple?: boolean; onFiles(files: File[]): void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    const files = list ? [...list] : [];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  };
  return (
    <>
      <button
        type="button"
        className={`${styles.drop} ${compact ? styles.dropCompact : ''} ${over ? styles.dropOver : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <Icon name="submit" size={20} color="var(--link)" />
        <span>{label}</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple={multiple}
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
