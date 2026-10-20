import { ArrowLeft, AudioLines, Binary, FileArchive, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useT } from '../../../hooks/useT';
import LZ77Visualizer from './LZ77Visualizer';
import LosslessAlgorithmVisualizer from './LosslessAlgorithmVisualizer';
import '../../../styles/Compression.css';

const LOSSLESS_PARTS = [
  { id: 'dictionary', titleKey: 'dictionaryTitle', descriptionKey: 'dictionaryDescription', icon: FileArchive },
  { id: 'huffman', titleKey: 'huffmanTitle', descriptionKey: 'huffmanDescription', icon: Binary },
  { id: 'arithmetic', titleKey: 'arithmeticTitle', descriptionKey: 'arithmeticDescription', icon: AudioLines },
];
const DICTIONARY_ALGORITHMS = ['lz77', 'lz78', 'lzw'];
const HUFFMAN_ALGORITHMS = ['huffman', 'modifiedHuffman', 'adaptiveHuffman'];

function handleTabNavigation(event, options, currentIndex, setSelected, idPrefix) {
  let nextIndex;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % options.length;
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + options.length) % options.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = options.length - 1;
  else return;

  event.preventDefault();
  const nextId = options[nextIndex].id;
  setSelected(nextId);
  document.getElementById(`${idPrefix}${nextId}`)?.focus();
}

export default function LosslessCompression() {
  const t = useT();
  const [selectedPart, setSelectedPart] = useState('dictionary');

  return (
    <div className="compression-page page animate-in">
      <Link className="back-link" to="/courses/information-theory-compression">
        <ArrowLeft size={15} className="rtl-flip" />
        {t('catalog:compression.backToCourse')}
      </Link>

      <header className="compression-course-hero compression-course-hero--lossless">
        <span className="compression-hero-icon"><FileArchive size={24} /></span>
        <span className="compression-eyebrow">{t('catalog:compression.lossless.eyebrow')}</span>
        <h1>{t('catalog:topic.lossless-compression.title')}</h1>
        <p>{t('catalog:compression.lossless.description')}</p>
      </header>

      <section className="compression-parts" aria-labelledby="compression-parts-title">
        <div className="compression-section-heading">
          <div>
            <span className="compression-eyebrow">{t('catalog:compression.lossless.eyebrow')}</span>
            <h2 id="compression-parts-title">{t('catalog:compression.lossless.partsTitle')}</h2>
          </div>
          <p>{t('catalog:compression.lossless.partsDescription')}</p>
        </div>

        <div className="compression-part-tabs" role="tablist" aria-label={t('catalog:compression.lossless.partsTitle')}>
          {LOSSLESS_PARTS.map(({ id, titleKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`compression-tab-${id}`}
              role="tab"
              tabIndex={selectedPart === id ? 0 : -1}
              aria-selected={selectedPart === id}
              aria-controls="compression-part-content"
              className={`compression-part-tab${selectedPart === id ? ' is-active' : ''}`}
              onClick={() => setSelectedPart(id)}
              onKeyDown={(event) => handleTabNavigation(event, LOSSLESS_PARTS, LOSSLESS_PARTS.findIndex((part) => part.id === id), setSelectedPart, 'compression-tab-')}
            >
              <Icon size={18} />
              <span>{t(`catalog:compression.lossless.${titleKey}`)}</span>
            </button>
          ))}
        </div>

        <div
          className="compression-part-content"
          id="compression-part-content"
          role="tabpanel"
          aria-labelledby={`compression-tab-${selectedPart}`}
        >
          {selectedPart === 'dictionary'
            ? <DictionaryTechniques />
            : selectedPart === 'huffman'
              ? <HuffmanTechniques />
              : <LosslessAlgorithmVisualizer algorithm="arithmetic" />}
        </div>
      </section>
    </div>
  );
}

function DictionaryTechniques() {
  const t = useT();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('lz77');

  return (
    <div className="dictionary-part">
      <div className="dictionary-part-heading">
        <span className="compression-method-icon"><GitBranch size={19} /></span>
        <div>
          <h3>{t('catalog:compression.lossless.dictionaryTitle')}</h3>
          <p>{t('catalog:compression.lossless.dictionaryDescription')}</p>
        </div>
      </div>

      <div className="compression-algorithm-tabs" role="tablist" aria-label={t('catalog:compression.lossless.dictionaryTitle')}>
        {DICTIONARY_ALGORITHMS.map((algorithm, index) => (
          <button
            key={algorithm}
            type="button"
            id={`compression-algorithm-tab-${algorithm}`}
            role="tab"
            tabIndex={selectedAlgorithm === algorithm ? 0 : -1}
            aria-selected={selectedAlgorithm === algorithm}
            aria-controls="dictionary-algorithm-content"
            className={`compression-algorithm-tab${selectedAlgorithm === algorithm ? ' is-active' : ''}`}
            onClick={() => setSelectedAlgorithm(algorithm)}
            onKeyDown={(event) => handleTabNavigation(event, DICTIONARY_ALGORITHMS.map((id) => ({ id })), index, setSelectedAlgorithm, 'compression-algorithm-tab-')}
          >
            <span>{algorithm.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div
        id="dictionary-algorithm-content"
        className="compression-algorithm-content"
        role="tabpanel"
        aria-labelledby={`compression-algorithm-tab-${selectedAlgorithm}`}
      >
        {selectedAlgorithm === 'lz77'
          ? (
            <>
              <LZ77Visualizer />
              <p className="compression-slide-rule">{t('catalog:compression.lossless.slideRule')}</p>
              <p className="compression-slide-note">{t('catalog:compression.visualizer.slideNote')}</p>
            </>
          )
          : <LosslessAlgorithmVisualizer key={selectedAlgorithm} algorithm={selectedAlgorithm} />}
      </div>
    </div>
  );
}

function HuffmanTechniques() {
  const t = useT();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('huffman');

  return (
    <div className="dictionary-part">
      <div className="dictionary-part-heading">
        <span className="compression-method-icon"><Binary size={19} /></span>
        <div>
          <h3>{t('catalog:compression.lossless.huffmanTitle')}</h3>
          <p>{t('catalog:compression.lossless.huffmanDescription')}</p>
        </div>
      </div>
      <div className="compression-algorithm-tabs" role="tablist" aria-label={t('catalog:compression.lossless.huffmanTitle')}>
        {HUFFMAN_ALGORITHMS.map((algorithm, index) => (
          <button
            key={algorithm}
            type="button"
            id={`compression-huffman-tab-${algorithm}`}
            role="tab"
            tabIndex={selectedAlgorithm === algorithm ? 0 : -1}
            aria-selected={selectedAlgorithm === algorithm}
            aria-controls="compression-huffman-content"
            className={`compression-algorithm-tab${selectedAlgorithm === algorithm ? ' is-active' : ''}`}
            onClick={() => setSelectedAlgorithm(algorithm)}
            onKeyDown={(event) => handleTabNavigation(event, HUFFMAN_ALGORITHMS.map((id) => ({ id })), index, setSelectedAlgorithm, 'compression-huffman-tab-')}
          >
            <span>{t(`catalog:compression.lossless.${algorithm === 'huffman' ? 'huffmanTitle' : `${algorithm}Title`}`)}</span>
          </button>
        ))}
      </div>
      <div
        id="compression-huffman-content"
        className="compression-algorithm-content"
        role="tabpanel"
        aria-labelledby={`compression-huffman-tab-${selectedAlgorithm}`}
      >
        <LosslessAlgorithmVisualizer key={selectedAlgorithm} algorithm={selectedAlgorithm} />
      </div>
    </div>
  );
}
