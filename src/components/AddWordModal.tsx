import { FC, useState } from 'react';
import { TOPICS } from '../data/topics';
import { putCard } from '../db';
import type { Card } from '../types';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

const AddWordModal: FC<Props> = ({ onClose, onAdded }) => {
  const [english, setEnglish] = useState('');
  const [russian, setRussian] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [example, setExample] = useState('');
  const [topicId, setTopicId] = useState('custom');

  const handleSubmit = async () => {
    if (!english.trim() || !russian.trim()) return;
    const card: Card = {
      id: `custom_${Date.now()}`,
      english: english.trim(),
      russian: russian.trim(),
      synonyms: synonyms.split(',').map(s => s.trim()).filter(Boolean),
      example: example.trim() || undefined,
      topicId,
      topicIds: [topicId],
      isCustom: true,
    };
    await putCard(card);
    onAdded();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">ДОБАВИТЬ_</div>
        <div className="add-form">
          <div className="form-group">
            <label className="form-label">По-английски</label>
            <input className="form-input" value={english} onChange={e => setEnglish(e.target.value)} placeholder="apple" />
          </div>
          <div className="form-group">
            <label className="form-label">По-русски</label>
            <input className="form-input" value={russian} onChange={e => setRussian(e.target.value)} placeholder="яблоко" />
          </div>
          <div className="form-group">
            <label className="form-label">Синонимы (через запятую)</label>
            <input className="form-input" value={synonyms} onChange={e => setSynonyms(e.target.value)} placeholder="fruit, pip fruit" />
          </div>
          <div className="form-group">
            <label className="form-label">Пример предложения</label>
            <input className="form-input" value={example} onChange={e => setExample(e.target.value)} placeholder="I eat an apple every day." />
          </div>
          <div className="form-group">
            <label className="form-label">Тема</label>
            <select className="form-input" value={topicId} onChange={e => setTopicId(e.target.value)}>
              {TOPICS.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button className="submit-btn" onClick={handleSubmit}>добавить слово +</button>
        </div>
      </div>
    </div>
  );
};

export default AddWordModal;
